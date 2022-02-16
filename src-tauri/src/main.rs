#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod command;
mod note;

use std::path::PathBuf;

use crate::command::{delete_note, edit_note, get_all_notes, new_note};
use tauri::{Manager, WindowBuilder, WindowUrl};

#[derive(Debug)]
pub struct AppState {
  app_dir: PathBuf,
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      delete_note,
      edit_note,
      get_all_notes,
      new_note
    ])
    .create_window("main", WindowUrl::App("".into()), |win, attr| {
      (
        win
          .title("NoteBoi")
          .min_inner_size(600.0, 400.0)
          .resizable(true)
          .fullscreen(false)
          .visible(false),
        attr,
      )
    })
    .setup(|app| {
      let state = AppState {
        app_dir: app.path_resolver().app_dir().unwrap(),
      };

      app.manage(state);

      Ok(())
    })
    .plugin(tauri_plugin_window_state::WindowState::default())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
