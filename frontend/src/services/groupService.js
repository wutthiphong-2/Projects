/**
 * Group Service
 * Handles group-related API calls
 */

import api from './api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const groupService = {
  /**
   * Get all groups
   * @param {Object} params - Query parameters (page, page_size, q, etc.)
   * @returns {Promise} - Groups list
   */
  getGroups: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.GROUPS.BASE, { params });
    return response.data;
  },

  /**
   * Get group by DN
   * @param {string} dn - Group distinguished name
   * @returns {Promise} - Group details
   */
  getGroup: async (dn) => {
    const response = await api.get(API_ENDPOINTS.GROUPS.BY_DN(dn));
    return response.data;
  },

  /**
   * Create group
   * @param {Object} data - Group data
   * @returns {Promise} - Created group
   */
  createGroup: async (data) => {
    const response = await api.post(API_ENDPOINTS.GROUPS.BASE, data);
    return response.data;
  },

  /**
   * Update group
   * @param {string} dn - Group distinguished name
   * @param {Object} data - Group data to update
   * @returns {Promise} - Updated group
   */
  updateGroup: async (dn, data) => {
    const response = await api.put(API_ENDPOINTS.GROUPS.BY_DN(dn), data);
    return response.data;
  },

  /**
   * Delete group
   * @param {string} dn - Group distinguished name
   * @returns {Promise}
   */
  deleteGroup: async (dn) => {
    const response = await api.delete(API_ENDPOINTS.GROUPS.BY_DN(dn));
    return response.data;
  },

  /**
   * Get group members
   * @param {string} dn - Group distinguished name
   * @returns {Promise} - Group members list
   */
  getGroupMembers: async (dn) => {
    const response = await api.get(API_ENDPOINTS.GROUPS.MEMBERS_BY_DN(dn));
    return response.data;
  },

  /**
   * Add member to group
   * @param {string} dn - Group distinguished name
   * @param {string} userDn - User distinguished name
   * @returns {Promise}
   */
  addGroupMember: async (dn, userDn) => {
    const response = await api.post(API_ENDPOINTS.GROUPS.ADD_MEMBER(dn), {
      user_dn: userDn,
    });
    return response.data;
  },

  /**
   * Remove member from group
   * @param {string} dn - Group distinguished name
   * @param {string} userDn - User distinguished name
   * @returns {Promise}
   */
  removeGroupMember: async (dn, userDn) => {
    const response = await api.delete(
      API_ENDPOINTS.GROUPS.REMOVE_MEMBER(dn, userDn)
    );
    return response.data;
  },

  /**
   * Get categorized groups
   * @returns {Promise} - Categorized groups
   */
  getCategorizedGroups: async () => {
    const response = await api.get(API_ENDPOINTS.GROUPS.CATEGORIZED);
    return response.data;
  },

  /**
   * Get default groups by OU
   * @param {string} ouDn - OU distinguished name
   * @returns {Promise} - Default groups for OU
   */
  getDefaultGroupsByOU: async (ouDn) => {
    const response = await api.get(API_ENDPOINTS.GROUPS.DEFAULT_BY_OU(ouDn));
    return response.data;
  },
};

