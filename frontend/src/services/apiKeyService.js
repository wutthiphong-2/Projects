/**
 * API Key Service
 * Handles API key management operations
 */
import api from './api';

const API_KEYS_ENDPOINT = '/api/api-keys';

export const apiKeyService = {
  /**
   * Get all API keys
   */
  async getApiKeys() {
    try {
      const response = await api.get(API_KEYS_ENDPOINT);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  },

  /**
   * Get API key by ID
   */
  async getApiKey(keyId) {
    try {
      const response = await api.get(`${API_KEYS_ENDPOINT}/${keyId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  },

  /**
   * Create new API key
   */
  async createApiKey(keyData) {
    try {
      const response = await api.post(API_KEYS_ENDPOINT, keyData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  },

  /**
   * Update API key
   */
  async updateApiKey(keyId, keyData) {
    try {
      const response = await api.put(`${API_KEYS_ENDPOINT}/${keyId}`, keyData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  },

  /**
   * Delete API key
   */
  async deleteApiKey(keyId) {
    try {
      await api.delete(`${API_KEYS_ENDPOINT}/${keyId}`);
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  },

  /**
   * Get API key usage statistics
   */
  async getUsageStats(keyId, days = 30) {
    try {
      const response = await api.get(`${API_KEYS_ENDPOINT}/${keyId}/usage`, {
        params: { days }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  },

  /**
   * Get API key request logs
   */
  async getRequestLogs(keyId, filters = {}) {
    try {
      const response = await api.get(`${API_KEYS_ENDPOINT}/${keyId}/logs`, {
        params: filters
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  }
};

