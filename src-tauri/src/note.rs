use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
  collections::HashMap,
  fs,
  io::Write,
  path::PathBuf,
  time::{SystemTime, UNIX_EPOCH},
};

#[cfg(not(debug_assertions))]
const NOTES_DIR: &str = ".notes";
#[cfg(not(debug_assertions))]
const BACKUP_DIR: &str = ".backup";

#[cfg(debug_assertions)]
const NOTES_DIR: &str = ".notes-dev";
#[cfg(debug_assertions)]
const BACKUP_DIR: &str = ".backup-dev";

#[derive(Serialize, Deserialize, Debug)]
struct Delta {
  ops: Option<Vec<HashMap<String, Value>>>,
}

#[derive(Serialize, Deserialize, Debug)]
struct NoteContent {
  delta: Delta,
  title: String,
  body: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Note {
  uuid: String,
  timestamp: i64,
  content: NoteContent,
}

#[derive(Serialize, Debug)]
pub enum NoteError {
  UnableToCreateFile(String),
  UnableToEditFile(String),
  UnableToDeleteFile(String),
  UnableToSyncLocalFiles(String),
}

impl Note {
  pub fn get_all(app_dir: &PathBuf) -> Result<Vec<Note>, NoteError> {
    let notes_path = app_dir.join(NOTES_DIR);

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
      fs::create_dir_all(&notes_path).expect("unable to create dir");

      Ok(vec![])
    }
  }

  pub fn new(app_dir: &PathBuf, note: &Note) -> Result<(), NoteError> {
    let notes_path = app_dir.join(NOTES_DIR);
    if !notes_path.is_dir() {
      fs::create_dir_all(&notes_path).expect("unable to create dir");
    }

    let path = Note::get_path(app_dir, &note.uuid);
    let mut file = fs::File::create(path).expect("unable to create file");
    let write_res = file.write(note.serialize().as_ref());

    match write_res {
      Ok(_) => Ok(()),
      Err(e) => Err(NoteError::UnableToCreateFile(e.to_string())),
    }
  }

  pub fn edit(app_dir: &PathBuf, note: Note) -> Result<(), NoteError> {
    let path = Note::get_path(app_dir, &note.uuid);
    let write_res = fs::write(path, note.serialize());

    match write_res {
      Ok(_) => Ok(()),
      Err(e) => Err(NoteError::UnableToEditFile(e.to_string())),
    }
  }

  pub fn delete(app_dir: &PathBuf, uuid: String) -> Result<(), NoteError> {
    let path = Note::get_path(app_dir, &uuid);
    let delete_res = fs::remove_file(path);

    match delete_res {
      Ok(_) => Ok(()),
      Err(e) => Err(NoteError::UnableToDeleteFile(e.to_string())),
    }
  }

  pub fn sync_local(app_dir: &PathBuf, notes: Vec<Note>) -> Result<(), NoteError> {
    let notes_dir = app_dir.join(NOTES_DIR);

    let rm_res = fs::remove_dir_all(&notes_dir);

    if rm_res.is_err() {
      return Err(NoteError::UnableToSyncLocalFiles(
        rm_res.unwrap_err().to_string(),
      ));
    }

    for nt in notes.iter() {
      let write_res = Note::new(app_dir, nt);

      if write_res.is_err() {
        return Err(write_res.unwrap_err());
      }
    }

    Ok(())
  }

  pub fn export(save_dir: &PathBuf, notes: Vec<Note>) -> Result<(), NoteError> {
    notes.iter().for_each(|note| {
      let filename = format!("{}.txt", note.uuid);
      let mut file = fs::File::create(save_dir.join(filename)).expect("unable to create file");
      let mut file_contents = String::new();

      if note.content.delta.ops.is_some() {
        let ops = note.content.delta.ops.as_ref().unwrap();

        file_contents = ops.iter().fold(String::new(), |acc, op| {
          let default_insert = Value::String(String::new());
          let insert = op
            .get("insert")
            .unwrap_or(&default_insert)
            .as_str()
            .unwrap_or("");

          acc + insert
        });
      }

      file
        .write_all(file_contents.as_bytes())
        .expect("unable to write file");
    });

    Ok(())
  }

