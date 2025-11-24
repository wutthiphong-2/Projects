import React, { useState } from 'react';
import { Tabs, Card, Typography, Space } from 'antd';
import {
  KeyOutlined,
  BookOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  BellOutlined,
  SafetyOutlined,
  SyncOutlined
} from '@ant-design/icons';
import APIKeyManager from './APIKeyManager';
import APIDocumentation from './APIDocumentation';
import APITester from './APITester';
import AnalyticsDashboard from './AnalyticsDashboard';
import APILogsViewer from './APILogsViewer';
import RateLimitManager from './RateLimitManager';
import UsageAlerts from './UsageAlerts';
import PermissionsManager from './PermissionsManager';
import './APIManagement.css';

const { Title, Text } = Typography;

const APIManagement = () => {
  const [activeTab, setActiveTab] = useState('keys');

  const tabItems = [
    {
      key: 'keys',
      label: (
        <span>
          <KeyOutlined /> API Keys
        </span>
      ),
      children: <APIKeyManager />
    },
    {
      key: 'docs',
      label: (
        <span>
          <BookOutlined /> Documentation
        </span>
      ),
      children: <APIDocumentation />
    },
    {
      key: 'tester',
      label: (
        <span>
          <ExperimentOutlined /> API Tester
        </span>
      ),
      children: <APITester />
    },
    {
      key: 'analytics',
      label: (
        <span>
          <BarChartOutlined /> Analytics
        </span>
      ),
      children: <AnalyticsDashboard />
    },
    {
      key: 'logs',
      label: (
        <span>
          <FileTextOutlined /> Logs
        </span>
      ),
      children: <APILogsViewer />
    },
    {
      key: 'rate-limit',
      label: (
        <span>
          <ThunderboltOutlined /> Rate Limits
        </span>
      ),
      children: <RateLimitManager />
    },
    {
      key: 'alerts',
      label: (
        <span>
          <BellOutlined /> Alerts
        </span>
      ),
      children: <UsageAlerts />
    },
    {
      key: 'permissions',
      label: (
        <span>
          <SafetyOutlined /> Permissions
        </span>
      ),
      children: <PermissionsManager />
    }
  ];

  return (
    <div className="api-management-container">
      {/* Header */}
      <div className="api-management-header">
        <Title level={3} className="api-management-title" style={{ 
          marginBottom: 8,
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          fontSize: '32px'
        }}>
          <KeyOutlined style={{ marginRight: 12, color: '#ffffff', filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))' }} />
          API Management
        </Title>
        <Text className="api-management-subtitle" style={{ 
          fontSize: '15px', 
          fontWeight: 500,
          color: '#ffffff',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}>
          จัดการ API Keys, ดูเอกสาร, และทดสอบ API
        </Text>
      </div>

      <Card 
        className="api-management-main-card"
        style={{
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          border: 'none',
          overflow: 'hidden'
        }}
        styles={{ body: { padding: 0 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  );
};

export default APIManagement;

