#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod command;
mod menu;
mod note;

use std::path::PathBuf;

use crate::command::{delete_note, edit_note, get_all_notes, new_note, sync_all_local_notes};
use tauri::{Manager, WindowBuilder, WindowUrl};

#[derive(Debug)]
pub struct AppState {
  app_dir: PathBuf,
}

fn main() {
  let mut builder = tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      delete_note,
      edit_note,
      get_all_notes,
      new_note,
      sync_all_local_notes
    ])
    .create_window("main", WindowUrl::App("".into()), |win, attr| {
      (
        win
          .title("NoteBoi")
          .min_inner_size(600.0, 400.0)
          .resizable(true)
          .fullscreen(false)
          .visible(false),
        attr,
      )
    });

  if cfg!(target_os = "macos") {
    builder = builder
      // Only add OS menu for macos
      .menu(menu::get_menu())
      .on_menu_event(|ev| match ev.menu_item_id() {
        "reload" => ev.window().emit("reload", {}).unwrap(),
        "new-note" => ev.window().emit("new-note", {}).unwrap(),
        "delete-note" => ev.window().emit("delete-note", {}).unwrap(),
        "push-notes" => ev.window().emit("push-notes", {}).unwrap(),
        "pull-notes" => ev.window().emit("pull-notes", {}).unwrap(),
        "login" => ev.window().emit("login", {}).unwrap(),
        "logout" => ev.window().emit("logout", {}).unwrap(),
        "signup" => ev.window().emit("signup", {}).unwrap(),
        _ => {}
      });
  }

  builder
    .setup(|app| {
      let state = AppState {
        app_dir: app.path_resolver().app_dir().unwrap(),
      };

      app.manage(state);

      let menu_handle = app.get_window("main").unwrap().menu_handle();

      let toggle_sync_menu = move |b: bool| {
        menu_handle.get_item("login").set_enabled(b).unwrap();
        menu_handle.get_item("signup").set_enabled(b).unwrap();
        menu_handle.get_item("push-notes").set_enabled(!b).unwrap();
        menu_handle.get_item("pull-notes").set_enabled(!b).unwrap();
        menu_handle.get_item("logout").set_enabled(!b).unwrap();
      };
      let toggle_sync_menu_clone = toggle_sync_menu.clone();

      app.listen_global("login", move |_ev| {
        toggle_sync_menu(false);
      });
      app.listen_global("logout", move |_ev| {
        toggle_sync_menu_clone(true);
      });

      Ok(())
    })
    .plugin(tauri_plugin_window_state::WindowState::default())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
