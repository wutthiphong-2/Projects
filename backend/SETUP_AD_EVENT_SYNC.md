# คู่มือการติดตั้ง AD Event Sync บน Domain Controller

## 📋 ภาพรวม

PowerShell script นี้จะรันบน Domain Controller ทุก 5 นาที เพื่ออ่าน Windows Event Log และส่งข้อมูลมา Backend API สำหรับบันทึก Activity Log

---

## 🔧 ขั้นตอนการติดตั้ง

### ขั้นตอนที่ 1: คัดลอกไฟล์ไปยัง Domain Controller

คัดลอกไฟล์เหล่านี้ไปยัง DC (เช่น `C:\ADEventSync\`):
- `sync_ad_events.ps1`
- `sync_config.json`

### ขั้นตอนที่ 2: สร้าง API Token

1. Login เว็บ http://your-backend:8000
2. ไปที่ Developer Tools > Console
3. รัน: `localStorage.getItem('token')`
4. Copy token ที่ได้

หรือใช้ username/password แทน (แก้ไข script)

### ขั้นตอนที่ 3: แก้ไข Configuration

แก้ไขไฟล์ `sync_config.json`:

```json
{
  "backend_url": "http://YOUR_BACKEND_SERVER_IP:8000",
  "api_token": "YOUR_TOKEN_HERE",
  "check_interval_minutes": 5,
  "event_ids": [4720, 4722, 4723, 4724, 4725, 4726, 4738, 4740, 4767, 4728, 4729, 4732, 4733],
  "last_synced_record": 0
}
```

**สำคัญ:**
- เปลี่ยน `backend_url` เป็น IP/hostname ของเครื่องที่รัน Backend
- เปลี่ยน `api_token` เป็น token จริง

### ขั้นตอนที่ 4: ทดสอบ Script (Manual Run)

เปิด PowerShell as Administrator บน DC:

```powershell
cd C:\ADEventSync
.\sync_ad_events.ps1
```

**ควรเห็น:**
```
==========================================
Starting AD Event Sync
==========================================
Configuration loaded successfully
Checking events from: 2025-10-28 16:25:00
Found 5 events to process
SUCCESS: Event 4738 (Record 123456) - TBKK\admin -> john.doe
SUCCESS: Event 4728 (Record 123457) - TBKK\admin -> jane.doe
==========================================
Sync completed: 2 success, 0 failed
==========================================
```

### ขั้นตอนที่ 5: สร้าง Scheduled Task

เปิด PowerShell as Administrator บน DC:

```powershell
# สร้าง Scheduled Task
$scriptPath = "C:\ADEventSync\sync_ad_events.ps1"

$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 5) `
    -RepetitionDuration ([TimeSpan]::MaxValue)

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName "AD Event Sync to Backend" `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description "Sync AD events to Activity Log backend every 5 minutes"

Write-Host "Scheduled Task created successfully!"
```

### ขั้นตอนที่ 6: ตรวจสอบ Scheduled Task

```powershell
# ดู Task
Get-ScheduledTask -TaskName "AD Event Sync to Backend"

# รัน Task ทันที (ทดสอบ)
Start-ScheduledTask -TaskName "AD Event Sync to Backend"

# ดู History
Get-ScheduledTask -TaskName "AD Event Sync to Backend" | Get-ScheduledTaskInfo
```

---

## 🧪 การทดสอบ

### 1. ทดสอบ Manual

```powershell
cd C:\ADEventSync
.\sync_ad_events.ps1
```

ดูที่ `sync_ad_events.log` ว่ามี errors หรือไม่

### 2. ทดสอบ End-to-End

1. แก้ไข User ใน AD Users & Computers
2. รอ 5-6 นาที (Scheduled Task รัน)
3. เปิดเว็บ → Activity Log
4. ควรเห็น log ใหม่!

---

## 📊 ตรวจสอบการทำงาน

### ดู Log File

```powershell
Get-Content C:\ADEventSync\sync_ad_events.log -Tail 50
```

### ดู Scheduled Task Events

```powershell
Get-WinEvent -LogName "Microsoft-Windows-TaskScheduler/Operational" `
    -MaxEvents 10 | Where-Object { $_.Message -like "*AD Event Sync*" }
```

---

## 🔧 Troubleshooting

### ปัญหา: Script ไม่ส่งข้อมูล

1. **เช็ค API Token:**
   ```powershell
   # Test API manually
   $headers = @{
       "Authorization" = "Bearer YOUR_TOKEN"
       "Content-Type" = "application/json"
   }
   Invoke-RestMethod -Uri "http://backend:8000/api/health" -Headers $headers
   ```

2. **เช็ค Network:**
   ```powershell
   Test-NetConnection -ComputerName YOUR_BACKEND_IP -Port 8000
   ```

3. **เช็ค Firewall:**
   - อนุญาต port 8000 จาก DC → Backend

### ปัญหา: ไม่มี Events

1. **เช็ค Audit Policy:**
   ```powershell
   auditpol /get /category:"Account Management"
   ```

2. **ทดสอบสร้าง Event:**
   - แก้ไข user ใน AD
   - เช็คว่ามี Event 4738:
   ```powershell
   Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4738} -MaxEvents 1
   ```

---

## 🎯 Event IDs ที่ติดตาม

| Event ID | การกระทำ | แสดงในเว็บ |
|----------|---------|-----------|
| 4720 | User Created | สร้างผู้ใช้ (AD) |
| 4722 | User Enabled | เปิดใช้งาน (AD) |
| 4723 | Password Changed | เปลี่ยนรหัสผ่าน (AD) |
| 4724 | Password Reset | รีเซ็ตรหัสผ่าน (AD) |
| 4725 | User Disabled | ปิดใช้งาน (AD) |
| 4726 | User Deleted | ลบผู้ใช้ (AD) |
| 4738 | User Changed | แก้ไขผู้ใช้ (AD) |
| 4740 | User Locked | ล็อคบัญชี (AD) |
| 4767 | User Unlocked | ปลดล็อค (AD) |
| 4728 | Member Added | เพิ่มสมาชิก (AD) |
| 4729 | Member Removed | ลบสมาชิก (AD) |

---

## 📝 การบำรุงรักษา

### ดู Logs ประจำวัน

```powershell
# ดู log วันนี้
Select-String -Path "C:\ADEventSync\sync_ad_events.log" -Pattern (Get-Date -Format "yyyy-MM-dd")
```

### Clear Old Logs

```powershell
# เก็บ logs แค่ 30 วัน
$cutoffDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
$lines = Get-Content "C:\ADEventSync\sync_ad_events.log"
$lines | Where-Object { $_ -match "(\d{4}-\d{2}-\d{2})" -and $Matches[1] -gt $cutoffDate } | 
    Set-Content "C:\ADEventSync\sync_ad_events.log"
```

---

## ✅ สำเร็จ!

หลังจากติดตั้งเสร็จ ระบบจะ:
- ✅ อ่าน AD events ทุก 5 นาที อัตโนมัติ
- ✅ ส่งข้อมูลมา Backend
- ✅ แสดงใน Activity Log พร้อม username จริง
- ✅ บันทึกถาวรใน SQLite database

