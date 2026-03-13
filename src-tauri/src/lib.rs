mod agent;
mod api;
mod db;
mod models;
mod scheduler;

use agent::{Agent, DailySummary};
use db::{Database, UsageSummary};
use models::{AppConfig, Content, ContentStatus, ContentType, MediaType};
use scheduler::{Scheduler, SchedulerNotification};

use chrono::NaiveDate;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Manager, State};
use tokio::sync::Mutex;
use std::process::Command;

struct AppState {
    db: Arc<Database>,
    agent: Mutex<Agent>,
    scheduler: Scheduler,
}

fn get_data_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let data_dir = home.join(".studio-kit");
    std::fs::create_dir_all(&data_dir).ok();
    data_dir
}

fn get_db_path() -> PathBuf {
    get_data_dir().join("data.db")
}

fn get_media_dir() -> PathBuf {
    let media_dir = get_data_dir().join("media");
    std::fs::create_dir_all(&media_dir).ok();
    media_dir
}

fn get_thumbnails_dir() -> PathBuf {
    let thumb_dir = get_data_dir().join("thumbnails");
    std::fs::create_dir_all(&thumb_dir).ok();
    thumb_dir
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

#[tauri::command]
async fn upload_media(
    state: State<'_, AppState>,
    content_id: String,
    file_path: String,
) -> Result<Content, String> {
    let source_path = PathBuf::from(&file_path);
    if !source_path.exists() {
        return Err("File not found".to_string());
    }

    let extension = source_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let media_type = match extension.as_str() {
        "mp4" | "mov" | "avi" | "mkv" | "webm" => MediaType::Video,
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "heic" => MediaType::Image,
        _ => return Err(format!("Unsupported file type: {}", extension)),
    };

    let media_dir = get_media_dir();
    let file_name = format!("{}_{}.{}", content_id, chrono::Utc::now().timestamp(), extension);
    let dest_path = media_dir.join(&file_name);

    std::fs::copy(&source_path, &dest_path).map_err(|e| format!("Failed to copy file: {}", e))?;

    let thumbnail_path = if media_type == MediaType::Video {
        generate_video_thumbnail(&dest_path, &content_id)?
    } else {
        generate_image_thumbnail(&dest_path, &content_id)?
    };

    let mut content = state
        .db
        .get_content(&content_id)
        .map_err(|e| e.to_string())?
        .ok_or("Content not found")?;

    content.media_path = Some(dest_path.to_string_lossy().to_string());
    content.media_type = Some(media_type);
    content.thumbnail_path = thumbnail_path;

    state.db.update_content(&content).map_err(|e| e.to_string())?;
    Ok(content)
}

fn generate_video_thumbnail(video_path: &PathBuf, content_id: &str) -> Result<Option<String>, String> {
    let thumb_dir = get_thumbnails_dir();
    let thumb_path = thumb_dir.join(format!("{}_thumb.jpg", content_id));

    let result = Command::new("ffmpeg")
        .args([
            "-i", video_path.to_str().unwrap(),
            "-ss", "00:00:01",
            "-vframes", "1",
            "-vf", "scale=320:-1",
            "-y",
            thumb_path.to_str().unwrap(),
        ])
        .output();

    match result {
        Ok(output) if output.status.success() => {
            Ok(Some(thumb_path.to_string_lossy().to_string()))
        }
        _ => Ok(None),
    }
}

fn generate_image_thumbnail(image_path: &PathBuf, content_id: &str) -> Result<Option<String>, String> {
    let thumb_dir = get_thumbnails_dir();
    let thumb_path = thumb_dir.join(format!("{}_thumb.jpg", content_id));

    let result = Command::new("sips")
        .args([
            "-z", "320", "320",
            "--out", thumb_path.to_str().unwrap(),
            image_path.to_str().unwrap(),
        ])
        .output();

    match result {
        Ok(output) if output.status.success() => {
            Ok(Some(thumb_path.to_string_lossy().to_string()))
        }
        _ => Ok(None),
    }
}

#[tauri::command]
async fn remove_media(state: State<'_, AppState>, content_id: String) -> Result<Content, String> {
    let mut content = state
        .db
        .get_content(&content_id)
        .map_err(|e| e.to_string())?
        .ok_or("Content not found")?;

    if let Some(ref media_path) = content.media_path {
        let _ = std::fs::remove_file(media_path);
    }
    if let Some(ref thumb_path) = content.thumbnail_path {
        let _ = std::fs::remove_file(thumb_path);
    }

    content.media_path = None;
    content.media_type = None;
    content.thumbnail_path = None;

    state.db.update_content(&content).map_err(|e| e.to_string())?;
    Ok(content)
}

#[tauri::command]
fn get_media_base_path() -> String {
    get_data_dir().to_string_lossy().to_string()
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
            upload_media,
            remove_media,
            get_media_base_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
