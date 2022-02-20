use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

pub fn get_menu() -> Menu {
  Menu::new().add_submenu(Submenu::new(
    "",
    Menu::new()
      .add_native_item(MenuItem::Undo)
      .add_native_item(MenuItem::Redo)
      .add_native_item(MenuItem::Cut)
      .add_native_item(MenuItem::Copy)
      .add_native_item(MenuItem::Paste)
      .add_native_item(MenuItem::SelectAll)
      .add_native_item(MenuItem::Zoom)
      .add_native_item(MenuItem::EnterFullScreen)
      .add_native_item(MenuItem::Minimize)
      .add_native_item(MenuItem::Hide)
      .add_native_item(MenuItem::CloseWindow)
      .add_native_item(MenuItem::Quit)
      .add_item(CustomMenuItem::new("reload", "Reload").accelerator("CmdOrControl+R")),
  ))
}
