/**
 * User Service
 * Handles user-related API calls
 */

import api from './api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const userService = {
  /**
   * Get all users
   * @param {Object} params - Query parameters (page, page_size, q, etc.)
   * @returns {Promise} - Users list
   */
  getUsers: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.USERS.BASE, { params });
    return response.data;
  },

  /**
   * Get user by DN
   * @param {string} dn - User distinguished name
   * @returns {Promise} - User details
   */
  getUser: async (dn) => {
    const response = await api.get(API_ENDPOINTS.USERS.BY_DN(dn));
    return response.data;
  },

  /**
   * Create user
   * @param {Object} data - User data
   * @returns {Promise} - Created user
   */
  createUser: async (data) => {
    const response = await api.post(API_ENDPOINTS.USERS.BASE, data);
    return response.data;
  },

  /**
   * Update user
   * @param {string} dn - User distinguished name
   * @param {Object} data - User data to update
   * @returns {Promise} - Updated user
   */
  updateUser: async (dn, data) => {
    const response = await api.put(API_ENDPOINTS.USERS.BY_DN(dn), data);
    return response.data;
  },

  /**
   * Delete user
   * @param {string} dn - User distinguished name
   * @returns {Promise}
   */
  deleteUser: async (dn) => {
    const response = await api.delete(API_ENDPOINTS.USERS.BY_DN(dn));
    return response.data;
  },

  /**
   * Toggle user status (enable/disable)
   * @param {string} dn - User distinguished name
   * @param {boolean} enabled - Enable or disable
   * @returns {Promise} - Updated user
   */
  toggleUserStatus: async (dn, enabled) => {
    const response = await api.patch(API_ENDPOINTS.USERS.BY_DN(dn), {
      enabled,
    });
    return response.data;
  },

  /**
   * Reset user password
   * @param {string} dn - User distinguished name
   * @param {string} newPassword - New password
   * @returns {Promise}
   */
  resetPassword: async (dn, newPassword) => {
    const response = await api.post(
      `${API_ENDPOINTS.USERS.BY_DN(dn)}/reset-password`,
      { new_password: newPassword }
    );
    return response.data;
  },

  /**
   * Get user stats
   * @returns {Promise} - User statistics
   */
  getStats: async () => {
    const response = await api.get(API_ENDPOINTS.USERS.STATS);
    return response.data;
  },

  /**
   * Get user departments
   * @returns {Promise} - List of departments
   */
  getDepartments: async () => {
    const response = await api.get(API_ENDPOINTS.USERS.DEPARTMENTS);
    return response.data;
  },

  /**
   * Get user groups
   * @param {string} dn - User distinguished name
   * @returns {Promise} - User groups
   */
  getUserGroups: async (dn) => {
    const response = await api.get(API_ENDPOINTS.USERS.GROUPS_BY_DN(dn));
    return response.data;
  },

  /**
   * Get user permissions
   * @param {string} dn - User distinguished name
   * @returns {Promise} - User permissions
   */
  getUserPermissions: async (dn) => {
    const response = await api.get(API_ENDPOINTS.USERS.PERMISSIONS_BY_DN(dn));
    return response.data;
  },

  /**
   * Get user login history
   * @param {string} dn - User distinguished name
   * @returns {Promise} - Login history
   */
  getLoginHistory: async (dn) => {
    const response = await api.get(API_ENDPOINTS.USERS.LOGIN_HISTORY_BY_DN(dn));
    return response.data;
  },

  /**
   * Get user password expiry
   * @param {string} dn - User distinguished name
   * @returns {Promise} - Password expiry info
   */
  getPasswordExpiry: async (dn) => {
    const response = await api.get(API_ENDPOINTS.USERS.PASSWORD_EXPIRY_BY_DN(dn));
    return response.data;
  },

  /**
   * Get login insights - recent logins
   * @param {Object} params - Query parameters
   * @returns {Promise} - Recent login insights
   */
  getLoginInsightsRecent: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.USERS.LOGIN_INSIGHTS.RECENT, { params });
    return response.data;
  },

  /**
   * Get login insights - never logged in
   * @param {Object} params - Query parameters
   * @returns {Promise} - Never logged in users
   */
  getLoginInsightsNever: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.USERS.LOGIN_INSIGHTS.NEVER, { params });
    return response.data;
  },

  /**
   * Add user to groups
   * @param {string} dn - User distinguished name
   * @param {Array<string>} groupDns - Array of group DNs
   * @returns {Promise}
   */
  addUserToGroups: async (dn, groupDns) => {
    const response = await api.post(
      `${API_ENDPOINTS.USERS.BY_DN(dn)}/groups`,
      { group_dns: groupDns }
    );
    return response.data;
  },

  /**
   * Remove user from groups
   * @param {string} dn - User distinguished name
   * @param {Array<string>} groupDns - Array of group DNs
   * @returns {Promise}
   */
  removeUserFromGroups: async (dn, groupDns) => {
    const response = await api.delete(
      `${API_ENDPOINTS.USERS.BY_DN(dn)}/groups`,
      { data: { group_dns: groupDns } }
    );
    return response.data;
  },
};

