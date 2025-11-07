// API Configuration
// สำหรับการใช้งานในเครือข่ายเดียวกัน ให้แก้ไข URL เป็น IP address ของเครื่องที่รัน backend
// เช่น: 'http://192.168.1.100:8000'
// หรือใช้ environment variable: REACT_APP_API_URL

const getApiUrl = () => {
    // 1. ตรวจสอบ environment variable ก่อน (สำหรับ production build)
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    
    // 2. ตรวจสอบ window config (สำหรับ development)
    if (window.__API_URL__) {
        return window.__API_URL__;
    }
    
    // 3. Default: localhost (สำหรับ development ในเครื่องเดียวกัน)
    return 'http://localhost:8000';
};

const config = {
    apiUrl: getApiUrl(),
    API_BASE_URL: getApiUrl(),
    timeout: 5000
};

export default config;