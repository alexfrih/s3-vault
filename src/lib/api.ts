import { invoke } from "@tauri-apps/api/core";

export interface S3Config {
  access_key_id: string;
  secret_access_key: string;
  region: string;
  bucket_name: string;
  endpoint_url?: string;
}

export interface S3File {
  key: string;
  size: number;
  last_modified: string;
  storage_class?: string;
}

export interface StoredCredentials {
  access_key_id: string;
  secret_access_key: string;
  region: string;
  bucket_name: string;
  endpoint_url?: string;
}

export const api = {
  async connect(config: S3Config): Promise<void> {
    return invoke("connect_s3", { config });
  },

  async listFiles(prefix?: string): Promise<S3File[]> {
    return invoke("list_files", { prefix });
  },

  async downloadFile(key: string): Promise<Uint8Array> {
    const data = await invoke<number[]>("download_file", { key });
    return new Uint8Array(data);
  },

  async uploadFile(key: string, data: Uint8Array): Promise<void> {
    return invoke("upload_file", { key, data: Array.from(data) });
  },

  async deleteFile(key: string): Promise<void> {
    return invoke("delete_file", { key });
  },

  async loadSavedCredentials(): Promise<StoredCredentials | null> {
    return invoke("load_saved_credentials");
  },

  async clearCredentials(): Promise<void> {
    return invoke("clear_credentials");
  },

  async autoConnect(): Promise<boolean> {
    return invoke("auto_connect");
  },
};