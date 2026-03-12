use anyhow::{anyhow, Result};
use chrono::{DateTime, Local, Utc};
use reqwest::Client;
use serde::Deserialize;

const EXCHANGE_API_URL: &str = "https://api.exchangerate-api.com/v4/latest/USD";

#[derive(Deserialize)]
struct ExchangeRateResponse {
    rates: Rates,
}

#[derive(Deserialize)]
struct Rates {
    #[serde(rename = "JPY")]
    jpy: f64,
}

pub struct ExchangeRateClient {
    client: Client,
    cached_rate: Option<(f64, DateTime<Utc>)>,
}

impl ExchangeRateClient {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            cached_rate: None,
        }
    }

    pub async fn get_usd_to_jpy(&mut self) -> Result<f64> {
        if let Some((rate, updated_at)) = &self.cached_rate {
            let hours_since_update = (Utc::now() - *updated_at).num_hours();
            if hours_since_update < 24 {
                return Ok(*rate);
            }
        }

        let response = self
            .client
            .get(EXCHANGE_API_URL)
            .send()
            .await?;

        if !response.status().is_success() {
            if let Some((rate, _)) = &self.cached_rate {
                return Ok(*rate);
            }
            return Err(anyhow!("Failed to fetch exchange rate"));
        }

        let data: ExchangeRateResponse = response.json().await?;
        let rate = data.rates.jpy;
        
        self.cached_rate = Some((rate, Utc::now()));
        
        Ok(rate)
    }

    pub fn calculate_cost_jpy(&self, cost_usd: f64, rate: f64) -> f64 {
        (cost_usd * rate * 100.0).round() / 100.0
    }
}

pub fn get_model_pricing(provider: &str, model: &str) -> (f64, f64) {
    match (provider, model) {
        ("openai", "gpt-4o-mini") => (0.00015, 0.0006),
        ("openai", "gpt-4o") => (0.0025, 0.01),
        ("openai", "gpt-4-turbo") => (0.01, 0.03),
        ("claude", "claude-sonnet-4-20250514") => (0.003, 0.015),
        ("claude", "claude-3-5-sonnet-20241022") => (0.003, 0.015),
        ("claude", "claude-3-haiku-20240307") => (0.00025, 0.00125),
        _ => (0.001, 0.002),
    }
}

pub fn calculate_cost_usd(
    provider: &str,
    model: &str,
    prompt_tokens: u32,
    completion_tokens: u32,
) -> f64 {
    let (input_price, output_price) = get_model_pricing(provider, model);
    let input_cost = (prompt_tokens as f64 / 1000.0) * input_price;
    let output_cost = (completion_tokens as f64 / 1000.0) * output_price;
    ((input_cost + output_cost) * 1_000_000.0).round() / 1_000_000.0
}
