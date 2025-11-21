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
  Collapse,
  Dropdown,
  Menu,
  Checkbox,
  Radio,
  Segmented,
  Timeline,
  Rate,
  Pagination
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
  HistoryOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  TableOutlined,
  FilterOutlined,
  SearchOutlined,
  MoreOutlined,
  SyncOutlined,
  StopOutlined,
  CheckOutlined,
  CloseOutlined,
  ExportOutlined,
  ImportOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  BellOutlined,
  CalendarOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { apiKeyService } from '../services/apiKeyService';
import { useNotification } from '../contexts/NotificationContext';
import config from '../config';
import dayjs from 'dayjs';
import './ApiManagement.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

const ApiManagement = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [codeExamples, setCodeExamples] = useState([]);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [quickStart, setQuickStart] = useState(null);
  
  // View Mode & Display
  const [viewMode, setViewMode] = useState('table'); // 'table', 'card', 'list'
  const [selectedKeys, setSelectedKeys] = useState([]); // For bulk operations
  const [showMaskedKeys, setShowMaskedKeys] = useState({}); // Track which keys to show full
  
  // Advanced Filtering
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive', 'expired'
  const [dateRangeFilter, setDateRangeFilter] = useState(null);
  const [usageFilter, setUsageFilter] = useState('all'); // 'all', 'high', 'medium', 'low', 'none'
  const [permissionFilter, setPermissionFilter] = useState('all'); // 'all', 'restricted', 'full'
  
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
  const [noExpiration, setNoExpiration] = useState(true); // Default: no expiration
  const { message } = App.useApp();
  const { notifyError, notifySuccess } = useNotification();

  // Available endpoints for permissions (memoized)
  const availableEndpoints = useMemo(() => [
    { value: '/api/users', label: 'Users API' },
    { value: '/api/groups', label: 'Groups API' },
    { value: '/api/ous', label: 'OUs API' },
    { value: '/api/activity-logs', label: 'Activity Logs API' },
    { value: '/api/v1/users', label: 'Users API (v1)' },
    { value: '/api/v1/groups', label: 'Groups API (v1)' },
    { value: '/api/v1/ous', label: 'OUs API (v1)' },
  ], []);

  // API Key Templates/Presets (memoized)
  const apiKeyTemplates = useMemo(() => [
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
  ], []);

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
      } else {
        console.warn('Failed to fetch code examples:', response.status);
      }
    } catch (error) {
      console.error('Error fetching code examples:', error);
      notifyError('Failed to load code examples', error.message);
    } finally {
      setLoadingExamples(false);
    }
  }, [notifyError]);

  // Fetch quick start guide
  const fetchQuickStart = useCallback(async () => {
    try {
      const apiUrl = config.apiUrl || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/docs/quick-start`);
      if (response.ok) {
        const data = await response.json();
        setQuickStart(data);
      } else {
        console.warn('Failed to fetch quick start:', response.status);
      }
    } catch (error) {
      console.error('Error fetching quick start:', error);
      // Don't show error notification for quick start (non-critical)
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
    setNoExpiration(true); // Reset to no expiration
    // Set default values
    form.setFieldsValue({
      rate_limit: 100,
      permissions: [],
      expires_at: null
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
        permissions: values.permissions || [],
        rate_limit: values.rate_limit || 100,
        expires_at: noExpiration ? null : (values.expires_at ? values.expires_at.toISOString() : null),
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

  const fetchRequestLogs = useCallback(async (keyId, page = 1, filters = {}) => {
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
  }, [logsPageSize, notifyError]);

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    message.success('API Key copied to clipboard!');
  };

  const handleNewKeyModalClose = () => {
    setIsNewKeyModalVisible(false);
    setNewApiKey(null);
  };

  // ==================== HELPER FUNCTIONS ====================
  
  // Get key status
  const getKeyStatus = useCallback((key) => {
    if (key.expires_at && dayjs(key.expires_at).isBefore(dayjs())) {
      return { status: 'expired', label: 'Expired', color: 'red', icon: <CloseCircleOutlined /> };
    }
    if (!key.is_active) {
      return { status: 'inactive', label: 'Inactive', color: 'default', icon: <StopOutlined /> };
    }
    return { status: 'active', label: 'Active', color: 'green', icon: <CheckCircleOutlined /> };
  }, []);

  // Get usage level
  const getUsageLevel = useCallback((count) => {
    if (!count || count === 0) return { level: 'none', label: 'No Usage', color: 'default' };
    if (count < 100) return { level: 'low', label: 'Low', color: 'blue' };
    if (count < 1000) return { level: 'medium', label: 'Medium', color: 'orange' };
    return { level: 'high', label: 'High', color: 'green' };
  }, []);

  // Format key prefix for display
  const formatKeyPrefix = useCallback((prefix, showFull = false) => {
    if (!prefix) return '-';
    if (showFull) return prefix;
    return `${prefix.substring(0, 12)}...`;
  }, []);

  // Toggle masked key display
  const toggleKeyVisibility = useCallback((keyId) => {
    setShowMaskedKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  }, []);

  // Copy key prefix
  const handleCopyPrefix = useCallback((prefix) => {
    navigator.clipboard.writeText(prefix);
    message.success('Key prefix copied to clipboard!');
  }, [message]);

  // Regenerate key (create new with same settings)
  const handleRegenerate = useCallback(async (key) => {
    try {
      // Get current key settings
      const keyData = {
        name: key.name,
        description: key.description,
        permissions: key.permissions || [],
        rate_limit: key.rate_limit,
        expires_at: key.expires_at,
        ip_whitelist: key.ip_whitelist || [],
        is_active: key.is_active
      };

      // Create new key with same settings
      const result = await apiKeyService.createApiKey(keyData);
      if (result.success) {
        // Delete old key
        await apiKeyService.deleteApiKey(key.id);
        
        // Show new key
        setNewApiKey(result.data.api_key);
        setIsNewKeyModalVisible(true);
        fetchApiKeys();
        notifySuccess('API Key regenerated successfully');
      } else {
        notifyError('Failed to regenerate API key', result.error);
      }
    } catch (error) {
      notifyError('Failed to regenerate API key', error.message);
    }
  }, [fetchApiKeys, notifyError, notifySuccess, message]);

  // Revoke key (disable)
  const handleRevoke = useCallback(async (key) => {
    try {
      const result = await apiKeyService.updateApiKey(key.id, { is_active: false });
      if (result.success) {
        fetchApiKeys();
        notifySuccess('API Key revoked successfully');
      } else {
        notifyError('Failed to revoke API key', result.error);
      }
    } catch (error) {
      notifyError('Failed to revoke API key', error.message);
    }
  }, [fetchApiKeys, notifyError, notifySuccess]);

  // Clone key (copy settings)
  const handleClone = useCallback((key) => {
    form.resetFields();
    form.setFieldsValue({
      name: `${key.name} (Copy)`,
      description: key.description,
      permissions: key.permissions || [],
      rate_limit: key.rate_limit,
      expires_at: key.expires_at ? dayjs(key.expires_at) : null,
      ip_whitelist: key.ip_whitelist?.join('\n') || ''
    });
    setIsCreateModalVisible(true);
    message.info('Key settings copied to create form');
  }, [form, message]);

  // Bulk operations
  const handleBulkActivate = useCallback(async () => {
    try {
      const promises = selectedKeys.map(id => 
        apiKeyService.updateApiKey(id, { is_active: true })
      );
      await Promise.all(promises);
      fetchApiKeys();
      setSelectedKeys([]);
      notifySuccess(`${selectedKeys.length} API key(s) activated`);
    } catch (error) {
      notifyError('Failed to activate API keys', error.message);
    }
  }, [selectedKeys, fetchApiKeys, notifyError, notifySuccess]);

  const handleBulkDeactivate = useCallback(async () => {
    try {
      const promises = selectedKeys.map(id => 
        apiKeyService.updateApiKey(id, { is_active: false })
      );
      await Promise.all(promises);
      fetchApiKeys();
      setSelectedKeys([]);
      notifySuccess(`${selectedKeys.length} API key(s) deactivated`);
    } catch (error) {
      notifyError('Failed to deactivate API keys', error.message);
    }
  }, [selectedKeys, fetchApiKeys, notifyError, notifySuccess]);

  const handleBulkDelete = useCallback(async () => {
    try {
      const promises = selectedKeys.map(id => apiKeyService.deleteApiKey(id));
      await Promise.all(promises);
      fetchApiKeys();
      setSelectedKeys([]);
      notifySuccess(`${selectedKeys.length} API key(s) deleted`);
    } catch (error) {
      notifyError('Failed to delete API keys', error.message);
    }
  }, [selectedKeys, fetchApiKeys, notifyError, notifySuccess]);

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
  
  const filteredKeys = useMemo(() => {
    let filtered = apiKeys;

    // Search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(key => (
        key.name.toLowerCase().includes(searchLower) ||
        key.key_prefix.toLowerCase().includes(searchLower) ||
        (key.description && key.description.toLowerCase().includes(searchLower))
      ));
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(key => {
        const status = getKeyStatus(key);
        return status.status === statusFilter;
      });
    }

    // Usage filter
    if (usageFilter !== 'all') {
      filtered = filtered.filter(key => {
        const usage = getUsageLevel(key.usage_count || 0);
        return usage.level === usageFilter;
      });
    }

    // Permission filter
    if (permissionFilter === 'restricted') {
      filtered = filtered.filter(key => 
        key.permissions && key.permissions.length > 0
      );
    } else if (permissionFilter === 'full') {
      filtered = filtered.filter(key => 
        !key.permissions || key.permissions.length === 0
      );
    }

    // Date range filter
    if (dateRangeFilter && dateRangeFilter.length === 2) {
      const [startDate, endDate] = dateRangeFilter;
      filtered = filtered.filter(key => {
        if (!key.created_at) return false;
        const createdDate = dayjs(key.created_at);
        return createdDate.isAfter(startDate) && createdDate.isBefore(endDate);
      });
    }

    return filtered;
  }, [apiKeys, searchText, statusFilter, usageFilter, permissionFilter, dateRangeFilter, getKeyStatus, getUsageLevel]);

  // ==================== TABLE COLUMNS ====================
  
  const columns = useMemo(() => [
    {
      title: (
        <Checkbox
          indeterminate={selectedKeys.length > 0 && selectedKeys.length < filteredKeys.length}
          checked={selectedKeys.length > 0 && selectedKeys.length === filteredKeys.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedKeys(filteredKeys.map(k => k.id));
            } else {
              setSelectedKeys([]);
            }
          }}
        />
      ),
      key: 'selection',
      width: 50,
      fixed: 'left',
      render: (_, record) => (
        <Checkbox
          checked={selectedKeys.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedKeys([...selectedKeys, record.id]);
            } else {
              setSelectedKeys(selectedKeys.filter(id => id !== record.id));
            }
          }}
        />
      )
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left',
      render: (text, record) => {
        const status = getKeyStatus(record);
        return (
        <Space>
            <Avatar 
              size={32} 
              icon={<KeyOutlined />}
              style={{ 
                background: status.status === 'active' ? '#10b981' : status.status === 'expired' ? '#ef4444' : '#6b7280',
                color: '#ffffff'
              }}
            />
            <div>
              <Text strong style={{ fontSize: 14, display: 'block' }}>{text}</Text>
              {record.description && (
                <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
              )}
            </div>
        </Space>
        );
      }
    },
    {
      title: 'API Key',
      dataIndex: 'key_prefix',
      key: 'key_prefix',
      width: 200,
      render: (text, record) => {
        const showFull = showMaskedKeys[record.id];
        return (
          <Space>
            <Text code style={{ fontSize: 12, fontFamily: 'monospace' }}>
              {formatKeyPrefix(text, showFull)}
            </Text>
            <Tooltip title={showFull ? 'Hide' : 'Show full prefix'}>
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => toggleKeyVisibility(record.id)}
                style={{ padding: 0, height: 'auto' }}
              />
            </Tooltip>
            <Tooltip title="Copy prefix">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyPrefix(text)}
                style={{ padding: 0, height: 'auto' }}
              />
            </Tooltip>
          </Space>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      render: (isActive, record) => {
        const status = getKeyStatus(record);
        return (
          <Tag color={status.color} icon={status.icon} style={{ borderRadius: 6, padding: '4px 12px' }}>
            {status.label}
          </Tag>
        );
      }
    },
    {
      title: 'Usage',
      dataIndex: 'usage_count',
      key: 'usage_count',
      width: 150,
      sorter: (a, b) => (a.usage_count || 0) - (b.usage_count || 0),
      render: (count, record) => {
        const usage = getUsageLevel(count);
        return (
          <Space>
            <Badge count={count || 0} showZero style={{ backgroundColor: usage.color }} />
            <Tag color={usage.color} style={{ margin: 0 }}>{usage.label}</Tag>
          </Space>
        );
      }
    },
    {
      title: 'Last Used',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      width: 180,
      sorter: (a, b) => {
        if (!a.last_used_at && !b.last_used_at) return 0;
        if (!a.last_used_at) return 1;
        if (!b.last_used_at) return -1;
        return dayjs(a.last_used_at).unix() - dayjs(b.last_used_at).unix();
      },
      render: (date) => {
        if (!date) {
          return <Text type="secondary" style={{ fontStyle: 'italic' }}>Never</Text>;
        }
        const daysAgo = dayjs().diff(dayjs(date), 'day');
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 13 }}>{dayjs(date).format('YYYY-MM-DD HH:mm')}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Rate Limit',
      dataIndex: 'rate_limit',
      key: 'rate_limit',
      width: 120,
      sorter: (a, b) => a.rate_limit - b.rate_limit,
      render: (limit) => (
        <Tag color="blue" style={{ margin: 0 }}>{limit} req/min</Tag>
      )
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      key: 'expires_at',
      width: 150,
      render: (date, record) => {
        if (!date) {
          return <Text type="secondary">Never</Text>;
        }
        const daysUntil = dayjs(date).diff(dayjs(), 'day');
        const isExpired = daysUntil < 0;
        const isExpiringSoon = daysUntil >= 0 && daysUntil <= 30;
        
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 13 }}>{dayjs(date).format('YYYY-MM-DD')}</Text>
            {isExpired && (
              <Text type="danger" style={{ fontSize: 11 }}>Expired</Text>
            )}
            {isExpiringSoon && !isExpired && (
              <Text type="warning" style={{ fontSize: 11 }}>{daysUntil} days left</Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => {
        const status = getKeyStatus(record);
        const actionMenu = (
          <Menu>
            <Menu.Item key="view" icon={<EyeOutlined />} onClick={() => handleViewDetails(record)}>
              View Details
            </Menu.Item>
            <Menu.Item key="usage" icon={<BarChartOutlined />} onClick={() => handleViewUsage(record)}>
              View Usage
            </Menu.Item>
            <Menu.Item key="logs" icon={<HistoryOutlined />} onClick={() => handleViewLogs(record)}>
              View Logs
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              Edit
            </Menu.Item>
            <Menu.Item key="clone" icon={<CopyOutlined />} onClick={() => handleClone(record)}>
              Clone
            </Menu.Item>
            <Menu.Item key="regenerate" icon={<SyncOutlined />} onClick={() => handleRegenerate(record)}>
              Regenerate
            </Menu.Item>
            {status.status === 'active' && (
              <Menu.Item key="revoke" icon={<StopOutlined />} onClick={() => handleRevoke(record)}>
                Revoke
              </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item 
              key="delete" 
              icon={<DeleteOutlined />} 
              danger
              onClick={() => {
                Modal.confirm({
                  title: 'Delete API Key',
                  content: `Are you sure you want to delete "${record.name}"? This action cannot be undone.`,
                  okText: 'Delete',
                  okType: 'danger',
                  cancelText: 'Cancel',
                  onOk: () => handleDelete(record.id)
                });
              }}
            >
              Delete
            </Menu.Item>
          </Menu>
        );

        return (
        <Space>
            <Tooltip title="Quick Actions">
              <Dropdown overlay={actionMenu} trigger={['click']}>
                <Button type="text" icon={<MoreOutlined />} />
              </Dropdown>
            </Tooltip>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
        </Space>
        );
      }
    }
  ], [
    selectedKeys, 
    filteredKeys, 
    showMaskedKeys, 
    getKeyStatus, 
    getUsageLevel, 
    formatKeyPrefix, 
    toggleKeyVisibility, 
    handleCopyPrefix, 
    handleViewDetails, 
    handleViewUsage, 
    handleViewLogs, 
    handleEdit, 
    handleClone, 
    handleRegenerate, 
    handleRevoke, 
    handleDelete
  ]);

  // ==================== ENHANCED STATISTICS ====================
  
  const enhancedStatistics = useMemo(() => {
    const stats = statistics;
    const recentKeys = apiKeys
      .filter(k => k.created_at)
      .sort((a, b) => dayjs(b.created_at).unix() - dayjs(a.created_at).unix())
      .slice(0, 5);
    
    const topUsedKeys = apiKeys
      .filter(k => (k.usage_count || 0) > 0)
      .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
      .slice(0, 5);
    
    const avgUsage = apiKeys.length > 0 
      ? Math.round(stats.totalUsage / apiKeys.length)
      : 0;
    
    const activePercentage = stats.total > 0 
      ? Math.round((stats.active / stats.total) * 100)
      : 0;
    
    return {
      ...stats,
      recentKeys,
      topUsedKeys,
      avgUsage,
      activePercentage
    };
  }, [statistics, apiKeys]);

  // ==================== RENDER OVERVIEW ====================
  
  const renderOverview = useCallback(() => (
    <div>
      {/* Enhanced Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="api-stat-card api-stat-card-primary" hoverable>
            <Statistic
              title="Total API Keys"
              value={statistics.total}
              prefix={<KeyOutlined />}
              valueStyle={{ color: '#1f2937' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="api-stat-card api-stat-card-success" hoverable>
            <Statistic
              title="Active Keys"
              value={statistics.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1f2937' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="api-stat-card api-stat-card-warning" hoverable>
            <Statistic
              title="Total Requests"
              value={statistics.totalUsage}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#1f2937' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="api-stat-card api-stat-card-danger" hoverable>
            <Statistic
              title="Expired Keys"
              value={statistics.expired}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#1f2937' }}
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

      {/* Analytics Section */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} lg={12}>
          <Card 
                      title={
                        <Space>
                <BarChartOutlined />
                <span>Usage Analytics</span>
                        </Space>
                      }
            className="api-analytics-card"
            extra={
                    <Button
                type="link" 
                size="small"
                onClick={() => setActiveTab('keys')}
              >
                View All
              </Button>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                  <Text strong>Average Usage per Key</Text>
                  <Badge count={enhancedStatistics.avgUsage} showZero style={{ backgroundColor: '#1890ff' }} />
                </Row>
                <Progress
                  percent={Math.min((enhancedStatistics.avgUsage / 1000) * 100, 100)}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  format={() => `${enhancedStatistics.avgUsage} requests`}
                />
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div>
                <Text strong style={{ display: 'block', marginBottom: 12 }}>Top Used Keys</Text>
                {enhancedStatistics.topUsedKeys.length > 0 ? (
                  <List
                    size="small"
                    dataSource={enhancedStatistics.topUsedKeys}
                    renderItem={(key, index) => {
                      const usage = getUsageLevel(key.usage_count || 0);
                      return (
                        <List.Item>
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Space>
                              <Badge count={index + 1} style={{ backgroundColor: usage.color }} />
                              <Text strong style={{ fontSize: 13 }}>{key.name}</Text>
                            </Space>
                            <Space>
                              <Badge count={key.usage_count || 0} showZero style={{ backgroundColor: usage.color }} />
                              <Tag color={usage.color}>{usage.label}</Tag>
                            </Space>
                          </Space>
                  </List.Item>
                      );
                    }}
              />
            ) : (
                  <Empty description="No usage data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <ClockCircleOutlined />
                <span>Key Status Distribution</span>
              </Space>
            }
            className="api-status-distribution-card"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text>Active</Text>
                  </Space>
                  <Space>
                    <Text strong>{enhancedStatistics.active}</Text>
                    <Text type="secondary">({enhancedStatistics.activePercentage}%)</Text>
                  </Space>
                </Row>
                <Progress
                  percent={enhancedStatistics.activePercentage}
                  strokeColor="#52c41a"
                  showInfo={false}
                  strokeWidth={12}
                />
              </div>
              <div>
                <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                  <Space>
                    <StopOutlined style={{ color: '#d9d9d9' }} />
                  <Text>Inactive</Text>
                  </Space>
                  <Text strong>{enhancedStatistics.inactive}</Text>
                </Row>
                <Progress
                  percent={enhancedStatistics.total > 0 ? Math.round((enhancedStatistics.inactive / enhancedStatistics.total) * 100) : 0}
                  strokeColor="#d9d9d9"
                  showInfo={false}
                  strokeWidth={12}
                />
              </div>
              <div>
                <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                  <Space>
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  <Text>Expired</Text>
                  </Space>
                  <Text strong>{enhancedStatistics.expired}</Text>
                </Row>
                <Progress
                  percent={enhancedStatistics.total > 0 ? Math.round((enhancedStatistics.expired / enhancedStatistics.total) * 100) : 0}
                  strokeColor="#ff4d4f"
                  showInfo={false}
                  strokeWidth={12}
                />
              </div>
              {enhancedStatistics.expiringSoon > 0 && (
                <Alert
                  message={`${enhancedStatistics.expiringSoon} key(s) expiring soon`}
                  type="warning"
                  size="small"
                  showIcon
                />
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <CalendarOutlined />
                <span>Recent API Keys</span>
              </Space>
            }
            className="api-recent-keys-card"
            extra={
              <Button 
                type="link" 
                size="small"
                onClick={() => setActiveTab('keys')}
              >
                View All
              </Button>
            }
          >
            {enhancedStatistics.recentKeys.length > 0 ? (
              <List
                dataSource={enhancedStatistics.recentKeys}
                renderItem={(key) => {
                  const status = getKeyStatus(key);
                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="view"
                          type="text"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => {
                            handleViewDetails(key);
                            setActiveTab('keys');
                          }}
                        />
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            icon={<KeyOutlined />}
                            style={{ 
                              background: status.status === 'active' ? '#52c41a' : status.status === 'expired' ? '#ff4d4f' : '#d9d9d9',
                              color: '#ffffff'
                            }}
                          />
                        }
                        title={
                          <Space>
                            <Text strong>{key.name}</Text>
                            <Tag color={status.color} icon={status.icon} style={{ margin: 0 }}>
                              {status.label}
                            </Tag>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={2}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              <Text code style={{ fontSize: 10 }}>{formatKeyPrefix(key.key_prefix)}</Text>
                            </Text>
                            <Space split={<Divider type="vertical" />}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                Usage: <Badge count={key.usage_count || 0} showZero style={{ backgroundColor: '#1890ff' }} />
                              </Text>
                              {key.created_at && (
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  Created: {dayjs(key.created_at).format('YYYY-MM-DD')}
                                </Text>
                              )}
                            </Space>
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty description="No API keys yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <TeamOutlined />
                <span>Quick Actions</span>
              </Space>
            }
            className="api-quick-actions-card"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                size="large"
                onClick={handleCreate}
              >
                Create New API Key
              </Button>
              <Button
                icon={<ReloadOutlined />}
                block
                size="large"
                onClick={fetchApiKeys}
                loading={loading}
              >
                Refresh Data
              </Button>
              <Divider style={{ margin: '8px 0' }} />
              <Row gutter={8}>
                <Col span={12}>
                  <Button
                    icon={<BarChartOutlined />}
                    block
                    onClick={() => setActiveTab('keys')}
                  >
                    View Analytics
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    icon={<BookOutlined />}
                    block
                    onClick={() => setActiveTab('docs')}
                  >
                    Documentation
                  </Button>
                </Col>
              </Row>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  ), [enhancedStatistics, getKeyStatus, getUsageLevel, formatKeyPrefix, handleViewDetails, handleCreate, fetchApiKeys, loading, setActiveTab]);

  // ==================== RENDER DOCUMENTATION ====================
  
  const renderDocumentation = useCallback(() => {
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
  }, [quickStart, codeExamples, loadingExamples, fetchCodeExamples, message]);

  // ==================== API TESTING ====================
  
  const handleTestApi = useCallback(async () => {
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
  }, [selectedTestKey, testEndpoint, testMethod, testHeaders, testBody, message]);

  // ==================== RENDER API TESTER ====================
  
  const renderApiTester = useCallback(() => {
    const apiUrl = config.apiUrl || 'http://localhost:8000';
    const defaultHeaders = JSON.stringify({
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    }, null, 2);
    
    return (
      <div>
        <Card title="API Tester" style={{ marginBottom: 24 }} className="api-tester-card">
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
  }, [testMethod, testEndpoint, testHeaders, testBody, testing, testResponse, testResponseHeaders, selectedTestKey, setTestMethod, setTestEndpoint, setTestBody, handleTestApi, message]);

  // ==================== FILTER BAR ====================
  
  const renderFilterBar = useCallback(() => (
    <Card 
      size="small" 
      style={{ 
        marginBottom: 24, 
        background: '#f8fafc',
        border: '1px solid #e5e7eb'
      }}
      bodyStyle={{ padding: '16px' }}
    >
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} sm={12} md={8} lg={6}>
          <Search
            placeholder="Search by name, prefix, description..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            prefix={<SearchOutlined />}
            size="large"
          />
        </Col>
        <Col xs={24} sm={12} md={6} lg={4}>
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: '100%' }}
            size="large"
            allowClear
          >
            <Select.Option value="all">All Status</Select.Option>
            <Select.Option value="active">Active</Select.Option>
            <Select.Option value="inactive">Inactive</Select.Option>
            <Select.Option value="expired">Expired</Select.Option>
          </Select>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4}>
          <Select
            placeholder="Usage"
            value={usageFilter}
            onChange={setUsageFilter}
            style={{ width: '100%' }}
            size="large"
            allowClear
          >
            <Select.Option value="all">All Usage</Select.Option>
            <Select.Option value="high">High Usage</Select.Option>
            <Select.Option value="medium">Medium Usage</Select.Option>
            <Select.Option value="low">Low Usage</Select.Option>
            <Select.Option value="none">No Usage</Select.Option>
          </Select>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4}>
          <Select
            placeholder="Permissions"
            value={permissionFilter}
            onChange={setPermissionFilter}
            style={{ width: '100%' }}
            size="large"
            allowClear
          >
            <Select.Option value="all">All Permissions</Select.Option>
            <Select.Option value="full">Full Access</Select.Option>
            <Select.Option value="restricted">Restricted</Select.Option>
          </Select>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4}>
          <DatePicker.RangePicker
            value={dateRangeFilter}
            onChange={setDateRangeFilter}
            style={{ width: '100%' }}
            size="large"
            placeholder={['Created From', 'Created To']}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={6} lg={2}>
          <Space>
            <Segmented
              value={viewMode}
              onChange={setViewMode}
              options={[
                { label: <TableOutlined />, value: 'table' },
                { label: <AppstoreOutlined />, value: 'card' },
                { label: <UnorderedListOutlined />, value: 'list' }
              ]}
              size="large"
            />
          </Space>
        </Col>
      </Row>

      {/* Quick Filters */}
      <Row gutter={[8, 8]} style={{ marginTop: 12 }}>
        <Col>
          <Space wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>Quick Filters:</Text>
            <Button 
              size="small" 
              type={statusFilter === 'active' ? 'primary' : 'default'}
              onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
            >
              Active Only
            </Button>
            <Button 
              size="small" 
              type={statusFilter === 'expired' ? 'primary' : 'default'}
              onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}
            >
              Expired
            </Button>
            <Button 
              size="small" 
              type={usageFilter === 'none' ? 'primary' : 'default'}
              onClick={() => setUsageFilter(usageFilter === 'none' ? 'all' : 'none')}
            >
              Never Used
            </Button>
            {(statusFilter !== 'all' || usageFilter !== 'all' || permissionFilter !== 'all' || dateRangeFilter) && (
              <Button 
                size="small" 
                type="link"
                onClick={() => {
                  setStatusFilter('all');
                  setUsageFilter('all');
                  setPermissionFilter('all');
                  setDateRangeFilter(null);
                }}
              >
                Clear All
              </Button>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  ), [searchText, statusFilter, usageFilter, permissionFilter, dateRangeFilter, viewMode, setSearchText, setStatusFilter, setUsageFilter, setPermissionFilter, setDateRangeFilter, setViewMode]);

  // ==================== BULK ACTIONS BAR ====================
  
  const renderBulkActionsBar = useCallback(() => {
    if (selectedKeys.length === 0) return null;

    return (
      <Card 
        size="small" 
        style={{ 
          marginBottom: 16,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: '#ffffff'
        }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Text strong style={{ color: '#ffffff', fontSize: 14 }}>
                {selectedKeys.length} key(s) selected
              </Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                size="small"
                icon={<CheckOutlined />}
                onClick={handleBulkActivate}
                style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid rgba(255, 255, 255, 0.3)', color: '#ffffff' }}
              >
                Activate
              </Button>
              <Button
                size="small"
                icon={<StopOutlined />}
                onClick={handleBulkDeactivate}
                style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid rgba(255, 255, 255, 0.3)', color: '#ffffff' }}
              >
                Deactivate
              </Button>
              <Popconfirm
                title="Delete Selected Keys"
                description={`Are you sure you want to delete ${selectedKeys.length} API key(s)? This action cannot be undone.`}
                onConfirm={handleBulkDelete}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  style={{ background: 'rgba(255, 77, 79, 0.2)', border: '1px solid rgba(255, 77, 79, 0.3)', color: '#ffffff' }}
                >
                  Delete
                </Button>
              </Popconfirm>
              <Button
                size="small"
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setSelectedKeys([])}
                style={{ color: '#ffffff' }}
              >
                Clear
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  }, [selectedKeys, handleBulkActivate, handleBulkDeactivate, handleBulkDelete]);

  // ==================== CARD VIEW ====================
  
  const renderCardView = useCallback(() => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Loading API keys...</Text>
          </div>
        </div>
      );
    }

    if (filteredKeys.length === 0) {
      const hasFilters = searchText || statusFilter !== 'all' || usageFilter !== 'all' || permissionFilter !== 'all' || dateRangeFilter;
      return (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          imageStyle={{ height: 120 }}
          description={
            <Space direction="vertical" size="small">
              <Text strong style={{ fontSize: 16 }}>
                {hasFilters ? 'No API keys match your filters' : 'No API keys found'}
              </Text>
              <Text type="secondary" style={{ fontSize: 14 }}>
                {hasFilters 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by creating your first API key'
                }
              </Text>
            </Space>
          }
          style={{ padding: '60px 20px' }}
        >
          {hasFilters ? (
            <Button 
              type="primary" 
              onClick={() => {
                setSearchText('');
                setStatusFilter('all');
                setUsageFilter('all');
                setPermissionFilter('all');
                setDateRangeFilter(null);
              }}
            >
              Clear Filters
            </Button>
          ) : (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Create API Key
            </Button>
          )}
        </Empty>
      );
    }

    return (
      <Row gutter={[16, 16]}>
        {filteredKeys.map(key => {
          const status = getKeyStatus(key);
          const usage = getUsageLevel(key.usage_count || 0);
          const showFull = showMaskedKeys[key.id];
          
          return (
            <Col xs={24} sm={12} lg={8} xl={6} key={key.id}>
              <Card
                hoverable
                className="api-key-card"
                style={{
                  height: '100%',
                  border: `2px solid ${status.status === 'active' ? '#10b981' : status.status === 'expired' ? '#ef4444' : '#e5e7eb'}`,
                  borderRadius: 12
                }}
                actions={[
                  <Tooltip title="View Details" key="view">
                    <EyeOutlined onClick={() => handleViewDetails(key)} />
                  </Tooltip>,
                  <Tooltip title="Edit" key="edit">
                    <EditOutlined onClick={() => handleEdit(key)} />
                  </Tooltip>,
                  <Tooltip title="More Actions" key="more">
                    <Dropdown
                      overlay={
                        <Menu>
                          <Menu.Item key="usage" icon={<BarChartOutlined />} onClick={() => handleViewUsage(key)}>
                            View Usage
                          </Menu.Item>
                          <Menu.Item key="logs" icon={<HistoryOutlined />} onClick={() => handleViewLogs(key)}>
                            View Logs
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item key="clone" icon={<CopyOutlined />} onClick={() => handleClone(key)}>
                            Clone
                          </Menu.Item>
                          <Menu.Item key="regenerate" icon={<SyncOutlined />} onClick={() => handleRegenerate(key)}>
                            Regenerate
                          </Menu.Item>
                          {status.status === 'active' && (
                            <Menu.Item key="revoke" icon={<StopOutlined />} onClick={() => handleRevoke(key)}>
                              Revoke
                            </Menu.Item>
                          )}
                          <Menu.Divider />
                          <Menu.Item 
                            key="delete" 
                            icon={<DeleteOutlined />} 
                            danger
                            onClick={() => {
                              Modal.confirm({
                                title: 'Delete API Key',
                                content: `Are you sure you want to delete "${key.name}"?`,
                                onOk: () => handleDelete(key.id)
                              });
                            }}
                          >
                            Delete
                          </Menu.Item>
                        </Menu>
                      }
                      trigger={['click']}
                    >
                      <MoreOutlined />
                    </Dropdown>
                  </Tooltip>
                ]}
              >
                <Card.Meta
                  avatar={
                    <Avatar 
                      size={48} 
                      icon={<KeyOutlined />}
                      style={{ 
                        background: status.status === 'active' ? '#10b981' : status.status === 'expired' ? '#ef4444' : '#6b7280',
                        color: '#ffffff'
                      }}
                    />
                  }
                  title={
                    <Space>
                      <Text strong style={{ fontSize: 15 }}>{key.name}</Text>
                      <Tag color={status.color} icon={status.icon} style={{ margin: 0 }}>
                        {status.label}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 8 }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Key Prefix:</Text>
                        <br />
                        <Space>
                          <Text code style={{ fontSize: 11, fontFamily: 'monospace' }}>
                            {formatKeyPrefix(key.key_prefix, showFull)}
                          </Text>
                          <Button
                            type="text"
                            size="small"
                            icon={showFull ? <EyeOutlined /> : <EyeOutlined />}
                            onClick={() => toggleKeyVisibility(key.id)}
                            style={{ padding: 0, height: 'auto' }}
                          />
                          <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopyPrefix(key.key_prefix)}
                            style={{ padding: 0, height: 'auto' }}
                          />
                        </Space>
                      </div>
                      {key.description && (
                        <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                          {key.description}
                        </Text>
                      )}
                      <Divider style={{ margin: '8px 0' }} />
                      <Row gutter={8}>
                        <Col span={12}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Usage:</Text>
                          <br />
                          <Badge count={key.usage_count || 0} showZero style={{ backgroundColor: usage.color }} />
                          <Tag color={usage.color} style={{ marginLeft: 4, fontSize: 11 }}>{usage.label}</Tag>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Rate Limit:</Text>
                          <br />
                          <Tag color="blue" style={{ fontSize: 11 }}>{key.rate_limit} req/min</Tag>
                        </Col>
                      </Row>
                      {key.last_used_at && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 11 }}>Last Used:</Text>
                          <br />
                          <Text style={{ fontSize: 11 }}>
                            {dayjs(key.last_used_at).format('YYYY-MM-DD HH:mm')}
                          </Text>
                        </div>
                      )}
                      {key.expires_at && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 11 }}>Expires:</Text>
                          <br />
                          <Text style={{ fontSize: 11 }}>
                            {dayjs(key.expires_at).format('YYYY-MM-DD')}
                          </Text>
                        </div>
                      )}
                    </Space>
                  }
                />
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  }, [filteredKeys, showMaskedKeys, getKeyStatus, getUsageLevel, formatKeyPrefix, toggleKeyVisibility, handleCopyPrefix, handleViewDetails, handleViewUsage, handleViewLogs, handleEdit, handleClone, handleRegenerate, handleRevoke, handleDelete]);

  // ==================== LIST VIEW ====================
  
  const renderListView = useCallback(() => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Loading API keys...</Text>
          </div>
        </div>
      );
    }

    if (filteredKeys.length === 0) {
      const hasFilters = searchText || statusFilter !== 'all' || usageFilter !== 'all' || permissionFilter !== 'all' || dateRangeFilter;
      return (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          imageStyle={{ height: 120 }}
          description={
            <Space direction="vertical" size="small">
              <Text strong style={{ fontSize: 16 }}>
                {hasFilters ? 'No API keys match your filters' : 'No API keys found'}
              </Text>
              <Text type="secondary" style={{ fontSize: 14 }}>
                {hasFilters 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by creating your first API key'
                }
              </Text>
            </Space>
          }
          style={{ padding: '60px 20px' }}
        >
          {hasFilters ? (
            <Button 
              type="primary" 
              onClick={() => {
                setSearchText('');
                setStatusFilter('all');
                setUsageFilter('all');
                setPermissionFilter('all');
                setDateRangeFilter(null);
              }}
            >
              Clear Filters
            </Button>
          ) : (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Create API Key
            </Button>
          )}
        </Empty>
      );
    }

    return (
      <List
        dataSource={filteredKeys}
        loading={loading}
        renderItem={(key) => {
          const status = getKeyStatus(key);
          const usage = getUsageLevel(key.usage_count || 0);
          const showFull = showMaskedKeys[key.id];
          
          return (
            <List.Item
              actions={[
                <Button key="view" type="text" icon={<EyeOutlined />} onClick={() => handleViewDetails(key)} />,
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => handleEdit(key)} />,
                <Dropdown
                  key="more"
                  overlay={
                    <Menu>
                      <Menu.Item key="clone" icon={<CopyOutlined />} onClick={() => handleClone(key)}>
                        Clone
                      </Menu.Item>
                      <Menu.Item key="regenerate" icon={<SyncOutlined />} onClick={() => handleRegenerate(key)}>
                        Regenerate
                      </Menu.Item>
                      {status.status === 'active' && (
                        <Menu.Item key="revoke" icon={<StopOutlined />} onClick={() => handleRevoke(key)}>
                          Revoke
                        </Menu.Item>
                      )}
                      <Menu.Divider />
                      <Menu.Item 
                        key="delete" 
                        icon={<DeleteOutlined />} 
                        danger
                        onClick={() => handleDelete(key.id)}
                      >
                        Delete
                      </Menu.Item>
                    </Menu>
                  }
                  trigger={['click']}
                >
                  <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar 
                    icon={<KeyOutlined />}
                    style={{ 
                      background: status.status === 'active' ? '#10b981' : status.status === 'expired' ? '#ef4444' : '#6b7280',
                      color: '#ffffff'
                    }}
                  />
                }
                title={
                  <Space>
                    <Text strong>{key.name}</Text>
                    <Tag color={status.color} icon={status.icon}>{status.label}</Tag>
                    <Tag color={usage.color}>{usage.label} Usage</Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4}>
                    <Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>Key:</Text>
                      <Text code style={{ fontSize: 11 }}>{formatKeyPrefix(key.key_prefix, showFull)}</Text>
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => toggleKeyVisibility(key.id)}
                        style={{ padding: 0 }}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyPrefix(key.key_prefix)}
                        style={{ padding: 0 }}
                      />
                    </Space>
                    {key.description && (
                      <Text type="secondary" style={{ fontSize: 12 }}>{key.description}</Text>
                    )}
                    <Space split={<Divider type="vertical" />}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Usage: <Badge count={key.usage_count || 0} showZero style={{ backgroundColor: usage.color }} />
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Rate: {key.rate_limit} req/min
                      </Text>
                      {key.last_used_at && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Last: {dayjs(key.last_used_at).format('YYYY-MM-DD')}
                        </Text>
                      )}
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          );
        }}
      />
    );
  }, [filteredKeys, loading, showMaskedKeys, getKeyStatus, getUsageLevel, formatKeyPrefix, toggleKeyVisibility, handleCopyPrefix, handleViewDetails, handleEdit, handleClone, handleRegenerate, handleRevoke, handleDelete]);

  // ==================== RENDER KEYS LIST ====================
  
  const renderKeysList = useCallback(() => (
    <div>
      {/* Filter Bar */}
      {renderFilterBar()}
      
      {/* Bulk Actions Bar */}
      {renderBulkActionsBar()}

      {/* View Content */}
      {viewMode === 'table' && (
        <Table
          columns={columns}
          dataSource={filteredKeys}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} API keys`,
            style: { marginTop: 24 }
          }}
          className="api-keys-table"
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                imageStyle={{ height: 100 }}
                description={
                  <Space direction="vertical" size="small">
                    <Text strong>
                      {searchText || statusFilter !== 'all' || usageFilter !== 'all' || permissionFilter !== 'all' || dateRangeFilter
                        ? 'No API keys match your filters'
                        : 'No API keys found'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {searchText || statusFilter !== 'all' || usageFilter !== 'all' || permissionFilter !== 'all' || dateRangeFilter
                        ? 'Try adjusting your search or filter criteria'
                        : 'Get started by creating your first API key'}
                    </Text>
                  </Space>
                }
              >
                {(searchText || statusFilter !== 'all' || usageFilter !== 'all' || permissionFilter !== 'all' || dateRangeFilter) ? (
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={() => {
                      setSearchText('');
                      setStatusFilter('all');
                      setUsageFilter('all');
                      setPermissionFilter('all');
                      setDateRangeFilter(null);
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleCreate}>
                    Create API Key
                  </Button>
                )}
              </Empty>
            )
          }}
        />
      )}
      
      {viewMode === 'card' && (
        <div>
          {renderCardView()}
          {!loading && filteredKeys.length > 0 && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Pagination
                current={1}
                pageSize={12}
                total={filteredKeys.length}
                showSizeChanger
                showTotal={(total) => `Total ${total} API keys`}
              />
            </div>
          )}
        </div>
      )}
      
      {viewMode === 'list' && renderListView()}
    </div>
  ), [renderFilterBar, renderBulkActionsBar, viewMode, columns, filteredKeys, loading, renderCardView, renderListView]);

  return (
    <div className="api-management">
      {/* Modern Header with Gradient */}
      <div className="api-management-header">
        <Row justify="space-between" align="middle" className="api-management-header-content">
          <Col>
            <div className="api-management-title">
              <ApiOutlined />
              <span>API Management</span>
            </div>
            <div className="api-management-subtitle">
              Manage API keys for external access
            </div>
          </Col>
          <Col className="api-management-actions">
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
      </div>

      <Card style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}>

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
        width={600}
        className="api-create-modal"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSubmit}
        >
          {/* Name - Required */}
          <Form.Item
            name="name"
            label={
              <Space>
                <Text strong>* Name</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>(Required)</Text>
              </Space>
            }
            rules={[{ required: true, message: 'Please enter API key name' }]}
          >
            <Input 
              placeholder="e.g., Production API Key, Development Key, etc." 
              prefix={<KeyOutlined />}
              size="large"
            />
          </Form.Item>

          {/* Rate Limit & Expiration Date */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="rate_limit"
                label={
                  <Space>
                    <Text strong>* Rate Limit</Text>
                    <Tooltip title="Maximum number of requests per minute">
                      <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 12 }} />
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
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expires_at"
                label={
                  <Space>
                    <Text strong>Expiration Date</Text>
                    <Tooltip title="Set expiration date for this API key">
                      <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                    </Tooltip>
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Space>
                    <Switch
                      checked={noExpiration}
                      onChange={(checked) => {
                        setNoExpiration(checked);
                        if (checked) {
                          form.setFieldsValue({ expires_at: null });
                        }
                      }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      No expiration
                    </Text>
                  </Space>
                  <DatePicker
                    style={{ width: '100%' }}
                    showTime
                    format="YYYY-MM-DD HH:mm"
                    placeholder="Select expiration date"
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                    disabled={noExpiration}
                    size="large"
                    value={noExpiration ? null : form.getFieldValue('expires_at')}
                    onChange={(date) => {
                      form.setFieldsValue({ expires_at: date });
                      if (date) {
                        setNoExpiration(false);
                      }
                    }}
                  />
                </Space>
              </Form.Item>
            </Col>
          </Row>

          {/* Permissions - Optional */}
          <Form.Item
            name="permissions"
            label={
              <Space>
                <Text strong>Permissions</Text>
                <Tooltip title="Select specific endpoints this API key can access. Leave empty to allow access to all endpoints.">
                  <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                </Tooltip>
              </Space>
            }
          >
            <Select
              mode="multiple"
              placeholder="Select endpoints (leave empty for all endpoints)"
              options={availableEndpoints}
              showSearch
              size="large"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={<Empty description="No endpoints found" />}
            />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: -16, marginBottom: 16 }}>
            💡 Leave empty to allow access to all endpoints
          </Text>

          {/* IP Whitelist - Optional */}
          <Form.Item
            name="ip_whitelist"
            label={
              <Space>
                <Text strong>IP Whitelist</Text>
                <Tooltip title="One IP address or CIDR per line. Leave empty to allow all IP addresses.">
                  <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                </Tooltip>
              </Space>
            }
          >
            <TextArea 
              rows={4} 
              placeholder="192.168.1.100&#10;10.0.0.50&#10;203.0.113.0/24"
              size="large"
            />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: -16, marginBottom: 16 }}>
            💡 One IP address or CIDR per line. Leave empty to allow all IPs.
          </Text>

          {/* Security Notice */}
          <Alert
            message="Security Notice"
            description="After creation, the API key will be shown only once. Make sure to save it securely!"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {/* Form Actions */}
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                onClick={() => {
                  setIsCreateModalVisible(false);
                  form.resetFields();
                }}
                size="large"
              >
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
      </Modal>

      {/* New API Key Display Modal */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#10b981', fontSize: 24 }} />
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
        className="api-new-key-modal"
        styles={{
          content: {
            borderRadius: '16px',
            overflow: 'hidden'
          }
        }}
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
        className="api-edit-modal"
        styles={{
          content: {
            borderRadius: '16px',
            overflow: 'hidden'
          }
        }}
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
        title={
          <Space>
            <KeyOutlined />
            <span>API Key Details</span>
          </Space>
        }
        placement="right"
        width={600}
        open={isDetailsDrawerVisible}
        onClose={() => {
          setIsDetailsDrawerVisible(false);
          setSelectedKey(null);
        }}
        className="api-details-drawer"
        extra={
          selectedKey && (
            <Space>
              <Button icon={<EditOutlined />} onClick={() => {
                handleEdit(selectedKey);
                setIsDetailsDrawerVisible(false);
              }}>
                Edit
              </Button>
              <Button icon={<CopyOutlined />} onClick={() => handleClone(selectedKey)}>
                Clone
              </Button>
            </Space>
          )
        }
        styles={{
          body: {
            padding: '24px'
          }
        }}
      >
        {selectedKey && (
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: (
                  <span>
                    <InfoCircleOutlined />
                    Basic Info
                  </span>
                ),
                children: (
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <Card size="small" title="Key Information">
                      <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Name">
                          <Text strong>{selectedKey.name}</Text>
                        </Descriptions.Item>
            <Descriptions.Item label="Key Prefix">
                          <Space>
                            <Text code style={{ fontFamily: 'monospace' }}>
                              {showMaskedKeys[selectedKey.id] ? selectedKey.key_prefix : formatKeyPrefix(selectedKey.key_prefix)}
                            </Text>
                            <Button
                              type="text"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => toggleKeyVisibility(selectedKey.id)}
                            />
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => handleCopyPrefix(selectedKey.key_prefix)}
                            />
                          </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
                          {(() => {
                            const status = getKeyStatus(selectedKey);
                            return <Tag color={status.color} icon={status.icon}>{status.label}</Tag>;
                          })()}
                        </Descriptions.Item>
                        {selectedKey.description && (
                          <Descriptions.Item label="Description">
                            <Text>{selectedKey.description}</Text>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </Card>

                    <Card size="small" title="Usage Statistics">
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic
                            title="Total Requests"
                            value={selectedKey.usage_count || 0}
                            prefix={<ThunderboltOutlined />}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Rate Limit"
                            value={selectedKey.rate_limit}
                            suffix="req/min"
                            prefix={<ApiOutlined />}
                          />
                        </Col>
                      </Row>
                      <Divider style={{ margin: '16px 0' }} />
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Last Used">
                          {selectedKey.last_used_at ? (
                            <Space direction="vertical" size={0}>
                              <Text>{dayjs(selectedKey.last_used_at).format('YYYY-MM-DD HH:mm:ss')}</Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {dayjs().diff(dayjs(selectedKey.last_used_at), 'day')} days ago
                              </Text>
                            </Space>
                          ) : (
                            <Text type="secondary" style={{ fontStyle: 'italic' }}>Never</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {dayjs(selectedKey.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="Expires At">
                          {selectedKey.expires_at ? (
                            <Space direction="vertical" size={0}>
                              <Text>{dayjs(selectedKey.expires_at).format('YYYY-MM-DD HH:mm:ss')}</Text>
                              {dayjs(selectedKey.expires_at).isBefore(dayjs()) ? (
                                <Text type="danger" style={{ fontSize: 11 }}>Expired</Text>
                              ) : dayjs(selectedKey.expires_at).diff(dayjs(), 'day') <= 30 && (
                                <Text type="warning" style={{ fontSize: 11 }}>
                                  {dayjs(selectedKey.expires_at).diff(dayjs(), 'day')} days left
                                </Text>
                              )}
                            </Space>
                          ) : (
                            <Text type="secondary">Never</Text>
                          )}
            </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Space>
                )
              },
              {
                key: 'security',
                label: (
                  <span>
                    <SecurityScanOutlined />
                    Security
                  </span>
                ),
                children: (
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <Card size="small" title="Permissions">
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {selectedKey.permissions && selectedKey.permissions.length > 0 ? (
                          <>
                            <Alert
                              message="Restricted Access"
                              description="This key has limited permissions to specific endpoints."
                              type="info"
                              showIcon
                              style={{ marginBottom: 16 }}
                            />
                            <List
                              size="small"
                              dataSource={selectedKey.permissions}
                              renderItem={(perm) => (
                                <List.Item>
                                  <Space>
                                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                    <Text code style={{ fontSize: 12 }}>{perm}</Text>
                </Space>
                                </List.Item>
                              )}
                            />
                          </>
                        ) : (
                          <Alert
                            message="Full Access"
                            description="This key has access to all API endpoints."
                            type="success"
                            showIcon
                          />
                        )}
                      </Space>
                    </Card>

                    <Card size="small" title="IP Whitelist">
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {selectedKey.ip_whitelist && selectedKey.ip_whitelist.length > 0 ? (
                          <>
                            <Alert
                              message="IP Restriction Enabled"
                              description="This key can only be used from whitelisted IP addresses."
                              type="warning"
                              showIcon
                              style={{ marginBottom: 16 }}
                            />
                            <List
                              size="small"
                              dataSource={selectedKey.ip_whitelist}
                              renderItem={(ip) => (
                                <List.Item>
                                  <Space>
                                    <GlobalOutlined style={{ color: '#1890ff' }} />
                                    <Text code style={{ fontSize: 12 }}>{ip}</Text>
                </Space>
                                </List.Item>
                              )}
                            />
                          </>
                        ) : (
                          <Alert
                            message="No IP Restrictions"
                            description="This key can be used from any IP address."
                            type="info"
                            showIcon
                          />
                        )}
                      </Space>
                    </Card>

                    <Card size="small" title="Rate Limiting">
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Row gutter={16}>
                          <Col span={24}>
                            <Statistic
                              title="Current Rate Limit"
                              value={selectedKey.rate_limit}
                              suffix="requests per minute"
                              prefix={<ThunderboltOutlined />}
                            />
                          </Col>
                        </Row>
                        <Divider style={{ margin: '12px 0' }} />
                        <Alert
                          message="Rate Limit Information"
                          description={
                            <Space direction="vertical" size={4}>
                              <Text style={{ fontSize: 12 }}>
                                • Maximum {selectedKey.rate_limit} requests per minute
                              </Text>
                              <Text style={{ fontSize: 12 }}>
                                • Exceeding the limit will result in HTTP 429 (Too Many Requests)
                              </Text>
                              <Text style={{ fontSize: 12 }}>
                                • Rate limit resets every minute
                              </Text>
                            </Space>
                          }
                          type="info"
                          showIcon
                        />
                      </Space>
                    </Card>
                  </Space>
                )
              },
              {
                key: 'activity',
                label: (
                  <span>
                    <HistoryOutlined />
                    Activity Log
                  </span>
                ),
                children: (
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <Card size="small" title="Recent Activity">
                      <Timeline
                        items={[
                          {
                            color: 'green',
                            children: (
                              <Space direction="vertical" size={2}>
                                <Text strong>Key Created</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {dayjs(selectedKey.created_at).format('YYYY-MM-DD HH:mm:ss')}
                                </Text>
                                <Text style={{ fontSize: 12 }}>
                                  Created by: {selectedKey.created_by || 'System'}
                                </Text>
                              </Space>
                            )
                          },
                          selectedKey.last_used_at && {
                            color: 'blue',
                            children: (
                              <Space direction="vertical" size={2}>
                                <Text strong>Last Used</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {dayjs(selectedKey.last_used_at).format('YYYY-MM-DD HH:mm:ss')}
                                </Text>
                                <Text style={{ fontSize: 12 }}>
                                  {selectedKey.usage_count || 0} total requests
                                </Text>
                              </Space>
                            )
                          },
                          selectedKey.expires_at && {
                            color: dayjs(selectedKey.expires_at).isBefore(dayjs()) ? 'red' : 'orange',
                            children: (
                              <Space direction="vertical" size={2}>
                                <Text strong>
                                  {dayjs(selectedKey.expires_at).isBefore(dayjs()) ? 'Expired' : 'Expires'}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {dayjs(selectedKey.expires_at).format('YYYY-MM-DD HH:mm:ss')}
                                </Text>
                                {!dayjs(selectedKey.expires_at).isBefore(dayjs()) && (
                                  <Text style={{ fontSize: 12 }}>
                                    {dayjs(selectedKey.expires_at).diff(dayjs(), 'day')} days remaining
                                  </Text>
                                )}
                              </Space>
                            )
                          },
                          !selectedKey.is_active && {
                            color: 'gray',
                            children: (
                              <Space direction="vertical" size={2}>
                                <Text strong>Deactivated</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Key is currently inactive
                                </Text>
                              </Space>
                            )
                          }
                        ].filter(Boolean)}
                      />
                    </Card>

                    <Card size="small" title="Quick Actions">
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Button
                          icon={<SyncOutlined />}
                          block
                          onClick={() => {
                            Modal.confirm({
                              title: 'Regenerate API Key',
                              content: 'This will create a new key and delete the current one. Are you sure?',
                              onOk: () => handleRegenerate(selectedKey)
                            });
                          }}
                        >
                          Regenerate Key
                        </Button>
                        {selectedKey.is_active ? (
                          <Button
                            icon={<StopOutlined />}
                            block
                            danger
                            onClick={() => {
                              Modal.confirm({
                                title: 'Revoke API Key',
                                content: 'This will deactivate the key. Are you sure?',
                                onOk: () => handleRevoke(selectedKey)
                              });
                            }}
                          >
                            Revoke Key
                          </Button>
                        ) : (
                          <Button
                            icon={<CheckOutlined />}
                            block
                            type="primary"
                            onClick={async () => {
                              try {
                                await apiKeyService.updateApiKey(selectedKey.id, { is_active: true });
                                fetchApiKeys();
                                notifySuccess('API Key activated');
                                setIsDetailsDrawerVisible(false);
                              } catch (error) {
                                notifyError('Failed to activate key', error.message);
                              }
                            }}
                          >
                            Activate Key
                          </Button>
                        )}
                        <Button
                          icon={<BarChartOutlined />}
                          block
                          onClick={() => {
                            handleViewUsage(selectedKey);
                            setIsDetailsDrawerVisible(false);
                          }}
                        >
                          View Usage Statistics
                        </Button>
                        <Button
                          icon={<HistoryOutlined />}
                          block
                          onClick={() => {
                            handleViewLogs(selectedKey);
                            setIsDetailsDrawerVisible(false);
                          }}
                        >
                          View Request Logs
                        </Button>
                      </Space>
                    </Card>
                  </Space>
                )
              }
            ]}
          />
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
        className="api-usage-drawer"
        styles={{
          body: {
            padding: '24px'
          }
        }}
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
        className="api-logs-drawer"
        styles={{
          body: {
            padding: '24px'
          }
        }}
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

