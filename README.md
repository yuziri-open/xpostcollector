# 𝕏 Post Collector

<p align="center">
  <img src="icons/icon-128.png" alt="X Post Collector" width="80" />
</p>

<p align="center">
  <b>Auto-collect X/Twitter posts by keyword → local-first storage → OpenClaw AI intelligence</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/chrome-extension-blue?logo=googlechrome&logoColor=white" />
  <img src="https://img.shields.io/badge/manifest-v3-green" />
  <img src="https://img.shields.io/badge/OpenClaw-integrated-orange?logo=data:image/svg+xml;base64," />
  <img src="https://img.shields.io/badge/license-MIT-lightgrey" />
</p>

---

## What It Does

1. **🏷️ Keyword Collection** — Chrome extension auto-captures X posts matching your keywords as you scroll
2. **📦 Local-First Storage** — Posts saved to daily JSON files (`data/YYYY-MM-DD.json`), never sent to any third party
3. **🔍 Web Viewer** — Browse, search, and filter collected posts at `localhost:3050`
4. **🦞 Send to OpenClaw** — Flag any post to send it to OpenClaw for analysis
5. **🧠 Daily Intelligence** — Cron job analyzes collected posts at 4:00 AM and proposes 3 improvements to your OpenClaw setup

## Architecture

```
┌──────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Chrome Extension     │────▶│  Local Server (:3050) │────▶│  OpenClaw Cron       │
│  (content.js)         │     │  (server.js)          │     │  (4:00 AM daily)     │
│                       │     │                       │     │                      │
│  • Keyword matching   │     │  • Daily JSON files   │     │  • Read yesterday's  │
│  • Real-time capture  │     │  • URL dedup index    │     │    posts + inbox     │
│  • Batch send         │     │  • Trending keywords  │     │  • Analyze signals   │
│  • Popup UI           │     │  • Web viewer UI      │     │  • Propose 3 ideas   │
│                       │     │  • OpenClaw inbox     │     │  • Post to Discord   │
└──────────────────────┘     └──────────────────────┘     │  • Save to Brain     │
                                                           └─────────────────────┘
```

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yuziri-open/xpostcollector.git
cd xpostcollector
npm install --production
```

### 2. Load Chrome Extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this folder
4. Pin the extension in toolbar

### 3. Start Local Server

```bash
npm start
# → http://localhost:3050
```

### 4. Setup OpenClaw Cron (Optional)

**Linux/macOS:**
```bash
bash setup.sh
```

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

**Manual registration:**
```bash
openclaw cron add \
  --name "XPost-Intelligence-0400" \
  --cron "0 4 * * *" \
  --tz "Asia/Tokyo" \
  --message "$(cat cron-prompt.md)" \
  --announce \
  --timeout-seconds 300 \
  --thinking medium
```

This registers a daily cron job at 4:00 AM (your timezone) that:
- Reads yesterday's collected posts
- Prioritizes posts you flagged via "Send to OpenClaw"
- Analyzes trends, new tools, workflow patterns, and pain points
- Proposes **3 concrete improvements** to your OpenClaw setup
- Delivers proposals to Discord and saves them to Brain

## Features

### 🏷️ Keyword Collection

Posts **must contain at least one** filter keyword to be collected. Case-insensitive.

| Preset | Keywords |
|--------|----------|
| 🤖 AI / LLM | ai, llm, gpt, claude, chatgpt, gemini, openai, anthropic, copilot, cursor, agent, agi, sora, midjourney, stable diffusion, devin, vibe coding |
| 💻 Dev Tools | react, nextjs, typescript, rust, golang, docker, kubernetes, github, vercel, supabase, tailwind, shadcn, vscode |
| 🪙 Crypto | bitcoin, ethereum, web3, nft, defi, solana, crypto, blockchain, token |
| 🎨 Design | figma, design, ui/ux, typography, branding, illustration, motion, framer |
| 📈 Marketing | seo, growth, analytics, conversion, funnel, content marketing, social media, ads |

### ⭐ Highlight Keywords

Mark certain keywords as high-priority. Matching posts are flagged with `highlighted: true` and visually marked in the viewer.

### 🔄 Global Deduplication

Posts are deduplicated across **all days** using a URL index (`data/.url-index.json`). Same post seen twice? Only stored once.

### 🔥 Trending Keywords

The viewer automatically extracts frequently-appearing keywords from today's posts and displays them as clickable filter chips.

### 🦞 Send to OpenClaw

Click the "Send to OpenClaw" button on any post to save it to `data/openclaw-inbox/` as a Markdown file. The daily cron job **prioritizes these flagged posts** when generating improvement proposals.

### 📊 Daily Intelligence Cron

The `XPost-Intelligence-0400` cron job runs at 4:00 AM daily and:

1. **Reads** yesterday's `data/YYYY-MM-DD.json` + `data/openclaw-inbox/*.md`
2. **Extracts** signals: new tools, workflow patterns, pain points, emerging techniques
3. **Translates** each signal into a native OpenClaw capability (never "install X" — always "build X within OpenClaw")
4. **Proposes** 3 actionable improvements (1–4 hours each)
5. **Delivers** to Discord + saves to Brain as `jack-proposal`

## Data Storage

```
data/
├── 2024-03-26.json          # Daily collected posts
├── 2024-03-25.json
├── .url-index.json           # Global dedup index
└── openclaw-inbox/           # Posts flagged for OpenClaw
    ├── 2024-03-26T12-30-00.md
    └── ...
```

All data stays local. Nothing is sent to external services.

## API Endpoints

```bash
# Get today's posts
curl localhost:3050/api/posts

# Get all posts
curl localhost:3050/api/posts?date=all

# Get specific day
curl localhost:3050/api/posts?date=2024-03-26

# Search
curl localhost:3050/api/posts?q=claude

# Trending keywords
curl localhost:3050/api/keywords

# Stats
curl localhost:3050/api/stats

# Send post to OpenClaw inbox
curl -X POST localhost:3050/api/send-to-openclaw \
  -H "Content-Type: application/json" \
  -d '{"post": {"text": "...", "url": "...", "handle": "@user"}}'
```

## Privacy

- ✅ All data stored locally — never sent to third parties
- ✅ No analytics, no tracking, no telemetry
- ✅ Extension only runs on x.com
- ✅ Minimal permissions (storage + activeTab)
- ✅ `data/` is gitignored — your collected posts never leak to the repo

## License

MIT
