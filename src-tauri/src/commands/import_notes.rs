use std::{
  path::{Path, PathBuf},
  time::{SystemTime, UNIX_EPOCH},
};

use crate::{commands::new_note::new_note_fn, note::Note, AppState};

#[tauri::command]
pub fn import_notes(
  state: tauri::State<AppState>,
  paths: Vec<PathBuf>,
) -> Result<Vec<Note>, Vec<String>> {
  import_notes_fn(&state.app_dir, &paths)
    .map_err(|errors| errors.iter().map(|err| err.to_string()).collect())
}

pub fn import_notes_fn(
  dir: &Path,
  paths: &[PathBuf],
) -> Result<Vec<Note>, Vec<Box<dyn std::error::Error>>> {
  let mut notes = vec![];
  let mut errors = vec![];

  for path in paths {
    let note_parse_result = Note::try_from(path.clone());
    let now = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .unwrap()
      .as_millis() as i64;

    match note_parse_result {
      Ok(mut note) => {
        note.timestamp = now;

        if let Err(note_write_err) = new_note_fn(dir, &note) {
          errors.push(note_write_err);
        } else {
          notes.push(note);
        }
      }
      Err(note_read_err) => {
        errors.push(note_read_err);
      }
    }
  }

  if errors.is_empty() {
    return Ok(notes);
  }

  Err(errors)
}
