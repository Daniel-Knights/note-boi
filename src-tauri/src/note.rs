use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug)]
pub struct Note {
  id: Uuid,
  title: String,
  body: String,
  created_at: String,
  updated_at: String,
  modified_timestamp: i64,
}

#[derive(Serialize, Debug)]
pub enum NoteError {
  DirNotFound,
  UnableToCreateFile(String),
  UnableToGetFile(String),
  UnableToDeleteFile(String),
  UnableToEditFile(String),
}

fn get_path(id: &String, with_ext: bool) -> PathBuf {
  let path_str = ".notes/".to_owned() + id;

  match with_ext {
    true => PathBuf::from(path_str + ".json"),
    false => PathBuf::from(path_str),
  }
}

fn format_date(time: SystemTime) -> String {
  DateTime::<Local>::from(time).format("%c").to_string()
}

fn serialize_note(note: &Note) -> String {
  serde_json::to_string(note).expect("unable to serialize note struct")
}

fn deserialize_note(note_json: &String) -> Note {
  serde_json::from_str::<Note>(note_json).expect("unable to deserialize note json")
}

impl Note {
  fn new(path: &PathBuf, id: String, title: String, body: String) -> Note {
    let metadata = path.metadata().expect("unable to get metadata");
    let created = metadata.created().expect("created field unavailable");
    let modified = metadata.modified().expect("modified field unavailable");

    Note {
      id: Uuid::parse_str(&id).expect("unable to parse id as uuid"),
      title,
      body,
      created_at: format_date(created),
      updated_at: format_date(modified),
      modified_timestamp: DateTime::<Local>::from(modified).timestamp(),
    }
  }

  pub fn write(title: String, body: String) -> Result<Note, NoteError> {
    let notes_path = Path::new(".notes");

    if !notes_path.is_dir() {
      fs::create_dir(notes_path).expect("unable to create dir");
    }

    let id = Uuid::new_v4().to_string();
    let path = get_path(&id, true);

    fs::write(&path, "").unwrap();

    let note = Note::new(&path, id, title, body);
    let note_json = serialize_note(&note);
    let write_res = fs::write(path, note_json);

    match write_res {
      Ok(_) => Ok(note),
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

  pub fn get(id: String) -> Result<Note, NoteError> {
    let path = get_path(&id, true);
    let read_res = fs::read_to_string(&path);

    match read_res {
      Ok(note_json) => Ok(deserialize_note(&note_json)),
      Err(e) => Err(NoteError::UnableToGetFile(e.to_string())),
    }
  }

  pub fn delete(id: String) -> Result<bool, NoteError> {
    let path = get_path(&id, true);
    let delete_res = fs::remove_file(path);

    match delete_res {
      Ok(_) => Ok(true),
      Err(e) => Err(NoteError::UnableToDeleteFile(e.to_string())),
    }
  }

  pub fn edit(id: String, title: String, body: String) -> Result<Note, NoteError> {
    let path = get_path(&id, true);
    let note = Note::new(&path, id, title, body);
    let note_json = serialize_note(&note);
    let write_res = fs::write(path, note_json);

    match write_res {
      Ok(_) => Ok(note),
      Err(e) => Err(NoteError::UnableToEditFile(e.to_string())),
    }
  }
}

impl From<fs::DirEntry> for Note {
  fn from(entry: fs::DirEntry) -> Note {
    let file_name = entry.file_name().into_string().unwrap();
    let path = get_path(&file_name, false);
    let note_json = fs::read_to_string(path).expect("unable to read file");

    deserialize_note(&note_json)
  }
}
