# 🔧 วิธีแก้ปัญหา ERR_CONNECTION_REFUSED

## 🐛 **ปัญหา:**
Frontend ไม่สามารถเชื่อมต่อกับ backend server ได้
- Error: `net::ERR_CONNECTION_REFUSED`
- เรียก `:8000/api/auth/verify` ไม่ได้
- เรียก `:8000/api/auth/login` ไม่ได้

---

## ✅ **วิธีแก้ไข:**

### **วิธีที่ 1: ตรวจสอบว่า Backend Server ทำงานอยู่**

```bash
# ตรวจสอบ backend server
python check_backend.py
```

**ถ้าไม่ทำงาน ให้รัน backend server:**
```bash
cd backend
venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

### **วิธีที่ 2: ตรวจสอบ Frontend Config**

เปิด **Browser DevTools** (F12) → **Console** → พิมพ์:

```javascript
// ตรวจสอบ API URL
console.log(window.__API_URL__);
console.log(localStorage.getItem('API_URL'));
console.log(require('./config').default);
```

**ถ้า API URL ไม่ถูกต้อง ให้แก้ไข:**

#### **Option A: ใช้ localStorage (ชั่วคราว)**
```javascript
// ใน Browser Console
localStorage.setItem('API_URL', 'http://localhost:8000');
// หรือ
localStorage.setItem('API_URL', 'http://127.0.0.1:8000');
location.reload();
```

#### **Option B: ใช้ Environment Variable**
สร้างไฟล์ `.env` ในโฟลเดอร์ `frontend/`:
```
REACT_APP_API_URL=http://localhost:8000
```

แล้ว restart frontend server:
```bash
cd frontend
npm start
```

#### **Option C: แก้ไข config.js**
แก้ไขไฟล์ `frontend/src/config.js`:
```javascript
const config = {
    apiUrl: 'http://localhost:8000',  // ← เปลี่ยนตรงนี้
    API_BASE_URL: 'http://localhost:8000',
    timeout: 5000
};
```

---

### **วิธีที่ 3: ตรวจสอบ Proxy Configuration**

ตรวจสอบว่า `frontend/package.json` มี proxy:
```json
{
  "proxy": "http://localhost:8000"
}
```

**ถ้ามี proxy อยู่แล้ว แต่ไม่ทำงาน:**
- ลอง restart frontend server
- หรือปิด proxy แล้วใช้ direct URL แทน

---

### **วิธีที่ 4: ตรวจสอบ Firewall/Port**

ตรวจสอบว่า Port 8000 ไม่ถูก block:

```powershell
# Windows - ตรวจสอบว่า port 8000 ถูกใช้งานหรือไม่
netstat -ano | findstr :8000
```

**ถ้า port ถูก block ให้:**
1. ปิด Firewall ชั่วคราว
2. หรือเพิ่ม exception ใน Windows Firewall

---

### **วิธีที่ 5: ใช้ IP Address แทน localhost**

ถ้า `localhost` ไม่ทำงาน ลองใช้ IP address:

```javascript
// ใน Browser Console
localStorage.setItem('API_URL', 'http://127.0.0.1:8000');
location.reload();
```

---

## 🔍 **Debugging Steps:**

### **Step 1: ตรวจสอบ Backend Server**
```bash
# เปิด browser ไปที่
http://localhost:8000/api/health

# ควรเห็น:
# {"status":"healthy","timestamp":"...","version":"1.0.0"}
```

### **Step 2: ตรวจสอบ Frontend API URL**
```javascript
// ใน Browser Console
const config = require('./src/config').default;
console.log('API URL:', config.apiUrl);
```

### **Step 3: ทดสอบเรียก API โดยตรง**
```javascript
// ใน Browser Console
fetch('http://localhost:8000/api/health')
  .then(r => r.json())
  .then(d => console.log('Success:', d))
  .catch(e => console.error('Error:', e));
```

**ถ้าเรียกได้ → ปัญหาอยู่ที่ frontend config**
**ถ้าเรียกไม่ได้ → ปัญหาอยู่ที่ backend server หรือ network**

---

## 🚀 **Quick Fix (Recommended):**

### **แก้ไขชั่วคราว - ใช้ localStorage:**

1. เปิดหน้าเว็บ → `http://localhost:3000`
2. กด `F12` → เปิด **Console**
3. พิมพ์:
   ```javascript
   localStorage.setItem('API_URL', 'http://localhost:8000');
   location.reload();
   ```
4. หน้าเว็บจะ reload และใช้ API URL ใหม่

### **แก้ไขถาวร - แก้ไข config.js:**

แก้ไขไฟล์ `frontend/src/config.js`:
```javascript
const resolveDefaultUrl = () => {
    // เปลี่ยนจาก localhost เป็น 127.0.0.1 หรือใช้ default
    return 'http://localhost:8000';  // ← เปลี่ยนตรงนี้
};
```

---

## 📋 **Checklist:**

- [ ] Backend server ทำงานอยู่ (`python check_backend.py`)
- [ ] Port 8000 ไม่ถูก block
- [ ] Frontend config ถูกต้อง
- [ ] Proxy configuration ถูกต้อง (ถ้าใช้)
- [ ] Firewall ไม่ block port 8000
- [ ] ลอง restart frontend server

---

## 🎯 **สรุป:**

**ปัญหาหลัก:** Frontend ไม่สามารถเชื่อมต่อกับ Backend ได้

**วิธีแก้:**
1. ✅ ตรวจสอบว่า backend server ทำงานอยู่
2. ✅ แก้ไข API URL ใน frontend config
3. ✅ ลองใช้ IP address แทน localhost
4. ✅ ตรวจสอบ firewall/proxy

**Quick Fix:**
```javascript
// ใน Browser Console
localStorage.setItem('API_URL', 'http://localhost:8000');
location.reload();
```

---

**ถ้ายังแก้ไม่ได้ ให้ส่ง:**
1. Output จาก `python check_backend.py`
2. Error message จาก Browser Console
3. API URL ที่ frontend ใช้ (จาก config)

