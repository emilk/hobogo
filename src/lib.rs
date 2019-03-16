#![deny(warnings)]
#![allow(dead_code)] // TODO

extern crate serde_json;
extern crate wasm_bindgen;

#[macro_use]
extern crate serde_derive;

extern crate emigui;
extern crate emigui_wasm;

use emigui::{types::srgba, Align, Emigui, RawInput};

use wasm_bindgen::prelude::*;

mod app;
mod hobogo;
mod mcts;

#[wasm_bindgen]
pub struct State {
    app: app::App,
    emigui: Emigui,
    webgl_painter: emigui_wasm::webgl::Painter,
}

impl State {
    fn new(canvas_id: &str, pixels_per_point: f32) -> Result<State, JsValue> {
        Ok(State {
            app: app::App::restore_or_new(),
            emigui: Emigui::new(pixels_per_point),
            webgl_painter: emigui_wasm::webgl::Painter::new(canvas_id)?,
        })
    }

    fn run(&mut self, raw_input: RawInput) -> Result<(), JsValue> {
        self.emigui.new_frame(raw_input);

        let mut region = self.emigui.whole_screen_region();
        let width = (region.height() - 200.0) * 0.8; // This is a bit ugly
        let width = width.min(region.width() - 22.0);
        let mut region = region.centered_column(width, Align::Min);
        self.app.show_gui(&mut region);

        let bg_color = srgba(13, 8, 31, 255); // TODO: get from CSS?
        let mesh = self.emigui.paint();
        self.webgl_painter.paint(
            bg_color,
            mesh,
            self.emigui.texture(),
            raw_input.pixels_per_point,
        )
    }
}

#[wasm_bindgen]
pub fn new_webgl_gui(canvas_id: &str, pixels_per_point: f32) -> Result<State, JsValue> {
    State::new(canvas_id, pixels_per_point)
}

#[wasm_bindgen]
pub fn run_gui(state: &mut State, raw_input_json: &str) -> Result<(), JsValue> {
    // TODO: nicer interface than JSON
    let raw_input: RawInput = serde_json::from_str(raw_input_json).unwrap();
    state.run(raw_input)
}
