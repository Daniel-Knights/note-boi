use serde::Deserialize;
use tauri::{
  menu::{Menu, MenuBuilder, MenuItem, MenuItemBuilder, SubmenuBuilder},
  App, Emitter, Listener, Wry,
};

/// Returns the menu to use on all windows and handles any menu events
pub fn get_menu(app: &App<Wry>) -> Menu<Wry> {
  let menu = build_menu(app);
  let menu_clone = menu.clone();

  app.on_menu_event(|app, ev| {
    app.emit(&ev.id.0, {}).unwrap();
  });

  // Sync menu items toggling
  toggle_sync_items(&menu, false);

  app.listen_any("auth", move |ev| {
    let is_logged_in = serde_json::from_str::<AuthEventPayload>(&ev.payload())
      .expect("failed to parse auth event data")
      .data
      .is_logged_in;

    toggle_sync_items(&menu, is_logged_in);
  });

  menu_clone
}

/// Toggles enabled sync menu items
fn toggle_sync_items(menu: &Menu<Wry>, is_logged_in: bool) {
  const LOGGED_IN_ITEMS: [&str; 3] = ["change-password", "delete-account", "logout"];

  let sync_menu = menu.get("sync").unwrap();
  let sync_menu_items = sync_menu.as_submenu().unwrap().items().unwrap();

  sync_menu_items.iter().for_each(|item| {
    let menu_item = item.as_menuitem().unwrap();
    let item_id = menu_item.id().0.as_str();
    let enabled = is_logged_in && LOGGED_IN_ITEMS.contains(&item_id)
      || !is_logged_in && !LOGGED_IN_ITEMS.contains(&item_id);

    menu_item.set_enabled(enabled).unwrap();
  });
}

fn build_menu(app: &App<Wry>) -> Menu<Wry> {
  // App menu
  let reload = &get_item(app, "Reload", "reload", Some("CmdOrControl+R"));

  let app_menu = &SubmenuBuilder::new(app, "")
    .item(reload)
    .close_window()
    .separator()
    .quit()
    .build()
    .unwrap();

  // File menu
  let new_note = &get_item(app, "New Note", "new-note", None);
  let export_note = &get_item(app, "Export Note", "export-note", None);
  let export_all_notes = &get_item(app, "Export All Notes", "export-all-notes", None);
  let delete_note = &get_item(app, "Delete Note", "delete-note", None);

  let file_menu = &SubmenuBuilder::new(app, "File")
    .items(&[new_note, export_note, export_all_notes, delete_note])
    .build()
    .unwrap();

  // Edit menu
  let edit_menu = &SubmenuBuilder::new(app, "Edit")
    .undo()
    .redo()
    .cut()
    .copy()
    .paste()
    .select_all()
    .build()
    .unwrap();

  // View menu
  let view_menu = &SubmenuBuilder::new(app, "View")
    .minimize()
    .hide()
    // .zoom()
    .fullscreen()
    .build()
    .unwrap();

  // Sync menu
  let login = &get_item(app, "Login", "login", None);
  let signup = &get_item(app, "Signup", "signup", None);
  let change_password = &get_item(app, "Change Password", "change-password", None);
  let delete_account = &get_item(app, "Delete Account", "delete-account", None);
  let logout = &get_item(app, "Logout", "logout", None);

  let sync_menu = &SubmenuBuilder::new(app, "Sync")
    .id("sync")
    .items(&[login, signup, change_password, delete_account, logout])
    .build()
    .unwrap();

  MenuBuilder::new(app)
    .items(&[app_menu, file_menu, edit_menu, view_menu, sync_menu])
    .build()
    .unwrap()
}

fn get_item(app: &App<Wry>, label: &str, id: &str, accelerator: Option<&str>) -> MenuItem<Wry> {
  MenuItemBuilder::new(label)
    .id(id)
    .accelerator(accelerator.unwrap_or(""))
    .build(app)
    .unwrap()
}

#[derive(Debug, Deserialize)]
struct AuthEventData {
  is_logged_in: bool,
}

#[derive(Debug, Deserialize)]
struct AuthEventPayload {
  data: AuthEventData,
}
