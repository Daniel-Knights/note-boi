use std::{fs, path::Path};

use crate::{note::Note, AppState, NOTES_DIR};

#[tauri::command]
pub fn get_all_notes(state: tauri::State<AppState>) -> Result<Vec<Note>, String> {
  get_all_notes_fn(&state.app_dir).map_err(|err| err.to_string())
}

pub fn get_all_notes_fn(dir: &Path) -> Result<Vec<Note>, Box<dyn std::error::Error>> {
  let notes_path = dir.join(NOTES_DIR);

  if !notes_path.is_dir() {
    fs::create_dir_all(&notes_path)?;

    return Ok(vec![]);
  }

  let mut notes = vec![];

  for entry in fs::read_dir(notes_path)? {
    let entry_path = entry?.path();
    let entry_is_json = entry_path.extension().is_some_and(|ext| ext == "json");

    if entry_is_json {
      let raw_note = fs::read_to_string(entry_path)?;

      notes.push(serde_json::from_str::<Note>(&raw_note)?);
    }
  }

  Ok(notes)
}
