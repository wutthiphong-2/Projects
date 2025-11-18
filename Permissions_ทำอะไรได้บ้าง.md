# 🔑 API Key Permissions - ทำอะไรได้บ้าง?

## 📋 สรุป

เมื่อคุณเลือก Permissions ทั้งหมดนี้ใน API Key คุณจะได้สิทธิ์ **เต็มรูปแบบ (Full Access)** สำหรับการจัดการระบบ Active Directory ผ่าน API

---

## ✅ **1. อ่านข้อมูลผู้ใช้ (users:read)**

### **สิ่งที่ทำได้:**
- ✅ ดึงรายการผู้ใช้ทั้งหมด
- ✅ ค้นหาผู้ใช้ตามเงื่อนไข (ชื่อ, username, email, department)
- ✅ ดูรายละเอียดผู้ใช้แต่ละคน
- ✅ ดูกลุ่มที่ผู้ใช้เป็นสมาชิก
- ✅ ดูประวัติการ Login
- ✅ ดูวันหมดอายุรหัสผ่าน
- ✅ ดูสถิติผู้ใช้ (จำนวนผู้ใช้ทั้งหมด, enabled, disabled)
- ✅ ดูรายชื่อ Department ทั้งหมด
- ✅ ดูรายชื่อกลุ่มที่ผู้ใช้สามารถเข้าถึง

### **API Endpoints ที่ใช้ได้:**
```
GET /api/users/                    # ดึงรายการผู้ใช้ทั้งหมด
GET /api/users/{dn}                # ดูรายละเอียดผู้ใช้
GET /api/users/stats               # สถิติผู้ใช้
GET /api/users/departments         # รายชื่อ Department
GET /api/users/groups              # รายชื่อกลุ่ม
GET /api/users/{dn}/groups         # กลุ่มที่ผู้ใช้เป็นสมาชิก
GET /api/users/{dn}/login-history  # ประวัติการ Login
GET /api/users/{dn}/password-expiry # วันหมดอายุรหัสผ่าน
GET /api/users/login-insights/...  # Insights ต่างๆ
```

### **ตัวอย่างการใช้งาน:**
```python
import requests

API_URL = "http://127.0.0.1:8000"
API_KEY = "ak_xxxxxxxxxxxxxxxxxxx"

headers = {"X-API-Key": API_KEY}

# ดึงรายการผู้ใช้ทั้งหมด
response = requests.get(f"{API_URL}/api/users/", headers=headers)
users = response.json()
print(f"พบ {len(users)} ผู้ใช้")

# ดูรายละเอียดผู้ใช้
response = requests.get(
    f"{API_URL}/api/users/CN=John Doe,OU=Users,DC=example,DC=com",
    headers=headers
)
user = response.json()
print(f"ชื่อ: {user['cn']}")
print(f"Email: {user['mail']}")
print(f"Department: {user['department']}")

# ค้นหาผู้ใช้
response = requests.get(
    f"{API_URL}/api/users/",
    headers=headers,
    params={"q": "John", "department": "IT"}
)
results = response.json()
```

---

## ✅ **2. จัดการผู้ใช้ (users:write)**

### **สิ่งที่ทำได้:**
- ✅ **สร้างผู้ใช้ใหม่** ใน Active Directory
- ✅ **แก้ไขข้อมูลผู้ใช้** (ชื่อ, email, department, โทรศัพท์, ที่อยู่)
- ✅ **เปลี่ยนรหัสผ่าน** ผู้ใช้
- ✅ **เปิด/ปิด Account** (Enable/Disable)
- ✅ **เปลี่ยนชื่อผู้ใช้** (CN)
- ✅ **ย้ายผู้ใช้** ไป OU อื่น
- ✅ **ลบผู้ใช้** ออกจาก Active Directory
- ✅ **ตั้งค่า Account Options**:
  - Password must change at next logon
  - User cannot change password
  - Password never expires
  - Store password using reversible encryption

