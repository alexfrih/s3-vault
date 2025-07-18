#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function checkGitStatus() {
  const status = runCommand('git status --porcelain');
  if (status) {
    console.error('❌ Git working directory is not clean. Please commit or stash changes first:');
    console.error(status);
    process.exit(1);
  }
}

function getCurrentVersion() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function updateVersion(newVersion) {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
}

function isValidVersion(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }
  return 0;
}

async function main() {
  console.log('🚀 Starting intelligent release process...\n');

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
  if (!process.env.GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN not found in .env file');
    console.error('   Please add your GitHub personal access token');
    console.error('   Create one at: https://github.com/settings/tokens');
    console.error('   Required scope: repo');
    process.exit(1);
  }

  // Check git status
  console.log('📋 Checking git status...');
  checkGitStatus();
  console.log('✅ Git working directory is clean\n');

  // Get current version
  const currentVersion = getCurrentVersion();
  console.log(`📦 Current version: ${currentVersion}`);

  // Check if current version is already tagged
  try {
    const tagExists = runCommand(`git tag -l "v${currentVersion}"`);
    if (tagExists) {
      console.log(`⚠️  Version v${currentVersion} is already tagged`);
      
      const answer = await askQuestion('Do you want to create a new version? (y/n): ');
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ Release cancelled');
        process.exit(0);
      }
    }
  } catch (error) {
    // Tag doesn't exist, which is fine
  }

  // Ask for new version
  let newVersion;
  while (true) {
    newVersion = await askQuestion(`Enter new version (current: ${currentVersion}): `);
    
    if (!isValidVersion(newVersion)) {
      console.log('❌ Invalid version format. Please use semantic versioning (e.g., 1.0.0)');
      continue;
    }

    if (compareVersions(newVersion, currentVersion) <= 0) {
      console.log(`❌ New version must be greater than current version (${currentVersion})`);
      continue;
    }

    break;
  }

  // Confirm release
  console.log(`\n📋 Release Summary:`);
  console.log(`   Current version: ${currentVersion}`);
  console.log(`   New version: ${newVersion}`);
  console.log(`   Platform: ${process.platform}`);
  
  const confirm = await askQuestion('\nProceed with release? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ Release cancelled');
    process.exit(0);
  }

  rl.close();

  // Update version in package.json
  console.log('\n📝 Updating version in package.json...');
  updateVersion(newVersion);

  // Build the app
  console.log('📦 Building application...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed');
    process.exit(1);
  }

  // Commit version change
  console.log('\n📝 Committing version change...');
  runCommand('git add package.json');
  runCommand(`git commit -m "chore: bump version to ${newVersion}"`);

  // Create git tag
  console.log(`🏷️  Creating git tag v${newVersion}...`);
  runCommand(`git tag v${newVersion}`);

  // Push changes and tag
  console.log('⬆️  Pushing changes and tag to remote...');
  runCommand('git push origin main');
  runCommand(`git push origin v${newVersion}`);

  // Build and publish
  console.log('\n📤 Building and publishing to GitHub...');
  console.log('   This will create distributables and draft a GitHub release\n');

  try {
    // For macOS: Build, sign (if certs available), and publish
    if (process.platform === 'darwin') {
      if (process.env.CSC_NAME) {
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
        GH_TOKEN: process.env.GITHUB_TOKEN
      }
    });

    console.log('\n✅ Release process completed!');
    console.log(`   Version: ${newVersion}`);
    console.log(`   Git tag: v${newVersion}`);
    console.log('   Check your GitHub repository releases page');
    console.log('   The release is created as a draft - edit and publish it manually');
  } catch (error) {
    console.error('\n❌ Release failed');
    console.error('   Check the error messages above');
    console.error('   Note: Version was already updated and committed');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Release script failed:', error.message);
  process.exit(1);
});