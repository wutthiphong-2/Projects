import React, { createContext, useState, useContext, useCallback } from 'react';
import { notification as antNotification } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  UserAddOutlined,
  TeamOutlined,
  FolderOutlined
} from '@ant-design/icons';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // ฟังก์ชันสำหรับเพิ่ม notification ใหม่
  const addNotification = useCallback((type, title, message, details = {}) => {
    const newNotification = {
      id: Date.now(),
      type, // 'success', 'error', 'warning', 'info', 'user', 'group', 'ou'
      title,
      message,
      details,
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // เก็บแค่ 50 รายการล่าสุด
    return newNotification;
  }, []);

  // ฟังก์ชันแสดง Ant Design notification
  const showNotification = useCallback((type, title, message, duration = 4.5) => {
    const icons = {
      success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      error: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      warning: <WarningOutlined style={{ color: '#faad14' }} />,
      info: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
      user: <UserAddOutlined style={{ color: '#1890ff' }} />,
      group: <TeamOutlined style={{ color: '#722ed1' }} />,
      ou: <FolderOutlined style={{ color: '#fa8c16' }} />
    };

    antNotification[type === 'user' || type === 'group' || type === 'ou' ? 'info' : type]({
      message: title,
      description: message,
      icon: icons[type] || icons.info,
      duration,
      placement: 'topRight'
    });
  }, []);

  // Notification helpers สำหรับ User operations
  const notifyUserCreated = useCallback((userName, userEmail) => {
    const title = '✅ สร้างผู้ใช้สำเร็จ';
    const message = `สร้างผู้ใช้ "${userName}" (${userEmail}) เรียบร้อยแล้ว`;
    addNotification('user', title, message, { action: 'create', userName, userEmail });
    showNotification('success', title, message);
  }, [addNotification, showNotification]);

  const notifyUserUpdated = useCallback((userName) => {
    const title = '✏️ แก้ไขผู้ใช้สำเร็จ';
    const message = `แก้ไขข้อมูลผู้ใช้ "${userName}" เรียบร้อยแล้ว`;
    addNotification('user', title, message, { action: 'update', userName });
    showNotification('success', title, message);
  }, [addNotification, showNotification]);

  const notifyUserDeleted = useCallback((userName) => {
    const title = '🗑️ ลบผู้ใช้สำเร็จ';
    const message = `ลบผู้ใช้ "${userName}" เรียบร้อยแล้ว`;
    addNotification('user', title, message, { action: 'delete', userName });
    showNotification('warning', title, message);
  }, [addNotification, showNotification]);

  const notifyUserStatusChanged = useCallback((userName, isEnabled) => {
    const title = isEnabled ? '✅ เปิดใช้งานผู้ใช้' : '⛔ ปิดใช้งานผู้ใช้';
    const message = `${isEnabled ? 'เปิด' : 'ปิด'}ใช้งานผู้ใช้ "${userName}" เรียบร้อยแล้ว`;
    addNotification('user', title, message, { action: 'toggleStatus', userName, isEnabled });
    showNotification('info', title, message);
  }, [addNotification, showNotification]);

  const notifyPasswordReset = useCallback((userName) => {
    const title = '🔑 รีเซ็ตรหัสผ่านสำเร็จ';
    const message = `รีเซ็ตรหัสผ่านสำหรับ "${userName}" เรียบร้อยแล้ว`;
    addNotification('user', title, message, { action: 'resetPassword', userName });
    showNotification('success', title, message);
  }, [addNotification, showNotification]);

  // Notification helpers สำหรับ Group operations
  const notifyGroupCreated = useCallback((groupName) => {
    const title = '✅ สร้างกลุ่มสำเร็จ';
    const message = `สร้างกลุ่ม "${groupName}" เรียบร้อยแล้ว`;
    addNotification('group', title, message, { action: 'create', groupName });
    showNotification('success', title, message);
  }, [addNotification, showNotification]);

  const notifyGroupUpdated = useCallback((groupName) => {
    const title = '✏️ แก้ไขกลุ่มสำเร็จ';
    const message = `แก้ไขข้อมูลกลุ่ม "${groupName}" เรียบร้อยแล้ว`;
    addNotification('group', title, message, { action: 'update', groupName });
    showNotification('success', title, message);
  }, [addNotification, showNotification]);

  const notifyGroupDeleted = useCallback((groupName) => {
    const title = '🗑️ ลบกลุ่มสำเร็จ';
    const message = `ลบกลุ่ม "${groupName}" เรียบร้อยแล้ว`;
    addNotification('group', title, message, { action: 'delete', groupName });
    showNotification('warning', title, message);
  }, [addNotification, showNotification]);

  const notifyMemberAdded = useCallback((userName, groupName) => {
    const title = '👥 เพิ่มสมาชิกสำเร็จ';
    const message = `เพิ่ม "${userName}" เข้ากลุ่ม "${groupName}" เรียบร้อยแล้ว`;
    addNotification('group', title, message, { action: 'addMember', userName, groupName });
    showNotification('success', title, message);
  }, [addNotification, showNotification]);

  const notifyMemberRemoved = useCallback((userName, groupName) => {
    const title = '👥 ลบสมาชิกสำเร็จ';
    const message = `ลบ "${userName}" ออกจากกลุ่ม "${groupName}" เรียบร้อยแล้ว`;
    addNotification('group', title, message, { action: 'removeMember', userName, groupName });
    showNotification('info', title, message);
  }, [addNotification, showNotification]);

  // Notification helpers สำหรับ OU operations
  const notifyOUCreated = useCallback((ouName) => {
    const title = '✅ สร้าง OU สำเร็จ';
    const message = `สร้าง OU "${ouName}" เรียบร้อยแล้ว`;
    addNotification('ou', title, message, { action: 'create', ouName });
    showNotification('success', title, message);
  }, [addNotification, showNotification]);

  const notifyOUUpdated = useCallback((ouName) => {
    const title = '✏️ แก้ไข OU สำเร็จ';
    const message = `แก้ไขข้อมูล OU "${ouName}" เรียบร้อยแล้ว`;
    addNotification('ou', title, message, { action: 'update', ouName });
    showNotification('success', title, message);
  }, [addNotification, showNotification]);

  const notifyOUDeleted = useCallback((ouName) => {
    const title = '🗑️ ลบ OU สำเร็จ';
    const message = `ลบ OU "${ouName}" เรียบร้อยแล้ว`;
    addNotification('ou', title, message, { action: 'delete', ouName });
    showNotification('warning', title, message);
  }, [addNotification, showNotification]);

  // Generic notification helpers
  const notifySuccess = useCallback((title, message) => {
    addNotification('success', title, message);
    showNotification('success', title, message);
  }, [addNotification, showNotification]);

  const notifyError = useCallback((title, message) => {
    addNotification('error', title, message);
    showNotification('error', title, message, 6);
  }, [addNotification, showNotification]);

  const notifyWarning = useCallback((title, message) => {
    addNotification('warning', title, message);
    showNotification('warning', title, message);
  }, [addNotification, showNotification]);

  const notifyInfo = useCallback((title, message) => {
    addNotification('info', title, message);
    showNotification('info', title, message);
  }, [addNotification, showNotification]);

  // Mark notification as read
  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Get unread count
  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const value = {
    notifications,
    addNotification,
    
    // User notifications
    notifyUserCreated,
    notifyUserUpdated,
    notifyUserDeleted,
    notifyUserStatusChanged,
    notifyPasswordReset,
    
    // Group notifications
    notifyGroupCreated,
    notifyGroupUpdated,
    notifyGroupDeleted,
    notifyMemberAdded,
    notifyMemberRemoved,
    
    // OU notifications
    notifyOUCreated,
    notifyOUUpdated,
    notifyOUDeleted,
    
    // Generic notifications
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    
    // Utility functions
    markAsRead,
    markAllAsRead,
    clearAll,
    getUnreadCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;

