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

pub struct Board {
    cells: Vec<Cell>,
    width: i32,
    height: i32,
}

impl Board {
    pub fn at(&self, x: i32, y: i32) -> Cell {
        if x < 0 || self.width <= x || y < 0 || self.height <= y {
            None
        } else {
            self.cells[(self.width * y + x) as usize]
        }
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

        for y in 0..self.height {
            for x in 0..self.width {
                if let Some(player) = self.at(x, y) {
                    points[player as usize] += 1;
                }
            }
        }

        (points[player as usize] as f64) / (points.iter().sum::<usize>() as f64)
    }
}
