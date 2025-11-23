import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Tag,
  Popconfirm,
  message,
  Card,
  Typography,
  Row,
  Col,
  Statistic,
  Tooltip,
  Alert,
  Switch,
  Select,
  Divider,
  Empty,
  Spin,
  Collapse,
  Checkbox
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ReloadOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  UploadOutlined,
  SyncOutlined,
  SafetyOutlined,
  ApiOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiKeyService } from '../../services/apiKeyService';
import './APIManagement.css';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Available endpoints and their permissions (shared with PermissionsManager)
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

const APIKeyManager = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [copiedKeyId, setCopiedKeyId] = useState(null);
  const [newApiKey, setNewApiKey] = useState(null); // Store newly created key
  const [newApiKeyId, setNewApiKeyId] = useState(null); // Store ID of newly created key
  const [showNewKey, setShowNewKey] = useState(false);
  const [rotateModalVisible, setRotateModalVisible] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(null);
  const [rotatedApiKey, setRotatedApiKey] = useState(null);
  const [rotatedApiKeyId, setRotatedApiKeyId] = useState(null); // Store ID of rotated key
  const [showRotatedKey, setShowRotatedKey] = useState(false);
  const [rotateForm] = Form.useForm();
  // เพิ่ม state สำหรับเก็บ full API key ที่จะแสดงใน modal
  const [viewingFullKey, setViewingFullKey] = useState(null);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [creating, setCreating] = useState(false);
  const [permissionsUpdateKey, setPermissionsUpdateKey] = useState(0);

  // Fetch API keys
  const fetchAPIKeys = async () => {
    setLoading(true);
    try {
      const data = await apiKeyService.getAPIKeys();
      setApiKeys(data || []);
      return data || [];
    } catch (error) {
      message.error('ไม่สามารถโหลด API Keys ได้: ' + (error.response?.data?.message || error.message));
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  // Create API key
  const handleCreate = async (values) => {
    console.log('handleCreate called with values:', values);
    
    if (creating) {
      console.log('Already creating, returning...');
      return; // Prevent double submission
    }
    
    setCreating(true);
    try {
      // Handle DatePicker value (dayjs object)
      let expiresAt = null;
      if (values.expires_at) {
        if (dayjs.isDayjs(values.expires_at)) {
          expiresAt = values.expires_at.toISOString();
        } else if (values.expires_at instanceof Date) {
          expiresAt = values.expires_at.toISOString();
        } else if (typeof values.expires_at === 'string') {
          expiresAt = values.expires_at;
        }
      }

      // Get permissions from form (always get from form, not from values)
      const formPermissions = createForm.getFieldValue('permissions');
      console.log('Form permissions value:', formPermissions);
      console.log('Values.permissions:', values.permissions);
      console.log('Form state:', createForm.getFieldsValue());
      
      // Ensure permissions is an array and filter out invalid values
      let finalPermissions = [];
      if (Array.isArray(formPermissions)) {
        finalPermissions = formPermissions.filter(p => 
          typeof p === 'string' && p.includes(':') && p.length > 3
        );
      } else if (Array.isArray(values.permissions)) {
        finalPermissions = values.permissions.filter(p => 
          typeof p === 'string' && p.includes(':') && p.length > 3
        );
      }
      
      console.log('Final permissions to send (filtered):', finalPermissions);
      
      const data = {
        name: values.name?.trim() || '',
        description: values.description?.trim() || null,
        rate_limit: values.rate_limit || 100,
        expires_at: expiresAt,
        permissions: finalPermissions,
        ip_whitelist: values.ip_whitelist ? values.ip_whitelist.split(',').map(ip => ip.trim()).filter(Boolean) : []
      };

      // Validate required fields
      if (!data.name) {
        message.error('กรุณากรอกชื่อ API Key');
        setCreating(false);
        return;
      }

      console.log('Creating API key with data:', data);
      console.log('Permissions being sent:', data.permissions);
      const result = await apiKeyService.createAPIKey(data);
      console.log('API response:', result);
      
      if (!result || !result.api_key) {
        throw new Error('ไม่ได้รับ API key จากเซิร์ฟเวอร์');
      }
      
      // Store the new key (shown only once!)
      setNewApiKey(result.api_key);
      setShowNewKey(true);
      
      message.success('สร้าง API Key สำเร็จ!');
      createForm.resetFields();
      setCreateModalVisible(false);
      
      // Fetch updated keys list
      const keys = await fetchAPIKeys();
      
      // Find and store the ID of the newly created key
      const newKey = keys?.find(k => result.api_key?.startsWith(k.key_prefix));
      if (newKey) {
        setNewApiKeyId(newKey.id);
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'ไม่สามารถสร้าง API Key ได้';
      message.error('ไม่สามารถสร้าง API Key ได้: ' + errorMessage);
    } finally {
      setCreating(false);
    }
  };

  // Update API key
  const handleUpdate = async (values) => {
    try {
      // Get permissions from form (always get from form, not from values)
      const formPermissions = editForm.getFieldValue('permissions');
      console.log('handleUpdate - Form permissions:', formPermissions);
      console.log('handleUpdate - Values.permissions:', values.permissions);
      
      // Ensure permissions is an array
      const finalPermissions = Array.isArray(formPermissions)
        ? formPermissions
        : (Array.isArray(values.permissions) ? values.permissions : []);

      // Handle DatePicker value (dayjs object)
      let expiresAt = null;
      if (values.expires_at) {
        if (dayjs.isDayjs(values.expires_at)) {
          expiresAt = values.expires_at.toISOString();
        } else if (values.expires_at instanceof Date) {
          expiresAt = values.expires_at.toISOString();
        } else if (typeof values.expires_at === 'string') {
          expiresAt = values.expires_at;
        }
      }

      const data = {
        name: values.name?.trim() || '',
        description: values.description?.trim() || null,
        rate_limit: values.rate_limit || 100,
        expires_at: expiresAt,
        is_active: values.is_active !== undefined ? values.is_active : true,
        permissions: finalPermissions,
        ip_whitelist: values.ip_whitelist ? values.ip_whitelist.split(',').map(ip => ip.trim()).filter(Boolean) : []
      };

      // Validate required fields
      if (!data.name) {
        message.error('กรุณากรอกชื่อ API Key');
        return;
      }

      console.log('Updating API key with data:', data);
      await apiKeyService.updateAPIKey(selectedKey.id, data);
      message.success('อัปเดต API Key สำเร็จ!');
      setEditModalVisible(false);
      setSelectedKey(null);
      editForm.resetFields();
      fetchAPIKeys();
    } catch (error) {
      console.error('Error updating API key:', error);
      const errorMessage = error.response?.data?.detail ||
                          error.response?.data?.message ||
                          error.message ||
                          'ไม่สามารถอัปเดต API Key ได้';
      message.error('ไม่สามารถอัปเดต API Key ได้: ' + errorMessage);
    }
  };

  // Delete API key
  const handleDelete = async (keyId) => {
    try {
      await apiKeyService.deleteAPIKey(keyId);
      message.success('ลบ API Key สำเร็จ!');
      fetchAPIKeys();
    } catch (error) {
      message.error('ไม่สามารถลบ API Key ได้: ' + (error.response?.data?.message || error.message));
    }
  };

  // Copy to clipboard
  const handleCopy = (text, keyId) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(keyId);
    message.success('คัดลอกแล้ว!');
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Export API Keys
  const handleExport = (format) => {
    try {
      if (format === 'json') {
        const dataStr = JSON.stringify(apiKeys, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `api-keys-${dayjs().format('YYYY-MM-DD-HHmmss')}.json`;
        link.click();
        URL.revokeObjectURL(url);
        message.success('Export JSON สำเร็จ!');
      } else if (format === 'csv') {
        // Convert to CSV
        const headers = ['Name', 'Key Prefix', 'Created By', 'Created At', 'Expires At', 'Rate Limit', 'Is Active', 'Usage Count', 'Last Used At', 'Description'];
        const rows = apiKeys.map(key => [
          key.name,
          key.key_prefix,
          key.created_by,
          key.created_at,
          key.expires_at || '',
          key.rate_limit,
          key.is_active ? 'Yes' : 'No',
          key.usage_count || 0,
          key.last_used_at || '',
          key.description || ''
        ]);
        
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const dataBlob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `api-keys-${dayjs().format('YYYY-MM-DD-HHmmss')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        message.success('Export CSV สำเร็จ!');
      }
    } catch (error) {
      message.error('Export ไม่สำเร็จ: ' + error.message);
    }
  };

  // Import API Keys
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!Array.isArray(data)) {
          message.error('ไฟล์ JSON ต้องเป็น Array');
          return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const keyData of data) {
          try {
            await apiKeyService.createAPIKey({
              name: keyData.name || `Imported Key ${Date.now()}`,
              description: keyData.description,
              rate_limit: keyData.rate_limit || 100,
              expires_at: keyData.expires_at || null,
              permissions: keyData.permissions || [],
              ip_whitelist: keyData.ip_whitelist || []
            });
            successCount++;
          } catch (error) {
            console.error('Error importing key:', error);
            failCount++;
          }
        }

        message.success(`Import สำเร็จ: ${successCount} รายการ, ล้มเหลว: ${failCount} รายการ`);
        fetchAPIKeys();
      } catch (error) {
        message.error('Import ไม่สำเร็จ: ' + error.message);
      }
    };
    input.click();
  };

  // Open edit modal
  const openEditModal = (key) => {
    if (!key || !key.id) {
      console.error('Invalid key provided to openEditModal:', key);
      message.error('ไม่สามารถเปิดหน้าต่างแก้ไขได้: ข้อมูลไม่ถูกต้อง');
      return;
    }
    
    console.log('Opening edit modal for key:', key);
    setSelectedKey(key);
    
    // Reset form first
    editForm.resetFields();
    
    // Set form values
    editForm.setFieldsValue({
      name: key.name || '',
      description: key.description || '',
      rate_limit: key.rate_limit || 100,
      expires_at: key.expires_at ? dayjs(key.expires_at) : null,
      is_active: key.is_active !== undefined ? key.is_active : true,
      permissions: key.permissions || [],
      ip_whitelist: key.ip_whitelist?.join(', ') || ''
    });
    
    // Force re-render of permissions
    setPermissionsUpdateKey(prev => prev + 1);
    
    setEditModalVisible(true);
  };

  // Open view modal
  const openViewModal = (key) => {
    setSelectedKey(key);
    // ตรวจสอบว่ามี full key เก็บไว้หรือไม่ (จาก newApiKey หรือ rotatedApiKey)
    if (newApiKey && newApiKeyId && key.id === newApiKeyId) {
      setViewingFullKey(newApiKey);
    } else if (rotatedApiKey && rotatedApiKeyId && key.id === rotatedApiKeyId) {
      setViewingFullKey(rotatedApiKey);
    } else {
      setViewingFullKey(null);
    }
    setViewModalVisible(true);
  };

  // Rotate API key
  const handleRotate = async (values) => {
    try {
      const rotatedKeyId = rotatingKey.id;
      const result = await apiKeyService.rotateAPIKey(rotatedKeyId, values.grace_period_days || 7);
      
      // Store the new rotated key (shown only once!)
      setRotatedApiKey(result.api_key);
      setRotatedApiKeyId(rotatedKeyId);
      setShowRotatedKey(true);
      
      message.success('Rotate API Key สำเร็จ!');
      rotateForm.resetFields();
      setRotateModalVisible(false);
      setRotatingKey(null);
      fetchAPIKeys();
    } catch (error) {
      message.error('ไม่สามารถ Rotate API Key ได้: ' + (error.response?.data?.message || error.message));
    }
  };

  // Open rotate modal
  const openRotateModal = (key) => {
    setRotatingKey(key);
    rotateForm.setFieldsValue({
      grace_period_days: 7
    });
    setRotateModalVisible(true);
  };

  // Permission management helpers
  const getCurrentPermissions = (formType) => {
    const form = formType === 'create' ? createForm : editForm;
    return form.getFieldValue('permissions') || [];
  };

  const isPermissionSelected = (endpoint, method, formType) => {
    const permissions = getCurrentPermissions(formType);
    const permissionString = `${method}:${endpoint}`;
    return permissions.includes(permissionString);
  };

  const isAllMethodsSelected = (endpoint, formType) => {
    const endpointData = AVAILABLE_ENDPOINTS.find(e => e.endpoint === endpoint);
    if (!endpointData) return false;
    
    return endpointData.methods.every(method => 
      isPermissionSelected(endpoint, method, formType)
    );
  };

  const togglePermission = (endpoint, method, formType) => {
    const form = formType === 'create' ? createForm : editForm;
    const currentPermissions = form.getFieldValue('permissions') || [];
    const permissionString = `${method}:${endpoint}`;
    
    console.log('togglePermission:', { endpoint, method, formType, currentPermissions, permissionString });
    
    const newPermissions = [...currentPermissions];
    const index = newPermissions.indexOf(permissionString);
    
    if (index > -1) {
      newPermissions.splice(index, 1);
      console.log('Removed permission');
    } else {
      newPermissions.push(permissionString);
      console.log('Added permission');
    }
    
    // Update form field value
    form.setFieldsValue({ permissions: newPermissions });
    
    // Verify update
    const updated = form.getFieldValue('permissions');
    console.log('Form permissions after update:', updated);
    
    // Force component to re-render
    setPermissionsUpdateKey(prev => prev + 1);
  };

  const toggleAllMethods = (endpoint, formType) => {
    const form = formType === 'create' ? createForm : editForm;
    const endpointData = AVAILABLE_ENDPOINTS.find(e => e.endpoint === endpoint);
    if (!endpointData) return;
    
    const allSelected = isAllMethodsSelected(endpoint, formType);
    const currentPermissions = form.getFieldValue('permissions') || [];
    const newPermissions = [...currentPermissions];
    
    endpointData.methods.forEach(method => {
      const permissionString = `${method}:${endpoint}`;
      const index = newPermissions.indexOf(permissionString);
      
      if (allSelected) {
        // Remove all methods for this endpoint
        if (index > -1) {
          newPermissions.splice(index, 1);
        }
      } else {
        // Add all methods for this endpoint
        if (index === -1) {
          newPermissions.push(permissionString);
        }
      }
    });
    
    // Update form field value
    form.setFieldsValue({ permissions: newPermissions });
    
    // Force component to re-render
    setPermissionsUpdateKey(prev => prev + 1);
  };

  const applyTemplate = (templateKey, formType) => {
    const form = formType === 'create' ? createForm : editForm;
    const template = PERMISSION_TEMPLATES[templateKey];
    if (!template) return;
    
    form.setFieldsValue({ permissions: template.permissions || [] });
  };

  // Columns
  const columns = [
    {
      title: 'ชื่อ',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <KeyOutlined style={{ color: '#1890ff' }} />
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            {record.description && (
              <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
            )}
          </div>
        </Space>
      )
    },
    {
      title: 'API Key',
      dataIndex: 'key_prefix',
      key: 'key_prefix',
      render: (text) => (
        <Text code style={{ fontSize: '12px' }}>{text}...</Text>
      )
    },
    {
      title: 'สถานะ',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive, record) => {
        const isExpired = record.expires_at && dayjs(record.expires_at).isBefore(dayjs());
        if (isExpired) {
          return <Tag color="red" icon={<ClockCircleOutlined />}>หมดอายุ</Tag>;
        }
        return isActive ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>ใช้งาน</Tag>
        ) : (
          <Tag color="default" icon={<CloseCircleOutlined />}>ปิดใช้งาน</Tag>
        );
      }
    },
    {
      title: 'Rate Limit',
      dataIndex: 'rate_limit',
      key: 'rate_limit',
      render: (limit) => <Text>{limit}/นาที</Text>
    },
    {
      title: 'การใช้งาน',
      dataIndex: 'usage_count',
      key: 'usage_count',
      render: (count) => (
        <Space>
          <BarChartOutlined />
          <Text>{count || 0} ครั้ง</Text>
        </Space>
      )
    },
    {
      title: 'ใช้งานล่าสุด',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : <Text type="secondary">ยังไม่เคยใช้</Text>
    },
    {
      title: 'สร้างเมื่อ',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="ดูรายละเอียด">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => openViewModal(record)}
            />
          </Tooltip>
          <Tooltip title="แก้ไข">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                if (record && record.id) {
                  openEditModal(record);
                } else {
                  console.error('Invalid record:', record);
                  message.error('ไม่สามารถแก้ไขได้: ข้อมูลไม่ถูกต้อง');
                }
              }}
            />
          </Tooltip>
          <Tooltip title="Rotate (หมุนเวียน)">
            <Button
              type="text"
              icon={<SyncOutlined />}
              onClick={() => openRotateModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="ลบ API Key?"
            description="คุณแน่ใจหรือไม่ว่าต้องการลบ API Key นี้?"
            onConfirm={() => handleDelete(record.id)}
            okText="ลบ"
            cancelText="ยกเลิก"
          >
            <Tooltip title="ลบ">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Stats
  const stats = {
    total: apiKeys.length,
    active: apiKeys.filter(k => k.is_active && (!k.expires_at || dayjs(k.expires_at).isAfter(dayjs()))).length,
    expired: apiKeys.filter(k => k.expires_at && dayjs(k.expires_at).isBefore(dayjs())).length,
    totalUsage: apiKeys.reduce((sum, k) => sum + (k.usage_count || 0), 0)
  };

  // เพิ่ม function สำหรับทดสอบ API key
  const handleTestToken = async () => {
    if (!viewingFullKey) {
      message.warning('ไม่สามารถทดสอบได้ - ไม่มี full API key');
      return;
    }
    
    setTestingKey(true);
    setTestResult(null);
    
    try {
      const result = await apiKeyService.testAPIKey(viewingFullKey);
      setTestResult(result);
      
      if (result.success) {
        message.success(`✅ ${result.message} (Status: ${result.status})`);
      } else {
        message.error(`❌ ${result.message}${result.status ? ` (Status: ${result.status})` : ''}`);
      }
    } catch (error) {
      const errorResult = {
        success: false,
        status: 0,
        message: 'เกิดข้อผิดพลาดในการทดสอบ',
        error: error.message
      };
      setTestResult(errorResult);
      message.error(`❌ ${errorResult.message}: ${error.message}`);
      console.error('Test failed:', error);
    } finally {
      setTestingKey(false);
    }
  };

  return (
    <div className="api-key-manager">
      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card 
            style={{
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>API Keys ทั้งหมด</span>}
              value={stats.total}
              prefix={<KeyOutlined style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '22px' }} />}
              valueStyle={{ color: '#ffffff', fontSize: '28px', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            style={{
              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
              border: 'none',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>ใช้งานอยู่</span>}
              value={stats.active}
              prefix={<CheckCircleOutlined style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '22px' }} />}
              valueStyle={{ color: '#ffffff', fontSize: '28px', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              border: 'none',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>หมดอายุ</span>}
              value={stats.expired}
              prefix={<ClockCircleOutlined style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '22px' }} />}
              valueStyle={{ color: '#ffffff', fontSize: '28px', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            style={{
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              border: 'none',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>การใช้งานทั้งหมด</span>}
              value={stats.totalUsage}
              prefix={<BarChartOutlined style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '22px' }} />}
              valueStyle={{ color: '#ffffff', fontSize: '28px', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* New API Key Alert */}
      {showNewKey && newApiKey && (
        <Alert
          message={
            <span style={{ fontSize: '18px', fontWeight: 600 }}>
              🎉 API Key ถูกสร้างแล้ว!
            </span>
          }
          description={
            <div>
              <Text strong style={{ fontSize: '14px', color: '#52c41a' }}>
                ⚠️ กรุณาบันทึก API Key นี้ทันที - จะไม่แสดงอีก:
              </Text>
              <div style={{ 
                marginTop: 16, 
                padding: 20, 
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                borderRadius: 12, 
                fontFamily: 'monospace',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)'
              }}>
                <Text style={{ 
                  fontSize: '16px', 
                  wordBreak: 'break-all',
                  color: '#ffffff',
                  fontWeight: 600,
                  letterSpacing: '0.5px'
                }}>
                  {newApiKey}
                </Text>
              </div>
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(newApiKey, 'new')}
                style={{ 
                  marginTop: 16,
                  height: '40px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)'
                }}
                size="large"
              >
                คัดลอก API Key
              </Button>
            </div>
          }
          type="success"
          closable
          onClose={() => {
            setShowNewKey(false);
            setNewApiKey(null);
          }}
          style={{ 
            marginBottom: 24,
            borderRadius: '12px',
            border: '2px solid #b7eb8f',
            boxShadow: '0 4px 16px rgba(82, 196, 26, 0.2)'
          }}
        />
      )}

      {/* Rotated API Key Alert */}
      {showRotatedKey && rotatedApiKey && (
        <Alert
          message={
            <span style={{ fontSize: '18px', fontWeight: 600 }}>
              🔄 API Key ถูก Rotate แล้ว!
            </span>
          }
          description={
            <div>
              <Text strong style={{ fontSize: '14px', color: '#52c41a' }}>
                ⚠️ กรุณาบันทึก API Key ใหม่นี้ทันที - จะไม่แสดงอีก:
              </Text>
              <div style={{ 
                marginTop: 16, 
                padding: 20, 
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                borderRadius: 12, 
                fontFamily: 'monospace',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)'
              }}>
                <Text style={{ 
                  fontSize: '16px', 
                  wordBreak: 'break-all',
                  color: '#ffffff',
                  fontWeight: 600,
                  letterSpacing: '0.5px'
                }}>
                  {rotatedApiKey}
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 12, fontStyle: 'italic' }}>
                💡 API Key เก่าจะยังใช้งานได้ตาม Grace Period ที่กำหนด
              </Text>
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(rotatedApiKey, 'rotated')}
                style={{ 
                  marginTop: 16,
                  height: '40px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)'
                }}
                size="large"
              >
                คัดลอก API Key ใหม่
              </Button>
            </div>
          }
          type="success"
          closable
          onClose={() => {
            setShowRotatedKey(false);
            setRotatedApiKey(null);
          }}
          style={{ 
            marginBottom: 24,
            borderRadius: '12px',
            border: '2px solid #b7eb8f',
            boxShadow: '0 4px 16px rgba(82, 196, 26, 0.2)'
          }}
        />
      )}

      {/* Table Header */}
      <Card
        style={{
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          border: 'none'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '2px solid #e2e8f0'
        }}>
          <Title level={4} style={{ 
            margin: 0,
            background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 700,
            fontSize: '22px'
          }}>
            🔑 API Keys
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
            size="large"
            style={{
              height: '40px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)'
            }}
          >
            สร้าง API Key ใหม่
          </Button>
        </div>

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
      </Card>

      {/* Create Modal */}
      <Modal
        title="สร้าง API Key ใหม่"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={(values) => {
            console.log('Form onFinish triggered with values:', values);
            handleCreate(values);
          }}
          onFinishFailed={(errorInfo) => {
            console.error('Form validation failed:', errorInfo);
            console.error('Error fields:', errorInfo.errorFields);
            message.error('กรุณากรอกข้อมูลให้ครบถ้วน');
          }}
        >
          <Form.Item
            name="name"
            label="ชื่อ API Key"
            rules={[
              { required: true, message: 'กรุณากรอกชื่อ' },
              { whitespace: true, message: 'ชื่อไม่สามารถเป็นช่องว่างได้' }
            ]}
            validateTrigger="onBlur"
          >
            <Input placeholder="เช่น: Production API Key" />
          </Form.Item>

          <Form.Item
            name="description"
            label="คำอธิบาย"
          >
            <TextArea rows={3} placeholder="อธิบายการใช้งาน API Key นี้" />
          </Form.Item>

          <Form.Item
            name="rate_limit"
            label="Rate Limit (requests/นาที)"
            initialValue={100}
          >
            <InputNumber
              min={1}
              max={10000}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="expires_at"
            label="วันหมดอายุ (ไม่บังคับ)"
            getValueFromEvent={(value) => value}
            getValueProps={(value) => ({ value: value ? dayjs(value) : null })}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              format="DD/MM/YYYY HH:mm"
              placeholder="เลือกวันหมดอายุ"
            />
          </Form.Item>

          <Form.Item
            name="ip_whitelist"
            label="IP Whitelist (ไม่บังคับ)"
            tooltip="ระบุ IP addresses ที่อนุญาต คั่นด้วยเครื่องหมายจุลภาค"
          >
            <TextArea
              rows={2}
              placeholder="เช่น: 192.168.1.1, 10.0.0.1"
            />
          </Form.Item>

          <Divider />

          <Form.Item
            name="permissions"
            label="Permissions"
            tooltip="เลือก Permissions ที่ต้องการอนุญาต (ไม่เลือก = Full Access)"
            initialValue={[]}
          >
            <div>
              {/* Templates */}
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>Templates:</Text>
                <Space wrap>
                  {Object.entries(PERMISSION_TEMPLATES).map(([key, template]) => (
                    <Button
                      key={key}
                      onClick={() => applyTemplate(key, 'create')}
                      size="small"
                      type="default"
                    >
                      {template.name}
                    </Button>
                  ))}
                  <Button
                    onClick={() => createForm.setFieldsValue({ permissions: [] })}
                    size="small"
                    type="default"
                  >
                    Clear (Full Access)
                  </Button>
                </Space>
              </div>

              {/* Permissions List */}
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e8e8e8', borderRadius: 4, padding: 8 }}>
                <Collapse 
                  size="small"
                  items={AVAILABLE_ENDPOINTS.map((endpointData, idx) => ({
                    key: idx,
                    label: (
                      <Space>
                        <ApiOutlined />
                        <span>{endpointData.label}</span>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {endpointData.endpoint}
                        </Text>
                      </Space>
                    ),
                    extra: (
                      <Checkbox
                        checked={isAllMethodsSelected(endpointData.endpoint, 'create')}
                        indeterminate={
                          endpointData.methods.some(m => isPermissionSelected(endpointData.endpoint, m, 'create')) &&
                          !isAllMethodsSelected(endpointData.endpoint, 'create')
                        }
                        onChange={() => toggleAllMethods(endpointData.endpoint, 'create')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Select All
                      </Checkbox>
                    ),
                    children: (
                      <>
                        <Space wrap>
                          {endpointData.methods.map(method => (
                            <Checkbox
                              key={`${endpointData.endpoint}-${method}-${permissionsUpdateKey}`}
                              checked={isPermissionSelected(endpointData.endpoint, method, 'create')}
                              onChange={(e) => {
                                e.stopPropagation();
                                togglePermission(endpointData.endpoint, method, 'create');
                              }}
                            >
                              <Tag color={method === 'GET' ? 'blue' : method === 'POST' ? 'green' : method === 'PUT' ? 'orange' : method === 'DELETE' ? 'red' : 'default'}>
                                {method}
                              </Tag>
                            </Checkbox>
                          ))}
                        </Space>
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {endpointData.description}
                          </Text>
                        </div>
                      </>
                    )
                  }))}
                />
              </div>

              {/* Selected Permissions Summary */}
              <div style={{ marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Selected: {createForm.getFieldValue('permissions')?.length || 0} permissions
                  {(!createForm.getFieldValue('permissions') || createForm.getFieldValue('permissions').length === 0) && (
                    <Tag color="green" style={{ marginLeft: 8 }}>Full Access</Tag>
                  )}
                </Text>
              </div>
            </div>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={creating}
                disabled={creating}
                onClick={async (e) => {
                  console.log('Submit button clicked');
                  e.preventDefault();
                  
                  try {
                    // Validate form manually
                    const values = await createForm.validateFields();
                    console.log('Form validation passed, values:', values);
                    await handleCreate(values);
                  } catch (errorInfo) {
                    console.error('Form validation failed:', errorInfo);
                    if (errorInfo.errorFields) {
                      message.error('กรุณากรอกข้อมูลให้ครบถ้วน');
                    }
                  }
                }}
              >
                {creating ? 'กำลังสร้าง...' : 'สร้าง'}
              </Button>
              <Button 
                onClick={() => {
                  console.log('Cancel button clicked');
                setCreateModalVisible(false);
                createForm.resetFields();
                  setCreating(false);
                }}
                disabled={creating}
              >
                ยกเลิก
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="แก้ไข API Key"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedKey(null);
        }}
        footer={null}
        width={800}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            name="name"
            label="ชื่อ API Key"
            rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="คำอธิบาย"
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="rate_limit"
            label="Rate Limit (requests/นาที)"
          >
            <InputNumber
              min={1}
              max={10000}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="expires_at"
            label="วันหมดอายุ"
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              format="DD/MM/YYYY HH:mm"
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="สถานะ"
            valuePropName="checked"
          >
            <Switch checkedChildren="ใช้งาน" unCheckedChildren="ปิดใช้งาน" />
          </Form.Item>

          <Form.Item
            name="ip_whitelist"
            label="IP Whitelist"
            tooltip="ระบุ IP addresses ที่อนุญาต คั่นด้วยเครื่องหมายจุลภาค"
          >
            <TextArea
              rows={2}
              placeholder="เช่น: 192.168.1.1, 10.0.0.1"
            />
          </Form.Item>

          <Divider />

          <Form.Item
            name="permissions"
            label="Permissions"
            tooltip="เลือก Permissions ที่ต้องการอนุญาต (ไม่เลือก = Full Access)"
          >
            <div>
              {/* Templates */}
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>Templates:</Text>
                <Space wrap>
                  {Object.entries(PERMISSION_TEMPLATES).map(([key, template]) => (
                    <Button
                      key={key}
                      onClick={() => applyTemplate(key, 'edit')}
                      size="small"
                      type="default"
                    >
                      {template.name}
                    </Button>
                  ))}
                  <Button
                    onClick={() => editForm.setFieldsValue({ permissions: [] })}
                    size="small"
                    type="default"
                  >
                    Clear (Full Access)
                  </Button>
                </Space>
              </div>

              {/* Permissions List */}
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e8e8e8', borderRadius: 4, padding: 8 }}>
                <Collapse 
                  size="small"
                  items={AVAILABLE_ENDPOINTS.map((endpointData, idx) => ({
                    key: idx,
                    label: (
                      <Space>
                        <ApiOutlined />
                        <span>{endpointData.label}</span>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {endpointData.endpoint}
                        </Text>
                      </Space>
                    ),
                    extra: (
                      <Checkbox
                        checked={isAllMethodsSelected(endpointData.endpoint, 'edit')}
                        indeterminate={
                          endpointData.methods.some(m => isPermissionSelected(endpointData.endpoint, m, 'edit')) &&
                          !isAllMethodsSelected(endpointData.endpoint, 'edit')
                        }
                        onChange={() => toggleAllMethods(endpointData.endpoint, 'edit')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Select All
                      </Checkbox>
                    ),
                    children: (
                      <>
                        <Space wrap>
                          {endpointData.methods.map(method => (
                            <Checkbox
                              key={`${endpointData.endpoint}-${method}-${permissionsUpdateKey}`}
                              checked={isPermissionSelected(endpointData.endpoint, method, 'edit')}
                              onChange={(e) => {
                                e.stopPropagation();
                                togglePermission(endpointData.endpoint, method, 'edit');
                              }}
                            >
                              <Tag color={method === 'GET' ? 'blue' : method === 'POST' ? 'green' : method === 'PUT' ? 'orange' : method === 'DELETE' ? 'red' : 'default'}>
                                {method}
                              </Tag>
                            </Checkbox>
                          ))}
                        </Space>
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {endpointData.description}
                          </Text>
                        </div>
                      </>
                    )
                  }))}
                />
              </div>

              {/* Selected Permissions Summary */}
              <div style={{ marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Selected: {editForm.getFieldValue('permissions')?.length || 0} permissions
                  {(!editForm.getFieldValue('permissions') || editForm.getFieldValue('permissions').length === 0) && (
                    <Tag color="green" style={{ marginLeft: 8 }}>Full Access</Tag>
                  )}
                </Text>
              </div>
            </div>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    await editForm.validateFields();
                    const values = editForm.getFieldsValue();
                    await handleUpdate(values);
                  } catch (error) {
                    if (error.errorFields) {
                      message.error('กรุณากรอกข้อมูลให้ครบถ้วน');
                    } else {
                      console.error('Validation error:', error);
                    }
                  }
                }}
              >
                บันทึก
              </Button>
              <Button onClick={() => {
                setEditModalVisible(false);
                setSelectedKey(null);
                editForm.resetFields();
              }}>
                ยกเลิก
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title={`API Key สำหรับ: ${selectedKey?.name || 'N/A'}`}
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setSelectedKey(null);
          setViewingFullKey(null);
          setTestResult(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setViewModalVisible(false);
            setSelectedKey(null);
            setViewingFullKey(null);
            setTestResult(null);
          }}>
            ปิด
          </Button>,
          <Button 
            key="copy" 
            type="primary" 
            icon={<CopyOutlined />}
            onClick={() => {
              if (viewingFullKey) {
                navigator.clipboard.writeText(viewingFullKey);
                message.success('คัดลอก API Key แล้ว!');
              } else {
                message.warning('ไม่มี full API key ให้คัดลอก');
              }
            }}
          >
            คัดลอก Token
          </Button>,
          <Button 
            key="test" 
            type="default"
            icon={<ApiOutlined />}
            onClick={handleTestToken}
            disabled={!viewingFullKey || testingKey}
            loading={testingKey}
          >
            ทดสอบ Token
          </Button>
        ]}
        width={700}
      >
        {selectedKey && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Bearer Token Section */}
            <div>
              <Text strong style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>
                Bearer Token:
              </Text>
              <Input.TextArea
                value={viewingFullKey || `${selectedKey.key_prefix}...`}
                readOnly
                rows={4}
                style={{ 
                  fontFamily: 'monospace',
                  fontSize: 12,
                  backgroundColor: '#f5f5f5'
                }}
              />
              {!viewingFullKey && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  ⚠️ Full API key จะแสดงเฉพาะตอนสร้างใหม่หรือ rotate เท่านั้น
                </Text>
              )}
            </div>

            {/* Token Details Section */}
            <div>
              <Text strong style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>
                Token Details:
              </Text>
              <pre style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 4,
                overflow: 'auto',
                fontSize: 12,
                fontFamily: 'monospace',
                maxHeight: 300
              }}>
                {JSON.stringify({
                  key_id: selectedKey.id,
                  name: selectedKey.name,
                  key_prefix: selectedKey.key_prefix,
                  created_by: selectedKey.created_by,
                  created_at: selectedKey.created_at,
                  expires_at: selectedKey.expires_at || 'Never (Permanent)',
                  is_active: selectedKey.is_active,
                  rate_limit: `${selectedKey.rate_limit}/นาที`,
                  usage_count: selectedKey.usage_count || 0,
                  last_used_at: selectedKey.last_used_at || 'ยังไม่เคยใช้',
                  permissions: selectedKey.permissions || [],
                  has_full_key: !!viewingFullKey
                }, null, 2)}
              </pre>
            </div>

            {/* Test Result Section */}
            {testResult && (
              <div>
                <Text strong style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>
                  ผลการทดสอบ:
                </Text>
                <Alert
                  type={testResult.success ? 'success' : 'error'}
                  message={
                    <div>
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>{testResult.success ? '✅ ' : '❌ '}{testResult.message}</Text>
                      </div>
                      {testResult.status && (
                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                          HTTP Status: {testResult.status}
                        </div>
                      )}
                      {testResult.permissionTests && testResult.permissionTests.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                            การทดสอบ Permissions:
                          </Text>
                          {testResult.permissionTests.map((test, idx) => (
                            <div key={idx} style={{ 
                              marginTop: 6, 
                              padding: 8, 
                              background: test.success ? '#f6ffed' : '#fff2e8',
                              border: `1px solid ${test.success ? '#b7eb8f' : '#ffd591'}`,
                              borderRadius: 4,
                              fontSize: 12
                            }}>
                              <Text style={{ color: test.success ? '#52c41a' : '#fa8c16' }}>
                                {test.message}
                              </Text>
                              {test.status && (
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                                  Status: {test.status}
                                </Text>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {testResult.dataCount !== undefined && testResult.success && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                          {testResult.returnedCount !== undefined && testResult.returnedCount < testResult.dataCount ? (
                            <>
                              <div>ดึงข้อมูล: {testResult.returnedCount} รายการ (เพื่อทดสอบ)</div>
                              <div style={{ marginTop: 4, fontWeight: 500 }}>
                                ข้อมูลทั้งหมดที่เข้าถึงได้: {testResult.dataCount.toLocaleString()} รายการ
                              </div>
                            </>
                          ) : (
                            <div>ข้อมูลที่เข้าถึงได้: {testResult.dataCount.toLocaleString()} รายการ</div>
                          )}
                          {testResult.note && (
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                              💡 {testResult.note}
                            </Text>
                          )}
                        </div>
                      )}
                      {testResult.endpoint && (
                        <div style={{ marginTop: 4, fontSize: 11, color: '#999' }}>
                          Endpoint: {testResult.endpoint}
                        </div>
                      )}
                      {testResult.error && (
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            รายละเอียด: {typeof testResult.error === 'string' ? testResult.error : JSON.stringify(testResult.error, null, 2)}
                          </Text>
                        </div>
                      )}
                    </div>
                  }
                  showIcon
                  style={{ marginTop: 8 }}
                />
              </div>
            )}
          </Space>
        )}
      </Modal>

      {/* Rotate Modal */}
      <Modal
        title="Rotate API Key"
        open={rotateModalVisible}
        onCancel={() => {
          setRotateModalVisible(false);
          setRotatingKey(null);
        }}
        footer={null}
        width={600}
      >
        {rotatingKey && (
          <Form
            form={rotateForm}
            layout="vertical"
            onFinish={handleRotate}
            initialValues={{
              grace_period_days: 7
            }}
          >
            <Alert
              message="Rotate API Key"
              description={
                <div>
                  <Text>การ Rotate จะสร้าง API Key ใหม่และปิดการใช้งาน Key เก่า</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Grace Period: Key เก่าจะยังใช้งานได้ในช่วงเวลาที่กำหนด
                  </Text>
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Form.Item
              label="API Key"
            >
              <Text strong>{rotatingKey.name}</Text>
              <br />
              <Text type="secondary" code>{rotatingKey.key_prefix}...</Text>
            </Form.Item>

            <Form.Item
              name="grace_period_days"
              label="Grace Period (วัน)"
              tooltip="จำนวนวันที่ Key เก่าจะยังใช้งานได้ (0 = ปิดใช้งานทันที)"
              rules={[{ required: true, message: 'กรุณากรอก Grace Period' }]}
            >
              <InputNumber
                min={0}
                max={30}
                style={{ width: '100%' }}
                placeholder="เช่น: 7"
              />
            </Form.Item>

            <Alert
              message="คำเตือน"
              description="API Key ใหม่จะถูกสร้างและแสดงเพียงครั้งเดียว กรุณาบันทึกทันที!"
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" danger>
                  Rotate API Key
                </Button>
                <Button onClick={() => {
                  setRotateModalVisible(false);
                  setRotatingKey(null);
                }}>
                  ยกเลิก
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
      
      {/* Hidden Forms to suppress useForm warnings */}
      <Form form={createForm} style={{ display: 'none' }}>
        <Form.Item name="name">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="permissions">
          <Input style={{ display: 'none' }} />
        </Form.Item>
      </Form>
      
      <Form form={editForm} style={{ display: 'none' }}>
        <Form.Item name="name">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="description">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="permissions">
          <Input style={{ display: 'none' }} />
        </Form.Item>
      </Form>
      
      <Form form={rotateForm} style={{ display: 'none' }}>
        <Form.Item name="grace_period_days">
          <Input style={{ display: 'none' }} />
        </Form.Item>
      </Form>
    </div>
  );
};

export default APIKeyManager;

