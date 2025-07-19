use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
  collections::HashMap,
  path::{Path, PathBuf},
};
use uuid::Uuid;

use crate::{utils::time::now_millis, NOTES_DIR};

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

impl From<String> for Note {
  fn from(content_str: String) -> Note {
    let mut content_lines = content_str.lines();
    let title = content_lines.next().unwrap_or("").to_string();
    let body = content_lines.next().unwrap_or("").to_string();

    Note {
      uuid: Uuid::new_v4().to_string(),
      timestamp: now_millis() as i64,
      content: NoteContent {
        title,
        body,
        delta: Delta {
          ops: Some(vec![HashMap::from([(
            "insert".to_string(),
            serde_json::to_value(content_str).unwrap(),
          )])]),
        },
      },
    }
  }
}
