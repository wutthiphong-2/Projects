# ⚙️ วิธีตั้งค่า SMTP ตอนสร้าง API Key

## 📋 สรุป

ตอนนี้คุณสามารถ**กำหนด SMTP settings** ตอนสร้าง API Key ได้แล้ว! 🎉

ระบบจะใช้ SMTP settings ที่คุณกำหนด**เฉพาะสำหรับ API Key นั้นๆ** ถ้าไม่กำหนดจะใช้ SMTP settings จากระบบ (backend/.env)

---

## ✅ **ฟีเจอร์ใหม่**

### **1. เพิ่ม SMTP Config ในหน้า Frontend**

เมื่อสร้าง API Key ใหม่และเลือก **"ส่งอีเมลแจ้งเตือนเมื่อสร้าง"**:
- ✅ จะเห็น Collapse section **"⚙️ ตั้งค่า SMTP (Optional)"**
- ✅ สามารถกำหนด SMTP settings เฉพาะสำหรับ API Key นั้นได้
- ✅ ถ้าไม่กรอก จะใช้ SMTP settings จากระบบ (backend/.env)

### **2. SMTP Settings ที่สามารถกำหนดได้:**

| Field | Description | ตัวอย่าง |
|-------|-------------|----------|
| **SMTP Host** | SMTP server address | `smtp.gmail.com` |
| **SMTP Port** | SMTP server port | `587` (TLS) หรือ `465` (SSL) |
| **SMTP Username** | Username สำหรับ authentication | `your-email@gmail.com` |
| **SMTP Password** | Password สำหรับ authentication | `your-app-password` |
| **From Email** | อีเมลที่แสดงว่า "ส่งจาก" | `noreply@example.com` |
| **From Name** | ชื่อที่แสดงว่า "ส่งจาก" | `API Management` |
| **ใช้ TLS/SSL** | ใช้ TLS/SSL หรือไม่ | ✅ (checked) หรือ ❌ (unchecked) |

---

## 🎯 **วิธีใช้งาน**

### **1. สร้าง API Key พร้อม SMTP Settings**

#### **ขั้นตอน:**

1. **เปิดหน้า API Management:**
   - Login เข้าระบบ
   - ไปหน้า **API Management**

2. **คลิก "สร้าง API Key"**

3. **กรอกข้อมูลพื้นฐาน:**
   - ชื่อ API Key
   - คำอธิบาย
   - Rate Limit
   - Permissions
   - วันหมดอายุ (Optional)

4. **เลือก "ส่งอีเมลแจ้งเตือนเมื่อสร้าง"**

5. **กรอกอีเมลผู้รับ**

6. **ขยาย "⚙️ ตั้งค่า SMTP (Optional)":**
   - กรอก SMTP settings ที่ต้องการ
   - หรือเว้นว่างเพื่อใช้ค่าเริ่มต้นจากระบบ

7. **คลิก "สร้าง"**

---

### **2. ตัวอย่างการใช้งาน**

#### **ตัวอย่างที่ 1: ใช้ SMTP ของ Gmail**

```json
{
  "name": "Production API Key",
  "description": "For production use",
  "rate_limit_per_minute": 60,
  "rate_limit_per_hour": 1000,
  "permissions": ["users:read", "groups:read"],
  "send_email": true,
  "user_email": "user@example.com",
  "smtp_config": {
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_username": "your-email@gmail.com",
    "smtp_password": "your-app-password",
    "smtp_use_tls": true,
    "from_email": "noreply@example.com",
    "from_name": "API Management"
  }
}
```

#### **ตัวอย่างที่ 2: ใช้ SMTP ของ Office 365**

```json
{
  "name": "Office 365 API Key",
  "send_email": true,
  "user_email": "user@example.com",
  "smtp_config": {
    "smtp_host": "smtp.office365.com",
    "smtp_port": 587,
    "smtp_username": "user@example.com",
    "smtp_password": "your-password",
    "smtp_use_tls": true,
    "from_email": "api@example.com",
    "from_name": "API Management System"
  }
}
```