### **API Endpoints ที่ใช้ได้:**
```
POST   /api/users/                    # สร้างผู้ใช้ใหม่
PUT    /api/users/{dn}                # แก้ไขผู้ใช้ทั้งหมด
PATCH  /api/users/{dn}                # แก้ไขบางส่วน
PATCH  /api/users/{dn}/toggle-status  # เปิด/ปิด Account
DELETE /api/users/{dn}                # ลบผู้ใช้
```

### **ตัวอย่างการใช้งาน:**
```python
# สร้างผู้ใช้ใหม่
new_user = {
    "cn": "John Doe",
    "sAMAccountName": "john.doe",
    "mail": "john.doe@example.com",
    "password": "SecurePass123!",
    "department": "IT",
    "ou": "OU=IT,DC=example,DC=com",
    "groups": ["CN=Domain Users,CN=Users,DC=example,DC=com"],
    "accountDisabled": False,
    "passwordMustChange": True
}

response = requests.post(
    f"{API_URL}/api/users/",
    headers=headers,
    json=new_user
)
result = response.json()
print(f"สร้างผู้ใช้สำเร็จ: {result['dn']}")

# แก้ไขผู้ใช้
update_data = {
    "department": "Engineering",
    "telephoneNumber": "02-123-4567",
    "mobile": "081-234-5678"
}

response = requests.put(
    f"{API_URL}/api/users/CN=John Doe,OU=IT,DC=example,DC=com",
    headers=headers,
    json=update_data
)

# เปิด/ปิด Account
response = requests.patch(
    f"{API_URL}/api/users/CN=John Doe,OU=IT,DC=example,DC=com/toggle-status",
    headers=headers
)

# ลบผู้ใช้
response = requests.delete(
    f"{API_URL}/api/users/CN=John Doe,OU=IT,DC=example,DC=com",
    headers=headers
)
```

---

## ✅ **3. อ่านข้อมูลกลุ่ม (groups:read)**

### **สิ่งที่ทำได้:**
- ✅ ดึงรายการกลุ่มทั้งหมด
- ✅ ค้นหากลุ่มตามเงื่อนไข (ชื่อ, คำอธิบาย)
- ✅ ดูรายละเอียดกลุ่มแต่ละกลุ่ม
- ✅ ดูสมาชิกของกลุ่ม
- ✅ ดูผู้ใช้ที่สามารถเพิ่มเข้าในกลุ่มได้
- ✅ ดูกลุ่มที่จัดหมวดหมู่ (Builtin, Domain Local, Global, etc.)
- ✅ ดูกลุ่มที่แนะนำสำหรับ OU ต่างๆ

### **API Endpoints ที่ใช้ได้:**
```
GET /api/groups/                      # ดึงรายการกลุ่มทั้งหมด
GET /api/groups/{dn}                  # ดูรายละเอียดกลุ่ม
GET /api/groups/{dn}/members          # ดูสมาชิกของกลุ่ม
GET /api/groups/{dn}/available-users  # ผู้ใช้ที่สามารถเพิ่มได้
GET /api/groups/categorized           # กลุ่มที่จัดหมวดหมู่
GET /api/groups/default-groups-by-ou  # กลุ่มที่แนะนำตาม OU
```

### **ตัวอย่างการใช้งาน:**
```python
# ดึงรายการกลุ่มทั้งหมด
response = requests.get(f"{API_URL}/api/groups/", headers=headers)
groups = response.json()
print(f"พบ {len(groups)} กลุ่ม")

# ดูรายละเอียดกลุ่ม
response = requests.get(
    f"{API_URL}/api/groups/CN=Domain Admins,CN=Users,DC=example,DC=com",
    headers=headers
)
group = response.json()
print(f"ชื่อกลุ่ม: {group['cn']}")
print(f"สมาชิก: {group['memberCount']} คน")

# ดูสมาชิกของกลุ่ม
response = requests.get(
    f"{API_URL}/api/groups/CN=Domain Admins,CN=Users,DC=example,DC=com/members",
    headers=headers
)
members = response.json()
for member in members:
    print(f"- {member['cn']}")
```

