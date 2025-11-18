import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Tag,
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
  Switch,
  Tooltip,
  Divider,
  Alert,
  Tabs,
  Empty,
  Descriptions,
  Badge,
  Select,
  Collapse,
  Checkbox,
  DatePicker,
  App
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  KeyOutlined,
  BarChartOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ApiOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  MailOutlined,
  ExportOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
  DownloadOutlined,
  FilterOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import config from '../config';
import './ApiManagement.css';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ApiManagement = () => {
  const { getAuthHeaders } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const { message } = App.useApp();
  
  // States
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [newKeyVisible, setNewKeyVisible] = useState({});
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [apiEndpoints, setApiEndpoints] = useState([]);
  const [endpointsLoading, setEndpointsLoading] = useState(false);
  const [endpointFilter, setEndpointFilter] = useState({ method: null, tag: null, search: '' });
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [isEndpointModalVisible, setIsEndpointModalVisible] = useState(false);
  const [availableScopes, setAvailableScopes] = useState([]);
  const [scopesLoading, setScopesLoading] = useState(false);
  const [activeTokens, setActiveTokens] = useState([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [activityLogLoading, setActivityLogLoading] = useState(false);
  const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
  const [selectedKeyForEmail, setSelectedKeyForEmail] = useState(null);
  const [emailForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Helper function to safely make API calls
  const safeApiCall = async (apiCall) => {
    try {
      const response = await apiCall();
      if (response.status === 401) {
        const error = new Error('Unauthorized');
        error.response = { status: 401, data: response.data };
        error.__suppressed = true;
        throw error;
      }
      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        error.__suppressed = true;
      }
      throw error;
    }
  };

  // Fetch API keys
  const fetchApiKeys = useCallback(async () => {
    setLoading(true);
    try {
      const response = await safeApiCall(() => 
        axios.get(`${config.apiUrl}/api/api-keys/`, {
          headers: getAuthHeaders()
        })
      );
      setApiKeys(response.data);
    } catch (error) {
      if (error.response?.status !== 401 && error.code !== 'ERR_NETWORK') {
        console.error('Error fetching API keys:', error);
        notifyError('เกิดข้อผิดพลาด', error.response?.data?.detail || 'ไม่สามารถโหลด API keys ได้');
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, notifyError]);

  // Fetch statistics
  const fetchStats = useCallback(async (days = 7) => {
    setStatsLoading(true);
    try {
      const response = await safeApiCall(() =>
        axios.get(`${config.apiUrl}/api/api-usage/stats?days=${days}`, {
          headers: getAuthHeaders()
        })
      );
      setStats(response.data);
    } catch (error) {
      if (error.response?.status >= 500) {
        console.warn('Error fetching stats:', error);
      }
    } finally {
      setStatsLoading(false);
    }
  }, [getAuthHeaders]);

  // Fetch API endpoints
  const fetchApiEndpoints = useCallback(async () => {
    setEndpointsLoading(true);
    try {
      const response = await safeApiCall(() =>
        axios.get(`${config.apiUrl}/api/api-endpoints/`, {
          headers: getAuthHeaders()
        })
      );
      setApiEndpoints(response.data);
    } catch (error) {
      if (error.response?.status !== 401 && error.code !== 'ERR_NETWORK') {
        console.error('Error fetching API endpoints:', error);
        notifyError('เกิดข้อผิดพลาด', error.response?.data?.detail || 'ไม่สามารถโหลด API endpoints ได้');
      }
    } finally {
      setEndpointsLoading(false);
    }
  }, [getAuthHeaders, notifyError]);

  // Fetch available scopes
  const fetchScopes = useCallback(async () => {
    setScopesLoading(true);
    try {
      const response = await safeApiCall(() =>
        axios.get(`${config.apiUrl}/api/api-keys/scopes`, {
          headers: getAuthHeaders()
        })
      );
      setAvailableScopes(response.data.scopes || []);
    } catch (error) {
      if (error.response?.status !== 401 && error.code !== 'ERR_NETWORK') {
        console.error('Error fetching scopes:', error);
        notifyError('เกิดข้อผิดพลาด', error.response?.data?.detail || 'ไม่สามารถโหลด scopes ได้');
      }
    } finally {
      setScopesLoading(false);
    }
  }, [getAuthHeaders, notifyError]);

  // Fetch active tokens
  const fetchActiveTokens = useCallback(async () => {
    setTokensLoading(true);
    try {
      const response = await safeApiCall(() =>
        axios.get(`${config.apiUrl}/api/auth/tokens`, {
          headers: getAuthHeaders()
        })
      );
      setActiveTokens(response.data.tokens || []);
    } catch (error) {
      if (error.response?.status !== 401 && 
          error.response?.status !== 404 && 
          error.code !== 'ERR_NETWORK') {
        console.error('Error fetching active tokens:', error);
        notifyError('เกิดข้อผิดพลาด', error.response?.data?.detail || 'ไม่สามารถโหลด active tokens ได้');
      }
    } finally {
      setTokensLoading(false);
    }
  }, [getAuthHeaders, notifyError]);

  // Fetch activity log
  const fetchActivityLog = useCallback(async () => {
    setActivityLogLoading(true);
    try {
      const response = await safeApiCall(() =>
        axios.get(`${config.apiUrl}/api/api-keys/activity-log`, {
          headers: getAuthHeaders(),
          params: { limit: 100, offset: 0 }
        })
      );
      setActivityLog(response.data.activities || []);
    } catch (error) {
      if (error.response?.status !== 401 && error.code !== 'ERR_NETWORK') {
        console.error('Error fetching activity log:', error);
        notifyError('เกิดข้อผิดพลาด', error.response?.data?.detail || 'ไม่สามารถโหลด activity log ได้');
      }
    } finally {
      setActivityLogLoading(false);
    }
  }, [getAuthHeaders, notifyError]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchApiKeys();
      fetchStats();
      fetchApiEndpoints();
      fetchScopes();
      fetchActiveTokens();
      fetchActivityLog();
    }
  }, [fetchApiKeys, fetchStats, fetchApiEndpoints, fetchScopes, fetchActiveTokens, fetchActivityLog]);

  // Create API key
  const handleCreate = async (values) => {
    try {
      const submitValues = { ...values };
      if (submitValues.expires_at) {
        submitValues.expires_at = submitValues.expires_at.format('YYYY-MM-DD HH:mm:ss');
      }
      // Clean up smtp_config - remove empty/null values
      if (submitValues.smtp_config) {
        const smtpConfig = {};
        Object.keys(submitValues.smtp_config).forEach(key => {
          if (submitValues.smtp_config[key] !== null && submitValues.smtp_config[key] !== undefined && submitValues.smtp_config[key] !== '') {
            smtpConfig[key] = submitValues.smtp_config[key];
          }
        });
        if (Object.keys(smtpConfig).length > 0) {
          submitValues.smtp_config = smtpConfig;
        } else {
          delete submitValues.smtp_config;
        }
      }
      const response = await axios.post(`${config.apiUrl}/api/api-keys/`, submitValues, {
        headers: getAuthHeaders()
      });
      
      setNewKeyVisible({ [response.data.id]: true });
      setApiKeys([response.data, ...apiKeys]);
      setIsCreateModalVisible(false);
      createForm.resetFields();
      
      notifySuccess('สร้าง API Key สำเร็จ', `API Key "${values.name}" ถูกสร้างเรียบร้อยแล้ว`);
    } catch (error) {
      console.error('Error creating API key:', error);
      notifyError('เกิดข้อผิดพลาด', error.response?.data?.detail || 'ไม่สามารถสร้าง API key ได้');
    }
  };

  // Update API key
  const handleUpdate = async (keyId, values) => {
    try {
      const response = await axios.put(`${config.apiUrl}/api/api-keys/${keyId}`, values, {
        headers: getAuthHeaders()
      });
      
      setApiKeys(apiKeys.map(key => key.id === keyId ? response.data : key));
      setIsEditModalVisible(false);
      setEditingKey(null);
      editForm.resetFields();
      
      notifySuccess('อัพเดทสำเร็จ', `API Key "${values.name || editingKey?.name}" ถูกอัพเดทเรียบร้อยแล้ว`);
      fetchApiKeys();
    } catch (error) {
      console.error('Error updating API key:', error);
      notifyError('เกิดข้อผิดพลาด', error.response?.data?.detail || 'ไม่สามารถอัพเดท API key ได้');
    }
  };

  // Delete API key
  const handleDelete = async (keyId) => {
    try {
      await axios.delete(`${config.apiUrl}/api/api-keys/${keyId}`, {
        headers: getAuthHeaders()
      });
      
      setApiKeys(apiKeys.filter(key => key.id !== keyId));
      notifySuccess('ลบสำเร็จ', 'API Key ถูกลบเรียบร้อยแล้ว');
      fetchActivityLog();
    } catch (error) {
      console.error('Error deleting API key:', error);
      notifyError('เกิดข้อผิดพลาด', error.response?.data?.detail || 'ไม่สามารถลบ API key ได้');
    }
  };

  // Regenerate API key
  const handleRegenerate = async (keyId) => {
    try {
      const response = await axios.post(`${config.apiUrl}/api/api-keys/${keyId}/regenerate`, {}, {
        headers: getAuthHeaders()
      });
      
      setNewKeyVisible({ [keyId]: true });
      setApiKeys(apiKeys.map(key => key.id === keyId ? { ...key, ...response.data } : key));
      
      notifySuccess('Regenerate สำเร็จ', 'API Key ใหม่ถูกสร้างเรียบร้อยแล้ว');
      fetchActivityLog();
    } catch (error) {
      console.error('Error regenerating API key:', error);
      notifyError('เกิดข้อผิดพลาด', error.response?.data?.detail || 'ไม่สามารถ regenerate API key ได้');
    }
  };

  // Toggle active status
  const handleToggleActive = async (keyId, currentStatus) => {
    try {
      await handleUpdate(keyId, { is_active: !currentStatus });
      fetchActivityLog();
    } catch (error) {
      console.error('Error toggling active status:', error);
    }
  };

  // Send email
  const handleSendEmail = async (values) => {
    if (!selectedKeyForEmail) return;
    
    try {
      await axios.post(`${config.apiUrl}/api/api-keys/${selectedKeyForEmail.id}/send-email`, {
        emails: values.emails.split(',').map(e => e.trim()).filter(e => e),
        message: values.message
      }, {
        headers: getAuthHeaders()
      });
      
      setIsEmailModalVisible(false);
      emailForm.resetFields();
      setSelectedKeyForEmail(null);
      notifySuccess('ส่งอีเมลสำเร็จ', 'อีเมลถูกส่งเรียบร้อยแล้ว');
      fetchActivityLog();
    } catch (error) {
      console.error('Error sending email:', error);
      notifyError('เกิดข้อผิดพลาด', error.response?.data?.detail || 'ไม่สามารถส่งอีเมลได้');
    }
  };

  // Send to self email
  const handleSendToSelf = async (keyId, email) => {
    try {
      await axios.post(`${config.apiUrl}/api/api-keys/${keyId}/send-to-self`, {
        user_email: email,
        message: null
      }, {
        headers: getAuthHeaders()
      });
      
      notifySuccess('ส่งอีเมลสำเร็จ', 'API Key ถูกส่งไปยังอีเมลของคุณแล้ว');
      fetchActivityLog();
    } catch (error) {
      console.error('Error sending to self email:', error);
      notifyError('เกิดข้อผิดพลาด', error.response?.data?.detail || 'ไม่สามารถส่งอีเมลได้');
    }
  };

  // Revoke token
  const handleRevokeToken = async (tokenHash) => {
    try {
      await axios.post(`${config.apiUrl}/api/auth/tokens/revoke`, {
        token_hash: tokenHash
      }, {
        headers: getAuthHeaders()
      });
      
      await fetchActiveTokens();
      notifySuccess('Revoke สำเร็จ', 'Token ถูกลบเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error revoking token:', error);
      notifyError('เกิดข้อผิดพลาด', error.response?.data?.detail || 'ไม่สามารถ revoke token ได้');
    }
  };

  // Revoke all tokens
  const handleRevokeAllTokens = async () => {
    try {
      await axios.post(`${config.apiUrl}/api/auth/tokens/revoke-all`, {}, {
        headers: getAuthHeaders()
      });
      
      await fetchActiveTokens();
      notifySuccess('Revoke All สำเร็จ', 'ทุก tokens ถูกลบเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error revoking all tokens:', error);
      notifyError('เกิดข้อผิดพลาด', 'ไม่สามารถ revoke all tokens ได้');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    message.success('คัดลอกแล้ว');
  };

  // Filter API keys
  const filteredApiKeys = apiKeys.filter(key => {
    if (searchText && !key.name.toLowerCase().includes(searchText.toLowerCase()) && 
        !key.description?.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !key.is_active) return false;
      if (statusFilter === 'inactive' && key.is_active) return false;
    }
    return true;
  });

  // Table columns for API Keys
  const apiKeyColumns = [
    {
      title: 'ชื่อ',
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
      title: 'คำอธิบาย',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || <Text type="secondary">-</Text>
    },
    {
      title: 'สร้างโดย',
      dataIndex: 'created_by',
      key: 'created_by'
    },
    {
      title: 'วันที่สร้าง',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => text ? new Date(text).toLocaleString('th-TH') : <Text type="secondary">-</Text>
    },
    {
      title: 'หมดอายุ',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (text) => {
        if (!text) return <Text type="secondary">ไม่หมดอายุ</Text>;
        const expiresAt = new Date(text);
        const now = new Date();
        const isExpired = expiresAt < now;
        const isExpiringSoon = expiresAt > now && expiresAt < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return (
          <Text type={isExpired ? "danger" : isExpiringSoon ? "warning" : "secondary"}>
            {expiresAt.toLocaleString('th-TH')}
          </Text>
        );
      }
    },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions) => (
        <Space wrap>
          {permissions && permissions.length > 0 ? (
            permissions.map(perm => (
              <Tag key={perm} color="blue">{perm}</Tag>
            ))
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Space>
      )
    },
    {
      title: 'Rate Limit',
      key: 'rate_limit',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.rate_limit_per_minute} req/min
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.rate_limit_per_hour} req/hour
          </Text>
        </Space>
      )
    },
    {
      title: 'สถานะ',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive, record) => (
        <Switch 
          checked={isActive} 
          checkedChildren="Active" 
          unCheckedChildren="Inactive"
          onChange={() => handleToggleActive(record.id, isActive)}
        />
      )
    },
    {
      title: 'ใช้งานล่าสุด',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (text) => text ? new Date(text).toLocaleString('th-TH') : <Text type="secondary">ยังไม่เคยใช้</Text>
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="แก้ไข">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingKey(record);
                const formValues = {
                  ...record,
                  expires_at: record.expires_at ? dayjs(record.expires_at) : null
                };
                editForm.setFieldsValue(formValues);
                setIsEditModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="ส่งอีเมลแชร์">
            <Button
              type="link"
              icon={<MailOutlined />}
              onClick={() => {
                setSelectedKeyForEmail(record);
                setIsEmailModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Regenerate">
            <Popconfirm
              title="คุณแน่ใจหรือไม่ที่จะ regenerate API key นี้?"
              description="API key เก่าจะไม่สามารถใช้งานได้อีก"
              onConfirm={() => handleRegenerate(record.id)}
              okText="ใช่"
              cancelText="ไม่"
            >
              <Button type="link" icon={<ReloadOutlined />} />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="ลบ">
            <Popconfirm
              title="คุณแน่ใจหรือไม่ที่จะลบ API key นี้?"
              onConfirm={() => handleDelete(record.id)}
              okText="ใช่"
              cancelText="ไม่"
            >
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="api-management">
      <Title level={2}>
        <ApiOutlined /> API Management
      </Title>

      <Tabs 
        defaultActiveKey="keys"
        items={[
          {
            key: 'keys',
            label: <span><KeyOutlined /> API Keys</span>,
            children: (
              <Card
                title="API Keys"
                extra={
                  <Space>
                    <Input
                      placeholder="ค้นหา..."
                      prefix={<SearchOutlined />}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: 200 }}
                      allowClear
                    />
                    <Select
                      placeholder="สถานะ"
                      value={statusFilter}
                      onChange={setStatusFilter}
                      style={{ width: 120 }}
                    >
                      <Option value="all">ทั้งหมด</Option>
                      <Option value="active">Active</Option>
                      <Option value="inactive">Inactive</Option>
                    </Select>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setIsCreateModalVisible(true)}
                    >
                      สร้าง API Key
                    </Button>
                  </Space>
                }
              >
                <Table
                  columns={apiKeyColumns}
                  dataSource={filteredApiKeys}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  locale={{
                    emptyText: (
                      <Empty
                        description="ยังไม่มี API Keys"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )
                  }}
                />
              </Card>
            )
          },
          {
            key: 'stats',
            label: <span><BarChartOutlined /> Statistics</span>,
            children: (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="Total Requests"
                        value={stats?.total_requests || 0}
                        prefix={<ApiOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="Unique Keys"
                        value={stats?.unique_keys || 0}
                        prefix={<KeyOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="Success Rate"
                        value={stats?.total_requests > 0 
                          ? ((stats.success_count / stats.total_requests) * 100).toFixed(1)
                          : 0}
                        suffix="%"
                        prefix={<CheckCircleOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="Avg Response Time"
                        value={stats?.avg_response_time || 0}
                        suffix="ms"
                        prefix={<BarChartOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} lg={12}>
                    <Card title="Top Endpoints" loading={statsLoading}>
                      {stats?.top_endpoints && stats.top_endpoints.length > 0 ? (
                        <Table
                          dataSource={stats.top_endpoints}
                          rowKey={(record) => `${record.endpoint}-${record.method}`}
                          pagination={false}
                          size="small"
                          columns={[
                            { title: 'Endpoint', dataIndex: 'endpoint', key: 'endpoint' },
                            { title: 'Method', dataIndex: 'method', key: 'method' },
                            { title: 'Count', dataIndex: 'count', key: 'count' },
                            { title: 'Avg Time', dataIndex: 'avg_response_time', key: 'avg_response_time', render: (v) => `${v} ms` }
                          ]}
                        />
                      ) : (
                        <Empty description="ไม่มีข้อมูล" />
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card title="Daily Usage" loading={statsLoading}>
                      {stats?.daily_stats && stats.daily_stats.length > 0 ? (
                        <Table
                          dataSource={stats.daily_stats}
                          rowKey="date"
                          pagination={false}
                          size="small"
                          columns={[
                            { title: 'Date', dataIndex: 'date', key: 'date' },
                            { title: 'Requests', dataIndex: 'count', key: 'count' }
                          ]}
                        />
                      ) : (
                        <Empty description="ไม่มีข้อมูล" />
                      )}
                    </Card>
                  </Col>
                </Row>
              </>
            )
          },
          {
            key: 'endpoints',
            label: <span><ApiOutlined /> API Endpoints</span>,
            children: (
              <Card
                title="API Endpoints"
                extra={
                  <Space>
                    <Input
                      placeholder="ค้นหา endpoint..."
                      prefix={<SearchOutlined />}
                      value={endpointFilter.search}
                      onChange={(e) => setEndpointFilter({ ...endpointFilter, search: e.target.value })}
                      style={{ width: 200 }}
                    />
                    <Select
                      placeholder="Filter by Method"
                      allowClear
                      style={{ width: 150 }}
                      value={endpointFilter.method}
                      onChange={(value) => setEndpointFilter({ ...endpointFilter, method: value })}
                    >
                      <Option value="GET">GET</Option>
                      <Option value="POST">POST</Option>
                      <Option value="PUT">PUT</Option>
                      <Option value="DELETE">DELETE</Option>
                      <Option value="PATCH">PATCH</Option>
                    </Select>
                    <Select
                      placeholder="Filter by Tag"
                      allowClear
                      style={{ width: 150 }}
                      value={endpointFilter.tag}
                      onChange={(value) => setEndpointFilter({ ...endpointFilter, tag: value })}
                    >
                      {Array.from(new Set(apiEndpoints.flatMap(ep => ep.tags || []))).map(tag => (
                        <Option key={tag} value={tag}>{tag}</Option>
                      ))}
                    </Select>
                  </Space>
                }
              >
                <Table
                  dataSource={apiEndpoints.filter(ep => {
                    if (endpointFilter.method && !ep.methods?.includes(endpointFilter.method)) return false;
                    if (endpointFilter.tag && !ep.tags?.includes(endpointFilter.tag)) return false;
                    if (endpointFilter.search) {
                      const search = endpointFilter.search.toLowerCase();
                      return ep.path?.toLowerCase().includes(search) || 
                             ep.summary?.toLowerCase().includes(search) ||
                             ep.description?.toLowerCase().includes(search);
                    }
                    return true;
                  })}
                  rowKey={(record) => `${record.path}-${record.methods?.join('-') || 'unknown'}`}
                  loading={endpointsLoading}
                  pagination={{ pageSize: 20 }}
                  columns={[
                    {
                      title: 'Method',
                      key: 'methods',
                      width: 100,
                      render: (_, record) => (
                        <Space>
                          {record.methods?.map(method => {
                            const colors = {
                              'GET': 'blue',
                              'POST': 'green',
                              'PUT': 'orange',
                              'DELETE': 'red',
                              'PATCH': 'purple'
                            };
                            return (
                              <Tag key={method} color={colors[method] || 'default'}>
                                {method}
                              </Tag>
                            );
                          })}
                        </Space>
                      )
                    },
                    {
                      title: 'Path',
                      dataIndex: 'path',
                      key: 'path',
                      render: (text) => <Text code>{text}</Text>
                    },
                    {
                      title: 'Description',
                      key: 'description',
                      render: (_, record) => (
                        <Text type="secondary">
                          {record.summary || record.description || '-'}
                        </Text>
                      )
                    },
                    {
                      title: 'Tags',
                      dataIndex: 'tags',
                      key: 'tags',
                      render: (tags) => (
                        <Space>
                          {tags?.map(tag => (
                            <Tag key={tag}>{tag}</Tag>
                          ))}
                        </Space>
                      )
                    },
                    {
                      title: 'Auth',
                      key: 'requires_auth',
                      width: 80,
                      render: (_, record) => (
                        record.requires_auth ? (
                          <Tag color="orange">Required</Tag>
                        ) : (
                          <Tag color="green">Public</Tag>
                        )
                      )
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      width: 120,
                      render: (_, record) => (
                        <Space>
                          <Tooltip title="ดูรายละเอียด">
                            <Button
                              type="link"
                              icon={<InfoCircleOutlined />}
                              onClick={() => {
                                setSelectedEndpoint(record);
                                setIsEndpointModalVisible(true);
                              }}
                            />
                          </Tooltip>
                          <Tooltip title="คัดลอก Path">
                            <Button
                              type="link"
                              icon={<CopyOutlined />}
                              onClick={() => copyToClipboard(record.path)}
                            />
                          </Tooltip>
                        </Space>
                      )
                    }
                  ]}
                />
              </Card>
            )
          },
          {
            key: 'tokens',
            label: <span><SafetyCertificateOutlined /> JWT Tokens</span>,
            children: (
              <Card
                title="Active JWT Tokens"
                extra={
                  <Popconfirm
                    title="คุณแน่ใจหรือไม่ที่จะ revoke ทุก tokens?"
                    description="คุณจะต้อง login ใหม่หลังจาก revoke"
                    onConfirm={handleRevokeAllTokens}
                    okText="ใช่"
                    cancelText="ไม่"
                  >
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                    >
                      Revoke All My Tokens
                    </Button>
                  </Popconfirm>
                }
              >
                <Table
                  dataSource={activeTokens}
                  rowKey="full_token_hash"
                  loading={tokensLoading}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    {
                      title: 'Token Hash',
                      dataIndex: 'token_hash',
                      key: 'token_hash',
                      render: (text) => <Text code style={{ fontSize: '12px' }}>{text}</Text>
                    },
                    {
                      title: 'สร้างเมื่อ',
                      dataIndex: 'created_at',
                      key: 'created_at',
                      render: (text) => text ? new Date(text).toLocaleString('th-TH') : <Text type="secondary">-</Text>
                    },
                    {
                      title: 'หมดอายุเมื่อ',
                      dataIndex: 'expires_at',
                      key: 'expires_at',
                      render: (text) => {
                        if (!text) return <Text type="secondary">-</Text>;
                        const expiresAt = new Date(text);
                        const now = new Date();
                        const isExpired = expiresAt < now;
                        const timeRemaining = Math.floor((expiresAt - now) / 1000 / 60);
                        return (
                          <Space direction="vertical" size="small">
                            <Text type={isExpired ? "danger" : "secondary"}>
                              {expiresAt.toLocaleString('th-TH')}
                            </Text>
                            {!isExpired && (
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                เหลือ {timeRemaining} นาที
                              </Text>
                            )}
                          </Space>
                        );
                      }
                    },
                    {
                      title: 'ใช้งานล่าสุด',
                      dataIndex: 'last_used_at',
                      key: 'last_used_at',
                      render: (text) => text ? new Date(text).toLocaleString('th-TH') : <Text type="secondary">ยังไม่เคยใช้</Text>
                    },
                    {
                      title: 'IP Address',
                      dataIndex: 'ip_address',
                      key: 'ip_address',
                      render: (text) => text || <Text type="secondary">-</Text>
                    },
                    {
                      title: 'สถานะ',
                      dataIndex: 'is_active',
                      key: 'is_active',
                      render: (isActive) => (
                        <Tag color={isActive ? 'green' : 'red'}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Tag>
                      )
                    },
                    {
                      title: 'จัดการ',
                      key: 'actions',
                      width: 120,
                      render: (_, record) => (
                        <Popconfirm
                          title="คุณแน่ใจหรือไม่ที่จะ revoke token นี้?"
                          description="Token นี้จะไม่สามารถใช้งานได้อีก"
                          onConfirm={() => handleRevokeToken(record.full_token_hash)}
                          okText="ใช่"
                          cancelText="ไม่"
                        >
                          <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            disabled={!record.is_active}
                          >
                            Revoke
                          </Button>
                        </Popconfirm>
                      )
                    }
                  ]}
                  locale={{
                    emptyText: (
                      <Empty
                        description="ยังไม่มี Active Tokens"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )
                  }}
                />
              </Card>
            )
          },
          {
            key: 'activity',
            label: <span><HistoryOutlined /> Activity Log</span>,
            children: (
              <Card title="Activity Log">
                <Table
                  dataSource={activityLog}
                  rowKey="id"
                  loading={activityLogLoading}
                  pagination={{ pageSize: 20 }}
                  columns={[
                    {
                      title: 'Timestamp',
                      dataIndex: 'timestamp',
                      key: 'timestamp',
                      render: (text) => text ? new Date(text).toLocaleString('th-TH') : <Text type="secondary">-</Text>
                    },
                    {
                      title: 'Action Type',
                      dataIndex: 'action_type',
                      key: 'action_type',
                      render: (text) => <Tag color="blue">{text}</Tag>
                    },
                    {
                      title: 'API Key Name',
                      dataIndex: 'api_key_name',
                      key: 'api_key_name',
                      render: (text) => text || <Text type="secondary">-</Text>
                    },
                    {
                      title: 'User',
                      dataIndex: 'user',
                      key: 'user'
                    },
                    {
                      title: 'Details',
                      dataIndex: 'details',
                      key: 'details',
                      render: (text) => text || <Text type="secondary">-</Text>
                    },
                    {
                      title: 'IP Address',
                      dataIndex: 'ip_address',
                      key: 'ip_address',
                      render: (text) => text || <Text type="secondary">-</Text>
                    }
                  ]}
                  locale={{
                    emptyText: (
                      <Empty
                        description="ยังไม่มี Activity Log"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )
                  }}
                />
              </Card>
            )
          }
        ]}
      />

      {/* Create Modal */}
      <Modal
        title="สร้าง API Key"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label="ชื่อ"
            rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}
          >
            <Input placeholder="เช่น Production API Key" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="คำอธิบาย"
          >
            <TextArea rows={3} placeholder="อธิบายการใช้งาน API key นี้" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="rate_limit_per_minute"
                label="Rate Limit (ต่อนาที)"
                initialValue={60}
                rules={[{ required: true, message: 'กรุณากรอก rate limit' }]}
              >
                <InputNumber min={1} max={10000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="rate_limit_per_hour"
                label="Rate Limit (ต่อชั่วโมง)"
                initialValue={1000}
                rules={[{ required: true, message: 'กรุณากรอก rate limit' }]}
              >
                <InputNumber min={1} max={100000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="expires_at"
            label="วันหมดอายุ (Optional)"
          >
            <DatePicker 
              showTime 
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
              placeholder="เลือกวันหมดอายุ (เว้นว่าง = ไม่หมดอายุ)"
            />
          </Form.Item>
          
          <Form.Item
            name="permissions"
            label="Permissions"
            tooltip="เลือกสิทธิ์ที่ API Key นี้สามารถใช้งานได้"
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Row gutter={[16, 8]}>
                {availableScopes.map(scope => (
                  <Col span={12} key={scope.name}>
                    <Checkbox value={scope.name}>
                      <Space>
                        <Text strong>{scope.label}</Text>
                        <Tooltip title={scope.description}>
                          <InfoCircleOutlined style={{ color: '#1890ff' }} />
                        </Tooltip>
                      </Space>
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: -16 }}>
              หากไม่เลือก จะใช้ค่าเริ่มต้น (read-only access)
            </Text>
          </Form.Item>

          <Form.Item
            name="send_email"
            valuePropName="checked"
          >
            <Checkbox>ส่งอีเมลแจ้งเตือนเมื่อสร้าง</Checkbox>
          </Form.Item>

          <Form.Item
            name="user_email"
            label="อีเมล (ถ้าต้องการส่งอีเมล)"
            rules={[{ type: 'email', message: 'กรุณากรอกอีเมลที่ถูกต้อง' }]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.send_email !== currentValues.send_email}
          >
            {({ getFieldValue }) =>
              getFieldValue('send_email') ? (
                <Collapse
                  ghost
                  items={[
                    {
                      key: 'smtp',
                      label: <Text type="secondary" style={{ fontSize: '12px' }}>⚙️ ตั้งค่า SMTP (Optional - ใช้ค่าเริ่มต้นถ้าไม่ระบุ)</Text>,
                      children: (
                        <div>
                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item
                                name={['smtp_config', 'smtp_host']}
                                label="SMTP Host"
                              >
                                <Input placeholder="smtp.gmail.com" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                name={['smtp_config', 'smtp_port']}
                                label="SMTP Port"
                              >
                                <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="587" />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item
                                name={['smtp_config', 'smtp_username']}
                                label="SMTP Username"
                              >
                                <Input placeholder="your-email@gmail.com" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                name={['smtp_config', 'smtp_password']}
                                label="SMTP Password"
                              >
                                <Input.Password placeholder="your-password" />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item
                                name={['smtp_config', 'from_email']}
                                label="From Email"
                              >
                                <Input placeholder="noreply@example.com" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                name={['smtp_config', 'from_name']}
                                label="From Name"
                              >
                                <Input placeholder="API Management" />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Form.Item
                            name={['smtp_config', 'smtp_use_tls']}
                            valuePropName="checked"
                            initialValue={true}
                          >
                            <Checkbox>ใช้ TLS/SSL</Checkbox>
                          </Form.Item>
                          <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                            💡 หากไม่กรอก จะใช้ SMTP settings จากระบบ (backend/.env)
                          </Text>
                        </div>
                      )
                    }
                  ]}
                />
              ) : null
            }
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                สร้าง
              </Button>
              <Button onClick={() => {
                setIsCreateModalVisible(false);
                createForm.resetFields();
              }}>
                ยกเลิก
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="แก้ไข API Key"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setEditingKey(null);
          editForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        {editingKey && (
          <Form
            form={editForm}
            layout="vertical"
            initialValues={{
              ...editingKey,
              expires_at: editingKey.expires_at ? dayjs(editingKey.expires_at) : null
            }}
            onFinish={(values) => {
              const submitValues = { ...values };
              if (submitValues.expires_at) {
                submitValues.expires_at = submitValues.expires_at.format('YYYY-MM-DD HH:mm:ss');
              } else {
                submitValues.expires_at = null;
              }
              handleUpdate(editingKey.id, submitValues);
            }}
          >
            <Form.Item
              name="name"
              label="ชื่อ"
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
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="rate_limit_per_minute"
                  label="Rate Limit (ต่อนาที)"
                  rules={[{ required: true, message: 'กรุณากรอก rate limit' }]}
                >
                  <InputNumber min={1} max={10000} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="rate_limit_per_hour"
                  label="Rate Limit (ต่อชั่วโมง)"
                  rules={[{ required: true, message: 'กรุณากรอก rate limit' }]}
                >
                  <InputNumber min={1} max={100000} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="expires_at"
              label="วันหมดอายุ"
            >
              <DatePicker 
                showTime 
                format="YYYY-MM-DD HH:mm:ss"
                style={{ width: '100%' }}
                placeholder="เลือกวันหมดอายุ (เว้นว่าง = ไม่หมดอายุ)"
              />
            </Form.Item>
            
            <Form.Item
              name="is_active"
              label="สถานะ"
              valuePropName="checked"
            >
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
            
            <Form.Item
              name="permissions"
              label="Permissions"
              tooltip="เลือกสิทธิ์ที่ API Key นี้สามารถใช้งานได้"
            >
              <Checkbox.Group style={{ width: '100%' }}>
                <Row gutter={[16, 8]}>
                  {availableScopes.map(scope => (
                    <Col span={12} key={scope.name}>
                      <Checkbox value={scope.name}>
                        <Space>
                          <Text strong>{scope.label}</Text>
                          <Tooltip title={scope.description}>
                            <InfoCircleOutlined style={{ color: '#1890ff' }} />
                          </Tooltip>
                        </Space>
                      </Checkbox>
                    </Col>
                  ))}
                </Row>
              </Checkbox.Group>
            </Form.Item>
            <Form.Item>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: -16 }}>
                หากไม่เลือก จะใช้ค่าเริ่มต้น (read-only access)
              </Text>
            </Form.Item>
            
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  บันทึก
                </Button>
                <Button onClick={() => {
                  setIsEditModalVisible(false);
                  setEditingKey(null);
                  editForm.resetFields();
                }}>
                  ยกเลิก
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* New Key Display Modal */}
      {Object.keys(newKeyVisible).map(keyId => {
        const key = apiKeys.find(k => k.id === keyId);
        if (!key || !newKeyVisible[keyId]) return null;
        
        return (
          <Modal
            key={keyId}
            title="API Key ใหม่"
            open={newKeyVisible[keyId]}
            onCancel={() => setNewKeyVisible({ ...newKeyVisible, [keyId]: false })}
            footer={[
              <Button
                key="email"
                icon={<MailOutlined />}
                onClick={() => {
                  const userEmail = prompt('กรุณากรอกอีเมลของคุณ:', '');
                  if (userEmail) {
                    handleSendToSelf(keyId, userEmail);
                  }
                }}
              >
                ส่งอีเมลให้ตัวเอง
              </Button>,
              <Button
                key="copy"
                type="primary"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(key.api_key)}
              >
                คัดลอก
              </Button>,
              <Button
                key="close"
                onClick={() => setNewKeyVisible({ ...newKeyVisible, [keyId]: false })}
              >
                ปิด
              </Button>
            ]}
          >
            <Alert
              message="บันทึก API Key นี้ไว้ให้ดี!"
              description="API Key นี้จะแสดงเพียงครั้งเดียวเท่านั้น"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Input
              value={key.api_key}
              readOnly
              addonAfter={
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(key.api_key)}
                >
                  คัดลอก
                </Button>
              }
            />
          </Modal>
        );
      })}

      {/* Email Share Modal */}
      <Modal
        title="ส่งอีเมลแชร์ API Key"
        open={isEmailModalVisible}
        onCancel={() => {
          setIsEmailModalVisible(false);
          emailForm.resetFields();
          setSelectedKeyForEmail(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={emailForm}
          layout="vertical"
          onFinish={handleSendEmail}
        >
          <Alert
            message="คำเตือน"
            description="API Key จะไม่ถูกส่งไปในอีเมล แต่จะส่งข้อมูลเกี่ยวกับการใช้งานและ invitation link แทน"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Form.Item
            name="emails"
            label="อีเมลผู้รับ (หลายคนได้ คั่นด้วยเครื่องหมายจุลภาค)"
            rules={[
              { required: true, message: 'กรุณากรอกอีเมล' },
              { 
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const emails = value.split(',').map(e => e.trim()).filter(e => e);
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  const invalidEmails = emails.filter(e => !emailRegex.test(e));
                  if (invalidEmails.length > 0) {
                    return Promise.reject(new Error(`อีเมลไม่ถูกต้อง: ${invalidEmails.join(', ')}`));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <TextArea rows={3} placeholder="email1@example.com, email2@example.com" />
          </Form.Item>
          
          <Form.Item
            name="message"
            label="ข้อความ (Optional)"
          >
            <TextArea rows={4} placeholder="ข้อความเพิ่มเติม..." />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                ส่งอีเมล
              </Button>
              <Button onClick={() => {
                setIsEmailModalVisible(false);
                emailForm.resetFields();
                setSelectedKeyForEmail(null);
              }}>
                ยกเลิก
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Endpoint Detail Modal */}
      <Modal
        title="รายละเอียด API Endpoint"
        open={isEndpointModalVisible}
        onCancel={() => {
          setIsEndpointModalVisible(false);
          setSelectedEndpoint(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setIsEndpointModalVisible(false);
            setSelectedEndpoint(null);
          }}>
            ปิด
          </Button>
        ]}
        width={800}
      >
        {selectedEndpoint && (
          <div>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Path">
                <Text code>{selectedEndpoint.path}</Text>
                <Button
                  type="link"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(selectedEndpoint.path)}
                >
                  คัดลอก
                </Button>
              </Descriptions.Item>
              <Descriptions.Item label="Methods">
                <Space>
                  {selectedEndpoint.methods?.map(method => {
                    const colors = {
                      'GET': 'blue',
                      'POST': 'green',
                      'PUT': 'orange',
                      'DELETE': 'red',
                      'PATCH': 'purple'
                    };
                    return (
                      <Tag key={method} color={colors[method] || 'default'}>
                        {method}
                      </Tag>
                    );
                  })}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Tags">
                <Space>
                  {selectedEndpoint.tags?.map(tag => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Summary">
                {selectedEndpoint.summary || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {selectedEndpoint.description || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Authentication">
                {selectedEndpoint.requires_auth ? (
                  <Tag color="orange">Required</Tag>
                ) : (
                  <Tag color="green">Public</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>

            {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
              <>
                <Divider>Parameters</Divider>
                <Table
                  dataSource={selectedEndpoint.parameters}
                  rowKey={(record) => `${record.name}-${record.type}`}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Name', dataIndex: 'name', key: 'name' },
                    { title: 'Type', dataIndex: 'type', key: 'type' },
                    { 
                      title: 'Required', 
                      dataIndex: 'required', 
                      key: 'required',
                      render: (required) => required ? <Tag color="red">Yes</Tag> : <Tag color="green">No</Tag>
                    }
                  ]}
                />
              </>
            )}

            <Divider>ตัวอย่างการใช้งาน</Divider>
            <Collapse
              items={[
                {
                  key: 'curl',
                  label: 'cURL',
                  children: (
                    <div>
                      <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
{`curl -X ${selectedEndpoint.methods?.[0] || 'GET'} "${config.apiUrl}${selectedEndpoint.path}" \\
  ${selectedEndpoint.requires_auth ? '-H "Authorization: Bearer YOUR_TOKEN" \\' : ''}
  ${selectedEndpoint.requires_auth ? '-H "X-API-Key: YOUR_API_KEY"' : ''}`}
                      </pre>
                      <Button
                        type="link"
                        icon={<CopyOutlined />}
                        onClick={() => {
                          const curlCmd = `curl -X ${selectedEndpoint.methods?.[0] || 'GET'} "${config.apiUrl}${selectedEndpoint.path}" ${selectedEndpoint.requires_auth ? '-H "Authorization: Bearer YOUR_TOKEN"' : ''}`;
                          copyToClipboard(curlCmd);
                        }}
                      >
                        คัดลอก
                      </Button>
                    </div>
                  )
                },
                {
                  key: 'python',
                  label: 'Python',
                  children: (
                    <div>
                      <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
{`import requests

url = "${config.apiUrl}${selectedEndpoint.path}"
headers = ${selectedEndpoint.requires_auth ? '{"Authorization": "Bearer YOUR_TOKEN"}' : '{}'}

response = requests.${selectedEndpoint.methods?.[0]?.toLowerCase() || 'get'}(url, headers=headers)
print(response.json())`}
                      </pre>
                      <Button
                        type="link"
                        icon={<CopyOutlined />}
                        onClick={() => {
                          const pythonCode = `import requests\n\nurl = "${config.apiUrl}${selectedEndpoint.path}"\nheaders = ${selectedEndpoint.requires_auth ? '{"Authorization": "Bearer YOUR_TOKEN"}' : '{}'}\n\nresponse = requests.${selectedEndpoint.methods?.[0]?.toLowerCase() || 'get'}(url, headers=headers)\nprint(response.json())`;
                          copyToClipboard(pythonCode);
                        }}
                      >
                        คัดลอก
                      </Button>
                    </div>
                  )
                },
                {
                  key: 'javascript',
                  label: 'JavaScript',
                  children: (
                    <div>
                      <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
{`fetch('${config.apiUrl}${selectedEndpoint.path}', {
  method: '${selectedEndpoint.methods?.[0] || 'GET'}',
  headers: ${selectedEndpoint.requires_auth ? '{\n    "Authorization": "Bearer YOUR_TOKEN"\n  }' : '{}'}
})
.then(res => res.json())
.then(data => console.log(data));`}
                      </pre>
                      <Button
                        type="link"
                        icon={<CopyOutlined />}
                        onClick={() => {
                          const jsCode = `fetch('${config.apiUrl}${selectedEndpoint.path}', {\n  method: '${selectedEndpoint.methods?.[0] || 'GET'}',\n  headers: ${selectedEndpoint.requires_auth ? '{\n    "Authorization": "Bearer YOUR_TOKEN"\n  }' : '{}'}\n})\n.then(res => res.json())\n.then(data => console.log(data));`;
                          copyToClipboard(jsCode);
                        }}
                      >
                        คัดลอก
                      </Button>
                    </div>
                  )
                }
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ApiManagement;

