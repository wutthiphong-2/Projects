import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Space,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Typography,
  Modal,
  Descriptions,
  Row,
  Col,
  Tabs,
  message,
  Tooltip,
  Popover,
  Spin,
  Empty,
  Divider
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  ClearOutlined,
  CopyOutlined,
  CheckOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiKeyService } from '../../services/apiKeyService';
import './APIManagement.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

const APILogsViewer = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50
  });
  const [filters, setFilters] = useState({
    apiKeyId: null,
    endpoint: '',
    method: null,
    statusCode: null,
    dateRange: null
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);

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

  // Fetch logs
  useEffect(() => {
    fetchLogs();
  }, [pagination, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
        ...(filters.apiKeyId && { api_key_id: filters.apiKeyId }),
        ...(filters.endpoint && { endpoint: filters.endpoint }),
        ...(filters.method && { method: filters.method }),
        ...(filters.statusCode && { status_code: filters.statusCode }),
        ...(filters.dateRange && filters.dateRange[0] && {
          date_from: filters.dateRange[0].toISOString(),
          date_to: filters.dateRange[1].toISOString()
        })
      };

      // Get logs - use getAllLogs if no specific key, otherwise use getAPIKeyLogs
      let data;
      if (filters.apiKeyId) {
        data = await apiKeyService.getAPIKeyLogs(filters.apiKeyId, params);
      } else {
        // Get all logs across all API keys
        data = await apiKeyService.getAllLogs(params);
      }
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      message.error('ไม่สามารถโหลด Logs ได้: ' + (error.response?.data?.message || error.message));
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      apiKeyId: null,
      endpoint: '',
      method: null,
      statusCode: null,
      dateRange: null
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // View log details
  const handleViewLog = (log) => {
    setSelectedLog(log);
    setViewModalVisible(true);
  };

  // Copy to clipboard
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    message.success('คัดลอกแล้ว!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Export logs
  const handleExport = (format) => {
    try {
      if (format === 'json') {
        const dataStr = JSON.stringify(logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `api-logs-${dayjs().format('YYYY-MM-DD-HHmmss')}.json`;
        link.click();
        URL.revokeObjectURL(url);
        message.success('Export JSON สำเร็จ!');
      } else if (format === 'csv') {
        // Convert to CSV
        const headers = ['Timestamp', 'Endpoint', 'Method', 'Status', 'Response Time (ms)', 'IP Address'];
        const rows = logs.map(log => [
          dayjs(log.timestamp).format('YYYY-MM-DD HH:mm:ss'),
          log.endpoint,
          log.method,
          log.response_status,
          log.response_time_ms,
          log.ip_address || ''
        ]);
        
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `api-logs-${dayjs().format('YYYY-MM-DD-HHmmss')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        message.success('Export CSV สำเร็จ!');
      }
    } catch (error) {
      message.error('Export ไม่สำเร็จ: ' + error.message);
    }
  };

  // Columns
  const columns = [
    {
      title: 'เวลา',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (date) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(date).format('DD/MM/YYYY')}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {dayjs(date).format('HH:mm:ss')}
          </Text>
        </Space>
      ),
      width: 140,
      sorter: true
    },
    {
      title: 'Endpoint',
      dataIndex: 'endpoint',
      key: 'endpoint',
      render: (text) => (
        <Text code style={{ fontSize: '12px' }}>{text}</Text>
      ),
      ellipsis: true
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (method) => (
        <Tag color={method === 'GET' ? 'blue' : method === 'POST' ? 'green' : method === 'PUT' ? 'orange' : method === 'DELETE' ? 'red' : 'default'}>
          {method}
        </Tag>
      ),
      width: 100,
      filters: [
        { text: 'GET', value: 'GET' },
        { text: 'POST', value: 'POST' },
        { text: 'PUT', value: 'PUT' },
        { text: 'DELETE', value: 'DELETE' }
      ],
      onFilter: (value, record) => record.method === value
    },
    {
      title: 'Status',
      dataIndex: 'response_status',
      key: 'response_status',
      render: (status) => {
        if (status >= 200 && status < 300) {
          return <Tag color="green" icon={<CheckCircleOutlined />}>{status}</Tag>;
        } else if (status >= 400) {
          return <Tag color="red" icon={<CloseCircleOutlined />}>{status}</Tag>;
        }
        return <Tag>{status}</Tag>;
      },
      width: 100,
      filters: [
        { text: '2xx Success', value: '2xx' },
        { text: '4xx Client Error', value: '4xx' },
        { text: '5xx Server Error', value: '5xx' }
      ],
      onFilter: (value, record) => {
        if (value === '2xx') return record.response_status >= 200 && record.response_status < 300;
        if (value === '4xx') return record.response_status >= 400 && record.response_status < 500;
        if (value === '5xx') return record.response_status >= 500;
        return true;
      }
    },
    {
      title: 'Response Time',
      dataIndex: 'response_time_ms',
      key: 'response_time_ms',
      render: (time) => (
        <Space>
          <ClockCircleOutlined />
          <Text>{time}ms</Text>
        </Space>
      ),
      width: 130,
      sorter: (a, b) => a.response_time_ms - b.response_time_ms
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip_address',
      render: (ip) => <Text code>{ip || '-'}</Text>
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleViewLog(record)}
        >
          ดู
        </Button>
      )
    }
  ];

  return (
    <div className="api-logs-viewer">
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ 
          marginBottom: 8,
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          fontSize: '24px'
        }}>
          <FileTextOutlined /> Request/Response Logs
        </Title>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          ดูและวิเคราะห์ API Request/Response Logs
        </Text>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>API Key:</Text>
              <Select
                value={filters.apiKeyId}
                onChange={(value) => handleFilterChange('apiKeyId', value)}
                placeholder="ทั้งหมด"
                style={{ width: '100%' }}
                allowClear
              >
                {apiKeys.map(key => (
                  <Option key={key.id} value={key.id}>
                    {key.name} ({key.key_prefix}...)
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Endpoint:</Text>
              <Input
                placeholder="ค้นหา endpoint..."
                value={filters.endpoint}
                onChange={(e) => handleFilterChange('endpoint', e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Method:</Text>
              <Select
                value={filters.method}
                onChange={(value) => handleFilterChange('method', value)}
                placeholder="ทั้งหมด"
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="GET">GET</Option>
                <Option value="POST">POST</Option>
                <Option value="PUT">PUT</Option>
                <Option value="PATCH">PATCH</Option>
                <Option value="DELETE">DELETE</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Status Code:</Text>
              <Select
                value={filters.statusCode}
                onChange={(value) => handleFilterChange('statusCode', value)}
                placeholder="ทั้งหมด"
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="200">200 OK</Option>
                <Option value="201">201 Created</Option>
                <Option value="400">400 Bad Request</Option>
                <Option value="401">401 Unauthorized</Option>
                <Option value="403">403 Forbidden</Option>
                <Option value="404">404 Not Found</Option>
                <Option value="500">500 Server Error</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>วันที่:</Text>
              <RangePicker
                value={filters.dateRange}
                onChange={(dates) => handleFilterChange('dateRange', dates)}
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>&nbsp;</Text>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchLogs}
                  loading={loading}
                >
                  Refresh
                </Button>
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleClearFilters}
                >
                  Clear
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card
        title={
          <Space>
            <ApiOutlined />
            <span>Logs ({total})</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleExport('csv')}
              disabled={logs.length === 0}
            >
              Export CSV
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleExport('json')}
              disabled={logs.length === 0}
            >
              Export JSON
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={logs}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `ทั้งหมด ${total} รายการ`,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize });
            }
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* View Log Modal */}
      <Modal
        title="Log Details"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setSelectedLog(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setViewModalVisible(false);
            setSelectedLog(null);
          }}>
            ปิด
          </Button>
        ]}
        width={900}
      >
        {selectedLog && (
          <Tabs
            items={[
              {
                key: 'overview',
                label: 'Overview',
                children: (
                  <Descriptions column={2} bordered>
                    <Descriptions.Item label="Timestamp">
                      {dayjs(selectedLog.timestamp).format('DD/MM/YYYY HH:mm:ss')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Endpoint">
                      <Text code>{selectedLog.endpoint}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Method">
                      <Tag color={selectedLog.method === 'GET' ? 'blue' : selectedLog.method === 'POST' ? 'green' : 'orange'}>
                        {selectedLog.method}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      {selectedLog.response_status >= 200 && selectedLog.response_status < 300 ? (
                        <Tag color="green">{selectedLog.response_status}</Tag>
                      ) : (
                        <Tag color="red">{selectedLog.response_status}</Tag>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Response Time">
                      {selectedLog.response_time_ms}ms
                    </Descriptions.Item>
                    <Descriptions.Item label="IP Address">
                      <Text code>{selectedLog.ip_address || '-'}</Text>
                    </Descriptions.Item>
                    {selectedLog.user_agent && (
                      <Descriptions.Item label="User Agent" span={2}>
                        {selectedLog.user_agent}
                      </Descriptions.Item>
                    )}
                    {selectedLog.error_message && (
                      <Descriptions.Item label="Error" span={2}>
                        <Text type="danger">{selectedLog.error_message}</Text>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                )
              },
              {
                key: 'request',
                label: 'Request',
                children: (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <Text strong>Headers:</Text>
                      <div style={{ position: 'relative', marginTop: 8 }}>
                        <pre style={{
                          background: '#f5f5f5',
                          padding: 16,
                          borderRadius: 4,
                          overflow: 'auto',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          maxHeight: '200px',
                          overflow: 'auto'
                        }}>
                          <code>
                            {selectedLog.request_headers ? JSON.stringify(selectedLog.request_headers, null, 2) : 'N/A'}
                          </code>
                        </pre>
                        <Button
                          type="text"
                          icon={copiedCode === 'req-headers' ? <CheckOutlined /> : <CopyOutlined />}
                          onClick={() => handleCopy(JSON.stringify(selectedLog.request_headers, null, 2), 'req-headers')}
                          style={{ position: 'absolute', top: 8, right: 8 }}
                        />
                      </div>
                    </div>
                    <div>
                      <Text strong>Body:</Text>
                      <div style={{ position: 'relative', marginTop: 8 }}>
                        <pre style={{
                          background: '#1e1e1e',
                          color: '#d4d4d4',
                          padding: 16,
                          borderRadius: 4,
                          overflow: 'auto',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          maxHeight: '300px'
                        }}>
                          <code>
                            {selectedLog.request_body || 'N/A'}
                          </code>
                        </pre>
                        <Button
                          type="text"
                          icon={copiedCode === 'req-body' ? <CheckOutlined /> : <CopyOutlined />}
                          onClick={() => handleCopy(selectedLog.request_body || '', 'req-body')}
                          style={{ position: 'absolute', top: 8, right: 8, color: '#fff' }}
                        />
                      </div>
                    </div>
                  </div>
                )
              },
              {
                key: 'response',
                label: 'Response',
                children: (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <Text strong>Headers:</Text>
                      <div style={{ position: 'relative', marginTop: 8 }}>
                        <pre style={{
                          background: '#f5f5f5',
                          padding: 16,
                          borderRadius: 4,
                          overflow: 'auto',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          maxHeight: '200px'
                        }}>
                          <code>
                            {selectedLog.response_headers ? JSON.stringify(selectedLog.response_headers, null, 2) : 'N/A'}
                          </code>
                        </pre>
                        <Button
                          type="text"
                          icon={copiedCode === 'res-headers' ? <CheckOutlined /> : <CopyOutlined />}
                          onClick={() => handleCopy(JSON.stringify(selectedLog.response_headers, null, 2), 'res-headers')}
                          style={{ position: 'absolute', top: 8, right: 8 }}
                        />
                      </div>
                    </div>
                    <div>
                      <Text strong>Body:</Text>
                      <div style={{ position: 'relative', marginTop: 8 }}>
                        <pre style={{
                          background: '#1e1e1e',
                          color: '#d4d4d4',
                          padding: 16,
                          borderRadius: 4,
                          overflow: 'auto',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          maxHeight: '300px'
                        }}>
                          <code>
                            {selectedLog.response_body || 'N/A'}
                          </code>
                        </pre>
                        <Button
                          type="text"
                          icon={copiedCode === 'res-body' ? <CheckOutlined /> : <CopyOutlined />}
                          onClick={() => handleCopy(selectedLog.response_body || '', 'res-body')}
                          style={{ position: 'absolute', top: 8, right: 8, color: '#fff' }}
                        />
                      </div>
                    </div>
                  </div>
                )
              }
            ]}
          />
        )}
      </Modal>
    </div>
  );
};

export default APILogsViewer;

