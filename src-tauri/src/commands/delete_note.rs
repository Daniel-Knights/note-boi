use std::{fs, path::Path};

use crate::{note::Note, AppState};

#[tauri::command]
pub fn delete_note(state: tauri::State<AppState>, uuid: String) -> Result<(), String> {
  delete_note_fn(&state.app_dir, &uuid).map_err(|err| err.to_string())
}

pub fn delete_note_fn(dir: &Path, uuid: &String) -> Result<(), Box<dyn std::error::Error>> {
  let path = Note::get_path(dir, uuid);

  fs::remove_file(path)?;

  Ok(())
}
