import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';

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
      const apiUrl = config.apiUrl || 'http://localhost:8000';
      const verifyUrl = `${apiUrl}/api/auth/verify`;
      
      // Debug: ตรวจสอบ API URL
      if (!apiUrl || apiUrl.trim() === '' || apiUrl === 'undefined' || apiUrl === 'null') {
        console.error('Invalid API URL:', apiUrl);
        setLoading(false);
        return;
      }
      
      const response = await axios.get(verifyUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 5000
      });
      
      if (response.data.valid) {
        setIsAuthenticated(true);
        setUser(response.data.user);
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
      const apiUrl = config.apiUrl || 'http://localhost:8000';
      const loginUrl = `${apiUrl}/api/auth/login`;
      
      // Debug: ตรวจสอบ API URL
      if (!apiUrl || apiUrl.trim() === '' || apiUrl === 'undefined' || apiUrl === 'null') {
        console.error('Invalid API URL:', apiUrl);
        return { 
          success: false, 
          error: 'API URL ไม่ถูกต้อง กรุณาตรวจสอบการตั้งค่า' 
        };
      }
      
      const response = await axios.post(loginUrl, {
        username,
        password
      }, {
        timeout: 10000
      });

      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      setIsAuthenticated(true);
      setUser(user);
      
      return { success: true };
    } catch (error) {
      // Handle connection errors better
      if (error.code === 'ECONNREFUSED' || (error.message && error.message.includes('ERR_CONNECTION_REFUSED'))) {
        console.error('Cannot connect to backend server. Please ensure backend is running on port 8000.');
        return { 
          success: false, 
          error: 'ไม่สามารถเชื่อมต่อกับ backend server ได้ กรุณาตรวจสอบว่า backend server ทำงานอยู่หรือไม่' 
        };
      }
      
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Login failed' 
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
