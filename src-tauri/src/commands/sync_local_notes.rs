use std::{fs, path::Path};

use crate::{commands::new_note::new_note_fn, note::Note, AppState, NOTES_DIR};

#[tauri::command()]
pub fn sync_local_notes(state: tauri::State<AppState>, notes: Vec<Note>) -> Result<(), String> {
  sync_local_notes_fn(&state.app_dir, &notes).map_err(|err| err.to_string())
}

pub fn sync_local_notes_fn(dir: &Path, notes: &[Note]) -> Result<(), Box<dyn std::error::Error>> {
  let notes_dir = dir.join(NOTES_DIR);

  fs::remove_dir_all(&notes_dir)?;

  for nt in notes {
    new_note_fn(dir, nt)?;
  }

  Ok(())
}
