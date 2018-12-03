use std::fmt;

use web_sys;

fn console_log(s: String) {
    web_sys::console::log_1(&s.into());
}

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
pub enum Influence {
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

impl Influence {
    fn player(&self) -> Option<Player> {
        match self {
            Influence::Occupied(player) => Some(*player),
            Influence::Ruled(player) => Some(*player),
            Influence::Claimed(player) => Some(*player),
            Influence::Tied => None,
        }
    }

    pub fn is_occupied(&self) -> bool {
        match self {
            Influence::Occupied(_) => true,
            Influence::Ruled(_) => false,
            Influence::Claimed(_) => false,
            Influence::Tied => false,
        }
    }
}

pub type Points = [usize; MAX_PLAYERS];

#[derive(Copy, Clone, Debug)]
pub struct Coord {
    pub x: i32,
    pub y: i32,
}

impl fmt::Display for Coord {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}{}", ('A' as u8 + self.x as u8) as char, self.y + 1)
    }
}

#[derive(Clone)]
pub struct Board {
    cells: Vec<Cell>,
    width: i32,
    height: i32,
}

impl Board {
    pub fn contains(&self, c: Coord) -> bool {
        0 <= c.x && c.x < self.width && 0 <= c.y && c.y < self.height
    }

    pub fn index(&self, c: Coord) -> Option<usize> {
        if self.contains(c) {
            Some((self.width * c.y + c.x) as usize)
        } else {
            None
        }
    }

    pub fn at(&self, c: Coord) -> Cell {
        self.index(c).and_then(|index| self.cells[index])
    }

    pub fn set(&mut self, c: Coord, player: Player) {
        let index = self.index(c).unwrap();
        self.cells[index] = Some(player);
    }

    pub fn coords(&self) -> impl Iterator<Item = Coord> {
        let width = self.width;
        let height = self.height;
        (0..height).flat_map(move |y| (0..width).map(move |x| Coord { x, y }))
    }

    pub fn is_valid_move(&self, c: Coord, who_wants_to_move: Player, num_players: usize) -> bool {
        if let Some(_) = self.at(c) {
            return false;
        }

        let (influences, _) = self.tally_neighbors(c);

        for player in 0..num_players {
            if influences[player] > influences[who_wants_to_move as usize] {
                return false;
            }
        }

        return true;
    }

