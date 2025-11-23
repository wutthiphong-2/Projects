import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Space,
  Button,
  Checkbox,
  Typography,
  Tag,
  Row,
  Col,
  Modal,
  Form,
  Select,
  message,
  Alert,
  Divider,
  Empty,
  Tooltip,
  Badge
} from 'antd';
import {
  SafetyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  ReloadOutlined,
  KeyOutlined,
  ApiOutlined,
  LockOutlined,
  UnlockOutlined
} from '@ant-design/icons';
import { apiKeyService } from '../../services/apiKeyService';
import './APIManagement.css';

const { Title, Text } = Typography;
const { Option } = Select;

// Available endpoints and their permissions
const AVAILABLE_ENDPOINTS = [
  { 
    endpoint: '/api/users', 
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    label: 'Users Management',
    description: 'จัดการผู้ใช้'
  },
  { 
    endpoint: '/api/groups', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    label: 'Groups Management',
    description: 'จัดการกลุ่ม'
  },
  { 
    endpoint: '/api/ous', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    label: 'OUs Management',
    description: 'จัดการ Organizational Units'
  },
  { 
    endpoint: '/api/activity-logs', 
    methods: ['GET'],
    label: 'Activity Logs',
    description: 'ดู Activity Logs'
  },
  { 
    endpoint: '/api/api-keys', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    label: 'API Keys',
    description: 'จัดการ API Keys'
  }
];

// Permission templates
const PERMISSION_TEMPLATES = {
  read_only: {
    name: 'Read Only',
    description: 'อ่านข้อมูลได้เท่านั้น',
    permissions: [
      'GET:/api/users',
      'GET:/api/groups',
      'GET:/api/ous',
      'GET:/api/activity-logs'
    ]
  },
  read_write: {
    name: 'Read & Write',
    description: 'อ่านและเขียนข้อมูลได้',
    permissions: [
      'GET:/api/users',
      'POST:/api/users',
      'PUT:/api/users',
      'PATCH:/api/users',
      'GET:/api/groups',
      'POST:/api/groups',
      'PUT:/api/groups',
      'GET:/api/ous',
      'POST:/api/ous',
      'PUT:/api/ous',
      'GET:/api/activity-logs'
    ]
  },
  full_access: {
    name: 'Full Access',
    description: 'เข้าถึงได้ทั้งหมด',
    permissions: [] // Empty = all permissions
  }
};

