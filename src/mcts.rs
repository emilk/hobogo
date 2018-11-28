use std::fmt;

use rand::Rng;

use hobogo::{Board, Coord, Player};

// ----------------------------------------------------------------------------

// TODO: traitify
type Action = Coord;

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
    fn available_moves(&self) -> Vec<Action> {
        self.board
            .coords()
            .filter(|c| self.board.is_valid_move(*c, self.next_player))
            .collect()
    }

    fn random_action<R: Rng>(&self, rng: &mut R) -> Option<Action> {
        // TODO: prefer smart actions
        use rand::seq::SliceRandom;
        if false {
            self.available_moves().choose(rng).cloned()
        } else {
            // Faster
            let mut coords: Vec<Action> = self.board.coords().collect();
            coords.shuffle(rng);
            for coord in coords {
                if self.board.is_valid_move(coord, self.next_player) {
                    return Some(coord);
                }
            }
            None
        }
    }

    fn make_move(&mut self, action: &Action) {
        self.board.set(*action, self.next_player);
        self.next_player = (self.next_player + 1) % (self.num_players as u8);
    }

    /// Only called when one player cannot make a move (game over).
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

        let win_margin = points[winner] - points[runner_up];
        assert!(win_margin >= 0);

        if win_margin == 0 {
            // A tie: not good, but better than loosing
            vec![0.1; self.num_players]
        } else {
            let margin_score = (win_margin as f64) / 100.0; // ARBRITRARY
            let mut score = vec![-margin_score; self.num_players];
            score[winner] = 1.0 + margin_score;
            score
        }

        // let mut score = vec![0.0; self.num_players];
        // if let Some(player) = self.board.winner(self.num_players) {
        //     score[player as usize] = 1.0;
        // }
        // score
    }
}

// ----------------------------------------------------------------------------

fn random_playout<R: Rng>(rng: &mut R, mut state: GameState) -> GameState {
    while let Some(action) = state.random_action(rng) {
        state.make_move(&action)
    }
    state
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
            let mut moves = state.available_moves();
            use rand::prelude::*;
            moves.shuffle(rng); // TODO try to keep best moves in front
            self.children = Some(moves.iter().map(|&action| (action, Node::new())).collect())
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
        let optimizing_player = 1 - state.next_player; // TODO: fix this uglyness.

        let score = if self.num == 0 {
            random_playout(rng, state).score()
        } else if let Some((action, child)) = self.next_child(rng, &state) {
            state.make_move(&action);
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
