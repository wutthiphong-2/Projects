/**
 * API Service - Centralized Axios instance with interceptors
 * Handles authentication, error handling, and request/response transformation
 */

import axios from 'axios';
import config from '../config';

// Set axios defaults to ensure no timeout globally
axios.defaults.timeout = 0;

// Create axios instance
const api = axios.create({
  baseURL: config.apiUrl || 'http://localhost:8000',
  timeout: 0, // No timeout - allow requests to take as long as needed
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token and ensure no timeout
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Ensure timeout is always 0 (no timeout)
    config.timeout = 0;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    // Return response data directly for convenience
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      // Handle 401 Unauthorized - Clear token (normal if token expired)
      if (status === 401) {
        // Only clear token if it exists (avoid unnecessary localStorage operations)
        if (localStorage.getItem('token')) {
          localStorage.removeItem('token');
        }
        // Don't redirect here - let components handle it
        // This is normal behavior when token expires (after 8 hours)
      }
      
      // Handle 403 Forbidden
      if (status === 403) {
        console.error('Access forbidden:', data);
      }
      
      // Handle 404 Not Found
      if (status === 404) {
        console.error('Resource not found:', error.config?.url);
      }
      
      // Handle 500 Internal Server Error
      if (status >= 500) {
        console.error('Server error:', data);
      }
    } else if (error.request) {
      // Request was made but no response received
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        const timeoutValue = error.config?.timeout || 0;
        if (timeoutValue === 0) {
          console.error('Network error: request was aborted (no timeout configured)');
        } else {
          console.error('Network error: timeout of', timeoutValue, 'ms exceeded');
        }
      } else {
        console.error('Network error:', error.message);
      }
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;

