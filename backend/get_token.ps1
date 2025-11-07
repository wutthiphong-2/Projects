# =====================================================
# Get API Token for AD Event Sync
# =====================================================
# Purpose: Generate API token for PowerShell script authentication
# =====================================================

# Configuration - แก้ไขตามความเหมาะสม
$BackendUrl = "http://localhost:8000"
$Username = "administrator"
$Password = "P@ssw0rd!ng"

Write-Host "=========================================="
Write-Host "  AD Event Sync - API Token Generator"
Write-Host "=========================================="
Write-Host ""

# Prepare login data
$loginData = @{
    username = $Username
    password = $Password
} | ConvertTo-Json

Write-Host "Connecting to: $BackendUrl"
Write-Host "Username: $Username"
Write-Host ""

try {
    # Login to backend
    $response = Invoke-RestMethod -Uri "$BackendUrl/api/auth/login" `
        -Method POST `
        -Body $loginData `
        -ContentType "application/json" `
        -TimeoutSec 10
    
    $token = $response.access_token
    
    if ($token) {
        Write-Host "✅ SUCCESS! API Token generated"
        Write-Host ""
        Write-Host "=========================================="
        Write-Host "Your API Token:"
        Write-Host "=========================================="
        Write-Host $token -ForegroundColor Green
        Write-Host ""
        
        # Auto-update sync_config.json if exists
        $configPath = Join-Path $PSScriptRoot "sync_config.json"
        
        if (Test-Path $configPath) {
            try {
                $config = Get-Content $configPath -Raw | ConvertFrom-Json
                $config.api_token = $token
                $config | ConvertTo-Json -Depth 10 | Set-Content $configPath
                
                Write-Host "✅ Token automatically updated in sync_config.json"
                Write-Host ""
            } catch {
                Write-Host "⚠️ Could not auto-update config file: $_" -ForegroundColor Yellow
                Write-Host "Please update manually"
                Write-Host ""
            }
        } else {
            Write-Host "⚠️ sync_config.json not found in current directory" -ForegroundColor Yellow
            Write-Host "Please copy the token above and paste into your config file"
            Write-Host ""
        }
        
        Write-Host "=========================================="
        Write-Host "Next Steps:"
        Write-Host "=========================================="
        Write-Host "1. Verify token is in sync_config.json"
        Write-Host "2. Test script: .\sync_ad_events.ps1"
        Write-Host "3. Set up Scheduled Task (see SETUP_AD_EVENT_SYNC.md)"
        Write-Host ""
        
    } else {
        Write-Host "❌ ERROR: No token received from server" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ ERROR: Failed to get token" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error details:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:"
    Write-Host "- Backend is not running (check $BackendUrl)"
    Write-Host "- Wrong username/password"
    Write-Host "- Network/firewall blocking connection"
    Write-Host ""
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

