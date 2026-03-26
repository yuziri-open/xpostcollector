# 𝕏 Post Collector

<p align="center">
  <img src="icons/icon-128.png" alt="X Post Collector" width="80" />
</p>

<p align="center">
  <b>Auto-collect X/Twitter posts by customizable keywords while you scroll.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/chrome-extension-blue?logo=googlechrome&logoColor=white" />
  <img src="https://img.shields.io/badge/manifest-v3-green" />
  <img src="https://img.shields.io/badge/license-MIT-lightgrey" />
</p>

---

## ✨ Features

- **🏷️ Custom Keywords** — Set your own filter & highlight keywords from the popup UI
- **⚡ Real-time Collection** — Posts are captured as you scroll, zero manual work
- **⭐ Highlight Keywords** — Mark certain keywords as important for priority tracking
- **📦 Quick Presets** — One-click keyword packs (AI/LLM, Dev Tools, Crypto, Design, Marketing)
- **📊 Google Sheets Export** — Sends collected data to Google Sheets via GAS Webhook
- **🔄 Smart Batching** — Groups posts and sends in batches to minimize API calls
- **📋 Live Logs** — See recently collected posts in the popup with engagement metrics

## 📸 Design

Apple-inspired **Liquid Glass** UI — clean white base, frosted glass panels, iOS-style toggle, gradient accents.

## 🚀 Installation

1. Clone this repository:
   ```bash
   git clone git@github.com:yuziri-open/xpostcollector.git
   ```
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the cloned `xpostcollector` folder
6. Pin the extension in the toolbar for easy access

## ⚙️ Setup — Google Sheets Integration

X Post Collector sends collected posts to a Google Spreadsheet via Google Apps Script (GAS). Here's how to set it up:

### Step 1: Create a Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it whatever you like (e.g., "X Post Collection")
3. Add these headers in Row 1:

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Timestamp | Display Name | Handle | Text | URL | Likes | Retweets | Replies | Views | Has Media | Collected At |

### Step 2: Create the GAS Webhook

1. Open [Google Apps Script](https://script.google.com) → **New Project**
2. Delete the default code and paste the entire contents of [`gas-endpoint.js`](gas-endpoint.js)
3. Click **Save** (name the project, e.g., "X Post Collector Endpoint")
4. Link to your spreadsheet:
   - In the script, the code uses `SpreadsheetApp.getActiveSpreadsheet()`
   - To link: go to **Extensions → Apps Script** from your spreadsheet (this auto-links it)
   - **Or** create the script directly from your spreadsheet: Open your spreadsheet → Extensions → Apps Script → paste the code

### Step 3: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ → Select **Web app**
3. Set:
   - **Description**: "X Post Collector Endpoint" (optional)
   - **Execute as**: Me
   - **Who has access**: **Anyone**
4. Click **Deploy**
5. Authorize the app when prompted (click through the "unsafe" warning — it's your own script)
6. **Copy the Web app URL** (looks like `https://script.google.com/macros/s/AKfyc.../exec`)

### Step 4: Configure the Extension

1. Click the X Post Collector icon in Chrome toolbar
2. Go to **⚙️ Settings** tab
3. Paste the Web app URL into the **GAS Webhook URL** field
4. Click **Save Settings**

### Verify It Works

1. Go to **🏷️ Keywords** tab and make sure you have some keywords set
2. Toggle collection **ON** (green switch)
3. Open [x.com](https://x.com) and scroll through your timeline
4. Check your spreadsheet — matching posts should appear!

## 🏷️ How Keywords Work

### Filter Keywords
Posts **must contain at least one** filter keyword to be collected. Matching is case-insensitive.

Example: If you add `ai`, `chatgpt`, `claude` — only posts mentioning these words will be saved.

### Highlight Keywords
A subset of extra-important keywords. Posts matching these are flagged with `highlighted: true` in the collected data.

Use these for topics you absolutely don't want to miss.

### Quick Presets

Click a preset button to bulk-add keywords:

| Preset | Keywords |
|--------|----------|
| 🤖 AI / LLM | ai, llm, gpt, claude, chatgpt, gemini, openai, anthropic, copilot, cursor, agent, agi, sora, midjourney, stable diffusion, devin, vibe coding |
| 💻 Dev Tools | react, nextjs, typescript, rust, golang, docker, kubernetes, github, vercel, supabase, tailwind, shadcn, vscode |
| 🪙 Crypto | bitcoin, ethereum, web3, nft, defi, solana, crypto, blockchain, token |
| 🎨 Design | figma, design, ui/ux, typography, branding, illustration, motion, framer |
| 📈 Marketing | seo, growth, analytics, conversion, funnel, content marketing, social media, ads |

## 📁 Collected Data Format

Each row in Google Sheets contains:

| Column | Field | Description |
|--------|-------|-------------|
| A | Timestamp | When the post was published |
| B | Display Name | Author's display name |
| C | Handle | @username |
| D | Text | Full post content |
| E | URL | Direct link to the post |
| F | Likes | ♡ count |
| G | Retweets | 🔄 count |
| H | Replies | 💬 count |
| I | Views | 👁 count |
| J | Has Media | TRUE/FALSE |
| K | Collected At | When the extension captured it |

## 🔧 GAS API Endpoints

The deployed GAS endpoint also supports reading data:

```bash
# Check if endpoint is alive
curl "YOUR_GAS_URL?action=status"

# Get posts from last 24 hours
curl "YOUR_GAS_URL?action=recent&hours=24"

# Get posts from last 7 days
curl "YOUR_GAS_URL?action=recent&hours=168"
```

## 🔒 Privacy

- ✅ No data is sent to any third-party server
- ✅ All data goes only to **your own** Google Sheets
- ✅ Keywords and settings are stored locally in Chrome
- ✅ The extension only runs on x.com
- ✅ Minimal permissions — only x.com and script.google.com

## 📄 License

MIT

## 🤝 Contributing

Issues and PRs welcome!
