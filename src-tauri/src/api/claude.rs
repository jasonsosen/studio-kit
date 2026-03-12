use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::models::GeneratedCaption;

const CLAUDE_API_URL: &str = "https://api.anthropic.com/v1/messages";

#[derive(Serialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<Message>,
}

#[derive(Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ClaudeResponse {
    content: Vec<ContentBlock>,
}

#[derive(Deserialize)]
struct ContentBlock {
    text: String,
}

pub struct ClaudeClient {
    client: Client,
    api_key: String,
}

impl ClaudeClient {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
        }
    }

    pub async fn generate_caption(
        &self,
        topic: &str,
        studio_name: &str,
        location: &str,
        target_audience: &str,
    ) -> Result<GeneratedCaption> {
        let prompt = format!(
            r#"あなたは{location}にある「{studio_name}」のピラティススタジオのInstagram運用担当です。

以下のトピックでInstagram投稿のキャプションを作成してください：
トピック: {topic}
ターゲット: {target_audience}

以下のJSON形式で回答してください（他の説明は不要）：
{{
  "caption": "投稿のキャプション本文（絵文字を適度に使用、300文字程度）",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2", ...（9-11個）],
  "hooks": ["冒頭フック案1", "冒頭フック案2", "冒頭フック案3"]
}}

キャプション作成のルール：
1. 冒頭3秒で目を引くフックを入れる
2. 専門用語は避け、体の感覚を言語化する
3. 最後は「体験レッスンはDMまで」と誘導
4. ハッシュタグは広め3個 + 痛点3個 + 地域3個のバランス
5. 丁寧語（です・ます調）で親しみやすく"#,
            location = location,
            studio_name = studio_name,
            topic = topic,
            target_audience = target_audience,
        );

        let request = ClaudeRequest {
            model: "claude-sonnet-4-20250514".to_string(),
            max_tokens: 1024,
            messages: vec![Message {
                role: "user".to_string(),
                content: prompt,
            }],
        };

        let response = self
            .client
            .post(CLAUDE_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Claude API error: {}", error_text));
        }

        let claude_response: ClaudeResponse = response.json().await?;
        let text = claude_response
            .content
            .first()
            .map(|c| c.text.clone())
            .ok_or_else(|| anyhow!("Empty response from Claude"))?;

        let generated: GeneratedCaption = serde_json::from_str(&text)
            .map_err(|e| anyhow!("Failed to parse Claude response: {}. Raw: {}", e, text))?;

        Ok(generated)
    }

    pub async fn generate_weekly_topics(
        &self,
        studio_name: &str,
        location: &str,
        target_audience: &str,
        existing_topics: &[String],
    ) -> Result<Vec<String>> {
        let existing = if existing_topics.is_empty() {
            "なし".to_string()
        } else {
            existing_topics.join(", ")
        };

        let prompt = format!(
            r#"あなたは{location}の「{studio_name}」ピラティススタジオのコンテンツプランナーです。

今週のInstagram投稿トピックを7つ提案してください。
ターゲット: {target_audience}
最近のトピック（重複を避ける）: {existing}

以下のJSON形式で回答してください（他の説明は不要）：
["トピック1", "トピック2", "トピック3", "トピック4", "トピック5", "トピック6", "トピック7"]

トピック例：
- 腰痛改善ストレッチ
- 産後の骨盤ケア
- 猫背矯正エクササイズ
- リフォーマー入門
- 朝5分の体幹トレーニング
- 肩こり解消ピラティス
- 美姿勢を作る基本動作"#,
            location = location,
            studio_name = studio_name,
            target_audience = target_audience,
            existing = existing,
        );

        let request = ClaudeRequest {
            model: "claude-sonnet-4-20250514".to_string(),
            max_tokens: 512,
            messages: vec![Message {
                role: "user".to_string(),
                content: prompt,
            }],
        };

        let response = self
            .client
            .post(CLAUDE_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Claude API error: {}", error_text));
        }

        let claude_response: ClaudeResponse = response.json().await?;
        let text = claude_response
            .content
            .first()
            .map(|c| c.text.clone())
            .ok_or_else(|| anyhow!("Empty response from Claude"))?;

        let topics: Vec<String> = serde_json::from_str(&text)
            .map_err(|e| anyhow!("Failed to parse topics: {}. Raw: {}", e, text))?;

        Ok(topics)
    }
}
