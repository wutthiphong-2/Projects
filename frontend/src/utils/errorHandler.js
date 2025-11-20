/**
 * Error Handler Utility
 * Centralized error handling for consistent error messages
 */

/**
 * Extract error message from error object
 * @param {Error} error - Error object from axios or other sources
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (!error) return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';

  // Handle axios errors
  if (error.response) {
    const { status, data } = error.response;
    
    // Handle FastAPI validation errors
    if (data?.detail) {
      if (Array.isArray(data.detail)) {
        // Validation errors (array of objects)
        return data.detail
          .map((err) => {
            const field = err.loc?.join(' > ') || 'Unknown field';
            return `${field}: ${err.msg}`;
          })
          .join('\n');
      }
      // String or object detail
      return typeof data.detail === 'string' 
        ? data.detail 
        : JSON.stringify(data.detail);
    }
    
    // Handle HTTP status codes
    switch (status) {
      case 400:
        return 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก';
      case 401:
        return 'กรุณาเข้าสู่ระบบใหม่';
      case 403:
        return 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
      case 404:
        return 'ไม่พบข้อมูลที่ต้องการ';
      case 409:
        return 'ข้อมูลนี้มีอยู่แล้วในระบบ';
      case 422:
        return 'ข้อมูลไม่ถูกต้องตามรูปแบบที่กำหนด';
      case 500:
        return 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง';
      case 503:
        return 'บริการไม่พร้อมใช้งานชั่วคราว';
      default:
        return data?.message || `เกิดข้อผิดพลาด (${status})`;
    }
  }
  
  // Handle network errors
  if (error.request) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ERR_CONNECTION_REFUSED')) {
      return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ';
    }
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง';
    }
    return 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
  }
  
  // Handle other errors
  if (error.message) {
    return error.message;
  }
  
  return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
};

/**
 * Extract error detail for display
 * @param {Error} error - Error object
 * @returns {string|null} - Error detail or null
 */
export const getErrorDetail = (error) => {
  if (!error?.response?.data?.detail) return null;
  
  const detail = error.response.data.detail;
  
  if (Array.isArray(detail)) {
    return detail
      .map((err) => {
        const field = err.loc?.join(' > ') || 'Unknown field';
        return `• ${field}: ${err.msg}`;
      })
      .join('\n');
  }
  
  if (typeof detail === 'string') {
    return detail;
  }
  
  if (typeof detail === 'object') {
    return JSON.stringify(detail, null, 2);
  }
  
  return String(detail);
};

/**
 * Check if error is a network error
 * @param {Error} error - Error object
 * @returns {boolean}
 */
export const isNetworkError = (error) => {
  return (
    error.code === 'ECONNREFUSED' ||
    error.message?.includes('ERR_CONNECTION_REFUSED') ||
    error.code === 'ETIMEDOUT' ||
    error.message?.includes('timeout') ||
    !error.response
  );
};

/**
 * Check if error is an authentication error
 * @param {Error} error - Error object
 * @returns {boolean}
 */
export const isAuthError = (error) => {
  return error.response?.status === 401 || error.response?.status === 403;
};

/**
 * Handle API error with consistent error handling and notification
 * @param {Error} error - Error object from API call
 * @param {string} defaultMessage - Default error message
 * @param {Function} notifyError - Notification function (from useNotification)
 * @param {Object} options - Additional options
 * @param {boolean} options.logError - Whether to log error (default: true)
 * @returns {string} - Error message
 */
export const handleApiError = (error, defaultMessage, notifyError, options = {}) => {
  const { logError = true } = options;
  
  if (logError) {
    console.error('❌ API Error:', error);
  }
  
  const errorMsg = getErrorDetail(error) || getErrorMessage(error) || defaultMessage;
  
  if (notifyError && typeof notifyError === 'function') {
    notifyError(defaultMessage, errorMsg);
  }
  
  return errorMsg;
};

