use std::{fs, io::Write, path::Path};

use crate::{
  note::{Note, NoteError},
  AppState, NOTES_DIR,
};

#[tauri::command]
pub fn new_note(state: tauri::State<AppState>, note: Note) -> Result<(), NoteError> {
  new_note_fn(&state.app_dir, &note)
}

pub fn new_note_fn(dir: &Path, note: &Note) -> Result<(), NoteError> {
  let notes_path = dir.join(NOTES_DIR);
  if !notes_path.is_dir() {
    fs::create_dir_all(&notes_path).expect("unable to create dir");
  }

  let path = Note::get_path(&dir, &note.uuid);
  let mut file = fs::File::create(path).expect("unable to create file");
  let write_res = file.write(note.serialize().as_ref());

  match write_res {
    Ok(_) => Ok(()),
    Err(e) => Err(NoteError::UnableToCreateFile(e.to_string())),
  }
}
