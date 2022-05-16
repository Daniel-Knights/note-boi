#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod command;
mod menu;
mod note;

use crate::command::{delete_note, edit_note, get_all_notes, new_note, sync_all_local_notes};
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug)]
pub struct AppState {
  app_dir: PathBuf,
}

fn main() {
  let mut builder = tauri::Builder::default().invoke_handler(tauri::generate_handler![
    delete_note,
    edit_note,
    get_all_notes,
    new_note,
    sync_all_local_notes
  ]);

  if cfg!(target_os = "macos") {
    // Only set menu for MacOS
    builder = menu::set_menu(builder);
  }

  builder
    .setup(|app| {
      let state = AppState {
        app_dir: app.path_resolver().app_dir().unwrap(),
      };

      app.manage(state);

      if cfg!(target_os = "macos") {
        menu::toggle_sync_items(app);
      }

      let handle = app.handle();

      tauri::async_runtime::spawn(async move {
        match tauri::updater::builder(handle).check().await {
          Ok(update) => {
            update.download_and_install().await.unwrap();
          }
          Err(error) => {
            println!("Error: {}", error);
          }
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
