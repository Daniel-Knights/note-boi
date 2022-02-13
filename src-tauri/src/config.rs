use crate::window::WindowState;
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

#[derive(Serialize, Deserialize)]
pub struct Config {
  pub window_state: WindowState,
}

impl Config {
  const FILENAME: &'static str = "config.json";
  const DEFAULT: Config = Config {
    window_state: WindowState {
      position: (0.0, 0.0),
      size: (800.0, 600.0),
    },
  };

  pub fn get() -> Config {
    let config_path = Path::new(Config::FILENAME);

    if !config_path.exists() {
      fs::write(config_path, Config::DEFAULT.serialize()).expect("unable to create config file");
    }

    let config_contents = fs::read_to_string(config_path).expect("unable to read config");

    Config::deserialize(&config_contents)
  }

  pub fn set(config: Config) -> Result<(), std::io::Error> {
    let config_path = Path::new(Config::FILENAME);

    fs::write(config_path, config.serialize())
  }

  /// Serialize `Config` to a JSON string
  fn serialize(&self) -> String {
    serde_json::to_string(self).expect("unable to serialize config struct")
  }
  /// Deserialize `Config` from a JSON string
  fn deserialize(note_json: &String) -> Config {
    serde_json::from_str::<Config>(note_json).expect("unable to deserialize config json")
  }
}
