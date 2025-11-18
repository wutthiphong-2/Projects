"""
ตรวจสอบว่า backend server ทำงานอยู่หรือไม่
"""

import requests
import sys
import io

# Fix Unicode encoding for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

API_URL = "http://127.0.0.1:8000"

def check_backend():
    """ตรวจสอบ backend server"""
    try:
        print("🔍 กำลังตรวจสอบ backend server...")
        print(f"🌐 URL: {API_URL}")
        
        # ทดสอบ health check
        response = requests.get(f"{API_URL}/api/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Backend server ทำงานอยู่!")
            print(f"   Status: {data.get('status')}")
            print(f"   Version: {data.get('version')}")
            return True
        else:
            print(f"❌ Backend server ตอบกลับด้วย status code: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ ไม่สามารถเชื่อมต่อกับ backend server ได้")
        print("\n💡 วิธีแก้ไข:")
        print("   1. ตรวจสอบว่า backend server ทำงานอยู่หรือไม่")
        print("   2. รัน backend server ด้วยคำสั่ง:")
        print("      cd backend")
        print("      venv\\Scripts\\activate")
        print("      python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        return False
    except requests.exceptions.Timeout:
        print("❌ การเชื่อมต่อ timeout")
        return False
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
        return False

if __name__ == "__main__":
    success = check_backend()
    sys.exit(0 if success else 1)

