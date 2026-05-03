use tauri::Manager;

pub mod commands;
pub mod db;
pub mod n8n;
pub mod tray;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let pool = db::init(app.handle()).map_err(|e| e.to_string())?;
            app.manage(pool);
            tray::setup(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::tasks_commands::get_tasks,
            commands::tasks_commands::create_task,
            commands::tasks_commands::update_task,
            commands::tasks_commands::delete_task,
            commands::tasks_commands::get_task_stats,
            commands::projects_commands::get_projects,
            commands::projects_commands::create_project,
            commands::settings_commands::get_settings,
            commands::settings_commands::save_settings,
            commands::settings_commands::test_n8n_connection,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
