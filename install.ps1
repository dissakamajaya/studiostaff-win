# STUDIOSTAFF Windows Installer
# Run from PowerShell:
#   irm https://raw.githubusercontent.com/dissakamajaya/studiostaff-win/main/install.ps1 | iex

$repo = "dissakamajaya/studiostaff-win"
$appName = "STUDIOSTAFF"

Write-Host "=== $appName Windows Installer ===" -ForegroundColor Cyan

# Get latest release
Write-Host "Fetching latest release..."
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest"
$setupAsset = $release.assets | Where-Object { $_.name -like "*Setup*" } | Select-Object -First 1

if (-not $setupAsset) {
    Write-Host "ERROR: No installer found in latest release" -ForegroundColor Red
    exit 1
}

$url = $setupAsset.browser_download_url
$outPath = "$env:TEMP\STUDIOSTAFF_Setup.exe"

Write-Host "Downloading $($setupAsset.name) ($([math]::Round($setupAsset.size / 1MB, 1)) MB)..."
Invoke-WebRequest -Uri $url -OutFile $outPath -UseBasicParsing

Write-Host "Running installer..."
Start-Process -FilePath $outPath -Wait

Write-Host "Cleaning up..."
Remove-Item $outPath -Force

Write-Host ""
Write-Host "=== Done! $appName installed. ===" -ForegroundColor Green
Write-Host "Find it in Start Menu or: %LOCALAPPDATA%\Programs\studiostaff-win"
