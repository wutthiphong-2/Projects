/**
 * Auth Service
 * Handles authentication-related API calls
 */

import api from './api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const authService = {
  /**
   * Login user
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise} - Login response with access_token and user
   */
  login: async (username, password) => {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
      username,
      password,
    });
    return response.data;
  },

  /**
   * Verify token
   * @param {string} token - JWT token
   * @returns {Promise} - Verification response
   */
  verify: async (token) => {
    const response = await api.get(API_ENDPOINTS.AUTH.VERIFY, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Logout user
   * @returns {Promise}
   */
  logout: async () => {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    return response.data;
  },
};

