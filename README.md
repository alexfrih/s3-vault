# v0lt

<div align="center">
  <img src="public/picto.svg" alt="v0lt" width="128" height="128">
  
  **A modern, cross-platform S3 file manager built with Electron**
  
  [![GitHub Release](https://img.shields.io/github/v/release/alexfrih/v0lt)](https://github.com/alexfrih/v0lt/releases)
  [![License](https://img.shields.io/github/license/alexfrih/v0lt)](LICENSE)
  [![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/alexfrih/v0lt/releases)
</div>

## ✨ Features

- 🗂️ **File Management** - Browse, upload, download, rename, and delete files and folders
- 📁 **Folder Operations** - Create folders, download folders as ZIP archives
- 🔄 **Auto-sync** - Real-time file list refresh
- 🎨 **Modern UI** - Clean, minimalist interface with zinc monochrome theme
- 🚀 **Fast & Lightweight** - Built with performance in mind
- 🔐 **Secure** - Credentials encrypted locally using system keychain
- 🌐 **S3 Compatible** - Works with AWS S3, MinIO, Backblaze B2, and other S3-compatible services
- 💾 **Auto-updates** - Automatic update notifications and installation
- 🖱️ **Drag & Drop** - Intuitive file uploads with drag and drop support

## 📸 Screenshots

<div align="center">
  <img src="docs/screenshot-main.png" alt="Main Interface" width="600">
</div>

## 🚀 Getting Started

### Download

Download the latest version for your platform from the [releases page](https://github.com/alexfrih/v0lt/releases/latest).

- **macOS**: `.dmg` or `.zip`
- **Windows**: `.exe` installer or `.zip` portable
- **Linux**: `.AppImage`, `.deb`, or `.rpm`

### Quick Start

1. Launch v0lt
2. Enter your S3-compatible storage credentials:
   - **Endpoint URL** (optional for AWS S3)
   - **Access Key ID**
   - **Secret Access Key**
   - **Bucket Name**
3. Click "Connect" to start managing your files!

## 🛠️ Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

### Setup

1. Clone the repository:
```bash
git clone https://github.com/alexfrih/v0lt.git
cd v0lt
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file for releases (optional):
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run electron-dev
```

### Building

Build for your current platform:
```bash
npm run electron-build
```

Build for all platforms (requires appropriate OS):
```bash
# On macOS (builds for macOS)
npm run electron-build

# On Windows (builds for Windows)
npm run electron-build

# On Linux (builds for Linux)
npm run electron-build
```

### Release Process

1. Update version in `package.json`
2. Commit changes
3. Run the release script:
```bash
npm run release
```

This will:
- Build the application
- Create a GitHub release
- Upload artifacts
- Enable auto-updates for users

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Electron + AWS SDK
- **State Management**: React Query
- **UI Components**: Custom components with Lucide icons
- **Build System**: electron-builder
- **Auto-updates**: electron-updater

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Use TypeScript for type safety
- Test on multiple platforms before submitting PR
- Update documentation as needed

## 📋 Roadmap

- [ ] Multiple bucket support
- [ ] File preview (images, videos, documents)
- [ ] Bulk operations
- [ ] Search with advanced filters
- [ ] Transfer queue with progress
- [ ] Dark/Light theme toggle
- [ ] Keyboard shortcuts
- [ ] File versioning support
- [ ] Shared link generation
- [ ] Performance metrics

## 🐛 Known Issues

- File uploads larger than 5GB need to use multipart upload (planned)
- Some S3-compatible services may have compatibility issues

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI components from [Lucide](https://lucide.dev/)
- S3 operations powered by [AWS SDK](https://aws.amazon.com/sdk-for-javascript/)

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/alexfrih/v0lt/issues)
- **Discussions**: [GitHub Discussions](https://github.com/alexfrih/v0lt/discussions)

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/alexfrih">Alexandre Frih</a>
</div>
