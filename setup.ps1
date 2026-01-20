# Mafia Game - Quick Start Script (PowerShell)
# Run this script to set up and start the development environment

Write-Host "🎭 Mafia Game Development Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check if MongoDB is running (optional)
Write-Host "`n📦 Checking MongoDB..." -ForegroundColor Yellow

# Install root dependencies
Write-Host "`n📦 Installing root dependencies..." -ForegroundColor Yellow
npm install

# Install server dependencies
Write-Host "`n📦 Installing server dependencies..." -ForegroundColor Yellow
Set-Location server
npm install
Set-Location ..

# Install client dependencies
Write-Host "`n📦 Installing client dependencies..." -ForegroundColor Yellow
Set-Location client
npm install
Set-Location ..

# Create .env files if they don't exist
Write-Host "`n⚙️ Setting up environment files..." -ForegroundColor Yellow

if (-not (Test-Path "server/.env")) {
    Copy-Item "server/.env.example" "server/.env"
    Write-Host "  Created server/.env" -ForegroundColor Green
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "  Created .env" -ForegroundColor Green
}

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start MongoDB (if not using Docker):"
Write-Host "     docker run -d -p 27017:27017 --name mafia-mongo mongo:6.0"
Write-Host ""
Write-Host "  2. Edit server/.env with your MongoDB connection string"
Write-Host ""
Write-Host "  3. Start the development servers:"
Write-Host "     npm run dev"
Write-Host ""
Write-Host "  Or use Docker for everything:"
Write-Host "     docker-compose up --build"
Write-Host ""
Write-Host "🎮 Happy gaming!" -ForegroundColor Cyan
