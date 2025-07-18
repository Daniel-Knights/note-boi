use std::time::{SystemTime, UNIX_EPOCH};

/// Gets the time since the unix epoch in milliseconds
pub fn now_millis() -> u128 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap()
    .as_millis()
}
