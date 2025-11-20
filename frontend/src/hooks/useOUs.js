/**
 * useOUs Hook
 * Custom hook for OU management operations
 */

import { useState, useCallback } from 'react';
import { ouService } from '../services/ouService';
import { getErrorMessage } from '../utils/errorHandler';

export const useOUs = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOUs = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ouService.getOUs(params);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOU = useCallback(async (dn) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ouService.getOU(dn);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const createOU = useCallback(async (ouData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ouService.createOU(ouData);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOU = useCallback(async (dn, ouData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ouService.updateOU(dn, ouData);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteOU = useCallback(async (dn) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ouService.deleteOU(dn);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSuggestedGroups = useCallback(async (dn) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ouService.getSuggestedGroups(dn);
      return { success: true, data };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserOUs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ouService.getUserOUs();
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
    fetchOUs,
    fetchOU,
    createOU,
    updateOU,
    deleteOU,
    fetchSuggestedGroups,
    fetchUserOUs,
  };
};

