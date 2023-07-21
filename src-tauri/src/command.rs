use std::path::PathBuf;

use crate::{
  note::{Note, NoteError},
  AppState,
};

#[tauri::command]
pub fn new_note(state: tauri::State<AppState>, note: Note) -> Result<(), NoteError> {
  Note::write(&state.app_dir, &note)
}

#[tauri::command]
pub fn get_all_notes(state: tauri::State<AppState>) -> Result<Vec<Note>, NoteError> {
  Note::get_all(&state.app_dir)
}

#[tauri::command]
pub fn delete_note(state: tauri::State<AppState>, id: String) -> Result<(), NoteError> {
  Note::delete(&state.app_dir, id)
}

#[tauri::command]
pub fn edit_note(state: tauri::State<AppState>, note: Note) -> Result<(), NoteError> {
  Note::edit(&state.app_dir, note)
}

#[tauri::command]
pub fn sync_all_local_notes(
  state: tauri::State<AppState>,
  notes: Vec<Note>,
) -> Result<(), NoteError> {
  Note::sync_all_local(&state.app_dir, notes)
}

#[tauri::command]
pub fn export_notes(save_dir: PathBuf, notes: Vec<Note>) -> Result<(), NoteError> {
  Note::export(&save_dir, notes)
}
