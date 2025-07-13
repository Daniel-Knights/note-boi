use std::{fs, path::PathBuf};

use crate::{
  commands::new_note::new_note_fn,
  note::{Note, NoteError},
  AppState, NOTES_DIR,
};

#[tauri::command()]
pub fn sync_local_notes(state: tauri::State<AppState>, notes: Vec<Note>) -> Result<(), NoteError> {
  sync_local_notes_fn(&state.app_dir, &notes)
}

pub fn sync_local_notes_fn(dir: &PathBuf, notes: &Vec<Note>) -> Result<(), NoteError> {
  let notes_dir = dir.join(NOTES_DIR);

  let rm_res = fs::remove_dir_all(&notes_dir);

  if rm_res.is_err() {
    return Err(NoteError::UnableToSyncLocalFiles(
      rm_res.unwrap_err().to_string(),
    ));
  }

  for nt in notes.iter() {
    let write_res = new_note_fn(dir, nt);

    if write_res.is_err() {
      return Err(write_res.unwrap_err());
    }
  }

  Ok(())
}
