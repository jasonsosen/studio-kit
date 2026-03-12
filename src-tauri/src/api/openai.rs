use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::models::{GeneratedCaption, UsageStats};

const OPENAI_API_URL: &str = "https://api.openai.com/v1/chat/completions";

#[derive(Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<Message>,
    max_tokens: u32,
}

#[derive(Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct OpenAIResponse {
    choices: Vec<Choice>,
    usage: Usage,
}

#[derive(Deserialize)]
struct Choice {
    message: ResponseMessage,
}

#[derive(Deserialize)]
struct ResponseMessage {
    content: String,
}

#[derive(Deserialize)]
struct Usage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

pub struct OpenAIClient {
    client: Client,
    api_key: String,
}

impl OpenAIClient {
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
    ) -> Result<(GeneratedCaption, UsageStats)> {
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

        let request = OpenAIRequest {
            model: "gpt-4o-mini".to_string(),
            max_tokens: 1024,
            messages: vec![Message {
                role: "user".to_string(),
                content: prompt,
            }],
        };

        let response = self
            .client
            .post(OPENAI_API_URL)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("OpenAI API error: {}", error_text));
        }

        let openai_response: OpenAIResponse = response.json().await?;
        let text = openai_response
            .choices
            .first()
            .map(|c| c.message.content.clone())
            .ok_or_else(|| anyhow!("Empty response from OpenAI"))?;

        // Clean up potential markdown code blocks
        let clean_text = text
            .trim()
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim();

        let generated: GeneratedCaption = serde_json::from_str(clean_text)
            .map_err(|e| anyhow!("Failed to parse OpenAI response: {}. Raw: {}", e, text))?;

        let usage = UsageStats {
            prompt_tokens: openai_response.usage.prompt_tokens,
            completion_tokens: openai_response.usage.completion_tokens,
            total_tokens: openai_response.usage.total_tokens,
            model: "gpt-4o-mini".to_string(),
            provider: "openai".to_string(),
        };

        Ok((generated, usage))
    }

    pub async fn generate_weekly_topics(
        &self,
        studio_name: &str,
        location: &str,
        target_audience: &str,
        existing_topics: &[String],
    ) -> Result<(Vec<String>, UsageStats)> {
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

        let request = OpenAIRequest {
            model: "gpt-4o-mini".to_string(),
            max_tokens: 512,
            messages: vec![Message {
                role: "user".to_string(),
                content: prompt,
            }],
        };

        let response = self
            .client
            .post(OPENAI_API_URL)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("OpenAI API error: {}", error_text));
        }

        let openai_response: OpenAIResponse = response.json().await?;
        let text = openai_response
            .choices
            .first()
            .map(|c| c.message.content.clone())
            .ok_or_else(|| anyhow!("Empty response from OpenAI"))?;

        // Clean up potential markdown code blocks
        let clean_text = text
            .trim()
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim();

        let topics: Vec<String> = serde_json::from_str(clean_text)
            .map_err(|e| anyhow!("Failed to parse topics: {}. Raw: {}", e, text))?;

        let usage = UsageStats {
            prompt_tokens: openai_response.usage.prompt_tokens,
            completion_tokens: openai_response.usage.completion_tokens,
            total_tokens: openai_response.usage.total_tokens,
            model: "gpt-4o-mini".to_string(),
            provider: "openai".to_string(),
        };

        Ok((topics, usage))
    }
}
