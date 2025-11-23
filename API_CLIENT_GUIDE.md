# 📖 คู่มือการใช้งาน API สำหรับเพื่อน

## 🚀 Quick Start

### 1. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ในโปรเจคของคุณ:

```env
# API Base URL (เปลี่ยนเป็น IP หรือ domain ของ server)
VITE_API_URL=http://YOUR_SERVER_IP:8000/api

# API Key (สร้างจาก API Management หรือใช้ JWT Token)
VITE_API_KEY=ak_live_xxxxxxxxxxxxx
```

### 2. วิธีรับ Authentication

#### วิธีที่ 1: ใช้ JWT Token (หมดอายุ 1 ปี)

```javascript
// Login เพื่อรับ Token
const login = async (username, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json();
  localStorage.setItem('token', data.access_token);
  return data.access_token;
};

// Token จะหมดอายุใน 1 ปี (ไม่ต้อง login บ่อย)
```

#### วิธีที่ 2: ใช้ API Key (แนะนำ - ไม่หมดอายุ)

```javascript
// 1. Login ก่อน (เพื่อสร้าง API Key)
const jwtToken = await login('username', 'password');

// 2. สร้าง API Key (ไม่หมดอายุ)
const createAPIKey = async (jwtToken) => {
  const response = await fetch(`${API_BASE_URL}/api-keys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: "My Long-term API Key",
      expires_at: null,  // ⚠️ ไม่หมดอายุ
      rate_limit: 1000,
      description: "API Key for my project"
    })
  });
  
  const data = await response.json();
  // ⚠️ บันทึก API Key ไว้! (แสดงครั้งเดียว)
  localStorage.setItem('apiKey', data.api_key);
  return data.api_key;
};

// 3. ใช้ API Key เรียก API
const apiKey = localStorage.getItem('apiKey');
const headers = {
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json'
};
```

---

## 📝 ตัวอย่างการใช้งาน

### JavaScript/React

```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

// สร้าง axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// เรียก API
const getUsers = async () => {
  try {
    const response = await api.get('/users');
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // Token/Key หมดอายุหรือไม่ถูกต้อง
      console.error('Authentication failed');
    }
    throw error;
  }
};
```

### Python

```python
import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8000/api')
API_KEY = os.getenv('API_KEY')

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

# เรียก API
def get_users():
    response = requests.get(f'{API_BASE_URL}/users', headers=headers)
    if response.status_code == 401:
        print('Authentication failed')
    return response.json()
```

### cURL

```bash
# ตั้งค่า
export API_BASE_URL="http://YOUR_SERVER_IP:8000/api"
export API_KEY="ak_live_xxxxxxxxxxxxx"

# เรียก API
curl -X GET "${API_BASE_URL}/users" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json"
```

---

## 🔑 การสร้าง API Key

### ผ่าน API

```bash
# 1. Login เพื่อรับ JWT Token
JWT_TOKEN=$(curl -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}' \
  | jq -r '.access_token')

# 2. สร้าง API Key (ไม่หมดอายุ)
curl -X POST "${API_BASE_URL}/api-keys" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Key",
    "expires_at": null,
    "rate_limit": 1000,
    "description": "For my project"
  }'
```

### ผ่าน Web UI

1. Login ที่: `http://YOUR_SERVER_IP:8000`
2. ไปที่ **API Management**
3. คลิก **Create API Key**
4. ตั้งค่า:
   - Name: ชื่อ API Key
   - Expires At: **เว้นว่างไว้** (ไม่หมดอายุ)
   - Rate Limit: 1000 (หรือตามต้องการ)
5. คลิก **Create**
6. **บันทึก API Key ไว้!** (แสดงครั้งเดียว)

---

## 📚 API Endpoints

### Authentication

- `POST /api/auth/login` - Login เพื่อรับ JWT Token
- `GET /api/auth/verify` - ตรวจสอบ Token
- `POST /api/auth/logout` - Logout

### Users

- `GET /api/users` - ดึงรายการผู้ใช้
- `GET /api/users/{dn}` - ดึงข้อมูลผู้ใช้
- `POST /api/users` - สร้างผู้ใช้ใหม่
- `PUT /api/users/{dn}` - อัปเดตผู้ใช้
- `DELETE /api/users/{dn}` - ลบผู้ใช้

### Groups

- `GET /api/groups` - ดึงรายการกลุ่ม
- `GET /api/groups/{dn}` - ดึงข้อมูลกลุ่ม
- `POST /api/groups` - สร้างกลุ่มใหม่

### API Keys

- `GET /api/api-keys` - ดึงรายการ API Keys
- `POST /api/api-keys` - สร้าง API Key ใหม่
- `PUT /api/api-keys/{key_id}` - อัปเดต API Key
- `DELETE /api/api-keys/{key_id}` - ลบ API Key

ดูเอกสารทั้งหมดได้ที่: `http://YOUR_SERVER_IP:8000/docs`

---

## ⚠️ ข้อควรระวัง

1. **API Key แสดงครั้งเดียว**: เมื่อสร้าง API Key แล้ว ต้องบันทึกไว้ทันที เพราะจะไม่แสดงอีก
2. **Token หมดอายุ 1 ปี**: JWT Token จะหมดอายุใน 1 ปี (แต่ API Key ไม่หมดอายุ)
3. **Rate Limiting**: แต่ละ API Key มี rate limit ตามที่ตั้งค่า
4. **Security**: อย่า commit API Key หรือ Token ลง Git

---

## 🆘 Troubleshooting

### Error 401: Unauthorized
- Token/Key หมดอายุ → Login ใหม่หรือสร้าง API Key ใหม่
- Token/Key ไม่ถูกต้อง → ตรวจสอบว่า copy มาครบหรือไม่
- ไม่มี Authorization header → ตรวจสอบว่าใส่ `Bearer ` นำหน้าหรือไม่

### Error 503: Service Unavailable
- Backend ไม่ได้รัน → ตรวจสอบว่า backend รันอยู่
- CORS error → ตรวจสอบว่า origin ถูกเพิ่มใน CORS_ORIGINS
- Firewall block → เปิด port 8000 ใน firewall

### Error 429: Too Many Requests
- เกิน Rate Limit → รอสักครู่หรือเพิ่ม rate_limit

---

## 📞 ติดต่อ

ถ้ามีปัญหาหรือคำถาม ติดต่อได้ที่:
- API Documentation: `http://YOUR_SERVER_IP:8000/docs`
- Swagger UI: `http://YOUR_SERVER_IP:8000/docs`
- ReDoc: `http://YOUR_SERVER_IP:8000/redoc`

---

**Last Updated**: 2024  
**API Version**: 1.0.0

