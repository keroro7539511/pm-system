use tauri::{Emitter, Manager};

pub mod commands;
pub mod db;
pub mod gmail;
pub mod tray;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let pool = db::init(app.handle()).map_err(|e| e.to_string())?;
            app.manage(pool);
            tray::setup(app)?;

            // Gmail background sync: runs immediately on startup, then every 5 minutes
            let sync_handle = app.handle().clone();
            let sync_pool = app.state::<db::DbPool>().inner().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    if db::gmail_tokens::get(&sync_pool).ok().flatten().is_some() {
                        match gmail::sync::sync_emails(&sync_handle, &sync_pool).await {
                            Ok(n) if n > 0 => {
                                let _ = sync_handle.emit("email:received", ());
                            }
                            Err(e) => eprintln!("[gmail] background sync error: {e}"),
                            _ => {}
                        }
                    }
                    // Sleep after sync completes to avoid burst if sync takes longer than interval
                    tokio::time::sleep(std::time::Duration::from_secs(300)).await;
                }
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
            commands::reports_commands::export_weekly_excel,
            commands::reports_commands::check_for_updates,
            // Settings
            commands::settings_commands::get_settings,
            commands::settings_commands::save_settings,
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
            commands::outlook_commands::send_outlook_email,
            // Meetings
            commands::meetings_commands::get_meetings,
            commands::meetings_commands::create_meeting,
            commands::meetings_commands::update_meeting,
            commands::meetings_commands::delete_meeting,
            commands::meetings_commands::get_action_items,
            commands::meetings_commands::save_action_items,
            commands::meetings_commands::link_action_item_task,
            // AI
            commands::ai_commands::generate_email_draft,
            commands::ai_commands::summarize_transcript,
            // Attachments
            commands::attachments_commands::get_email_attachments,
            commands::attachments_commands::open_attachment,
            commands::attachments_commands::read_attachment_base64,
            // Goals
            commands::goals_commands::get_all_goals,
            commands::goals_commands::get_project_goals,
            commands::goals_commands::create_project_goal,
            commands::goals_commands::update_project_goal,
            commands::goals_commands::delete_project_goal,
            // Gmail
            commands::gmail_commands::gmail_start_auth,
            commands::gmail_commands::gmail_get_status,
            commands::gmail_commands::gmail_sync,
            commands::gmail_commands::gmail_disconnect,
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
