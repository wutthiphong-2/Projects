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
        localStorage.removeItem('token');
      }
    } catch (error) {
      // Only log error if it's not a connection refused (backend might be starting)
      if (error.code !== 'ECONNREFUSED' && error.message && !error.message.includes('ERR_CONNECTION_REFUSED')) {
        console.error('Token verification failed:', error);
      }
      localStorage.removeItem('token');
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
