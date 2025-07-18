use std::{fs, io::Write, path::Path};

use crate::{note::Note, AppState, NOTES_DIR};

#[tauri::command]
pub fn new_note(state: tauri::State<AppState>, note: Note) -> Result<(), String> {
  new_note_fn(&state.app_dir, &note).map_err(|err| err.to_string())
}

pub fn new_note_fn(dir: &Path, note: &Note) -> Result<(), Box<dyn std::error::Error>> {
  let notes_path = dir.join(NOTES_DIR);

  if !notes_path.is_dir() {
    fs::create_dir_all(&notes_path)?;
  }

  let path = Note::get_path(&dir, &note.uuid);
  let mut file = fs::File::create(path)?;

  file.write(serde_json::to_string(note)?.as_ref())?;

  Ok(())
}
