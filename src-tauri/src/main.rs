#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod command;
mod menu;
mod note;

use crate::command::{delete_note, edit_note, get_all_notes, new_note};

fn main() {
  tauri::Builder::default()
    .menu(menu::get_menu())
    .on_menu_event(menu::handle_event)
    .invoke_handler(tauri::generate_handler![
      delete_note,
      edit_note,
      get_all_notes,
      new_note
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
