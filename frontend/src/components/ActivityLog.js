import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Typography,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Button,
  Row,
  Col,
  Statistic,
  Empty,
  Spin,
  App,
  Tooltip,
  Descriptions,
  Alert,
  Pagination
} from 'antd';
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  SwapOutlined,
  UsergroupAddOutlined,
  UsergroupDeleteOutlined,
  FolderAddOutlined,
  FolderOutlined,
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  ArrowRightOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
  LockOutlined,
  UnlockOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { useNotification } from '../contexts/NotificationContext';
import 'moment/locale/th';  // Thai locale
import './ActivityLog.css';

// Set moment to use Thai locale
moment.locale('th');

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const ActivityLog = () => {
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    actionType: null,
    targetType: null,
    dateRange: null
  });
  const [stats, setStats] = useState(null);
  const [actionTypes, setActionTypes] = useState([]);
  const { 
    loading, 
    fetchActivityLogs, 
    fetchStats, 
    fetchActionTypes 
  } = useActivityLogs();
  const { notifyError } = useNotification();
  const { message } = App.useApp();

  // Action type icons and colors mapping
  const ACTION_CONFIG = {
    // Web-based actions (สีเขียว/น้ำเงิน/แดง)
    user_create: { icon: <UserAddOutlined />, color: '#10b981', label: 'สร้างผู้ใช้ (Web)' },
    user_update: { icon: <EditOutlined />, color: '#3b82f6', label: 'แก้ไขผู้ใช้ (Web)' },
    user_delete: { icon: <DeleteOutlined />, color: '#ef4444', label: 'ลบผู้ใช้ (Web)' },
    password_reset: { icon: <KeyOutlined />, color: '#f59e0b', label: 'รีเซ็ตรหัสผ่าน (Web)' },
    user_status_change: { icon: <SwapOutlined />, color: '#8b5cf6', label: 'เปลี่ยนสถานะ (Web)' },
    group_member_add: { icon: <UsergroupAddOutlined />, color: '#10b981', label: 'เพิ่มสมาชิก (Web)' },
    group_member_remove: { icon: <UsergroupDeleteOutlined />, color: '#ef4444', label: 'ลบสมาชิก (Web)' },
    ou_create: { icon: <FolderAddOutlined />, color: '#10b981', label: 'สร้าง OU (Web)' },
    ou_update: { icon: <EditOutlined />, color: '#3b82f6', label: 'แก้ไข OU (Web)' },
    ou_delete: { icon: <FolderOutlined />, color: '#ef4444', label: 'ลบ OU (Web)' },
  };

  // Target type icons
  const TARGET_ICONS = {
    user: <UserOutlined />,
    group: <TeamOutlined />,
    ou: <ApartmentOutlined />
  };

  // Fetch activities
  const fetchActivities = useCallback(async (page = 1, pageSize = 20) => {
    try {
      const params = {
        page,
        page_size: pageSize,
        ...(filters.search && { search: filters.search }),
        ...(filters.actionType && { action_type: filters.actionType }),
        ...(filters.targetType && { target_type: filters.targetType }),
        ...(filters.dateRange && filters.dateRange[0] && {
          date_from: filters.dateRange[0].toISOString(),
          date_to: filters.dateRange[1].toISOString()
        })
      };

      const result = await fetchActivityLogs(params);

      if (result.success) {
        setActivities(result.data.items || result.data);
      setPagination({
        current: page,
        pageSize,
          total: result.data.total || result.data.length || 0
      });
      } else {
        notifyError('ไม่สามารถโหลดข้อมูล Activity Log ได้', result.error);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      notifyError('ไม่สามารถโหลดข้อมูล Activity Log ได้', error.message);
    }
  }, [filters, fetchActivityLogs, notifyError]);

  // Fetch stats
  const loadStats = useCallback(async () => {
    try {
      const result = await fetchStats({ days: 30 });
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [fetchStats]);

  // Fetch action types
  const loadActionTypes = useCallback(async () => {
    try {
      const result = await fetchActionTypes();
      if (result.success) {
        setActionTypes(result.data);
      }
    } catch (error) {
      console.error('Error fetching action types:', error);
    }
  }, [fetchActionTypes]);

  useEffect(() => {
    fetchActivities();
    loadStats();
    loadActionTypes();
  }, [fetchActivities, loadStats, loadActionTypes]);

  // Force hide Quick Jumper after render
  useEffect(() => {
    const hideQuickJumper = () => {
      const quickJumpers = document.querySelectorAll('.ant-pagination-options-quick-jumper');
      quickJumpers.forEach(element => {
        if (element) {
          element.style.display = 'none';
          element.style.visibility = 'hidden';
          element.style.opacity = '0';
          element.style.width = '0';
          element.style.height = '0';
          element.remove(); // Remove completely from DOM
        }
      });
    };

    // Run immediately and also after a delay
    hideQuickJumper();
    const timer = setInterval(hideQuickJumper, 100);
    
    return () => clearInterval(timer);
  }, [activities, pagination]);

  // Handle table change (pagination, filters, sorter)
  const handleTableChange = (newPagination) => {
    fetchActivities(newPagination.current, newPagination.pageSize);
  };

  // Handle filter change
  const handleFilterChange = () => {
    setPagination({ ...pagination, current: 1 });
    fetchActivities(1, pagination.pageSize);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      search: '',
      actionType: null,
      targetType: null,
      dateRange: null
    });
    setTimeout(() => {
      fetchActivities(1, pagination.pageSize);
    }, 100);
  };

  // Format timestamp (Thailand time)
  const formatTimestamp = (timestamp) => {
    return moment(timestamp).format('DD/MM/YYYY HH:mm:ss');
  };

  // Get time ago (Thai locale)
  const getTimeAgo = (timestamp) => {
    return moment(timestamp).fromNow();
  };
  
  // Format for display in Thai
  const formatThaiDateTime = (timestamp) => {
    return moment(timestamp).format('D MMMM YYYY เวลา HH:mm น.');
  };

  // Get field label in Thai
  const getFieldLabel = (field) => {
    const labels = {
      'displayName': 'ชื่อแสดง',
      'givenName': 'ชื่อ',
      'sn': 'นามสกุล',
      'mail': 'อีเมล',
      'title': 'ตำแหน่ง',
      'department': 'แผนก',
      'company': 'บริษัท',
      'employeeID': 'รหัสพนักงาน',
      'telephoneNumber': 'เบอร์โทร',
      'mobile': 'มือถือ',
      'physicalDeliveryOfficeName': 'สำนักงาน',
      'streetAddress': 'ที่อยู่',
      'l': 'เมือง',
      'st': 'จังหวัด',
      'postalCode': 'รหัสไปรษณีย์',
      'co': 'ประเทศ',
      'description': 'คำอธิบาย'
    };
    return labels[field] || field;
  };

  // Table columns
  const columns = [
    {
      title: 'เวลา',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp) => (
        <Tooltip title={formatThaiDateTime(timestamp)}>
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {getTimeAgo(timestamp)}
            </Text>
            <Text style={{ fontSize: 11, color: '#9ca3af' }}>
              {moment(timestamp).format('DD/MM/YY HH:mm')}
            </Text>
          </Space>
        </Tooltip>
      )
    },
    {
      title: 'การกระทำ',
      dataIndex: 'action_type',
      key: 'action_type',
      width: 150,
      render: (actionType) => {
        const config = ACTION_CONFIG[actionType] || { icon: null, color: '#6b7280', label: actionType };
        return (
          <Tag
            icon={config.icon}
            color={config.color}
            style={{
              fontWeight: 600,
              fontSize: 12,
              padding: '4px 12px',
              borderRadius: 6
            }}
          >
            {config.label}
          </Tag>
        );
      }
    },
    {
      title: 'ผู้ใช้',
      key: 'user',
      width: 200,
      render: (record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>
            {record.user_display_name || record.user_id}
          </Text>
          <Text style={{ fontSize: 11, color: '#6b7280' }}>
            @{record.user_id}
          </Text>
        </Space>
      )
    },
    {
      title: 'เป้าหมาย',
      key: 'target',
      render: (record) => (
        <Space>
          <span style={{ fontSize: 16, color: '#6b7280' }}>
            {TARGET_ICONS[record.target_type]}
          </span>
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: 13 }}>
              {record.target_name || 'N/A'}
            </Text>
            <Text style={{ fontSize: 11, color: '#6b7280' }}>
              {record.target_type === 'user' && 'ผู้ใช้'}
              {record.target_type === 'group' && 'กลุ่ม'}
              {record.target_type === 'ou' && 'OU'}
            </Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'รายละเอียดการเปลี่ยนแปลง',
      dataIndex: 'details',
      key: 'details',
      width: 400,
      render: (details, record) => {
        if (!details) return <Text type="secondary">-</Text>;
        
        // Check if there are detailed changes
        if (details.changes && Array.isArray(details.changes) && details.changes.length > 0) {
          return (
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {details.changes.map((change, idx) => (
                <div key={idx} style={{ 
                  background: '#f0f9ff', 
                  padding: '8px 12px', 
                  borderRadius: 6,
                  border: '1px solid #bfdbfe'
                }}>
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: 12, color: '#1e40af' }}>
                      {getFieldLabel(change.field)}
                    </Text>
                    <div style={{ fontSize: 11 }}>
                      <Text delete type="secondary" style={{ color: '#dc2626' }}>
                        {change.old_value || '(ว่าง)'}
                      </Text>
                      <ArrowRightOutlined style={{ margin: '0 6px', color: '#6b7280' }} />
                      <Text strong style={{ color: '#059669' }}>
                        {change.new_value}
                      </Text>
                    </div>
                  </Space>
                </div>
              ))}
            </Space>
          );
        }
        
        // Fallback: Show all details as tags
        return (
          <Space size={4} wrap>
            {Object.entries(details).map(([key, value]) => {
              if (key === 'changes') return null; // Skip already displayed
              return (
                <Tag key={key} style={{ fontSize: 11, margin: 2 }}>
                  {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </Tag>
              );
            })}
          </Space>
        );
      }
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'success' ? 'success' : 'error'} style={{ fontWeight: 600 }}>
          {status === 'success' ? 'สำเร็จ' : 'ล้มเหลว'}
        </Tag>
      )
    }
  ];

  return (
    <div className="activity-log-container">
      {/* Header Section */}
      <header style={{ padding: '0', marginBottom: '24px' }}>
        <Row gutter={[24, 16]} align="middle" style={{ marginBottom: '24px' }}>
            <Col xs={24} md={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '16px',
                  backdropFilter: 'blur(10px)'
                }}>
                <BarChartOutlined style={{ fontSize: 44, color: '#ffffff' }} />
              </div>
              <div>
                <div style={{ 
                  color: '#ffffff',
                  margin: 0, 
                  marginBottom: 4, 
                  fontWeight: 700, 
                  fontSize: 32,
                  letterSpacing: '-0.8px'
                }}>
                  Activity Log
                </div>
                <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 15, fontWeight: 500 }}>
                    ติดตามและตรวจสอบกิจกรรมทั้งหมดในระบบ
                  </Text>
                </div>
              </div>
            </Col>
        </Row>

        {/* Statistics Cards */}
            {stats && (
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6} md={6}>
              <div style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: '24px',
                textAlign: 'center',
                border: 'none',
                borderLeft: '4px solid #2563eb',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12)';
              }}
              >
                    <div style={{
                  fontSize: 13,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  marginBottom: 12,
                  fontWeight: 600
                    }}>
                  <ClockCircleOutlined style={{ marginRight: 6, color: '#2563eb' }} /> กิจกรรมทั้งหมด
                      </div>
                <div style={{ 
                  fontSize: 32, 
                  fontWeight: 700, 
                  color: '#2563eb'
                }}>
                        {stats.total_actions}
                      </div>
                    </div>
                  </Col>
            <Col xs={12} sm={6} md={6}>
              <div style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: '24px',
                textAlign: 'center',
                border: 'none',
                borderLeft: '4px solid #10b981',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12)';
              }}
              >
                    <div style={{
                  fontSize: 13,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  marginBottom: 12,
                  fontWeight: 600
                    }}>
                  <CheckCircleOutlined style={{ marginRight: 6, color: '#10b981' }} /> ช่วง 30 วัน
                      </div>
                <div style={{ 
                  fontSize: 32, 
                  fontWeight: 700, 
                  color: '#10b981'
                }}>
                        {stats.period_days}
                      </div>
                    </div>
                  </Col>
                </Row>
            )}
      </header>

      {/* Main Content Area */}
      <main style={{ padding: '0' }}>
        {/* Filters Section */}
        <Card
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '16px 24px',
            marginBottom: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: 'none'
          }}
        >

          <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Space size={8}>
                <FilterOutlined style={{ color: '#2563eb', fontSize: 16 }} />
              <Text strong style={{ fontSize: 14 }}>กรองและค้นหาข้อมูล</Text>
            </Space>
            <Space size={8}>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchActivities(pagination.current, pagination.pageSize);
                  fetchStats();
                }}
                size="small"
                style={{
                    borderRadius: 8,
                  fontWeight: 600
                }}
              >
                รีเฟรช
              </Button>
              <Button 
                onClick={handleResetFilters}
                size="small"
                style={{
                    borderRadius: 8,
                  fontWeight: 600
                }}
              >
                ล้างตัวกรอง
              </Button>
            </Space>
          </div>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Select
                placeholder="ประเภทการกระทำ"
                value={filters.actionType}
                onChange={(value) => setFilters({ ...filters, actionType: value })}
                style={{ width: '100%' }}
                allowClear
              >
                {actionTypes.map(type => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} md={8}>
              <Select
                placeholder="ประเภทเป้าหมาย"
                value={filters.targetType}
                onChange={(value) => setFilters({ ...filters, targetType: value })}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="user">ผู้ใช้</Option>
                <Option value="group">กลุ่ม</Option>
                <Option value="ou">OU</Option>
              </Select>
            </Col>
            <Col xs={24} md={8}>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleFilterChange}
                block
                  style={{
                    borderRadius: 8,
                    fontWeight: 600
                  }}
              >
                ค้นหา
              </Button>
            </Col>
          </Row>
        </div>
        </Card>

        {/* Table Section */}
        <Card
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: 'none'
          }}
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 16 }}>
            <Space size={8}>
                <ClockCircleOutlined style={{ color: '#10b981', fontSize: 16 }} />
              <div>
                <Text strong style={{ fontSize: 14 }}>รายการกิจกรรมล่าสุด</Text>
                {activities.length > 0 && (
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 400 }}>
                    แสดง {activities.length} รายการ
                  </div>
                )}
              </div>
            </Space>
          </div>
          <Table
            columns={columns}
            dataSource={activities}
            rowKey="id"
            loading={loading}
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  description="ยังไม่มีข้อมูล Activity Log"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )
            }}
            scroll={{ x: 1200 }}
            style={{ borderRadius: 8 }}
          />
        </div>
      </Card>
      </main>
    </div>
  );
};

export default ActivityLog;

