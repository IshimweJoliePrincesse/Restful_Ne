# Push latest project updates to GitHub
# Usage:
#   .\scripts\push-updates.ps1
#   .\scripts\push-updates.ps1 "Fix notification flow"

param(
    [string]$Message = "Update project with latest changes"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

if (-not (Test-Path ".git")) {
    Write-Error "Git is not initialized in this project. Run the initial GitHub setup first."
}

Write-Host "Checking git status..." -ForegroundColor Cyan
git status --short

$changes = git status --porcelain
if (-not $changes) {
    Write-Host "No changes to commit." -ForegroundColor Yellow
    exit 0
}

Write-Host "Staging changes..." -ForegroundColor Cyan
git add .

Write-Host "Committing: $Message" -ForegroundColor Cyan
git commit -m $Message

Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push origin HEAD

Write-Host "Done. Latest changes pushed successfully." -ForegroundColor Green
