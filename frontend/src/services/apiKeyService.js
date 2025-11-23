/**
 * API Key Service
 * Handles API key management API calls
 */

import api from './api';
import axios from 'axios';
import config from '../config';

const API_BASE = '/api/api-keys';

export const apiKeyService = {
  /**
   * Get all API keys
   * @returns {Promise} - API keys list
   */
  getAPIKeys: async () => {
    const response = await api.get(API_BASE);
    return response.data;
  },

  /**
   * Get API key by ID
   * @param {string} keyId - API key ID
   * @returns {Promise} - API key details
   */
  getAPIKey: async (keyId) => {
    const response = await api.get(`${API_BASE}/${keyId}`);
    return response.data;
  },

  /**
   * Create new API key
   * @param {Object} data - API key data
   * @returns {Promise} - Created API key (includes the key itself - shown only once!)
   */
  createAPIKey: async (data) => {
    const response = await api.post(API_BASE, data);
    return response.data;
  },

  /**
   * Update API key
   * @param {string} keyId - API key ID
   * @param {Object} data - API key data to update
   * @returns {Promise} - Updated API key
   */
  updateAPIKey: async (keyId, data) => {
    const response = await api.put(`${API_BASE}/${keyId}`, data);
    return response.data;
  },

  /**
   * Delete API key
   * @param {string} keyId - API key ID
   * @returns {Promise}
   */
  deleteAPIKey: async (keyId) => {
    const response = await api.delete(`${API_BASE}/${keyId}`);
    return response.data;
  },

  /**
   * Get API key usage statistics
   * @param {string} keyId - API key ID
   * @param {number} days - Number of days to include
   * @returns {Promise} - Usage statistics
   */
  getAPIKeyStats: async (keyId, days = 30) => {
    const response = await api.get(`${API_BASE}/${keyId}/stats`, {
      params: { days }
    });
    return response.data;
  },

  /**
   * Get API key request logs
   * @param {string} keyId - API key ID
   * @param {Object} params - Query parameters (page, page_size, endpoint, method, status_code, date_from, date_to)
   * @returns {Promise} - Request logs
   */
  getAPIKeyLogs: async (keyId, params = {}) => {
    const response = await api.get(`${API_BASE}/${keyId}/logs`, { params });
    return response.data;
  },

  /**
   * Get all request logs (across all API keys)
   * @param {Object} params - Query parameters (page, page_size, api_key_id, endpoint, method, status_code, date_from, date_to)
   * @returns {Promise} - Request logs
   */
  getAllLogs: async (params = {}) => {
    const response = await api.get(`${API_BASE}/logs/all`, { params });
    return response.data;
  },

  /**
   * Rotate (regenerate) an API key
   * @param {string} keyId - API key ID
   * @param {number} gracePeriodDays - Grace period in days (old key remains valid)
   * @returns {Promise} - New API key (includes the key itself - shown only once!)
   */
  rotateAPIKey: async (keyId, gracePeriodDays = 7) => {
    const response = await api.post(`${API_BASE}/${keyId}/rotate`, null, {
      params: { grace_period_days: gracePeriodDays }
    });
    return response.data;
  },

  /**
   * Test API key by making a simple authenticated request
   * @param {string} apiKey - The full API key to test
   * @returns {Promise} - Test result with status and details
   */
  testAPIKey: async (apiKey) => {
    // Create a temporary axios instance with the API key for testing
    const testApi = axios.create({
      baseURL: config.apiUrl || 'http://localhost:8000',
      timeout: 30000, // 30 second timeout for test (increased from 10s)
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    // Test with GET request first (read permission)
    try {
      let response;
      let endpoint = '/api/users';
      let dataCount = 0;
      let returnedCount = 0;
      let permissionTests = [];
      
      // Test GET (read permission)
      try {
        response = await testApi.get('/api/users', {
          params: { 
            page: 1,
            page_size: 1 
          }
        });
        
        permissionTests.push({
          method: 'GET',
          endpoint: '/api/users',
          success: true,
          status: response.status,
          message: 'GET permission: ✅ ใช้งานได้'
        });
        
        // Calculate counts from response
        if (Array.isArray(response.data)) {
          returnedCount = response.data.length;
          dataCount = response.data.length;
        } else if (response.data?.results && Array.isArray(response.data.results)) {
          returnedCount = response.data.results.length;
          if (response.data.total !== undefined) {
            dataCount = response.data.total;
          } else {
            dataCount = returnedCount;
          }
        } else if (response.data?.total !== undefined) {
          dataCount = response.data.total;
          returnedCount = response.data.results?.length || 0;
        }
      } catch (getError) {
        permissionTests.push({
          method: 'GET',
          endpoint: '/api/users',
          success: false,
          status: getError.response?.status || 0,
          message: `GET permission: ❌ ${getError.response?.data?.detail || getError.response?.data?.message || getError.message}`
        });
      }
      
      // Test POST (write permission) - should fail if only GET permission
      try {
        await testApi.post('/api/users', {
          cn: 'Test User',
          sAMAccountName: 'testuser',
          password: 'Test1234!',
          mail: 'test@example.com'
        });
        
        permissionTests.push({
          method: 'POST',
          endpoint: '/api/users',
          success: true,
          status: 200,
          message: 'POST permission: ✅ ใช้งานได้ (⚠️ อาจมีสิทธิ์มากเกินไป)'
        });
      } catch (postError) {
        const status = postError.response?.status;
        if (status === 403) {
          permissionTests.push({
            method: 'POST',
            endpoint: '/api/users',
            success: false,
            status: status,
            message: 'POST permission: ❌ ไม่มีสิทธิ์ (ถูกต้อง - ตามที่ตั้งค่าไว้)'
          });
        } else if (status === 422) {
          permissionTests.push({
            method: 'POST',
            endpoint: '/api/users',
            success: false,
            status: status,
            message: 'POST permission: ⚠️ มีสิทธิ์แต่ข้อมูลไม่ถูกต้อง (validation error)'
          });
        } else {
          permissionTests.push({
            method: 'POST',
            endpoint: '/api/users',
            success: false,
            status: status || 0,
            message: `POST permission: ❌ ${postError.response?.data?.detail || postError.response?.data?.message || postError.message}`
          });
        }
      }
      
      // Determine overall success
      const getTest = permissionTests.find(t => t.method === 'GET');
      const overallSuccess = getTest && getTest.success;
      
      return {
        success: overallSuccess,
        status: getTest?.status || 0,
        message: overallSuccess ? 'API Key ใช้งานได้!' : 'API Key มีปัญหาในการเข้าถึง',
        data: response?.data,
        dataCount: dataCount,
        returnedCount: returnedCount,
        endpoint: endpoint,
        permissionTests: permissionTests,
        note: dataCount > returnedCount 
          ? `การทดสอบดึงข้อมูลเพียง ${returnedCount} รายการเพื่อความเร็ว แต่ API Key สามารถเข้าถึงข้อมูลทั้งหมด ${dataCount.toLocaleString()} รายการได้`
          : `ดึงข้อมูล ${returnedCount} รายการ`
      };
    } catch (error) {
      if (error.response) {
        return {
          success: false,
          status: error.response.status,
          message: error.response.data?.detail || error.response.data?.message || 'API Key ไม่สามารถใช้งานได้',
          error: error.response.data
        };
      } else if (error.request) {
        return {
          success: false,
          status: 0,
          message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
          error: error.message
        };
      } else {
        return {
          success: false,
          status: 0,
          message: 'เกิดข้อผิดพลาดในการทดสอบ',
          error: error.message
        };
      }
    }
  }
};

