# picto.svg

A modern, cross-platform desktop app for managing S3-compatible object storage.

## Features

- 🔐 Secure credential storage with encryption
- 📁 Browse files and folders with navigation
- 📂 Create, delete, and navigate folders
- ⬆️ Upload files via drag-and-drop or file picker
- ⬇️ Download files directly
- 🗑️ Delete files and folders
- 🔍 Search files and folders
- 🔄 Automatic updates
- 🎨 Clean, modern UI with toast notifications
- 🚀 Works with any S3-compatible storage (AWS S3, Linode, DigitalOcean, MinIO, etc.)
- 💻 Cross-platform (Windows, macOS, Linux)

## Installation

Download the latest release for your platform from the [Releases](https://github.com/alexfrih/v0lt/releases) page.

## Building from Source

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- npm or yarn package manager

### Build

```bash
# Clone the repository
git clone https://github.com/alexfrih/v0lt.git
cd v0lt

# Install dependencies
npm install

# Run in development
npm run electron-dev

# Build for production
npm run electron-build
```

## Usage

1. Launch picto.svg
2. Enter your S3-compatible storage credentials:
   - **Endpoint URL**: Your S3 endpoint (e.g., `https://s3.amazonaws.com` or `https://us-east-1.linodeobjects.com`)
   - **Access Key ID**: Your access key
   - **Secret Access Key**: Your secret key
   - **Region**: The region code (e.g., `us-east-1`)
   - **Bucket Name**: Your bucket name
3. Click "Connect"

Your credentials are stored securely in your system's keychain/credential manager.

## Development

The app uses:
- [Electron](https://www.electronjs.org/) - Cross-platform desktop app framework
- [React](https://react.dev/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [AWS SDK for JavaScript](https://aws.amazon.com/sdk-for-javascript/) - S3 operations

## License

MIT