---

## ✅ **4. จัดการกลุ่ม (groups:write)**

### **สิ่งที่ทำได้:**
- ✅ **สร้างกลุ่มใหม่** ใน Active Directory
- ✅ **แก้ไขข้อมูลกลุ่ม** (ชื่อ, คำอธิบาย, email, ข้อมูลผู้จัดการ)
- ✅ **เพิ่มสมาชิก** เข้าในกลุ่ม
- ✅ **ลบสมาชิก** ออกจากกลุ่ม
- ✅ **ลบกลุ่ม** ออกจาก Active Directory
- ✅ **ตั้งค่าประเภทกลุ่ม**:
  - Security / Distribution
  - Global / Domain Local / Universal

### **API Endpoints ที่ใช้ได้:**
```
POST   /api/groups/                    # สร้างกลุ่มใหม่
PUT    /api/groups/{dn}                # แก้ไขกลุ่ม
DELETE /api/groups/{dn}                # ลบกลุ่ม
POST   /api/groups/{dn}/members        # เพิ่มสมาชิก
DELETE /api/groups/{dn}/members        # ลบสมาชิก
```

### **ตัวอย่างการใช้งาน:**
```python
# สร้างกลุ่มใหม่
new_group = {
    "cn": "IT Staff",
    "description": "IT Department Staff",
    "ou_dn": "OU=IT,DC=example,DC=com",
    "groupType": "Security",
    "groupScope": "Global",
    "mail": "it-staff@example.com"
}

response = requests.post(
    f"{API_URL}/api/groups/",
    headers=headers,
    json=new_group
)
result = response.json()
print(f"สร้างกลุ่มสำเร็จ: {result['dn']}")

# เพิ่มสมาชิกเข้าในกลุ่ม
member_dn = "CN=John Doe,OU=IT,DC=example,DC=com"

response = requests.post(
    f"{API_URL}/api/groups/CN=IT Staff,OU=IT,DC=example,DC=com/members",
    headers=headers,
    json={"user_dn": member_dn}
)

# ลบสมาชิกออกจากกลุ่ม
response = requests.delete(
    f"{API_URL}/api/groups/CN=IT Staff,OU=IT,DC=example,DC=com/members",
    headers=headers,
    json={"user_dn": member_dn}
)

# แก้ไขกลุ่ม
update_data = {
    "description": "Updated description",
    "managedBy": "CN=Manager,OU=IT,DC=example,DC=com"
}

response = requests.put(
    f"{API_URL}/api/groups/CN=IT Staff,OU=IT,DC=example,DC=com",
    headers=headers,
    json=update_data
)

# ลบกลุ่ม
response = requests.delete(
    f"{API_URL}/api/groups/CN=IT Staff,OU=IT,DC=example,DC=com",
    headers=headers
)
```

---

## ✅ **5. อ่านข้อมูล OU (ous:read)**

### **สิ่งที่ทำได้:**
- ✅ ดึงรายการ OU ทั้งหมด
- ✅ ดูรายละเอียด OU แต่ละ OU
- ✅ ดู OU ที่มีผู้ใช้
- ✅ ดูกลุ่มที่แนะนำสำหรับ OU ต่างๆ
- ✅ ดูโครงสร้าง OU (Parent OU, OU Path)

### **API Endpoints ที่ใช้ได้:**
```
GET /api/ous/                    # ดึงรายการ OU ทั้งหมด
GET /api/ous/{dn}                # ดูรายละเอียด OU
GET /api/ous/user-ous            # OU ที่มีผู้ใช้
GET /api/ous/{dn}/suggested-groups # กลุ่มที่แนะนำสำหรับ OU
```

