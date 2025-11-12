# YouTube Content Prep 🎥

<div align="center">
<img width="1200" height="475" alt="YouTube Content Prep" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

A modern Angular application for YouTube content analysis and download preparation. Built with Angular 20, TypeScript, and Tailwind CSS.

## ✨ Features

- **🎯 Smart Content Analysis**: Analyze single videos, channels, and playlists
- **🤖 AI-Powered Summaries**: Generate download links using Google Gemini AI
- **🔧 yt-dlp Integration**: Generate optimized download commands
- **🔐 Secure API Management**: User-configurable API keys with local storage
- **📱 Responsive Design**: Works on desktop and mobile devices
- **⚡ Real-time Updates**: Live content fetching and analysis
- **🛡️ Error Handling**: Comprehensive error handling with user-friendly messages

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yaskovbs/YouTube-Content-Prep.git
   cd YouTube-Content-Prep
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up API keys**
   - Get a [YouTube Data API v3](https://console.developers.google.com/) key
   - Get a [Google Gemini API](https://makersuite.google.com/app/apikey) key
   - The app will prompt you to enter these keys when you first use it

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:4200`

## 📖 Usage

### Basic Usage
1. Enter your YouTube API key in the designated field
2. Enter your Gemini API key for AI-powered features
3. Paste a YouTube URL (video, channel, or playlist)
4. Click "Fetch" to analyze the content
5. Use the generated summaries and download commands

### API Keys
- **YouTube API Key**: Required for fetching video/channel data
- **Gemini API Key**: Required for AI-powered download link generation
- Keys are stored securely in your browser's local storage

### Download Options
- **In-Browser Download**: Direct download links (limited availability)
- **yt-dlp Commands**: Generate commands for reliable downloads using yt-dlp

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Angular 20 with standalone components
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: Angular Signals

### Project Structure
```
src/
├── components/
│   ├── api-key-input/          # YouTube API key input
│   ├── gemini-api-key-input/   # Gemini API key input
│   └── shared/                 # Reusable components
├── services/
│   ├── youtube.service.ts      # YouTube API integration
│   └── gemini.service.ts       # Gemini AI integration
├── app.component.*             # Main application component
└── safe-url.pipe.ts           # URL sanitization pipe
```

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Code Quality
- ESLint for code linting
- TypeScript strict mode
- Prettier for code formatting

## 🔒 Security

- API keys are stored in browser localStorage
- No server-side storage of sensitive data
- Client-side only application
- CORS-aware API calls

## 📄 License

This project is for educational and personal use only. Please respect YouTube's Terms of Service and copyright laws.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Ensure your API keys are valid
3. Try refreshing the page
4. Check network connectivity

## ⚠️ Disclaimer

This tool is designed for content analysis and educational purposes. Users are responsible for complying with YouTube's Terms of Service and applicable copyright laws when downloading content.
