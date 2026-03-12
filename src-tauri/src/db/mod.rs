use anyhow::Result;
use chrono::{Local, NaiveDate};
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;

use crate::models::{AiProvider, AppConfig, Content, ContentStatus, ContentType, UsageRecord};

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: PathBuf) -> Result<Self> {
        let conn = Connection::open(&path)?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS contents (
                id TEXT PRIMARY KEY,
                scheduled_date TEXT NOT NULL,
                content_type TEXT NOT NULL,
                topic TEXT NOT NULL,
                caption TEXT,
                hashtags TEXT,
                status TEXT NOT NULL,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_contents_date ON contents(scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);

            CREATE TABLE IF NOT EXISTS usage_records (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                prompt_tokens INTEGER NOT NULL,
                completion_tokens INTEGER NOT NULL,
                total_tokens INTEGER NOT NULL,
                cost_usd REAL NOT NULL,
                cost_jpy REAL NOT NULL,
                exchange_rate REAL NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_records(timestamp);

            CREATE TABLE IF NOT EXISTS exchange_rate_cache (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                rate REAL NOT NULL,
                updated_at TEXT NOT NULL
            );
            "#,
        )?;
        Ok(())
    }

    pub fn insert_content(&self, content: &Content) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"INSERT INTO contents (id, scheduled_date, content_type, topic, caption, hashtags, status, notes, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"#,
            params![
                content.id,
                content.scheduled_date.to_string(),
                content.content_type.as_str(),
                content.topic,
                content.caption,
                content.hashtags,
                content.status.as_str(),
                content.notes,
                content.created_at.to_rfc3339(),
                content.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn update_content(&self, content: &Content) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"UPDATE contents SET
                scheduled_date = ?2,
                content_type = ?3,
                topic = ?4,
                caption = ?5,
                hashtags = ?6,
                status = ?7,
                notes = ?8,
                updated_at = ?9
               WHERE id = ?1"#,
            params![
                content.id,
                content.scheduled_date.to_string(),
                content.content_type.as_str(),
                content.topic,
                content.caption,
                content.hashtags,
                content.status.as_str(),
                content.notes,
                Local::now().to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn get_content(&self, id: &str) -> Result<Option<Content>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT * FROM contents WHERE id = ?1")?;
        let mut rows = stmt.query(params![id])?;

        if let Some(row) = rows.next()? {
            Ok(Some(Self::row_to_content(row)?))
        } else {
            Ok(None)
        }
    }

    pub fn get_contents_by_date_range(
        &self,
        start: NaiveDate,
        end: NaiveDate,
    ) -> Result<Vec<Content>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT * FROM contents WHERE scheduled_date >= ?1 AND scheduled_date <= ?2 ORDER BY scheduled_date",
        )?;
        let rows = stmt.query_map(params![start.to_string(), end.to_string()], |row| {
            Self::row_to_content(row)
                .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))
        })?;

        let mut contents = Vec::new();
        for row in rows {
            contents.push(row?);
        }
        Ok(contents)
    }

    pub fn get_today_contents(&self) -> Result<Vec<Content>> {
        let today = Local::now().date_naive();
        self.get_contents_by_date_range(today, today)
    }

    pub fn delete_content(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM contents WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_config(&self) -> Result<AppConfig> {
        let conn = self.conn.lock().unwrap();
        let mut config = AppConfig::default();

        let mut stmt = conn.prepare("SELECT key, value FROM config")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;

        for row in rows {
            let (key, value) = row?;
            match key.as_str() {
                "claude_api_key" => config.claude_api_key = Some(value),
                "openai_api_key" => config.openai_api_key = Some(value),
                "ai_provider" => config.ai_provider = AiProvider::from_str(&value),
                "studio_name" => config.studio_name = value,
                "studio_location" => config.studio_location = value,
                "target_audience" => config.target_audience = value,
                _ => {}
            }
        }

        Ok(config)
    }

    pub fn set_config(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO config (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    fn row_to_content(row: &rusqlite::Row) -> Result<Content> {
        use chrono::DateTime;

        Ok(Content {
            id: row.get(0)?,
            scheduled_date: NaiveDate::parse_from_str(&row.get::<_, String>(1)?, "%Y-%m-%d")?,
            content_type: ContentType::from_str(&row.get::<_, String>(2)?),
            topic: row.get(3)?,
            caption: row.get(4)?,
            hashtags: row.get(5)?,
            status: ContentStatus::from_str(&row.get::<_, String>(6)?),
            notes: row.get(7)?,
            created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?)?
                .with_timezone(&Local),
            updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(9)?)?
                .with_timezone(&Local),
        })
    }

    pub fn insert_usage_record(&self, record: &UsageRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"INSERT INTO usage_records (id, timestamp, provider, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, cost_jpy, exchange_rate)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"#,
            params![
                record.id,
                record.timestamp.to_rfc3339(),
                record.provider,
                record.model,
                record.prompt_tokens,
                record.completion_tokens,
                record.total_tokens,
                record.cost_usd,
                record.cost_jpy,
                record.exchange_rate,
            ],
        )?;
        Ok(())
    }

    pub fn get_usage_summary(&self) -> Result<UsageSummary> {
        let conn = self.conn.lock().unwrap();

        let today = Local::now().date_naive().to_string();
        let month_start = Local::now().date_naive().format("%Y-%m-01").to_string();

        let today_stats: (u32, f64) = conn.query_row(
            "SELECT COALESCE(SUM(total_tokens), 0), COALESCE(SUM(cost_jpy), 0) FROM usage_records WHERE DATE(timestamp) = ?1",
            params![today],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;

        let month_stats: (u32, f64) = conn.query_row(
            "SELECT COALESCE(SUM(total_tokens), 0), COALESCE(SUM(cost_jpy), 0) FROM usage_records WHERE timestamp >= ?1",
            params![month_start],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;

        let total_stats: (u32, f64) = conn.query_row(
            "SELECT COALESCE(SUM(total_tokens), 0), COALESCE(SUM(cost_jpy), 0) FROM usage_records",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;

        Ok(UsageSummary {
            today_tokens: today_stats.0,
            today_cost_jpy: today_stats.1,
            month_tokens: month_stats.0,
            month_cost_jpy: month_stats.1,
            total_tokens: total_stats.0,
            total_cost_jpy: total_stats.1,
        })
    }

    pub fn get_cached_exchange_rate(&self) -> Result<Option<(f64, String)>> {
        let conn = self.conn.lock().unwrap();
        let result = conn.query_row(
            "SELECT rate, updated_at FROM exchange_rate_cache WHERE id = 1",
            [],
            |row| Ok((row.get::<_, f64>(0)?, row.get::<_, String>(1)?)),
        );
        match result {
            Ok(data) => Ok(Some(data)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn set_cached_exchange_rate(&self, rate: f64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO exchange_rate_cache (id, rate, updated_at) VALUES (1, ?1, ?2)",
            params![rate, Local::now().to_rfc3339()],
        )?;
        Ok(())
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UsageSummary {
    pub today_tokens: u32,
    pub today_cost_jpy: f64,
    pub month_tokens: u32,
    pub month_cost_jpy: f64,
    pub total_tokens: u32,
    pub total_cost_jpy: f64,
}
