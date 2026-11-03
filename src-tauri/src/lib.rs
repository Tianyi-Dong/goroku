use tauri::menu::Menu;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      // Explicit standard macOS menu (About/Hide/Quit, Edit with Cut/Copy/Paste/Undo,
      // Window) — without this a packaged app has no menu bar at all, so no Cmd+Q,
      // no Cmd+C/V in text fields wired through the menu, etc.
      let menu = Menu::default(app.handle())?;
      app.set_menu(menu)?;

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
