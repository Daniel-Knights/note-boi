use chrono::prelude::{DateTime, Utc};
use serde::Serialize;
use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Serialize, Debug)]
pub struct Note {
  id: NoteId,
  title: String,
  body: String,
  created_at: String,
  updated_at: String,
}

#[derive(Serialize, Debug)]
pub struct NoteId(String);

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

fn format_date(metadata: fs::Metadata) -> (String, String) {
  let created_at = metadata.created().unwrap();
  let updated_at = metadata.modified().unwrap();

  let convert = |time: SystemTime| -> DateTime<Utc> { time.into() };
  let format = |time| convert(time).format("%c").to_string();

  (format(created_at), format(updated_at))
}

impl Note {
  fn new(path: PathBuf, id: String, metadata: fs::Metadata) -> Note {
    let file_contents = fs::read_to_string(path).unwrap();
    let (title, body) = file_contents.split_once(&id).unwrap();
    let (created_at, updated_at) = format_date(metadata);

    Note {
      id: NoteId(id),
      title: title.to_string(),
      body: body.to_string(),
      created_at,
      updated_at,
    }
  }

  pub fn write(title: String, body: String) -> Result<Note, NoteError> {
    let notes_path = Path::new(".notes");

    if !notes_path.is_dir() {
      fs::create_dir(notes_path).unwrap();
    }

    let id = Uuid::new_v4().to_string();
    let path = get_path(&id);
    let file_contents = title + &id + &body;
    let write_result = fs::write(&path, file_contents);

    match write_result {
      Ok(_) => {
        let metadata = fs::metadata(&path).unwrap();

        Ok(Note::new(path, id, metadata))
      }
      Err(e) => Err(NoteError::UnableToCreateFile(e.to_string())),
    }
  }

  pub fn get_all() -> Result<Vec<Note>, NoteError> {
    let notes_path = Path::new(".notes");

    if notes_path.is_dir() {
      let dir_contents = fs::read_dir(notes_path).unwrap();
      let notes = dir_contents
        .map(|x| Note::from(x.unwrap()))
        .collect::<Vec<Note>>();

      Ok(notes)
    } else {
      Err(NoteError::DirNotFound)
    }
  }

  pub fn get(id: String) -> Result<Note, NoteError> {
    let file_path = get_path(&id);
    let read_res = fs::read_to_string(&file_path);

    match read_res {
      Ok(nt) => {
        let (title, body) = nt.split_once(&id).unwrap();
        let note_metadata = fs::File::open(file_path).unwrap().metadata().unwrap();
        let (created_at, updated_at) = format_date(note_metadata);

        Ok(Note {
          id: NoteId(id),
          title: title.to_string(),
          body: body.to_string(),
          created_at,
          updated_at,
        })
      }
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
      Ok(_) => {
        let metadata = fs::metadata(&path).unwrap();

        Ok(Note::new(path, id, metadata))
      }
      Err(e) => Err(NoteError::UnableToEditFile(e.to_string())),
    }
  }
}

impl From<fs::DirEntry> for Note {
  fn from(entry: fs::DirEntry) -> Note {
    Note::new(
      entry.path(),
      entry.file_name().clone().into_string().unwrap(),
      entry.metadata().unwrap(),
    )
  }
}

impl From<OsString> for NoteId {
  fn from(os_string: OsString) -> NoteId {
    NoteId(os_string.into_string().unwrap())
  }
}
