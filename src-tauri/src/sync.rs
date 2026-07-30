use chrono::Utc;
use serde_json;
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

use crate::models::*;

pub struct SyncEngine {
    queue_path: PathBuf,
}

impl SyncEngine {
    pub fn new(queue_path: PathBuf) -> Result<Self, String> {
        Ok(Self { queue_path })
    }

    pub fn enqueue(&self, entity: &str, action: &str, payload: &impl serde::Serialize) -> Result<(), String> {
        let mut queue = self.load_queue();
        let item = SyncQueueItem {
            id: Uuid::new_v4().to_string(),
            entity: entity.to_string(),
            action: action.to_string(),
            payload: serde_json::to_value(payload).map_err(|e| e.to_string())?,
            created_at: Utc::now().to_rfc3339(),
        };
        queue.push(item);
        self.save_queue(&queue);
        Ok(())
    }

    pub async fn sync_all(&self, api_url: &str, token: &str) -> Result<SyncResult, String> {
        let queue = self.load_queue();
        if queue.is_empty() {
            return Ok(SyncResult {
                pushed: 0,
                pulled: 0,
                errors: vec![],
            });
        }

        let client = reqwest::Client::new();
        let mut errors = Vec::new();
        let mut pushed = 0;

        for item in &queue {
            let url = format!(
                "{}/api/{}/sincronizar",
                api_url.trim_end_matches('/'),
                item.entity
            );
            let body = serde_json::json!({
                "action": item.action,
                "payload": item.payload,
                "sync_id": item.id,
            });

            match client
                .post(&url)
                .header("Authorization", format!("Bearer {}", token))
                .json(&body)
                .send()
                .await
            {
                Ok(resp) if resp.status().is_success() => {
                    pushed += 1;
                }
                Ok(resp) => {
                    let status = resp.status();
                    let text = resp.text().await.unwrap_or_default();
                    errors.push(format!("{} {}: HTTP {} - {}", item.entity, item.action, status, text));
                }
                Err(e) => {
                    errors.push(format!("{} {}: {}", item.entity, item.action, e));
                }
            }
        }

        // Clear queue if no errors (or partial success)
        if errors.is_empty() || pushed > 0 {
            // Remove successfully pushed items
            let remaining: Vec<SyncQueueItem> = queue
                .into_iter()
                .filter(|item| {
                    // Check if this specific item had an error
                    errors.iter().any(|e| e.contains(&item.id))
                })
                .collect();
            self.save_queue(&remaining);
        }

        Ok(SyncResult {
            pushed,
            pulled: 0,
            errors,
        })
    }

    fn load_queue(&self) -> Vec<SyncQueueItem> {
        if !self.queue_path.exists() {
            return vec![];
        }
        let content = fs::read_to_string(&self.queue_path).unwrap_or_else(|_| "[]".into());
        serde_json::from_str(&content).unwrap_or_default()
    }

    fn save_queue(&self, queue: &[SyncQueueItem]) {
        let content = serde_json::to_string_pretty(queue).unwrap_or_else(|_| "[]".into());
        fs::write(&self.queue_path, content).ok();
    }

    #[allow(dead_code)]
    pub fn queue_size(&self) -> usize {
        self.load_queue().len()
    }
}
