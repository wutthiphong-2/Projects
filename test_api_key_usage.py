"""
ทดสอบ API Key - ตรวจสอบว่าคนอื่นสามารถดึงข้อมูลไปใช้ได้หรือไม่

วิธีใช้งาน:
1. สร้าง API Key จากหน้า API Management
2. คัดลอก API Key
3. ใส่ API Key ในไฟล์นี้
4. รัน script เพื่อทดสอบ

python test_api_key_usage.py
"""

import requests
import json
import sys
import io
from datetime import datetime

# ═══════════════════════════════════════════════════════════
# 🔧 ตั้งค่า - แก้ไขตรงนี้
# ═══════════════════════════════════════════════════════════

API_URL = "http://127.0.0.1:8000"  # ← เปลี่ยน URL ถ้าต้องการ
API_KEY = "ak_LQuhu-rz5DV5cJlnI-pslPA1_vkwC-gM58-7CnR-m7eJXiRDwm49Y0wth6OgPqyv"  # ← ใส่ API Key ที่ได้จากหน้า API Management ตรงนี้

# ═══════════════════════════════════════════════════════════
# 🧪 Helper Functions
# ═══════════════════════════════════════════════════════════

def print_header(text):
    """พิมพ์หัวข้อ"""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)

def print_success(text):
    """พิมพ์ข้อความสำเร็จ"""
    print(f"✅ {text}")

def print_error(text):
    """พิมพ์ข้อความ error"""
    print(f"❌ {text}")

def print_info(text):
    """พิมพ์ข้อความข้อมูล"""
    print(f"ℹ️  {text}")

def print_warning(text):
    """พิมพ์ข้อความ warning"""
    print(f"⚠️  {text}")

# Fix Unicode encoding for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ═══════════════════════════════════════════════════════════
# 🔑 วิธีได้ API Key
# ═══════════════════════════════════════════════════════════

def show_how_to_get_api_key():
    """แสดงวิธีได้ API Key"""
    print_header("วิธีได้ API Key")
    print("📋 ขั้นตอนการได้ API Key:")
    print()
    print("1️⃣  Login เข้าระบบ")
    print("   → เปิด http://localhost:3000")
    print("   → Login ด้วย username และ password")
    print()
    print("2️⃣  ไปหน้า API Management")
    print("   → คลิกเมนู 'API Management' (ไอคอนกุญแจ 🔑)")
    print()
    print("3️⃣  สร้าง API Key")
    print("   → คลิกปุ่ม 'สร้าง API Key' (+)")
    print("   → กรอกข้อมูล:")
    print("      • ชื่อ: เช่น 'My Test API Key'")
    print("      • คำอธิบาย: เช่น 'สำหรับทดสอบ'")
    print("      • Rate Limit: เช่น 60/min, 1000/hour")
    print("      • Permissions: เลือกตามต้องการ")
    print("        - users:read → อ่านข้อมูลผู้ใช้")
    print("        - groups:read → อ่านข้อมูลกลุ่ม")
    print("        - ous:read → อ่านข้อมูล OU")
    print("        - activity:read → ดู Activity Log")
    print("   → คลิก 'สร้าง'")
    print()
    print("4️⃣  คัดลอก API Key")
    print("   → ⚠️  สำคัญ: API Key แสดงแค่ครั้งเดียว!")
    print("   → คลิกปุ่ม 'Copy' (📋) เพื่อคัดลอก")
    print("   → เก็บ API Key ไว้ในที่ปลอดภัย")
    print()
    print_warning("⚠️  API Key คือรหัสผ่าน - อย่าแชร์กับคนอื่น!")

# ═══════════════════════════════════════════════════════════
# 🧪 ทดสอบ API Key
# ═══════════════════════════════════════════════════════════

