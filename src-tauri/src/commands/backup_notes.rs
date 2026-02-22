use std::{
  fs,
  path::Path,
  time::{SystemTime, UNIX_EPOCH},
};

use crate::{commands::edit_note::edit_note_fn, note::Note, AppState, BACKUP_DIR};

#[tauri::command]
pub fn backup_notes(
  state: tauri::State<AppState>,
  notes: Vec<Note>,
  max_backups_count: usize,
) -> Result<(), String> {
  backup_notes_fn(&state.app_dir, &notes, &max_backups_count).map_err(|err| err.to_string())
}

pub fn backup_notes_fn(
  dir: &Path,
  notes: &[Note],
  max_backups_count: &usize,
) -> Result<(), Box<dyn std::error::Error>> {
  // Do nothing if no notes or only empty notes
  if notes.is_empty() || notes.iter().all(|nt| nt.is_empty()) {
    return Ok(());
  }

  // Backup directory names are the timestamp they were created
  let timestamp = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();

  let backup_dir = dir.join(BACKUP_DIR);
  let backup_instance_dir = backup_dir.join(timestamp.to_string());

  // Ensure the backup directory exists
  if !backup_dir.exists() {
    if let Err(e) = fs::create_dir_all(&backup_dir) {
      eprintln!("Unable to create backup directory: {}", e);
    }
  }

  // Write backup files
  for nt in notes {
    edit_note_fn(&backup_instance_dir, nt)?;
  }

  remove_old_backups(&backup_dir, &max_backups_count);

  Ok(())
}

fn remove_old_backups(backup_dir: &Path, max_backups_count: &usize) {
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

  if backup_dirs.len() <= *max_backups_count {
    return;
  }

  // Sort by timestamp (oldest first)
  backup_dirs.sort_by_key(|(timestamp, _)| *timestamp);

  // Remove oldest directories to keep only 3 most recent
  for (_, path) in backup_dirs
    .iter()
    .take(backup_dirs.len() - max_backups_count)
  {
    let _ = fs::remove_dir_all(path);
  }
}
