use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const SERVICE_NAME: &str = "s3-vault";
const CREDENTIALS_KEY: &str = "aws-credentials";
const FALLBACK_FILE: &str = ".s3-vault-creds";

#[derive(Debug, Serialize, Deserialize)]
pub struct StoredCredentials {
    pub access_key_id: String,
    pub secret_access_key: String,
    pub region: String,
    pub bucket_name: String,
    pub endpoint_url: Option<String>,
}

fn get_fallback_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")))
        .join(FALLBACK_FILE)
}

fn save_to_file(creds: &StoredCredentials) -> Result<(), String> {
    let path = get_fallback_path();
    let json = serde_json::to_string(creds).map_err(|e| e.to_string())?;
    
    // Simple XOR encryption for basic obfuscation (not secure, but better than plaintext)
    let key = 0x42u8;
    let encrypted: Vec<u8> = json.bytes().map(|b| b ^ key).collect();
    
    fs::write(&path, encrypted).map_err(|e| e.to_string())?;
    
    // Try to set file permissions to 600 (owner read/write only)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let permissions = fs::Permissions::from_mode(0o600);
        let _ = fs::set_permissions(&path, permissions);
    }
    
    Ok(())
}

fn load_from_file() -> Result<Option<StoredCredentials>, String> {
    let path = get_fallback_path();
    
    if !path.exists() {
        return Ok(None);
    }
    
    let encrypted = fs::read(&path).map_err(|e| e.to_string())?;
    
    // Decrypt
    let key = 0x42u8;
    let decrypted: Vec<u8> = encrypted.iter().map(|&b| b ^ key).collect();
    let json = String::from_utf8(decrypted).map_err(|e| e.to_string())?;
    
    let creds = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(Some(creds))
}

fn delete_file() -> Result<(), String> {
    let path = get_fallback_path();
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn save_credentials(creds: &StoredCredentials) -> Result<(), String> {
    // Try keyring first
    match Entry::new(SERVICE_NAME, CREDENTIALS_KEY) {
        Ok(entry) => {
            let json = serde_json::to_string(creds).map_err(|e| e.to_string())?;
            match entry.set_password(&json) {
                Ok(_) => {
                    // Clean up any fallback file if keyring worked
                    let _ = delete_file();
                    return Ok(());
                }
                Err(e) if e.to_string().contains("org.freedesktop.secrets") => {
                    // Fall back to file storage
                    eprintln!("Keyring unavailable, using file storage");
                    save_to_file(creds)
                }
                Err(e) => Err(e.to_string()),
            }
        }
        Err(_) => {
            // Fall back to file storage
            save_to_file(creds)
        }
    }
}

pub fn load_credentials() -> Result<Option<StoredCredentials>, String> {
    // Try keyring first
    match Entry::new(SERVICE_NAME, CREDENTIALS_KEY) {
        Ok(entry) => match entry.get_password() {
            Ok(json) => {
                let creds = serde_json::from_str(&json).map_err(|e| e.to_string())?;
                Ok(Some(creds))
            }
            Err(keyring::Error::NoEntry) => {
                // Try fallback file
                load_from_file()
            }
            Err(e) if e.to_string().contains("org.freedesktop.secrets") => {
                // Fall back to file storage
                load_from_file()
            }
            Err(e) => Err(e.to_string()),
        },
        Err(_) => {
            // Fall back to file storage
            load_from_file()
        }
    }
}

pub fn delete_credentials() -> Result<(), String> {
    let mut errors = Vec::new();
    
    // Try to delete from keyring
    if let Ok(entry) = Entry::new(SERVICE_NAME, CREDENTIALS_KEY) {
        if let Err(e) = entry.delete_password() {
            if !matches!(e, keyring::Error::NoEntry) && !e.to_string().contains("org.freedesktop.secrets") {
                errors.push(e.to_string());
            }
        }
    }
    
    // Also delete fallback file
    if let Err(e) = delete_file() {
        errors.push(e);
    }
    
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join(", "))
    }
}