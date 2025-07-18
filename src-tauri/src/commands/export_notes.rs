use std::{
  fs,
  io::Write,
  path::{Path, PathBuf},
};

use serde_json::Value;

use crate::note::{Note, NoteError};

#[tauri::command]
pub fn export_notes(save_dir: PathBuf, notes: Vec<Note>) -> Result<(), NoteError> {
  export_notes_fn(&save_dir, &notes)
}

pub fn export_notes_fn(save_dir: &Path, notes: &[Note]) -> Result<(), NoteError> {
  notes.iter().for_each(|note| {
    let filename = format!("{}.txt", note.uuid);
    let mut file = fs::File::create(save_dir.join(filename)).expect("unable to create file");
    let mut file_contents = String::new();

    if note.content.delta.ops.is_some() {
      let ops = note.content.delta.ops.as_ref().unwrap();

      file_contents = ops.iter().fold(String::new(), |acc, op| {
        let default_insert = Value::String(String::new());
        let insert = op
          .get("insert")
          .unwrap_or(&default_insert)
          .as_str()
          .unwrap_or("");

        acc + insert
      });
    }

    file
      .write_all(file_contents.as_bytes())
      .expect("unable to write file");
  });

  Ok(())
}
