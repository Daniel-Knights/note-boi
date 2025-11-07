use std::{collections::HashMap, fs, path::PathBuf};

use uuid::Uuid;

use crate::{note::Note, utils::time::now_millis};

#[tauri::command]
pub fn import_notes(paths: Vec<PathBuf>) -> Result<Vec<Note>, String> {
  import_notes_fn(&paths).map_err(|err| err.to_string())
}

pub fn import_notes_fn(paths: &[PathBuf]) -> Result<Vec<Note>, Box<dyn std::error::Error>> {
  // Use hash map to prevent duplicates
  let mut notes = HashMap::new();

  for path in paths {
    let path_ext = path.extension();
    let raw_note = fs::read_to_string(path)?;

    let mut nt = {
      if path_ext.unwrap() == "json" {
        serde_json::from_str::<Note>(&raw_note)?
      } else {
        Note::from(raw_note)
      }
    };

    // Use file stem as uuid if valid
    let file_stem = path
      .file_stem()
      .and_then(|stem| Some(stem.to_str().unwrap_or("")))
      .unwrap_or("");

    if let Ok(_) = Uuid::try_parse(file_stem) {
      nt.uuid = file_stem.to_string();
    }

    nt.timestamp = now_millis() as i64;
    notes.insert(nt.uuid.clone(), nt);
  }

  return Ok(notes.values().cloned().collect());
}
