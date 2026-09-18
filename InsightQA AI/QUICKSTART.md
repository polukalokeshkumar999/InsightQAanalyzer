# InsightQA AI - Quick Start Guide

## Prerequisites
- Node.js 18 or higher
- npm (comes with Node.js)

## Installation Steps

### 1. Install Backend Dependencies
```bash
cd "InsightQA AI"
npm install
```

### 2. Install Frontend Dependencies
```bash
cd client
npm install
cd ..
```

Or use the convenience script:
```bash
npm run install-all
```

### 3. Start the Application
```bash
npm run dev
```

This starts both:
- Backend server: http://localhost:3001
- Frontend app: http://localhost:5173

## First Analysis

1. Open http://localhost:5173 in your browser
2. Click "Analyze Story" in the sidebar
3. Paste or select a sample user story
4. Click "Analyze Story" button
5. Explore the results!

## Optional: Enable AI Enhancement

To get AI-powered suggestions (optional):
1. Get an OpenAI API key from https://platform.openai.com
2. Create `.env` file in the root folder
3. Add: `OPENAI_API_KEY=your_key_here`
4. Restart the server

The app works great without OpenAI using our rule-based analysis engine!

## Troubleshooting

### Port already in use
Change the port in `.env`:
```
PORT=3002
```

### Missing dependencies
```bash
npm run install-all
```

### Database issues
Delete `data/insightqa.db` and restart the server.

---

**Questions?** Check the full README.md for detailed documentation.