#### **ตัวอย่างที่ 3: ใช้ค่าเริ่มต้นจากระบบ**

```json
{
  "name": "Default SMTP API Key",
  "send_email": true,
  "user_email": "user@example.com"
  // ไม่ระบุ smtp_config → จะใช้ SMTP settings จาก backend/.env
}
```

---

## 🔧 **API Endpoint**

### **POST `/api/api-keys/`**

#### **Request Body:**

```json
{
  "name": "My API Key",
  "description": "For testing",
  "rate_limit_per_minute": 60,
  "rate_limit_per_hour": 1000,
  "permissions": ["users:read"],
  "expires_at": "2025-12-31 23:59:59",
  "send_email": true,
  "user_email": "test@example.com",
  "smtp_config": {
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_username": "your-email@gmail.com",
    "smtp_password": "your-password",
    "smtp_use_tls": true,
    "from_email": "noreply@example.com",
    "from_name": "API Management"
  }
}
```

#### **Response:**

```json
{
  "id": "abc123",
  "api_key": "ak_xxxxxxxxxxxxxxxxxxx",
  "name": "My API Key",
  "description": "For testing",
  "created_by": "administrator",
  "created_at": "2024-01-01T00:00:00",
  "rate_limit_per_minute": 60,
  "rate_limit_per_hour": 1000,
  "is_active": true,
  "permissions": ["users:read"]
}
```

---

## 📊 **การทำงานของระบบ**

### **1. Priority ของ SMTP Settings:**

1. **SMTP Config ที่กำหนดตอนสร้าง API Key** (ถ้ามี)
2. **SMTP Settings จาก backend/.env** (fallback)

### **2. การ Merge Settings:**

ระบบจะ **merge** SMTP settings ตามลำดับ:
- ถ้ากำหนด `smtp_host` ใน `smtp_config` → ใช้ค่าที่กำหนด
- ถ้าไม่กำหนด → ใช้ค่าจาก `backend/.env`
- เหมือนกันกับ settings อื่นๆ

### **3. ตัวอย่างการ Merge:**

#### **Scenario 1: กำหนดทุกอย่าง**
```python
# smtp_config ที่ส่งมา
{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_username": "custom@gmail.com",
  "smtp_password": "custom-password",
  "smtp_use_tls": true,
  "from_email": "custom@example.com",
  "from_name": "Custom Name"
}

# ผลลัพธ์: ใช้ค่าทั้งหมดจาก smtp_config
```

#### **Scenario 2: กำหนดบางส่วน**
```python
# smtp_config ที่ส่งมา
{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587
  # ไม่กำหนด smtp_username, smtp_password, etc.
}

# ผลลัพธ์: ใช้ smtp_host และ smtp_port จาก smtp_config
#          ใช้ smtp_username, smtp_password, etc. จาก backend/.env
```

#### **Scenario 3: ไม่กำหนดเลย**
```python
# ไม่มี smtp_config หรือ smtp_config เป็น {}
# ผลลัพธ์: ใช้ SMTP settings ทั้งหมดจาก backend/.env
```

---

## 🎨 **UI/UX**

### **หน้า Frontend:**

1. **เมื่อเลือก "ส่งอีเมลแจ้งเตือนเมื่อสร้าง":**
   - ✅ Collapse section **"⚙️ ตั้งค่า SMTP (Optional)"** จะแสดงขึ้นมา
   - ✅ สามารถขยาย/ย่อเพื่อกรอก SMTP settings ได้

2. **SMTP Settings Form:**
   - ✅ แบ่งเป็น 3 แถว (Rows)
   - ✅ Row 1: SMTP Host, SMTP Port
   - ✅ Row 2: SMTP Username, SMTP Password (Password field)
   - ✅ Row 3: From Email, From Name
   - ✅ Checkbox: ใช้ TLS/SSL
   - ✅ ข้อความ: "💡 หากไม่กรอก จะใช้ SMTP settings จากระบบ"

3. **Validation:**
   - ✅ SMTP Port: 1-65535
   - ✅ Password: แสดงเป็น `***` (Password field)
   - ✅ Email: ตรวจสอบ format (สำหรับ From Email)

