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
    let backend = egui_web::WebBackend::new(canvas_id)?;
    let app = Box::new(app::App::restore_or_new());
    let runner = egui_web::AppRunner::new(backend, app)?;
    egui_web::start(runner)?;
    Ok(())
}

impl egui_web::App for app::App {
    fn ui(
        &mut self,
        ctx: &std::sync::Arc<egui::Context>,
        _integration_context: &mut egui::app::IntegrationContext<'_>,
    ) {
        egui::CentralPanel::default().show(ctx, |ui| {
            let width = (ui.max_rect().height() - 200.0) * 0.8; // This is a bit ugly
            let width = width.min(ui.max_rect().width() - 22.0);
            let mut ui = ui.centered_column(width);
            self.show_gui(&mut ui);
        });
    }
}
