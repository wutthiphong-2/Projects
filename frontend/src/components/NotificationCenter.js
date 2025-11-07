import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  Avatar,
  Typography,
  Space,
  Badge,
  Tag,
  Button,
  Empty,
  Divider,
  Tooltip,
  Popconfirm
} from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  EditOutlined,
  TeamOutlined,
  FolderOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useNotification } from '../contexts/NotificationContext';
import './NotificationCenter.css';

const { Title, Text } = Typography;

const NotificationCenter = ({ visible, onClose }) => {
  const { notifications, markAsRead, markAllAsRead, clearAll, getUnreadCount } = useNotification();
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'user', 'group', 'ou'

  const getIcon = (type) => {
    const icons = {
      success: <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />,
      error: <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />,
      warning: <WarningOutlined style={{ color: '#faad14', fontSize: 24 }} />,
      info: <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 24 }} />,
      user: <UserAddOutlined style={{ color: '#1890ff', fontSize: 24 }} />,
      group: <TeamOutlined style={{ color: '#722ed1', fontSize: 24 }} />,
      ou: <FolderOutlined style={{ color: '#fa8c16', fontSize: 24 }} />
    };
    return icons[type] || icons.info;
  };

  const getActionIcon = (action) => {
    const icons = {
      create: <UserAddOutlined />,
      update: <EditOutlined />,
      delete: <UserDeleteOutlined />,
      toggleStatus: <CheckCircleOutlined />,
      resetPassword: <CheckCircleOutlined />,
      addMember: <UserAddOutlined />,
      removeMember: <UserDeleteOutlined />
    };
    return icons[action];
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'เมื่อสักครู่';
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    if (days < 7) return `${days} วันที่แล้ว`;
    
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'user') return notif.type === 'user';
    if (filter === 'group') return notif.type === 'group';
    if (filter === 'ou') return notif.type === 'ou';
    return true;
  });

  return (
    <Drawer
      title={
        <Space>
          <BellOutlined style={{ fontSize: 20 }} />
          <span>ศูนย์การแจ้งเตือน</span>
          <Badge count={getUnreadCount()} />
        </Space>
      }
      placement="right"
      width={480}
      onClose={onClose}
      open={visible}
      extra={
        <Space>
          <Tooltip title="ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว">
            <Button 
              icon={<CheckOutlined />} 
              size="small"
              onClick={markAllAsRead}
              disabled={getUnreadCount() === 0}
            >
              อ่านทั้งหมด
            </Button>
          </Tooltip>
          <Popconfirm
            title="ต้องการล้างการแจ้งเตือนทั้งหมด?"
            onConfirm={clearAll}
            okText="ใช่"
            cancelText="ไม่"
          >
            <Tooltip title="ล้างทั้งหมด">
              <Button 
                icon={<DeleteOutlined />} 
                size="small" 
                danger
                disabled={notifications.length === 0}
              >
                ล้าง
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      }
      className="notification-center-drawer"
    >
      {/* Filter Tabs */}
      <div className="notification-filters">
        <Space size="small" wrap>
          <Tag 
            color={filter === 'all' ? 'blue' : 'default'} 
            onClick={() => setFilter('all')}
            style={{ cursor: 'pointer' }}
          >
            ทั้งหมด ({notifications.length})
          </Tag>
          <Tag 
            color={filter === 'unread' ? 'red' : 'default'} 
            onClick={() => setFilter('unread')}
            style={{ cursor: 'pointer' }}
          >
            ยังไม่อ่าน ({getUnreadCount()})
          </Tag>
          <Tag 
            color={filter === 'user' ? 'cyan' : 'default'} 
            onClick={() => setFilter('user')}
            style={{ cursor: 'pointer' }}
          >
            <UserAddOutlined /> ผู้ใช้
          </Tag>
          <Tag 
            color={filter === 'group' ? 'purple' : 'default'} 
            onClick={() => setFilter('group')}
            style={{ cursor: 'pointer' }}
          >
            <TeamOutlined /> กลุ่ม
          </Tag>
          <Tag 
            color={filter === 'ou' ? 'orange' : 'default'} 
            onClick={() => setFilter('ou')}
            style={{ cursor: 'pointer' }}
          >
            <FolderOutlined /> OU
          </Tag>
        </Space>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              {filter === 'unread' ? 'ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน' : 'ไม่มีการแจ้งเตือน'}
            </span>
          }
        />
      ) : (
        <List
          dataSource={filteredNotifications}
          renderItem={(item) => (
            <List.Item
              className={`notification-item ${item.read ? 'read' : 'unread'}`}
              onClick={() => markAsRead(item.id)}
              style={{
                cursor: 'pointer',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '8px',
                background: item.read ? '#fff' : '#f0f5ff',
                transition: 'all 0.3s ease'
              }}
            >
              <List.Item.Meta
                avatar={
                  <Badge dot={!item.read} offset={[-5, 5]}>
                    <Avatar 
                      icon={getIcon(item.type)}
                      style={{
                        background: item.read ? '#f0f0f0' : '#fff',
                        border: item.read ? '1px solid #d9d9d9' : '2px solid #1890ff'
                      }}
                    />
                  </Badge>
                }
                title={
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: 14 }}>
                      {item.title}
                    </Text>
                    {item.details?.action && (
                      <Tag 
                        icon={getActionIcon(item.details.action)} 
                        color={
                          item.details.action === 'create' ? 'success' :
                          item.details.action === 'delete' ? 'error' :
                          item.details.action === 'update' ? 'processing' :
                          'default'
                        }
                        style={{ fontSize: 11 }}
                      >
                        {
                          item.details.action === 'create' ? 'สร้าง' :
                          item.details.action === 'update' ? 'แก้ไข' :
                          item.details.action === 'delete' ? 'ลบ' :
                          item.details.action === 'toggleStatus' ? 'เปลี่ยนสถานะ' :
                          item.details.action === 'resetPassword' ? 'รีเซ็ตรหัสผ่าน' :
                          item.details.action === 'addMember' ? 'เพิ่มสมาชิก' :
                          item.details.action === 'removeMember' ? 'ลบสมาชิก' :
                          item.details.action
                        }
                      </Tag>
                    )}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {item.message}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {formatTime(item.timestamp)}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
};

export default NotificationCenter;

