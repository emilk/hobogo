use std::fmt;

use rand::Rng;

use hobogo::{Board, Coord, Player};

// ----------------------------------------------------------------------------

// TODO: traitify
type Action = Coord;

// TODO: traitify
#[derive(Clone)]
pub struct GameState {
    /// Who are we playing?
    pub ai_player: Player,

    /// Who is making the next turn?
    pub next_player: Player,

    pub num_players: usize,

    pub board: Board,
}

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

    /// How much is this state worth? e.g. 1 for win, -1 for loss.
    fn score(&self) -> f64 {
        match self.board.winner() {
            Some(player) if player == self.ai_player => 1.0,
            Some(_) => 0.0,
            None => 0.5,
        }
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

struct Node {
    num: usize,
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

    fn iterate_child<R: Rng>(&mut self, rng: &mut R, mut state: GameState) -> f64 {
        // First try to find an unexplored child:
        for (action, child) in self.children_mut(rng, &state) {
            if child.num == 0 {
                state.make_move(action);
                return child.playout(rng, state);
            }
        }

        // All children has been explored at least once.
        // Find the best one to recurse on:

        let mut best_value: f64 = std::f64::NEG_INFINITY;
        let mut best_action = None;
        let mut best_child = None;

        let self_num_ln = (self.num as f64).ln();

        for (action, child) in self.children_mut(rng, &state) {
            // UCT (Upper Confidence Tree):
            let c = 1.0; // TODO
            let value = child.score_sum / (child.num as f64)
                + c * (2.0 * self_num_ln / (child.num as f64)).sqrt();
            if value > best_value {
                best_value = value;
                best_action = Some(action);
                best_child = Some(child);
            }
        }

        if let Some(best_action) = best_action {
            state.make_move(best_action);
            best_child.unwrap().iterate(rng, state)
        } else {
            // No children. We are a leaf.
            state.score()
        }
    }

    // Recursively play, returns the score.
    fn iterate<R: Rng>(&mut self, rng: &mut R, state: GameState) -> f64 {
        let delta = self.iterate_child(rng, state);
        self.num += 1;
        self.score_sum += delta;
        delta
    }

    fn playout<R: Rng>(&mut self, rng: &mut R, state: GameState) -> f64 {
        let result = random_playout(rng, state);
        let score = result.score();
        self.num += 1;
        self.score_sum += score;
        score
    }

    fn best_action(&self) -> Option<&Action> {
        match &self.children {
            Some(children) => {
                let mut best_action = None;
                let mut most_explored = 0;
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
            for _ in 0..indent_level {
                f.write_str("    ")?;
            }
            writeln!(
                f,
                "mean_score: {} over {} playouts",
                node.score_sum / (node.num as f64),
                node.num
            )?;
            if let Some(children) = &node.children {
                for (action, child) in children.iter() {
                    if child.num > 0 {
                        for _ in 0..indent_level {
                            f.write_str("    ")?;
                        }
                        write!(f, "{:?}:", action)?;
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
