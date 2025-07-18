use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
  collections::HashMap,
  fs,
  path::{Path, PathBuf},
};

use crate::NOTES_DIR;

//// Structs

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

//// Implementations

impl Note {
  /// Returns `{dir}/{NOTES_DIR}/{uuid}.json`
  pub fn get_path(dir: &Path, uuid: &String) -> PathBuf {
    let mut filename = uuid.clone();
    filename.push_str(".json");

    dir.join(NOTES_DIR).join(filename)
  }

  pub fn is_empty(&self) -> bool {
    self.content.title.is_empty() && self.content.body.is_empty()
  }
}

impl TryFrom<PathBuf> for Note {
  type Error = Box<dyn std::error::Error>;

  fn try_from(path: PathBuf) -> Result<Self, Self::Error> {
    let note_json = fs::read_to_string(&path)?;
    let note = serde_json::from_str::<Note>(&note_json)?;

    Ok(note)
  }
}
