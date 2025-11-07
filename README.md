# AD Management Web Application (React + Python)

เว็บแอปพลิเคชันสำหรับจัดการ Active Directory ที่ใช้ React สำหรับ Frontend และ Python FastAPI สำหรับ Backend

## คุณสมบัติหลัก

- จัดการผู้ใช้ (Users) ใน Active Directory
- จัดการกลุ่ม (Groups) และสมาชิก
- จัดการ Organizational Units (OUs)
- ค้นหาและกรองข้อมูลผู้ใช้
- สร้าง แก้ไข และลบผู้ใช้
- รีเซ็ตรหัสผ่าน
- เปิด/ปิดการใช้งานบัญชีผู้ใช้

## โครงสร้างโปรเจค

```
ad-management-web/
├── backend/                 # Python FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── models/
│   │   ├── routers/
│   │   ├── services/
│   │   └── utils/
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   └── App.js
│   ├── package.json
│   └── README.md
└── README.md
```

## การติดตั้ง

### Backend (Python)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### Frontend (React)
```bash
cd frontend
npm install
npm start
```

## การตั้งค่า

1. คัดลอกไฟล์ `.env.example` เป็น `.env` ในโฟลเดอร์ backend
2. แก้ไขการตั้งค่าการเชื่อมต่อ Active Directory:

```
LDAP_URL=ldap://your-domain-controller:389
LDAP_BASE_DN=DC=yourdomain,DC=com
LDAP_BIND_DN=CN=admin,CN=Users,DC=yourdomain,DC=com
LDAP_BIND_PASSWORD=your-password
JWT_SECRET=your-jwt-secret
```

## เทคโนโลยีที่ใช้

- **Backend**: Python, FastAPI, python-ldap, SQLAlchemy
- **Frontend**: React, Axios, Material-UI หรือ Ant Design
- **Authentication**: JWT
- **Security**: CORS, Rate Limiting

## การใช้งาน

1. เข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ
2. เลือกเมนูที่ต้องการจัดการ
3. ใช้ฟังก์ชันค้นหาเพื่อหาผู้ใช้
4. คลิกเพื่อแก้ไขหรือจัดการผู้ใช้

## API Endpoints

- `POST /api/auth/login` - เข้าสู่ระบบ
- `GET /api/users` - ดึงรายการผู้ใช้
- `POST /api/users` - สร้างผู้ใช้ใหม่
- `PUT /api/users/{dn}` - แก้ไขผู้ใช้
- `DELETE /api/users/{dn}` - ลบผู้ใช้
- `PATCH /api/users/{dn}/toggle-status` - เปิด/ปิดบัญชีผู้ใช้# Projects
