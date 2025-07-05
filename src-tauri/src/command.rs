use std::path::PathBuf;

use keyring::Entry;

use crate::{
  note::{Note, NoteError},
  AppState,
};

// Note commands
#[tauri::command]
pub fn new_note(state: tauri::State<AppState>, note: Note) -> Result<(), NoteError> {
  Note::new(&state.app_dir, &note)
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
pub fn sync_local_notes(state: tauri::State<AppState>, notes: Vec<Note>) -> Result<(), NoteError> {
  Note::sync_local(&state.app_dir, notes)
}

#[tauri::command]
pub fn export_notes(save_dir: PathBuf, notes: Vec<Note>) -> Result<(), NoteError> {
  Note::export(&save_dir, notes)
}

#[tauri::command]
pub fn backup_notes(state: tauri::State<AppState>, notes: Vec<Note>) -> Result<(), NoteError> {
  Note::backup(&state.app_dir, &notes)
}

// Access token commands
#[tauri::command]
pub fn set_access_token(username: String, access_token: String) -> Result<(), String> {
  Entry::new("note-boi", &username)
    .unwrap()
    .set_password(&access_token)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_access_token(username: String) -> Result<String, String> {
  Entry::new("note-boi", &username)
    .unwrap()
    .get_password()
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_access_token(username: String) -> Result<(), String> {
  Entry::new("note-boi", &username)
    .unwrap()
    .delete_credential()
    .map_err(|e| e.to_string())
}
