/**
 * OU Service
 * Handles OU-related API calls
 */

import api from './api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const ouService = {
  /**
   * Get all OUs
   * @param {Object} params - Query parameters (page, page_size, etc.)
   * @returns {Promise} - OUs list
   */
  getOUs: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.OUS.BASE, { params });
    return response.data;
  },

  /**
   * Get OU by DN
   * @param {string} dn - OU distinguished name
   * @returns {Promise} - OU details
   */
  getOU: async (dn) => {
    const response = await api.get(API_ENDPOINTS.OUS.BY_DN(dn));
    return response.data;
  },

  /**
   * Create OU
   * @param {Object} data - OU data
   * @returns {Promise} - Created OU
   */
  createOU: async (data) => {
    const response = await api.post(API_ENDPOINTS.OUS.BASE, data);
    return response.data;
  },

  /**
   * Update OU
   * @param {string} dn - OU distinguished name
   * @param {Object} data - OU data to update
   * @returns {Promise} - Updated OU
   */
  updateOU: async (dn, data) => {
    const response = await api.put(API_ENDPOINTS.OUS.BY_DN(dn), data);
    return response.data;
  },

  /**
   * Delete OU
   * @param {string} dn - OU distinguished name
   * @returns {Promise}
   */
  deleteOU: async (dn) => {
    const response = await api.delete(API_ENDPOINTS.OUS.BY_DN(dn));
    return response.data;
  },

  /**
   * Get suggested groups for OU
   * @param {string} dn - OU distinguished name
   * @returns {Promise} - Suggested groups
   */
  getSuggestedGroups: async (dn) => {
    const response = await api.get(API_ENDPOINTS.OUS.SUGGESTED_GROUPS(dn));
    return response.data;
  },

  /**
   * Get user OUs
   * @returns {Promise} - User OUs list
   */
  getUserOUs: async () => {
    const response = await api.get(API_ENDPOINTS.USERS.USER_OUS);
    return response.data;
  },
};

