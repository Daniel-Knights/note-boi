use tauri::{CustomMenuItem, Menu, Submenu, WindowMenuEvent, Wry};

pub fn get_menu() -> Menu {
  let about = CustomMenuItem::new("about".to_string(), "About");
  let preferences = CustomMenuItem::new("preferences".to_string(), "Preferences");
  let quit = CustomMenuItem::new("quit".to_string(), "Quit");
  let submenu = Submenu::new(
    "File",
    Menu::new()
      .add_item(about)
      .add_item(preferences)
      .add_item(quit),
  );

  Menu::new().add_submenu(submenu)
}

pub fn handle_event(event: WindowMenuEvent<Wry>) {
  match event.menu_item_id() {
    "about" => {
      event.window().emit("about", {}).unwrap();
    }
    "preferences" => {
      event.window().emit("preferences", {}).unwrap();
    }
    "quit" => {
      std::process::exit(0);
    }
    _ => {}
  }
}
