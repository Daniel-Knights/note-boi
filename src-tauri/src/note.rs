use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Debug)]
pub struct Note {
  id: String,
  title: String,
  body: String,
  timestamp: i64,
}

#[derive(Serialize, Debug)]
pub enum NoteError {
  DirNotFound,
  UnableToCreateFile(String),
  UnableToDeleteFile(String),
  UnableToEditFile(String),
}

impl Note {
  fn new(id: String, title: String, body: String, timestamp: i64) -> Note {
    Note {
      id,
      title,
      body,
      timestamp,
    }
  }

  pub fn get_all() -> Result<Vec<Note>, NoteError> {
    let notes_path = Path::new(".notes");

    if notes_path.is_dir() {
      let dir_contents = fs::read_dir(notes_path).expect("unable to read dir");
      let mut notes = dir_contents
        .map(|entry| Note::from(entry.expect("unable to read dir entry")))
        .collect::<Vec<Note>>();

      notes.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

      Ok(notes)
    } else {
      Err(NoteError::DirNotFound)
    }
  }

  pub fn write(id: String, title: String, body: String, timestamp: i64) -> Result<(), NoteError> {
    let notes_path = Path::new(".notes");
    if !notes_path.is_dir() {
      fs::create_dir(notes_path).expect("unable to create dir");
    }

    let path = Note::get_path(&id);
    let mut file = fs::File::create(path).expect("unable to create file");

    let note = Note::new(id, title, body, timestamp);
    let note_json = note.serialize();
    let write_res = file.write(note_json.as_ref());

    match write_res {
      Ok(_) => Ok(()),
      Err(e) => Err(NoteError::UnableToCreateFile(e.to_string())),
    }
  }

  pub fn edit(id: String, title: String, body: String, timestamp: i64) -> Result<(), NoteError> {
    let path = Note::get_path(&id);
    let note = Note::new(id, title, body, timestamp);
    let note_json = note.serialize();
    let write_res = fs::write(path, note_json);

    match write_res {
      Ok(_) => Ok(()),
      Err(e) => Err(NoteError::UnableToEditFile(e.to_string())),
    }
  }

  pub fn delete(id: String) -> Result<(), NoteError> {
    let path = Note::get_path(&id);
    let delete_res = fs::remove_file(path);

    match delete_res {
      Ok(_) => Ok(()),
      Err(e) => Err(NoteError::UnableToDeleteFile(e.to_string())),
    }
  }

  /// Returns `.notes/{id}.json`
  fn get_path(id: &String) -> PathBuf {
    PathBuf::from(".notes/".to_owned() + id + ".json")
  }
  /// Serialize `Note` to a JSON string
  fn serialize(&self) -> String {
    serde_json::to_string(self).expect("unable to serialize note struct")
  }
  /// Deserialize `Note` from a JSON string
  fn deserialize(note_json: &String) -> Note {
    serde_json::from_str::<Note>(note_json).expect("unable to deserialize note json")
  }
}

impl From<fs::DirEntry> for Note {
  fn from(entry: fs::DirEntry) -> Note {
    let note_json = fs::read_to_string(entry.path()).expect("unable to read file");

    Note::deserialize(&note_json)
  }
}
