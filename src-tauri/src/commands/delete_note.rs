use std::{fs, path::Path};

use crate::{
  note::{Note, NoteError},
  AppState,
};

#[tauri::command]
pub fn delete_note(state: tauri::State<AppState>, uuid: String) -> Result<(), NoteError> {
  delete_note_fn(&state.app_dir, &uuid)
}

pub fn delete_note_fn(dir: &Path, uuid: &String) -> Result<(), NoteError> {
  let path = Note::get_path(dir, uuid);
  let delete_res = fs::remove_file(path);

  match delete_res {
    Ok(_) => Ok(()),
    Err(e) => Err(NoteError::UnableToDeleteFile(e.to_string())),
  }
}