### **ตัวอย่างการใช้งาน:**
```python
# ดึงรายการ OU ทั้งหมด
response = requests.get(f"{API_URL}/api/ous/", headers=headers)
ous = response.json()
print(f"พบ {len(ous)} OU")

# ดูรายละเอียด OU
response = requests.get(
    f"{API_URL}/api/ous/OU=IT,DC=example,DC=com",
    headers=headers
)
ou = response.json()
print(f"ชื่อ OU: {ou['name']}")
print(f"คำอธิบาย: {ou['description']}")

# ดู OU ที่มีผู้ใช้
response = requests.get(
    f"{API_URL}/api/ous/user-ous",
    headers=headers
)
user_ous = response.json()

# ดูกลุ่มที่แนะนำสำหรับ OU
response = requests.get(
    f"{API_URL}/api/ous/OU=IT,DC=example,DC=com/suggested-groups",
    headers=headers
)
suggested_groups = response.json()
```

---

## ✅ **6. จัดการ OU (ous:write)**

### **สิ่งที่ทำได้:**
- ✅ **สร้าง OU ใหม่** ใน Active Directory
- ✅ **แก้ไขข้อมูล OU** (ชื่อ, คำอธิบาย)
- ✅ **ลบ OU** ออกจาก Active Directory
- ✅ **ย้าย OU** ไปตำแหน่งอื่น

### **API Endpoints ที่ใช้ได้:**
```
POST   /api/ous/                    # สร้าง OU ใหม่
PUT    /api/ous/{dn}                # แก้ไข OU
DELETE /api/ous/{dn}                # ลบ OU
```

### **ตัวอย่างการใช้งาน:**
```python
# สร้าง OU ใหม่
new_ou = {
    "name": "NewDepartment",
    "description": "New Department OU",
    "parent_dn": "DC=example,DC=com"
}

response = requests.post(
    f"{API_URL}/api/ous/",
    headers=headers,
    json=new_ou
)
result = response.json()
print(f"สร้าง OU สำเร็จ: {result['dn']}")

# แก้ไข OU
update_data = {
    "description": "Updated description"
}

response = requests.put(
    f"{API_URL}/api/ous/OU=NewDepartment,DC=example,DC=com",
    headers=headers,
    json=update_data
)

# ลบ OU
response = requests.delete(
    f"{API_URL}/api/ous/OU=NewDepartment,DC=example,DC=com",
    headers=headers
)
```

---

## ✅ **7. ดู Activity Log (activity:read)**

### **สิ่งที่ทำได้:**
- ✅ ดู Activity Log ทั้งหมด (การทำงานต่างๆ ในระบบ)
- ✅ ดู Activity Log ตามเงื่อนไข (ผู้ใช้, ประเภทการทำงาน, วันที่)
- ✅ ดูสถิติ Activity Log (จำนวนการทำงาน, ตามประเภท, ตามผู้ใช้)
- ✅ ดู Activity Log ล่าสุด
- ✅ ดูรายการประเภทการทำงาน (Action Types)

### **API Endpoints ที่ใช้ได้:**
```
GET /api/activity-logs/               # ดึง Activity Log
GET /api/activity-logs/recent         # Activity Log ล่าสุด
GET /api/activity-logs/stats          # สถิติ Activity Log
GET /api/activity-logs/action-types   # ประเภทการทำงาน
```

### **ตัวอย่างการใช้งาน:**
```python
# ดึง Activity Log
response = requests.get(
    f"{API_URL}/api/activity-logs/",
    headers=headers,
    params={
        "page": 1,
        "page_size": 50,
        "action_type": "user_create",
        "date_from": "2024-01-01T00:00:00Z",
        "date_to": "2024-12-31T23:59:59Z"
    }
)
logs = response.json()
print(f"พบ {logs['total']} activities")

# ดู Activity Log ล่าสุด
response = requests.get(
    f"{API_URL}/api/activity-logs/recent",
    headers=headers,
    params={"limit": 10}
)
recent = response.json()

# ดูสถิติ Activity Log
response = requests.get(
    f"{API_URL}/api/activity-logs/stats",
    headers=headers,
    params={"days": 30}
)
stats = response.json()
print(f"Total Actions: {stats['total_actions']}")
print(f"By Action Type: {stats['by_action_type']}")
print(f"Top Users: {stats['by_user']}")
```

