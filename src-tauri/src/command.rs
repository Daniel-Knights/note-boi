use crate::note::{Note, NoteError};

#[tauri::command]
pub fn new_note(id: String, title: String, body: String, timestamp: i64) -> Result<(), NoteError> {
  Note::write(id, title, body, timestamp)
}

#[tauri::command]
pub fn get_all_notes() -> Result<Vec<Note>, NoteError> {
  Note::get_all()
}

#[tauri::command]
pub fn delete_note(id: String) -> Result<(), NoteError> {
  Note::delete(id)
}

#[tauri::command]
pub fn edit_note(id: String, title: String, body: String, timestamp: i64) -> Result<(), NoteError> {
  Note::edit(id, title, body, timestamp)
}
