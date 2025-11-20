/**
 * useUsers Hook
 * Custom hook for user management operations
 */

import { useState, useCallback } from 'react';
import { userService } from '../services/userService';
import { getErrorMessage } from '../utils/errorHandler';

export const useUsers = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getUsers(params);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUser = useCallback(async (dn) => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getUser(dn);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.createUser(userData);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (dn, userData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.updateUser(dn, userData);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (dn) => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.deleteUser(dn);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleUserStatus = useCallback(async (dn, enabled) => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.toggleUserStatus(dn, enabled);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (dn, newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.resetPassword(dn, newPassword);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getStats();
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
    fetchUsers,
    fetchUser,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    resetPassword,
    fetchUserStats,
  };
};