    pub fn tally_neighbors(&self, c: Coord) -> ([u32; MAX_PLAYERS], u32) {
        let mut influences: [u32; MAX_PLAYERS] = [0; MAX_PLAYERS];
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
                        influences[player as usize] += 1;
                    } else {
                        empty_neighbors += 1;
                    }
                }
            }
        }

        (influences, empty_neighbors)
    }

    pub fn influence(&self, c: Coord) -> Influence {
        if let Some(player) = self.at(c) {
            return Influence::Occupied(player);
        }

        let (influences, empty_neighbors) = self.tally_neighbors(c);

        // Check if we have a ruler:
        for player in 0..MAX_PLAYERS {
            let mut other_player_can_take_this = false;
            let mut other_player_is_as_influential = false;

            for other_player in 0..MAX_PLAYERS {
                if other_player == player {
                    continue;
                }
                if influences[other_player] + empty_neighbors >= influences[player] {
                    other_player_can_take_this = true;
                }
                if influences[other_player] >= influences[player] {
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
        // TODO: returned which players are tied!!
        return Influence::Tied;
    }

    fn more_than_one_player_has_valid_move(&self, num_players: usize) -> bool {
        assert!(
            num_players <= MAX_PLAYERS,
            "Too many players: {}",
            num_players
        );
        let mut num_moves = [0; MAX_PLAYERS];
        for influence in self.coords().map(|c| self.influence(c)) {
            match influence {
                Influence::Occupied(_) => (),
                Influence::Ruled(player) => num_moves[player as usize] += 1,
                Influence::Claimed(player) => num_moves[player as usize] += 1,
                Influence::Tied => {
                    return true;
                }
            }
        }
        let num_players_with_valid_moves = (0..num_players)
            .filter(|&player| num_moves[player] > 0)
            .count();
        num_players_with_valid_moves > 1
    }

    fn everything_is_ruled_by_someone(&self) -> bool {
        self.coords()
            .map(|c| self.influence(c))
            .all(|influence| match influence {
                Influence::Occupied(_) => return true,
                Influence::Ruled(_) => return true,
                Influence::Claimed(_) => return false,
                Influence::Tied => return false,
            })
    }

    fn one_player_has_unbeatable_lead(&self) -> bool {
        let mut guaranteed_points = [0; MAX_PLAYERS];
        let mut contested = 0;
        for influence in self.coords().map(|c| self.influence(c)) {
            match influence {
                Influence::Occupied(player) => guaranteed_points[player as usize] += 1,
                Influence::Ruled(player) => guaranteed_points[player as usize] += 1,
                Influence::Claimed(_) => contested += 1,
                Influence::Tied => contested += 1,
            }
        }

        let mut most_points = 0;
        let mut second_most_points = 0;
        for &point in guaranteed_points.iter() {
            if point > most_points {
                second_most_points = most_points;
                most_points = point;
            } else if point > second_most_points {
                second_most_points = point;
            }
        }

        most_points > second_most_points + contested
    }

    pub fn game_over(&self, num_players: usize) -> bool {
        !self.more_than_one_player_has_valid_move(num_players)
            || self.everything_is_ruled_by_someone()
            || self.one_player_has_unbeatable_lead()
    }

    /// Given that the game is over, what are the scores?
    pub fn points(&self) -> Points {
        let mut points = [0; MAX_PLAYERS];
        for influence in self.coords().map(|c| self.influence(c)) {
            if let Some(player) = influence.player() {
                points[player as usize] += 1usize;
            }
        }
        points
    }

    pub fn leaders(&self) -> Vec<Player> {
        let points = self.points();

        let leader_score: usize = *points.iter().max().unwrap();
        if leader_score == 0 {
            vec![]
        } else {
            (0..MAX_PLAYERS)
                .filter(|&player| points[player] == leader_score)
                .map(|player| player as Player)
                .collect()
        }
    }

    pub fn leader(&self) -> Option<Player> {
        let leaders = self.leaders();
        if leaders.len() == 1 {
            Some(leaders[0])
        } else {
            None
        }
    }

    pub fn winner(&self, num_players: usize) -> Option<Player> {
        if self.game_over(num_players) {
            self.leader()
        } else {
            None
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

    pub fn ai_move(&self, player: Player, num_players: usize) -> Option<Coord> {
        fn now_sec() -> f64 {
            web_sys::window()
                .expect("should have a Window")
                .performance()
                .expect("should have a Performance")
                .now()
                / 1000.0
        }

        use mcts;
        use rand::SeedableRng;
        let mut rng = rand::rngs::OsRng::new().unwrap();
        let mut rng = rand::rngs::SmallRng::from_rng(&mut rng).unwrap(); // Fast

        let state = mcts::GameState {
            next_player: player,
            num_players: num_players,
            board: self.clone(),
        };

        let think_time = 1.0;
        let mut mcts = mcts::Mcts::new(state);
        let start = now_sec();
        while {
            mcts.iterate(&mut rng);
            now_sec() - start < think_time
        } {}

        console_log(format!(
            "{:.1} iterations per second",
            mcts.num_iterations() as f64 / (now_sec() - start)
        ));
        console_log(format!("{}", mcts));
        let action = mcts.best_action().cloned();
        let action_str = if let Some(action) = action {
            action.to_string()
        } else {
            "[GAME OVER]".to_string()
        };
        console_log(format!(
            "Player {}/{} AI action: {}",
            player, num_players, action_str
        ));

        if let Some(action) = action {
            match action {
                mcts::Action::Pass => None,
                mcts::Action::Move(coord) => Some(coord),
            }
        } else {
            None
        }
    }
}
