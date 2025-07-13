use keyring::Entry;

const SERVICE_NAME: &str = "note-boi";

#[tauri::command]
pub fn set_access_token(username: String, access_token: String) -> Result<(), String> {
  let err_msg_prefix = "Unable to set access token:";

  Entry::new(SERVICE_NAME, &username)
    .map_err(|e| format!("{err_msg_prefix} {e}"))?
    .set_password(&access_token)
    .map_err(|e| format!("{err_msg_prefix} {e}"))
}

#[tauri::command]
pub fn get_access_token(username: String) -> Result<String, String> {
  let err_msg_prefix = "Unable to get access token:";

  Entry::new(SERVICE_NAME, &username)
    .map_err(|e| format!("{err_msg_prefix} {e}"))?
    .get_password()
    .map_err(|e| format!("{err_msg_prefix} {e}"))
}

#[tauri::command]
pub fn delete_access_token(username: String) -> Result<(), String> {
  let err_msg_prefix = "Unable to delete access token:";

  Entry::new(SERVICE_NAME, &username)
    .map_err(|e| format!("{err_msg_prefix} {e}"))?
    .delete_credential()
    .map_err(|e| format!("{err_msg_prefix} {e}"))
}
