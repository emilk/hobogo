extern crate rand;
extern crate wasm_bindgen;
extern crate web_sys;

use wasm_bindgen::prelude::*;

mod hobogo;

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

// How likely is the given player to win?
#[wasm_bindgen]
pub fn ai_evaluate(board: &[i8], player: u8) -> f64 {
    Board::from_js(board).evaluate(player as Player)
}

#[wasm_bindgen]
pub fn ai_move(board: &[i8], player: u8) -> JsCoord {
    let coord = Board::from_js(board)
        .ai_move(player as Player)
        .unwrap_or(Coord { x: -1, y: -1 });
    JsCoord {
        x: coord.x,
        y: coord.y,
    }
}
