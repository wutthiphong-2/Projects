/**
 * useActivityLogs Hook
 * Custom hook for activity log operations
 */

import { useState, useCallback } from 'react';
import { activityLogService } from '../services/activityLogService';
import { getErrorMessage } from '../utils/errorHandler';

export const useActivityLogs = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchActivityLogs = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await activityLogService.getActivityLogs(params);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await activityLogService.getStats(params);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActionTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await activityLogService.getActionTypes();
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecent = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await activityLogService.getRecent(params);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchActivityLogs,
    fetchStats,
    fetchActionTypes,
    fetchRecent,
  };
};

