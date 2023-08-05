use tauri::{App, Builder, CustomMenuItem, Manager, Menu, MenuItem, Submenu, Wry};

pub fn get_menu() -> Menu {
  let app_menu = Menu::new()
    .add_item(CustomMenuItem::new("reload", "Reload").accelerator("CmdOrControl+R"))
    .add_native_item(MenuItem::CloseWindow)
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Quit);

  let file_menu = Menu::new()
    .add_item(CustomMenuItem::new("new-note", "New Note"))
    .add_item(CustomMenuItem::new("export-note", "Export Note"))
    .add_item(CustomMenuItem::new("export-all-notes", "Export All Notes"))
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

  let sync_menu = Menu::new()
    .add_item(CustomMenuItem::new("login", "Login"))
    .add_item(CustomMenuItem::new("signup", "Signup"))
    .add_item(CustomMenuItem::new("push-notes", "Push Notes"))
    .add_item(CustomMenuItem::new("change-password", "Change Password"))
    .add_item(CustomMenuItem::new("delete-account", "Delete Account"))
    .add_item(CustomMenuItem::new("logout", "Logout"));

  Menu::new()
    .add_submenu(Submenu::new("", app_menu))
    .add_submenu(Submenu::new("File", file_menu))
    .add_submenu(Submenu::new("Edit", edit_menu))
    .add_submenu(Submenu::new("View", view_menu))
    .add_submenu(Submenu::new("Sync", sync_menu))
}

/// Sets the menu to use on all windows and handles any menu events
pub fn set_menu(builder: Builder<Wry>) -> Builder<Wry> {
  builder
    .menu(get_menu())
    .on_menu_event(|ev| match ev.menu_item_id() {
      "reload" => ev.window().emit("reload", {}).unwrap(),
      "new-note" => ev.window().emit("new-note", {}).unwrap(),
      "export-note" => ev.window().emit("export-note", {}).unwrap(),
      "export-all-notes" => ev.window().emit("export-all-notes", {}).unwrap(),
      "delete-note" => ev.window().emit("delete-note", {}).unwrap(),
      "login" => ev.window().emit("login", {}).unwrap(),
      "signup" => ev.window().emit("signup", {}).unwrap(),
      "push-notes" => ev.window().emit("push-notes", {}).unwrap(),
      "change-password" => ev.window().emit("change-password", {}).unwrap(),
      "delete-account" => ev.window().emit("delete-account", {}).unwrap(),
      "logout" => ev.window().emit("logout", {}).unwrap(),
      _ => {}
    })
}

/// Toggles enabled sync menu items
pub fn toggle_sync_items(app: &mut App<Wry>) {
  let menu_handle = app.get_window("main").unwrap().menu_handle();

  let toggle_fn = move |b: bool| {
    menu_handle.get_item("login").set_enabled(b).unwrap();
    menu_handle.get_item("signup").set_enabled(b).unwrap();
    menu_handle.get_item("push-notes").set_enabled(!b).unwrap();
    menu_handle
      .get_item("change-password")
      .set_enabled(!b)
      .unwrap();
    menu_handle
      .get_item("delete-account")
      .set_enabled(!b)
      .unwrap();
    menu_handle.get_item("logout").set_enabled(!b).unwrap();
  };
  let toggle_fn_clone = toggle_fn.clone();

  app.listen_global("login", move |_ev| {
    toggle_fn(false);
  });
  app.listen_global("logout", move |_ev| {
    toggle_fn_clone(true);
  });
}
