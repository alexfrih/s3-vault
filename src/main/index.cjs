const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, HeadObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const Store = require('electron-store');
const fs = require('fs').promises;
const crypto = require('crypto');
const { autoUpdater } = require('electron-updater');
const archiver = require('archiver');
const os = require('os');

const store = new Store();
let mainWindow;
let s3Client = null;

const isDev = !app.isPackaged;

// Enable live reload for Electron in development
if (isDev) {
  require('electron-reload')(path.join(__dirname, '..', '..'), {
    electron: path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev
    },
    icon: path.join(__dirname, '../public/icons/icon.png')
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the app's resources
    const indexPath = path.join(__dirname, '../../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  // Disable security warnings in development
  if (isDev) {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
  }
}

// Configure auto-updater
autoUpdater.autoDownload = false; // We'll ask the user first
autoUpdater.autoInstallOnAppQuit = true;

// Set the feed URL explicitly (optional, but helps with debugging)
if (!isDev) {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'alexfrih',
    repo: 'v0lt'
  });
}

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  // Send to renderer
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
  
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available. Would you like to download it now?`,
    detail: 'The update will be installed automatically when you quit the app.',
    buttons: ['Download', 'Later'],
    defaultId: 0,
    cancelId: 1
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('Update not available');
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'No Updates Available',
    message: 'You have the latest version!',
    detail: `You are running v0lt version ${app.getVersion()}, which is the latest version available.`,
    buttons: ['OK']
  });
});

autoUpdater.on('error', (err) => {
  console.error('Error in auto-updater:', err);
  dialog.showMessageBox(mainWindow, {
    type: 'error',
    title: 'Update Error',
    message: 'Error checking for updates',
    detail: err.message || 'An unknown error occurred while checking for updates.',
    buttons: ['OK']
  });
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  console.log(log_message);
});

autoUpdater.on('update-downloaded', () => {
  // Send to renderer
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
  
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded. The application will update on restart.',
    detail: 'Would you like to restart now?',
    buttons: ['Restart', 'Later'],
    defaultId: 0,
    cancelId: 1
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'v0lt',
      submenu: [
        {
          label: 'About v0lt',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About v0lt',
              message: 'v0lt',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}`,
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Checking for Updates',
              message: 'Checking for updates...',
              detail: 'Please wait while we check for new versions.',
              buttons: []
            });
            autoUpdater.checkForUpdatesAndNotify();
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ];

  if (process.platform === 'darwin') {
    template[0].submenu.unshift({ role: 'about' });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();
  createMenu();

  // Check for updates after window is created
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

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

// Rename file
ipcMain.handle('rename-file', async (event, { bucket, oldKey, newKey }) => {
  if (!s3Client) {
    throw new Error('Not connected to S3');
  }

  try {
    // Copy to new location
    await s3Client.send(new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${oldKey}`,
      Key: newKey
    }));
    
    // Delete old file
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: oldKey
    }));
    
    return { success: true };
  } catch (error) {
    console.error('Rename file error:', error);
    throw error;
  }
});

// Rename folder
ipcMain.handle('rename-folder', async (event, { bucket, oldPrefix, newPrefix }) => {
  if (!s3Client) {
    throw new Error('Not connected to S3');
  }

  try {
    // List all objects in the folder
    let continuationToken = null;
    let renamedCount = 0;
    
    do {
      const listParams = {
        Bucket: bucket,
        Prefix: oldPrefix,
        ContinuationToken: continuationToken
      };
      
      const response = await s3Client.send(new ListObjectsV2Command(listParams));
      
      if (response.Contents) {
        // Rename each object
        for (const object of response.Contents) {
          const newKey = object.Key.replace(oldPrefix, newPrefix);
          
          // Copy to new location
          await s3Client.send(new CopyObjectCommand({
            Bucket: bucket,
            CopySource: `${bucket}/${object.Key}`,
            Key: newKey
          }));
          
          // Delete old object
          await s3Client.send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: object.Key
          }));
          
          renamedCount++;
        }
      }
      
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
    
    return { success: true, renamedCount };
  } catch (error) {
    console.error('Rename folder error:', error);
    throw error;
  }
});

// Download folder as ZIP
ipcMain.handle('download-folder', async (event, { bucket, prefix, folderName }) => {
  if (!s3Client) {
    throw new Error('Not connected to S3');
  }

  try {
    // Create temporary zip file
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'v0lt-'));
    const zipPath = path.join(tempDir, `${folderName}.zip`);
    
    // Create zip archive
    const output = require('fs').createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Handle archive errors
    archive.on('error', (err) => {
      throw err;
    });
    
    // Pipe archive data to the file
    archive.pipe(output);
    
    // List all objects in the folder
    let continuationToken = null;
    let fileCount = 0;
    
    do {
      const listParams = {
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken
      };
      
      const response = await s3Client.send(new ListObjectsV2Command(listParams));
      
      if (response.Contents) {
        // Download and add each file to the archive
        for (const object of response.Contents) {
          // Skip if it's just the folder marker
          if (object.Key === prefix || object.Key.endsWith('/')) {
            continue;
          }
          
          // Get the file
          const getObjectCommand = new GetObjectCommand({
            Bucket: bucket,
            Key: object.Key
          });
          
          const { Body } = await s3Client.send(getObjectCommand);
          
          // Convert stream to buffer
          const chunks = [];
          for await (const chunk of Body) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);
          
          // Add to archive with relative path
          const relativePath = object.Key.substring(prefix.length);
          archive.append(buffer, { name: relativePath });
          fileCount++;
        }
      }
      
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
    
    // Finalize the archive
    await archive.finalize();
    
    // Wait for the output stream to finish
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
    });
    
    // Read the zip file
    const zipBuffer = await fs.readFile(zipPath);
    
    // Clean up temp file
    await fs.unlink(zipPath);
    await fs.rmdir(tempDir);
    
    return {
      success: true,
      data: zipBuffer.toString('base64'),
      fileName: `${folderName}.zip`,
      fileCount
    };
  } catch (error) {
    console.error('Download folder error:', error);
    throw error;
  }
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