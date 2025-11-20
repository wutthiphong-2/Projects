import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  App,
  Popconfirm,
  Card,
  Typography,
  Row,
  Col,
  Tag,
  Tooltip,
  Drawer,
  Divider,
  Tabs,
  Switch,
  Empty,
  DatePicker,
  Select,
  Alert,
  Statistic,
  Descriptions,
  Badge,
  List,
  Progress,
  Avatar,
  Spin,
  Collapse
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  KeyOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  BookOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  CodeOutlined,
  FileTextOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { apiKeyService } from '../services/apiKeyService';
import { useNotification } from '../contexts/NotificationContext';
import config from '../config';
import dayjs from 'dayjs';
import './ApiManagement.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

const ApiManagement = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [codeExamples, setCodeExamples] = useState([]);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [quickStart, setQuickStart] = useState(null);
  
  // API Testing states
  const [testEndpoint, setTestEndpoint] = useState('/api/users');
  const [testMethod, setTestMethod] = useState('GET');
  const [testHeaders, setTestHeaders] = useState({
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  });
  const [testBody, setTestBody] = useState('');
  const [testResponse, setTestResponse] = useState(null);
  const [testResponseHeaders, setTestResponseHeaders] = useState({});
  const [testing, setTesting] = useState(false);
  const [selectedTestKey, setSelectedTestKey] = useState(null);
  
  // Modals & Drawers
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDetailsDrawerVisible, setIsDetailsDrawerVisible] = useState(false);
  const [isUsageDrawerVisible, setIsUsageDrawerVisible] = useState(false);
  const [isNewKeyModalVisible, setIsNewKeyModalVisible] = useState(false);
  
  // Selected data
  const [selectedKey, setSelectedKey] = useState(null);
  const [newApiKey, setNewApiKey] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [requestLogs, setRequestLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(20);
  const [logsTotal, setLogsTotal] = useState(0);
  const [isLogsDrawerVisible, setIsLogsDrawerVisible] = useState(false);
  
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const { message } = App.useApp();
  const { notifyError, notifySuccess } = useNotification();

  // Available endpoints for permissions
  const availableEndpoints = [
    { value: '/api/users', label: 'Users API' },
    { value: '/api/groups', label: 'Groups API' },
    { value: '/api/ous', label: 'OUs API' },
    { value: '/api/activity-logs', label: 'Activity Logs API' },
    { value: '/api/v1/users', label: 'Users API (v1)' },
    { value: '/api/v1/groups', label: 'Groups API (v1)' },
    { value: '/api/v1/ous', label: 'OUs API (v1)' },
  ];

  // API Key Templates/Presets
  const apiKeyTemplates = [
    {
      name: 'Full Access',
      description: 'Access to all endpoints',
      permissions: [],
      rate_limit: 1000,
      expires_at: null
    },
    {
      name: 'Read Only',
      description: 'Read-only access to users and groups',
      permissions: ['/api/users', '/api/groups'],
      rate_limit: 500,
      expires_at: null
    },
    {
      name: 'Development',
      description: 'For development/testing',
      permissions: [],
      rate_limit: 100,
      expires_at: dayjs().add(30, 'days')
    },
    {
      name: 'Production',
      description: 'For production use',
      permissions: [],
      rate_limit: 1000,
      expires_at: dayjs().add(365, 'days')
    }
  ];

  // ==================== DATA FETCHING ====================
  
  const fetchApiKeys = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiKeyService.getApiKeys();
      if (result.success) {
        setApiKeys(result.data);
      } else {
        notifyError('Failed to load API keys', result.error);
      }
    } catch (error) {
      notifyError('Failed to load API keys', error.message);
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  const fetchUsageStats = useCallback(async (keyId, days = 30) => {
    setLoadingUsage(true);
    try {
      const result = await apiKeyService.getUsageStats(keyId, days);
      if (result.success) {
        setUsageStats(result.data);
      } else {
        notifyError('Failed to load usage statistics', result.error);
      }
    } catch (error) {
      notifyError('Failed to load usage statistics', error.message);
    } finally {
      setLoadingUsage(false);
    }
  }, [notifyError]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  // Fetch code examples
  const fetchCodeExamples = useCallback(async () => {
    setLoadingExamples(true);
    try {
      const apiUrl = config.apiUrl || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/docs/code-examples`);
      if (response.ok) {
        const data = await response.json();
        setCodeExamples(data);
      }
    } catch (error) {
      console.error('Error fetching code examples:', error);
    } finally {
      setLoadingExamples(false);
    }
  }, []);

  // Fetch quick start guide
  const fetchQuickStart = useCallback(async () => {
    try {
      const apiUrl = config.apiUrl || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/docs/quick-start`);
      if (response.ok) {
        const data = await response.json();
        setQuickStart(data);
      }
    } catch (error) {
      console.error('Error fetching quick start:', error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'docs') {
      fetchCodeExamples();
      fetchQuickStart();
    }
  }, [activeTab, fetchCodeExamples, fetchQuickStart]);

  // ==================== HANDLERS ====================
  
  const handleCreate = () => {
    form.resetFields();
    // Set default values
    form.setFieldsValue({
      rate_limit: 100,
      permissions: []
    });
    setIsCreateModalVisible(true);
  };

  const handleApplyTemplate = (template) => {
    form.setFieldsValue({
      name: template.name,
      description: template.description,
      permissions: template.permissions,
      rate_limit: template.rate_limit,
      expires_at: template.expires_at
    });
    message.success(`Template "${template.name}" applied`);
  };

  const handleCreateSubmit = async (values) => {
    try {
      const keyData = {
        name: values.name,
        description: values.description,
        permissions: values.permissions || [],
        rate_limit: values.rate_limit || 100,
        expires_at: values.expires_at ? values.expires_at.toISOString() : null,
        ip_whitelist: values.ip_whitelist ? values.ip_whitelist.split('\n').filter(ip => ip.trim()) : []
      };

      const result = await apiKeyService.createApiKey(keyData);
      if (result.success) {
        setNewApiKey(result.data.api_key);
        setIsCreateModalVisible(false);
        setIsNewKeyModalVisible(true);
        form.resetFields();
        fetchApiKeys();
        notifySuccess('API Key created successfully');
      } else {
        notifyError('Failed to create API key', result.error);
      }
    } catch (error) {
      notifyError('Failed to create API key', error.message);
    }
  };

  const handleEdit = (record) => {
    setSelectedKey(record);
    editForm.setFieldsValue({
      name: record.name,
      description: record.description,
      permissions: record.permissions || [],
      rate_limit: record.rate_limit,
      expires_at: record.expires_at ? dayjs(record.expires_at) : null,
      is_active: record.is_active,
      ip_whitelist: record.ip_whitelist?.join('\n') || ''
    });
    setIsEditModalVisible(true);
  };

  const handleEditSubmit = async (values) => {
    try {
      const keyData = {
        name: values.name,
        description: values.description,
        permissions: values.permissions || [],
        rate_limit: values.rate_limit,
        expires_at: values.expires_at ? values.expires_at.toISOString() : null,
        is_active: values.is_active,
        ip_whitelist: values.ip_whitelist ? values.ip_whitelist.split('\n').filter(ip => ip.trim()) : []
      };

      const result = await apiKeyService.updateApiKey(selectedKey.id, keyData);
      if (result.success) {
        setIsEditModalVisible(false);
        setSelectedKey(null);
        editForm.resetFields();
        fetchApiKeys();
        notifySuccess('API Key updated successfully');
      } else {
        notifyError('Failed to update API key', result.error);
      }
    } catch (error) {
      notifyError('Failed to update API key', error.message);
    }
  };

  const handleDelete = async (keyId) => {
    try {
      const result = await apiKeyService.deleteApiKey(keyId);
      if (result.success) {
        fetchApiKeys();
        notifySuccess('API Key deleted successfully');
      } else {
        notifyError('Failed to delete API key', result.error);
      }
    } catch (error) {
      notifyError('Failed to delete API key', error.message);
    }
  };

  const handleViewDetails = (record) => {
    setSelectedKey(record);
    setIsDetailsDrawerVisible(true);
  };

  const handleViewUsage = async (record) => {
    setSelectedKey(record);
    setIsUsageDrawerVisible(true);
    await fetchUsageStats(record.id);
  };

  const handleViewLogs = async (record) => {
    setSelectedKey(record);
    setIsLogsDrawerVisible(true);
    setLogsPage(1);
    await fetchRequestLogs(record.id);
  };

  const fetchRequestLogs = async (keyId, page = 1, filters = {}) => {
    setLoadingLogs(true);
    try {
      const result = await apiKeyService.getRequestLogs(keyId, {
        page,
        page_size: logsPageSize,
        ...filters
      });
      if (result.success) {
        setRequestLogs(result.data.items || []);
        setLogsTotal(result.data.total || 0);
        setLogsPage(result.data.page || 1);
      } else {
        notifyError('Failed to load request logs', result.error);
      }
    } catch (error) {
      notifyError('Failed to load request logs', error.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    message.success('API Key copied to clipboard!');
  };

  const handleNewKeyModalClose = () => {
    setIsNewKeyModalVisible(false);
    setNewApiKey(null);
  };

  // ==================== STATISTICS ====================
  
  const statistics = useMemo(() => {
    const total = apiKeys.length;
    const active = apiKeys.filter(k => k.is_active && (!k.expires_at || dayjs(k.expires_at).isAfter(dayjs()))).length;
    const inactive = apiKeys.filter(k => !k.is_active).length;
    const expired = apiKeys.filter(k => k.expires_at && dayjs(k.expires_at).isBefore(dayjs())).length;
    const totalUsage = apiKeys.reduce((sum, k) => sum + (k.usage_count || 0), 0);
    const expiringSoon = apiKeys.filter(k => {
      if (!k.expires_at) return false;
      const daysUntilExpiry = dayjs(k.expires_at).diff(dayjs(), 'day');
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    }).length;
    
    return {
      total,
      active,
      inactive,
      expired,
      totalUsage,
      expiringSoon
    };
  }, [apiKeys]);

  // ==================== FILTERED DATA ====================
  
  const filteredKeys = apiKeys.filter(key => {
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      return (
        key.name.toLowerCase().includes(searchLower) ||
        key.key_prefix.toLowerCase().includes(searchLower) ||
        (key.description && key.description.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  // ==================== TABLE COLUMNS ====================
  
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <KeyOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Key Prefix',
      dataIndex: 'key_prefix',
      key: 'key_prefix',
      render: (text) => (
        <Text code style={{ fontSize: 12 }}>{text}...</Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive, record) => {
        const isExpired = record.expires_at && dayjs(record.expires_at).isBefore(dayjs());
        if (isExpired) {
          return <Tag color="red" icon={<CloseCircleOutlined />}>Expired</Tag>;
        }
        return isActive ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>Active</Tag>
        ) : (
          <Tag color="default" icon={<CloseCircleOutlined />}>Inactive</Tag>
        );
      }
    },
    {
      title: 'Rate Limit',
      dataIndex: 'rate_limit',
      key: 'rate_limit',
      render: (limit) => (
        <Text>{limit} req/min</Text>
      )
    },
    {
      title: 'Usage',
      dataIndex: 'usage_count',
      key: 'usage_count',
      render: (count) => (
        <Text>{count || 0}</Text>
      )
    },
    {
      title: 'Last Used',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : (
        <Text type="secondary">Never</Text>
      )
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : (
        <Text type="secondary">Never</Text>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="View Usage">
            <Button
              type="text"
              icon={<BarChartOutlined />}
              onClick={() => handleViewUsage(record)}
            />
          </Tooltip>
          <Tooltip title="View Logs">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => handleViewLogs(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete API Key"
            description="Are you sure? This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
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

  // ==================== RENDER OVERVIEW ====================
  
  const renderOverview = () => (
    <div>
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total API Keys"
              value={statistics.total}
              prefix={<KeyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Keys"
              value={statistics.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Requests"
              value={statistics.totalUsage}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Expired Keys"
              value={statistics.expired}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Alerts */}
      {statistics.expiringSoon > 0 && (
        <Alert
          message={`${statistics.expiringSoon} API key(s) will expire within 30 days`}
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" onClick={() => setActiveTab('keys')}>
              View Keys
            </Button>
          }
        />
      )}

      {statistics.expired > 0 && (
        <Alert
          message={`${statistics.expired} API key(s) have expired`}
          type="error"
          icon={<CloseCircleOutlined />}
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" onClick={() => setActiveTab('keys')}>
              View Keys
            </Button>
          }
        />
      )}

      {/* Recent Activity */}
      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="Recent API Keys" style={{ marginBottom: 16 }}>
            {apiKeys.length > 0 ? (
              <List
                dataSource={apiKeys.slice(0, 5)}
                renderItem={(key) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<KeyOutlined />} style={{ background: key.is_active ? '#52c41a' : '#d9d9d9' }} />}
                      title={
                        <Space>
                          <Text strong>{key.name}</Text>
                          {key.is_active ? (
                            <Tag color="green">Active</Tag>
                          ) : (
                            <Tag color="default">Inactive</Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size="small">
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <Text code>{key.key_prefix}...</Text>
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Usage: {key.usage_count || 0} requests
                            {key.last_used_at && ` • Last used: ${dayjs(key.last_used_at).format('YYYY-MM-DD')}`}
                          </Text>
                        </Space>
                      }
                    />
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => {
                        handleViewDetails(key);
                        setActiveTab('keys');
                      }}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No API keys yet" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Key Status Distribution">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Active</Text>
                  <Text strong>{statistics.active}</Text>
                </div>
                <Progress
                  percent={statistics.total > 0 ? Math.round((statistics.active / statistics.total) * 100) : 0}
                  strokeColor="#52c41a"
                  showInfo={false}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Inactive</Text>
                  <Text strong>{statistics.inactive}</Text>
                </div>
                <Progress
                  percent={statistics.total > 0 ? Math.round((statistics.inactive / statistics.total) * 100) : 0}
                  strokeColor="#d9d9d9"
                  showInfo={false}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Expired</Text>
                  <Text strong>{statistics.expired}</Text>
                </div>
                <Progress
                  percent={statistics.total > 0 ? Math.round((statistics.expired / statistics.total) * 100) : 0}
                  strokeColor="#ff4d4f"
                  showInfo={false}
                />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );

  // ==================== RENDER DOCUMENTATION ====================
  
  const renderDocumentation = () => {
    const apiUrl = config.apiUrl || 'http://localhost:8000';
    
    return (
      <div>
        {/* Quick Start Guide */}
        {quickStart && (
          <Card title="Quick Start Guide" style={{ marginBottom: 24 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {quickStart.steps && quickStart.steps.map((step, index) => (
                <Card key={index} size="small" style={{ background: '#f8f9fa' }}>
                  <Space direction="vertical" size="small">
                    <Text strong>Step {step.step}: {step.title}</Text>
                    <Text type="secondary">{step.description}</Text>
                    <pre style={{ 
                      background: '#1e1e1e', 
                      color: '#d4d4d4', 
                      padding: '12px', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflow: 'auto'
                    }}>
                      {step.code}
                    </pre>
                  </Space>
                </Card>
              ))}
              <Divider />
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Base URL:</Text>
                  <Text code style={{ marginLeft: 8 }}>{apiUrl}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Authentication:</Text>
                  <Text code style={{ marginLeft: 8 }}>Bearer Token</Text>
                </Col>
              </Row>
            </Space>
          </Card>
        )}

        {/* API Features */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="API Features" style={{ marginBottom: 16 }}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>Rate Limit Headers</Text>
                  <List size="small" style={{ marginTop: 8 }}>
                    <List.Item>
                      <Text code style={{ fontSize: 11 }}>X-RateLimit-Limit</Text>
                      <Text type="secondary" style={{ marginLeft: 8 }}>Maximum requests allowed</Text>
                    </List.Item>
                    <List.Item>
                      <Text code style={{ fontSize: 11 }}>X-RateLimit-Remaining</Text>
                      <Text type="secondary" style={{ marginLeft: 8 }}>Requests remaining</Text>
                    </List.Item>
                    <List.Item>
                      <Text code style={{ fontSize: 11 }}>X-RateLimit-Reset</Text>
                      <Text type="secondary" style={{ marginLeft: 8 }}>Unix timestamp when limit resets</Text>
                    </List.Item>
                    <List.Item>
                      <Text code style={{ fontSize: 11 }}>X-Request-ID</Text>
                      <Text type="secondary" style={{ marginLeft: 8 }}>Request tracking ID</Text>
                    </List.Item>
                  </List>
                </div>
                <Divider />
                <div>
                  <Text strong>API Versioning</Text>
                  <List size="small" style={{ marginTop: 8 }}>
                    <List.Item>
                      <Text code style={{ fontSize: 11 }}>/api/v1/users</Text>
                      <Tag color="blue" style={{ marginLeft: 8 }}>v1</Tag>
                    </List.Item>
                    <List.Item>
                      <Text code style={{ fontSize: 11 }}>/api/v1/groups</Text>
                      <Tag color="blue" style={{ marginLeft: 8 }}>v1</Tag>
                    </List.Item>
                    <List.Item>
                      <Text code style={{ fontSize: 11 }}>/api/v1/ous</Text>
                      <Tag color="blue" style={{ marginLeft: 8 }}>v1</Tag>
                    </List.Item>
                  </List>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="API Documentation">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Button 
                  type="primary" 
                  icon={<LinkOutlined />}
                  block
                  onClick={() => window.open(`${apiUrl}/docs`, '_blank')}
                >
                  Open Swagger UI
                </Button>
                <Button 
                  icon={<FileTextOutlined />}
                  block
                  onClick={() => window.open(`${apiUrl}/openapi.json`, '_blank')}
                >
                  Download OpenAPI Schema
                </Button>
                <Divider />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <InfoCircleOutlined style={{ marginRight: 4 }} />
                  Use Swagger UI to test API endpoints interactively
                </Text>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Code Examples */}
        <Card 
          title="Code Examples" 
          extra={
            <Button 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={fetchCodeExamples}
              loading={loadingExamples}
            >
              Refresh
            </Button>
          }
        >
          {loadingExamples ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin />
            </div>
          ) : codeExamples.length > 0 ? (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {codeExamples.map((example, idx) => (
                <Card key={idx} size="small" style={{ background: '#fafafa' }}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <Tag color="blue">{example.method}</Tag>
                      <Text code style={{ marginLeft: 8 }}>{example.endpoint}</Text>
                    </div>
                    <Text type="secondary">{example.description}</Text>
                    <Tabs
                      size="small"
                      items={example.examples.map((ex, exIdx) => ({
                        key: ex.language,
                        label: ex.label,
                        children: (
                          <div>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                              {ex.description}
                            </Text>
                            <pre style={{ 
                              background: '#1e1e1e', 
                              color: '#d4d4d4', 
                              padding: '16px', 
                              borderRadius: '4px',
                              fontSize: '12px',
                              overflow: 'auto',
                              margin: 0
                            }}>
                              {ex.code}
                            </pre>
                            <Button
                              size="small"
                              icon={<CopyOutlined />}
                              style={{ marginTop: 8 }}
                              onClick={() => {
                                navigator.clipboard.writeText(ex.code);
                                message.success('Code copied to clipboard!');
                              }}
                            >
                              Copy Code
                            </Button>
                          </div>
                        )
                      }))}
                    />
                  </Space>
                </Card>
              ))}
            </Space>
          ) : (
            <Empty description="No code examples available" />
          )}
        </Card>
      </div>
    );
  };

  // ==================== API TESTING ====================
  
  const handleTestApi = async () => {
    if (!selectedTestKey) {
      message.warning('Please paste your API key in the Headers section');
      return;
    }

    setTesting(true);
    setTestResponse(null);
    setTestResponseHeaders({});

    try {
      const apiUrl = config.apiUrl || 'http://localhost:8000';
      const url = `${apiUrl}${testEndpoint}`;
      
      // Build headers from state
      let headers = {
        'Content-Type': 'application/json'
      };
      
      // Add headers from testHeaders state
      if (testHeaders && Object.keys(testHeaders).length > 0) {
        headers = { ...headers, ...testHeaders };
      }
      
      // If no Authorization header, add from selectedTestKey (if it's the full key)
      if (!headers['Authorization'] && selectedTestKey && selectedTestKey.startsWith('tbkk_')) {
        headers['Authorization'] = `Bearer ${selectedTestKey}`;
      }
      
      // If still no Authorization, show warning
      if (!headers['Authorization'] || (!headers['Authorization'].includes('tbkk_') && !headers['Authorization'].includes('Bearer'))) {
        message.warning('Please provide a valid API key in the Headers section (format: Bearer tbkk_xxxxx...)');
        setTesting(false);
        return;
      }

      let body = null;
      if (testBody && (testMethod === 'POST' || testMethod === 'PUT' || testMethod === 'PATCH')) {
        try {
          body = JSON.parse(testBody);
        } catch (e) {
          message.error('Invalid JSON in request body');
          setTesting(false);
          return;
        }
      }

      const startTime = Date.now();
      const response = await fetch(url, {
        method: testMethod,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      const responseTime = Date.now() - startTime;

      // Get response headers
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Get response body
      let responseData;
      const contentType = response.headers.get('content-type');
      try {
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }
      } catch (parseError) {
        responseData = { error: 'Failed to parse response', raw: await response.text() };
      }

      setTestResponse({
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        responseTime
      });
      setTestResponseHeaders(responseHeaders);

      if (response.ok) {
        message.success(`Request successful (${responseTime}ms)`);
      } else {
        message.warning(`Request completed with status ${response.status}`);
      }
    } catch (error) {
      setTestResponse({
        error: error.message,
        status: 0
      });
      message.error(`Request failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  // ==================== RENDER API TESTER ====================
  
  const renderApiTester = () => {
    const apiUrl = config.apiUrl || 'http://localhost:8000';
    const defaultHeaders = JSON.stringify({
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    }, null, 2);
    
    return (
      <div>
        <Card title="API Tester" style={{ marginBottom: 24 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Request Configuration */}
            <Row gutter={16}>
              <Col span={6}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Method:</Text>
                <Select
                  style={{ width: '100%' }}
                  value={testMethod}
                  onChange={setTestMethod}
                  options={[
                    { value: 'GET', label: 'GET' },
                    { value: 'POST', label: 'POST' },
                    { value: 'PUT', label: 'PUT' },
                    { value: 'PATCH', label: 'PATCH' },
                    { value: 'DELETE', label: 'DELETE' }
                  ]}
                />
              </Col>
              <Col span={18}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Endpoint:</Text>
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    style={{ width: '30%' }}
                    value={apiUrl}
                    readOnly
                    prefix={<GlobalOutlined />}
                  />
                  <Input
                    style={{ width: '70%' }}
                    value={testEndpoint}
                    onChange={(e) => setTestEndpoint(e.target.value)}
                    placeholder="/api/users"
                  />
                </Space.Compact>
              </Col>
            </Row>

            {/* Headers */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Headers (JSON):
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                  Paste your full API key in Authorization field
                </Text>
              </Text>
              <TextArea
                rows={4}
                placeholder={defaultHeaders}
                value={JSON.stringify({
                  'Authorization': selectedTestKey ? `Bearer ${selectedTestKey}` : 'Bearer YOUR_API_KEY',
                  'Content-Type': 'application/json',
                  ...testHeaders
                }, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setTestHeaders(parsed);
                    // Extract API key if present
                    if (parsed.Authorization && parsed.Authorization.startsWith('Bearer ')) {
                      const key = parsed.Authorization.replace('Bearer ', '');
                      if (key.startsWith('tbkk_')) {
                        setSelectedTestKey(key);
                      }
                    }
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>

            {/* Request Body */}
            {(testMethod === 'POST' || testMethod === 'PUT' || testMethod === 'PATCH') && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Request Body (JSON):</Text>
                <TextArea
                  rows={8}
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  placeholder='{"cn": "John Doe", "sAMAccountName": "jdoe", "mail": "jdoe@example.com"}'
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </div>
            )}

            {/* Send Button */}
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleTestApi}
              loading={testing}
              block
              size="large"
            >
              Send Request
            </Button>

            {/* Response */}
            {testResponse && (
              <Card 
                title={
                  <Space>
                    <Text strong>Response</Text>
                    <Tag color={testResponse.status >= 200 && testResponse.status < 300 ? 'green' : testResponse.status >= 400 ? 'red' : 'orange'}>
                      {testResponse.status} {testResponse.statusText || ''}
                    </Tag>
                    {testResponse.responseTime && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ({testResponse.responseTime}ms)
                      </Text>
                    )}
                  </Space>
                }
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {/* Response Headers */}
                  {Object.keys(testResponseHeaders).length > 0 && (
                    <Collapse
                      items={[{
                        key: 'headers',
                        label: `Response Headers (${Object.keys(testResponseHeaders).length})`,
                        children: (
                          <div>
                            {/* Rate Limit Headers */}
                            {(testResponseHeaders['x-ratelimit-limit'] || testResponseHeaders['X-RateLimit-Limit']) && (
                              <Alert
                                message="Rate Limit Information"
                                type="info"
                                style={{ marginBottom: 16 }}
                                description={
                                  <Space direction="vertical" size="small">
                                    <Text>Limit: {testResponseHeaders['x-ratelimit-limit'] || testResponseHeaders['X-RateLimit-Limit']}</Text>
                                    <Text>Remaining: {testResponseHeaders['x-ratelimit-remaining'] || testResponseHeaders['X-RateLimit-Remaining']}</Text>
                                    <Text>Reset: {testResponseHeaders['x-ratelimit-reset'] || testResponseHeaders['X-RateLimit-Reset']}</Text>
                                  </Space>
                                }
                              />
                            )}
                            <List
                              size="small"
                              dataSource={Object.entries(testResponseHeaders)}
                              renderItem={([key, value]) => (
                                <List.Item>
                                  <Text code style={{ fontSize: 11 }}>{key}:</Text>
                                  <Text style={{ marginLeft: 8, fontSize: 11 }}>{value}</Text>
                                </List.Item>
                              )}
                            />
                          </div>
                        )
                      }]}
                    />
                  )}

                  {/* Response Body */}
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Response Body:</Text>
                    <pre style={{
                      background: '#1e1e1e',
                      color: '#d4d4d4',
                      padding: '16px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflow: 'auto',
                      maxHeight: '400px',
                      margin: 0
                    }}>
                      {typeof testResponse.data === 'object' 
                        ? JSON.stringify(testResponse.data, null, 2)
                        : testResponse.data || testResponse.error
                      }
                    </pre>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      style={{ marginTop: 8 }}
                      onClick={() => {
                        const text = typeof testResponse.data === 'object' 
                          ? JSON.stringify(testResponse.data, null, 2)
                          : testResponse.data || testResponse.error;
                        navigator.clipboard.writeText(text);
                        message.success('Response copied to clipboard!');
                      }}
                    >
                      Copy Response
                    </Button>
                  </div>
                </Space>
              </Card>
            )}

            {/* Quick Test Examples */}
            <Card size="small" title="Quick Test Examples">
              <Space wrap>
                <Button
                  size="small"
                  onClick={() => {
                    setTestMethod('GET');
                    setTestEndpoint('/api/users');
                    setTestBody('');
                  }}
                >
                  GET /api/users
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setTestMethod('GET');
                    setTestEndpoint('/api/groups');
                    setTestBody('');
                  }}
                >
                  GET /api/groups
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setTestMethod('GET');
                    setTestEndpoint('/api/ous');
                    setTestBody('');
                  }}
                >
                  GET /api/ous
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setTestMethod('GET');
                    setTestEndpoint('/api/v1/users');
                    setTestBody('');
                  }}
                >
                  GET /api/v1/users (v1)
                </Button>
              </Space>
            </Card>
          </Space>
        </Card>
      </div>
    );
  };

  // ==================== RENDER KEYS LIST ====================
  
  const renderKeysList = () => (
    <div>
      <Row style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Search
            placeholder="Search API keys..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filteredKeys}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} API keys`
        }}
      />
    </div>
  );

  return (
    <div className="api-management">
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <ApiOutlined style={{ marginRight: 8 }} />
              API Management
            </Title>
            <Text type="secondary">Manage API keys for external access</Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchApiKeys}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                Create API Key
              </Button>
            </Space>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: (
                <span>
                  <DashboardOutlined />
                  Overview
                </span>
              ),
              children: renderOverview()
            },
            {
              key: 'keys',
              label: (
                <span>
                  <KeyOutlined />
                  API Keys ({apiKeys.length})
                </span>
              ),
              children: renderKeysList()
            },
            {
              key: 'docs',
              label: (
                <span>
                  <BookOutlined />
                  Documentation
                </span>
              ),
              children: renderDocumentation()
            },
            {
              key: 'tester',
              label: (
                <span>
                  <CodeOutlined />
                  API Tester
                </span>
              ),
              children: renderApiTester()
            }
          ]}
        />
      </Card>

      {/* Create API Key Modal */}
      <Modal
        title={
          <Space>
            <KeyOutlined />
            <span>Create New API Key</span>
          </Space>
        }
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Quick Templates */}
          <Card size="small" title="Quick Templates" style={{ marginBottom: 16 }}>
            <Space wrap>
              {apiKeyTemplates.map((template, index) => (
                <Button
                  key={index}
                  size="small"
                  onClick={() => handleApplyTemplate(template)}
                >
                  {template.name}
                </Button>
              ))}
            </Space>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              Click a template to auto-fill the form
            </Text>
          </Card>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateSubmit}
          >
            <Form.Item
              name="name"
              label={
                <Space>
                  <Text strong>Name</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>(Required)</Text>
                </Space>
              }
              rules={[{ required: true, message: 'Please enter API key name' }]}
            >
              <Input 
                placeholder="e.g., Production API Key, Development Key, etc." 
                prefix={<KeyOutlined />}
              />
            </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            tooltip="Optional description for this API key"
          >
            <TextArea 
              rows={3} 
              placeholder="Describe what this API key will be used for..." 
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="rate_limit"
                label={
                  <Space>
                    <Text strong>Rate Limit</Text>
                    <Tooltip title="Maximum number of requests per minute">
                      <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    </Tooltip>
                  </Space>
                }
                initialValue={100}
                rules={[
                  { required: true, message: 'Please enter rate limit' },
                  { type: 'number', min: 1, max: 10000, message: 'Rate limit must be between 1 and 10000' }
                ]}
              >
                <Input 
                  type="number" 
                  min={1} 
                  max={10000} 
                  addonAfter="req/min"
                  placeholder="100"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expires_at"
                label={
                  <Space>
                    <Text strong>Expiration Date</Text>
                    <Tooltip title="Leave empty for no expiration">
                      <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    </Tooltip>
                  </Space>
                }
              >
                <DatePicker
                  style={{ width: '100%' }}
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  placeholder="No expiration"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="permissions"
            label={
              <Space>
                <Text strong>Permissions</Text>
                <Tooltip title="Select specific endpoints this API key can access. Leave empty to allow access to all endpoints.">
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </Space>
            }
          >
            <Select
              mode="multiple"
              placeholder="Select endpoints (leave empty for all endpoints)"
              options={availableEndpoints}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={<Empty description="No endpoints found" />}
            />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: -16, marginBottom: 16 }}>
            💡 Leave empty to allow access to all endpoints
          </Text>

          <Form.Item
            name="ip_whitelist"
            label={
              <Space>
                <Text strong>IP Whitelist</Text>
                <Tooltip title="One IP address per line. Leave empty to allow all IP addresses.">
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </Space>
            }
          >
            <TextArea 
              rows={4} 
              placeholder="192.168.1.100&#10;10.0.0.50&#10;203.0.113.0/24" 
              showCount
            />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: -16, marginBottom: 16 }}>
            💡 One IP address or CIDR per line. Leave empty to allow all IPs.
          </Text>

          <Alert
            message="Security Notice"
            description="After creation, the API key will be shown only once. Make sure to save it securely!"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsCreateModalVisible(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                icon={<PlusOutlined />}
                size="large"
              >
                Create API Key
              </Button>
            </Space>
          </Form.Item>
        </Form>
        </Space>
      </Modal>

      {/* New API Key Display Modal */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />
            <span>API Key Created Successfully!</span>
          </Space>
        }
        open={isNewKeyModalVisible}
        onCancel={handleNewKeyModalClose}
        footer={[
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={() => handleCopyKey(newApiKey)} size="large">
            Copy Key
          </Button>,
          <Button key="close" onClick={handleNewKeyModalClose} size="large">
            I've Saved It
          </Button>
        ]}
        width={700}
        closable={false}
      >
        <Alert
          message="⚠️ Important: Save this key now!"
          description="This is the only time you'll see the full API key. It won't be shown again after you close this dialog."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Card 
          style={{ 
            background: '#f5f5f5', 
            border: '2px dashed #d9d9d9',
            marginBottom: 16
          }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Your API Key:</Text>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={newApiKey || ''}
                  readOnly
                  style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '14px',
                    fontWeight: 'bold',
                    background: '#fff'
                  }}
                />
                <Button 
                  type="primary"
                  icon={<CopyOutlined />} 
                  onClick={() => handleCopyKey(newApiKey)}
                  size="large"
                >
                  Copy
                </Button>
              </Space.Compact>
            </div>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Usage Example:</Text>
              <Card size="small" style={{ background: '#1e1e1e', color: '#d4d4d4' }}>
                <pre style={{ 
                  margin: 0, 
                  fontFamily: 'monospace', 
                  fontSize: '12px',
                  color: '#d4d4d4'
                }}>
{`curl -X GET "http://localhost:8000/api/users" \\
  -H "Authorization: Bearer ${newApiKey?.substring(0, 30)}..."`}
                </pre>
              </Card>
            </div>
          </Space>
        </Card>

        <Alert
          message="Next Steps"
          description={
            <Space direction="vertical" size="small">
              <Text>1. Copy the API key above</Text>
              <Text>2. Store it securely (password manager, environment variables, etc.)</Text>
              <Text>3. Use it in your API requests with header: <Text code>Authorization: Bearer YOUR_API_KEY</Text></Text>
            </Space>
          }
          type="info"
          showIcon
        />
      </Modal>

      {/* Edit API Key Modal */}
      <Modal
        title="Edit API Key"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setSelectedKey(null);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter API key name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="permissions"
            label="Permissions"
          >
            <Select
              mode="multiple"
              options={availableEndpoints}
            />
          </Form.Item>

          <Form.Item
            name="rate_limit"
            label="Rate Limit"
          >
            <Input type="number" min={1} max={10000} />
          </Form.Item>

          <Form.Item
            name="expires_at"
            label="Expiration Date"
          >
            <DatePicker
              style={{ width: '100%' }}
              showTime
              format="YYYY-MM-DD HH:mm"
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Status"
            valuePropName="checked"
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <Form.Item
            name="ip_whitelist"
            label="IP Whitelist"
          >
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Update
              </Button>
              <Button onClick={() => {
                setIsEditModalVisible(false);
                setSelectedKey(null);
                editForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Details Drawer */}
      <Drawer
        title="API Key Details"
        placement="right"
        width={500}
        open={isDetailsDrawerVisible}
        onClose={() => {
          setIsDetailsDrawerVisible(false);
          setSelectedKey(null);
        }}
      >
        {selectedKey && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Name">{selectedKey.name}</Descriptions.Item>
            <Descriptions.Item label="Key Prefix">
              <Text code>{selectedKey.key_prefix}...</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {selectedKey.is_active ? (
                <Tag color="green">Active</Tag>
              ) : (
                <Tag color="default">Inactive</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Created By">{selectedKey.created_by}</Descriptions.Item>
            <Descriptions.Item label="Created At">
              {dayjs(selectedKey.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="Expires At">
              {selectedKey.expires_at ? dayjs(selectedKey.expires_at).format('YYYY-MM-DD HH:mm:ss') : 'Never'}
            </Descriptions.Item>
            <Descriptions.Item label="Rate Limit">{selectedKey.rate_limit} req/min</Descriptions.Item>
            <Descriptions.Item label="Usage Count">{selectedKey.usage_count || 0}</Descriptions.Item>
            <Descriptions.Item label="Last Used">
              {selectedKey.last_used_at ? dayjs(selectedKey.last_used_at).format('YYYY-MM-DD HH:mm:ss') : 'Never'}
            </Descriptions.Item>
            <Descriptions.Item label="Permissions">
              {selectedKey.permissions && selectedKey.permissions.length > 0 ? (
                <Space wrap>
                  {selectedKey.permissions.map(perm => (
                    <Tag key={perm}>{perm}</Tag>
                  ))}
                </Space>
              ) : (
                <Tag color="blue">All Endpoints</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="IP Whitelist">
              {selectedKey.ip_whitelist && selectedKey.ip_whitelist.length > 0 ? (
                <Space direction="vertical" size="small">
                  {selectedKey.ip_whitelist.map(ip => (
                    <Text code key={ip}>{ip}</Text>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">All IPs</Text>
              )}
            </Descriptions.Item>
            {selectedKey.description && (
              <Descriptions.Item label="Description">{selectedKey.description}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>

      {/* Usage Statistics Drawer */}
      <Drawer
        title="Usage Statistics"
        placement="right"
        width={600}
        open={isUsageDrawerVisible}
        onClose={() => {
          setIsUsageDrawerVisible(false);
          setSelectedKey(null);
          setUsageStats(null);
        }}
        loading={loadingUsage}
      >
        {selectedKey && usageStats && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Total Requests"
                  value={usageStats.total_requests}
                  prefix={<ApiOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Avg Response Time"
                  value={usageStats.avg_response_time_ms}
                  suffix="ms"
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
            </Row>

            <Divider>Requests by Endpoint</Divider>
            {usageStats.by_endpoint && usageStats.by_endpoint.length > 0 ? (
              <List
                dataSource={usageStats.by_endpoint}
                renderItem={(item) => (
                  <List.Item>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text code>{item.endpoint}</Text>
                      <Badge count={item.count} showZero />
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No usage data" />
            )}

            <Divider>Requests by Status Code</Divider>
            {usageStats.by_status && usageStats.by_status.length > 0 ? (
              <List
                dataSource={usageStats.by_status}
                renderItem={(item) => (
                  <List.Item>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Tag color={item.status_code >= 400 ? 'red' : 'green'}>
                        {item.status_code}
                      </Tag>
                      <Badge count={item.count} showZero />
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No status data" />
            )}
          </Space>
        )}
      </Drawer>

      {/* Request Logs Drawer */}
      <Drawer
        title={`Request Logs - ${selectedKey?.name || ''}`}
        placement="right"
        width={800}
        open={isLogsDrawerVisible}
        onClose={() => {
          setIsLogsDrawerVisible(false);
          setSelectedKey(null);
          setRequestLogs([]);
        }}
        loading={loadingLogs}
      >
        {selectedKey && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Table
              dataSource={requestLogs}
              rowKey="id"
              loading={loadingLogs}
              pagination={{
                current: logsPage,
                pageSize: logsPageSize,
                total: logsTotal,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} logs`,
                onChange: (page, pageSize) => {
                  setLogsPage(page);
                  setLogsPageSize(pageSize);
                  fetchRequestLogs(selectedKey.id, page, { page_size: pageSize });
                }
              }}
              columns={[
                {
                  title: 'Time',
                  dataIndex: 'timestamp',
                  key: 'timestamp',
                  width: 180,
                  render: (timestamp) => dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
                },
                {
                  title: 'Method',
                  dataIndex: 'method',
                  key: 'method',
                  width: 80,
                  render: (method) => <Tag color={method === 'GET' ? 'blue' : method === 'POST' ? 'green' : method === 'PUT' ? 'orange' : method === 'DELETE' ? 'red' : 'default'}>{method}</Tag>
                },
                {
                  title: 'Endpoint',
                  dataIndex: 'endpoint',
                  key: 'endpoint',
                  ellipsis: true
                },
                {
                  title: 'Status',
                  dataIndex: 'response_status',
                  key: 'response_status',
                  width: 100,
                  render: (status) => (
                    <Tag color={status >= 200 && status < 300 ? 'green' : status >= 400 ? 'red' : 'orange'}>
                      {status}
                    </Tag>
                  )
                },
                {
                  title: 'Time',
                  dataIndex: 'response_time_ms',
                  key: 'response_time_ms',
                  width: 100,
                  render: (time) => `${time}ms`
                },
                {
                  title: 'IP',
                  dataIndex: 'ip_address',
                  key: 'ip_address',
                  width: 120
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 100,
                  render: (_, record) => (
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => {
                        Modal.info({
                          title: 'Request/Response Details',
                          width: 800,
                          content: (
                            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                              <div>
                                <Text strong>Request Headers:</Text>
                                <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                                  {JSON.stringify(record.request_headers || {}, null, 2)}
                                </pre>
                              </div>
                              {record.request_body && (
                                <div>
                                  <Text strong>Request Body:</Text>
                                  <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                                    {record.request_body}
                                  </pre>
                                </div>
                              )}
                              {record.response_headers && (
                                <div>
                                  <Text strong>Response Headers:</Text>
                                  <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                                    {JSON.stringify(record.response_headers || {}, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {record.response_body && (
                                <div>
                                  <Text strong>Response Body:</Text>
                                  <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '12px', maxHeight: '300px', overflow: 'auto' }}>
                                    {typeof record.response_body === 'string' ? record.response_body : JSON.stringify(record.response_body, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {record.error_message && (
                                <Alert
                                  message="Error"
                                  description={record.error_message}
                                  type="error"
                                  showIcon
                                />
                              )}
                            </Space>
                          )
                        });
                      }}
                    >
                      Details
                    </Button>
                  )
                }
              ]}
            />
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default ApiManagement;

