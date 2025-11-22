import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Spin, Breadcrumb, App as AntApp } from 'antd';
import { LoadingOutlined, HomeOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement/index';
import GroupManagement from './components/GroupManagement';
import OUManagement from './components/OUManagement';
import ActivityLog from './components/ActivityLog';
import Sidebar from './components/Sidebar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import './App.css';

const { Content } = Layout;

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Breadcrumb mapping
  const breadcrumbNameMap = {
    '/dashboard': 'แดชบอร์ด',
    '/users': 'จัดการผู้ใช้',
    '/groups': 'จัดการกลุ่ม',
    '/ous': 'จัดการ OU',
    '/activity-log': 'Activity Log',
  };

  const getBreadcrumbItems = () => {
    const pathSnippets = location.pathname.split('/').filter(i => i);
    const breadcrumbItems = [
      {
        title: (
          <span>
            <HomeOutlined style={{ marginRight: 4 }} />
            หน้าหลัก
          </span>
        )
      }
    ];

    if (pathSnippets.length > 0) {
      const currentPath = `/${pathSnippets[0]}`;
      breadcrumbItems.push({
        title: breadcrumbNameMap[currentPath] || currentPath
      });
    }

    return breadcrumbItems;
  };

  if (loading) {
    return (
      <div className="app-loading">
        <Spin 
          indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />}
          tip={<span style={{ color: '#595959', fontSize: 16, marginTop: 16 }}>กำลังโหลดระบบ...</span>}
          size="large"
          fullscreen
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout className="app-layout">
      <Sidebar />
      <Layout className="app-main-layout">
        <Content className="app-content">
          <div className="app-content-inner">
            <div className="app-content-body">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/groups" element={<GroupManagement />} />
                <Route path="/ous" element={<OUManagement />} />
                <Route path="/activity-log" element={<ActivityLog />} />
                {/* Catch-all route for unknown paths */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

function App() {
  return (
    <AntApp>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </AntApp>
  );
}

export default App;
