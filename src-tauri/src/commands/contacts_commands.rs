use tauri::{Emitter, State};

use crate::db::{clients, contacts, DbPool};
use crate::db::contacts::{Contact, CreateContactPayload, UpdateContactPayload};

type CmdResult<T> = Result<T, String>;

/// "user@company.com" → "company.com"
fn extract_domain(email: &str) -> Option<String> {
    email.trim().split('@').nth(1).map(|d| d.to_lowercase())
}

#[tauri::command]
pub fn get_contacts(
    pool: State<DbPool>,
    project_id: Option<i64>,
    search: Option<String>,
) -> CmdResult<Vec<Contact>> {
    contacts::get_all(&pool, project_id, search).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_contact(
    app: tauri::AppHandle,
    pool: State<DbPool>,
    payload: CreateContactPayload,
) -> CmdResult<Contact> {
    let contact = contacts::create(&pool, payload).map_err(|e| e.to_string())?;

    // 若聯絡人有 email，嘗試自動建立信箱分類
    if let Some(ref email) = contact.email {
        if let Some(domain) = extract_domain(email) {
            // 該 domain 尚無對應客戶才建立
            if matches!(clients::find_by_domain(&pool, &domain), Ok(None)) {
                let client_name = contact
                    .company_name
                    .clone()
                    .unwrap_or_else(|| domain.clone());

                let client_payload = clients::CreateClientPayload {
                    name: client_name,
                    contact_person: Some(contact.name.clone()),
                    email: None,
                    phone: None,
                    industry: None,
                    priority: Some(2),
                    notes: None,
                    domain: Some(domain),
                };

                if let Ok(new_client) = clients::create(&pool, client_payload) {
                    let _ = app.emit("client:created", &new_client);
                }
            }
        }
    }

    Ok(contact)
}

#[tauri::command]
pub fn update_contact(
    pool: State<DbPool>,
    id: i64,
    payload: UpdateContactPayload,
) -> CmdResult<Contact> {
    contacts::update(&pool, id, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_contact(pool: State<DbPool>, id: i64) -> CmdResult<()> {
    contacts::delete(&pool, id).map_err(|e| e.to_string())
}