---

## ✅ **8. จัดการ API Keys (api_keys:manage)**

### **สิ่งที่ทำได้:**
- ✅ **สร้าง API Key ใหม่**
- ✅ **ดูรายการ API Keys** ทั้งหมด
- ✅ **ดูรายละเอียด API Key**
- ✅ **แก้ไข API Key** (ชื่อ, คำอธิบาย, Rate Limit, Permissions)
- ✅ **Regenerate API Key** (สร้างใหม่)
- ✅ **เปิด/ปิด API Key** (Activate/Deactivate)
- ✅ **ลบ API Key**
- ✅ **ส่ง Email** API Key ไปให้ผู้อื่นหรือตัวเอง
- ✅ **ดู Available Scopes** (Permissions ที่ใช้ได้)
- ✅ **ดูสถิติการใช้งาน API** (Usage Statistics)
- ✅ **ดูรายการ API Endpoints** ทั้งหมด

### **API Endpoints ที่ใช้ได้:**
```
GET    /api/api-keys/                      # ดึงรายการ API Keys
POST   /api/api-keys/                      # สร้าง API Key ใหม่
GET    /api/api-keys/{key_id}              # ดูรายละเอียด API Key
PUT    /api/api-keys/{key_id}              # แก้ไข API Key
PATCH  /api/api-keys/{key_id}              # แก้ไขบางส่วน
PATCH  /api/api-keys/{key_id}/toggle       # เปิด/ปิด API Key
POST   /api/api-keys/{key_id}/regenerate   # Regenerate API Key
DELETE /api/api-keys/{key_id}              # ลบ API Key
POST   /api/api-keys/{key_id}/send-share   # ส่ง Email แชร์ API Key
POST   /api/api-keys/{key_id}/send-to-self # ส่ง Email ไปให้ตัวเอง
GET    /api/api-keys/scopes                # ดู Available Scopes
GET    /api/api-keys/activity-log          # ดู Activity Log
GET    /api/api-usage/                     # ดูสถิติการใช้งาน
GET    /api/api-endpoints/                 # ดูรายการ Endpoints
```

### **ตัวอย่างการใช้งาน:**
```python
# สร้าง API Key ใหม่
new_key = {
    "name": "My API Key",
    "description": "For integration",
    "rate_limit_per_minute": 60,
    "rate_limit_per_hour": 1000,
    "permissions": ["users:read", "groups:read"]
}

response = requests.post(
    f"{API_URL}/api/api-keys/",
    headers=headers,
    json=new_key
)
result = response.json()
api_key = result['api_key']  # ⚠️ แสดงแค่ครั้งเดียว!
print(f"API Key: {api_key}")

# ดูรายการ API Keys
response = requests.get(f"{API_URL}/api/api-keys/", headers=headers)
keys = response.json()

# ดูรายละเอียด API Key
response = requests.get(
    f"{API_URL}/api/api-keys/{key_id}",
    headers=headers
)
key_info = response.json()

# Regenerate API Key
response = requests.post(
    f"{API_URL}/api/api-keys/{key_id}/regenerate",
    headers=headers
)
new_key = response.json()['api_key']

# ดูสถิติการใช้งาน
response = requests.get(f"{API_URL}/api/api-usage/", headers=headers)
stats = response.json()
print(f"Total Requests: {stats['total_requests']}")
print(f"Requests Today: {stats['requests_today']}")
```

---

## 🎯 **สรุป - Permissions ทั้งหมด**

เมื่อคุณมี **Permissions ทั้งหมด** คุณจะสามารถ:

