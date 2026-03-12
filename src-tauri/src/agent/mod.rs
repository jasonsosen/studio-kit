use anyhow::Result;
use chrono::{Datelike, Duration, Local, NaiveDate};
use std::sync::Arc;
use uuid::Uuid;

use crate::api::claude::ClaudeClient;
use crate::api::openai::OpenAIClient;
use crate::api::exchange::{self, ExchangeRateClient};
use crate::db::Database;
use crate::models::{AiProvider, Content, ContentStatus, ContentType, UsageRecord, UsageStats};

pub struct Agent {
    db: Arc<Database>,
    claude: Option<ClaudeClient>,
    openai: Option<OpenAIClient>,
    exchange: ExchangeRateClient,
    provider: AiProvider,
    studio_name: String,
    location: String,
    target_audience: String,
}

impl Agent {
    pub fn new(db: Arc<Database>) -> Result<Self> {
        let config = db.get_config()?;
        let claude = config.claude_api_key.map(ClaudeClient::new);
        let openai = config.openai_api_key.map(OpenAIClient::new);

        Ok(Self {
            db,
            claude,
            openai,
            exchange: ExchangeRateClient::new(),
            provider: config.ai_provider,
            studio_name: config.studio_name,
            location: config.studio_location,
            target_audience: config.target_audience,
        })
    }

    pub fn reload_config(&mut self) -> Result<()> {
        let config = self.db.get_config()?;
        self.claude = config.claude_api_key.map(ClaudeClient::new);
        self.openai = config.openai_api_key.map(OpenAIClient::new);
        self.provider = config.ai_provider;
        self.studio_name = config.studio_name;
        self.location = config.studio_location;
        self.target_audience = config.target_audience;
        Ok(())
    }

    pub fn has_ai_configured(&self) -> bool {
        match self.provider {
            AiProvider::Claude => self.claude.is_some(),
            AiProvider::OpenAI => self.openai.is_some(),
        }
    }

    pub fn has_claude(&self) -> bool {
        self.claude.is_some()
    }

    async fn record_usage(&mut self, usage: &UsageStats) -> Result<()> {
        let rate = self.exchange.get_usd_to_jpy().await.unwrap_or(150.0);
        let cost_usd = exchange::calculate_cost_usd(
            &usage.provider,
            &usage.model,
            usage.prompt_tokens,
            usage.completion_tokens,
        );
        let cost_jpy = self.exchange.calculate_cost_jpy(cost_usd, rate);

        let record = UsageRecord {
            id: Uuid::new_v4().to_string(),
            timestamp: Local::now(),
            provider: usage.provider.clone(),
            model: usage.model.clone(),
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
            cost_usd,
            cost_jpy,
            exchange_rate: rate,
        };

        self.db.insert_usage_record(&record)?;
        self.db.set_cached_exchange_rate(rate)?;

        Ok(())
    }

    pub async fn generate_caption_for_content(&mut self, content_id: &str) -> Result<Content> {
        let mut content = self
            .db
            .get_content(content_id)?
            .ok_or_else(|| anyhow::anyhow!("Content not found"))?;

        let (generated, usage) = match self.provider {
            AiProvider::Claude => {
                let client = self.claude.as_ref()
                    .ok_or_else(|| anyhow::anyhow!("Claude API key not configured"))?;
                client.generate_caption(
                    &content.topic,
                    &self.studio_name,
                    &self.location,
                    &self.target_audience,
                ).await?
            }
            AiProvider::OpenAI => {
                let client = self.openai.as_ref()
                    .ok_or_else(|| anyhow::anyhow!("OpenAI API key not configured"))?;
                client.generate_caption(
                    &content.topic,
                    &self.studio_name,
                    &self.location,
                    &self.target_audience,
                ).await?
            }
        };

        self.record_usage(&usage).await?;

        content.caption = Some(generated.caption);
        content.hashtags = Some(generated.hashtags.join(" "));
        content.status = ContentStatus::AiGenerated;

        self.db.update_content(&content)?;
        Ok(content)
    }

    pub async fn generate_weekly_plan(&mut self) -> Result<Vec<Content>> {
        let today = Local::now().date_naive();
        let week_start = today - Duration::days(today.weekday().num_days_from_monday() as i64);
        let _week_end = week_start + Duration::days(6);

        let existing = self.db.get_contents_by_date_range(
            today - Duration::days(30),
            today,
        )?;
        let existing_topics: Vec<String> = existing.iter().map(|c| c.topic.clone()).collect();

        let (topics, usage) = match self.provider {
            AiProvider::Claude => {
                let client = self.claude.as_ref()
                    .ok_or_else(|| anyhow::anyhow!("Claude API key not configured"))?;
                client.generate_weekly_topics(
                    &self.studio_name,
                    &self.location,
                    &self.target_audience,
                    &existing_topics,
                ).await?
            }
            AiProvider::OpenAI => {
                let client = self.openai.as_ref()
                    .ok_or_else(|| anyhow::anyhow!("OpenAI API key not configured"))?;
                client.generate_weekly_topics(
                    &self.studio_name,
                    &self.location,
                    &self.target_audience,
                    &existing_topics,
                ).await?
            }
        };

        self.record_usage(&usage).await?;

        let mut created = Vec::new();
        for (i, topic) in topics.into_iter().enumerate() {
            let date = week_start + Duration::days(i as i64);
            if date >= today {
                let content = Content::new(date, topic, ContentType::Reel);
                self.db.insert_content(&content)?;
                created.push(content);
            }
        }

        Ok(created)
    }

    pub fn get_today_summary(&self) -> Result<DailySummary> {
        let today = Local::now().date_naive();
        let contents = self.db.get_today_contents()?;

        let pending = contents
            .iter()
            .filter(|c| matches!(c.status, ContentStatus::Planned | ContentStatus::AiGenerated))
            .count();

        let ready = contents
            .iter()
            .filter(|c| matches!(c.status, ContentStatus::ReadyToPost))
            .count();

        Ok(DailySummary {
            date: today,
            total: contents.len(),
            pending,
            ready,
            contents,
        })
    }

    pub fn get_week_contents(&self) -> Result<Vec<Content>> {
        let today = Local::now().date_naive();
        let week_start = today - Duration::days(today.weekday().num_days_from_monday() as i64);
        let week_end = week_start + Duration::days(6);
        self.db.get_contents_by_date_range(week_start, week_end)
    }
}

#[derive(Debug, serde::Serialize)]
pub struct DailySummary {
    pub date: NaiveDate,
    pub total: usize,
    pub pending: usize,
    pub ready: usize,
    pub contents: Vec<Content>,
}
