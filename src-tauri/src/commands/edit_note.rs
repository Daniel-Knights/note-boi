use std::{fs, path::Path};

use crate::{
  note::{Note, NoteError},
  AppState,
};

#[tauri::command]
pub fn edit_note(state: tauri::State<AppState>, note: Note) -> Result<(), NoteError> {
  edit_note_fn(&state.app_dir, &note)
}

pub fn edit_note_fn(dir: &Path, note: &Note) -> Result<(), NoteError> {
  let path = Note::get_path(&dir, &note.uuid);
  let write_res = fs::write(path, note.serialize());

  match write_res {
    Ok(_) => Ok(()),
    Err(e) => Err(NoteError::UnableToEditFile(e.to_string())),
  }
}
