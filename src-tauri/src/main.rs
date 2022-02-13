#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod command;
mod config;
mod note;
mod window;

use crate::command::{delete_note, edit_note, get_all_notes, new_note};
use crate::config::Config;
use tauri::{WindowBuilder, WindowUrl};
use window::WindowState;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      delete_note,
      edit_note,
      get_all_notes,
      new_note
    ])
    .create_window("main", WindowUrl::App("".into()), |win, attr| {
      let config = Config::get();

      (
        win
          .title("NoteBoi")
          .inner_size(config.window_state.size.0, config.window_state.size.1)
          .min_inner_size(600.0, 400.0)
          .position(
            config.window_state.position.0,
            config.window_state.position.1,
          )
          .resizable(true)
          .fullscreen(false)
          .always_on_top(true),
        attr,
      )
    })
    .on_window_event(|ev| WindowState::handle_event(ev))
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
