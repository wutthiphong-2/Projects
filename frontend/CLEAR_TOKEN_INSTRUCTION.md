# วิธีเคลียร์ Token และ Login ใหม่

## ขั้นตอนที่ 1: เคลียร์ Token เก่า

1. เปิด Browser Console (F12)
2. ไปที่ Tab "Console"
3. พิมพ์คำสั่งนี้แล้วกด Enter:

```javascript
localStorage.clear()
```

4. Reload หน้าเว็บ (Ctrl+R)

## ขั้นตอนที่ 2: Login ใหม่

1. ไปที่หน้า Login: http://localhost:3000/login
2. ใส่ username และ password
3. กด Login

## ขั้นตอนที่ 3: ไปที่หน้า OU Management

1. หลัง Login สำเร็จ
2. ไปที่หน้า OU Management
3. ข้อมูลจะโหลดขึ้นมา!

---

## หรือใช้วิธีนี้เลยใน Console:

```javascript
// เคลียร์ token เก่า
localStorage.clear();

// Reload หน้า
location.reload();
```

