use std::{fs, path::Path};

use crate::{note::Note, AppState};

#[tauri::command]
pub fn edit_note(state: tauri::State<AppState>, note: Note) -> Result<(), String> {
  edit_note_fn(&state.app_dir, &note).map_err(|err| err.to_string())
}

pub fn edit_note_fn(dir: &Path, note: &Note) -> Result<(), Box<dyn std::error::Error>> {
  let path = Note::get_path(&dir, &note.uuid);

  fs::write(path, serde_json::to_string(note)?)?;

  Ok(())
}
