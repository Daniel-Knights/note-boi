use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

pub fn get_menu() -> Menu {
  let app_menu = Menu::new()
    .add_item(CustomMenuItem::new("reload", "Reload").accelerator("CmdOrControl+R"))
    .add_native_item(MenuItem::CloseWindow)
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Quit);

  let file_menu = Menu::new()
    .add_item(CustomMenuItem::new("new-note", "New Note"))
    .add_item(CustomMenuItem::new("delete-note", "Delete Note"));

  let edit_menu = Menu::new()
    .add_native_item(MenuItem::Undo)
    .add_native_item(MenuItem::Redo)
    .add_native_item(MenuItem::Cut)
    .add_native_item(MenuItem::Copy)
    .add_native_item(MenuItem::Paste)
    .add_native_item(MenuItem::SelectAll);

  let view_menu = Menu::new()
    .add_native_item(MenuItem::Minimize)
    .add_native_item(MenuItem::Hide)
    .add_native_item(MenuItem::Zoom)
    .add_native_item(MenuItem::EnterFullScreen);

  Menu::new()
    .add_submenu(Submenu::new("", app_menu))
    .add_submenu(Submenu::new("File", file_menu))
    .add_submenu(Submenu::new("Edit", edit_menu))
    .add_submenu(Submenu::new("View", view_menu))
}
