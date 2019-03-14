use std::collections::VecDeque;
use std::fmt;

use rand::{seq::SliceRandom, Rng};

use crate::hobogo::{Board, Coord, Influence, Player};

// ----------------------------------------------------------------------------

// TODO: traitify
#[derive(Clone, Copy, Debug)]
pub enum Action {
    Pass,
    Move(Coord),
}

impl fmt::Display for Action {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Action::Pass => f.write_str("PASS"),
            Action::Move(coord) => coord.fmt(f),
        }
    }
}

// TODO: traitify
#[derive(Clone)]
pub struct GameState {
    /// Who is making the next turn?
    pub next_player: Player,

    pub num_players: usize,

    pub board: Board,
}

pub type Score = Vec<f64>;

impl GameState {
    fn available_moves_for(&self, player: Player) -> Vec<Coord> {
        self.board
            .coords()
            .filter(|c| self.board.is_valid_move(*c, player, self.num_players))
            .collect()
    }

    fn available_actions_for(&self, player: Player) -> Vec<Action> {
        let available_moves = self.available_moves_for(player);
        if available_moves.is_empty() {
            if self.board.is_game_over(self.num_players) {
                vec![]
            } else {
                vec![Action::Pass]
            }
        } else {
            available_moves.into_iter().map(Action::Move).collect()
        }
    }

    fn available_actions(&self) -> Vec<Action> {
        self.available_actions_for(self.next_player)
    }

    fn random_action<R: Rng>(&self, rng: &mut R) -> Option<Action> {
        // TODO: prefer smart actions
        if false {
            self.available_actions().choose(rng).cloned()
        } else {
            // Faster
            let mut coords: Vec<Coord> = self.board.coords().collect();
            coords.shuffle(rng);
            for coord in coords {
                if self
                    .board
                    .is_valid_move(coord, self.next_player, self.num_players)
                {
                    return Some(Action::Move(coord));
                }
            }
            if self.board.is_game_over(self.num_players) {
                None
            } else {
                Some(Action::Pass)
            }
        }
    }

    fn take_action(&mut self, action: &Action) {
        if let Action::Move(coord) = action {
            self.board.set(*coord, self.next_player);
        }
        self.next_player = (self.next_player + 1) % (self.num_players as u8);
    }

    /// Only called when one player has no action to take (game over).
    fn score(&self) -> Score {
        let points = self.board.points();
        let mut winner = 0;
        let mut runner_up = 0;
        for player in 0..self.num_players {
            if points[player] > points[winner] {
                runner_up = winner;
                winner = player;
            } else if points[player] > runner_up {
                runner_up = player;
            }
        }

        debug_assert!(points[winner] >= points[runner_up]);

        let tie = points[winner] == points[runner_up];

        (0..self.num_players)
            .map(|pi| {
                let points_behind_winner = points[winner] - points[pi];
                if points_behind_winner == 0 {
                    if tie {
                        // One of several winners
                        0.5
                    } else {
                        // Sole winner
                        let points_ahead = points[winner] - points[runner_up];
                        1.0 + (points_ahead as f64) / 10.0 // Try to maximize our win margin
                    }
                } else {
                    // Looser
                    0.0 - (points_behind_winner as f64) / 10.0 // Try to minimize how far behind winner we get
                }
            })
            .collect()
    }

    fn next_move_from_deque(
        &self,
        moves: &mut VecDeque<Coord>,
        active_player: Player,
    ) -> Option<Coord> {
        for _ in 0..moves.len() {
            let coord = moves.pop_front().unwrap();
            match self.board.influence(coord) {
                Influence::Occupied(_) => {}
                Influence::Ruled(ruler) if ruler != active_player => {}
                Influence::Claimed(claimer) if claimer != active_player => {
                    moves.push_back(coord); // Try again later
                }
                _ => {
                    return Some(coord);
                }
            };
        }
        None
    }

    fn random_playout<R: Rng>(&mut self, rng: &mut R) {
        if false {
            while let Some(action) = self.random_action(rng) {
                self.take_action(&action)
            }
        } else {
            // Almost twice as fast as the one above.

            let all_moves: Vec<_> = self
                .board
                .coords()
                .filter(|c| !self.board.influence(*c).is_occupied())
                .collect();

            // Keep a list of available moves for each player:
            let mut player_moves = vec![all_moves; self.num_players];
            for player in 0..self.num_players {
                player_moves[player].shuffle(rng);
            }

            let mut player_moves: Vec<VecDeque<Coord>> = player_moves
                .into_iter()
                .map(|v| v.into_iter().collect())
                .collect();

            loop {
                let next_player = self.next_player;
                let moves = &mut player_moves[next_player as usize];
                if let Some(coord) = self.next_move_from_deque(moves, next_player) {
                    self.take_action(&Action::Move(coord));
                } else if self.board.is_game_over(self.num_players) {
                    break;
                } else {
                    self.take_action(&Action::Pass);
                }
            }
        }
    }
}