def test_api_with_key(method, endpoint, api_key, params=None, data=None, description=""):
    """ทดสอบเรียก API ด้วย API Key"""
    try:
        url = f"{API_URL}{endpoint}"
        headers = {
            "X-API-Key": api_key
        }
        
        print_info(f"URL: {url}")
        print_info(f"Method: {method}")
        print_info(f"API Key: {api_key[:20]}...")
        
        # เรียก API
        if method == "GET":
            response = requests.get(url, headers=headers, params=params, timeout=10)
        elif method == "POST":
            headers["Content-Type"] = "application/json"
            response = requests.post(url, headers=headers, params=params, json=data, timeout=10)
        elif method == "PUT":
            headers["Content-Type"] = "application/json"
            response = requests.put(url, headers=headers, params=params, json=data, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, params=params, timeout=10)
        else:
            print_error(f"Method {method} ไม่รองรับ")
            return False
        
        # ดูผลลัพธ์
        print(f"\n📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print_success(f"สำเร็จ! - {description}")
            try:
                result = response.json()
                
                # แสดงข้อมูลคร่าวๆ
                if isinstance(result, list):
                    print(f"📄 Response: Array with {len(result)} items")
                    if len(result) > 0:
                        print(f"   ตัวอย่าง: {json.dumps(result[0] if isinstance(result[0], dict) else str(result[0])[:100], ensure_ascii=False)}")
                elif isinstance(result, dict):
                    print(f"📄 Response: Object")
                    if "total" in result:
                        print(f"   Total: {result.get('total')}")
                    if "items" in result:
                        print(f"   Items: {len(result.get('items', []))}")
                    # แสดงบางฟิลด์สำคัญ
                    keys = list(result.keys())[:5]
                    print(f"   Keys: {', '.join(keys)}")
                else:
                    print(f"📄 Response: {str(result)[:200]}")
                
                return True
            except json.JSONDecodeError:
                print(f"📄 Response (Text): {response.text[:200]}")
                return True
                
        elif response.status_code == 401:
            print_error("Unauthorized - API Key ไม่ถูกต้องหรือหมดอายุ")
            print(f"📄 Response: {response.text}")
            return False
            
        elif response.status_code == 403:
            print_error("Forbidden - API Key ไม่มี permission สำหรับ endpoint นี้")
            try:
                error_data = response.json()
                required_scope = error_data.get('required_scope', 'N/A')
                print_info(f"Required Scope: {required_scope}")
            except:
                pass
            print(f"📄 Response: {response.text}")
            return False
            
        elif response.status_code == 404:
            print_error("Not Found - Endpoint ไม่พบ")
            print(f"📄 Response: {response.text}")
            return False
            
        elif response.status_code == 429:
            print_error("Too Many Requests - เกิน rate limit แล้ว")
            try:
                error_data = response.json()
                print_info(f"Limit Type: {error_data.get('limit_type', 'N/A')}")
                print_info(f"Current: {error_data.get('current', 'N/A')}")
                print_info(f"Limit: {error_data.get('limit', 'N/A')}")
            except:
                pass
            return False
            
        elif response.status_code == 500:
            print_error(f"เกิดข้อผิดพลาด: {response.status_code}")
            # Check if it's actually a permission error in disguise
            error_text = response.text.lower()
            if "permission" in error_text or "forbidden" in error_text or "unauthorized" in error_text:
                print_warning("⚠️  น่าจะเป็น Permission Error (ควรเป็น 403 ไม่ใช่ 500)")
            print(f"📄 Response: {response.text[:500]}")
            return False
            
        else:
            print_error(f"เกิดข้อผิดพลาด: {response.status_code}")
            print(f"📄 Response: {response.text[:500]}")
            return False
            
    except requests.exceptions.ConnectionError:
        print_error(f"ไม่สามารถเชื่อมต่อกับ {API_URL} ได้")
        print_info("ตรวจสอบว่า backend server ทำงานอยู่หรือไม่")
        return False
    except requests.exceptions.Timeout:
        print_error("การเชื่อมต่อ timeout")
        return False
    except Exception as e:
        print_error(f"เกิดข้อผิดพลาด: {e}")
        return False

# ═══════════════════════════════════════════════════════════
# 🧪 ทดสอบ Permissions
# ═══════════════════════════════════════════════════════════

def test_permissions(api_key):
    """ทดสอบ Permissions ของ API Key"""
    print_header("ทดสอบ Permissions")
    
    print_info("ทดสอบว่าคุณมี permission อะไรบ้าง...")
    print()
    
    tests = [
        {
            "method": "GET",
            "endpoint": "/api/users/",
            "required_scope": "users:read",
            "description": "ดึงข้อมูลผู้ใช้ (users:read)"
        },
        {
            "method": "GET",
            "endpoint": "/api/groups/",
            "required_scope": "groups:read",
            "description": "ดึงข้อมูลกลุ่ม (groups:read)"
        },
        {
            "method": "GET",
            "endpoint": "/api/ous/",
            "required_scope": "ous:read",
            "description": "ดึงข้อมูล OU (ous:read)"
        },
        {
            "method": "GET",
            "endpoint": "/api/activity-logs/",
            "required_scope": "activity:read",
            "description": "ดู Activity Log (activity:read)"
        },
        {
            "method": "POST",
            "endpoint": "/api/users/",
            "required_scope": "users:write",
            "description": "สร้างผู้ใช้ (users:write) - ต้องมี permission write"
        },
        {
            "method": "POST",
            "endpoint": "/api/groups/",
            "required_scope": "groups:write",
            "description": "สร้างกลุ่ม (groups:write) - ต้องมี permission write"
        },
    ]
    
    results = []
    for test in tests:
        print(f"\n{'─' * 70}")
        print(f"ทดสอบ: {test['description']}")
        print(f"Required Scope: {test['required_scope']}")
        
        success = test_api_with_key(
            method=test["method"],
            endpoint=test["endpoint"],
            api_key=api_key,
            description=test["description"]
        )
        
        if success:
            print_success(f"✅ คุณมี permission: {test['required_scope']}")
        else:
            # Check if it's a write permission test (expected to fail without write permission)
            if ":write" in test['required_scope']:
                print_info(f"ℹ️  คุณไม่มี permission: {test['required_scope']} (เป็นเรื่องปกติถ้า API Key มีแค่ read)")
            else:
                print_warning(f"⚠️  คุณไม่มี permission: {test['required_scope']}")
        
        results.append({
            "test": test["description"],
            "scope": test["required_scope"],
            "success": success
        })
    
    # สรุป
    print_header("สรุปผลการทดสอบ Permissions")
    print()
    print("📊 Permissions ที่คุณมี:")
    print()
    
    for result in results:
        if result["success"]:
            status = "✅ มี"
        else:
            status = "❌ ไม่มี"
        
        print(f"{status} - {result['scope']} ({result['test']})")

# ═══════════════════════════════════════════════════════════
# 🧪 ทดสอบ Rate Limit
# ═══════════════════════════════════════════════════════════

def test_rate_limit(api_key):
    """ทดสอบ Rate Limit"""
    print_header("ทดสอบ Rate Limit")
    
    print_info("ทดสอบเรียก API หลายครั้งติดต่อกัน...")
    print()
    
    success_count = 0
    rate_limit_hit = False
    
    for i in range(1, 21):  # เรียก 20 ครั้ง
        print(f"📞 เรียกครั้งที่ {i}/20...", end=" ")
        
        response = requests.get(
            f"{API_URL}/api/users/",
            headers={"X-API-Key": api_key},
            params={"page": 1, "page_size": 1},
            timeout=5
        )
        
        if response.status_code == 200:
            success_count += 1
            print("✅ สำเร็จ")
        elif response.status_code == 429:
            rate_limit_hit = True
            print(f"❌ Rate Limit Hit! (429)")
            print_info(f"คุณสามารถเรียกได้ {success_count} ครั้งก่อนที่จะ hit rate limit")
            
            # แสดงข้อมูล rate limit
            try:
                error_data = response.json()
                print_info(f"Limit Type: {error_data.get('limit_type', 'N/A')}")
                print_info(f"Current: {error_data.get('current', 'N/A')}")
                print_info(f"Limit: {error_data.get('limit', 'N/A')}")
            except:
                pass
            
            break
        else:
            print(f"❌ Error: {response.status_code}")
            break
        
        # รอสักครู่เพื่อไม่ให้เร็วเกินไป
        import time
        time.sleep(0.1)
    
    print()
    if not rate_limit_hit:
        print_success(f"✅ เรียก API ได้ {success_count} ครั้งโดยไม่ hit rate limit")
        print_info("Rate Limit ของคุณสูงพอ (อาจสูงกว่า 20 req/min)")

# ═══════════════════════════════════════════════════════════
# 🧪 ทดสอบการใช้งานจริง
# ═══════════════════════════════════════════════════════════

def test_real_usage(api_key):
    """ทดสอบการใช้งานจริง"""
    print_header("ทดสอบการใช้งานจริง")
    
    print_info("ทดสอบว่าคุณสามารถดึงข้อมูลไปใช้ได้จริงหรือไม่...")
    print()
    
    # ทดสอบดึงข้อมูลผู้ใช้
    print("1️⃣  ทดสอบดึงข้อมูลผู้ใช้")
    success1 = test_api_with_key(
        method="GET",
        endpoint="/api/users/",
        api_key=api_key,
        params={"page": 1, "page_size": 5},
        description="ดึงข้อมูลผู้ใช้ 5 คนแรก"
    )
    
    # ทดสอบดึงข้อมูลกลุ่ม
    print("\n2️⃣  ทดสอบดึงข้อมูลกลุ่ม")
    success2 = test_api_with_key(
        method="GET",
        endpoint="/api/groups/",
        api_key=api_key,
        params={"page": 1, "page_size": 5},
        description="ดึงข้อมูลกลุ่ม 5 กลุ่มแรก"
    )
    
    # ทดสอบดึงข้อมูล OU
    print("\n3️⃣  ทดสอบดึงข้อมูล OU")
    success3 = test_api_with_key(
        method="GET",
        endpoint="/api/ous/",
        api_key=api_key,
        params={"page": 1, "page_size": 5},
        description="ดึงข้อมูล OU 5 อันแรก"
    )
    
    # สรุป
    print_header("สรุปผลการทดสอบการใช้งานจริง")
    print()
    passed = sum([success1, success2, success3])
    total = 3
    
    if passed == total:
        print_success(f"✅ ทุกการทดสอบผ่าน! ({passed}/{total})")
        print()
        print("🎉 คุณสามารถใช้ API Key นี้ดึงข้อมูลไปใช้ได้!")
        print()
        print("📝 วิธีใช้งาน:")
        print("   1. ใช้ API Key ใน header: X-API-Key")
        print("   2. เรียก API endpoints ตาม permissions ที่มี")
        print("   3. ตรวจสอบ rate limit ให้ไม่เกินที่ตั้งไว้")
    else:
        print_warning(f"⚠️  มี {total - passed} การทดสอบที่ล้มเหลว ({passed}/{total})")
        print()
        print("🔍 ตรวจสอบ:")
        print("   • API Key ถูกต้องหรือไม่")
        print("   • API Key มี permissions ตามที่ต้องการหรือไม่")
        print("   • Backend server ทำงานอยู่หรือไม่")

# ═══════════════════════════════════════════════════════════
# 📝 ตัวอย่างการใช้งาน
# ═══════════════════════════════════════════════════════════

def show_usage_examples(api_key):
    """แสดงตัวอย่างการใช้งาน API Key"""
    print_header("ตัวอย่างการใช้งาน API Key")
    
    print("📋 ตัวอย่างโค้ดสำหรับคนอื่นที่ต้องการดึงข้อมูลไปใช้:")
    print()
    
    # Python
    print("🐍 Python:")
    print("-" * 70)
    print(f'''import requests

API_URL = "{API_URL}"
API_KEY = "{api_key[:30]}..."

# ดึงข้อมูลผู้ใช้
headers = {{"X-API-Key": API_KEY}}
response = requests.get(f"{{API_URL}}/api/users/", headers=headers)
users = response.json()
print(f"พบ {{len(users)}} ผู้ใช้")

# ดึงข้อมูลกลุ่ม
response = requests.get(f"{{API_URL}}/api/groups/", headers=headers)
groups = response.json()
print(f"พบ {{len(groups)}} กลุ่ม")
''')
    
    # cURL
    print("\n💻 cURL:")
    print("-" * 70)
    print(f'''# ดึงข้อมูลผู้ใช้
curl -X GET "{API_URL}/api/users/" \\
  -H "X-API-Key: {api_key[:30]}..."

# ดึงข้อมูลกลุ่ม
curl -X GET "{API_URL}/api/groups/" \\
  -H "X-API-Key: {api_key[:30]}..."
''')
    
    # JavaScript
    print("\n🌐 JavaScript (Browser/Node.js):")
    print("-" * 70)
    print(f'''const API_URL = "{API_URL}";
const API_KEY = "{api_key[:30]}...";

// ดึงข้อมูลผู้ใช้
fetch(`${{API_URL}}/api/users/`, {{
  headers: {{
    "X-API-Key": API_KEY
  }}
}})
.then(res => res.json())
.then(users => {{
  console.log(`พบ ${{users.length}} ผู้ใช้`);
}});
''')
    
    # PHP
    print("\n🐘 PHP:")
    print("-" * 70)
    print(f'''<?php
$apiUrl = "{API_URL}";
$apiKey = "{api_key[:30]}...";

// ดึงข้อมูลผู้ใช้
$ch = curl_init($apiUrl . "/api/users/");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "X-API-Key: " . $apiKey
]);

$response = curl_exec($ch);
$users = json_decode($response, true);
echo "พบ " . count($users) . " ผู้ใช้";

curl_close($ch);
?>
''')
    
    print()
    print_warning("⚠️  อย่าแชร์ API Key นี้กับคนอื่น!")

# ═══════════════════════════════════════════════════════════
# 🎯 Main Function
# ═══════════════════════════════════════════════════════════

def main():
    """Main function"""
    print("\n" + "=" * 70)
    print("🧪 ทดสอบ API Key - ตรวจสอบว่าคนอื่นสามารถดึงข้อมูลไปใช้ได้")
    print("=" * 70)
    
    # แสดงวิธีได้ API Key
    show_how_to_get_api_key()
    
    # ตรวจสอบ API Key
    if not API_KEY:
        print()
        print_warning("ยังไม่ได้ตั้งค่า API Key")
        api_key = input("\nกรุณาใส่ API Key ที่ได้จากหน้า API Management: ").strip()
        if not api_key:
            print_error("ต้องมี API Key ถึงจะทดสอบได้")
            return
    else:
        api_key = API_KEY
    
    print()
    print(f"🔑 API Key: {api_key[:20]}...")
    print(f"🌐 API URL: {API_URL}")
    
    # ทดสอบการเชื่อมต่อ
    print_header("ทดสอบการเชื่อมต่อ")
    print_info("ตรวจสอบว่า backend server ทำงานอยู่...")
    
    try:
        response = requests.get(f"{API_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print_success("Backend server ทำงานอยู่!")
        else:
            print_error(f"Backend server ตอบกลับด้วย status code: {response.status_code}")
            return
    except requests.exceptions.ConnectionError:
        print_error(f"ไม่สามารถเชื่อมต่อกับ {API_URL} ได้")
        print_info("กรุณาตรวจสอบว่า backend server ทำงานอยู่หรือไม่")
        print_info("รัน backend server ด้วยคำสั่ง:")
        print_info("  cd backend")
        print_info("  venv\\Scripts\\activate")
        print_info("  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        return
    except Exception as e:
        print_error(f"เกิดข้อผิดพลาด: {e}")
        return
    
    # ทดสอบ
    test_real_usage(api_key)
    print()
    test_permissions(api_key)
    print()
    test_rate_limit(api_key)
    print()
    show_usage_examples(api_key)
    
    # สรุปสุดท้าย
    print_header("สรุปผลการทดสอบ")
    print_success("✅ ทดสอบเสร็จสิ้น!")
    print()
    print("📝 สรุป:")
    print("   • API Key นี้สามารถใช้ดึงข้อมูลได้")
    print("   • ตรวจสอบ permissions ที่คุณมี")
    print("   • ระวัง rate limit")
    print("   • อย่าแชร์ API Key กับคนอื่น!")
    print()
    print("💡 Tip: เก็บ API Key ไว้ในที่ปลอดภัยและใช้ Environment Variables")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  หยุดการทดสอบโดยผู้ใช้")
    except Exception as e:
        print(f"\n❌ เกิดข้อผิดพลาด: {e}")
        import traceback
        traceback.print_exc()

