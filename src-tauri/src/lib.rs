use tauri::Manager;

pub mod commands;
pub mod db;
pub mod n8n;
pub mod tray;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let pool = db::init(app.handle()).map_err(|e| e.to_string())?;
            app.manage(pool);
            tray::setup(app)?;

            // Start n8n webhook server in background
            let handle = app.handle().clone();
            let settings = commands::settings_commands::load_settings_sync(app.handle());
            let port = settings.n8n_local_port;
            let secret = settings.n8n_hmac_secret.clone();
            tauri::async_runtime::spawn(async move {
                n8n::webhook_server::start(handle, port, secret).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Tasks
            commands::tasks_commands::get_tasks,
            commands::tasks_commands::create_task,
            commands::tasks_commands::update_task,
            commands::tasks_commands::delete_task,
            commands::tasks_commands::get_task_stats,
            // Projects
            commands::projects_commands::get_projects,
            commands::projects_commands::create_project,
            // Clients
            commands::clients_commands::get_clients,
            commands::clients_commands::create_client,
            commands::clients_commands::update_client,
            commands::clients_commands::delete_client,
            // Emails
            commands::emails_commands::get_emails,
            commands::emails_commands::update_email,
            commands::emails_commands::mark_email_read,
            commands::emails_commands::get_unread_count,
            // Settings
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
