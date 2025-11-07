import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Typography, 
  Spin, 
  List, 
  Avatar, 
  Tag, 
  Button, 
  Progress, 
  Timeline,
  Badge,
  Space,
  Empty
} from 'antd';
import { 
  UserOutlined, 
  TeamOutlined, 
  FolderOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  UserAddOutlined,
  BarChartOutlined,
  PieChartOutlined,
  StopOutlined,
  BankOutlined,
  EditOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import './Dashboard.css';

const { Title, Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    enabledUsers: 0,
    disabledUsers: 0,
    totalGroups: 0,
    totalOUs: 0,
    totalDepartments: 0
  });
  const [loading, setLoading] = useState(true);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    userAccountHealth: 0,
    groupDistribution: 0,
    ouUtilization: 0
  });
  const { getAuthHeaders } = useAuth();
  const { notifications } = useNotification();

  const fetchStats = async () => {
    try {
      const [usersResponse, groupsResponse, ousResponse, departmentsResponse, activitiesResponse] = await Promise.all([
        axios.get(`${config.apiUrl}/api/users/`, { 
          headers: getAuthHeaders(), 
          params: { page: 1, page_size: 1000 } 
        }),
        axios.get(`${config.apiUrl}/api/groups/`, { 
          headers: getAuthHeaders(), 
          params: { page: 1, page_size: 1000 } 
        }),
        axios.get(`${config.apiUrl}/api/ous/`, { 
          headers: getAuthHeaders(), 
          params: { page: 1, page_size: 1000 } 
        }),
        axios.get(`${config.apiUrl}/api/users/departments`, { 
          headers: getAuthHeaders() 
        }),
        axios.get(`${config.apiUrl}/api/activity-logs/recent`, {
          headers: getAuthHeaders(),
          params: { limit: 10 }
        }).catch(() => ({ data: [] }))
      ]);

      const users = usersResponse.data;
      const enabledUsers = users.filter(user => user.isEnabled).length;
      const disabledUsers = users.length - enabledUsers;
      
      // Calculate System Health
      const userHealth = users.length > 0 ? Math.round((enabledUsers / users.length) * 100) : 0;
      const groupDist = groupsResponse.data.length;
      const ouUtil = ousResponse.data.length;

      setStats({
        totalUsers: users.length,
        enabledUsers,
        disabledUsers,
        totalGroups: groupsResponse.data.length,
        totalOUs: ousResponse.data.length,
        totalDepartments: departmentsResponse.data.length
      });
      
      setRecentActivities(activitiesResponse.data || []);

      setSystemHealth({
        userAccountHealth: userHealth,
        groupDistribution: groupDist,
        ouUtilization: ouUtil
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchDepartmentStats = async () => {
    try {
      const [usersResponse] = await Promise.all([
        axios.get(`${config.apiUrl}/api/users/`, { 
          headers: getAuthHeaders(), 
          params: { page: 1, page_size: 1000 } 
        })
      ]);

      const users = usersResponse.data;

      // Count users per department
      const deptMap = {};
      users.forEach(user => {
        if (user.department) {
          deptMap[user.department] = (deptMap[user.department] || 0) + 1;
        } else {
          deptMap['Unspecified'] = (deptMap['Unspecified'] || 0) + 1;
        }
      });

      // Convert to array and sort
      const deptStats = Object.entries(deptMap)
        .map(([name, count]) => ({
          name,
          count,
          percentage: users.length > 0 ? Math.round((count / users.length) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Show top 5 departments

      setDepartmentStats(deptStats);
    } catch (error) {
      console.error('Error fetching department stats:', error);
    }
  };

  const fetchRecentUsers = async () => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/users/`, { 
        headers: getAuthHeaders(), 
        params: { page: 1, page_size: 1000 } 
      });

      const users = response.data;
      
      // Filter and sort by creation date
      const sortedUsers = users
        .filter(user => user.whenCreated)
        .sort((a, b) => new Date(b.whenCreated) - new Date(a.whenCreated))
        .slice(0, 5); // Show 5 most recent

      setRecentUsers(sortedUsers);
    } catch (error) {
      console.error('Error fetching recent users:', error);
    }
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchDepartmentStats(),
        fetchRecentUsers()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Spin size="large" tip="Loading data..." />
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <Title level={2} className="dashboard-title">
          <BarChartOutlined style={{ marginRight: 12, color: '#3b82f6' }} />
          Active Directory Dashboard
        </Title>
        <Text className="dashboard-subtitle">
          System Overview and Usage Statistics
        </Text>
      </div>

      {/* Main Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card-primary" hoverable>
            <Statistic
              title="Total Users"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3b82f6', fontSize: '28px', fontWeight: '600' }}
            />
            <Progress 
              percent={stats.totalUsers > 0 ? Math.round((stats.enabledUsers / stats.totalUsers) * 100) : 0}
              size="small" 
              strokeColor="#10b981"
              className="stat-progress"
              showInfo={false}
            />
            <div className="stat-description">
              <Space split={<span>•</span>} size="small">
                <Text type="success">
                  <CheckCircleOutlined /> {stats.enabledUsers} Enabled
                </Text>
                <Text type="danger">
                  <StopOutlined /> {stats.disabledUsers} Disabled
                </Text>
              </Space>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card-success" hoverable>
            <Statistic
              title="Total Groups"
              value={stats.totalGroups}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#10b981', fontSize: '28px', fontWeight: '600' }}
            />
            <div className="stat-description" style={{ marginTop: '12px' }}>
              <Text type="secondary">
                <TeamOutlined /> Security & Distribution Groups
              </Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card-warning" hoverable>
            <Statistic
              title="Organizational Units"
              value={stats.totalOUs}
              prefix={<FolderOutlined />}
              valueStyle={{ color: '#f59e0b', fontSize: '28px', fontWeight: '600' }}
            />
            <div className="stat-description" style={{ marginTop: '12px' }}>
              <Text type="secondary">
                <FolderOutlined /> Units in Structure
              </Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card-info" hoverable>
            <Statistic
              title="Total Departments"
              value={stats.totalDepartments}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#06b6d4', fontSize: '28px', fontWeight: '600' }}
            />
            <div className="stat-description" style={{ marginTop: '12px' }}>
              <Text type="secondary">
                <BankOutlined /> Active Departments
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* System Health Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col span={24}>
          <Card 
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#10b981' }} />
                <span>System Health Overview</span>
              </Space>
            }
            className="system-health-card"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <div className="health-item">
                  <div className="health-label">
                    <UserOutlined /> User Account Status
                  </div>
                  <Progress 
                    type="circle" 
                    percent={systemHealth.userAccountHealth} 
                    strokeColor={{
                      '0%': '#10b981',
                      '100%': '#3b82f6',
                    }}
                    width={120}
                  />
                  <div className="health-description">
                    {systemHealth.userAccountHealth}% Accounts Active
                  </div>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="health-item">
                  <div className="health-label">
                    <TeamOutlined /> Active Groups
                  </div>
                  <Progress 
                    type="circle" 
                    percent={Math.min(100, (systemHealth.groupDistribution / 50) * 100)}
                    strokeColor="#8b5cf6"
                    width={120}
                    format={() => systemHealth.groupDistribution}
                  />
                  <div className="health-description">
                    {systemHealth.groupDistribution} Groups in System
                  </div>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="health-item">
                  <div className="health-label">
                    <FolderOutlined /> OU Structure
                  </div>
                  <Progress 
                    type="circle" 
                    percent={Math.min(100, (systemHealth.ouUtilization / 20) * 100)}
                    strokeColor="#f59e0b"
                    width={120}
                    format={() => systemHealth.ouUtilization}
                  />
                  <div className="health-description">
                    {systemHealth.ouUtilization} OUs in System
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Main Content Row */}
      <Row gutter={[16, 16]}>
        {/* Recent Activities */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <HistoryOutlined className="icon-blue" />
                <span>Recent Activities</span>
              </Space>
            }
            className="recent-activities-card"
            extra={
              <Button type="link" onClick={() => navigate('/activity-log')}>
                ดูทั้งหมด →
              </Button>
            }
          >
            {recentActivities.length > 0 ? (
              <Timeline
                items={recentActivities.map(activity => {
                  const getIcon = (actionType) => {
                    if (actionType.includes('user_create')) return <UserAddOutlined className="activity-icon-green" />;
                    if (actionType.includes('user_update')) return <EditOutlined className="activity-icon-blue" />;
                    if (actionType.includes('user_delete')) return <StopOutlined className="activity-icon-red" />;
                    if (actionType.includes('group')) return <TeamOutlined className="activity-icon-purple" />;
                    if (actionType.includes('ou')) return <FolderOutlined className="activity-icon-orange" />;
                    return <InfoCircleOutlined className="activity-icon-blue" />;
                  };

                  const getActionLabel = (actionType) => {
                    const labels = {
                      'user_create': 'สร้างผู้ใช้',
                      'user_update': 'แก้ไขผู้ใช้',
                      'user_delete': 'ลบผู้ใช้',
                      'password_reset': 'รีเซ็ตรหัสผ่าน',
                      'user_status_change': 'เปลี่ยนสถานะ',
                      'group_member_add': 'เพิ่มสมาชิกกลุ่ม',
                      'group_member_remove': 'ลบสมาชิกกลุ่ม',
                      'ou_create': 'สร้าง OU',
                      'ou_update': 'แก้ไข OU',
                      'ou_delete': 'ลบ OU',
                      'user_create_external': '🔔 สร้างผู้ใช้ (AD)',
                      'user_update_external': '🔔 แก้ไขผู้ใช้ (AD)',
                      'user_delete_external': '🔔 ลบผู้ใช้ (AD)'
                    };
                    return labels[actionType] || actionType;
                  };

                  return {
                    dot: getIcon(activity.action_type),
                    children: (
                      <div>
                        <div className="activity-action">
                          {getActionLabel(activity.action_type)}
                        </div>
                        <div className="activity-user">
                          {activity.user_display_name || activity.user_id} → {activity.target_name}
                        </div>
                        <div className="activity-timestamp">
                          <ClockCircleOutlined /> {formatDate(activity.timestamp)}
                        </div>
                      </div>
                    )
                  };
                })}
              />
            ) : (
              <Empty 
                description="ยังไม่มีกิจกรรมล่าสุด"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>

        {/* Department Statistics */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <PieChartOutlined className="icon-purple" />
                <span>Department Distribution (Top 5)</span>
              </Space>
            }
            className="department-stats-card"
            extra={
              <Button 
                type="link" 
                size="small"
                onClick={() => navigate('/users')}
              >
                View All
              </Button>
            }
          >
            {departmentStats.length > 0 ? (
              <List
                dataSource={departmentStats}
                renderItem={(dept, index) => (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <Space>
                          <Avatar 
                            style={{ 
                              backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#06b6d4'][index % 5]
                            }}
                          >
                            {index + 1}
                          </Avatar>
                          <Text strong>{dept.name}</Text>
                        </Space>
                        <Space>
                          <Text type="secondary">{dept.count} users</Text>
                          <Tag color="blue">{dept.percentage}%</Tag>
                        </Space>
                      </div>
                      <Progress 
                        percent={dept.percentage} 
                        strokeColor={['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#06b6d4'][index % 5]}
                        showInfo={false}
                      />
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No department data" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Recent Users Row */}
      <Row gutter={[16, 16]} style={{ marginTop: '20px' }}>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <UserAddOutlined className="icon-green" />
                <span>Recently Created Users</span>
              </Space>
            }
            className="recent-users-card"
            extra={
              <Button 
                type="link" 
                size="small"
                onClick={() => navigate('/users')}
              >
                View All
              </Button>
            }
          >
            {recentUsers.length > 0 ? (
              <List
                dataSource={recentUsers}
                renderItem={(user) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          icon={<UserOutlined />} 
                          style={{ 
                            backgroundColor: user.isEnabled ? '#10b981' : '#ef4444' 
                          }}
                        />
                      }
                      title={
                        <Space>
                          <span>{user.cn || user.displayName}</span>
                          <Tag color={user.isEnabled ? 'success' : 'error'}>
                            {user.isEnabled ? 'Active' : 'Inactive'}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <div>
                            <Text type="secondary">📧 {user.mail || 'No email specified'}</Text>
                          </div>
                          <div>
                            <Text type="secondary">
                              🏢 {user.department || 'No department'}
                            </Text>
                          </div>
                          <div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              <ClockCircleOutlined /> Created: {formatDate(user.whenCreated)}
                            </Text>
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No recent users" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row gutter={[16, 16]} style={{ marginTop: '20px' }}>
        <Col span={24}>
          <Card 
            title={
              <Space>
                <BarChartOutlined className="icon-blue" />
                <span>Quick Actions</span>
              </Space>
            }
            className="quick-actions-card"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<UserAddOutlined />}
                  className="quick-action-button quick-action-button-primary"
                  onClick={() => navigate('/users')}
                  block
                >
                  Manage Users
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button 
                  size="large" 
                  icon={<TeamOutlined />}
                  className="quick-action-button quick-action-button-purple"
                  onClick={() => navigate('/groups')}
                  block
                >
                  Manage Groups
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button 
                  size="large" 
                  icon={<FolderOutlined />}
                  className="quick-action-button quick-action-button-orange"
                  onClick={() => navigate('/ous')}
                  block
                >
                  Manage OUs
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button 
                  size="large" 
                  icon={<PieChartOutlined />}
                  className="quick-action-button quick-action-button-green"
                  onClick={() => window.location.reload()}
                  block
                >
                  Refresh Data
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
