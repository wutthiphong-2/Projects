// API Configuration
// สำหรับการใช้งานในเครือข่ายเดียวกัน ให้แก้ไข URL เป็น IP address ของเครื่องที่รัน backend
// เช่น: 'http://192.168.1.100:8000'
// หรือใช้ environment variable: REACT_APP_API_URL

const resolveDefaultUrl = () => {
    if (typeof window !== 'undefined') {
        const { protocol, hostname, port } = window.location;

        // หากเรียกจาก localhost (เช่น React dev server ที่พอร์ต 3000/5173)
        // ให้ชี้ไปยัง backend dev port 8000 โดยอัตโนมัติ
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            const defaultDevPort = protocol === 'https:' ? 8443 : 8000;
            return `${protocol}//${hostname}:${defaultDevPort}`;
        }

        // ท่า default สำหรับ environment อื่น ๆ: ใช้ origin เดียวกันกับ frontend
        // (รองรับกรณี deploy ผ่าน reverse proxy ที่ map /api ไป backend)
        return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
    }
    return 'http://localhost:8000';
};

const getApiUrl = () => {
    // 1. ตรวจสอบ environment variable ก่อน (สำหรับ production build)
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    
    // 2. ตรวจสอบ window config (สำหรับ runtime override)
    if (typeof window !== 'undefined' && window.__API_URL__) {
        return window.__API_URL__;
    }

    // 3. ตรวจสอบ localStorage (ช่วยให้ override ผ่าน developer console ได้)
    if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('API_URL');
        if (stored && stored.trim()) {
            return stored.trim();
        }
    }
    
    // 4. Default: พยายาม resolve ตาม hostname/port ปัจจุบัน
    const url = resolveDefaultUrl();
    
    // 5. Fallback: ถ้ายังไม่สามารถ resolve ได้ ให้ใช้ localhost:8000
    if (!url || url.trim() === '' || url === 'undefined' || url === 'null') {
        return 'http://localhost:8000';
    }
    
    return url;
};

const apiUrl = getApiUrl();

// Debug: Log API URL for debugging (only in development)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.log('🔧 API URL:', apiUrl);
}

const config = {
    apiUrl: apiUrl,
    API_BASE_URL: apiUrl,
    timeout: 5000
};

export default config;