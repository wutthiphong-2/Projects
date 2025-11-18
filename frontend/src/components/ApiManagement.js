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
  App,
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
  Checkbox
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  KeyOutlined,
  BarChartOutlined,
  BookOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ApiOutlined,
  SearchOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import config from '../config';
import './ApiManagement.css';

// Helper function to safely make API calls without logging 401 errors
// With axios.defaults.validateStatus, 401 will come as response, not error
const safeApiCall = async (apiCall) => {
  try {
    const response = await apiCall();
    // Check if response is 401 (due to validateStatus, it won't throw)
    if (response.status === 401) {
      // Create error object for consistent error handling
      const error = new Error('Unauthorized');
      error.response = { status: 401, data: response.data };
      error.__suppressed = true;
      throw error;
    }
    return response;
  } catch (error) {
    // Suppress 401 errors from console
    if (error.response?.status === 401) {
      error.__suppressed = true;
    }
    throw error;
  }
};

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

const ApiManagement = () => {
  const { getAuthHeaders } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const { message } = App.useApp();
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
      // Only log and notify if it's not a 401 (unauthorized) or network error
      if (error.response?.status !== 401 && error.code !== 'ERR_NETWORK') {
        console.error('Error fetching API keys:', {
          status: error.response?.status,
          message: error.response?.data?.detail || error.message,
          url: error.config?.url
        });
        notifyError('เกิดข้อผิดพลาด', error.response?.data?.detail || 'ไม่สามารถโหลด API keys ได้');
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, notifyError]);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await safeApiCall(() =>
        axios.get(`${config.apiUrl}/api/api-usage/stats?days=7`, {
          headers: getAuthHeaders()
        })
      );
      setStats(response.data);
    } catch (error) {
      // Silently fail for stats - not critical
      // Only log if it's a server error (5xx), not 401/404
      if (error.response?.status >= 500) {
        console.warn('Error fetching stats:', {
          status: error.response?.status,
          message: error.response?.data?.detail || error.message
        });
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
      // Only log and notify if it's not a 401 (unauthorized) or network error
      if (error.response?.status !== 401 && error.code !== 'ERR_NETWORK') {
        console.error('Error fetching API endpoints:', {
          status: error.response?.status,
          message: error.response?.data?.detail || error.message,
          url: error.config?.url
        });
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
      // Only log and notify if it's not a 401 (unauthorized) or network error
      if (error.response?.status !== 401 && error.code !== 'ERR_NETWORK') {
        console.error('Error fetching scopes:', {
          status: error.response?.status,
          message: error.response?.data?.detail || error.message,
          url: error.config?.url
        });
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
      // Don't log or show error if it's 401 (unauthorized) or 404 (endpoint not found yet) or network error
      if (error.response?.status !== 401 && 
          error.response?.status !== 404 && 
          error.code !== 'ERR_NETWORK') {
        console.error('Error fetching active tokens:', {
          status: error.response?.status,
          message: error.response?.data?.detail || error.message,
          url: error.config?.url
        });
        notifyError('เกิดข้อผิดพลาด', error.response?.data?.detail || 'ไม่สามารถโหลด active tokens ได้');
      }
    } finally {
      setTokensLoading(false);
    }
  }, [getAuthHeaders, notifyError]);

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

  useEffect(() => {
    // Only fetch data if user is authenticated
    const token = localStorage.getItem('token');
    if (token) {
      fetchApiKeys();
      fetchStats();
      fetchApiEndpoints();
      fetchScopes();
      fetchActiveTokens();
    }
  }, [fetchApiKeys, fetchStats, fetchApiEndpoints, fetchScopes, fetchActiveTokens]);

  // Create API key
  const handleCreate = async (values) => {
    try {
      const response = await axios.post(`${config.apiUrl}/api/api-keys/`, values, {
        headers: getAuthHeaders()
      });
      
      setNewKeyVisible({ [response.data.id]: true });
      setApiKeys([response.data, ...apiKeys]);
      setIsCreateModalVisible(false);
      createForm.resetFields();
      
      notifySuccess('สร้าง API Key สำเร็จ', `API Key "${values.name}" ถูกสร้างเรียบร้อยแล้ว`);
    } catch (error) {
      console.error('Error creating API key:', error);
      notifyError('เกิดข้อผิดพลาด', 'ไม่สามารถสร้าง API key ได้');
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
    } catch (error) {
      console.error('Error updating API key:', error);
      notifyError('เกิดข้อผิดพลาด', 'ไม่สามารถอัพเดท API key ได้');
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
    } catch (error) {
      console.error('Error deleting API key:', error);
      notifyError('เกิดข้อผิดพลาด', 'ไม่สามารถลบ API key ได้');
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
    } catch (error) {
      console.error('Error regenerating API key:', error);
      notifyError('เกิดข้อผิดพลาด', 'ไม่สามารถ regenerate API key ได้');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    message.success('คัดลอกแล้ว');
  };

  // Table columns
  const columns = [
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
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
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
      render: (_, record) => (
        <Space>
          <Tooltip title="แก้ไข">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingKey(record);
                editForm.setFieldsValue(record);
                setIsEditModalVisible(true);
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
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsCreateModalVisible(true)}
                  >
                    สร้าง API Key
                  </Button>
                }
              >
                <Table
                  columns={columns}
                  dataSource={apiKeys}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  locale={{
                    emptyText: (
                      <Empty
                        description={
                          <div>
                            <Text type="secondary" style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                              ยังไม่มี API Keys
                            </Text>
                            <Text type="secondary" style={{ fontSize: 14 }}>
                              คลิกปุ่ม "สร้าง API Key" เพื่อสร้าง API Key ใหม่
                            </Text>
                          </div>
                        }
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
                          onClick={() => {
                            copyToClipboard(record.path);
                          }}
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
            label: <span><KeyOutlined /> Active Tokens</span>,
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
                        description={
                          <div>
                            <Text type="secondary" style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                              ยังไม่มี Active Tokens
                            </Text>
                            <Text type="secondary" style={{ fontSize: 14 }}>
                              Tokens จะแสดงที่นี่เมื่อคุณ login
                            </Text>
                          </div>
                        }
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )
                  }}
                />
              </Card>
            )
          },
          {
            key: 'docs',
            label: <span><BookOutlined /> Documentation</span>,
            children: (
              <Card title="API Documentation">
            <Alert
              message="Swagger UI"
              description={
                <div>
                  <p>ดู API Documentation ที่ Swagger UI:</p>
                  <Button
                    type="primary"
                    icon={<BookOutlined />}
                    href={`${config.apiUrl}/docs`}
                    target="_blank"
                  >
                    เปิด Swagger UI
                  </Button>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Divider>ตัวอย่างการใช้งาน</Divider>
            
            <Descriptions title="cURL" bordered column={1}>
              <Descriptions.Item label="Login">
                <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
{`curl -X POST "${config.apiUrl}/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"pass"}'`}
                </pre>
              </Descriptions.Item>
              <Descriptions.Item label="ใช้ API Key">
                <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
{`curl -X GET "${config.apiUrl}/api/users/" \\
  -H "X-API-Key: YOUR_API_KEY"`}
                </pre>
              </Descriptions.Item>
            </Descriptions>
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
        width={600}
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
          
          <Form.Item
            name="rate_limit_per_minute"
            label="Rate Limit (ต่อนาที)"
            initialValue={60}
            rules={[{ required: true, message: 'กรุณากรอก rate limit' }]}
          >
            <InputNumber min={1} max={10000} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="rate_limit_per_hour"
            label="Rate Limit (ต่อชั่วโมง)"
            initialValue={1000}
            rules={[{ required: true, message: 'กรุณากรอก rate limit' }]}
          >
            <InputNumber min={1} max={100000} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="permissions"
            label="Permissions"
            tooltip="เลือกสิทธิ์ที่ API Key นี้สามารถใช้งานได้"
            rules={[{ required: false }]}
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
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 8 }}>
              หากไม่เลือก จะใช้ค่าเริ่มต้น (read-only access)
            </Text>
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
        width={600}
      >
        {editingKey && (
          <Form
            form={editForm}
            layout="vertical"
            onFinish={(values) => handleUpdate(editingKey.id, values)}
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
            
            <Form.Item
              name="rate_limit_per_minute"
              label="Rate Limit (ต่อนาที)"
              rules={[{ required: true, message: 'กรุณากรอก rate limit' }]}
            >
              <InputNumber min={1} max={10000} style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item
              name="rate_limit_per_hour"
              label="Rate Limit (ต่อชั่วโมง)"
              rules={[{ required: true, message: 'กรุณากรอก rate limit' }]}
            >
              <InputNumber min={1} max={100000} style={{ width: '100%' }} />
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
            <Collapse>
              <Panel header="cURL" key="curl">
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
              </Panel>
              <Panel header="Python" key="python">
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
              </Panel>
              <Panel header="JavaScript" key="javascript">
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
              </Panel>
            </Collapse>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ApiManagement;

