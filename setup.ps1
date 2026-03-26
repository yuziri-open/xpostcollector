# ─────────────────────────────────────────────
# X Post Collector — Setup Script (Windows)
# Installs dependencies + registers OpenClaw cron
# ─────────────────────────────────────────────
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "`n`u{1f4e6} Installing dependencies..." -ForegroundColor Cyan
npm install --production

Write-Host "`n`u{23f0} Registering OpenClaw cron job (daily 4:00 AM)..." -ForegroundColor Cyan

$prompt = Get-Content "$ScriptDir\cron-prompt.md" -Raw -Encoding UTF8

try {
    openclaw cron add `
        --name "XPost-Intelligence-0400" `
        --cron "0 4 * * *" `
        --tz "Asia/Tokyo" `
        --message $prompt `
        --announce `
        --timeout-seconds 300 `
        --thinking medium
    Write-Host "`n`u{2705} Cron job registered!" -ForegroundColor Green
} catch {
    Write-Host "`n`u{26a0} openclaw CLI not found or cron registration failed." -ForegroundColor Yellow
    Write-Host "   Install openclaw first: npm i -g openclaw" -ForegroundColor Yellow
    Write-Host "   Then re-run this script." -ForegroundColor Yellow
}

Write-Host "`n`u{2705} Setup complete!" -ForegroundColor Green
Write-Host "   Chrome extension: Load unpacked from $ScriptDir"
Write-Host "   Local server:     npm start (or node server.js)"
Write-Host "   Cron job:         XPost-Intelligence-0400 (daily 4:00 AM JST)"
Write-Host ""
