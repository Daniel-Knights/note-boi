#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod command;
mod note;
use crate::command::{delete_note, edit_note, get_all_notes, get_note, new_note};

use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

fn main() {
  let quit = CustomMenuItem::new("quit".to_string(), "Quit");
  let close = CustomMenuItem::new("close".to_string(), "Close");
  let submenu = Submenu::new("File", Menu::new().add_item(quit).add_item(close));
  let menu = Menu::new()
    .add_native_item(MenuItem::Copy)
    .add_item(CustomMenuItem::new("hide", "Hide"))
    .add_submenu(submenu);

  tauri::Builder::default()
    .menu(menu)
    .invoke_handler(tauri::generate_handler![
      delete_note,
      edit_note,
      get_all_notes,
      get_note,
      new_note
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
