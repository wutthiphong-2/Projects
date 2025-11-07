# AD Management Web Application

## การติดตั้งและรันโปรเจค

### 1. ติดตั้ง Backend (Python)

```bash
# เข้าไปในโฟลเดอร์ backend
cd backend

# สร้าง virtual environment
python -m venv venv

# เปิดใช้งาน virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# ติดตั้ง dependencies
pip install -r requirements.txt

# คัดลอกไฟล์ environment
cp env.example .env

# แก้ไขไฟล์ .env ตามการตั้งค่าของคุณ
# LDAP_URL=ldap://your-domain-controller:389
# LDAP_BASE_DN=DC=yourdomain,DC=com
# LDAP_BIND_DN=CN=admin,CN=Users,DC=yourdomain,DC=com
# LDAP_BIND_PASSWORD=your-password

# รันเซิร์ฟเวอร์
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. ติดตั้ง Frontend (React)

```bash
# เข้าไปในโฟลเดอร์ frontend
cd frontend

# ติดตั้ง dependencies
npm install

# รันแอปพลิเคชัน
npm start
```

### 3. เข้าถึงแอปพลิเคชัน

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## การใช้งาน

1. เข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ Active Directory
2. ใช้เมนูด้านบนเพื่อนำทางไปยังส่วนต่างๆ:
   - แดชบอร์ด: ดูข้อมูลสรุป
   - จัดการผู้ใช้: สร้าง แก้ไข ลบผู้ใช้
   - จัดการกลุ่ม: สร้าง แก้ไข ลบกลุ่ม
   - จัดการ OU: สร้าง แก้ไข ลบ Organizational Units

## คุณสมบัติหลัก

- ✅ การจัดการผู้ใช้ (Users)
- ✅ การจัดการกลุ่ม (Groups)
- ✅ การจัดการ OU (Organizational Units)
- ✅ การค้นหาและกรองข้อมูล
- ✅ การเปิด/ปิดการใช้งานบัญชีผู้ใช้
- ✅ การแก้ไขข้อมูลผู้ใช้
- ✅ การลบผู้ใช้ กลุ่ม และ OU
- ✅ ระบบ Authentication ด้วย JWT
- ✅ UI ที่ใช้งานง่ายด้วย Ant Design

## การแก้ไขปัญหา

### ปัญหาการเชื่อมต่อ LDAP
- ตรวจสอบการตั้งค่าในไฟล์ `.env`
- ตรวจสอบการเชื่อมต่อเครือข่ายกับ Domain Controller
- ตรวจสอบสิทธิ์ของบัญชีที่ใช้เชื่อมต่อ

### ปัญหา CORS
- ตรวจสอบการตั้งค่า CORS_ORIGINS ในไฟล์ `.env`
- ตรวจสอบว่า Frontend และ Backend รันบนพอร์ตที่ถูกต้อง
