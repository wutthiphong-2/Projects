import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Select,
  DatePicker,
  Space,
  Table,
  Tag,
  Progress,
  Spin,
  Empty,
  Alert,
  Divider,
  Button
} from 'antd';
import {
  BarChartOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  UserOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiKeyService } from '../../services/apiKeyService';
import api from '../../services/api';
import './APIManagement.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [selectedKeyId, setSelectedKeyId] = useState(null);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [days, setDays] = useState(7);

  // Fetch API keys
  useEffect(() => {
    const fetchAPIKeys = async () => {
      try {
        const keys = await apiKeyService.getAPIKeys();
        setApiKeys(keys || []);
        if (keys && keys.length > 0 && !selectedKeyId) {
          setSelectedKeyId(keys[0].id);
        }
      } catch (error) {
        console.error('Error fetching API keys:', error);
      }
    };
    fetchAPIKeys();
  }, []);

  // Fetch stats
  useEffect(() => {
    if (selectedKeyId) {
      fetchStats();
      fetchLogs();
    }
  }, [selectedKeyId, days]);

  const fetchStats = async () => {
    if (!selectedKeyId) return;
    
    setLoading(true);
    try {
      const data = await apiKeyService.getAPIKeyStats(selectedKeyId, days);
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!selectedKeyId) return;

    try {
      const data = await apiKeyService.getAPIKeyLogs(selectedKeyId, {
        page: 1,
        page_size: 50
      });
      setLogs(data.items || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  // Calculate success rate
  const successRate = stats?.by_status?.find(s => s.status_code >= 200 && s.status_code < 300)?.count || 0;
  const totalRequests = stats?.total_requests || 0;
  const successPercentage = totalRequests > 0 ? Math.round((successRate / totalRequests) * 100) : 0;

  // Log columns
  const logColumns = [
    {
      title: 'เวลา',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm:ss'),
      width: 180
    },
    {
      title: 'Endpoint',
      dataIndex: 'endpoint',
      key: 'endpoint',
      render: (text) => <Text code style={{ fontSize: '12px' }}>{text}</Text>
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (method) => (
        <Tag color={method === 'GET' ? 'blue' : method === 'POST' ? 'green' : 'orange'}>
          {method}
        </Tag>
      ),
      width: 100
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
      width: 100
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
      width: 120
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip_address',
      render: (ip) => <Text code>{ip || '-'}</Text>
    }
  ];

  // Top endpoints data
  const topEndpoints = stats?.by_endpoint?.slice(0, 5) || [];

  return (
    <div className="analytics-dashboard">
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ 
          marginBottom: 8,
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          fontSize: '24px'
        }}>
          <BarChartOutlined /> Analytics Dashboard
        </Title>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          วิเคราะห์การใช้งาน API และสถิติ
        </Text>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>เลือก API Key:</Text>
              <Select
                value={selectedKeyId}
                onChange={setSelectedKeyId}
                style={{ width: '100%' }}
                placeholder="เลือก API Key"
              >
                {apiKeys.map(key => (
                  <Option key={key.id} value={key.id}>
                    {key.name} ({key.key_prefix}...)
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>ช่วงเวลา:</Text>
              <Select
                value={days}
                onChange={setDays}
                style={{ width: '100%' }}
              >
                <Option value={1}>1 วัน</Option>
                <Option value={7}>7 วัน</Option>
                <Option value={30}>30 วัน</Option>
                <Option value={90}>90 วัน</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchStats();
                fetchLogs();
              }}
              loading={loading}
            >
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      {!selectedKeyId ? (
        <Alert
          message="กรุณาเลือก API Key"
          description="เลือก API Key เพื่อดูสถิติการใช้งาน"
          type="info"
          showIcon
        />
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : stats ? (
        <>
          {/* Stats Cards */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Requests"
                  value={stats.total_requests || 0}
                  prefix={<ApiOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Success Rate"
                  value={successPercentage}
                  suffix="%"
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
                <Progress
                  percent={successPercentage}
                  strokeColor="#52c41a"
                  size="small"
                  style={{ marginTop: 8 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Avg Response Time"
                  value={Math.round(stats.avg_response_time_ms || 0)}
                  suffix="ms"
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Period"
                  value={stats.period_days || days}
                  suffix="days"
                  prefix={<ThunderboltOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            {/* Top Endpoints */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <BarChartOutlined />
                    <span>Top Endpoints</span>
                  </Space>
                }
              >
                {topEndpoints.length > 0 ? (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {topEndpoints.map((endpoint, idx) => {
                      const percentage = totalRequests > 0 
                        ? Math.round((endpoint.count / totalRequests) * 100) 
                        : 0;
                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text code style={{ fontSize: '12px' }}>{endpoint.endpoint}</Text>
                            <Text strong>{endpoint.count} requests</Text>
                          </div>
                          <Progress
                            percent={percentage}
                            strokeColor="#1890ff"
                            size="small"
                            showInfo={false}
                          />
                        </div>
                      );
                    })}
                  </Space>
                ) : (
                  <Empty description="ไม่มีข้อมูล" />
                )}
              </Card>
            </Col>

            {/* Status Code Distribution */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <BarChartOutlined />
                    <span>Status Code Distribution</span>
                  </Space>
                }
              >
                {stats.by_status && stats.by_status.length > 0 ? (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {stats.by_status.map((status, idx) => {
                      const percentage = totalRequests > 0 
                        ? Math.round((status.count / totalRequests) * 100) 
                        : 0;
                      const isSuccess = status.status_code >= 200 && status.status_code < 300;
                      const isError = status.status_code >= 400;
                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Tag color={isSuccess ? 'green' : isError ? 'red' : 'default'}>
                              {status.status_code}
                            </Tag>
                            <Text strong>{status.count} requests</Text>
                          </div>
                          <Progress
                            percent={percentage}
                            strokeColor={isSuccess ? '#52c41a' : isError ? '#ff4d4f' : '#1890ff'}
                            size="small"
                            showInfo={false}
                          />
                        </div>
                      );
                    })}
                  </Space>
                ) : (
                  <Empty description="ไม่มีข้อมูล" />
                )}
              </Card>
            </Col>
          </Row>

          {/* Request Logs */}
          <Card
            title={
              <Space>
                <ApiOutlined />
                <span>Recent Requests</span>
              </Space>
            }
            style={{ marginTop: 24 }}
          >
            {logs.length > 0 ? (
              <Table
                columns={logColumns}
                dataSource={logs}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `ทั้งหมด ${total} รายการ`
                }}
                size="small"
              />
            ) : (
              <Empty description="ไม่มี Request Logs" />
            )}
          </Card>
        </>
      ) : (
        <Empty description="ไม่พบข้อมูลสถิติ" />
      )}
    </div>
  );
};

export default AnalyticsDashboard;

