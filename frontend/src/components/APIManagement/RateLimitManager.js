import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Space,
  Button,
  InputNumber,
  Typography,
  Tag,
  Progress,
  Row,
  Col,
  Statistic,
  Alert,
  Modal,
  Form,
  message,
  Tooltip,
  Select,
  Switch,
  Divider,
  Empty,
  Spin
} from 'antd';
import {
  ThunderboltOutlined,
  ReloadOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiKeyService } from '../../services/apiKeyService';
import './APIManagement.css';

const { Title, Text } = Typography;
const { Option } = Select;

const RateLimitManager = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [editForm] = Form.useForm();
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Fetch API keys
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

  useEffect(() => {
    fetchAPIKeys();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAPIKeys();
    }, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Update rate limit
  const handleUpdateRateLimit = async (values) => {
    try {
      await apiKeyService.updateAPIKey(selectedKey.id, {
        rate_limit: values.rate_limit
      });
      message.success('อัปเดต Rate Limit สำเร็จ!');
      setEditModalVisible(false);
      setSelectedKey(null);
      fetchAPIKeys();
    } catch (error) {
      message.error('ไม่สามารถอัปเดต Rate Limit ได้: ' + (error.response?.data?.message || error.message));
    }
  };

  // Open edit modal
  const openEditModal = (key) => {
    setSelectedKey(key);
    editForm.setFieldsValue({
      rate_limit: key.rate_limit
    });
    setEditModalVisible(true);
  };

  // Calculate rate limit status (mock - in production, get from real-time data)
  const getRateLimitStatus = (key) => {
    // Mock calculation - in production, get from rate limit tracking
    const usage = Math.floor(Math.random() * key.rate_limit * 0.8); // Mock usage
    const percentage = (usage / key.rate_limit) * 100;
    
    if (percentage >= 90) {
      return { status: 'critical', usage, remaining: key.rate_limit - usage, percentage };
    } else if (percentage >= 70) {
      return { status: 'warning', usage, remaining: key.rate_limit - usage, percentage };
    }
    return { status: 'normal', usage, remaining: key.rate_limit - usage, percentage };
  };

  // Columns
  const columns = [
    {
      title: 'API Key',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Text strong>{text}</Text>
          <Text type="secondary" code style={{ fontSize: '11px' }}>
            {record.key_prefix}...
          </Text>
        </Space>
      )
    },
    {
      title: 'Rate Limit',
      dataIndex: 'rate_limit',
      key: 'rate_limit',
      render: (limit, record) => {
        const status = getRateLimitStatus(record);
        return (
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>{limit}/นาที</Text>
              <Tag color={status.status === 'critical' ? 'red' : status.status === 'warning' ? 'orange' : 'green'}>
                {status.remaining} เหลือ
              </Tag>
            </div>
            <Progress
              percent={status.percentage}
              strokeColor={
                status.status === 'critical' ? '#ff4d4f' :
                status.status === 'warning' ? '#faad14' : '#52c41a'
              }
              showInfo={false}
              size="small"
            />
          </Space>
        );
      }
    },
    {
      title: 'Usage (Mock)',
      key: 'usage',
      render: (_, record) => {
        const status = getRateLimitStatus(record);
        return (
          <Space>
            <Text>{status.usage}</Text>
            <Text type="secondary">/</Text>
            <Text>{record.rate_limit}</Text>
          </Space>
        );
      }
    },
    {
      title: 'สถานะ',
      key: 'status',
      render: (_, record) => {
        const status = getRateLimitStatus(record);
        if (status.status === 'critical') {
          return <Tag color="red" icon={<CloseCircleOutlined />}>ใกล้ Limit</Tag>;
        } else if (status.status === 'warning') {
          return <Tag color="orange" icon={<WarningOutlined />}>ใช้งานสูง</Tag>;
        }
        return <Tag color="green" icon={<CheckCircleOutlined />}>ปกติ</Tag>;
      }
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={() => {
            setSelectedKey(record);
            editForm.setFieldsValue({ rate_limit: record.rate_limit });
            setEditModalVisible(true);
          }}
        >
          แก้ไข
        </Button>
      )
    }
  ];

  // Stats
  const stats = {
    total: apiKeys.length,
    totalLimit: apiKeys.reduce((sum, k) => sum + (k.rate_limit || 0), 0),
    averageLimit: apiKeys.length > 0 
      ? Math.round(apiKeys.reduce((sum, k) => sum + (k.rate_limit || 0), 0) / apiKeys.length)
      : 0,
    active: apiKeys.filter(k => k.is_active).length
  };

  return (
    <div className="rate-limit-manager">
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ 
          marginBottom: 8,
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          fontSize: '24px'
        }}>
          <ThunderboltOutlined /> Rate Limiting Management
        </Title>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          จัดการและตรวจสอบ Rate Limits สำหรับ API Keys
        </Text>
      </div>

      {/* Info Alert */}
      <Alert
        message="Rate Limit Status"
        description="ข้อมูล Usage เป็น Mock Data สำหรับการแสดงผล ใน Production จะดึงข้อมูลจาก Rate Limit Tracking System"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        closable
      />

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="API Keys ทั้งหมด"
              value={stats.total}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Rate Limit"
              value={stats.totalLimit}
              suffix="/นาที"
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Average Rate Limit"
              value={stats.averageLimit}
              suffix="/นาที"
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Keys"
              value={stats.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card
        title={
          <Space>
            <ThunderboltOutlined />
            <span>Rate Limit Status</span>
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

      {/* Edit Rate Limit Modal */}
      <Modal
        title="แก้ไข Rate Limit"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedKey(null);
        }}
        footer={null}
        width={500}
      >
        {selectedKey && (
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleUpdateRateLimit}
            initialValues={{
              rate_limit: selectedKey.rate_limit
            }}
          >
            <Form.Item
              label="API Key"
            >
              <Text strong>{selectedKey.name}</Text>
              <br />
              <Text type="secondary" code>{selectedKey.key_prefix}...</Text>
            </Form.Item>

            <Form.Item
              name="rate_limit"
              label="Rate Limit (requests/นาที)"
              rules={[
                { required: true, message: 'กรุณากรอก Rate Limit' },
                { type: 'number', min: 1, max: 10000, message: 'Rate Limit ต้องอยู่ระหว่าง 1-10000' }
              ]}
            >
              <InputNumber
                min={1}
                max={10000}
                style={{ width: '100%' }}
                placeholder="เช่น: 100"
              />
            </Form.Item>

            <Alert
              message="คำแนะนำ"
              description="Rate Limit ที่แนะนำ: Development (100), Staging (500), Production (1000+)"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  บันทึก
                </Button>
                <Button onClick={() => {
                  setEditModalVisible(false);
                  setSelectedKey(null);
                }}>
                  ยกเลิก
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
      
      {/* Hidden Form to suppress useForm warning */}
      <Form form={editForm} style={{ display: 'none' }}>
        <Form.Item name="rate_limit">
          <InputNumber style={{ display: 'none' }} />
        </Form.Item>
      </Form>
    </div>
  );
};

export default RateLimitManager;

