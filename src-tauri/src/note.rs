use serde::{Deserialize, Serialize};
use std::{fs, io::Write, path::PathBuf};

const NOTE_DIR: &str = ".notes";

#[derive(Serialize, Deserialize, Debug)]
struct DeltaOp {
  insert: Option<String>,
  delete: Option<String>,
  retain: Option<String>,
  attributes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Delta {
  ops: Option<Vec<DeltaOp>>,
}

#[derive(Serialize, Deserialize, Debug)]
struct NoteContent {
  delta: Delta,
  title: String,
  body: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Note {
  id: String,
  timestamp: i64,
  content: NoteContent,
}

#[derive(Serialize, Debug)]
pub enum NoteError {
  DirNotFound,
  UnableToCreateFile(String),
  UnableToEditFile(String),
  UnableToDeleteFile(String),
  UnableToSyncLocalFiles(String),
}

impl Note {
  pub fn get_all(app_dir: &PathBuf) -> Result<Vec<Note>, NoteError> {
    let notes_path = app_dir.join(NOTE_DIR);

    if notes_path.is_dir() {
      let dir_contents = fs::read_dir(notes_path).expect("unable to read dir");
      let notes = dir_contents
        // Unwrap
        .map(|entry| entry.expect("unable to read dir entry"))
        // Filter JSON files
        .filter(|entry| match entry.path().extension() {
          Some(ext) => ext.to_str().unwrap() == "json",
          _ => false,
        })
        // Convert
        .map(|entry| Note::from(entry))
        .collect();

      Ok(notes)
    } else {
      Err(NoteError::DirNotFound)
    }
  }

  pub fn write(app_dir: &PathBuf, note: &Note) -> Result<(), NoteError> {
    let notes_path = app_dir.join(NOTE_DIR);
    if !notes_path.is_dir() {
      fs::create_dir(&notes_path).expect("unable to create dir");
    }

    let path = Note::get_path(app_dir, &note.id);
    let mut file = fs::File::create(path).expect("unable to create file");
    let write_res = file.write(note.serialize().as_ref());

    match write_res {
      Ok(_) => Ok(()),
      Err(e) => Err(NoteError::UnableToCreateFile(e.to_string())),
    }
  }

  pub fn edit(app_dir: &PathBuf, note: Note) -> Result<(), NoteError> {
    let path = Note::get_path(app_dir, &note.id);
    let write_res = fs::write(path, note.serialize());

    match write_res {
      Ok(_) => Ok(()),
      Err(e) => Err(NoteError::UnableToEditFile(e.to_string())),
    }
  }

  pub fn delete(app_dir: &PathBuf, id: String) -> Result<(), NoteError> {
    let path = Note::get_path(app_dir, &id);
    let delete_res = fs::remove_file(path);

    match delete_res {
      Ok(_) => Ok(()),
      Err(e) => Err(NoteError::UnableToDeleteFile(e.to_string())),
    }
  }

  pub fn sync_all_local(app_dir: &PathBuf, notes: Vec<Note>) -> Result<(), NoteError> {
    let notes_dir = app_dir.join(NOTE_DIR);

    let rm_res = fs::remove_dir_all(&notes_dir);
    if rm_res.is_err() {
      return Err(NoteError::UnableToSyncLocalFiles(
        rm_res.unwrap_err().to_string(),
      ));
    }

    for nt in notes.iter() {
      let write_res = Note::write(app_dir, nt);
      if write_res.is_err() {
        return Err(write_res.unwrap_err());
      }
    }

    Ok(())
  }

  /// Returns `{app_dir}/{NOTE_DIR}/{id}.json`
  fn get_path(app_dir: &PathBuf, id: &String) -> PathBuf {
    let mut filename = id.clone();
    filename.push_str(".json");

    app_dir.join(NOTE_DIR).join(filename)
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
