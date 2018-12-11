extern crate rand;
extern crate wasm_bindgen;
extern crate web_sys;

use wasm_bindgen::prelude::*;

mod hobogo;
mod mcts;

use self::hobogo::{Board, Coord, Player};

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub struct JsCoord {
    pub x: i32,
    pub y: i32,
}

#[wasm_bindgen]
pub fn game_over(board: &[i8], num_players: usize) -> bool {
    Board::from_js(board).game_over(num_players)
}

#[wasm_bindgen]
pub fn ai_move(board: &[i8], player: u8, num_players: usize) -> JsCoord {
    let coord = Board::from_js(board)
        .ai_move(player as Player, num_players)
        .unwrap_or(Coord { x: -1, y: -1 });
    JsCoord {
        x: coord.x,
        y: coord.y,
    }
}

#[wasm_bindgen]
pub fn volatile_cells(board: &[i8], num_players: usize) -> Vec<u8> {
    Board::from_js(board)
        .volatile_cells(num_players)
        .into_iter()
        .map(|ruled| if ruled { 1 } else { 0 })
        .collect()
}
