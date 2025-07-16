use aws_config::BehaviorVersion;
use aws_sdk_s3::{Client, config::Credentials};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct S3Config {
    pub access_key_id: String,
    pub secret_access_key: String,
    pub region: String,
    pub bucket_name: String,
    pub endpoint_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3File {
    pub key: String,
    pub size: i64,
    pub last_modified: String,
    pub storage_class: Option<String>,
}

pub struct S3Manager {
    client: Option<Client>,
    config: Option<S3Config>,
}

impl S3Manager {
    pub fn new() -> Self {
        Self {
            client: None,
            config: None,
        }
    }

    pub async fn connect(&mut self, config: S3Config) -> Result<(), String> {
        let mut sdk_config_builder = aws_config::defaults(BehaviorVersion::latest())
            .region(aws_config::Region::new(config.region.clone()))
            .credentials_provider(
                Credentials::new(
                    &config.access_key_id,
                    &config.secret_access_key,
                    None,
                    None,
                    "s3-vault",
                )
            );

        // Add custom endpoint if provided (for Linode, DigitalOcean, etc.)
        if let Some(endpoint) = &config.endpoint_url {
            sdk_config_builder = sdk_config_builder.endpoint_url(endpoint);
        }

        let sdk_config = sdk_config_builder.load().await;

        self.client = Some(Client::new(&sdk_config));
        self.config = Some(config);
        Ok(())
    }

    pub async fn list_files(&self, prefix: Option<String>) -> Result<Vec<S3File>, String> {
        let client = self.client.as_ref().ok_or("Not connected to S3")?;
        let config = self.config.as_ref().ok_or("No configuration")?;

        let mut request = client
            .list_objects_v2()
            .bucket(&config.bucket_name)
            .max_keys(1000);

        if let Some(p) = prefix {
            request = request.prefix(p);
        }

        let resp = request.send().await.map_err(|e| e.to_string())?;

        let files = resp
            .contents()
            .iter()
            .filter_map(|obj| {
                Some(S3File {
                    key: obj.key()?.to_string(),
                    size: obj.size()?,
                    last_modified: obj.last_modified()?.to_string(),
                    storage_class: obj.storage_class().map(|s| s.as_str().to_string()),
                })
            })
            .collect();

        Ok(files)
    }

    pub async fn download_file(&self, key: &str) -> Result<Vec<u8>, String> {
        let client = self.client.as_ref().ok_or("Not connected to S3")?;
        let config = self.config.as_ref().ok_or("No configuration")?;

        let resp = client
            .get_object()
            .bucket(&config.bucket_name)
            .key(key)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let data = resp.body.collect().await.map_err(|e| e.to_string())?;
        Ok(data.to_vec())
    }

    pub async fn upload_file(&self, key: &str, data: Vec<u8>) -> Result<(), String> {
        let client = self.client.as_ref().ok_or("Not connected to S3")?;
        let config = self.config.as_ref().ok_or("No configuration")?;

        client
            .put_object()
            .bucket(&config.bucket_name)
            .key(key)
            .body(data.into())
            .send()
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub async fn delete_file(&self, key: &str) -> Result<(), String> {
        let client = self.client.as_ref().ok_or("Not connected to S3")?;
        let config = self.config.as_ref().ok_or("No configuration")?;

        client
            .delete_object()
            .bucket(&config.bucket_name)
            .key(key)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}

pub type SharedS3Manager = Arc<Mutex<S3Manager>>;