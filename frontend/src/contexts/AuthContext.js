import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { getErrorMessage } from '../utils/errorHandler';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const data = await authService.verify(token);
      
      if (data.valid) {
        setIsAuthenticated(true);
        setUser(data.user);
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('token');
      }
    } catch (error) {
      // Token verification failed - this is normal if:
      // 1. Token expired (normal after 8 hours)
      // 2. Token is invalid/corrupt
      // 3. Backend restarted and JWT_SECRET_KEY changed
      // Only log error if it's not a connection/authentication issue
      if (error.code === 'ECONNREFUSED' || error.message?.includes('ERR_CONNECTION_REFUSED')) {
        // Backend might be starting - silent fail
      } else if (error.response?.status === 401) {
        // 401 Unauthorized - token expired or invalid (normal case)
        // Don't log as error, just silently clear token
        // This is expected behavior when token expires
      } else {
        // Other errors - only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.warn('Token verification failed:', error.response?.status, error.message);
        }
      }
      
      // Always clear invalid token
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const data = await authService.login(username, password);
      
      const { access_token, user } = data;
      localStorage.setItem('token', access_token);
      setIsAuthenticated(true);
      setUser(user);
      
      return { success: true };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    getAuthHeaders
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
