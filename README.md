# Universal Video Downloader

A clean, macOS-inspired web application for downloading videos and extracting audio from thousands of websites. Built with React, Tailwind CSS v4, Node.js, and powered by `yt-dlp`.

## Features
- 🎥 Download video or extract audio (MP3)
- ⚡ Real-time download progress via Server-Sent Events (SSE)
- 🎨 Minimalist, high-craft Tokyo Midnight Cyber-Glass UI
- 🚀 Universal compatibility (supports any site `yt-dlp` supports)
- 🔞 18+ Adult Platforms (Pornhub, XVideos, etc.) supported with **Viewer Discretion Advised** consent modal and NSFW thumbnail blur protection (intended strictly for personal demo and testing evaluation)

## Requirements
- [Node.js](https://nodejs.org/)
- `yt-dlp`
- `ffmpeg`

On macOS, you can install the dependencies via Homebrew:
```sh
brew install yt-dlp ffmpeg
```

## Quick Start

1. Start the Backend:
   ```sh
   cd backend
   npm install
   npm run dev
   ```

2. Start the Frontend:
   ```sh
   cd frontend
   npm install
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser.

## License

[MIT](LICENSE) © 2026 Janvher Lucas Sarmiento
