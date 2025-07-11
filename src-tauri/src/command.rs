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
pub fn delete_note(state: tauri::State<AppState>, uuid: String) -> Result<(), NoteError> {
  Note::delete(&state.app_dir, uuid)
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

//// Access token commands

const SERVICE_NAME: &str = "note-boi";

#[tauri::command]
pub fn set_access_token(username: String, access_token: String) -> Result<(), String> {
  let err_msg_prefix = "Unable to set access token:";

  Entry::new(SERVICE_NAME, &username)
    .map_err(|e| format!("{err_msg_prefix} {e}"))?
    .set_password(&access_token)
    .map_err(|e| format!("{err_msg_prefix} {e}"))
}

#[tauri::command]
pub fn get_access_token(username: String) -> Result<String, String> {
  let err_msg_prefix = "Unable to get access token:";

  Entry::new(SERVICE_NAME, &username)
    .map_err(|e| format!("{err_msg_prefix} {e}"))?
    .get_password()
    .map_err(|e| format!("{err_msg_prefix} {e}"))
}

#[tauri::command]
pub fn delete_access_token(username: String) -> Result<(), String> {
  let err_msg_prefix = "Unable to delete access token:";

  Entry::new(SERVICE_NAME, &username)
    .map_err(|e| format!("{err_msg_prefix} {e}"))?
    .delete_credential()
    .map_err(|e| format!("{err_msg_prefix} {e}"))
}
