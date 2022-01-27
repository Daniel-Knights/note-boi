use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug)]
pub struct Note {
  id: Uuid,
  title: String,
  body: String,
  modified: String,
  modified_timestamp: i64,
}

#[derive(Serialize, Debug)]
pub enum NoteError {
  DirNotFound,
  UnableToCreateFile(String),
  UnableToDeleteFile(String),
  UnableToEditFile(String),
}

impl Note {
  fn new(id: String, title: String, body: String) -> Note {
    let modified = SystemTime::now();

    Note {
      id: Uuid::parse_str(&id).expect("unable to parse id as uuid"),
      title,
      body,
      modified: modified.to_date_format(),
      modified_timestamp: modified.to_date_time().timestamp(),
    }
  }

  pub fn write(title: String, body: String) -> Result<(), NoteError> {
    let notes_path = Path::new(".notes");
    if !notes_path.is_dir() {
      fs::create_dir(notes_path).expect("unable to create dir");
    }

    let id = Uuid::new_v4().to_string();
    let path = Note::get_path(&id);
    let mut file = fs::File::create(path).expect("unable to create file");

    let note = Note::new(id, title, body);
    let note_json = note.serialize();
    let write_res = file.write(note_json.as_ref());

    match write_res {
      Ok(_) => Ok(()),
      Err(e) => Err(NoteError::UnableToCreateFile(e.to_string())),
    }
  }

  pub fn get_all() -> Result<Vec<Note>, NoteError> {
    let notes_path = Path::new(".notes");

    if notes_path.is_dir() {
      let dir_contents = fs::read_dir(notes_path).expect("unable to read dir");
      let mut notes = dir_contents
        .map(|entry| Note::from(entry.expect("unable to read dir entry")))
        .collect::<Vec<Note>>();

      notes.sort_by(|a, b| b.modified_timestamp.cmp(&a.modified_timestamp));

      Ok(notes)
    } else {
      Err(NoteError::DirNotFound)
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

  pub fn edit(id: String, title: String, body: String) -> Result<(), NoteError> {
    let path = Note::get_path(&id);
    let note = Note::new(id, title, body);
    let note_json = note.serialize();
    let write_res = fs::write(path, note_json);

    match write_res {
      Ok(_) => Ok(()),
      Err(e) => Err(NoteError::UnableToEditFile(e.to_string())),
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

trait ToDate {
  fn to_date_time(&self) -> DateTime<Local>;
  fn to_date_format(&self) -> String;
}

impl ToDate for SystemTime {
  fn to_date_time(&self) -> DateTime<Local> {
    DateTime::<Local>::from(*self)
  }
  fn to_date_format(&self) -> String {
    self.to_date_time().format("%c").to_string()
  }
}
