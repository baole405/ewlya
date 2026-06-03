#!/usr/bin/env pwsh
# =============================================================
# start-bot-doppler.ps1  
# Chạy local bot với TẤT CẢ secrets từ Doppler (an toàn nhất)
# Không cần điền gì cả — Doppler tự inject env vars
#
# Cách dùng:  .\start-bot-doppler.ps1
# Yêu cầu: đã login doppler (`doppler login`)
# =============================================================

Write-Host ""
Write-Host "🔐 Khởi động LOCAL BOT via Doppler → SUPABASE" -ForegroundColor Cyan
Write-Host "   Secrets: Doppler (production)" -ForegroundColor DarkGray
Write-Host "   IS_LOCAL_BOT: true (sẽ lease-pause production bot)" -ForegroundColor DarkGray
Write-Host ""

# Doppler inject tất cả secrets, override IS_LOCAL_BOT=true
doppler run --command "npx tsx src/bot/main.ts" -- `
    --set IS_LOCAL_BOT=true 2>&1

if ($LASTEXITCODE -ne 0) {
    # Fallback: doppler run không hỗ trợ --set, dùng cách khác
    $env:IS_LOCAL_BOT = "true"
    doppler run -- npx tsx src/bot/main.ts
}
