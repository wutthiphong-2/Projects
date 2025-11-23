import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  Spin,
  Tabs,
  Tag,
  Row,
  Col,
  message,
  Collapse,
  Descriptions
} from 'antd';
import {
  PlayCircleOutlined,
  ClearOutlined,
  CopyOutlined,
  CheckOutlined,
  SaveOutlined,
  DeleteOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import { apiKeyService } from '../../services/apiKeyService';
import './APIManagement.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const APITester = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [savedRequests, setSavedRequests] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const authType = Form.useWatch('authType', form);

  // Available endpoints
  const endpoints = [
    { value: 'GET:/api/users', label: 'GET /api/users', method: 'GET', endpoint: '/api/users', description: 'Get list of users' },
    { value: 'POST:/api/users', label: 'POST /api/users', method: 'POST', endpoint: '/api/users', description: 'Create a new user' },
    { value: 'GET:/api/users/{dn}', label: 'GET /api/users/{dn}', method: 'GET', endpoint: '/api/users/{dn}', description: 'Get user by DN' },
    { value: 'PUT:/api/users/{dn}', label: 'PUT /api/users/{dn}', method: 'PUT', endpoint: '/api/users/{dn}', description: 'Update user' },
    { value: 'DELETE:/api/users/{dn}', label: 'DELETE /api/users/{dn}', method: 'DELETE', endpoint: '/api/users/{dn}', description: 'Delete user' },
    { value: 'GET:/api/groups', label: 'GET /api/groups', method: 'GET', endpoint: '/api/groups', description: 'Get list of groups' },
    { value: 'POST:/api/groups', label: 'POST /api/groups', method: 'POST', endpoint: '/api/groups', description: 'Create a new group' },
    { value: 'GET:/api/ous', label: 'GET /api/ous', method: 'GET', endpoint: '/api/ous', description: 'Get list of OUs' },
    { value: 'POST:/api/ous', label: 'POST /api/ous', method: 'POST', endpoint: '/api/ous', description: 'Create a new OU' },
    { value: 'GET:/api/activity-logs', label: 'GET /api/activity-logs', method: 'GET', endpoint: '/api/activity-logs', description: 'Get activity logs' },
    { value: 'GET:/api/api-keys', label: 'GET /api/api-keys', method: 'GET', endpoint: '/api/api-keys', description: 'Get list of API keys' },
    { value: 'POST:/api/api-keys', label: 'POST /api/api-keys', method: 'POST', endpoint: '/api/api-keys', description: 'Create a new API key' }
  ];

  // Fetch API keys
  useEffect(() => {
    const fetchAPIKeys = async () => {
      try {
        const keys = await apiKeyService.getAPIKeys();
        setApiKeys(keys || []);
      } catch (error) {
        console.error('Error fetching API keys:', error);
      }
    };
    fetchAPIKeys();
  }, []);

  // Load saved requests from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('api_tester_saved_requests');
    if (saved) {
      try {
        setSavedRequests(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading saved requests:', e);
      }
    }
  }, []);

  // Get base URL
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      const apiUrl = localStorage.getItem('API_URL') || 
                    window.__API_URL__ || 
                    process.env.REACT_APP_API_URL ||
                    'http://localhost:8000';
      return apiUrl;
    }
    return 'http://localhost:8000';
  };

  // Handle endpoint change
  const handleEndpointChange = (value) => {
    const endpoint = endpoints.find(e => e.value === value);
    if (endpoint) {
      form.setFieldsValue({ 
        method: endpoint.method,
        endpoint: endpoint.endpoint
      });
    }
  };

  // Execute request
  const handleExecute = async (values) => {
    setLoading(true);
    setResponse(null);
    setResponseTime(null);

    try {
      const baseUrl = getBaseUrl();
      const endpointPath = values.endpoint || '';
      const url = endpointPath.includes('{dn}') 
        ? `${baseUrl}${endpointPath.replace('{dn}', values.pathParam || '')}`
        : `${baseUrl}${endpointPath}`;

      const headers = {
        'Content-Type': 'application/json'
      };

      // Add API key or JWT token
      if (values.authType === 'api_key' && values.apiKey) {
        headers['Authorization'] = `Bearer ${values.apiKey}`;
      } else {
        // Use JWT token from localStorage
        const token = localStorage.getItem('token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      // Parse custom headers
      if (values.customHeaders) {
        try {
          const custom = JSON.parse(values.customHeaders);
          Object.assign(headers, custom);
        } catch (e) {
          message.error('Invalid custom headers JSON');
          setLoading(false);
          return;
        }
      }

      const startTime = Date.now();
      let result;

      // Build query params for GET requests
      let queryParams = {};
      if (values.method === 'GET') {
        // If using new format (page and page_size as separate fields)
        if (values.page !== undefined || values.pageSize !== undefined) {
          if (values.page !== undefined && values.page !== null) {
            queryParams.page = values.page;
          }
          if (values.pageSize !== undefined && values.pageSize !== null) {
            queryParams.page_size = values.pageSize;
          }
        } else if (values.queryParams) {
          // Legacy format: JSON string
          try {
            queryParams = JSON.parse(values.queryParams);
          } catch (e) {
            message.error('Invalid query parameters JSON');
            setLoading(false);
            return;
          }
        }
      }

      // Execute request based on method
      switch (values.method) {
        case 'GET':
          result = await api.get(url, { headers, params: queryParams });
          break;
        case 'POST':
          result = await api.post(url, values.requestBody ? JSON.parse(values.requestBody) : {}, { headers });
          break;
        case 'PUT':
          result = await api.put(url, values.requestBody ? JSON.parse(values.requestBody) : {}, { headers });
          break;
        case 'PATCH':
          result = await api.patch(url, values.requestBody ? JSON.parse(values.requestBody) : {}, { headers });
          break;
        case 'DELETE':
          result = await api.delete(url, { headers });
          break;
        default:
          throw new Error('Unsupported method');
      }

      const endTime = Date.now();
      setResponseTime(endTime - startTime);
      setResponse({
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        data: result.data
      });
    } catch (error) {
      const endTime = Date.now();
      setResponseTime(endTime - Date.now());
      setResponse({
        status: error.response?.status || 'Error',
        statusText: error.response?.statusText || error.message,
        headers: error.response?.headers || {},
        data: error.response?.data || { error: error.message }
      });
    } finally {
      setLoading(false);
    }
  };

  // Save request
  const handleSave = () => {
    const values = form.getFieldsValue();
    const newRequest = {
      id: Date.now(),
      name: values.name || `${values.method} ${values.endpoint}`,
      ...values,
      timestamp: new Date().toISOString()
    };

    const updated = [...savedRequests, newRequest];
    setSavedRequests(updated);
    localStorage.setItem('api_tester_saved_requests', JSON.stringify(updated));
    message.success('บันทึกคำขอสำเร็จ!');
  };

  // Load saved request
  const handleLoad = (request) => {
    // Convert old format to new format if needed
    let endpointSelector = request.endpointSelector;
    let endpointPath = request.endpoint;
    
    if (request.method && request.endpoint && !request.endpoint.includes(':')) {
      // Old format: just endpoint path, need to combine with method
      endpointSelector = `${request.method}:${request.endpoint}`;
      endpointPath = request.endpoint;
    } else if (request.endpointSelector) {
      // New format: extract endpoint path from selector
      const endpoint = endpoints.find(e => e.value === request.endpointSelector);
      if (endpoint) {
        endpointPath = endpoint.endpoint;
      }
    }
    
    form.setFieldsValue({
      ...request,
      endpointSelector: endpointSelector || request.endpointSelector,
      endpoint: endpointPath || request.endpoint
    });
    message.success('โหลดคำขอสำเร็จ!');
  };

  // Delete saved request
  const handleDelete = (id) => {
    const updated = savedRequests.filter(r => r.id !== id);
    setSavedRequests(updated);
    localStorage.setItem('api_tester_saved_requests', JSON.stringify(updated));
    message.success('ลบคำขอสำเร็จ!');
  };

  // Copy response
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    message.success('คัดลอกแล้ว!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Clear form
  const handleClear = () => {
    form.resetFields();
    setResponse(null);
    setResponseTime(null);
  };

  return (
    <div className="api-tester">
      <Row gutter={24}>
        {/* Request Panel */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ApiOutlined style={{ fontSize: '18px', color: '#2563eb' }} />
                <span style={{ fontWeight: 600, fontSize: '16px' }}>API Request</span>
              </Space>
            }
            extra={
              <Space>
                <Button 
                  icon={<ClearOutlined />} 
                  onClick={handleClear}
                  style={{ borderRadius: '8px' }}
                >
                  Clear
                </Button>
                <Button 
                  icon={<SaveOutlined />} 
                  onClick={handleSave}
                  style={{ borderRadius: '8px' }}
                >
                  Save
                </Button>
              </Space>
            }
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleExecute}
              initialValues={{
                method: 'GET',
                authType: 'jwt',
                page: 1,
                pageSize: 10
              }}
            >
              <Form.Item
                name="name"
                label="ชื่อคำขอ (สำหรับบันทึก)"
              >
                <Input placeholder="เช่น: Get All Users" />
              </Form.Item>

              <Form.Item
                name="endpointSelector"
                label="Endpoint"
                rules={[{ required: true, message: 'กรุณาเลือก endpoint' }]}
              >
                <Select
                  placeholder="เลือก endpoint"
                  onChange={handleEndpointChange}
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
                  }
                >
                  {endpoints.map((ep, idx) => (
                    <Option key={`${ep.method}-${ep.endpoint}-${idx}`} value={ep.value} label={ep.label}>
                      <div>
                        <Tag color={ep.method === 'GET' ? 'blue' : ep.method === 'POST' ? 'green' : ep.method === 'PUT' ? 'orange' : ep.method === 'DELETE' ? 'red' : 'default'}>
                          {ep.method}
                        </Tag>
                        {ep.label}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                        {ep.description}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Hidden field to store actual endpoint path */}
              <Form.Item name="endpoint" hidden>
                <Input />
              </Form.Item>

              {form.getFieldValue('endpoint')?.includes('{dn}') && (
                <Form.Item
                  name="pathParam"
                  label="Path Parameter (แทน {dn})"
                  rules={[{ required: true, message: 'กรุณากรอก path parameter' }]}
                >
                  <Input placeholder="เช่น: CN=John Doe,CN=Users,DC=example,DC=com" />
                </Form.Item>
              )}

              <Form.Item
                name="method"
                label="HTTP Method"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="PUT">PUT</Option>
                  <Option value="PATCH">PATCH</Option>
                  <Option value="DELETE">DELETE</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="authType"
                label="Authentication"
              >
                <Select>
                  <Option value="jwt">JWT Token (จาก Login)</Option>
                  <Option value="api_key">API Key</Option>
                </Select>
              </Form.Item>

              {authType === 'api_key' && (
                <Form.Item
                  name="apiKey"
                  label="API Key"
                  rules={[{ required: true, message: 'กรุณากรอก API Key' }]}
                >
                  <Select
                    placeholder="เลือก API Key"
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.children || '').toLowerCase().includes(String(input || '').toLowerCase())
                    }
                  >
                    {apiKeys.length > 0 ? (
                      apiKeys.map(key => (
                        <Option key={key.id} value={key.key_prefix}>
                          {key.name} ({key.key_prefix}...)
                        </Option>
                      ))
                    ) : (
                      <Option disabled>ไม่มี API Key</Option>
                    )}
                  </Select>
                </Form.Item>
              )}

              {form.getFieldValue('method') === 'GET' && (
                <>
                  <Form.Item
                    name="page"
                    label="Page"
                    tooltip="หมายเลขหน้า (เริ่มจาก 1)"
                    initialValue={1}
                  >
                    <InputNumber
                      min={1}
                      style={{ width: '100%' }}
                      placeholder="1"
                    />
                  </Form.Item>
                <Form.Item
                    name="pageSize"
                    label="Page Size"
                    tooltip="จำนวนรายการต่อหน้า"
                    initialValue={10}
                >
                    <InputNumber
                      min={1}
                      max={50000}
                      style={{ width: '100%' }}
                      placeholder="10"
                    />
                </Form.Item>
                </>
              )}

              {(form.getFieldValue('method') === 'POST' || 
                form.getFieldValue('method') === 'PUT' || 
                form.getFieldValue('method') === 'PATCH') && (
                <Form.Item
                  name="requestBody"
                  label="Request Body (JSON)"
                  rules={[{ required: true, message: 'กรุณากรอก request body' }]}
                >
                  <TextArea rows={8} placeholder='{"cn": "John Doe", "sAMAccountName": "jdoe"}' />
                </Form.Item>
              )}

              <Form.Item
                name="customHeaders"
                label="Custom Headers (JSON)"
                tooltip="เช่น: {&quot;X-Custom-Header&quot;: &quot;value&quot;}"
              >
                <TextArea rows={3} placeholder='{"X-Custom-Header": "value"}' />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlayCircleOutlined />}
                  loading={loading}
                  block
                  size="large"
                >
                  Execute Request
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* Saved Requests */}
          {savedRequests.length > 0 && (
            <Card
              title={
                <span style={{ fontWeight: 600, fontSize: '16px' }}>Saved Requests</span>
              }
              style={{ marginTop: 24 }}
            >
              <Collapse
                items={savedRequests.map(request => ({
                  key: request.id,
                  label: (
                    <Space>
                      <Tag color={request.method === 'GET' ? 'blue' : request.method === 'POST' ? 'green' : 'orange'}>
                        {request.method}
                      </Tag>
                      <span>{request.name || `${request.method} ${request.endpoint}`}</span>
                    </Space>
                  ),
                  extra: (
                    <Space>
                      <Button
                        type="text"
                        size="small"
                        icon={<PlayCircleOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoad(request);
                          form.submit();
                        }}
                      />
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(request.id);
                        }}
                      />
                    </Space>
                  ),
                  children: (
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Endpoint">{request.endpoint}</Descriptions.Item>
                      <Descriptions.Item label="Method">{request.method}</Descriptions.Item>
                      <Descriptions.Item label="Saved">{new Date(request.timestamp).toLocaleString()}</Descriptions.Item>
                    </Descriptions>
                  )
                }))}
              />
            </Card>
          )}
        </Col>

        {/* Response Panel */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ApiOutlined style={{ fontSize: '18px', color: '#2563eb' }} />
                <span style={{ fontWeight: 600, fontSize: '16px' }}>Response</span>
                {responseTime && (
                  <Tag color="blue" icon={<ClockCircleOutlined />} style={{ borderRadius: '6px' }}>
                    {responseTime}ms
                  </Tag>
                )}
              </Space>
            }
            extra={
              response && (
                <Space>
                  {response.status >= 200 && response.status < 300 ? (
                    <Tag color="green" icon={<CheckCircleOutlined />}>
                      {response.status} {response.statusText}
                    </Tag>
                  ) : (
                    <Tag color="red" icon={<CloseCircleOutlined />}>
                      {response.status} {response.statusText}
                    </Tag>
                  )}
                </Space>
              )
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>กำลังส่งคำขอ...</div>
              </div>
            ) : response ? (
              <Tabs
                items={[
                  {
                    key: 'body',
                    label: 'Response Body',
                    children: (
                      <div style={{ position: 'relative' }}>
                        <pre style={{
                          background: '#1e1e1e',
                          color: '#d4d4d4',
                          padding: 16,
                          borderRadius: 4,
                          overflow: 'auto',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          maxHeight: '500px'
                        }}>
                          <code>{JSON.stringify(response.data, null, 2)}</code>
                        </pre>
                        <Button
                          type="text"
                          icon={copiedCode === 'body' ? <CheckOutlined /> : <CopyOutlined />}
                          onClick={() => handleCopy(JSON.stringify(response.data, null, 2), 'body')}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            color: '#fff'
                          }}
                        />
                      </div>
                    )
                  },
                  {
                    key: 'headers',
                    label: 'Response Headers',
                    children: (
                      <div style={{ position: 'relative' }}>
                        <pre style={{
                          background: '#f5f5f5',
                          padding: 16,
                          borderRadius: 4,
                          overflow: 'auto',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          maxHeight: '500px'
                        }}>
                          <code>{JSON.stringify(response.headers, null, 2)}</code>
                        </pre>
                        <Button
                          type="text"
                          icon={copiedCode === 'headers' ? <CheckOutlined /> : <CopyOutlined />}
                          onClick={() => handleCopy(JSON.stringify(response.headers, null, 2), 'headers')}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8
                          }}
                        />
                      </div>
                    )
                  }
                ]}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <ApiOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>ยังไม่มี Response</div>
                <div style={{ fontSize: '12px', marginTop: 8 }}>
                  กรอกข้อมูลและกด Execute Request
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default APITester;

