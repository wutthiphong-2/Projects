# วิธีดู Console Logs

## ขั้นตอนที่ 1: เปิด Browser Console

1. เปิดหน้า OU Management ในเว็บเบราว์เซอร์
2. กด F12 (Windows/Linux) หรือ Cmd+Option+I (Mac)
3. คลิกที่ Tab "Console" ด้านบน

## ขั้นตอนที่ 2: Reload หน้าเว็บ

1. กด Ctrl+R หรือ F5 เพื่อ Reload หน้า
2. รอจนหน้าเว็บโหลดเสร็จ

## ขั้นตอนที่ 3: ดู Logs

ใน Console จะมี logs สีต่างๆ แสดงออกมา:

- 🚀 = กำลังเริ่มโหลด
- 📥 = กำลัง fetch ข้อมูล
- ✅ = สำเร็จ
- ❌ = เกิด error
- ⚠️ = คำเตือน

## ตัวอย่าง Logs ที่ควรเห็น:

```
🚀 ========================================
🚀 Starting to load AD Structure...
🚀 ========================================

📥 Step 1: Fetching data from APIs...
📥 Fetching /api/ous/...
   Page 1: Got 100 items
✅ /api/ous/: Total 25 items

📥 Fetching /api/users/...
   Page 1: Got 100 items
✅ /api/users/: Total 850 items

📥 Fetching /api/groups/...
   Page 1: Got 100 items
✅ /api/groups/: Total 120 items

✅ ========================================
✅ DATA RECEIVED:
✅ - OUs: 25 items
✅ - Users: 850 items
✅ - Groups: 120 items
✅ ========================================
```

## ถ้าเจอ Error:

```
❌ Error fetching /api/ous/: AxiosError: Network Error
```

## ส่งภาพหน้าจอ Console มาให้ดูครับ!

กด PrtScn หรือ Windows+Shift+S เพื่อ capture หน้าจอ Console

