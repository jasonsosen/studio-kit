use std::sync::Arc;
use std::time::Duration;
use tokio::time::interval;

use crate::db::Database;
use crate::models::ContentStatus;

pub struct Scheduler {
    db: Arc<Database>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SchedulerNotification {
    pub title: String,
    pub body: String,
    pub pending_count: usize,
    pub ready_count: usize,
}

impl Scheduler {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    pub fn check_today(&self) -> Option<SchedulerNotification> {
        let contents = match self.db.get_today_contents() {
            Ok(c) => c,
            Err(_) => return None,
        };

        if contents.is_empty() {
            return None;
        }

        let pending = contents
            .iter()
            .filter(|c| matches!(c.status, ContentStatus::Planned))
            .count();

        let ai_generated = contents
            .iter()
            .filter(|c| matches!(c.status, ContentStatus::AiGenerated))
            .count();

        let ready = contents
            .iter()
            .filter(|c| matches!(c.status, ContentStatus::ReadyToPost))
            .count();

        let not_posted = pending + ai_generated + ready;

        if not_posted == 0 {
            return None;
        }

        let body = if ready > 0 {
            format!("{}件の投稿が準備完了です！", ready)
        } else if ai_generated > 0 {
            format!(
                "{}件のAI生成済み投稿があります。確認してください。",
                ai_generated
            )
        } else {
            format!("{}件の投稿が企画中です。", pending)
        };

        Some(SchedulerNotification {
            title: "🧘 今日の投稿".to_string(),
            body,
            pending_count: pending + ai_generated,
            ready_count: ready,
        })
    }

    pub fn get_upcoming_reminder(&self) -> Option<SchedulerNotification> {
        use chrono::{Duration as ChronoDuration, Local};

        let today = Local::now().date_naive();
        let tomorrow = today + ChronoDuration::days(1);

        let tomorrow_contents = match self.db.get_contents_by_date_range(tomorrow, tomorrow) {
            Ok(c) => c,
            Err(_) => return None,
        };

        let unplanned = tomorrow_contents
            .iter()
            .filter(|c| matches!(c.status, ContentStatus::Planned))
            .count();

        if unplanned == 0 {
            return None;
        }

        Some(SchedulerNotification {
            title: "📅 明日の投稿".to_string(),
            body: format!("明日{}件の投稿があります。準備を進めましょう！", unplanned),
            pending_count: unplanned,
            ready_count: 0,
        })
    }
}
