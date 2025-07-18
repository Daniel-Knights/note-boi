mod commands;
mod menu;
mod note;

use crate::commands::{
  access_token::{delete_access_token, get_access_token, set_access_token},
  backup_notes::backup_notes,
  delete_note::delete_note,
  edit_note::edit_note,
  export_notes::export_notes,
  get_all_notes::get_all_notes,
  import_notes::import_notes,
  new_note::new_note,
  sync_local_notes::sync_local_notes,
};
use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

pub const NOTES_DIR: &str = ".notes";
pub const BACKUP_DIR: &str = ".backup";

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
      backup_notes,
      delete_note,
      edit_note,
      export_notes,
      get_all_notes,
      import_notes,
      new_note,
      sync_local_notes,
      set_access_token,
      get_access_token,
      delete_access_token
    ])
    .setup(|app| {
      // Needs to be mutable in dev, but will warn on build
      #[allow(unused_mut)]
      let mut app_dir = app.path().app_data_dir().unwrap();

      // If dev env, append `-dev` to app directory
      #[cfg(debug_assertions)]
      {
        let mut dir_name = app_dir.file_name().unwrap().to_string_lossy().to_string();

        dir_name.push_str("-dev");
        app_dir.set_file_name(dir_name);
      }

      let state = AppState { app_dir };

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
