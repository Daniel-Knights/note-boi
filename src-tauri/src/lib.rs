mod command;
mod menu;
mod note;

use crate::command::{
  delete_note, edit_note, export_notes, get_all_notes, new_note, sync_local_notes,
};
use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

#[derive(Debug)]
pub struct AppState {
  app_dir: PathBuf,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Only log to the log file
  let log_targets = [Target::new(TargetKind::LogDir { file_name: None })];

  tauri::Builder::default()
    .plugin(
      tauri_plugin_log::Builder::new()
        .clear_targets()
        .targets(log_targets)
        .build(),
    )
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
      sync_local_notes,
    ])
    .setup(|app| {
      let state = AppState {
        app_dir: app.path().app_data_dir().unwrap(),
      };

      app.manage(state);

      // Set menu
      if cfg!(target_os = "macos") {
        app.set_menu(menu::get_menu(app)).unwrap();
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
