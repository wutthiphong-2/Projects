# Quick Start Guide

## 🚀 เริ่มใช้งาน

### เปิด Backend
```
Double-click: start_backend.bat
```

### เปิด Frontend
```
Double-click: start_frontend.bat
```

### เข้าใช้งาน
เปิดเว็บ: **http://localhost:3000**

---

## 🔐 Login

**Username:** `administrator`  
**Password:** `P@ssw0rd!ng`

---

## 🛑 ปิดระบบ

### ปิด Backend
```
Double-click: KILL_BACKEND.bat
```

หรือ
```
CTRL+C ใน Command Prompt ที่รัน Backend
```

### ปิด Frontend
```
CTRL+C ใน Command Prompt ที่รัน Frontend
```

---

## ⚡ Tips

- **Backend ช้า?** ระบบกำลัง query AD (3,019 users)
- **Login ไม่ได้?** ตรวจสอบ AD Server: `adm.tbkk.co.th`
- **Port 8000 ถูกใช้?** รัน `KILL_BACKEND.bat` ก่อน

---

## 📁 ไฟล์สำคัญ

- `start_backend.bat` - เปิด Backend
- `start_frontend.bat` - เปิด Frontend  
- `KILL_BACKEND.bat` - ปิด Backend
- `backend/.env` - Configuration file

---

## 🔧 Troubleshooting

### Backend ไม่เปิด
```bash
cd backend
python run_uvicorn_local.py
```

### Frontend ไม่เปิด
```bash
cd frontend
npm start
```

### ลืม Password
ดูได้ที่: `backend/.env` → `LDAP_BIND_PASSWORD`

---

**Version:** 1.0  
**Last Updated:** 2025-01-28

