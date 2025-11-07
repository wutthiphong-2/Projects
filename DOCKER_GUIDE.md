# 🐳 Docker Guide: เปิด Backend API ให้คนอื่นเข้าถึงได้

## 📋 ข้อดีของ Docker

- ✅ Portable - รันได้ทุกที่ที่มี Docker
- ✅ Isolated - แยก environment ออกจากเครื่อง
- ✅ Easy to Deploy - Deploy ไป cloud ได้ง่าย
- ✅ Consistent - ทำงานเหมือนกันทุกเครื่อง

---

## 🚀 Quick Start

### 1. ติดตั้ง Docker Desktop

**Windows:**
- Download: https://www.docker.com/products/docker-desktop/
- Install และ restart เครื่อง

**ตรวจสอบ:**
```powershell
docker --version
docker-compose --version
```

### 2. Build และ Run

```powershell
# Build Docker image
docker-compose build

# Start services
docker-compose up -d

# ดู logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Backend จะรันที่ `http://localhost:8000`

---

## 🌐 เปิดให้คนอื่นเข้าถึงได้

### วิธีที่ 1: Docker + ngrok (แนะนำ)

**สร้าง script:**

```powershell
# start_docker_ngrok.bat
docker-compose up -d
timeout /t 5
ngrok http 8000
```

**รัน:**
```powershell
.\start_docker_ngrok.bat
```

**ได้ public URL จาก ngrok**

---

### วิธีที่ 2: Docker + Cloudflare Tunnel

```powershell
# 1. Start Docker
docker-compose up -d

# 2. Start Cloudflare Tunnel
cloudflared tunnel --url http://localhost:8000

# 3. ได้ public URL
```

---

### วิธีที่ 3: Deploy บน Cloud (Free)

#### Railway.app (แนะนำ)

**1. ติดตั้ง Railway CLI:**
```powershell
npm install -g @railway/cli
```

**2. Login:**
```powershell
railway login
```

**3. Deploy:**
```powershell
cd backend
railway init
railway up
```

**4. ได้ public URL ฟรี!**

---

#### Render.com

**1. เชื่อมต่อ GitHub repository**

**2. สร้าง Web Service**
- Build Command: `cd backend && pip install -r requirements.txt`
- Start Command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000`

**3. Deploy - ได้ public URL ฟรี!**

---

#### Fly.io

**1. ติดตั้ง flyctl:**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

**2. Login:**
```powershell
fly auth login
```

**3. Deploy:**
```powershell
cd backend
fly launch
```

**4. ได้ public URL ฟรี!**

---

### วิธีที่ 4: Docker + Port Forwarding

```powershell
# Forward port 8000 จาก container ไปยัง public IP
docker run -d -p 172.21.66.36:8000:8000 --name backend ad-management-backend
```

**ใช้: `http://172.21.66.36:8000`**

---

## 📦 Docker Commands

### Build และ Run
```powershell
# Build image
docker build -t ad-management-backend ./backend

# Run container
docker run -d -p 8000:8000 --name backend ad-management-backend

# Stop container
docker stop backend

# Remove container
docker rm backend

# View logs
docker logs -f backend
```

### Docker Compose
```powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f backend

# Rebuild
docker-compose up -d --build

# Execute command in container
docker-compose exec backend bash
```

---

## 🌟 แนะนำ: Railway + Docker

**Railway มี免費 tier และรองรับ Docker:**

1. **Sign up:** https://railway.app
2. **เชื่อมต่อ GitHub repository**
3. **Railway จะ auto-detect Dockerfile**
4. **Deploy - ได้ public HTTPS URL ทันที!**

**ข้อดี:**
- ✅ ฟรี
- ✅ HTTPS ฟรี
- ✅ Custom domain
- ✅ Auto-deploy จาก GitHub
- ✅ Environment variables
- ✅ Logs และ metrics

---

## 🔧 ตัวอย่าง docker-compose.yml สำหรับ Production

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      # Production environment variables
      LDAP_URL: ${LDAP_URL}
      LDAP_BASE_DN: ${LDAP_BASE_DN}
      # ... other variables
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - backend-network

networks:
  backend-network:
    driver: bridge
```

---

## 📝 Environment Variables

สร้างไฟล์ `.env` ใน backend:

```env
# .env
LDAP_URL=ldap://your-ldap-server:389
LDAP_BASE_DN=DC=tbkk,DC=co,DC=th
LDAP_BIND_DN=CN=admin,CN=Users,DC=tbkk,DC=co,DC=th
LDAP_BIND_PASSWORD=your-password
JWT_SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

---

## 🎯 Deployment Options

| Platform | Cost | Difficulty | Best For |
|----------|------|-----------|----------|
| Railway | Free | ⭐⭐ | Quick deploy |
| Render | Free | ⭐⭐ | Simple apps |
| Fly.io | Free | ⭐⭐⭐ | Global edge |
| Heroku | $$$ | ⭐⭐ | Legacy |
| AWS/GCP | $$-$$$ | ⭐⭐⭐⭐ | Enterprise |

---

## ✅ Checklist

- [ ] ติดตั้ง Docker Desktop
- [ ] Build Docker image
- [ ] ทดสอบรันบน localhost
- [ ] Setup environment variables
- [ ] Deploy ไป cloud platform
- [ ] ทดสอบ public URL
- [ ] Update frontend config

---

## 🆘 Troubleshooting

### Port already in use
```powershell
# ดูว่าใครใช้ port 8000
netstat -ano | findstr :8000

# Kill process
taskkill /PID <PID> /F

# หรือเปลี่ยน port
# แก้ไขใน docker-compose.yml
ports:
  - "8080:8000"  # Use 8080 instead
```

### Docker daemon not running
```powershell
# Start Docker Desktop
# หรือ
service docker start
```

### Container cannot access host services
```powershell
# ใช้ host.docker.internal แทน localhost
# ใน container
```

---

## 📞 Help

- Docker Docs: https://docs.docker.com
- Docker Compose: https://docs.docker.com/compose/
- Railway: https://railway.app/docs
- Render: https://render.com/docs























