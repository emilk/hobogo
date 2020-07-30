use std::fmt;

use serde::{Deserialize, Serialize};

use egui_web::now_sec;

use crate::mcts;

const MAX_PLAYERS: usize = 8;

pub type Player = u8;

pub type Cell = Option<Player>;

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

    // This player has so much influence that noone else can ever occupy this cell.
    // TODO: remove now that we have volatile_cells
    Ruled(Player),

    // The given player is currently the most influential here,
    // so nobody can steal it *right away*.
    Claimed(Player), // TODO: add a margin

    // Up for grabs
    Tied,
}

impl Influence {
    pub fn player(&self) -> Option<Player> {
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

// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------

struct Neighbors {
    board_size: (i32, i32),
    c: Coord,
    index: i32,
}

impl Neighbors {
    fn new(board_size: (i32, i32), c: Coord) -> Self {
        Neighbors {
            board_size,
            c,
            index: 0,
        }
    }
}

impl Iterator for Neighbors {
    type Item = Coord;

    fn next(&mut self) -> Option<Self::Item> {
        while self.index < 9 {
            let dx = (self.index % 3) - 1;
            let dy = (self.index / 3) - 1;
            self.index += 1;
            let nc = Coord {
                x: self.c.x + dx,
                y: self.c.y + dy,
            };
            if 0 <= nc.x && nc.x < self.board_size.0 && 0 <= nc.y && nc.y < self.board_size.1 {
                return Some(nc);
            }
        }
        None
    }
}

// ----------------------------------------------------------------------------

#[derive(Clone, Deserialize, Serialize)]
pub struct Board {
    cells: Vec<Cell>,
    pub width: i32,
    pub height: i32,
}

impl std::ops::Index<Coord> for Board {
    type Output = Cell;
    fn index(&self, c: Coord) -> &Cell {
        &self.cells[self.index(c).unwrap()]
    }
}

impl std::ops::IndexMut<Coord> for Board {
    fn index_mut(&mut self, c: Coord) -> &mut Cell {
        let index = self.index(c).unwrap();
        &mut self.cells[index]
    }
}

impl Board {
    pub fn new(width: i32, height: i32) -> Board {
        Board {
            width,
            height,
            cells: vec![None; (width * height) as usize],
        }
    }

    pub fn is_empty(&self) -> bool {
        !self.cells.iter().any(|c| c.is_some())
    }

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

    fn neighbors_to(&self, c: Coord) -> Neighbors {
        Neighbors::new((self.width, self.height), c)
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

        true
    }

    pub fn tally_neighbors(&self, c: Coord) -> ([u8; MAX_PLAYERS], u8) {
        let mut influences: [u8; MAX_PLAYERS] = [0; MAX_PLAYERS];
        let mut _num_neighbors = 0;
        let mut empty_neighbors = 0;
        for neighbor_coord in self.neighbors_to(c) {
            _num_neighbors += 1;
            if let Some(player) = self.at(neighbor_coord) {
                influences[player as usize] += 1;
            } else {
                empty_neighbors += 1;
            }
        }

        (influences, empty_neighbors)
    }

    /// Returns which cells could still change color:
    pub fn volatile_cells(&self, num_players: usize) -> Vec<bool> {
        let n = self.cells.len();

        // Player who currently claims this cell
        let mut claimed_by = vec![None; n];

        // By how much does this cell have a mjaority?
        let mut strengths: Vec<i8> = vec![0; n];

        // Coordinates we will pretend to change the player of:
        let mut flip_stack = Vec::new();

        for c in self.coords() {
            let ix = self.index(c).unwrap();
            if let Some(player) = self.at(c) {
                claimed_by[ix] = Some(player);
                strengths[ix] = std::i8::MAX;
            } else {
                let (influences, _) = self.tally_neighbors(c);
                let max_player = (0..num_players).max_by_key(|p| influences[*p]).unwrap();

                // Our lead over the other player:
                let mut strength = std::i8::MAX;

                for other_player in 0..num_players {
                    if other_player != max_player {
                        strength =
                            strength.min((influences[max_player] - influences[other_player]) as i8);
                    }
                }

                strengths[ix] = strength;

                if strength == 0 {
                    // Tied:
                    claimed_by[ix] = None;
                    flip_stack.push(c);
                } else {
                    claimed_by[ix] = Some(max_player as Player);
                }
            }
        }

        // Pretend-play on all claimed places:
        for coord in self.coords() {
            let ix = self.index(coord).unwrap();
            if self.at(coord).is_none() {
                if let Some(claimer) = claimed_by[ix] {
                    for neighbor_coord in self.neighbors_to(coord) {
                        let neighbor_ix = self.index(neighbor_coord).unwrap();
                        if let Some(neighbor_player) = claimed_by[neighbor_ix] {
                            if neighbor_player != claimer {
                                strengths[neighbor_ix] -= 1;
                                if strengths[neighbor_ix] == 0 {
                                    flip_stack.push(neighbor_coord);
                                }
                            }
                        }
                    }
                }
            }
        }

        // console_log(format!("Neighbor: {} {}", neighbor_coord, neighbor_ix));

        let mut visited = vec![false; n];

        while let Some(coord) = flip_stack.pop() {
            let ix = self.index(coord).unwrap();
            if visited[ix] {
                continue;
            }
            visited[ix] = true;
            let flip_player = claimed_by[ix];

            // Simulate this flipping this cell by weakening the neighbors:
            for neighbor_coord in self.neighbors_to(coord) {
                let neighbor_ix = self.index(neighbor_coord).unwrap();
                if let Some(neighbor_player) = claimed_by[neighbor_ix] {
                    if flip_player.is_none() || flip_player.unwrap() == neighbor_player {
                        strengths[neighbor_ix] -= 1;
                        if strengths[neighbor_ix] == 0 {
                            flip_stack.push(neighbor_coord);
                        }
                    }
                }
            }
        }

        strengths.iter().map(|s| *s <= 0).collect()
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
        // TODO: return which players are tied
        Influence::Tied
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
                Influence::Occupied(_) => true,
                Influence::Ruled(_) => true,
                Influence::Claimed(_) => false,
                Influence::Tied => false,
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

    pub fn is_game_over(&self, num_players: usize) -> bool {
        if !self.more_than_one_player_has_valid_move(num_players) {
            return true;
        }

        // if self.everything_is_ruled_by_someone() {
        //     return true;
        // }
        // if self.one_player_has_unbeatable_lead() {
        //     return true;
        // }

        let volatiles = self.volatile_cells(num_players);
        !volatiles.iter().any(|is_volatile| *is_volatile)
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

    // pub fn leaders(&self) -> Vec<Player> {
    //     let points = self.points();

    //     let leader_score: usize = *points.iter().max().unwrap();
    //     if leader_score == 0 {
    //         vec![]
    //     } else {
    //         (0..MAX_PLAYERS)
    //             .filter(|&player| points[player] == leader_score)
    //             .map(|player| player as Player)
    //             .collect()
    //     }
    // }

    // pub fn leader(&self) -> Option<Player> {
    //     let leaders = self.leaders();
    //     if leaders.len() == 1 {
    //         Some(leaders[0])
    //     } else {
    //         None
    //     }
    // }

    // pub fn winner(&self, num_players: usize) -> Option<Player> {
    //     if self.is_game_over(num_players) {
    //         self.leader()
    //     } else {
    //         None
    //     }
    // }
}

impl Board {
    pub fn ai_move(&self, player: Player, num_players: usize) -> Option<Coord> {
        use rand::SeedableRng;
        let mut rng = rand::rngs::SmallRng::from_entropy(); // Fast

        let state = mcts::GameState {
            next_player: player,
            num_players,
            board: self.clone(),
        };

        let think_time = 1.0;
        let mut mcts = mcts::Mcts::new(state);
        let start = now_sec();
        while {
            mcts.iterate(&mut rng);
            now_sec() - start < think_time
        } {}

        let action = mcts.best_action().cloned();

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
