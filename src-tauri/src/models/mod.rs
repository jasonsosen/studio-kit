use chrono::{DateTime, Local, NaiveDate};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ContentStatus {
    Planned,
    AiGenerated,
    ReadyToPost,
    Posted,
    Skipped,
}

impl ContentStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Planned => "planned",
            Self::AiGenerated => "ai_generated",
            Self::ReadyToPost => "ready_to_post",
            Self::Posted => "posted",
            Self::Skipped => "skipped",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "planned" => Self::Planned,
            "ai_generated" => Self::AiGenerated,
            "ready_to_post" => Self::ReadyToPost,
            "posted" => Self::Posted,
            "skipped" => Self::Skipped,
            _ => Self::Planned,
        }
    }

    pub fn display_jp(&self) -> &'static str {
        match self {
            Self::Planned => "📝 企画中",
            Self::AiGenerated => "🤖 AI生成済み",
            Self::ReadyToPost => "✅ 投稿準備完了",
            Self::Posted => "📤 投稿済み",
            Self::Skipped => "⏭️ スキップ",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ContentType {
    Reel,
    Post,
    Story,
    Carousel,
}

impl ContentType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Reel => "reel",
            Self::Post => "post",
            Self::Story => "story",
            Self::Carousel => "carousel",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "reel" => Self::Reel,
            "post" => Self::Post,
            "story" => Self::Story,
            "carousel" => Self::Carousel,
            _ => Self::Post,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Content {
    pub id: String,
    pub scheduled_date: NaiveDate,
    pub content_type: ContentType,
    pub topic: String,
    pub caption: Option<String>,
    pub hashtags: Option<String>,
    pub status: ContentStatus,
    pub notes: Option<String>,
    pub created_at: DateTime<Local>,
    pub updated_at: DateTime<Local>,
}

impl Content {
    pub fn new(scheduled_date: NaiveDate, topic: String, content_type: ContentType) -> Self {
        let now = Local::now();
        Self {
            id: Uuid::new_v4().to_string(),
            scheduled_date,
            content_type,
            topic,
            caption: None,
            hashtags: None,
            status: ContentStatus::Planned,
            notes: None,
            created_at: now,
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedCaption {
    pub caption: String,
    pub hashtags: Vec<String>,
    pub hooks: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AiProvider {
    Claude,
    OpenAI,
}

impl AiProvider {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Claude => "claude",
            Self::OpenAI => "openai",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "openai" => Self::OpenAI,
            _ => Self::Claude,
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Claude => "Claude (Anthropic)",
            Self::OpenAI => "GPT-4o mini (OpenAI)",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageStats {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
    pub model: String,
    pub provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageRecord {
    pub id: String,
    pub timestamp: DateTime<Local>,
    pub provider: String,
    pub model: String,
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
    pub cost_usd: f64,
    pub cost_jpy: f64,
    pub exchange_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExchangeRate {
    pub rate: f64,
    pub updated_at: DateTime<Local>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub claude_api_key: Option<String>,
    pub openai_api_key: Option<String>,
    pub ai_provider: AiProvider,
    pub studio_name: String,
    pub studio_location: String,
    pub target_audience: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            claude_api_key: None,
            openai_api_key: None,
            ai_provider: AiProvider::Claude,
            studio_name: "ピラティススタジオ".to_string(),
            studio_location: "大阪".to_string(),
            target_audience: "30-40代女性".to_string(),
        }
    }
}
