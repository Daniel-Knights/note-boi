use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct WindowState {
  pub position: (f64, f64),
  pub size: (f64, f64),
}

// impl WindowState {
//   fn get_position() {}
// }
