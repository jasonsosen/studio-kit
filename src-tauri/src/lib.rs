mod agent;
mod api;
mod db;
mod models;
mod scheduler;

use agent::{Agent, DailySummary};
use db::{Database, UsageSummary};
use models::{AppConfig, Content, ContentStatus, ContentType};
use scheduler::{Scheduler, SchedulerNotification};

use chrono::NaiveDate;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Manager, State};
use tokio::sync::Mutex;

struct AppState {
    db: Arc<Database>,
    agent: Mutex<Agent>,
    scheduler: Scheduler,
}

fn get_db_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let data_dir = home.join(".studio-kit");
    std::fs::create_dir_all(&data_dir).ok();
    data_dir.join("data.db")
}

#[tauri::command]
async fn get_week_contents(state: State<'_, AppState>) -> Result<Vec<Content>, String> {
    state
        .agent
        .lock()
        .await
        .get_week_contents()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_today_summary(state: State<'_, AppState>) -> Result<DailySummary, String> {
    state
        .agent
        .lock()
        .await
        .get_today_summary()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_content(
    state: State<'_, AppState>,
    date: String,
    topic: String,
    content_type: String,
) -> Result<Content, String> {
    let date = NaiveDate::parse_from_str(&date, "%Y-%m-%d").map_err(|e| e.to_string())?;
    let content_type = ContentType::from_str(&content_type);
    let content = Content::new(date, topic, content_type);
    state
        .db
        .insert_content(&content)
        .map_err(|e| e.to_string())?;
    Ok(content)
}

#[tauri::command]
async fn update_content(state: State<'_, AppState>, content: Content) -> Result<(), String> {
    state
        .db
        .update_content(&content)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_content(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.db.delete_content(&id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn generate_caption(state: State<'_, AppState>, content_id: String) -> Result<Content, String> {
    state
        .agent
        .lock()
        .await
        .generate_caption_for_content(&content_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn generate_weekly_plan(state: State<'_, AppState>) -> Result<Vec<Content>, String> {
    state
        .agent
        .lock()
        .await
        .generate_weekly_plan()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_config(state: State<'_, AppState>) -> Result<AppConfig, String> {
    state.db.get_config().map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_config(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    state.db.set_config(&key, &value).map_err(|e| e.to_string())?;
    state.agent.lock().await.reload_config().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn has_claude_key(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(state.agent.lock().await.has_claude())
}

#[tauri::command]
async fn has_ai_configured(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(state.agent.lock().await.has_ai_configured())
}

#[tauri::command]
async fn get_usage_summary(state: State<'_, AppState>) -> Result<UsageSummary, String> {
    state.db.get_usage_summary().map_err(|e| e.to_string())
}

#[tauri::command]
async fn mark_as_posted(state: State<'_, AppState>, content_id: String) -> Result<(), String> {
    let mut content = state
        .db
        .get_content(&content_id)
        .map_err(|e| e.to_string())?
        .ok_or("Content not found")?;
    content.status = ContentStatus::Posted;
    state.db.update_content(&content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_contents_by_month(
    state: State<'_, AppState>,
    year: i32,
    month: u32,
) -> Result<Vec<Content>, String> {
    let start = NaiveDate::from_ymd_opt(year, month, 1).ok_or("Invalid date")?;
    let end = if month == 12 {
        NaiveDate::from_ymd_opt(year + 1, 1, 1)
    } else {
        NaiveDate::from_ymd_opt(year, month + 1, 1)
    }
    .ok_or("Invalid date")?
    .pred_opt()
    .ok_or("Invalid date")?;

    state
        .db
        .get_contents_by_date_range(start, end)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn check_today_notification(
    state: State<'_, AppState>,
) -> Result<Option<SchedulerNotification>, String> {
    Ok(state.scheduler.check_today())
}

#[tauri::command]
async fn check_upcoming_notification(
    state: State<'_, AppState>,
) -> Result<Option<SchedulerNotification>, String> {
    Ok(state.scheduler.get_upcoming_reminder())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = get_db_path();
    let db = Arc::new(Database::new(db_path).expect("Failed to initialize database"));
    let agent = Agent::new(db.clone()).expect("Failed to initialize agent");
    let scheduler = Scheduler::new(db.clone());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(AppState {
            db,
            agent: Mutex::new(agent),
            scheduler,
        })
        .invoke_handler(tauri::generate_handler![
            get_week_contents,
            get_today_summary,
            create_content,
            update_content,
            delete_content,
            generate_caption,
            generate_weekly_plan,
            get_config,
            save_config,
            has_claude_key,
            has_ai_configured,
            get_usage_summary,
            mark_as_posted,
            get_contents_by_month,
            check_today_notification,
            check_upcoming_notification,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
