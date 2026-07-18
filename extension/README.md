# ApplyOnce AI – Chrome Extension

A fully working Chrome Extension (Manifest V3) that lets users upload their resume once and auto-fill any job application using Gemini AI.

## Tech Stack

- React 18 + TypeScript
- Vite (multi-entry build)
- Tailwind CSS v3
- Framer Motion
- pdf.js (resume parsing)
- Gemini AI (`@google/generative-ai`)
- chrome.storage.local (no backend)

## Setup

### 1. Add your openrouter API key

Edit `extension/.env`:

```env
VITE_OPENROUTER_API_KEY=your_actual_key_here
```

Get a free key at: https://openrouter.ai/

### 2. Install & Build

```bash
cd extension
npm install
npm run build
```

This creates `extension/dist/` — the loadable extension folder.

### 3. Load in Chrome

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/dist/` folder

## Features

- 📄 **Resume Upload** — PDF parsing with pdf.js, 5MB max
- 🤖 **AI Parsing** — Gemini extracts structured profile from resume text
- 💾 **Local Storage** — Profile saved to `chrome.storage.local` (no server)
- ✏️ **Profile Editor** — View and edit all fields inline
- ⚡ **One-click Autofill** — AI maps profile to any job form
- 🎯 **ATS Support** — Greenhouse, Lever, Ashby, Workable, BambooHR, generic
- 📤 **Export/Import** — JSON profile backup from options page

## Security Note

> **For production:** The Gemini API key is bundled in the extension for this hackathon MVP.
> In production, proxy all AI requests through a backend server.

## Development

```bash
cd extension
npm run dev   # watch mode, rebuilds on changes
```
