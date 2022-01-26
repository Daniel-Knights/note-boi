#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod command;
mod note;
use crate::command::{delete_note, edit_note, get_all_notes, new_note};

use tauri::{CustomMenuItem, Menu, Submenu};

fn main() {
  let about = CustomMenuItem::new("about".to_string(), "About");
  let preferences = CustomMenuItem::new("preferences".to_string(), "Preferences");
  let quit = CustomMenuItem::new("quit".to_string(), "Quit");
  let submenu = Submenu::new(
    "File",
    Menu::new()
      .add_item(about)
      .add_item(preferences)
      .add_item(quit),
  );
  let menu = Menu::new().add_submenu(submenu);

  tauri::Builder::default()
    .menu(menu)
    .on_menu_event(|event| match event.menu_item_id() {
      "about" => {
        todo!();
      }
      "preferences" => {
        todo!();
      }
      "quit" => {
        std::process::exit(0);
      }
      _ => {}
    })
    .invoke_handler(tauri::generate_handler![
      delete_note,
      edit_note,
      get_all_notes,
      new_note
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
