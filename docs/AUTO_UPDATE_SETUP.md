# Auto-Update Setup Guide

This guide explains how to set up auto-updates for picto.svg.

## Prerequisites

1. **GitHub Personal Access Token**
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Give it a name like "picto.svg Release"
   - Select the `repo` scope
   - Generate and copy the token

2. **Code Signing Certificates** (Optional but recommended)
   - **macOS**: Apple Developer Certificate
   - **Windows**: Code signing certificate (.pfx)

## Setup Steps

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` and add:

```bash
# Required for auto-update
GH_TOKEN=your_github_personal_access_token_here

# Optional: macOS code signing
CSC_LINK=/path/to/your/certificate.p12
CSC_KEY_PASSWORD=your_certificate_password

# Optional: Apple notarization (for macOS App Store)
APPLE_ID=your@apple.id
APPLE_ID_PASSWORD=app-specific-password
APPLE_TEAM_ID=your_team_id
```

### 3. Release Process

#### Automatic Release (Recommended)

```bash
npm run release
```

This will:
- Build the app
- Sign it (if certificates are configured)
- Create distributables
- Draft a GitHub release
- Upload artifacts

#### Manual Release

1. Update version in `package.json`
2. Build: `npm run electron-build`
3. Create GitHub release manually
4. Upload built files from `dist-electron/`

## How Auto-Update Works

1. **Check on Startup**: The app checks for updates when launched
2. **Manual Check**: Users can check via menu: picto.svg → Check for Updates
3. **Download**: Users are prompted to download available updates
4. **Install**: Updates install automatically on app restart

## Distributing Updates

1. Increment version in `package.json`
2. Run `npm run release`
3. Go to GitHub releases page
4. Edit the draft release
5. Add release notes
6. Publish the release

Users will automatically be notified of the update!

## Testing Updates

1. Build version 1.0.0
2. Install it
3. Increment to 1.0.1 in package.json
4. Run `npm run release`
5. Publish the release
6. Open the 1.0.0 app - it should detect the update

## Troubleshooting

### "Cannot find module 'dotenv'"
```bash
npm install --save-dev dotenv
```

### "GitHub token not found"
Make sure your `.env` file contains:
```
GH_TOKEN=your_actual_token_here
```

### Updates not detected
- Ensure the version in package.json is higher than installed version
- Check that the GitHub release is published (not draft)
- Look for errors in the console (View → Toggle Developer Tools)

### Code signing warnings
- Without certificates, the app will show security warnings
- This is normal for development
- For production, you need proper certificates

## Security Notes

- Never commit `.env` or certificates to git
- Use environment variables in CI/CD
- Rotate tokens regularly
- Keep certificates secure