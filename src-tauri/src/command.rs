use crate::note::{Note, NoteError};

#[tauri::command]
pub fn new_note(title: String, body: String) -> Result<(), NoteError> {
  Note::write(title, body)
}

#[tauri::command]
pub fn get_all_notes() -> Result<Vec<Note>, NoteError> {
  Note::get_all()
}

#[tauri::command]
pub fn get_note(id: String) -> Result<Note, NoteError> {
  Note::get(id)
}

#[tauri::command]
pub fn delete_note(id: String) -> Result<(), NoteError> {
  Note::delete(id)
}

#[tauri::command]
pub fn edit_note(id: String, title: String, body: String) -> Result<(), NoteError> {
  Note::edit(id, title, body)
}