### **Read Operations (อ่านข้อมูล):**
- ✅ ดึงข้อมูลผู้ใช้, กลุ่ม, OU
- ✅ ค้นหาและกรองข้อมูล
- ✅ ดูรายละเอียดต่างๆ
- ✅ ดู Activity Log และสถิติ

### **Write Operations (จัดการข้อมูล):**
- ✅ สร้างผู้ใช้, กลุ่ม, OU ใหม่
- ✅ แก้ไขข้อมูลทั้งหมด
- ✅ ลบข้อมูล
- ✅ จัดการสมาชิกกลุ่ม
- ✅ เปิด/ปิด Account
- ✅ เปลี่ยนรหัสผ่าน

### **Admin Operations (จัดการระบบ):**
- ✅ สร้างและจัดการ API Keys
- ✅ ดูสถิติการใช้งาน API
- ✅ ดูรายการ Endpoints

---

## 📝 **ตัวอย่างการใช้งานแบบเต็มรูปแบบ**

```python
import requests
from datetime import datetime

API_URL = "http://127.0.0.1:8000"
API_KEY = "ak_xxxxxxxxxxxxxxxxxxx"  # API Key ที่มี Permissions ทั้งหมด

headers = {"X-API-Key": API_KEY}

# 1. ดึงข้อมูลผู้ใช้
users = requests.get(f"{API_URL}/api/users/", headers=headers).json()

# 2. สร้างผู้ใช้ใหม่
new_user = {
    "cn": "Jane Doe",
    "sAMAccountName": "jane.doe",
    "mail": "jane.doe@example.com",
    "password": "SecurePass123!",
    "department": "IT",
    "ou": "OU=IT,DC=example,DC=com"
}
user_result = requests.post(
    f"{API_URL}/api/users/",
    headers=headers,
    json=new_user
).json()

# 3. สร้างกลุ่มใหม่
new_group = {
    "cn": "IT Staff",
    "description": "IT Department",
    "ou_dn": "OU=IT,DC=example,DC=com",
    "groupType": "Security",
    "groupScope": "Global"
}
group_result = requests.post(
    f"{API_URL}/api/groups/",
    headers=headers,
    json=new_group
).json()

# 4. เพิ่มผู้ใช้เข้าในกลุ่ม
requests.post(
    f"{API_URL}/api/groups/{group_result['dn']}/members",
    headers=headers,
    json={"user_dn": user_result['dn']}
)

# 5. ดู Activity Log
logs = requests.get(
    f"{API_URL}/api/activity-logs/",
    headers=headers,
    params={"page": 1, "page_size": 10}
).json()

print(f"สร้างผู้ใช้: {user_result['dn']}")
print(f"สร้างกลุ่ม: {group_result['dn']}")
print(f"Activity Logs: {logs['total']} รายการ")
```

---

## ⚠️ **ข้อควรระวัง**

1. **API Key นี้มีสิทธิ์เต็มรูปแบบ** - ใช้ด้วยความระมัดระวัง
2. **เก็บ API Key ในที่ปลอดภัย** - อย่าแชร์กับคนอื่น
3. **ตรวจสอบ Rate Limit** - อย่าเรียก API เกิน limit ที่ตั้งไว้
4. **ตรวจสอบ Activity Log** - ดูว่ามีการใช้ API Key แบบผิดปกติหรือไม่
5. **หมั่น Rotate API Key** - เปลี่ยน API Key เป็นประจำเพื่อความปลอดภัย

---

## 💡 **Tip**

- ใช้ API Key ที่มี **Permissions เฉพาะที่จำเป็น** แทนที่จะให้ทุก Permission
- แยก API Key สำหรับ:
  - **Read-only** operations (users:read, groups:read)
  - **Write** operations (users:write, groups:write)
  - **Admin** operations (api_keys:manage)

---

**พร้อมใช้งาน!** 🎉

