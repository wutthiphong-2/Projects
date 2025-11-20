/**
 * Activity Log Service
 * Handles activity log-related API calls
 */

import api from './api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const activityLogService = {
  /**
   * Get activity logs
   * @param {Object} params - Query parameters (page, page_size, search, action_type, target_type, date_from, date_to)
   * @returns {Promise} - Activity logs with pagination
   */
  getActivityLogs: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.ACTIVITY_LOGS.BASE, { params });
    return response.data;
  },

  /**
   * Get activity log stats
   * @param {Object} params - Query parameters (days)
   * @returns {Promise} - Activity log statistics
   */
  getStats: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.ACTIVITY_LOGS.STATS, { params });
    return response.data;
  },

  /**
   * Get action types
   * @returns {Promise} - List of action types
   */
  getActionTypes: async () => {
    const response = await api.get(API_ENDPOINTS.ACTIVITY_LOGS.ACTION_TYPES);
    return response.data;
  },

  /**
   * Get recent activity logs
   * @param {Object} params - Query parameters
   * @returns {Promise} - Recent activity logs
   */
  getRecent: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.ACTIVITY_LOGS.RECENT, { params });
    return response.data;
  },
};

