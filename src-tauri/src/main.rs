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
use tauri::{WindowBuilder, WindowEvent, WindowUrl};

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
    .on_window_event(|e| match e.event() {
      WindowEvent::Moved(pos) => {
        let mut current_config = Config::get();
        current_config.window_state.position = (pos.x.into(), pos.y.into());

        Config::set(current_config).expect("unable to set new window position");
      }
      WindowEvent::Resized(_) => {
        let mut current_config = Config::get();
        let size = e.window().inner_size().expect("msg");
        current_config.window_state.size = (size.width.into(), size.height.into());

        Config::set(current_config).expect("unable to set new window size");
      }
      _ => {}
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