  //// Backup

  pub fn backup(app_dir: &PathBuf, notes: &[Note]) -> Result<(), NoteError> {
    // Do nothing if no notes or only empty notes
    if notes.is_empty() || notes.iter().all(|nt| nt.is_empty()) {
      return Ok(());
    }

    // Backup directory names are the timestamp they were created
    let timestamp = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .unwrap()
      .as_secs();

    let backup_dir = app_dir.join(BACKUP_DIR);
    let backup_instance_dir = backup_dir.join(timestamp.to_string());

    // Ensure the backup directory exists
    if !backup_dir.exists() {
      if let Err(e) = fs::create_dir_all(&backup_dir) {
        eprintln!("Unable to create backup directory: {}", e);
      }
    }

    // Write backup files
    for nt in notes.iter() {
      let write_res = Note::new(&backup_instance_dir, nt);

      if write_res.is_err() {
        return Err(write_res.unwrap_err());
      }
    }

    Self::remove_old_backups(&backup_dir);

    Ok(())
  }

  fn remove_old_backups(backup_dir: &PathBuf) {
    let entries = match backup_dir.read_dir() {
      Ok(entries) => entries,
      Err(_) => return,
    };

    // Filter out non-directories and collect into tuples of `(timestamp, path)`
    let mut backup_dirs: Vec<_> = entries
      .filter_map(|entry_result| {
        let entry = entry_result.ok()?;

        if !entry.path().is_dir() {
          return None;
        }

        // Directory names are the timestamp they were created
        let dir_name = entry.file_name();
        let timestamp = dir_name.to_str()?.parse::<u64>().ok()?;

        Some((timestamp, entry.path()))
      })
      .collect();

    const MAX_BACKUPS_COUNT: usize = 3;

    if backup_dirs.len() <= MAX_BACKUPS_COUNT {
      return;
    }

    // Sort by timestamp (oldest first)
    backup_dirs.sort_by_key(|(timestamp, _)| *timestamp);

    // Remove oldest directories to keep only 3 most recent
    for (_, path) in backup_dirs
      .iter()
      .take(backup_dirs.len() - MAX_BACKUPS_COUNT)
    {
      let _ = fs::remove_dir_all(path);
    }
  }

  //// Helpers

  /// Returns `{app_dir}/{NOTES_DIR}/{uuid}.json`
  fn get_path(app_dir: &PathBuf, uuid: &String) -> PathBuf {
    let mut filename = uuid.clone();
    filename.push_str(".json");

    app_dir.join(NOTES_DIR).join(filename)
  }

  /// Serialize `Note` to a JSON string
  fn serialize(&self) -> String {
    serde_json::to_string(self).expect("unable to serialize note struct")
  }

  /// Deserialize `Note` from a JSON string
  fn deserialize(note_json: &String) -> Note {
    // TBR: Remove this backwards compat id -> uuid conversion
    #[derive(Deserialize)]
    struct OldNoteWithId {
      id: Option<String>,
      uuid: Option<String>,
      timestamp: i64,
      content: NoteContent,
    }

    let deserialized_note =
      serde_json::from_str::<OldNoteWithId>(note_json).expect("unable to deserialize note json");

    if let Some(old_id) = deserialized_note.id {
      Note {
        uuid: old_id,
        timestamp: deserialized_note.timestamp,
        content: deserialized_note.content,
      }
    } else {
      Note {
        uuid: deserialized_note.uuid.unwrap(),
        timestamp: deserialized_note.timestamp,
        content: deserialized_note.content,
      }
    }
  }

  fn is_empty(&self) -> bool {
    self.content.title.is_empty() && self.content.body.is_empty()
  }
}

impl From<fs::DirEntry> for Note {
  fn from(entry: fs::DirEntry) -> Note {
    let note_json = fs::read_to_string(entry.path()).expect("unable to read file");

    Note::deserialize(&note_json)
  }
}