// ----------------------------------------------------------------------------

/// Each node has an implicit current player, passed down via the game state.
struct Node {
    /// Number plays from this node
    num: usize,

    /// Score for this node:s player.
    score_sum: f64,

    /// All available actions from here.
    children: Option<Vec<(Action, Node)>>,
}

impl Node {
    fn new() -> Node {
        Node {
            num: 0,
            score_sum: 0.0,
            children: None,
        }
    }

    fn children_mut<R: Rng>(
        &mut self,
        rng: &mut R,
        state: &GameState,
    ) -> impl Iterator<Item = &mut (Action, Node)> {
        if self.children.is_none() {
            let mut actions = state.available_actions();
            use rand::prelude::*;
            actions.shuffle(rng); // TODO try to keep best actions in front
            self.children = Some(
                actions
                    .iter()
                    .map(|&action| (action, Node::new()))
                    .collect(),
            )
        }
        self.children.as_mut().unwrap().iter_mut()
    }

    // Find the next child to recurse on
    fn next_child<R: Rng>(
        &mut self,
        rng: &mut R,
        state: &GameState,
    ) -> Option<(Action, &mut Node)> {
        let mut best_value: f64 = std::f64::NEG_INFINITY;
        let mut best = None;

        let self_num_ln = (self.num as f64).ln();

        for (action, child) in self.children_mut(rng, &state) {
            if child.num == 0 {
                // Unexpanded child – prioritize over all others
                return Some((action.clone(), child));
            }

            // UCT (Upper Confidence Tree):
            let value = child.score_sum / (child.num as f64)
                + (2.0 * self_num_ln / (child.num as f64)).sqrt();
            if value > best_value {
                best_value = value;
                best = Some((action.clone(), child))
            }
        }

        best
    }

    // Recursively play, returns the winner.
    fn iterate<R: Rng>(&mut self, rng: &mut R, mut state: GameState) -> Score {
        // Which player the current node is trying to win for:
        // TODO: fix this uglyness:
        let previous_player =
            ((state.next_player as usize + state.num_players - 1) % state.num_players) as u8;
        let optimizing_player = previous_player;

        let score = if self.num == 0 {
            state.random_playout(rng);
            state.score()
        } else if let Some((action, child)) = self.next_child(rng, &state) {
            state.take_action(&action);
            child.iterate(rng, state)
        } else {
            // No children. We are a leaf.
            state.score()
        };

        self.num += 1;
        self.score_sum += score[optimizing_player as usize];
        score
    }

    fn best_action(&self) -> Option<&Action> {
        match &self.children {
            Some(children) => {
                let mut best_action = None;
                let mut most_explored = 0;
                // TODO: score_sum as tie-breaker!
                for (action, child) in children {
                    if child.num > most_explored {
                        most_explored = child.num;
                        best_action = Some(action);
                    }
                }
                best_action
            }
            None => None,
        }
    }
}

impl fmt::Display for Node {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        fn fmt_subtree(f: &mut fmt::Formatter, node: &Node, indent_level: i32) -> fmt::Result {
            writeln!(
                f,
                "mean score: {} over {} playouts",
                (node.score_sum as f64) / (node.num as f64),
                node.num
            )?;
            if indent_level >= 1 {
                return Ok(());
            }
            if let Some(children) = &node.children {
                let mut children: Vec<&(Action, Node)> = children.iter().collect();
                children.sort_by_key(|(_, node)| std::usize::MAX - node.num);
                for (action, child) in children.iter() {
                    if child.num > 0 {
                        for _ in 0..indent_level {
                            f.write_str("|   ")?;
                        }
                        write!(f, "{}: ", action)?; // TODO: print player name?
                        fmt_subtree(f, child, indent_level + 1)?;
                    }
                }
            }
            write!(f, "")
        }

        fmt_subtree(f, self, 0)
    }
}

// ----------------------------------------------------------------------------

/// Simple Monte Carlo Tree Search implementation.
pub struct Mcts {
    start_state: GameState,
    root: Node,
}

impl Mcts {
    pub fn new(state: GameState) -> Self {
        Mcts {
            start_state: state,
            root: Node::new(),
        }
    }

    pub fn iterate<R: Rng>(&mut self, rng: &mut R) {
        self.root.iterate(rng, self.start_state.clone());
    }

    pub fn best_action(&self) -> Option<&Action> {
        self.root.best_action()
    }

    pub fn num_iterations(&self) -> usize {
        self.root.num
    }
}

impl fmt::Display for Mcts {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        self.root.fmt(f)
    }
}
