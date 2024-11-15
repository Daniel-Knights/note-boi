#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod command;
mod menu;
mod note;

use crate::command::{
  delete_note, edit_note, export_notes, get_all_notes, new_note, sync_local_notes,
};
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug)]
pub struct AppState {
  app_dir: PathBuf,
}

fn main() {
  let mut builder = tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      delete_note,
      edit_note,
      export_notes,
      get_all_notes,
      new_note,
      sync_local_notes
    ]);

  if cfg!(target_os = "macos") {
    // Only set menu for MacOS
    builder = menu::set_menu(builder);
  }

  builder
    .setup(|app| {
      let state = AppState {
        app_dir: app.path_resolver().app_data_dir().unwrap(),
      };

      app.manage(state);

      if cfg!(target_os = "macos") {
        menu::toggle_sync_items(app);
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
