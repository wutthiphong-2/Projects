import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Space,
  Button,
  Form,
  Input,
  InputNumber,
  Switch,
  Typography,
  Tag,
  Row,
  Col,
  Statistic,
  Alert,
  Modal,
  Select,
  message,
  Divider,
  Empty,
  Spin,
  Badge
} from 'antd';
import {
  BellOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  MailOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiKeyService } from '../../services/apiKeyService';
import './APIManagement.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const UsageAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Load alerts from localStorage (in production, use backend)
  useEffect(() => {
    loadAlerts();
    fetchAPIKeys();
  }, []);

  const loadAlerts = () => {
    try {
      const saved = localStorage.getItem('api_usage_alerts');
      if (saved) {
        setAlerts(JSON.parse(saved));
      } else {
        // Default alerts
        setAlerts([]);
      }
    } catch (e) {
      console.error('Error loading alerts:', e);
      setAlerts([]);
    }
  };

  const saveAlerts = (newAlerts) => {
    localStorage.setItem('api_usage_alerts', JSON.stringify(newAlerts));
    setAlerts(newAlerts);
  };

  const fetchAPIKeys = async () => {
    try {
      const data = await apiKeyService.getAPIKeys();
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  // Create alert
  const handleCreate = async (values) => {
    try {
      const newAlert = {
        id: Date.now().toString(),
        name: values.name,
        api_key_id: values.api_key_id,
        alert_type: values.alert_type,
        threshold: values.threshold,
        enabled: values.enabled !== false,
        email: values.email,
        created_at: new Date().toISOString(),
        last_triggered: null,
        trigger_count: 0
      };

      const updated = [...alerts, newAlert];
      saveAlerts(updated);
      message.success('สร้าง Alert สำเร็จ!');
      createForm.resetFields();
      setCreateModalVisible(false);
    } catch (error) {
      message.error('ไม่สามารถสร้าง Alert ได้: ' + error.message);
    }
  };

  // Update alert
  const handleUpdate = async (values) => {
    try {
      const updated = alerts.map(alert =>
        alert.id === selectedAlert.id
          ? { ...alert, ...values, updated_at: new Date().toISOString() }
          : alert
      );
      saveAlerts(updated);
      message.success('อัปเดต Alert สำเร็จ!');
      setEditModalVisible(false);
      setSelectedAlert(null);
    } catch (error) {
      message.error('ไม่สามารถอัปเดต Alert ได้: ' + error.message);
    }
  };

  // Delete alert
  const handleDelete = (alertId) => {
    const updated = alerts.filter(a => a.id !== alertId);
    saveAlerts(updated);
    message.success('ลบ Alert สำเร็จ!');
  };

  // Toggle alert
  const handleToggle = (alertId) => {
    const updated = alerts.map(alert =>
      alert.id === alertId
        ? { ...alert, enabled: !alert.enabled }
        : alert
    );
    saveAlerts(updated);
    message.success('อัปเดตสถานะ Alert สำเร็จ!');
  };

  // Open edit modal
  const openEditModal = (alert) => {
    setSelectedAlert(alert);
    editForm.setFieldsValue({
      name: alert.name,
      api_key_id: alert.api_key_id,
      alert_type: alert.alert_type,
      threshold: alert.threshold,
      enabled: alert.enabled,
      email: alert.email
    });
    setEditModalVisible(true);
  };

  // Check alerts (mock - in production, run as background job)
  const checkAlerts = async () => {
    setLoading(true);
    try {
      // Mock: Check each alert
      for (const alert of alerts.filter(a => a.enabled)) {
        if (alert.api_key_id) {
          try {
            const stats = await apiKeyService.getAPIKeyStats(alert.api_key_id, 1);
            
            let shouldTrigger = false;
            if (alert.alert_type === 'rate_limit') {
              const usage = stats.total_requests || 0;
              const key = apiKeys.find(k => k.id === alert.api_key_id);
              if (key) {
                const percentage = (usage / key.rate_limit) * 100;
                shouldTrigger = percentage >= alert.threshold;
              }
            } else if (alert.alert_type === 'error_rate') {
              const errorCount = stats.by_status?.find(s => s.status_code >= 400)?.count || 0;
              const total = stats.total_requests || 1;
              const errorRate = (errorCount / total) * 100;
              shouldTrigger = errorRate >= alert.threshold;
            }

            if (shouldTrigger) {
              // Update trigger info
              const updated = alerts.map(a =>
                a.id === alert.id
                  ? {
                      ...a,
                      last_triggered: new Date().toISOString(),
                      trigger_count: (a.trigger_count || 0) + 1
                    }
                  : a
              );
              saveAlerts(updated);
              
              // Show notification (in production, send email)
              message.warning(`Alert: ${alert.name} - Threshold reached!`);
            }
          } catch (error) {
            console.error(`Error checking alert ${alert.id}:`, error);
          }
        }
      }
      message.success('ตรวจสอบ Alerts แล้ว!');
    } catch (error) {
      message.error('ไม่สามารถตรวจสอบ Alerts ได้: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Columns
  const columns = [
    {
      title: 'ชื่อ Alert',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Text strong>{text}</Text>
          {record.last_triggered && (
            <Badge status="error" />
          )}
        </Space>
      )
    },
    {
      title: 'API Key',
      dataIndex: 'api_key_id',
      key: 'api_key_id',
      render: (keyId) => {
        const key = apiKeys.find(k => k.id === keyId);
        return key ? (
          <Text code>{key.name} ({key.key_prefix}...)</Text>
        ) : (
          <Text type="secondary">-</Text>
        );
      }
    },
    {
      title: 'ประเภท',
      dataIndex: 'alert_type',
      key: 'alert_type',
      render: (type) => {
        const types = {
          rate_limit: { label: 'Rate Limit', color: 'orange' },
          error_rate: { label: 'Error Rate', color: 'red' },
          usage: { label: 'Usage', color: 'blue' }
        };
        const config = types[type] || { label: type, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      }
    },
    {
      title: 'Threshold',
      dataIndex: 'threshold',
      key: 'threshold',
      render: (threshold, record) => (
        <Text>{threshold}%</Text>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email || <Text type="secondary">-</Text>
    },
    {
      title: 'สถานะ',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled, record) => (
        <Switch
          checked={enabled}
          onChange={() => handleToggle(record.id)}
          checkedChildren="เปิด"
          unCheckedChildren="ปิด"
        />
      )
    },
    {
      title: 'Triggered',
      key: 'trigger_count',
      render: (_, record) => (
        <Space>
          <Text>{record.trigger_count || 0} ครั้ง</Text>
          {record.last_triggered && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {dayjs(record.last_triggered).format('DD/MM HH:mm')}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      )
    }
  ];

  // Stats
  const stats = {
    total: alerts.length,
    enabled: alerts.filter(a => a.enabled).length,
    triggered: alerts.filter(a => a.last_triggered).length
  };

  return (
    <div className="usage-alerts">
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ 
          marginBottom: 8,
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          fontSize: '24px'
        }}>
          <BellOutlined /> Usage Alerts & Notifications
        </Title>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          ตั้งค่า Alerts สำหรับ Rate Limits และ Error Rates
        </Text>
      </div>

      {/* Info Alert */}
      <Alert
        message="Email Notifications"
        description="Email notifications จะทำงานเมื่อ Alert ถูก trigger ใน Production จะต้องตั้งค่า Email Service (SMTP)"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        closable
      />

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card 
            style={{
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
            styles={{ body: { padding: '20px' } }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>Alerts ทั้งหมด</span>}
              value={stats.total}
              prefix={<BellOutlined style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '22px' }} />}
              valueStyle={{ color: '#ffffff', fontSize: '28px', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card 
            style={{
              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
              border: 'none',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
            styles={{ body: { padding: '20px' } }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>เปิดใช้งาน</span>}
              value={stats.enabled}
              prefix={<CheckCircleOutlined style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '22px' }} />}
              valueStyle={{ color: '#ffffff', fontSize: '28px', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card 
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              border: 'none',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
            styles={{ body: { padding: '20px' } }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>Triggered</span>}
              value={stats.triggered}
              prefix={<WarningOutlined style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '22px' }} />}
              valueStyle={{ color: '#ffffff', fontSize: '28px', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card
        title={
          <Space>
            <BellOutlined />
            <span>Alerts</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={checkAlerts}
              loading={loading}
            >
              Check Alerts
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              สร้าง Alert
            </Button>
          </Space>
        }
      >
        {alerts.length === 0 ? (
          <Empty description="ยังไม่มี Alerts" />
        ) : (
          <Table
            columns={columns}
            dataSource={alerts}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `ทั้งหมด ${total} รายการ`
            }}
          />
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        title="สร้าง Alert ใหม่"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
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
            label="ชื่อ Alert"
            rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}
          >
            <Input placeholder="เช่น: Rate Limit Warning" />
          </Form.Item>

          <Form.Item
            name="api_key_id"
            label="API Key"
            rules={[{ required: true, message: 'กรุณาเลือก API Key' }]}
          >
            <Select placeholder="เลือก API Key">
              {apiKeys.map(key => (
                <Option key={key.id} value={key.id}>
                  {key.name} ({key.key_prefix}...)
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="alert_type"
            label="ประเภท Alert"
            rules={[{ required: true, message: 'กรุณาเลือกประเภท' }]}
          >
            <Select placeholder="เลือกประเภท">
              <Option value="rate_limit">Rate Limit (เมื่อใกล้ Rate Limit)</Option>
              <Option value="error_rate">Error Rate (เมื่อ Error Rate สูง)</Option>
              <Option value="usage">Usage (เมื่อการใช้งานสูง)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="threshold"
            label="Threshold (%)"
            rules={[{ required: true, message: 'กรุณากรอก Threshold' }]}
            tooltip="เปอร์เซ็นต์ที่จะ trigger alert (เช่น: 80 = 80%)"
          >
            <InputNumber
              min={1}
              max={100}
              style={{ width: '100%' }}
              placeholder="เช่น: 80"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email (สำหรับการแจ้งเตือน)"
            rules={[
              { type: 'email', message: 'กรุณากรอก Email ที่ถูกต้อง' }
            ]}
          >
            <Input placeholder="เช่น: admin@example.com" />
          </Form.Item>

          <Form.Item
            name="enabled"
            label="เปิดใช้งาน"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                สร้าง
              </Button>
              <Button onClick={() => {
                setCreateModalVisible(false);
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
        title="แก้ไข Alert"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedAlert(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            name="name"
            label="ชื่อ Alert"
            rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="api_key_id"
            label="API Key"
            rules={[{ required: true, message: 'กรุณาเลือก API Key' }]}
          >
            <Select>
              {apiKeys.map(key => (
                <Option key={key.id} value={key.id}>
                  {key.name} ({key.key_prefix}...)
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="alert_type"
            label="ประเภท Alert"
            rules={[{ required: true, message: 'กรุณาเลือกประเภท' }]}
          >
            <Select>
              <Option value="rate_limit">Rate Limit</Option>
              <Option value="error_rate">Error Rate</Option>
              <Option value="usage">Usage</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="threshold"
            label="Threshold (%)"
            rules={[{ required: true, message: 'กรุณากรอก Threshold' }]}
          >
            <InputNumber
              min={1}
              max={100}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'กรุณากรอก Email ที่ถูกต้อง' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="enabled"
            label="เปิดใช้งาน"
            valuePropName="checked"
          >
            <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                บันทึก
              </Button>
              <Button onClick={() => {
                setEditModalVisible(false);
                setSelectedAlert(null);
              }}>
                ยกเลิก
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Hidden Forms to suppress useForm warnings */}
      <Form form={createForm} style={{ display: 'none' }}>
        <Form.Item name="name">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="api_key_id">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="alert_type">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="threshold">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="email">
          <Input style={{ display: 'none' }} />
        </Form.Item>
      </Form>
      
      <Form form={editForm} style={{ display: 'none' }}>
        <Form.Item name="name">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="api_key_id">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="alert_type">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="threshold">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="email">
          <Input style={{ display: 'none' }} />
        </Form.Item>
      </Form>
    </div>
  );
};

export default UsageAlerts;