---

## ⚠️ **ข้อควรระวัง**

### **1. ความปลอดภัย:**

- ⚠️ **SMTP Password** ถูกส่งผ่าน HTTP request (ควรใช้ HTTPS)
- ⚠️ **ไม่เก็บ SMTP Password** ใน database - ใช้แค่ตอนส่งอีเมล
- ⚠️ **เก็บ SMTP settings ในที่ปลอดภัย**

### **2. การใช้งาน:**

- ✅ **SMTP settings ใช้แค่ตอนสร้าง API Key** - ไม่เก็บไว้ใน database
- ✅ **ถ้าต้องการใช้ SMTP settings อื่น** - ต้องสร้าง API Key ใหม่
- ✅ **ถ้าไม่กำหนด SMTP settings** - ใช้ค่าเริ่มต้นจากระบบ

### **3. SMTP Server:**

- ✅ **ตรวจสอบ SMTP server** ว่าใช้งานได้ก่อน
- ✅ **ทดสอบการส่งอีเมล** ก่อนใช้งานจริง
- ✅ **ใช้ App Password** สำหรับ Gmail (ไม่ใช่รหัสผ่านปกติ)

---

## 🧪 **วิธีทดสอบ**

### **1. ทดสอบด้วย cURL:**

```bash
curl -X POST "http://localhost:8000/api/api-keys/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API Key",
    "description": "Testing SMTP config",
    "rate_limit_per_minute": 60,
    "rate_limit_per_hour": 1000,
    "permissions": ["users:read"],
    "send_email": true,
    "user_email": "test@example.com",
    "smtp_config": {
      "smtp_host": "smtp.gmail.com",
      "smtp_port": 587,
      "smtp_username": "your-email@gmail.com",
      "smtp_password": "your-app-password",
      "smtp_use_tls": true,
      "from_email": "noreply@example.com",
      "from_name": "API Management"
    }
  }'
```

### **2. ทดสอบด้วย Frontend:**

1. เปิดหน้า API Management
2. คลิก "สร้าง API Key"
3. กรอกข้อมูลและเลือก "ส่งอีเมลแจ้งเตือนเมื่อสร้าง"
4. ขยาย "⚙️ ตั้งค่า SMTP (Optional)"
5. กรอก SMTP settings
6. คลิก "สร้าง"
7. ตรวจสอบอีเมลว่ามี API Key มาหรือไม่

---

## 📝 **สรุป**

### **ฟีเจอร์ใหม่:**

1. ✅ **สามารถกำหนด SMTP settings** ตอนสร้าง API Key
2. ✅ **SMTP settings เป็น Optional** - ถ้าไม่กำหนดใช้ค่าเริ่มต้น
3. ✅ **UI/UX ที่ดี** - Collapse section ที่สะดวก
4. ✅ **Flexible** - สามารถ override แค่บาง settings ได้

### **การใช้งาน:**

- ✅ **กำหนด SMTP settings เต็มรูปแบบ** → ใช้ SMTP server ที่กำหนด
- ✅ **กำหนด SMTP settings บางส่วน** → Merge กับค่าเริ่มต้น
- ✅ **ไม่กำหนด SMTP settings** → ใช้ค่าเริ่มต้นจากระบบ

---

## 💡 **Tip**

1. **ใช้ Gmail:**
   - ต้องสร้าง **App Password** (ไม่ใช่รหัสผ่านปกติ)
   - เปิด 2-Step Verification ก่อน
   - ไปที่ Google Account → Security → App Passwords

2. **ใช้ Office 365:**
   - ใช้ email และ password ปกติ
   - SMTP Host: `smtp.office365.com`
   - Port: `587` (TLS)

3. **ทดสอบก่อนใช้งานจริง:**
   - ทดสอบด้วย email ของตัวเองก่อน
   - ตรวจสอบว่า email มาถึงหรือไม่
   - ตรวจสอบว่า API Key ถูกต้องหรือไม่

---

**พร้อมใช้งานแล้ว!** 🎉

