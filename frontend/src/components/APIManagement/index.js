import React, { useState } from 'react';
import { Tabs, Card } from 'antd';
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
    <div className="api-management">
      <div style={{ 
        marginBottom: 24,
        padding: '16px 0',
        color: 'white'
      }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 700, 
          marginBottom: 8,
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          🔑 API Management
        </h1>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.9)', 
          fontSize: '15px',
          fontWeight: 500,
          margin: 0
        }}>
          จัดการ API Keys, ดูเอกสาร, และทดสอบ API
        </p>
      </div>

      <Card 
        style={{
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          border: 'none',
          overflow: 'hidden'
        }}
        bodyStyle={{ padding: 0 }}
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

