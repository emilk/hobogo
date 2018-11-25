use web_sys::console;

const MAX_PLAYERS: usize = 8;

pub type Player = u8;

type Cell = Option<Player>;

fn player_from_i8(x: i8) -> Cell {
    if x < 0 {
        None
    } else {
        Some(x as Player)
    }
}

#[derive(Copy, Clone, Debug)]
enum Influence {
    // This player occupies this cell
    Occupied(Player),

    // This player has so much influence that noone else can ever occupy this cell
    Ruled(Player),

    // The given player is currently the most influential here,
    // so nobody can steal it *right away*.
    Claimed(Player), // TODO: add a margin

    // Up for grabs
    Tied,
}

#[derive(Copy, Clone, Debug)]
pub struct Coord {
    pub x: i32,
    pub y: i32,
}

#[derive(Clone)]
pub struct Board {
    cells: Vec<Cell>,
    width: i32,
    height: i32,
}

impl Board {
    fn contains(&self, c: Coord) -> bool {
        0 <= c.x && c.x < self.width && 0 <= c.y && c.y < self.height
    }

    fn index(&self, c: Coord) -> Option<usize> {
        if self.contains(c) {
            Some((self.width * c.y + c.x) as usize)
        } else {
            None
        }
    }

    fn at(&self, c: Coord) -> Cell {
        self.index(c).and_then(|index| self.cells[index])
    }

    /// Returns None on invalid move
    fn try_make_move(&self, c: Coord, player: Player) -> Option<Board> {
        if let Some(index) = self.index(c) {
            if self.is_valid_move(c, player) {
                let mut after = self.clone(); // TODO: faster
                after.cells[index] = Some(player);
                return Some(after);
            }
        }
        None
    }

    fn coords(&self) -> impl Iterator<Item = Coord> {
        let width = self.width;
        let height = self.height;
        (0..height).flat_map(move |y| (0..width).map(move |x| Coord { x, y }))
    }

    fn is_valid_move(&self, c: Coord, who_wants_to_move: Player) -> bool {
        match self.influence(c) {
            Influence::Occupied(_) => false,
            Influence::Ruled(ruler) => ruler == who_wants_to_move,
            Influence::Claimed(claimer) => claimer == who_wants_to_move,
            Influence::Tied => true,
        }
    }

    fn influence(&self, c: Coord) -> Influence {
        if let Some(player) = self.at(c) {
            return Influence::Occupied(player);
        }

        let mut influcences: [u32; MAX_PLAYERS] = [0; MAX_PLAYERS];
        let mut _num_neighbors = 0;
        let mut empty_neighbors = 0;
        for dy in -1..=1 {
            for dx in -1..=1 {
                if dx == 0 && dy == 0 {
                    continue;
                }
                let neighbor_coord = Coord {
                    x: c.x + dx,
                    y: c.y + dy,
                };
                if self.contains(neighbor_coord) {
                    _num_neighbors += 1;
                    // TODO: this function should recurse. If a neighbor is ruled by another, we should not count it as a potential empty_neighbor
                    if let Some(player) = self.at(neighbor_coord) {
                        influcences[player as usize] += 1;
                    } else {
                        empty_neighbors += 1;
                    }
                }
            }
        }

        // Check if we have a ruler:
        for player in 0..MAX_PLAYERS {
            let mut other_player_can_take_this = false;
            let mut other_player_is_as_influential = false;

            for other_player in 0..MAX_PLAYERS {
                if other_player == player {
                    continue;
                }
                if influcences[other_player] + empty_neighbors >= influcences[player] {
                    other_player_can_take_this = true;
                }
                if influcences[other_player] >= influcences[player] {
                    other_player_is_as_influential = true;
                }
            }

            if !other_player_can_take_this {
                return Influence::Ruled(player as Player);
            }
            if !other_player_is_as_influential {
                return Influence::Claimed(player as Player);
            }
        }
        return Influence::Tied;
    }
}

impl Board {
    pub fn from_js(board: &[i8]) -> Self {
        let n = (board.len() as f64).sqrt().round() as i32;
        assert_eq!(n * n, board.len() as i32);
        Board {
            cells: board.iter().cloned().map(player_from_i8).collect(),
            width: n,
            height: n,
        }
    }

    // How good is the position for the current player?
    pub fn evaluate(&self, player: Player) -> f64 {
        let mut points: [usize; MAX_PLAYERS] = [0; MAX_PLAYERS];
        let mut num_tied = 1;

        for c in self.coords() {
            match self.influence(c) {
                Influence::Occupied(player) => {
                    points[player as usize] += 10;
                }
                Influence::Ruled(player) => {
                    points[player as usize] += 3;
                }
                Influence::Claimed(player) => {
                    points[player as usize] += 1;
                }
                Influence::Tied => {
                    // TODO: count range?
                    num_tied += 1;
                }
            }
        }

        (points[player as usize] as f64) / ((points.iter().sum::<usize>() + num_tied) as f64)
    }

    pub fn ai_move(&self, player: Player) -> Option<Coord> {
        use rand::prelude::*;
        let mut rng = rand::rngs::OsRng::new().unwrap();

        let mut best_score = std::f64::NEG_INFINITY;
        let mut best_move = None;
        let mut num_best: f32 = 0.0;
        for c in self.coords() {
            // console::log_1(&format!("Evaluating {:?}...", c).into());
            if let Some(after) = self.try_make_move(c, player) {
                let score = after.evaluate(player);
                if score > best_score {
                    best_score = score;
                    best_move = Some(c);
                    num_best = 1.0;
                } else if score == best_score {
                    // Reservoir sampling:
                    num_best += 1.0;
                    if rng.gen::<f32>() < 1.0 / num_best {
                        best_score = score;
                        best_move = Some(c);
                    }
                }
            }
        }
        best_move
    }
}
