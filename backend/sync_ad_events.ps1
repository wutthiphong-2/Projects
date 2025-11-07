# =====================================================
# AD Event Log Synchronization Script
# =====================================================
# Purpose: อ่าน Windows Security Event Log และส่งไป Backend API
# Run on: Domain Controller
# Schedule: ทุก 5 นาที
# =====================================================

# Configuration
$ConfigFile = Join-Path $PSScriptRoot "sync_config.json"
$LogFile = Join-Path $PSScriptRoot "sync_ad_events.log"

# Function: Write log
function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -FilePath $LogFile -Append
    Write-Host $Message
}

Write-Log "=========================================="
Write-Log "Starting AD Event Sync"
Write-Log "=========================================="

# Load configuration
if (-not (Test-Path $ConfigFile)) {
    Write-Log "ERROR: Configuration file not found: $ConfigFile"
    Write-Log "Please create sync_config.json first"
    exit 1
}

try {
    $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
    Write-Log "Configuration loaded successfully"
} catch {
    Write-Log "ERROR: Failed to load configuration: $_"
    exit 1
}

# Event ID mapping
$EventMapping = @{
    4720 = "user_create"
    4722 = "user_enable"
    4723 = "password_change_attempt"
    4724 = "password_reset"
    4725 = "user_disable"
    4726 = "user_delete"
    4738 = "user_update"
    4740 = "user_lockout"
    4767 = "user_unlock"
    4728 = "group_member_add"
    4729 = "group_member_remove"
    4732 = "group_member_add_local"
    4733 = "group_member_remove_local"
}

# Calculate time range (last 5 minutes + 1 minute buffer)
$StartTime = (Get-Date).AddMinutes(-($config.check_interval_minutes + 1))
Write-Log "Checking events from: $StartTime"

# Read events
try {
    $events = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        ID = $config.event_ids
        StartTime = $StartTime
    } -ErrorAction SilentlyContinue
    
    Write-Log "Found $($events.Count) events to process"
} catch {
    Write-Log "No new events found or error reading Event Log: $_"
    exit 0
}

if ($events.Count -eq 0) {
    Write-Log "No new events to sync"
    exit 0
}

# Process each event
$successCount = 0
$failCount = 0

foreach ($event in $events) {
    try {
        # Skip if already synced
        if ($event.RecordId -le $config.last_synced_record) {
            continue
        }
        
        $eventId = $event.Id
        $actionType = $EventMapping[$eventId]
        
        if (-not $actionType) {
            Write-Log "WARNING: Unknown event ID: $eventId"
            continue
        }
        
        # Parse event properties
        $eventXml = [xml]$event.ToXml()
        $eventData = $eventXml.Event.EventData.Data
        
        # Extract subject (who did it) and target (affected user)
        $subjectUserName = ""
        $subjectDomain = ""
        $targetUserName = ""
        $targetDomain = ""
        
        # Parse event data based on structure
        foreach ($data in $eventData) {
            switch ($data.Name) {
                "SubjectUserName" { $subjectUserName = $data.'#text' }
                "SubjectDomainName" { $subjectDomain = $data.'#text' }
                "TargetUserName" { $targetUserName = $data.'#text' }
                "TargetDomainName" { $targetDomain = $data.'#text' }
            }
        }
        
        # Build full usernames
        $subject = if ($subjectDomain) { "$subjectDomain\$subjectUserName" } else { $subjectUserName }
        $target = $targetUserName
        
        # Skip system accounts
        if ($subject -like "*$" -or $target -like "*$") {
            continue
        }
        
        # Prepare data for API
        $apiData = @{
            event_id = $eventId
            time_generated = $event.TimeCreated.ToString("o")  # ISO 8601 format
            subject_username = $subject
            target_username = $target
            target_domain = "DC=$($targetDomain -replace '\.',',DC=')"
            action_type = $actionType
            details = @{
                event_record_id = $event.RecordId
                computer = $event.MachineName
            }
            ip_address = "Event Log (DC)"
        }
        
        # For user_update events (4738), try to extract changed fields
        if ($eventId -eq 4738) {
            $changes = @()
            # Note: Event 4738 doesn't always include field details
            # But we can note that a change occurred
            $apiData.details.note = "User account properties modified"
            $apiData.details.changes = $changes
        }
        
        # Convert to JSON
        $jsonBody = $apiData | ConvertTo-Json -Depth 10
        
        # Send to Backend API
        $headers = @{
            "Authorization" = "Bearer $($config.api_token)"
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "$($config.backend_url)/api/activity-logs/from-event" `
            -Method POST `
            -Headers $headers `
            -Body $jsonBody `
            -TimeoutSec 10 `
            -ErrorAction Stop
        
        if ($response.success) {
            Write-Log "SUCCESS: Event $eventId (Record $($event.RecordId)) - $subject -> $target"
            $successCount++
            
            # Update last synced record
            if ($event.RecordId -gt $config.last_synced_record) {
                $config.last_synced_record = $event.RecordId
            }
        } else {
            Write-Log "FAILED: Event $eventId - $($response.message)"
            $failCount++
        }
        
    } catch {
        Write-Log "ERROR processing event $($event.RecordId): $_"
        $failCount++
    }
}

# Save updated configuration
try {
    $config | ConvertTo-Json | Set-Content $ConfigFile
    Write-Log "Configuration updated (last_synced_record: $($config.last_synced_record))"
} catch {
    Write-Log "WARNING: Could not update configuration: $_"
}

Write-Log "=========================================="
Write-Log "Sync completed: $successCount success, $failCount failed"
Write-Log "=========================================="

