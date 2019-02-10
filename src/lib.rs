#![deny(warnings)]
#![allow(dead_code)] // TODO

extern crate serde_json;
extern crate wasm_bindgen;

extern crate emigui;
extern crate emigui_wasm;

use emigui::{Align, Emigui, RawInput};

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
            app: Default::default(),
            emigui: Emigui::new(pixels_per_point),
            webgl_painter: emigui_wasm::webgl::Painter::new(canvas_id)?,
        })
    }

    fn run(&mut self, raw_input: RawInput) -> Result<(), JsValue> {
        self.emigui.new_frame(raw_input);

        let mut region = self.emigui.whole_screen_region();
        let mut region = region.centered_column(region.width().min(480.0), Align::Min);
        self.app.show_gui(&mut region);

        let frame = self.emigui.paint();
        self.webgl_painter
            .paint(&frame, self.emigui.texture(), raw_input.pixels_per_point)
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
