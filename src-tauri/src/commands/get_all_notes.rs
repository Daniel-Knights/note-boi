use std::{fs, path::PathBuf};

use crate::{
  note::{Note, NoteError},
  AppState, NOTES_DIR,
};

#[tauri::command]
pub fn get_all_notes(state: tauri::State<AppState>) -> Result<Vec<Note>, NoteError> {
  get_all_notes_fn(&state.app_dir)
}

pub fn get_all_notes_fn(dir: &PathBuf) -> Result<Vec<Note>, NoteError> {
  let notes_path = dir.join(NOTES_DIR);

  if notes_path.is_dir() {
    let dir_contents = fs::read_dir(notes_path).expect("unable to read dir");
    let notes = dir_contents
      // Unwrap
      .map(|entry| entry.expect("unable to read dir entry"))
      // Filter JSON files
      .filter(|entry| match entry.path().extension() {
        Some(ext) => ext.to_str().unwrap() == "json",
        _ => false,
      })
      // Convert
      .map(|entry| Note::from(entry))
      .collect();

    Ok(notes)
  } else {
    fs::create_dir_all(&notes_path).expect("unable to create dir");

    Ok(vec![])
  }
}
