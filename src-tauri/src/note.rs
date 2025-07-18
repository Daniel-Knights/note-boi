use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
  collections::HashMap,
  fs,
  path::{Path, PathBuf},
};

use crate::NOTES_DIR;

#[derive(Serialize, Deserialize, Debug)]
pub struct Delta {
  pub ops: Option<Vec<HashMap<String, Value>>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct NoteContent {
  pub delta: Delta,
  pub title: String,
  pub body: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Note {
  pub uuid: String,
  pub timestamp: i64,
  pub content: NoteContent,
}

#[derive(Serialize, Debug)]
pub enum NoteError {
  UnableToCreateFile(String),
  UnableToEditFile(String),
  UnableToDeleteFile(String),
  UnableToSyncLocalFiles(String),
}

impl Note {
  /// Returns `{dir}/{NOTES_DIR}/{uuid}.json`
  pub fn get_path(dir: &Path, uuid: &String) -> PathBuf {
    let mut filename = uuid.clone();
    filename.push_str(".json");

    dir.join(NOTES_DIR).join(filename)
  }

  /// Serialize `Note` to a JSON string
  pub fn serialize(&self) -> String {
    serde_json::to_string(self).expect("unable to serialize note struct")
  }

  /// Deserialize `Note` from a JSON string
  pub fn deserialize(note_json: &String) -> Note {
    serde_json::from_str::<Note>(note_json).expect("unable to deserialize note json")
  }

  pub fn is_empty(&self) -> bool {
    self.content.title.is_empty() && self.content.body.is_empty()
  }
}

impl From<fs::DirEntry> for Note {
  fn from(entry: fs::DirEntry) -> Note {
    let note_json = fs::read_to_string(entry.path()).expect("unable to read file");

    Note::deserialize(&note_json)
  }
}
