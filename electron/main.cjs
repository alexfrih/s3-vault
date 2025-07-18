const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const Store = require('electron-store');
const fs = require('fs').promises;
const crypto = require('crypto');

const store = new Store();
let mainWindow;
let s3Client = null;

const isDev = !app.isPackaged;

// Enable live reload for Electron in development
if (isDev) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev
    },
    icon: path.join(__dirname, '../src-tauri/icons/icon.png')
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Disable security warnings in development
  if (isDev) {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

// Connect to S3
ipcMain.handle('connect-s3', async (event, { accessKeyId, secretAccessKey, region, bucket, endpoint }) => {
  try {
    // Auto-detect region from endpoint or use default
    let autoRegion = 'us-east-1';
    
    const config = {
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    };

    if (endpoint) {
      // Extract region from AWS endpoint if possible
      const awsMatch = endpoint.match(/s3[.-]([a-z0-9-]+)\.amazonaws\.com/);
      if (awsMatch) {
        autoRegion = awsMatch[1];
      }
      
      config.endpoint = endpoint;
      config.forcePathStyle = true; // Required for S3-compatible services
      config.region = region || autoRegion;
    } else {
      // No endpoint = use default AWS S3
      config.region = region || 'us-east-1';
    }

    s3Client = new S3Client(config);

    // Test connection
    await s3Client.send(new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: 1
    }));

    // Save credentials
    const encryptedCreds = encrypt(JSON.stringify({
      accessKeyId,
      secretAccessKey,
      region,
      bucket,
      endpoint_url: endpoint
    }));
    
    store.set('s3Credentials', encryptedCreds);

    return { success: true };
  } catch (error) {
    console.error('Connection error:', error);
    return { success: false, error: error.message };
  }
});

// Get saved credentials
ipcMain.handle('get-credentials', async () => {
  try {
    const encryptedCreds = store.get('s3Credentials');
    if (!encryptedCreds) return null;
    
    const decryptedCreds = decrypt(encryptedCreds);
    return JSON.parse(decryptedCreds);
  } catch (error) {
    console.error('Error getting credentials:', error);
    return null;
  }
});

// Clear saved credentials
ipcMain.handle('clear-credentials', async () => {
  store.delete('s3Credentials');
  s3Client = null;
  return { success: true };
});

// List S3 objects
ipcMain.handle('list-objects', async (event, { bucket, prefix = '', continuationToken = null }) => {
  if (!s3Client) {
    throw new Error('Not connected to S3');
  }

  try {
    const params = {
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: '/', // This will group objects by folder
      MaxKeys: 1000
    };
    
    if (continuationToken) {
      params.ContinuationToken = continuationToken;
    }

    const response = await s3Client.send(new ListObjectsV2Command(params));
    
    return {
      objects: response.Contents || [],
      folders: response.CommonPrefixes || [], // Folders will be in CommonPrefixes
      nextContinuationToken: response.NextContinuationToken,
      isTruncated: response.IsTruncated
    };
  } catch (error) {
    console.error('List objects error:', error);
    throw error;
  }
});

// Upload file
ipcMain.handle('upload-file', async (event, { bucket, key, filePath, data }) => {
  if (!s3Client) {
    throw new Error('Not connected to S3');
  }

  try {
    let fileContent;
    
    if (data) {
      // Direct data upload (from drag & drop)
      fileContent = Buffer.from(data);
    } else if (filePath) {
      // File path upload (from file dialog)
      fileContent = await fs.readFile(filePath);
    } else {
      throw new Error('No file data or path provided');
    }
    
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileContent
    }));

    return { success: true };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
});

// Download file
ipcMain.handle('download-file', async (event, { bucket, key }) => {
  if (!s3Client) {
    throw new Error('Not connected to S3');
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return { url: signedUrl };
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
});

// Delete file
ipcMain.handle('delete-file', async (event, { bucket, key }) => {
  if (!s3Client) {
    throw new Error('Not connected to S3');
  }

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    }));

    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
});

// Create folder (S3 doesn't have real folders, so we create a zero-byte object with trailing slash)
ipcMain.handle('create-folder', async (event, { bucket, folderName }) => {
  if (!s3Client) {
    throw new Error('Not connected to S3');
  }

  try {
    const key = folderName.endsWith('/') ? folderName : folderName + '/';
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: ''
    }));

    return { success: true };
  } catch (error) {
    console.error('Create folder error:', error);
    throw error;
  }
});

// Delete folder (delete all objects with the folder prefix)
ipcMain.handle('delete-folder', async (event, { bucket, prefix }) => {
  if (!s3Client) {
    throw new Error('Not connected to S3');
  }

  try {
    // List all objects in the folder
    const listParams = {
      Bucket: bucket,
      Prefix: prefix
    };
    
    const listedObjects = await s3Client.send(new ListObjectsV2Command(listParams));
    
    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      return { success: true };
    }

    // Delete all objects
    const deleteParams = {
      Bucket: bucket,
      Delete: {
        Objects: listedObjects.Contents.map(({ Key }) => ({ Key }))
      }
    };

    await s3Client.send(new DeleteObjectsCommand(deleteParams));
    
    // Handle truncated results
    if (listedObjects.IsTruncated) {
      await ipcMain.handle('delete-folder', event, { bucket, prefix });
    }

    return { success: true };
  } catch (error) {
    console.error('Delete folder error:', error);
    throw error;
  }
});

// Open file dialog
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections']
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths;
});

// Open URL
ipcMain.handle('open-url', async (event, url) => {
  await shell.openExternal(url);
});

// Encryption helpers
const algorithm = 'aes-256-gcm';
const salt = 'salt'; // In production, use a more secure salt

function getKey() {
  return crypto.scryptSync(app.getPath('userData'), salt, 32);
}

function encrypt(text) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    encrypted,
    authTag: authTag.toString('hex'),
    iv: iv.toString('hex')
  });
}

function decrypt(encryptedData) {
  const key = getKey();
  const { encrypted, authTag, iv } = JSON.parse(encryptedData);
  
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}