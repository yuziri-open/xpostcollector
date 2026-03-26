#!/usr/bin/env bash
# ─────────────────────────────────────────────
# X Post Collector — Setup Script
# Installs dependencies + registers OpenClaw cron
# ─────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "📦 Installing dependencies..."
npm install --production

echo ""
echo "⏰ Registering OpenClaw cron job (daily 4:00 AM)..."

# Check if openclaw CLI is available
if ! command -v openclaw &>/dev/null; then
  echo "⚠️  openclaw CLI not found. Install it first: npm i -g openclaw"
  echo "   Then run this to register the cron manually:"
  echo ""
  echo "   openclaw cron add \\"
  echo "     --name 'XPost-Intelligence-0400' \\"
  echo "     --cron '0 4 * * *' \\"
  echo "     --tz 'Asia/Tokyo' \\"
  echo "     --message \"$(cat "$SCRIPT_DIR/cron-prompt.md")\" \\"
  echo "     --announce"
  echo ""
  exit 0
fi

# Remove existing job if re-running setup
EXISTING=$(openclaw cron list --json 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 || true)

PROMPT=$(cat "$SCRIPT_DIR/cron-prompt.md")

openclaw cron add \
  --name "XPost-Intelligence-0400" \
  --cron "0 4 * * *" \
  --tz "Asia/Tokyo" \
  --message "$PROMPT" \
  --announce \
  --timeout-seconds 300 \
  --thinking medium

echo ""
echo "✅ Setup complete!"
echo "   📋 Chrome extension: Load unpacked from $SCRIPT_DIR"
echo "   🖥  Local server:    npm start (or node server.js)"
echo "   ⏰ Cron job:         XPost-Intelligence-0400 (daily 4:00 AM JST)"
echo ""
