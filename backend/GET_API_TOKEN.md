# วิธีการรับ API Token สำหรับ PowerShell Script

## วิธีที่ 1: ใช้ Token จาก Browser (ง่ายที่สุด)

### ขั้นตอน:

1. เปิดเว็บ http://YOUR_BACKEND_IP:8000
2. Login ด้วย username/password
3. กด `F12` เปิด Developer Tools
4. ไปที่ tab **Console**
5. พิมพ์คำสั่ง:
   ```javascript
   localStorage.getItem('token')
   ```
6. Copy token ที่แสดง (จะเป็น string ยาวๆ)
7. นำไปใส่ใน `sync_config.json`

---

## วิธีที่ 2: ใช้ PowerShell ดึง Token (อัตโนมัติ)

### สร้าง script get_token.ps1:

```powershell
# Configuration
$BackendUrl = "http://localhost:8000"
$Username = "administrator"
$Password = "P@ssw0rd!ng"

# Login to get token
$loginData = @{
    username = $Username
    password = $Password
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BackendUrl/api/auth/login" `
        -Method POST `
        -Body $loginData `
        -ContentType "application/json"
    
    $token = $response.access_token
    
    Write-Host "=========================================="
    Write-Host "API Token generated successfully!"
    Write-Host "=========================================="
    Write-Host ""
    Write-Host "Token: $token"
    Write-Host ""
    Write-Host "Copy this token and paste into sync_config.json"
    Write-Host ""
    
    # Optionally auto-update config file
    $configPath = Join-Path $PSScriptRoot "sync_config.json"
    if (Test-Path $configPath) {
        $config = Get-Content $configPath -Raw | ConvertFrom-Json
        $config.api_token = $token
        $config | ConvertTo-Json | Set-Content $configPath
        Write-Host "✅ Token automatically updated in sync_config.json"
    }
    
} catch {
    Write-Host "ERROR: Failed to get token"
    Write-Host $_.Exception.Message
}
```

### รัน script:

```powershell
cd C:\ADEventSync
.\get_token.ps1
```

---

## วิธีที่ 3: ใช้ Windows Credential Manager (ปลอดภัยที่สุด)

แทนที่จะเก็บ token ใน JSON file, ใช้ Windows Credential Manager:

### แก้ไข sync_ad_events.ps1:

```powershell
# Get token from Credential Manager
$cred = Get-StoredCredential -Target "ADEventSyncToken"
$token = $cred.GetNetworkCredential().Password

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
```

### บันทึก token:

```powershell
# Store token in Credential Manager
cmdkey /generic:ADEventSyncToken /user:api /pass:YOUR_TOKEN_HERE
```

---

## 🔒 Security Best Practices

1. **ใช้ Service Account**
   - สร้าง AD service account สำหรับ sync
   - ให้สิทธิ์เฉพาะอ่าน Event Log

2. **Restrict File Permissions**
   ```powershell
   # อนุญาตแค่ SYSTEM และ Administrators
   icacls C:\ADEventSync /inheritance:r
   icacls C:\ADEventSync /grant "SYSTEM:(OI)(CI)F"
   icacls C:\ADEventSync /grant "Administrators:(OI)(CI)F"
   ```

3. **Token Rotation**
   - เปลี่ยน token ทุก 3-6 เดือน
   - ใช้ script get_token.ps1 เพื่อ generate ใหม่

---

## ✅ เสร็จแล้ว!

หลังจากได้ token แล้ว:
1. ใส่ใน `sync_config.json`
2. ทดสอบ script manual
3. ตั้ง Scheduled Task
4. พร้อมใช้งาน!

