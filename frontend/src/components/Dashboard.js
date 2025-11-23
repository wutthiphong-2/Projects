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
  const [recentLogins, setRecentLogins] = useState([]);
  const [singleLoginUsers, setSingleLoginUsers] = useState([]);
  const [loadingRecentLogins, setLoadingRecentLogins] = useState(false);
  const [loadingSingleLoginUsers, setLoadingSingleLoginUsers] = useState(false);
  const { getAuthHeaders } = useAuth();
  const { notifyError } = useNotification();

  const normalizeString = useCallback((value) => (
    value ? value.toString().trim().toLowerCase() : ''
  ), []);

  const isLikelyNonHumanAccount = useCallback((user) => {
    const username = normalizeString(user.sAMAccountName);
    const display = normalizeString(user.cn || user.displayName);
    const hasEmail = Boolean(user.mail && user.mail.includes('@'));

    if (hasEmail) return false;
    if (username.endsWith('$')) return true;
    if (/^(com|pc|nb|srv|server|ws)\d+/i.test(display)) return true;
    if (/^(com|pc|nb|srv|server|ws)\d+/i.test(username)) return true;
    return false;
  }, [normalizeString]);

  const deriveUniqueUsers = useCallback((userList) => {
    const seenKeys = new Map();

    const scoreUser = (user) => {
      let score = 0;
      if (user.mail) score += 2;
      if (user.department) score += 1;
      if (user.company) score += 1;
      if (user.telephoneNumber || user.mobile) score += 1;
      if (user.description) score += 0.5;
      if (user.isEnabled) score += 0.5;
      return score;
    };

    userList.forEach(user => {
      const nameKey = normalizeString(user.cn || user.displayName);
      const usernameKey = normalizeString(user.sAMAccountName);
      const key = nameKey || usernameKey || user.dn || `temp-${Math.random()}`;

      const currentScore = scoreUser(user);
      const existing = seenKeys.get(key);
      if (!existing || currentScore > existing.score) {
        seenKeys.set(key, { user, score: currentScore });
      }
    });

    return Array.from(seenKeys.values()).map(entry => entry.user);
  }, [normalizeString]);

  const fetchAllUsers = useCallback(async () => {
    const PAGE_SIZE = 1000;
    const allUsers = [];
    let currentPage = 1;
    let keepFetching = true;

    while (keepFetching) {
      const response = await axios.get(`${config.apiUrl}/api/users/`, {
        headers: getAuthHeaders(),
        params: { page: currentPage, page_size: PAGE_SIZE },
        timeout: 0 // No timeout
      });

      const pageData = response.data || [];
      allUsers.push(...pageData);

      if (pageData.length < PAGE_SIZE) {
        keepFetching = false;
      } else {
        currentPage += 1;
      }
    }

    return allUsers;
  }, [getAuthHeaders]);

  const processUsers = useCallback((rawUsers) => {
    const humanUsers = rawUsers.filter(user => !isLikelyNonHumanAccount(user));
    const uniqueUsers = deriveUniqueUsers(humanUsers);

    return {
      rawUsers,
      humanUsers,
      uniqueUsers,
      filteredOutSystemCount: rawUsers.length - humanUsers.length,
      duplicatesRemovedCount: humanUsers.length - uniqueUsers.length
    };
  }, [deriveUniqueUsers, isLikelyNonHumanAccount]);

  const fetchStats = useCallback(async () => {
    try {
      const [countsResponse, groupsResponse, ousResponse, departmentsResponse, activitiesResponse] = await Promise.all([
        axios.get(`${config.apiUrl}/api/users/stats`, {
          headers: getAuthHeaders(),
          timeout: 0 // No timeout
        }),
        axios.get(`${config.apiUrl}/api/groups`, { 
          headers: getAuthHeaders(), 
          params: { page: 1, page_size: 1000 },
          timeout: 0 // No timeout
        }),
        axios.get(`${config.apiUrl}/api/ous`, { 
          headers: getAuthHeaders(), 
          params: { page: 1, page_size: 1000 },
          timeout: 0 // No timeout
        }),
        axios.get(`${config.apiUrl}/api/users/departments`, { 
          headers: getAuthHeaders(),
          timeout: 0 // No timeout
        }),
        axios.get(`${config.apiUrl}/api/activity-logs/recent`, {
          timeout: 0, // No timeout
          headers: getAuthHeaders(),
          params: { limit: 10 }
        }).catch(() => ({ data: [] }))
      ]);

      const countsData = countsResponse.data || {};
      const totalUsers = countsData.total_users ?? 0;
      const enabledUsers = countsData.enabled_users ?? 0;
      const disabledUsers = countsData.disabled_users ?? 0;
      
      setStats({
        totalUsers,
        enabledUsers,
        disabledUsers,
        totalGroups: groupsResponse.data.length,
        totalOUs: ousResponse.data.length,
        totalDepartments: departmentsResponse.data.length
      });
      
      setRecentActivities(activitiesResponse.data || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [getAuthHeaders]);

  const fetchRecentLoginInsights = useCallback(async () => {
    setLoadingRecentLogins(true);
    try {
      const response = await axios.get(`${config.apiUrl}/api/users/login-insights/recent`, {
        headers: getAuthHeaders(),
        params: { limit: 10 },
        timeout: 0 // No timeout
      });
      setRecentLogins(response.data || []);
    } catch (error) {
      console.error('Error fetching recent login insights:', error);
      notifyError('โหลดข้อมูลไม่สำเร็จ', 'ไม่สามารถโหลดรายชื่อผู้ที่ล็อกอินล่าสุดได้');
    } finally {
      setLoadingRecentLogins(false);
    }
  }, [getAuthHeaders, notifyError]);

  const fetchSingleLoginInsights = useCallback(async () => {
    setLoadingSingleLoginUsers(true);
    try {
      const response = await axios.get(`${config.apiUrl}/api/users/login-insights/never`, {
        headers: getAuthHeaders(),
        params: { limit: 10 },
        timeout: 0 // No timeout
      });
      setSingleLoginUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching single-login insights:', error);
      notifyError('โหลดข้อมูลไม่สำเร็จ', 'ไม่สามารถโหลดรายชื่อผู้ใช้ที่ล็อกอินครั้งเดียวได้');
    } finally {
      setLoadingSingleLoginUsers(false);
    }
  }, [getAuthHeaders, notifyError]);

  const fetchDepartmentStats = useCallback(async () => {
    try {
      const [usersResponse] = await Promise.all([
        axios.get(`${config.apiUrl}/api/users/`, { 
          headers: getAuthHeaders(), 
          params: { page: 1, page_size: 1000 },
          timeout: 0 // No timeout
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
  }, [getAuthHeaders]);

  const fetchRecentUsers = useCallback(async () => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/users/`, { 
        headers: getAuthHeaders(), 
        params: { page: 1, page_size: 1000 },
        timeout: 0 // No timeout
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
  }, [getAuthHeaders]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchDepartmentStats(),
        fetchRecentUsers(),
        fetchRecentLoginInsights(),
        fetchSingleLoginInsights()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchStats, fetchDepartmentStats, fetchRecentUsers, fetchRecentLoginInsights, fetchSingleLoginInsights]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  if (loading) {
    return (
      <div className="dashboard-loading" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>
          Loading data...
        </div>
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
        <Title level={3} className="dashboard-title" style={{ 
          marginBottom: 8,
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          fontSize: '32px'
        }}>
          <BarChartOutlined style={{ marginRight: 12, color: 'rgba(255, 255, 255, 0.9)' }} />
          Active Directory Dashboard
        </Title>
        <Text className="dashboard-subtitle" style={{ fontSize: '15px', fontWeight: 500 }}>
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
              prefix={<UserOutlined style={{ fontSize: '28px' }} />}
              valueStyle={{ fontSize: '32px', fontWeight: 700 }}
            />
            <Progress 
              percent={stats.totalUsers > 0 ? Math.round((stats.enabledUsers / stats.totalUsers) * 100) : 0}
              size="small" 
              strokeColor="#10b981"
              className="stat-progress"
              showInfo={false}
            />
            <div className="stat-description">
              <Space split={<span style={{ color: '#9ca3af' }}>•</span>} size="small">
                <Text style={{ color: '#374151', fontSize: '13px' }}>
                  <CheckCircleOutlined style={{ color: '#10b981' }} /> {stats.enabledUsers} Enabled
                </Text>
                <Text style={{ color: '#374151', fontSize: '13px' }}>
                  <StopOutlined style={{ color: '#ef4444' }} /> {stats.disabledUsers} Disabled
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
              prefix={<TeamOutlined style={{ fontSize: '28px' }} />}
              valueStyle={{ fontSize: '32px', fontWeight: 700 }}
            />
            <div className="stat-description" style={{ marginTop: '12px' }}>
              <Text style={{ color: '#374151', fontSize: '13px' }}>
                <TeamOutlined style={{ color: '#11998e' }} /> Security & Distribution Groups
              </Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card-warning" hoverable>
            <Statistic
              title="Organizational Units"
              value={stats.totalOUs}
              prefix={<FolderOutlined style={{ fontSize: '28px' }} />}
              valueStyle={{ fontSize: '32px', fontWeight: 700 }}
            />
            <div className="stat-description" style={{ marginTop: '12px' }}>
              <Text style={{ color: '#374151', fontSize: '13px' }}>
                <FolderOutlined style={{ color: '#f093fb' }} /> Units in Structure
              </Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card-info" hoverable>
            <Statistic
              title="Total Departments"
              value={stats.totalDepartments}
              prefix={<BarChartOutlined style={{ fontSize: '28px' }} />}
              valueStyle={{ fontSize: '32px', fontWeight: 700 }}
            />
            <div className="stat-description" style={{ marginTop: '12px' }}>
              <Text style={{ color: '#374151', fontSize: '13px' }}>
                <BankOutlined style={{ color: '#fa709a' }} /> Active Departments
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Login Insights */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined className="icon-blue" />
                <span>Latest User Logins (Top 10)</span>
              </Space>
            }
            extra={
              <Button type="link" onClick={fetchRecentLoginInsights} loading={loadingRecentLogins}>
                รีเฟรช
              </Button>
            }
          >
            {loadingRecentLogins ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Spin />
              </div>
            ) : recentLogins.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={recentLogins}
                renderItem={(item, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={
                        <Space size={6}>
                          <Text strong>{index + 1}.</Text>
                          <span>{item.display_name || item.username || 'ไม่ระบุชื่อ'}</span>
                          {item.department && (
                            <Tag color="blue" style={{ marginLeft: 4 }}>
                              {item.department}
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space size="small" split={<span>•</span>} wrap>
                          {item.username && (
                            <Text type="secondary">Username: {item.username}</Text>
                          )}
                          <Text type="secondary">
                            Last Login: {formatDate(item.last_login)}
                          </Text>
                          {item.logon_count !== undefined && (
                            <Text type="secondary">Logons: {item.logon_count}</Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="ไม่พบข้อมูลการล็อกอินล่าสุด" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ExclamationCircleOutlined className="icon-orange" />
                <span>Logged Once & Never Returned (Top 10)</span>
              </Space>
            }
            extra={
              <Button type="link" onClick={fetchSingleLoginInsights} loading={loadingSingleLoginUsers}>
                รีเฟรช
              </Button>
            }
          >
            {loadingSingleLoginUsers ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Spin />
              </div>
            ) : singleLoginUsers.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={singleLoginUsers}
                renderItem={(item, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={
                        <Space size={6}>
                          <Text strong>{index + 1}.</Text>
                          <span>{item.display_name || item.username || 'ไม่ระบุชื่อ'}</span>
                          {item.department && (
                            <Tag color="gold" style={{ marginLeft: 4 }}>
                              {item.department}
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space size="small" split={<span>•</span>} wrap>
                          {item.username && (
                            <Text type="secondary">Username: {item.username}</Text>
                          )}
                          <Text type="secondary">
                            First Login: {formatDate(item.first_login)}
                          </Text>
                          <Text type="secondary">
                            Last Login: {formatDate(item.last_login)}
                          </Text>
                          {item.logon_count !== undefined && (
                            <Text type="secondary">Logons: {item.logon_count}</Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="ไม่พบผู้ใช้ที่ล็อกอินครั้งเดียว" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
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

        {/* Recently Created Users */}
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
