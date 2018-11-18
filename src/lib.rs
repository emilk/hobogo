extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;

mod ai;

use self::ai::*;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

// How likely is the given player to win?
#[wasm_bindgen]
pub fn ai_evaluate(board: &[i8], player: u8) -> f64 {
    Board::from_js(board).evaluate(player as Player)
}
