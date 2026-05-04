use tauri::Manager;

pub mod commands;
pub mod db;
pub mod n8n;
pub mod tray;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
            commands::tasks_commands::get_task_trend,
            // Projects
            commands::projects_commands::get_projects,
            commands::projects_commands::create_project,
            commands::projects_commands::update_project,
            commands::projects_commands::delete_project,
            // Clients
            commands::clients_commands::get_clients,
            commands::clients_commands::create_client,
            commands::clients_commands::update_client,
            commands::clients_commands::delete_client,
            // Emails
            commands::emails_commands::get_emails,
            commands::emails_commands::delete_email,
            commands::emails_commands::update_email,
            commands::emails_commands::mark_email_read,
            commands::emails_commands::get_unread_count,
            // Documents
            commands::documents_commands::get_documents,
            commands::documents_commands::create_document,
            commands::documents_commands::update_document,
            commands::documents_commands::delete_document,
            // Reports
            commands::reports_commands::generate_weekly_report,
            commands::reports_commands::export_data,
            commands::reports_commands::check_for_updates,
            // Settings
            commands::settings_commands::get_settings,
            commands::settings_commands::save_settings,
            commands::settings_commands::test_n8n_connection,
            // Contacts
            commands::contacts_commands::get_contacts,
            commands::contacts_commands::create_contact,
            commands::contacts_commands::update_contact,
            commands::contacts_commands::delete_contact,
            // Employees
            commands::employees_commands::get_employees,
            commands::employees_commands::create_employee,
            commands::employees_commands::upsert_employee,
            commands::employees_commands::update_employee,
            commands::employees_commands::delete_employee,
            // Notifications
            commands::notify_commands::notify_task_assigned,
            // AI
            commands::ai_commands::generate_email_draft,
            // Attachments
            commands::attachments_commands::get_email_attachments,
            commands::attachments_commands::open_attachment,
            commands::attachments_commands::read_attachment_base64,
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
