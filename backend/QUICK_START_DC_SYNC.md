# 🚀 Quick Start: ติดตั้ง AD Event Sync บน Domain Controller

## เวลาที่ใช้: 15-20 นาที

---

## 📦 สิ่งที่ต้องเตรียม

- ✅ สิทธิ์ Administrator บน Domain Controller
- ✅ Backend รันอยู่และเข้าถึงได้จาก DC
- ✅ AD Audit Policy เปิดอยู่แล้ว

---

## ⚡ ขั้นตอนการติดตั้ง (5 ขั้นตอน)

### 1️⃣ คัดลอกไฟล์ไปยัง DC (2 นาที)

**บน DC สร้าง folder:**
```powershell
New-Item -Path "C:\ADEventSync" -ItemType Directory -Force
```

**คัดลอกไฟล์เหล่านี้ไป `C:\ADEventSync\`:**
- `sync_ad_events.ps1`
- `sync_config.json`
- `get_token.ps1`

---

### 2️⃣ แก้ไข Configuration (3 นาที)

**แก้ไขไฟล์ `C:\ADEventSync\sync_config.json`:**

```json
{
  "backend_url": "http://YOUR_BACKEND_IP:8000",
  "api_token": "WILL_BE_GENERATED",
  "check_interval_minutes": 5,
  "event_ids": [4720, 4722, 4723, 4724, 4725, 4726, 4738, 4740, 4767, 4728, 4729],
  "last_synced_record": 0
}
```

**เปลี่ยน:**
- `YOUR_BACKEND_IP` → IP address ของเครื่องที่รัน Backend

---

### 3️⃣ สร้าง API Token (2 นาที)

**แก้ไข `C:\ADEventSync\get_token.ps1`:**

```powershell
$BackendUrl = "http://YOUR_BACKEND_IP:8000"  # <-- เปลี่ยนตรงนี้
$Username = "administrator"
$Password = "P@ssw0rd!ng"
```

**รัน script:**
```powershell
cd C:\ADEventSync
.\get_token.ps1
```

✅ Token จะถูก update ใน `sync_config.json` อัตโนมัติ!

---

### 4️⃣ ทดสอบ Script (3 นาที)

```powershell
cd C:\ADEventSync
.\sync_ad_events.ps1
```

**ถ้าสำเร็จจะเห็น:**
```
==========================================
Starting AD Event Sync
==========================================
Configuration loaded successfully
Checking events from: 2025-10-28 16:25:00
Found 3 events to process
SUCCESS: Event 4738 (Record 123456) - TBKK\admin -> john.doe
==========================================
Sync completed: 3 success, 0 failed
==========================================
```

---

### 5️⃣ ตั้ง Scheduled Task (5 นาที)

**เปิด PowerShell as Administrator:**

```powershell
# สร้าง Scheduled Task (Copy-Paste ทั้งหมด)
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"C:\ADEventSync\sync_ad_events.ps1`""

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 5) `
    -RepetitionDuration ([TimeSpan]::MaxValue)

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" `
    -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "AD Event Sync" `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Description "Sync AD events to Activity Log backend every 5 minutes"
```

**เสร็จแล้ว!** ✅

---

## 🧪 ทดสอบระบบ

### ทดสอบ Manual

```powershell
# รัน Task ทันที
Start-ScheduledTask -TaskName "AD Event Sync"

# เช็ค status
Get-ScheduledTask -TaskName "AD Event Sync" | Select-Object TaskName, State, LastRunTime, LastTaskResult

# ดู log
Get-Content C:\ADEventSync\sync_ad_events.log -Tail 20
```

### ทดสอบ End-to-End

1. **แก้ไข User** ใน AD Users & Computers
2. **รอ 5-6 นาที** (Scheduled Task รัน)
3. **เปิดเว็บ** → Activity Log
4. **Refresh** → จะเห็น log ใหม่!

---

## 📊 ตรวจสอบการทำงาน

### ดู Log File

```powershell
# ดู logs ล่าสุด
Get-Content C:\ADEventSync\sync_ad_events.log -Tail 50

# ดู logs วันนี้
Select-String -Path "C:\ADEventSync\sync_ad_events.log" -Pattern (Get-Date -Format "yyyy-MM-dd")
```

### ดู Scheduled Task History

```powershell
Get-WinEvent -LogName "Microsoft-Windows-TaskScheduler/Operational" -MaxEvents 20 | 
    Where-Object { $_.Message -like "*AD Event Sync*" }
```

---

## 🔧 Troubleshooting

### ปัญหา: Script ไม่รัน

```powershell
# เช็ค Task
Get-ScheduledTask -TaskName "AD Event Sync"

# รัน manual
Start-ScheduledTask -TaskName "AD Event Sync"

# ดู errors
Get-Content C:\ADEventSync\sync_ad_events.log -Tail 20
```

### ปัญหา: ไม่สามารถเชื่อมต่อ Backend

```powershell
# ทดสอบ network
Test-NetConnection -ComputerName YOUR_BACKEND_IP -Port 8000

# ทดสอบ API
Invoke-WebRequest -Uri "http://YOUR_BACKEND_IP:8000/api/health"
```

### ปัญหา: Token หมดอายุ

```powershell
# สร้าง token ใหม่
cd C:\ADEventSync
.\get_token.ps1
```

---

## ✅ เสร็จสิ้น!

ระบบจะทำงานอัตโนมัติทุก 5 นาที:
- อ่าน AD events จาก Security Log
- ส่งไป Backend API
- แสดงใน Activity Log ในเว็บ

**พร้อมใช้งานแล้ว! 🎉**

