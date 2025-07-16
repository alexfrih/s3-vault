mod credentials;
mod s3;

use s3::{S3Config, S3File, S3Manager, SharedS3Manager};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
async fn connect_s3(
    config: S3Config,
    s3_manager: State<'_, SharedS3Manager>,
) -> Result<(), String> {
    let mut manager = s3_manager.lock().await;
    manager.connect(config.clone()).await?;
    
    let stored_creds = credentials::StoredCredentials {
        access_key_id: config.access_key_id,
        secret_access_key: config.secret_access_key,
        region: config.region,
        bucket_name: config.bucket_name,
        endpoint_url: config.endpoint_url,
    };
    credentials::save_credentials(&stored_creds)?;
    
    Ok(())
}

#[tauri::command]
async fn list_files(
    prefix: Option<String>,
    s3_manager: State<'_, SharedS3Manager>,
) -> Result<Vec<S3File>, String> {
    let manager = s3_manager.lock().await;
    manager.list_files(prefix).await
}

#[tauri::command]
async fn download_file(
    key: String,
    s3_manager: State<'_, SharedS3Manager>,
) -> Result<Vec<u8>, String> {
    let manager = s3_manager.lock().await;
    manager.download_file(&key).await
}

#[tauri::command]
async fn upload_file(
    key: String,
    data: Vec<u8>,
    s3_manager: State<'_, SharedS3Manager>,
) -> Result<(), String> {
    let manager = s3_manager.lock().await;
    manager.upload_file(&key, data).await
}

#[tauri::command]
async fn delete_file(
    key: String,
    s3_manager: State<'_, SharedS3Manager>,
) -> Result<(), String> {
    let manager = s3_manager.lock().await;
    manager.delete_file(&key).await
}

#[tauri::command]
async fn load_saved_credentials() -> Result<Option<credentials::StoredCredentials>, String> {
    credentials::load_credentials()
}

#[tauri::command]
async fn clear_credentials() -> Result<(), String> {
    credentials::delete_credentials()
}

#[tauri::command]
async fn auto_connect(s3_manager: State<'_, SharedS3Manager>) -> Result<bool, String> {
    if let Some(creds) = credentials::load_credentials()? {
        let config = S3Config {
            access_key_id: creds.access_key_id,
            secret_access_key: creds.secret_access_key,
            region: creds.region,
            bucket_name: creds.bucket_name,
            endpoint_url: creds.endpoint_url,
        };
        
        let mut manager = s3_manager.lock().await;
        manager.connect(config).await?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let s3_manager: SharedS3Manager = Arc::new(Mutex::new(S3Manager::new()));
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(s3_manager)
        .invoke_handler(tauri::generate_handler![
            connect_s3,
            list_files,
            download_file,
            upload_file,
            delete_file,
            load_saved_credentials,
            clear_credentials,
            auto_connect
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
