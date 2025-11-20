/**
 * User Error Parsers
 * Functions for parsing and formatting user-related API errors
 */

import { VALIDATION_ERRORS } from '../constants/userManagement';

/**
 * Parse create user error and return user-friendly message
 * @param {Error} error - Error object from API
 * @param {Object} formValues - Form values that were submitted
 * @returns {Object} - { title: string, message: string }
 */
export const parseCreateUserError = (error, formValues = {}) => {
  if (!error?.response?.data?.detail) {
    return {
      title: 'ไม่สามารถสร้างผู้ใช้ได้',
      message: error.message || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้'
    };
  }
  
  const detail = error.response.data.detail;
  
  // Handle FastAPI validation errors (array of objects)
  if (Array.isArray(detail)) {
    return {
      title: '❌ ข้อมูลไม่ถูกต้อง',
      message: detail.map(err => {
        const field = err.loc?.join(' > ') || 'Unknown field';
        return `• ${field}: ${err.msg}`;
      }).join('\n')
    };
  }
  
  // Handle string errors
  if (typeof detail === 'string') {
    if (detail.includes('entryAlreadyExists')) {
      return {
        title: '❌ Username ซ้ำ!',
        message: `Username "${formValues?.sAMAccountName || 'ที่ระบุ'}" หรือ CN "${formValues?.cn || 'ที่ระบุ'}" มีในระบบแล้ว\n\nกรุณาใช้ชื่ออื่นที่ไม่ซ้ำกัน`
      };
    }
    
    if (detail.includes('unwillingToPerform') || detail.includes('password') || detail.includes('constraint violation')) {
      return {
        title: '❌ Password ไม่ผ่าน Active Directory Policy!',
        message: '⚠️ Password ต้องมีครบทุกข้อ:\n\n' +
          '✓ อย่างน้อย 8 ตัวอักษร\n' +
          '✓ ตัวพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว\n' +
          '✓ ตัวพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว\n' +
          '✓ ตัวเลข (0-9) อย่างน้อย 1 ตัว\n' +
          '✓ อักขระพิเศษ (!@#$%^&*) อย่างน้อย 1 ตัว\n\n' +
          '💡 ตัวอย่าง Password ที่ถูกต้อง:\n' +
          '  • SecurePass123!\n' +
          '  • MyP@ssw0rd\n' +
          '  • Test1234#\n\n' +
          '⚡ กรุณาตั้ง Password ใหม่ตาม requirement ข้างต้น'
      };
    }
    
    if (detail.includes('invalidCredentials')) {
      return {
        title: '❌ ไม่มีสิทธิ์!',
        message: 'Account ที่ใช้เชื่อมต่อ AD ไม่มีสิทธิ์สร้างผู้ใช้'
      };
    }
    
    return {
      title: 'ไม่สามารถสร้างผู้ใช้ได้',
      message: detail
    };
  }
  
  // Handle object errors
  if (typeof detail === 'object') {
    return {
      title: 'ไม่สามารถสร้างผู้ใช้ได้',
      message: JSON.stringify(detail, null, 2)
    };
  }
  
  return {
    title: 'ไม่สามารถสร้างผู้ใช้ได้',
    message: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
  };
};

/**
 * Parse update user error and return user-friendly message
 * @param {Error} error - Error object from API
 * @returns {Object} - { title: string, message: string }
 */
export const parseUpdateUserError = (error) => {
  if (!error?.response?.data?.detail) {
    return {
      title: 'ไม่สามารถแก้ไขผู้ใช้ได้',
      message: error.message || 'เกิดข้อผิดพลาดในการแก้ไขผู้ใช้'
    };
  }
  
  const detail = error.response.data.detail;
  
  // Handle FastAPI validation errors (array of objects)
  if (Array.isArray(detail)) {
    return {
      title: 'ไม่สามารถแก้ไขผู้ใช้ได้',
      message: detail.map(err => {
        const field = err.loc?.join(' > ') || 'Unknown field';
        return `• ${field}: ${err.msg}`;
      }).join('\n')
    };
  }
  
  // Handle string errors
  if (typeof detail === 'string') {
    return {
      title: 'ไม่สามารถแก้ไขผู้ใช้ได้',
      message: detail
    };
  }
  
  // Handle object errors
  if (typeof detail === 'object') {
    return {
      title: 'ไม่สามารถแก้ไขผู้ใช้ได้',
      message: JSON.stringify(detail, null, 2)
    };
  }
  
  return {
    title: 'ไม่สามารถแก้ไขผู้ใช้ได้',
    message: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
  };
};

