import React, { useState, useMemo } from 'react';
import {
  Drawer,
  Tabs,
  Card,
  Descriptions,
  Typography,
  Tag,
  Space,
  Row,
  Col,
  Input,
  Select,
  Button,
  List,
  Avatar,
  Badge,
  Empty,
  Popconfirm,
  message
} from 'antd';
import {
  UserOutlined,
  IdcardOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  KeyOutlined,
  SearchOutlined,
  FilterOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { GROUP_DEFAULTS_CONFIG, getCategoryStatistics } from '../../config/groupDefaults';
import { formatErrorDetail } from '../../utils/userManagementHelpers';
import { handleApiError } from '../../utils/errorHandler';
import { ERROR_MESSAGES } from '../../constants/userManagement';

const { Option } = Select;
const { Text } = Typography;

const UserDetailsDrawer = ({
  visible,
  onClose,
  user,
  userGroups = [],
  userPermissions = [],
  loginHistory = [],
  passwordExpiry = null,
  categorizedGroups = {},
  onManageGroups,
  onQuickAddGroup,
  onRemoveFromGroup,
  fetchUserDetails,
  notifyError,
  getResponsiveWidth
}) => {
  const [groupSearchText, setGroupSearchText] = useState('');
  const [groupCategoryFilter, setGroupCategoryFilter] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState(
    new Set(GROUP_DEFAULTS_CONFIG.display.expandCategories)
  );

  // Calculate category stats
  const categoryStats = useMemo(() => {
    if (userGroups.length > 0 && Object.keys(categorizedGroups).length > 0) {
      return getCategoryStatistics(userGroups, categorizedGroups);
    }
    return {};
  }, [userGroups, categorizedGroups]);

  // Create tabs items
  const tabsItems = useMemo(() => {
    if (!user) return [];
    
    return [
      {
        key: '1',
        label: (
          <span>
            <IdcardOutlined />
            Basic Info
          </span>
        ),
        children: (
          <>
            <Card
              size="small"
              style={{
                marginBottom: 16,
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 8
              }}
              styles={{ body: { padding: 0 } }}
            >
              <Descriptions
                column={1}
                bordered
                size="middle"
                styles={{
                  label: {
                    background: '#f8fafc',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: 13,
                    width: '35%'
                  },
                  content: {
                    background: '#ffffff',
                    color: '#1f2937'
                  }
                }}
              >
                <Descriptions.Item label="Display Name">
                  <Text strong style={{ fontSize: 14 }}>
                    {user.displayName || user.cn || 'N/A'}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Username">
                  <Text copyable code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 4 }}>
                    {user.sAMAccountName}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {user.mail ? (
                    <Text copyable style={{ fontSize: 13 }}>{user.mail}</Text>
                  ) : (
                    <Text type="secondary">-</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag
                    icon={user.isEnabled ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    color={user.isEnabled ? 'success' : 'error'}
                    style={{ fontWeight: 600, padding: '6px 14px', borderRadius: 20 }}
                  >
                    {user.isEnabled ? 'Active' : 'Disabled'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="First Name">
                  {user.givenName ? (
                    <Text style={{ fontSize: 13 }}>{user.givenName}</Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Last Name">
                  {user.sn ? (
                    <Text style={{ fontSize: 13 }}>{user.sn}</Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Job Title">
                  {user.title ? (
                    <Text style={{ fontSize: 13 }}>{user.title}</Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Department">
                  {user.department ? (
                    <Tag
                      style={{
                        background: '#eff6ff',
                        color: '#1e40af',
                        border: '1px solid #bfdbfe',
                        padding: '4px 12px'
                      }}
                    >
                      {user.department}
                    </Tag>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Company">
                  {user.company ? (
                    <Text style={{ fontSize: 13 }}>{user.company}</Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Employee ID">
                  {user.employeeID ? (
                    <Text code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 4 }}>
                      {user.employeeID}
                    </Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Extension Name">
                  {(() => {
                    // Debug: Log extensionName in development
                    if (process.env.NODE_ENV === 'development') {
                      console.debug('[UserDetailsDrawer] Extension Name Debug (Basic Info)', {
                        hasExtensionName: 'extensionName' in user,
                        extensionName: user.extensionName,
                        extensionNameType: typeof user.extensionName,
                        isEmpty: !user.extensionName || user.extensionName === '',
                        isNull: user.extensionName === null,
                        isUndefined: user.extensionName === undefined,
                        allKeys: Object.keys(user).filter(k => k.toLowerCase().includes('ext') || k.toLowerCase().includes('dept'))
                      });
                    }
                    
                    // Check for extensionName with multiple possible field names
                    const extensionName = user.extensionName || user.extension_name || user.departmentNumber || user.department_number;
                    
                    return extensionName ? (
                      <Text code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 4 }}>
                        {extensionName}
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    );
                  })()}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {user.telephoneNumber ? (
                    <Text copyable style={{ fontSize: 13 }}>
                      <PhoneOutlined style={{ marginRight: 6, color: '#10b981' }} />
                      {user.telephoneNumber}
                    </Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Mobile">
                  {user.mobile ? (
                    <Text copyable style={{ fontSize: 13 }}>
                      <PhoneOutlined style={{ marginRight: 6, color: '#10b981' }} />
                      {user.mobile}
                    </Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Office Location">
                  {user.physicalDeliveryOfficeName ? (
                    <Text style={{ fontSize: 13 }}>
                      <EnvironmentOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
                      {user.physicalDeliveryOfficeName}
                    </Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Description">
                  {user.description ? (
                    <Text style={{ fontSize: 13 }}>{user.description}</Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Distinguished Name">
                  <Text
                    copyable
                    code
                    style={{
                      fontSize: 11,
                      wordBreak: 'break-all',
                      background: '#f3f4f6',
                      padding: '4px 8px',
                      borderRadius: 4,
                      display: 'block'
                    }}
                  >
                    {user.dn}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Account Created">
                  {user.whenCreated ? (
                    <Text style={{ fontSize: 13 }}>
                      <ClockCircleOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
                      {new Date(user.whenCreated).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Last Modified">
                  {user.whenChanged ? (
                    <Text style={{ fontSize: 13 }}>
                      <ClockCircleOutlined style={{ marginRight: 6, color: '#f59e0b' }} />
                      {new Date(user.whenChanged).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Password Last Set">
                  {(() => {
                    if (!user.pwdLastSet || user.pwdLastSet === '0' || user.pwdLastSet === '') {
                      return (
                        <Tag color="default" style={{ fontSize: 12 }}>
                          <KeyOutlined style={{ marginRight: 4 }} />
                          ยังไม่เคยตั้ง
                        </Tag>
                      );
                    }
                    
                    try {
                      const pwdDate = dayjs(user.pwdLastSet);
                      if (!pwdDate.isValid()) {
                        return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
                      }
                      
                      const now = dayjs();
                      const daysAgo = now.diff(pwdDate, 'day');
                      
                      let tagColor = 'default';
                      if (daysAgo > 180) tagColor = 'error';
                      else if (daysAgo > 90) tagColor = 'warning';
                      else if (daysAgo > 30) tagColor = 'processing';
                      else tagColor = 'success';
                      
                      return (
                        <div>
                          <Text style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                            {pwdDate.format('DD/MM/YYYY')}
                          </Text>
                          <Tag color={tagColor} style={{ fontSize: 11 }}>
                            {daysAgo} วันที่แล้ว
                          </Tag>
                        </div>
                      );
                    } catch (error) {
                      return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
                    }
                  })()}
                </Descriptions.Item>
                <Descriptions.Item label="Last Login">
                  {(() => {
                    if (!user.lastLogon || user.lastLogon === '0' || user.lastLogon === '') {
                      return (
                        <Tag color="default" style={{ fontSize: 12 }}>
                          <HistoryOutlined style={{ marginRight: 4 }} />
                          ไม่เคยเข้าสู่ระบบ
                        </Tag>
                      );
                    }
                    
                    try {
                      const logonDate = dayjs(user.lastLogon);
                      if (!logonDate.isValid()) {
                        return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
                      }
                      
                      const now = dayjs();
                      const daysAgo = now.diff(logonDate, 'day');
                      const hoursAgo = now.diff(logonDate, 'hour');
                      const minutesAgo = now.diff(logonDate, 'minute');
                      
                      let timeAgoText = '';
                      if (daysAgo > 0) {
                        timeAgoText = `${daysAgo} วันที่แล้ว`;
                      } else if (hoursAgo > 0) {
                        timeAgoText = `${hoursAgo} ชั่วโมงที่แล้ว`;
                      } else if (minutesAgo > 0) {
                        timeAgoText = `${minutesAgo} นาทีที่แล้ว`;
                      } else {
                        timeAgoText = 'เมื่อสักครู่';
                      }
                      
                      let tagColor = 'default';
                      if (daysAgo > 90) tagColor = 'error';
                      else if (daysAgo > 30) tagColor = 'warning';
                      else if (daysAgo > 7) tagColor = 'processing';
                      else tagColor = 'success';
                      
                      return (
                        <div>
                          <Text style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                            {logonDate.format('DD/MM/YYYY')}
                          </Text>
                          <Tag color={tagColor} style={{ fontSize: 11 }}>
                            {timeAgoText}
                          </Tag>
                        </div>
                      );
                    } catch (error) {
                      return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
                    }
                  })()}
                </Descriptions.Item>
                <Descriptions.Item label="Account Expires">
                  {(() => {
                    if (!user.accountExpires || user.accountExpires === '0' || user.accountExpires === '' || user.accountExpires === null || user.accountExpires === undefined) {
                      return (
                        <Tag color="default" style={{ fontSize: 12 }}>
                          <CheckCircleOutlined style={{ marginRight: 4 }} />
                          ไม่หมดอายุ
                        </Tag>
                      );
                    }
                    
                    try {
                      const expiryDate = dayjs(user.accountExpires);
                      if (!expiryDate.isValid()) {
                        return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
                      }
                      
                      const now = dayjs();
                      const daysRemaining = expiryDate.diff(now, 'day');
                      
                      // Check if expired
                      if (daysRemaining < 0) {
                        const daysExpired = Math.abs(daysRemaining);
                        return (
                          <div>
                            <Text style={{ fontSize: 13, display: 'block', marginBottom: 4, color: '#ef4444' }}>
                              {expiryDate.format('DD/MM/YYYY')}
                            </Text>
                            <Tag color="error" style={{ fontSize: 11 }}>
                              <CloseCircleOutlined style={{ marginRight: 4 }} />
                              หมดอายุแล้ว ({daysExpired} วัน)
                            </Tag>
                          </div>
                        );
                      }
                      
                      // Check if expiring soon
                      if (daysRemaining <= 7) {
                        return (
                          <div>
                            <Text style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                              {expiryDate.format('DD/MM/YYYY')}
                            </Text>
                            <Tag color="error" style={{ fontSize: 11 }}>
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              เหลือ {daysRemaining} วัน
                            </Tag>
                          </div>
                        );
                      } else if (daysRemaining <= 30) {
                        return (
                          <div>
                            <Text style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                              {expiryDate.format('DD/MM/YYYY')}
                            </Text>
                            <Tag color="warning" style={{ fontSize: 11 }}>
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              เหลือ {daysRemaining} วัน
                            </Tag>
                          </div>
                        );
                      } else {
                        return (
                          <div>
                            <Text style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                              {expiryDate.format('DD/MM/YYYY')}
                            </Text>
                            <Tag color="success" style={{ fontSize: 11 }}>
                              <CheckCircleOutlined style={{ marginRight: 4 }} />
                              เหลือ {daysRemaining} วัน
                            </Tag>
                          </div>
                        );
                      }
                    } catch (error) {
                      return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
                    }
                  })()}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Additional Address Information */}
            <Card
              size="small"
              title={
                <Text strong style={{ fontSize: 13 }}>
                  <EnvironmentOutlined style={{ marginRight: 8, color: '#3b82f6' }} />
                  Address Information
                </Text>
              }
              style={{
                marginBottom: 16,
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 8
              }}
              styles={{
                header: {
                  background: '#f8fafc',
                  borderBottom: '1px solid #e5e7eb'
                },
                body: { padding: 0 }
              }}
            >
              <Descriptions
                column={1}
                bordered
                size="middle"
                styles={{
                  label: {
                    background: '#f8fafc',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: 13,
                    width: '35%'
                  },
                  content: {
                    background: '#ffffff',
                    color: '#1f2937'
                  }
                }}
              >
                <Descriptions.Item label="Extension Name">
                  {(() => {
                    // Check for extensionName with multiple possible field names
                    const extensionName = user.extensionName || user.extension_name || user.departmentNumber || user.department_number;
                    
                    return extensionName ? (
                      <Text code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 4 }}>
                        {extensionName}
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    );
                  })()}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </>
        )
      },
      {
        key: '2',
        label: (
          <span>
            <TeamOutlined />
            Groups ({userGroups.length})
          </span>
        ),
        children: (
          <>
            {/* Statistics Cards */}
            {Object.keys(categoryStats).length > 0 && (
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {Object.entries(categoryStats)
                  .filter(([_, stats]) => stats.total > 0)
                  .slice(0, 4)
                  .map(([category, stats]) => (
                    <Col span={6} key={category}>
                      <div
                        style={{
                          background: stats.color.gradient,
                          borderRadius: 8,
                          padding: '12px',
                          textAlign: 'center',
                          cursor: GROUP_DEFAULTS_CONFIG.display.statsClickable ? 'pointer' : 'default',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        onClick={() => {
                          if (GROUP_DEFAULTS_CONFIG.display.statsClickable) {
                            setGroupCategoryFilter(category);
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 4 }}>
                          {stats.color.icon}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: stats.color.textColor }}>
                          {stats.count}/{stats.total}
                        </div>
                        <div style={{ fontSize: 11, color: stats.color.textColor, opacity: 0.9, fontWeight: 600 }}>
                          {category}
                        </div>
                      </div>
                    </Col>
                  ))}
              </Row>
            )}

            {/* Action Bar with Search, Filter, Quick Add */}
            <div style={{ marginBottom: 16 }}>
              <Row gutter={[8, 8]} align="middle">
                <Col flex="auto">
                  <Input
                    placeholder="Search groups..."
                    prefix={<SearchOutlined />}
                    allowClear
                    value={groupSearchText}
                    onChange={(e) => setGroupSearchText(e.target.value)}
                    style={{ borderRadius: 6 }}
                  />
                </Col>
                <Col>
                  <Select
                    value={groupCategoryFilter}
                    onChange={setGroupCategoryFilter}
                    style={{ width: 140 }}
                    suffixIcon={<FilterOutlined />}
                  >
                    <Option value="all">All Categories</Option>
                    {Object.keys(categorizedGroups).map(cat => (
                      <Option key={cat} value={cat}>{cat}</Option>
                    ))}
                  </Select>
                </Col>
                <Col>
                  <Select
                    value="quickAdd"
                    onChange={(groupDn) => {
                      if (groupDn && groupDn !== 'quickAdd' && groupDn !== 'manage') {
                        let groupName = 'Unknown';
                        Object.values(categorizedGroups).forEach(categoryGroups => {
                          const group = categoryGroups.find(g => g.dn === groupDn);
                          if (group) groupName = group.cn;
                        });
                        if (onQuickAddGroup) {
                          onQuickAddGroup(groupDn, groupName);
                        }
                      } else if (groupDn === 'manage' && onManageGroups) {
                        onManageGroups(user);
                      }
                    }}
                    style={{ width: 140 }}
                    styles={{ popup: { root: { minWidth: 200 } } }}
                  >
                    <Option value="quickAdd" disabled>
                      <TeamOutlined /> Quick Add
                    </Option>
                    <Option value="manage" style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <TeamOutlined /> Manage All...
                    </Option>
                    {GROUP_DEFAULTS_CONFIG.quickAdd.popularGroups.map(groupName => {
                      let groupDn = null;
                      Object.values(categorizedGroups).forEach(categoryGroups => {
                        const group = categoryGroups.find(g => g.cn === groupName);
                        if (group) groupDn = group.dn;
                      });
                      
                      if (!groupDn) return null;
                      
                      const isMember = userGroups.some(g => g.dn === groupDn);
                      
                      return (
                        <Option key={groupDn} value={groupDn} disabled={isMember}>
                          {isMember ? '✓ ' : '+ '}{groupName}
                        </Option>
                      );
                    })}
                  </Select>
                </Col>
                <Col>
                  <Button
                    type="primary"
                    icon={<TeamOutlined />}
                    onClick={() => onManageGroups && onManageGroups(user)}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      border: 'none',
                      fontWeight: 600,
                      borderRadius: 6
                    }}
                  >
                    Manage
                  </Button>
                </Col>
              </Row>
            </div>

            {/* Categorized Groups View */}
            <div>
              {userGroups.length > 0 ? (
                <>
                  {Object.keys(categorizedGroups).length > 0 && Object.values(categorizedGroups).some(cat => Array.isArray(cat) && cat.length > 0) ? (
                    GROUP_DEFAULTS_CONFIG.sort.priorityOrder.map(category => {
                      const categoryGroupsInUser = userGroups.filter(group => {
                        let belongsToCategory = false;
                        if (categorizedGroups[category]) {
                          belongsToCategory = categorizedGroups[category].some(cg => cg.dn === group.dn);
                        }
                        
                        if (!belongsToCategory) return false;
                        
                        if (groupSearchText) {
                          return group.cn.toLowerCase().includes(groupSearchText.toLowerCase());
                        }
                        
                        if (groupCategoryFilter !== 'all' && category !== groupCategoryFilter) {
                          return false;
                        }
                        
                        return true;
                      });
                      
                      if (GROUP_DEFAULTS_CONFIG.display.hideEmpty && categoryGroupsInUser.length === 0) {
                        return null;
                      }
                    
                    const isExpanded = expandedCategories.has(category);
                    const itemsToShow = isExpanded ? categoryGroupsInUser : categoryGroupsInUser.slice(0, GROUP_DEFAULTS_CONFIG.display.itemsPerCategory);
                    const hasMore = categoryGroupsInUser.length > GROUP_DEFAULTS_CONFIG.display.itemsPerCategory;
                    
                    return (
                      <Card
                        key={category}
                        size="small"
                        style={{
                          marginBottom: 12,
                          background: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: 8
                        }}
                        styles={{
                          header: {
                            background: '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
                            cursor: 'pointer',
                            padding: '12px 16px'
                          },
                          body: { padding: categoryGroupsInUser.length > 0 ? '12px' : '0' }
                        }}
                        title={
                          <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onClick={() => {
                              const newExpanded = new Set(expandedCategories);
                              if (isExpanded) {
                                newExpanded.delete(category);
                              } else {
                                newExpanded.add(category);
                              }
                              setExpandedCategories(newExpanded);
                            }}
                          >
                            <Space>
                              <Text strong style={{ fontSize: 13 }}>
                                {categoryStats[category]?.color?.icon || '📦'} {category}
                              </Text>
                              <Badge 
                                count={categoryGroupsInUser.length} 
                                style={{ 
                                  background: categoryStats[category]?.color?.gradient || '#64748b',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }} 
                              />
                            </Space>
                            <Text type="secondary">
                              {isExpanded ? '▼' : '▶'}
                            </Text>
                          </div>
                        }
                      >
                        {categoryGroupsInUser.length > 0 && (
                          <>
                            <List
                              dataSource={itemsToShow}
                              renderItem={(group) => (
                                <List.Item 
                                  style={{ borderBottom: '1px solid #f3f4f6', padding: '12px 8px' }}
                                  actions={[
                                    <Popconfirm
                                      key="remove"
                                      title={`Remove from "${group.cn}"?`}
                                      description="Are you sure?"
                                      onConfirm={() => {
                                        if (onRemoveFromGroup) {
                                          onRemoveFromGroup(group.dn, group.cn);
                                        }
                                      }}
                                      okText="Yes"
                                      cancelText="No"
                                      okButtonProps={{ danger: true }}
                                    >
                                      <Button 
                                        type="text" 
                                        danger 
                                        size="small"
                                        icon={<DeleteOutlined />}
                                      >
                                        Remove
                                      </Button>
                                    </Popconfirm>
                                  ]}
                                >
                                  <List.Item.Meta
                                    avatar={
                                      <Avatar
                                        icon={<TeamOutlined />}
                                        style={{ background: '#fa8c16' }}
                                      />
                                    }
                                    title={<Text strong style={{ fontSize: 13 }}>{group.cn}</Text>}
                                    description={
                                      <Text
                                        style={{
                                          fontSize: 11,
                                          color: '#9ca3af',
                                          wordBreak: 'break-all'
                                        }}
                                      >
                                        {group.dn}
                                      </Text>
                                    }
                                  />
                                </List.Item>
                              )}
                            />
                            {hasMore && !isExpanded && (
                              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                                <Button 
                                  type="link" 
                                  size="small"
                                  onClick={() => {
                                    const newExpanded = new Set(expandedCategories);
                                    newExpanded.add(category);
                                    setExpandedCategories(newExpanded);
                                  }}
                                >
                                  Show {categoryGroupsInUser.length - GROUP_DEFAULTS_CONFIG.display.itemsPerCategory} more...
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </Card>
                    );
                  })
                  ) : (
                    <Card
                      size="small"
                      style={{
                        marginBottom: 12,
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8
                      }}
                      title={
                        <Space>
                          <Text strong style={{ fontSize: 13 }}>
                            📦 All Groups ({userGroups.length})
                          </Text>
                        </Space>
                      }
                    >
                      <List
                        dataSource={userGroups.filter(group => {
                          if (groupSearchText) {
                            return group.cn.toLowerCase().includes(groupSearchText.toLowerCase());
                          }
                          return true;
                        })}
                        renderItem={(group) => (
                          <List.Item 
                            style={{ borderBottom: '1px solid #f3f4f6', padding: '12px 8px' }}
                            actions={[
                              <Popconfirm
                                key="remove"
                                title={`Remove from "${group.cn}"?`}
                                description="Are you sure?"
                                onConfirm={() => {
                                  if (onRemoveFromGroup) {
                                    onRemoveFromGroup(group.dn, group.cn);
                                  }
                                }}
                                okText="Yes"
                                cancelText="No"
                                okButtonProps={{ danger: true }}
                              >
                                <Button 
                                  type="text" 
                                  danger 
                                  size="small"
                                  icon={<DeleteOutlined />}
                                >
                                  Remove
                                </Button>
                              </Popconfirm>
                            ]}
                          >
                            <List.Item.Meta
                              avatar={
                                <Avatar
                                  icon={<TeamOutlined />}
                                  style={{ background: '#fa8c16' }}
                                />
                              }
                              title={<Text strong style={{ fontSize: 13 }}>{group.cn}</Text>}
                              description={
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: '#9ca3af',
                                    wordBreak: 'break-all'
                                  }}
                                >
                                  {group.dn}
                                </Text>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </Card>
                  )}
                </>
              ) : (
                <Empty
                  description={<Text style={{ color: '#6b7280' }}>No group memberships</Text>}
                  style={{ padding: '40px 0' }}
                />
              )}
            </div>
          </>
        )
      },
      {
        key: '3',
        label: (
          <span>
            <SafetyCertificateOutlined />
            Permissions
          </span>
        ),
        children: (
          <Card
            size="small"
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 8
            }}
            styles={{ body: { padding: '12px' } }}
          >
            {userPermissions.length > 0 ? (
              <List
                dataSource={userPermissions}
                renderItem={(perm) => (
                  <List.Item style={{ borderBottom: '1px solid #f3f4f6', padding: '12px 8px' }}>
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          icon={<SafetyCertificateOutlined />}
                          style={{
                            background:
                              perm.level === 'admin' ? '#ef4444' :
                              perm.level === 'manager' ? '#f59e0b' : '#3b82f6'
                          }}
                        />
                      }
                      title={<Text strong style={{ fontSize: 13 }}>{perm.name}</Text>}
                      description={
                        <div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                            {perm.description}
                          </div>
                          <Space>
                            <Tag
                              style={{
                                background:
                                  perm.level === 'admin' ? '#fef2f2' :
                                  perm.level === 'manager' ? '#fef3c7' : '#eff6ff',
                                color:
                                  perm.level === 'admin' ? '#991b1b' :
                                  perm.level === 'manager' ? '#92400e' : '#1e40af',
                                border:
                                  perm.level === 'admin' ? '1px solid #fca5a5' :
                                  perm.level === 'manager' ? '1px solid #fcd34d' : '1px solid #bfdbfe'
                              }}
                            >
                              {perm.level.toUpperCase()}
                            </Tag>
                            <Tag style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                              {perm.source}
                            </Tag>
                          </Space>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                description={<Text style={{ color: '#6b7280' }}>No special permissions</Text>}
                style={{ padding: '40px 0' }}
              />
            )}
          </Card>
        )
      },
      {
        key: '4',
        label: (
          <span>
            <HistoryOutlined />
            Login History
          </span>
        ),
        children: (
          <>
            {/* Password Expiry Info */}
            {passwordExpiry && (passwordExpiry.expiryDate || passwordExpiry.daysRemaining !== null) && (
              <Card
                size="small"
                style={{
                  marginBottom: 16,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8
                }}
                styles={{ body: { padding: '16px' } }}
              >
                <div style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 14, color: '#1f2937' }}>
                    <KeyOutlined style={{ marginRight: 8, color: '#f59e0b' }} />
                    Password Information
                  </Text>
                </div>
                <Row gutter={12}>
                  {passwordExpiry.daysRemaining !== null && (
                    <Col span={8}>
                      <div style={{
                        textAlign: 'center',
                        padding: '12px',
                        background: passwordExpiry.daysRemaining < 7 ? '#fef2f2' : '#fef3c7',
                        border: `2px solid ${passwordExpiry.daysRemaining < 7 ? '#fca5a5' : '#fcd34d'}`,
                        borderRadius: 8
                      }}>
                        <div style={{
                          fontSize: 24,
                          fontWeight: 700,
                          color: passwordExpiry.daysRemaining < 7 ? '#ef4444' : '#f59e0b',
                          marginBottom: 4
                        }}>
                          {passwordExpiry.daysRemaining}
                        </div>
                        <Text style={{
                          fontSize: 11,
                          color: '#6b7280',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}>
                          Days Until Expiry
                        </Text>
                      </div>
                    </Col>
                  )}
                  {passwordExpiry.expiryDate && (
                    <Col span={passwordExpiry.daysRemaining !== null ? 16 : 24}>
                      <Descriptions
                        column={1}
                        size="small"
                        styles={{
                          label: { fontSize: 12, color: '#6b7280', fontWeight: 600 },
                          content: { fontSize: 12, color: '#1f2937' }
                        }}
                      >
                        {passwordExpiry.createdDate && (
                          <Descriptions.Item label="Password Set">
                            {new Date(passwordExpiry.createdDate).toLocaleDateString('th-TH')}
                          </Descriptions.Item>
                        )}
                        <Descriptions.Item label="Expires On">
                          {new Date(passwordExpiry.expiryDate).toLocaleDateString('th-TH')}
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                  )}
                </Row>
              </Card>
            )}

            {/* Login History */}
            <Card
              size="small"
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 8
              }}
              styles={{ body: { padding: '12px' } }}
            >
              <div style={{ marginBottom: 12, padding: '0 8px' }}>
                <Text strong style={{ fontSize: 14, color: '#1f2937' }}>
                  <ClockCircleOutlined style={{ marginRight: 8, color: '#3b82f6' }} />
                  Recent Login Activity
                </Text>
              </div>
              {loginHistory.length > 0 ? (
                <List
                  dataSource={loginHistory}
                  renderItem={(log) => (
                    <List.Item style={{ borderBottom: '1px solid #f3f4f6', padding: '12px 8px' }}>
                      <List.Item.Meta
                        avatar={
                          <Avatar
                            icon={<ClockCircleOutlined />}
                            style={{
                              background:
                                log.status === 'success' ? '#10b981' :
                                log.status === 'error' ? '#ef4444' : '#3b82f6'
                            }}
                          />
                        }
                        title={
                          <div>
                            <Text strong style={{ fontSize: 13 }}>
                              {log.loginTime !== '-' 
                                ? new Date(log.loginTime).toLocaleString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'ไม่มีข้อมูลเวลา Login'}
                            </Text>
                          </div>
                        }
                        description={
                          <div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                              <EnvironmentOutlined style={{ marginRight: 4 }} />
                              IP: {log.ipAddress}
                            </div>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
                              {log.note}
                            </div>
                            <Space size={4}>
                              <Tag
                                color={
                                  log.status === 'success' ? 'success' :
                                  log.status === 'error' ? 'error' : 'default'
                                }
                                style={{ fontSize: 11, margin: 0 }}
                              >
                                {log.status?.toUpperCase() || 'INFO'}
                              </Tag>
                              <Tag
                                style={{
                                  background: '#f3f4f6',
                                  color: '#6b7280',
                                  border: '1px solid #e5e7eb',
                                  fontSize: 11,
                                  margin: 0
                                }}
                              >
                                {log.source}
                              </Tag>
                            </Space>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty
                  description={
                    <div>
                      <Text style={{ color: '#6b7280', display: 'block', marginBottom: 8 }}>
                        ไม่มีข้อมูลประวัติการ Login
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Active Directory เก็บเฉพาะข้อมูล Login ครั้งล่าสุดเท่านั้น
                      </Text>
                    </div>
                  }
                  style={{ padding: '40px 0' }}
                />
              )}
            </Card>
          </>
        )
      }
    ];
  }, [user, userGroups, userPermissions, loginHistory, passwordExpiry, categoryStats, categorizedGroups, groupSearchText, groupCategoryFilter, expandedCategories, onManageGroups, onQuickAddGroup, onRemoveFromGroup]);

  return (
    <Drawer
      title={
        <div style={{
          padding: '12px 0',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <Space size="middle" align="center">
            <div style={{
              background: user?.isEnabled ? '#f0fdf4' : '#fef2f2',
              borderRadius: 8,
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserOutlined
                style={{
                  fontSize: 22,
                  color: user?.isEnabled ? '#10b981' : '#ef4444'
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                {user?.cn || user?.displayName || 'User Details'}
              </div>
              <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                User Account Information
              </Text>
            </div>
          </Space>
        </div>
      }
      placement="right"
      onClose={onClose}
      open={visible}
      width={getResponsiveWidth ? getResponsiveWidth(700, 560, '100%') : 700}
      styles={{
        header: {
          background: 'linear-gradient(to right, #f8fafc, #ffffff)',
          borderBottom: 'none',
          padding: '24px 24px 0'
        },
        body: {
          background: '#fafbfc',
          padding: 24
        }
      }}
    >
      {user && (
        <Tabs defaultActiveKey="1" items={tabsItems} />
      )}
    </Drawer>
  );
};

export default UserDetailsDrawer;

