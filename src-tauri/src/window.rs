use serde::{Deserialize, Serialize};
use tauri::{GlobalWindowEvent, WindowEvent, Wry};

use crate::Config;

#[derive(Serialize, Deserialize)]
pub struct WindowState {
  pub position: (f64, f64),
  pub size: (f64, f64),
}

impl WindowState {
  pub fn handle_event(ev: GlobalWindowEvent<Wry>) {
    match ev.event() {
      WindowEvent::Moved(pos) => {
        let mut current_config = Config::get();
        current_config.window_state.position = (pos.x.into(), pos.y.into());

        Config::set(current_config).expect("unable to set new window position");
      }
      WindowEvent::Resized(_) => {
        let mut current_config = Config::get();
        let size = ev.window().inner_size().expect("msg");
        current_config.window_state.size = (size.width.into(), size.height.into());

        Config::set(current_config).expect("unable to set new window size");
      }
      _ => {}
    }
  }
}
