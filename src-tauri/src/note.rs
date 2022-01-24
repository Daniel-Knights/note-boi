use serde::Serialize;
use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use uuid::Uuid;

// TODO: tauri fs

#[derive(Serialize, Debug)]
pub struct Note {
  id: NoteId,
  title: String,
  body: String,
  created_at: SystemTime,
  updated_at: SystemTime,
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

impl Note {
  pub fn write(title: String, body: String) -> Result<(), NoteError> {
    let notes_path = Path::new(".notes");

    if !notes_path.is_dir() {
      fs::create_dir(notes_path).unwrap();
    }

    let id = Uuid::new_v4().to_string();
    let str_path = ".notes/".to_string() + &id;
    let write_result = fs::write(Path::new(&str_path), title + &id + &body);

    match write_result {
      Ok(_) => Ok(()),
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

        Ok(Note {
          id: NoteId(id),
          title: title.to_string(),
          body: body.to_string(),
          created_at: note_metadata.created().unwrap(),
          updated_at: note_metadata.modified().unwrap(),
        })
      }
      Err(e) => Err(NoteError::UnableToGetFile(e.to_string())),
    }
  }

  pub fn delete(id: String) -> Result<(), NoteError> {
    let file_path = get_path(&id);
    let delete_res = fs::remove_file(file_path);

    match delete_res {
      Ok(_) => Ok(()),
      Err(e) => Err(NoteError::UnableToDeleteFile(e.to_string())),
    }
  }

  pub fn edit(id: String, title: String, body: String) -> Result<(), NoteError> {
    let file_path = get_path(&id);
    let write_res = fs::write(file_path, title + &id + &body);

    match write_res {
      Ok(_) => Ok(()),
      Err(e) => Err(NoteError::UnableToEditFile(e.to_string())),
    }
  }
}

impl From<fs::DirEntry> for Note {
  fn from(entry: fs::DirEntry) -> Note {
    let file_contents = fs::read_to_string(entry.path()).unwrap();
    let id = entry.file_name();
    let (title, body) = file_contents
      .split_once(&id.clone().into_string().unwrap())
      .unwrap();
    let entry_metadata = entry.metadata().unwrap();

    Note {
      id: NoteId::from(id),
      title: title.to_string(),
      body: body.to_string(),
      created_at: entry_metadata.created().unwrap(),
      updated_at: entry_metadata.modified().unwrap(),
    }
  }
}

impl From<OsString> for NoteId {
  fn from(os_string: OsString) -> NoteId {
    NoteId(os_string.into_string().unwrap())
  }
}
