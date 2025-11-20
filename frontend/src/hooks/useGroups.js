/**
 * useGroups Hook
 * Custom hook for group management operations
 */

import { useState, useCallback } from 'react';
import { groupService } from '../services/groupService';
import { getErrorMessage } from '../utils/errorHandler';

export const useGroups = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGroups = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupService.getGroups(params);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGroup = useCallback(async (dn) => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupService.getGroup(dn);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const createGroup = useCallback(async (groupData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupService.createGroup(groupData);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGroup = useCallback(async (dn, groupData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupService.updateGroup(dn, groupData);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteGroup = useCallback(async (dn) => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupService.deleteGroup(dn);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGroupMembers = useCallback(async (dn) => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupService.getGroupMembers(dn);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const addGroupMember = useCallback(async (dn, userDn) => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupService.addGroupMember(dn, userDn);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const removeGroupMember = useCallback(async (dn, userDn) => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupService.removeGroupMember(dn, userDn);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategorizedGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupService.getCategorizedGroups();
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
    fetchGroups,
    fetchGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    fetchGroupMembers,
    addGroupMember,
    removeGroupMember,
    fetchCategorizedGroups,
  };
};