const PermissionsManager = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [permissionsModalVisible, setPermissionsModalVisible] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch API keys
  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    setLoading(true);
    try {
      const data = await apiKeyService.getAPIKeys();
      setApiKeys(data || []);
    } catch (error) {
      message.error('ไม่สามารถโหลด API Keys ได้: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Open permissions modal
  const openPermissionsModal = (key) => {
    setSelectedKey(key);
    // Parse permissions from key
    const perms = key.permissions || [];
    setSelectedPermissions(perms);
    setPermissionsModalVisible(true);
  };

  // Apply template
  const applyTemplate = (templateName) => {
    const template = PERMISSION_TEMPLATES[templateName];
    if (template) {
      setSelectedPermissions(template.permissions);
      message.success(`ใช้ Template: ${template.name}`);
    }
  };

  // Toggle permission
  const togglePermission = (endpoint, method) => {
    const perm = `${method}:${endpoint}`;
    setSelectedPermissions(prev => {
      if (prev.includes(perm)) {
        return prev.filter(p => p !== perm);
      } else {
        return [...prev, perm];
      }
    });
  };

  // Check if permission is selected
  const isPermissionSelected = (endpoint, method) => {
    const perm = `${method}:${endpoint}`;
    return selectedPermissions.includes(perm);
  };

  // Check if all methods selected for endpoint
  const isAllMethodsSelected = (endpoint) => {
    const endpointData = AVAILABLE_ENDPOINTS.find(e => e.endpoint === endpoint);
    if (!endpointData) return false;
    return endpointData.methods.every(method => 
      isPermissionSelected(endpoint, method)
    );
  };

  // Toggle all methods for endpoint
  const toggleAllMethods = (endpoint) => {
    const endpointData = AVAILABLE_ENDPOINTS.find(e => e.endpoint === endpoint);
    if (!endpointData) return;

    if (isAllMethodsSelected(endpoint)) {
      // Unselect all
      endpointData.methods.forEach(method => {
        const perm = `${method}:${endpoint}`;
        setSelectedPermissions(prev => prev.filter(p => p !== perm));
      });
    } else {
      // Select all
      endpointData.methods.forEach(method => {
        const perm = `${method}:${endpoint}`;
        if (!selectedPermissions.includes(perm)) {
          setSelectedPermissions(prev => [...prev, perm]);
        }
      });
    }
  };

  // Save permissions
  const handleSavePermissions = async () => {
    try {
      await apiKeyService.updateAPIKey(selectedKey.id, {
        permissions: selectedPermissions
      });
      message.success('อัปเดต Permissions สำเร็จ!');
      setPermissionsModalVisible(false);
      setSelectedKey(null);
      fetchAPIKeys();
    } catch (error) {
      message.error('ไม่สามารถอัปเดต Permissions ได้: ' + (error.response?.data?.message || error.message));
    }
  };

  // Get permission count
  const getPermissionCount = (key) => {
    if (!key.permissions || key.permissions.length === 0) {
      return 'All';
    }
    return `${key.permissions.length} permissions`;
  };

  // Columns
  const columns = [
    {
      title: 'API Key',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <KeyOutlined style={{ color: '#1890ff' }} />
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <Text type="secondary" code style={{ fontSize: '11px' }}>
              {record.key_prefix}...
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_, record) => {
        const count = getPermissionCount(record);
        const isFullAccess = !record.permissions || record.permissions.length === 0;
        return (
          <Space>
            {isFullAccess ? (
              <Tag color="green" icon={<UnlockOutlined />}>
                Full Access
              </Tag>
            ) : (
              <Tag color="blue" icon={<LockOutlined />}>
                {count}
              </Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: 'สถานะ',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        isActive ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>ใช้งาน</Tag>
        ) : (
          <Tag color="default" icon={<CloseCircleOutlined />}>ปิดใช้งาน</Tag>
        )
      )
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={() => openPermissionsModal(record)}
        >
          จัดการ Permissions
        </Button>
      )
    }
  ];

  return (
    <div className="permissions-manager">
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ 
          marginBottom: 8,
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          fontSize: '24px'
        }}>
          <SafetyOutlined /> Permissions Management
        </Title>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          จัดการ Permissions และ Scopes สำหรับ API Keys
        </Text>
      </div>

      {/* Info Alert */}
      <Alert
        message="Permissions & Scopes"
        description="กำหนด Permissions แบบละเอียดสำหรับแต่ละ API Key. หากไม่กำหนด Permissions จะสามารถเข้าถึงได้ทั้งหมด (Full Access)."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        closable
      />

      {/* Table */}
      <Card
        title={
          <Space>
            <SafetyOutlined />
            <span>API Keys Permissions</span>
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchAPIKeys}
            loading={loading}
          >
            Refresh
          </Button>
        }
      >
        {apiKeys.length === 0 ? (
          <Empty description="ไม่มี API Keys" />
        ) : (
          <Table
            columns={columns}
            dataSource={apiKeys}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `ทั้งหมด ${total} รายการ`
            }}
          />
        )}
      </Card>

      {/* Permissions Modal */}
      <Modal
        title={
          <Space>
            <SafetyOutlined />
            <span>จัดการ Permissions: {selectedKey?.name}</span>
          </Space>
        }
        open={permissionsModalVisible}
        onCancel={() => {
          setPermissionsModalVisible(false);
          setSelectedKey(null);
        }}
        footer={null}
        width={800}
      >
        {selectedKey && (
          <div>
            <Alert
              message="Permissions"
              description={
                <div>
                  <Text>เลือก Permissions ที่ต้องการอนุญาตสำหรับ API Key นี้</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    หากไม่เลือกอะไร = Full Access (เข้าถึงได้ทั้งหมด)
                  </Text>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            {/* Templates */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>Templates:</Text>
              <Space wrap>
                {Object.entries(PERMISSION_TEMPLATES).map(([key, template]) => (
                  <Button
                    key={key}
                    onClick={() => applyTemplate(key)}
                    size="small"
                  >
                    {template.name}
                  </Button>
                ))}
                <Button
                  onClick={() => setSelectedPermissions([])}
                  size="small"
                  type="default"
                >
                  Clear All (Full Access)
                </Button>
              </Space>
            </div>

            <Divider />

            {/* Permissions List */}
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {AVAILABLE_ENDPOINTS.map((endpointData, idx) => (
                <Card
                  key={idx}
                  size="small"
                  style={{ marginBottom: 16 }}
                  title={
                    <Space>
                      <ApiOutlined />
                      <span>{endpointData.label}</span>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {endpointData.endpoint}
                      </Text>
                    </Space>
                  }
                  extra={
                    <Checkbox
                      checked={isAllMethodsSelected(endpointData.endpoint)}
                      indeterminate={
                        endpointData.methods.some(m => isPermissionSelected(endpointData.endpoint, m)) &&
                        !isAllMethodsSelected(endpointData.endpoint)
                      }
                      onChange={() => toggleAllMethods(endpointData.endpoint)}
                    >
                      Select All
                    </Checkbox>
                  }
                >
                  <Space wrap>
                    {endpointData.methods.map(method => {
                      const isSelected = isPermissionSelected(endpointData.endpoint, method);
                      return (
                        <Checkbox
                          key={method}
                          checked={isSelected}
                          onChange={() => togglePermission(endpointData.endpoint, method)}
                        >
                          <Tag color={method === 'GET' ? 'blue' : method === 'POST' ? 'green' : method === 'PUT' ? 'orange' : method === 'DELETE' ? 'red' : 'default'}>
                            {method}
                          </Tag>
                        </Checkbox>
                      );
                    })}
                  </Space>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {endpointData.description}
                    </Text>
                  </div>
                </Card>
              ))}
            </div>

            {/* Selected Permissions Summary */}
            <Divider />
            <div>
              <Text strong>Selected Permissions ({selectedPermissions.length}):</Text>
              {selectedPermissions.length === 0 ? (
                <div style={{ marginTop: 8 }}>
                  <Tag color="green">Full Access (All Permissions)</Tag>
                </div>
              ) : (
                <div style={{ marginTop: 8, maxHeight: '150px', overflowY: 'auto' }}>
                  <Space wrap>
                    {selectedPermissions.map((perm, idx) => (
                      <Tag key={idx} color="blue">{perm}</Tag>
                    ))}
                  </Space>
                </div>
              )}
            </div>

            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setPermissionsModalVisible(false);
                  setSelectedKey(null);
                }}>
                  ยกเลิก
                </Button>
                <Button type="primary" onClick={handleSavePermissions}>
                  บันทึก Permissions
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PermissionsManager;

