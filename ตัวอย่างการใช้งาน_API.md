# 🧪 ตัวอย่างการใช้งาน API

## 📋 วิธีทดสอบแบบง่ายๆ

### 1️⃣ **ใช้ Python Script (แนะนำ)**

#### ขั้นตอน:

1. **เปิดไฟล์ `test_api_example.py`**

2. **แก้ไขตั้งค่า:**
   ```python
   API_URL = "http://127.0.0.1:8000"  # URL ของ API
   API_KEY = "ak_xxxxxxxxxxxxxxxxxxx"  # ← ใส่ API Key ของคุณตรงนี้
   ```

3. **รัน script:**
   ```bash
   python test_api_example.py
   ```

4. **ดูผลลัพธ์:**
   - Script จะทดสอบ endpoints หลายๆ อัน
   - แสดงผลลัพธ์ทีละ endpoint
   - สรุปผลการทดสอบในท้าย

---

## 🔑 วิธีได้ API Key

### วิธีที่ 1: สร้างเอง

1. **Login เข้าระบบ** → `http://localhost:3000`
2. **ไปหน้า API Management**
3. **คลิก "สร้าง API Key"**
4. **กรอกข้อมูล:**
   - ชื่อ: เช่น "Test API Key"
   - Permissions: เลือกตามต้องการ
   - Rate Limit: ตั้งค่าตามต้องการ
5. **คลิก "สร้าง"**
6. **คัดลอก API Key** (แสดงแค่ครั้งเดียว!)
7. **ใส่ใน script**

---

## 📝 ตัวอย่างการใช้งาน

### ตัวอย่างที่ 1: ดึงข้อมูลผู้ใช้

```python
import requests

API_URL = "http://127.0.0.1:8000"
API_KEY = "ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

url = f"{API_URL}/api/users/"
headers = {"X-API-Key": API_KEY}

response = requests.get(url, headers=headers)
print(response.json())
```

**ผลลัพธ์:**
```json
[
  {
    "dn": "CN=John Doe,CN=Users,DC=example,DC=com",
    "cn": "John Doe",
    "sAMAccountName": "johndoe",
    "mail": "john.doe@example.com",
    ...
  }
]
```

---

### ตัวอย่างที่ 2: ค้นหาผู้ใช้

```python
import requests

API_URL = "http://127.0.0.1:8000"
API_KEY = "ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

url = f"{API_URL}/api/users/"
headers = {"X-API-Key": API_KEY}
params = {"q": "john"}  # ค้นหา

response = requests.get(url, headers=headers, params=params)
print(response.json())
```

---

### ตัวอย่างที่ 3: ดึงข้อมูลกลุ่ม

```python
import requests

API_URL = "http://127.0.0.1:8000"
API_KEY = "ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

url = f"{API_URL}/api/groups/"
headers = {"X-API-Key": API_KEY}

response = requests.get(url, headers=headers)
print(response.json())
```

---

### ตัวอย่างที่ 4: สร้างผู้ใช้ใหม่ (ต้องมี permission `users:write`)

```python
import requests

API_URL = "http://127.0.0.1:8000"
API_KEY = "ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

url = f"{API_URL}/api/users/"
headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

data = {
    "cn": "Jane Doe",
    "sAMAccountName": "janedoe",
    "mail": "jane.doe@example.com",
    "department": "IT",
    "password": "SecurePassword123!"
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

---

### ตัวอย่างที่ 5: ใช้ cURL

```bash
# ดึงข้อมูลผู้ใช้
curl -X GET "http://127.0.0.1:8000/api/users/" \
  -H "X-API-Key: ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ค้นหาผู้ใช้
curl -X GET "http://127.0.0.1:8000/api/users/?q=john" \
  -H "X-API-Key: ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ดึงข้อมูลกลุ่ม
curl -X GET "http://127.0.0.1:8000/api/groups/" \
  -H "X-API-Key: ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

### ตัวอย่างที่ 6: ใช้ JavaScript (Browser)

```javascript
const API_URL = "http://127.0.0.1:8000";
const API_KEY = "ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

// ดึงข้อมูลผู้ใช้
fetch(`${API_URL}/api/users/`, {
  headers: {
    'X-API-Key': API_KEY
  }
})
.then(res => res.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

---

## ⚠️ ข้อควรระวัง

### 1. **API Key Security:**
- ❌ **อย่าใส่ API Key ใน code โดยตรง** (hardcode)
- ✅ **ใช้ Environment Variables** แทน

**ตัวอย่างที่ดี:**
```python
import os
API_KEY = os.getenv("API_KEY")  # ← ใช้ Environment Variable
```

**ตัวอย่างที่ไม่ดี:**
```python
API_KEY = "ak_abc123..."  # ❌ Hardcode - ไม่ปลอดภัย!
```

---

### 2. **เก็บ API Key ใน Environment Variable:**

**Windows PowerShell:**
```powershell
$env:API_KEY="ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
python test_api_example.py
```

**Linux/Mac:**
```bash
export API_KEY="ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
python test_api_example.py
```

---

### 3. **ใช้ .env file:**

สร้างไฟล์ `.env`:
```
API_KEY=ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
API_URL=http://127.0.0.1:8000
```

ใช้ใน Python:
```python
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("API_KEY")
API_URL = os.getenv("API_URL")
```

---

## 🔍 Debugging

### ถ้าได้ Error 401 (Unauthorized):
- ✅ ตรวจสอบ API Key ถูกต้องหรือไม่
- ✅ ตรวจสอบ API Key ยัง Active อยู่หรือไม่
- ✅ ตรวจสอบ API Key ยังไม่หมดอายุ

### ถ้าได้ Error 403 (Forbidden):
- ✅ ตรวจสอบ Permissions ใน Tab "API Keys"
- ✅ ตรวจสอบว่า API Key มี permission สำหรับ endpoint นั้นหรือไม่

### ถ้าได้ Error 404 (Not Found):
- ✅ ตรวจสอบ URL และ Endpoint ถูกต้องหรือไม่
- ✅ ตรวจสอบว่า backend ทำงานอยู่หรือไม่

### ถ้าได้ Error 429 (Too Many Requests):
- ✅ คุณเกิน rate limit แล้ว
- ✅ รอสักครู่แล้วลองใหม่
- ✅ ตรวจสอบ rate limit ใน Tab "API Keys"

---

## ✅ Checklist

ก่อนทดสอบ:
- [ ] มี API Key แล้ว
- [ ] รู้ URL ของ API server
- [ ] รู้ endpoint ที่ต้องการเรียก
- [ ] Backend server ทำงานอยู่
- [ ] เก็บ API Key ในที่ปลอดภัย

---

## 🎯 สรุป

**ขั้นตอนการทดสอบ:**

1. **ได้ API Key** (จากหน้า API Management)
2. **แก้ไข script** `test_api_example.py`
3. **ใส่ API Key** ใน script
4. **รัน script:**
   ```bash
   python test_api_example.py
   ```
5. **ดูผลลัพธ์** ✅

**สำคัญ:** เก็บ API Key ในที่ปลอดภัยและอย่าแชร์กับคนอื่น!

