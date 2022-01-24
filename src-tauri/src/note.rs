use chrono::{DateTime, Local};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Serialize, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct Note {
  id: Uuid,
  title: String,
  body: String,
  created_at: String,
  updated_at: String,
  order: i64,
}

#[derive(Serialize, Debug)]
pub enum NoteError {
  DirNotFound,
  UnableToCreateFile(String),
  UnableToGetFile(String),
  UnableToDeleteFile(String),
  UnableToEditFile(String),
}

fn get_path(id: &String) -> PathBuf {
  PathBuf::from(".notes/".to_owned() + id)
}

fn format_date(time: SystemTime) -> String {
  DateTime::<Local>::from(time).format("%c").to_string()
}

impl Note {
  fn new(path: PathBuf, id: String) -> Note {
    let file_contents = fs::read_to_string(&path).expect("unable to read from path");
    let (title, body) = file_contents.split_once(&id).unwrap();

    let metadata = path.metadata().expect("unable to get metadata");
    let created = metadata.created().expect("created field unavailable");
    let modified = metadata.modified().expect("modified field unavailable");

    Note {
      id: Uuid::parse_str(&id).expect("unable to parse id as uuid"),
      title: title.to_string(),
      body: body.to_string(),
      created_at: format_date(created),
      updated_at: format_date(modified),
      order: DateTime::<Local>::from(modified).timestamp(),
    }
  }

  pub fn write(title: String, body: String) -> Result<Note, NoteError> {
    let notes_path = Path::new(".notes");

    if !notes_path.is_dir() {
      fs::create_dir(notes_path).expect("unable to create dir");
    }

    let id = Uuid::new_v4().to_string();
    let path = get_path(&id);
    let file_contents = title + &id + &body;
    let write_result = fs::write(&path, file_contents);

    match write_result {
      Ok(_) => Ok(Note::new(path, id)),
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

      notes.sort_by(|a, b| b.order.cmp(&a.order));

      Ok(notes)
    } else {
      Err(NoteError::DirNotFound)
    }
  }

  pub fn get(id: String) -> Result<Note, NoteError> {
    let path = get_path(&id);
    let read_res = fs::read_to_string(&path);

    match read_res {
      Ok(_) => Ok(Note::new(path, id)),
      Err(e) => Err(NoteError::UnableToGetFile(e.to_string())),
    }
  }

  pub fn delete(id: String) -> Result<bool, NoteError> {
    let file_path = get_path(&id);
    let delete_res = fs::remove_file(file_path);

    match delete_res {
      Ok(_) => Ok(true),
      Err(e) => Err(NoteError::UnableToDeleteFile(e.to_string())),
    }
  }

  pub fn edit(id: String, title: String, body: String) -> Result<Note, NoteError> {
    let path = get_path(&id);
    let write_res = fs::write(&path, title + &id + &body);

    match write_res {
      Ok(_) => Ok(Note::new(path, id)),
      Err(e) => Err(NoteError::UnableToEditFile(e.to_string())),
    }
  }
}

impl From<fs::DirEntry> for Note {
  fn from(entry: fs::DirEntry) -> Note {
    Note::new(entry.path(), entry.file_name().into_string().unwrap())
  }
}
