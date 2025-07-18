const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // S3 operations
  connectS3: (credentials) => ipcRenderer.invoke('connect-s3', credentials),
  getCredentials: () => ipcRenderer.invoke('get-credentials'),
  clearCredentials: () => ipcRenderer.invoke('clear-credentials'),
  listObjects: (params) => ipcRenderer.invoke('list-objects', params),
  uploadFile: (params) => ipcRenderer.invoke('upload-file', params),
  downloadFile: (params) => ipcRenderer.invoke('download-file', params),
  deleteFile: (params) => ipcRenderer.invoke('delete-file', params),
  createFolder: (params) => ipcRenderer.invoke('create-folder', params),
  deleteFolder: (params) => ipcRenderer.invoke('delete-folder', params),
  downloadFolder: (params) => ipcRenderer.invoke('download-folder', params),
  renameFile: (params) => ipcRenderer.invoke('rename-file', params),
  renameFolder: (params) => ipcRenderer.invoke('rename-folder', params),
  
  // Dialog operations
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  
  // System operations
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  
  // Auto-updater
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', callback);
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', callback);
  }
});