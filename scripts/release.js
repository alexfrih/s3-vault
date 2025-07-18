#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found. Please create one from .env.example');
  console.error('   cp .env.example .env');
  console.error('   Then add your GitHub token and certificates');
  process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: envPath });

// Check required environment variables
if (!process.env.GH_TOKEN) {
  console.error('❌ GH_TOKEN not found in .env file');
  console.error('   Please add your GitHub personal access token');
  console.error('   Create one at: https://github.com/settings/tokens');
  console.error('   Required scope: repo');
  process.exit(1);
}

console.log('🚀 Starting release process...\n');

// Build the app
console.log('📦 Building application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Build and publish
console.log('\n📤 Building and publishing to GitHub...');
console.log('   This will create distributables and draft a GitHub release\n');

try {
  // For macOS: Build, sign (if certs available), and publish
  if (process.platform === 'darwin') {
    if (process.env.CSC_LINK && process.env.CSC_KEY_PASSWORD) {
      console.log('✅ Code signing certificate found');
    } else {
      console.log('⚠️  No code signing certificate found');
      console.log('   The app will be built unsigned (development only)');
    }
  }

  // Build and publish
  execSync('npm run dist -- --publish always', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      // Ensure electron-builder uses the token
      GH_TOKEN: process.env.GH_TOKEN
    }
  });

  console.log('\n✅ Release process completed!');
  console.log('   Check your GitHub repository releases page');
  console.log('   The release is created as a draft - edit and publish it manually');
} catch (error) {
  console.error('\n❌ Release failed');
  console.error('   Check the error messages above');
  process.exit(1);
}