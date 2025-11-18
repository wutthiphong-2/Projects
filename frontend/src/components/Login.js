import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, App } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { message } = App.useApp();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password);
      if (result.success) {
        message.success('Login successful');
      } else {
        message.error(result.error || 'Login failed');
      }
    } catch (error) {
      message.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <div className="logo-icon">
            <SafetyOutlined />
          </div>
          <Title level={2} className="login-title">Active Directory</Title>
          <Text className="login-subtitle">Management System</Text>
        </div>
        
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
          className="login-form"
        >
          <Form.Item
            name="username"
            rules={[
              {
                required: true,
                message: 'Please enter your username',
              },
            ]}
            className="login-form-item"
          >
            <Input
              prefix={<UserOutlined className="login-icon" />}
              placeholder="Username"
              className="login-input"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              {
                required: true,
                message: 'Please enter your password',
              },
            ]}
            className="login-form-item"
          >
            <Input.Password
              prefix={<LockOutlined className="login-icon" />}
              placeholder="Password"
              className="login-input"
            />
          </Form.Item>

          <Form.Item className="login-form-item">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="login-button"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div className="login-footer">
          <Text className="login-footer-text">
            Secure authentication for Active Directory management
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default Login;
