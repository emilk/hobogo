#![deny(warnings)]
#![allow(dead_code)] // TODO

mod app;
mod hobogo;
mod mcts;

// ----------------------------------------------------------------------------

use wasm_bindgen::prelude::*;

/// This is the entry-point for all the web-assembly.
#[wasm_bindgen]
pub fn start(canvas_id: &str) -> Result<(), wasm_bindgen::JsValue> {
    let backend = egui_web::Backend::new(canvas_id, egui_web::RunMode::Reactive)?;
    let app = Box::new(app::App::restore_or_new());
    let runner = egui_web::AppRunner::new(backend, app)?;
    egui_web::run(runner)?;
    Ok(())
}

impl egui_web::App for app::App {
    fn ui(
        &mut self,
        ui: &mut egui::Ui,
        _backend: &mut egui_web::Backend,
        _info: &egui_web::WebInfo,
    ) {
        let width = (ui.rect().height() - 200.0) * 0.8; // This is a bit ugly
        let width = width.min(ui.rect().width() - 22.0);
        let mut ui = ui.centered_column(width);
        self.show_gui(&mut ui);
    }
}
