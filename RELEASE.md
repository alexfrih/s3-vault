# Release Process Documentation

This document describes the release process for v0lt.

## Prerequisites

Before creating a release, ensure you have:

1. **Environment Setup**
   - Node.js and npm installed
   - All dependencies installed (`npm install`)
   - `.env` file configured with required tokens

2. **Required Environment Variables**
   Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `GITHUB_TOKEN`: Personal Access Token with `repo` scope
     - Create at: https://github.com/settings/tokens
     - Required for publishing releases to GitHub
   
   Optional (for macOS code signing):
   - `CSC_NAME`: Code signing certificate name
   - Other certificate-related variables as needed

3. **Clean Git State**
   - All changes must be committed
   - Working directory must be clean
   - You must be on the `main` branch

## Automated Release Process (Recommended)

The project includes an intelligent release script that handles the entire process:

```bash
npm run release
```

This script will:

1. **Verify Prerequisites**
   - Check for `.env` file and required tokens
   - Verify git working directory is clean

2. **Version Management**
   - Display current version
   - Check if current version is already tagged
   - Prompt for new version (must be higher than current)
   - Validate semantic versioning format (e.g., 1.0.0)

3. **Build and Test**
   - Update version in `package.json`
   - Build the application (`npm run build`)

4. **Git Operations**
   - Commit version change
   - Create git tag (e.g., `v0.1.12`)
   - Push commits and tags to remote

5. **Publish Release**
   - Build distributables for current platform
   - Sign the application (if certificates available)
   - Create GitHub release draft
   - Upload build artifacts

## Manual Release Process

If you need to create a release manually:

### 1. Update Version
```bash
# Edit package.json to update version
# Then commit the change
git add package.json
git commit -m "chore: bump version to X.Y.Z"
```

### 2. Create Git Tag
```bash
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z
```

### 3. Build and Publish
```bash
# Export GitHub token for electron-builder
export GH_TOKEN=$(grep GITHUB_TOKEN .env | cut -d '=' -f2)

# Build and publish to GitHub
npm run dist -- --publish always
```

## Build Artifacts

The build process creates:

- **macOS**:
  - `.dmg` installer
  - `.zip` archive
  - Block map files for delta updates

- **Windows** (when built on Windows):
  - `.exe` installer
  - Block map files

- **Linux** (when built on Linux):
  - AppImage or other configured formats

## Release Configuration

Release settings are configured in `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "alexfrih",
      "repo": "v0lt",
      "releaseType": "release"
    }
  }
}
```

## Troubleshooting

### "GitHub Personal Access Token is not set"
- Ensure `GITHUB_TOKEN` is in your `.env` file
- For manual releases, export as `GH_TOKEN`:
  ```bash
  export GH_TOKEN=$GITHUB_TOKEN
  ```

### "Git working directory is not clean"
- Commit or stash all changes before releasing
- Check status with `git status`

### "Version already tagged"
- The release script will detect this and ask if you want to create a new version
- For manual process, ensure you're using a new version number

### Release Not Appearing on GitHub
- Check that the tag was pushed: `git ls-remote --tags origin`
- Verify the GitHub token has `repo` scope
- Check electron-builder output for upload errors

### Code Signing Issues (macOS)
- If `CSC_NAME` is not set, the app will be built unsigned
- Unsigned apps will show security warnings on distribution
- For production releases, proper code signing is recommended

## Post-Release

After a successful release:

1. The release will appear as a draft on GitHub
2. Edit the release notes on GitHub to add:
   - What's changed
   - New features
   - Bug fixes
   - Breaking changes (if any)
3. Publish the release (change from draft to published)
4. Auto-update will pick up the new version for existing users

## Notes

- The release process automatically handles platform-specific builds
- Each platform (macOS, Windows, Linux) should ideally be built on its native OS
- The `electron-builder` configuration in `package.json` controls build behavior
- Version numbers must follow semantic versioning (MAJOR.MINOR.PATCH)