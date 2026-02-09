# Git Push Script - Just run this file!
# This will push all the security fixes and domain config to GitHub

Write-Host "🚀 Starting Git Push Process..." -ForegroundColor Cyan
Write-Host ""

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "📂 Current directory: $ScriptDir" -ForegroundColor Yellow
Write-Host ""

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "❌ ERROR: Not in a git repository!" -ForegroundColor Red
    Write-Host "Please run this script from: mentalist_stars_web\mentalist_stars_source_code" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "✅ Git repository found!" -ForegroundColor Green
Write-Host ""

# Check git status
Write-Host "📋 Checking what's changed..." -ForegroundColor Cyan
git status
Write-Host ""

# Add files
Write-Host "➕ Adding files to Git..." -ForegroundColor Cyan
git add .gitignore
git add vercel.json
git add .env.production
git add backend/wrangler.toml
git add SECURITY_SETUP.md
git add CUSTOM_DOMAIN_SETUP.md
git add GIT_PUSH_CHECKLIST.md

Write-Host "✅ Files added!" -ForegroundColor Green
Write-Host ""

# Commit
Write-Host "💾 Creating commit..." -ForegroundColor Cyan
git commit -m "Security fix: Remove exposed API key + add custom domain config"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Commit created!" -ForegroundColor Green
    Write-Host ""

    # Push
    Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Cyan
    git push origin main

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 SUCCESS! All files pushed to GitHub!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔒 Your API key in .dev.vars was NOT pushed (it's safe!)" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "❌ Push failed. Check your GitHub credentials and internet connection." -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ Nothing to commit (files might already be committed)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor Gray
pause
