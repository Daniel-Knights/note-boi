use std::{fs, path::Path};

use crate::{note::Note, AppState};

#[tauri::command]
pub fn delete_notes(state: tauri::State<AppState>, notes: Vec<Note>) -> Result<(), String> {
  delete_notes_fn(&state.app_dir, &notes).map_err(|err| err.to_string())
}

pub fn delete_notes_fn(dir: &Path, notes: &Vec<Note>) -> Result<(), Box<dyn std::error::Error>> {
  for nt in notes {
    let path = Note::get_path(dir, &nt.uuid);

    fs::remove_file(path)?;
  }

  Ok(())
}
