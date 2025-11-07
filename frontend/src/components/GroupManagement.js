import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
  Card,
  Typography,
  Row,
  Col,
  Tag,
  Avatar,
  Select,
  Tooltip,
  Drawer,
  Divider,
  Descriptions,
  List,
  Badge,
  Tabs,
  Switch,
  Empty,
  Transfer,
  TreeSelect,
  Radio
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  TeamOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  FilterOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FolderOutlined,
  SafetyCertificateOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  GlobalOutlined,
  ApartmentOutlined
} from '@ant-design/icons';
import axios from 'axios';
import config from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import './GroupManagement.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;
const { Option } = Select;

const GroupManagement = () => {
  // ==================== STATES ====================
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  
  // Modals & Drawers
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDetailsDrawerVisible, setIsDetailsDrawerVisible] = useState(false);
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  
  // Auto-refresh settings
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  
  // Selected data
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  
  // Members data
  const [groupMembers, setGroupMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Data for Create Group Modal (AD-like)
  const [availableOUs, setAvailableOUs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingOUs, setLoadingOUs] = useState(false);
  const [ouTreeData, setOuTreeData] = useState([]);
  
  const [form] = Form.useForm();
  const { getAuthHeaders } = useAuth();
  const { notifyError } = useNotification();

  // ==================== HELPER FUNCTIONS ====================
  
  /**
   * Convert error detail to string for display
   * Handles FastAPI validation errors (array of objects), strings, and objects
   */
  const formatErrorDetail = (detail) => {
    if (!detail) return null;
    
    // Handle FastAPI validation errors (array of objects)
    if (Array.isArray(detail)) {
      return detail.map(err => {
        const field = err.loc?.join(' > ') || 'Unknown field';
        return `• ${field}: ${err.msg}`;
      }).join('\n');
    }
    
    // Handle string errors
    if (typeof detail === 'string') {
      return detail;
    }
    
    // Handle object errors
    if (typeof detail === 'object') {
      return JSON.stringify(detail, null, 2);
    }
    
    return String(detail);
  };

  // ==================== NOTIFICATIONS ====================
  
  const notifyGroupCreated = (groupName) => {
    message.success({
      content: `Group "${groupName}" created successfully!`,
      duration: 4,
      icon: <CheckCircleOutlined style={{ color: '#10b981' }} />
    });
  };

  const notifyGroupUpdated = (groupName) => {
    message.success({
      content: `Group "${groupName}" updated successfully!`,
      duration: 3,
      icon: <CheckCircleOutlined style={{ color: '#3b82f6' }} />
    });
  };

  const notifyGroupDeleted = (groupName) => {
    message.success({
      content: `Group "${groupName}" deleted successfully!`,
      duration: 3,
      icon: <CheckCircleOutlined style={{ color: '#ef4444' }} />
    });
  };

  const notifyMemberAdded = (userName, groupName) => {
    message.success({
      content: `User "${userName}" added to group "${groupName}"`,
      duration: 4,
      icon: <UserAddOutlined style={{ color: '#10b981' }} />
    });
  };

  const notifyMemberRemoved = (userName, groupName) => {
    message.success({
      content: `User "${userName}" removed from group "${groupName}"`,
      duration: 3,
      icon: <UserDeleteOutlined style={{ color: '#f59e0b' }} />
    });
  };

  // Handler for auto-refresh toggle
  const handleAutoRefreshToggle = (checked) => {
    setAutoRefreshEnabled(checked);
    if (checked) {
      message.success('🔄 Auto-refresh enabled: Updates every 30 seconds', 3);
    } else {
      message.info('⏸️ Auto-refresh disabled: Manual refresh only', 3);
    }
  };

  // ==================== DATA FETCHING ====================
  
  const fetchGroups = useCallback(async (forceRefresh = false, ignoreFilters = false) => {
    setLoading(true);
    console.log('🔄 Fetching groups...', forceRefresh ? '(Force Refresh)' : '', ignoreFilters ? '(Ignore Filters)' : '');
    
    try {
      const params = {
        page_size: 10000,
        page: 1,
        _t: forceRefresh ? Date.now() : undefined
      };
      
      if (!ignoreFilters && searchText) {
        params.q = searchText;
        console.log('🔍 Search text:', searchText);
      }
      
      console.log('📤 Request params:', params);
      
      const response = await axios.get(`${config.apiUrl}/api/groups/`, {
        headers: getAuthHeaders(),
        params
      });
      
      console.log('✅ Groups fetched:', response.data.length);
      console.log('📊 Sample group:', response.data[0]);
      
      setGroups(response.data);
      setLastRefreshTime(new Date());
      
      return { success: true, count: response.data.length };
    } catch (error) {
      const detail = error?.response?.data?.detail || error?.message || 'Unknown error';
      message.error(`Failed to load groups: ${detail}`);
      console.error('❌ Fetch groups failed:', error);
      return { success: false, count: 0 };
    } finally {
      setLoading(false);
    }
  }, [searchText, getAuthHeaders]);

  const fetchGroupMembers = async (groupDn) => {
    setLoadingMembers(true);
    try {
      console.log('👥 Fetching members for group:', groupDn);
      
      const response = await axios.get(
        `${config.apiUrl}/api/groups/${encodeURIComponent(groupDn)}/members`,
        { headers: getAuthHeaders() }
      );
      
      console.log('✅ Members fetched:', response.data.length);
      setGroupMembers(response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching members:', error);
      message.warning('Failed to load group members');
      setGroupMembers([]);
      return [];
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchAvailableUsers = async (groupDn) => {
    try {
      console.log('👥 Fetching available users for group:', groupDn);
      
      const response = await axios.get(
        `${config.apiUrl}/api/groups/${encodeURIComponent(groupDn)}/available-users`,
        { headers: getAuthHeaders() }
      );
      
      console.log('✅ Available users:', response.data.length);
      setAvailableUsers(response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching available users:', error);
      message.warning('Failed to load available users');
      setAvailableUsers([]);
      return [];
    }
  };

  // Fetch OUs for tree select
  const fetchOUs = async () => {
    setLoadingOUs(true);
    try {
      console.log('📁 Fetching OUs for group creation...');
      
      const response = await axios.get(`${config.apiUrl}/api/ous/`, {
        headers: getAuthHeaders(),
        params: { page_size: 10000 }
      });
      
      console.log('✅ OUs fetched:', response.data.length);
      setAvailableOUs(response.data);
      
      // Build tree structure for TreeSelect
      const treeData = buildOUTreeData(response.data);
      setOuTreeData(treeData);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching OUs:', error);
      message.warning('Failed to load OUs');
      setAvailableOUs([]);
      setOuTreeData([]);
      return [];
    } finally {
      setLoadingOUs(false);
    }
  };

  // Fetch all users for managedBy field
  const fetchAllUsers = async () => {
    try {
      console.log('👥 Fetching all users for managedBy...');
      
      const response = await axios.get(`${config.apiUrl}/api/users/`, {
        headers: getAuthHeaders(),
        params: { page_size: 10000 }
      });
      
      console.log('✅ Users fetched:', response.data.length);
      setAllUsers(response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      setAllUsers([]);
      return [];
    }
  };

  // Helper function to build OU tree structure for TreeSelect
  const buildOUTreeData = (ous) => {
    if (!ous || ous.length === 0) return [];
    
    // Group OUs by hierarchy level
    const rootOUs = [];
    const ouMap = new Map();
    
    // First pass: create nodes
    ous.forEach(ou => {
      if (!ou.dn) return;
      
      ouMap.set(ou.dn, {
        title: ou.name || ou.dn.split(',')[0].replace('OU=', ''),
        value: ou.dn,
        key: ou.dn,
        children: []
      });
    });
    
    // Second pass: build hierarchy
    ous.forEach(ou => {
      if (!ou.dn) return;
      
      const parts = ou.dn.split(',');
      const ouParts = parts.filter(p => p.startsWith('OU='));
      
      if (ouParts.length === 1) {
        // Root level OU
        rootOUs.push(ouMap.get(ou.dn));
      } else {
        // Find parent
        const parentParts = parts.slice(1);
        const parentDN = parentParts.join(',');
        const parent = ouMap.get(parentDN);
        
        if (parent) {
          parent.children.push(ouMap.get(ou.dn));
        }
      }
    });
    
    // Sort by title
    const sortTree = (nodes) => {
      nodes.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortTree(node.children);
        }
      });
    };
    
    sortTree(rootOUs);
    
    return rootOUs;
  };

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefreshEnabled) {
      console.log('⏸️ Auto-refresh is disabled');
      return;
    }
    
    console.log('⏰ Setting up auto-refresh (every 30 seconds)');
    
    const intervalId = setInterval(() => {
      console.log('🔄 Auto-refreshing groups... (Real-time update)');
      fetchGroups(true, true).then(() => {
        setLastRefreshTime(new Date());
      });
    }, 30000);
    
    return () => {
      console.log('🛑 Clearing auto-refresh interval');
      clearInterval(intervalId);
    };
  }, [fetchGroups, autoRefreshEnabled]);

  // ==================== HANDLERS ====================
  
  const handleSearch = (value) => {
    setSearchText(value);
  };

  const handleTypeFilterChange = (value) => {
    setTypeFilter(value);
  };

  const handleScopeFilterChange = (value) => {
    setScopeFilter(value);
  };

  const handleViewDetails = async (group) => {
    setSelectedGroup(group);
    setIsDetailsDrawerVisible(true);
    await fetchGroupMembers(group.dn);
  };

  const handleCreateGroup = async () => {
    form.resetFields();
    
    // Set default values
    form.setFieldsValue({
      groupType: 'Security',
      groupScope: 'Global'
    });
    
    setIsCreateModalVisible(true);
    
    // Fetch OUs and Users in background
    await Promise.all([
      fetchOUs(),
      fetchAllUsers()
    ]);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    form.setFieldsValue({
      cn: group.cn,
      description: group.description
    });
    setIsEditModalVisible(true);
  };

  const handleDeleteGroup = async (groupDn) => {
    try {
      const group = groups.find(g => g.dn === groupDn);
      const groupName = group?.cn || 'Group';
      
      console.log('🗑️ Deleting group:', groupDn);
      
      await axios.delete(`${config.apiUrl}/api/groups/${encodeURIComponent(groupDn)}`, {
        headers: getAuthHeaders()
      });
      
      console.log('✅ Group deleted successfully');
      
      notifyGroupDeleted(groupName);
      
      await fetchGroups(true, true);
    } catch (error) {
      console.error('❌ Delete group error:', error);
      const errorMsg = formatErrorDetail(error.response?.data?.detail) || error.message || 'An error occurred while deleting the group';
      notifyError('Failed to delete group', errorMsg);
    }
  };

  const handleCreateModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      console.log('📤 Creating group with data:', values);
      
      const response = await axios.post(`${config.apiUrl}/api/groups/`, values, {
        headers: getAuthHeaders()
      });
      
      console.log('✅ Group created successfully:', response.data);
      
      setIsCreateModalVisible(false);
      form.resetFields();
      
      notifyGroupCreated(values.cn);
      
      await fetchGroups(true, true);
    } catch (error) {
      console.error('❌ Create group error:', error);
      
      let errorTitle = 'Failed to create group';
      let errorMessage = 'An error occurred while creating the group';
      
      if (error.response?.data?.detail) {
        const detail = formatErrorDetail(error.response.data.detail);
        
        if (detail?.includes('entryAlreadyExists')) {
          errorTitle = '❌ Group already exists!';
          errorMessage = `Group "${form.getFieldValue('cn')}" already exists in Active Directory`;
        } else {
          errorMessage = detail || 'An error occurred while creating the group';
        }
      }
      
      notifyError(errorTitle, errorMessage);
    }
  };

  const handleEditModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      console.log('📝 Editing group:', editingGroup.dn);
      console.log('📝 Form values:', values);
      
      const updateData = {};
      if (values.description !== undefined) {
        updateData.description = values.description;
      }
      
      if (Object.keys(updateData).length === 0) {
        message.warning('No changes to update');
        return;
      }
      
      await axios.put(
        `${config.apiUrl}/api/groups/${encodeURIComponent(editingGroup.dn)}`,
        updateData,
        { headers: getAuthHeaders() }
      );
      
      console.log('✅ Group updated');
      
      notifyGroupUpdated(editingGroup.cn);
      setIsEditModalVisible(false);
      form.resetFields();
      setEditingGroup(null);
      
      await fetchGroups(true, true);
    } catch (error) {
      console.error('❌ Update group error:', error);
      const errorMsg = formatErrorDetail(error.response?.data?.detail) || error.message;
      notifyError('Failed to update group', errorMsg);
    }
  };

  const handleAddMember = async (group) => {
    setSelectedGroup(group);
    setSelectedUsers([]);
    await fetchAvailableUsers(group.dn);
    setIsAddMemberModalVisible(true);
  };

  const handleAddMemberModalOk = async () => {
    if (selectedUsers.length === 0) {
      message.warning('Please select at least one user');
      return;
    }

    try {
      console.log(`👥 Adding ${selectedUsers.length} members to group:`, selectedGroup.cn);
      
      // Add members one by one
      for (const userDn of selectedUsers) {
        const user = availableUsers.find(u => u.dn === userDn);
        const userName = user?.cn || userDn;
        
        await axios.post(
          `${config.apiUrl}/api/groups/${encodeURIComponent(selectedGroup.dn)}/members`,
          { user_dn: userDn },
          { headers: getAuthHeaders() }
        );
        
        console.log(`✅ Added: ${userName}`);
      }
      
      notifyMemberAdded(
        selectedUsers.length === 1 ? availableUsers.find(u => u.dn === selectedUsers[0])?.cn : `${selectedUsers.length} users`,
        selectedGroup.cn
      );
      
      setIsAddMemberModalVisible(false);
      setSelectedUsers([]);
      
      // Refresh members list if drawer is open
      if (isDetailsDrawerVisible && selectedGroup) {
        await fetchGroupMembers(selectedGroup.dn);
      }
      
      await fetchGroups(true, true);
    } catch (error) {
      console.error('❌ Add member error:', error);
      const errorMsg = formatErrorDetail(error.response?.data?.detail) || error.message;
      notifyError('Failed to add member(s)', errorMsg);
    }
  };

  const handleRemoveMember = async (memberDn) => {
    try {
      const member = groupMembers.find(m => m.dn === memberDn);
      const memberName = member?.cn || memberDn;
      
      console.log('👥 Removing member:', memberName);
      
      await axios.delete(
        `${config.apiUrl}/api/groups/${encodeURIComponent(selectedGroup.dn)}/members`,
        {
          data: { user_dn: memberDn },
          headers: getAuthHeaders()
        }
      );
      
      console.log('✅ Member removed');
      
      notifyMemberRemoved(memberName, selectedGroup.cn);
      
      // Refresh members list
      await fetchGroupMembers(selectedGroup.dn);
      
      // Refresh groups list
      await fetchGroups(true, true);
    } catch (error) {
      console.error('❌ Remove member error:', error);
      const errorMsg = formatErrorDetail(error.response?.data?.detail) || error.message;
      notifyError('Failed to remove member', errorMsg);
    }
  };

  // ==================== FILTERED DATA ====================
  
  const filteredGroups = groups.filter(group => {
    if (typeFilter !== 'all' && group.groupType !== typeFilter) return false;
    if (scopeFilter !== 'all' && group.groupScope !== scopeFilter) return false;
    return true;
  });

  // ==================== STATISTICS ====================
  
  const stats = {
    total: groups.length,
    security: groups.filter(g => g.groupType === 'Security').length,
    distribution: groups.filter(g => g.groupType === 'Distribution').length,
    global: groups.filter(g => g.groupScope === 'Global').length,
    domainLocal: groups.filter(g => g.groupScope === 'Domain Local').length,
    universal: groups.filter(g => g.groupScope === 'Universal').length,
    avgMembers: groups.length > 0 
      ? Math.round(groups.reduce((sum, g) => sum + (g.memberCount || 0), 0) / groups.length)
      : 0
  };

  // ==================== TABLE COLUMNS ====================
  
  const columns = [
    {
      title: (
        <span style={{ fontWeight: 600 }}>
          <TeamOutlined style={{ marginRight: 8 }} />
          Group Name
        </span>
      ),
      key: 'group',
      width: 250,
      fixed: 'left',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            size={40}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              fontWeight: 700,
              fontSize: 16
            }}
            icon={<TeamOutlined />}
          >
            {record.cn ? record.cn.charAt(0).toUpperCase() : 'G'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>
              {record.cn || 'N/A'}
            </div>
            {record.description && (
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {record.description.substring(0, 30)}
                {record.description.length > 30 ? '...' : ''}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: (
        <span style={{ fontWeight: 600 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          Members
        </span>
      ),
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 120,
      sorter: (a, b) => (a.memberCount || 0) - (b.memberCount || 0),
      render: (count) => (
        <Badge
          count={count || 0}
          showZero
          style={{
            backgroundColor: count > 0 ? '#10b981' : '#94a3b8',
            fontSize: 13,
            fontWeight: 700,
            padding: '0 12px',
            height: 26,
            lineHeight: '26px',
            borderRadius: 13
          }}
        />
      ),
    },
    {
      title: (
        <span style={{ fontWeight: 600 }}>
          <SafetyCertificateOutlined style={{ marginRight: 8 }} />
          Type
        </span>
      ),
      dataIndex: 'groupType',
      key: 'groupType',
      width: 140,
      filters: [
        { text: 'Security', value: 'Security' },
        { text: 'Distribution', value: 'Distribution' }
      ],
      onFilter: (value, record) => record.groupType === value,
      render: (type) => (
        <Tag
          style={{
            background: type === 'Security' ? '#fef2f2' : '#eff6ff',
            color: type === 'Security' ? '#991b1b' : '#1e40af',
            border: `1px solid ${type === 'Security' ? '#fca5a5' : '#bfdbfe'}`,
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 600
          }}
        >
          {type || 'Unknown'}
        </Tag>
      ),
    },
    {
      title: (
        <span style={{ fontWeight: 600 }}>
          <GlobalOutlined style={{ marginRight: 8 }} />
          Scope
        </span>
      ),
      dataIndex: 'groupScope',
      key: 'groupScope',
      width: 140,
      filters: [
        { text: 'Global', value: 'Global' },
        { text: 'Domain Local', value: 'Domain Local' },
        { text: 'Universal', value: 'Universal' }
      ],
      onFilter: (value, record) => record.groupScope === value,
      render: (scope) => {
        const colors = {
          'Global': '#10b981',
          'Domain Local': '#3b82f6',
          'Universal': '#8b5cf6'
        };
        return (
          <Tag
            style={{
              background: `${colors[scope]}20`,
              color: colors[scope],
              border: `1px solid ${colors[scope]}40`,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600
            }}
          >
            {scope || 'Unknown'}
          </Tag>
        );
      },
    },
    {
      title: (
        <span style={{ fontWeight: 600 }}>
          <FolderOutlined style={{ marginRight: 8 }} />
          Location
        </span>
      ),
      dataIndex: 'parentOU',
      key: 'parentOU',
      width: 200,
      ellipsis: true,
      filters: [...new Set(groups.map(g => g.parentOU || 'Root'))].sort().map(ou => ({
        text: ou,
        value: ou
      })),
      onFilter: (value, record) => (record.parentOU || 'Root') === value,
      filterSearch: true,
      render: (parentOU, record) => (
        <Tooltip title={record.ouPath || record.dn}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FolderOutlined style={{ color: '#f59e0b', fontSize: 14 }} />
            <Text style={{ fontSize: 13, color: '#1f2937', fontWeight: 500 }}>
              {parentOU || 'Root'}
            </Text>
          </div>
        </Tooltip>
      ),
    },
    {
      title: (
        <span style={{ fontWeight: 600 }}>
          Actions
        </span>
      ),
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="default"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditGroup(record)}
            />
          </Tooltip>
          <Tooltip title="Add Members">
            <Button
              icon={<UserAddOutlined />}
              size="small"
              style={{
                color: '#10b981',
                borderColor: '#10b981'
              }}
              onClick={() => handleAddMember(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this group?"
            onConfirm={() => handleDeleteGroup(record.dn)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ==================== RENDER ====================
  
  return (
    <div className="group-management-container" style={{ padding: '0', margin: '0', minHeight: '100vh', width: '100%' }}>
      {/* Professional Header */}
      <Card
        style={{
          borderRadius: 0,
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #ea580c 100%)',
          border: 'none',
          boxShadow: 'none',
          minHeight: '100vh',
          margin: 0,
          width: '100%'
        }}
        bodyStyle={{ padding: '36px 40px 40px 40px', margin: 0 }}
      >
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Space size="large" align="center">
              <div style={{
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '16px',
                backdropFilter: 'blur(10px)'
              }}>
                <TeamOutlined style={{ fontSize: 44, color: '#fff' }} />
              </div>
              <div>
                <div style={{ 
                  color: '#ffffff', 
                  margin: 0, 
                  marginBottom: 4, 
                  fontWeight: 800, 
                  fontSize: 32,
                  textShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
                  letterSpacing: '0.5px'
                }}>
                  Group Management
                </div>
                <Space size="middle">
                  <Tag
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      border: '2px solid rgba(255, 255, 255, 0.5)',
                      color: '#ffffff',
                      fontSize: 13,
                      padding: '6px 14px',
                      fontWeight: 700,
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    <TeamOutlined /> {stats.total} Total Groups
                  </Tag>
                  {autoRefreshEnabled && (
                    <Tag
                      style={{
                        background: 'rgba(16, 185, 129, 0.3)',
                        backdropFilter: 'blur(8px)',
                        border: '2px solid rgba(16, 185, 129, 0.5)',
                        color: '#ffffff',
                        fontSize: 11,
                        padding: '4px 10px',
                        fontWeight: 700,
                        borderRadius: 6,
                        animation: 'pulse 2s infinite'
                      }}
                    >
                      🔄 Live
                    </Tag>
                  )}
                  <Tag
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      backdropFilter: 'blur(8px)',
                      border: '2px solid rgba(255, 255, 255, 0.5)',
                      color: '#ffffff',
                      fontSize: 13,
                      padding: '6px 14px',
                      fontWeight: 700,
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    <SafetyCertificateOutlined /> {stats.security} Security
                  </Tag>
                  <Tag
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      backdropFilter: 'blur(8px)',
                      border: '2px solid rgba(255, 255, 255, 0.5)',
                      color: '#ffffff',
                      fontSize: 13,
                      padding: '6px 14px',
                      fontWeight: 700,
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    <GlobalOutlined /> {stats.distribution} Distribution
                  </Tag>
                </Space>
              </div>
            </Space>
          </Col>
          <Col>
            <Space size="middle">
              <Tooltip 
                title={
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Auto-Refresh Mode</div>
                    <div style={{ fontSize: 12 }}>
                      {autoRefreshEnabled 
                        ? '🔄 Enabled: Refreshes every 30 seconds'
                        : '⏸️ Disabled: Manual refresh only'}
                    </div>
                  </div>
                }
                placement="bottom"
              >
                <div style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => handleAutoRefreshToggle(!autoRefreshEnabled)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                >
                  <ClockCircleOutlined style={{ color: '#fff', fontSize: 16 }} />
                  <div>
                    <div style={{ 
                      color: 'rgba(255, 255, 255, 0.7)', 
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      Auto-Refresh
                    </div>
                    <Switch
                      checked={autoRefreshEnabled}
                      onChange={handleAutoRefreshToggle}
                      size="small"
                      style={{ marginTop: 4 }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <Divider type="vertical" style={{ height: 36, background: 'rgba(255, 255, 255, 0.3)' }} />
                  <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>
                    Last: {lastRefreshTime.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                </div>
              </Tooltip>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchGroups(true);
                  setLastRefreshTime(new Date());
                }}
                loading={loading}
                size="large"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#fff',
                  fontWeight: 600,
                  height: 44,
                  padding: '0 24px',
                  borderRadius: 8,
                  backdropFilter: 'blur(10px)'
                }}
              >
                Refresh Now
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateGroup}
                size="large"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  color: '#d97706',
                  fontWeight: 700,
                  height: 44,
                  padding: '0 28px',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
                }}
              >
                Create Group
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Search & Filter Section */}
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 24 }}>
          <Col xs={24} md={10}>
            <Search
              placeholder="Search groups (Name, Description...)"
              allowClear
              onSearch={handleSearch}
              size="large"
              style={{
                borderRadius: 8,
                border: '2px solid rgba(255, 255, 255, 0.3)'
              }}
              className="search-input-white"
            />
          </Col>
          <Col xs={12} md={7}>
            <Select
              placeholder="Filter by Type"
              allowClear
              size="large"
              value={typeFilter}
              onChange={handleTypeFilterChange}
              suffixIcon={<FilterOutlined style={{ color: '#fff' }} />}
              style={{ width: '100%', borderRadius: 8 }}
              className="select-white"
            >
              <Option value="all">All Types</Option>
              <Option value="Security">Security</Option>
              <Option value="Distribution">Distribution</Option>
            </Select>
          </Col>
          <Col xs={12} md={7}>
            <Select
              placeholder="Filter by Scope"
              allowClear
              size="large"
              value={scopeFilter}
              onChange={handleScopeFilterChange}
              suffixIcon={<GlobalOutlined style={{ color: '#fff' }} />}
              style={{ width: '100%', borderRadius: 8 }}
              className="select-white"
            >
              <Option value="all">All Scopes</Option>
              <Option value="Global">Global</Option>
              <Option value="Domain Local">Domain Local</Option>
              <Option value="Universal">Universal</Option>
            </Select>
          </Col>
        </Row>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6} md={4}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: 16,
              padding: '24px',
              textAlign: 'center',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(245, 158, 11, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(245, 158, 11, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(245, 158, 11, 0.4)';
            }}
            >
              <div style={{
                fontSize: 13,
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 14,
                fontWeight: 700,
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                <TeamOutlined style={{ marginRight: 6 }} /> Total Groups
              </div>
              <div style={{ 
                fontSize: 42, 
                fontWeight: 800, 
                color: '#ffffff',
                textShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
              }}>
                {stats.total}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <div style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              borderRadius: 16,
              padding: '24px',
              textAlign: 'center',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(239, 68, 68, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(239, 68, 68, 0.4)';
            }}
            >
              <div style={{
                fontSize: 13,
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 14,
                fontWeight: 700,
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                <SafetyCertificateOutlined style={{ marginRight: 6 }} /> Security
              </div>
              <div style={{ 
                fontSize: 42, 
                fontWeight: 800, 
                color: '#ffffff',
                textShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
              }}>
                {stats.security}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: 16,
              padding: '24px',
              textAlign: 'center',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(59, 130, 246, 0.4)';
            }}
            >
              <div style={{
                fontSize: 13,
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 14,
                fontWeight: 700,
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                <GlobalOutlined style={{ marginRight: 6 }} /> Distribution
              </div>
              <div style={{ 
                fontSize: 42, 
                fontWeight: 800, 
                color: '#ffffff',
                textShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
              }}>
                {stats.distribution}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: 16,
              padding: '24px',
              textAlign: 'center',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(16, 185, 129, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(16, 185, 129, 0.4)';
            }}
            >
              <div style={{
                fontSize: 13,
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 14,
                fontWeight: 700,
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                <GlobalOutlined style={{ marginRight: 6 }} /> Global
              </div>
              <div style={{ 
                fontSize: 42, 
                fontWeight: 800, 
                color: '#ffffff',
                textShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
              }}>
                {stats.global}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: 16,
              padding: '24px',
              textAlign: 'center',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(59, 130, 246, 0.4)';
            }}
            >
              <div style={{
                fontSize: 13,
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 14,
                fontWeight: 700,
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                <GlobalOutlined style={{ marginRight: 6 }} /> Domain Local
              </div>
              <div style={{ 
                fontSize: 42, 
                fontWeight: 800, 
                color: '#ffffff',
                textShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
              }}>
                {stats.domainLocal}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: 16,
              padding: '24px',
              textAlign: 'center',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.4)';
            }}
            >
              <div style={{
                fontSize: 13,
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 14,
                fontWeight: 700,
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                <UserOutlined style={{ marginRight: 6 }} /> Avg Members
              </div>
              <div style={{ 
                fontSize: 42, 
                fontWeight: 800, 
                color: '#ffffff',
                textShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
              }}>
                {stats.avgMembers}
              </div>
            </div>
          </Col>
        </Row>

        {/* Content Section with White Background */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Professional Table */}
          <Table
            columns={columns}
            dataSource={filteredGroups}
            rowKey="dn"
            loading={loading}
            bordered={false}
            size="middle"
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 50,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `Showing ${range[0]}-${range[1]} of ${total} groups`,
              pageSizeOptions: ['20', '50', '100', '200'],
              position: ['bottomCenter'],
              defaultPageSize: 50
            }}
          />
        </div>
      </Card>

      {/* Create Group Modal */}
      <Modal
        title={
          <div style={{
            padding: '12px 0',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <Space size="middle" align="center">
              <div style={{
                background: '#fff7ed',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PlusOutlined style={{ fontSize: 22, color: '#f59e0b' }} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                  Create New Group
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Add New Security or Distribution Group
                </Text>
              </div>
            </Space>
          </div>
        }
        open={isCreateModalVisible}
        onOk={handleCreateModalOk}
        onCancel={() => setIsCreateModalVisible(false)}
        width={700}
        okText="Create Group"
        cancelText="Cancel"
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            border: 'none',
            fontWeight: 600,
            borderRadius: 8
          }
        }}
        cancelButtonProps={{
          style: {
            fontWeight: 600,
            borderRadius: 8
          }
        }}
      >
        <div style={{ padding: '20px 0' }}>
          <Form
            form={form}
            layout="vertical"
            name="createGroupForm"
          >
            {/* Group Name */}
            <Form.Item
              name="cn"
              label={<Text strong style={{ fontSize: 13 }}>Group name</Text>}
              rules={[{ required: true, message: 'Please enter group name' }]}
            >
              <Input placeholder="e.g., IT-Department" size="large" />
            </Form.Item>

            {/* Group name (pre-Windows 2000) */}
            <Form.Item
              name="sAMAccountName"
              label={<Text strong style={{ fontSize: 13 }}>Group name (pre-Windows 2000)</Text>}
              tooltip="If not specified, will be auto-generated from group name"
            >
              <Input placeholder="e.g., ITDept (max 20 chars)" maxLength={20} size="large" />
            </Form.Item>

            {/* Description */}
            <Form.Item
              name="description"
              label={<Text strong style={{ fontSize: 13 }}>Description</Text>}
            >
              <Input.TextArea
                placeholder="Enter group description (optional)"
                rows={2}
              />
            </Form.Item>

            <Divider style={{ margin: '16px 0' }} />

            {/* Group scope */}
            <Form.Item
              name="groupScope"
              label={<Text strong style={{ fontSize: 13 }}>Group scope</Text>}
              rules={[{ required: true, message: 'Please select group scope' }]}
            >
              <Radio.Group size="large">
                <Radio value="Domain Local">Domain local</Radio>
                <Radio value="Global">Global</Radio>
                <Radio value="Universal">Universal</Radio>
              </Radio.Group>
            </Form.Item>

            {/* Group type */}
            <Form.Item
              name="groupType"
              label={<Text strong style={{ fontSize: 13 }}>Group type</Text>}
              rules={[{ required: true, message: 'Please select group type' }]}
            >
              <Radio.Group size="large">
                <Radio value="Security">Security group</Radio>
                <Radio value="Distribution">Distribution group</Radio>
              </Radio.Group>
            </Form.Item>

            <Divider style={{ margin: '16px 0' }} />

            {/* Container (OU) */}
            <Form.Item
              name="ou_dn"
              label={<Text strong style={{ fontSize: 13 }}>Container</Text>}
              tooltip="Select the OU where this group will be created"
            >
              <TreeSelect
                showSearch
                style={{ width: '100%' }}
                dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                placeholder="Select container (default: CN=Users)"
                allowClear
                treeDefaultExpandAll={false}
                treeData={ouTreeData}
                loading={loadingOUs}
                size="large"
              />
            </Form.Item>

            {/* Managed by */}
            <Form.Item
              name="managedBy"
              label={<Text strong style={{ fontSize: 13 }}>Managed by</Text>}
              tooltip="Select user who manages this group"
            >
              <Select
                showSearch
                placeholder="Select manager (optional)"
                allowClear
                size="large"
                optionFilterProp="label"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={allUsers.map(user => ({
                  value: user.dn,
                  label: `${user.cn}${user.mail ? ` (${user.mail})` : ''}${user.department ? ` - ${user.department}` : ''}`,
                }))}
              />
            </Form.Item>

            {/* Notes */}
            <Form.Item
              name="info"
              label={<Text strong style={{ fontSize: 13 }}>Notes</Text>}
            >
              <Input.TextArea
                placeholder="Additional notes (optional)"
                rows={3}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        title={
          <div style={{
            padding: '12px 0',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <Space size="middle" align="center">
              <div style={{
                background: '#eff6ff',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <EditOutlined style={{ fontSize: 22, color: '#3b82f6' }} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                  Edit Group Information
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Modify Group Details
                </Text>
              </div>
            </Space>
          </div>
        }
        open={isEditModalVisible}
        onOk={handleEditModalOk}
        onCancel={() => {
          setIsEditModalVisible(false);
          setEditingGroup(null);
        }}
        width={600}
        okText="Update Group"
        cancelText="Cancel"
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none',
            fontWeight: 600,
            borderRadius: 8
          }
        }}
        cancelButtonProps={{
          style: {
            fontWeight: 600,
            borderRadius: 8
          }
        }}
      >
        <div style={{ padding: '20px 0' }}>
          <Form
            form={form}
            layout="vertical"
            name="editGroupForm"
          >
            <Form.Item
              name="cn"
              label={<Text strong style={{ fontSize: 13 }}>Group Name</Text>}
            >
              <Input placeholder="Enter group name" size="large" disabled />
            </Form.Item>

            <Form.Item
              name="description"
              label={<Text strong style={{ fontSize: 13 }}>Description</Text>}
            >
              <Input.TextArea
                placeholder="Enter group description (optional)"
                rows={3}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        title={
          <div style={{
            padding: '12px 0',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <Space size="middle" align="center">
              <div style={{
                background: '#f0fdf4',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UserAddOutlined style={{ fontSize: 22, color: '#10b981' }} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                  Add Members to Group
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {selectedGroup?.cn}
                </Text>
              </div>
            </Space>
          </div>
        }
        open={isAddMemberModalVisible}
        onOk={handleAddMemberModalOk}
        onCancel={() => {
          setIsAddMemberModalVisible(false);
          setSelectedUsers([]);
        }}
        width={700}
        okText={`Add ${selectedUsers.length} Member${selectedUsers.length !== 1 ? 's' : ''}`}
        cancelText="Cancel"
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none',
            fontWeight: 600,
            borderRadius: 8
          },
          disabled: selectedUsers.length === 0
        }}
        cancelButtonProps={{
          style: {
            fontWeight: 600,
            borderRadius: 8
          }
        }}
      >
        <div style={{ padding: '20px 0' }}>
          <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, display: 'block' }}>
            Select users to add to this group. You can select multiple users at once.
          </Text>
          <Select
            mode="multiple"
            size="large"
            placeholder="Select users to add"
            value={selectedUsers}
            onChange={setSelectedUsers}
            style={{ width: '100%' }}
            optionFilterProp="label"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={availableUsers.map(user => ({
              value: user.dn,
              label: `${user.cn}${user.mail ? ` (${user.mail})` : ''}${user.department ? ` - ${user.department}` : ''}`,
            }))}
            maxTagCount="responsive"
          />
          {availableUsers.length === 0 && (
            <Empty
              description="No available users to add"
              style={{ marginTop: 24 }}
            />
          )}
        </div>
      </Modal>

      {/* Group Details Drawer */}
      <Drawer
        title={
          <div style={{
            padding: '12px 0',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <Space size="middle" align="center">
              <div style={{
                background: '#fff7ed',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TeamOutlined style={{ fontSize: 22, color: '#f59e0b' }} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                  {selectedGroup?.cn || 'Group Details'}
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Group Information & Members
                </Text>
              </div>
            </Space>
          </div>
        }
        placement="right"
        onClose={() => setIsDetailsDrawerVisible(false)}
        open={isDetailsDrawerVisible}
        width={700}
        headerStyle={{
          background: 'linear-gradient(to right, #f8fafc, #ffffff)',
          borderBottom: 'none',
          padding: '24px 24px 0'
        }}
        bodyStyle={{
          background: '#fafbfc',
          padding: 24
        }}
      >
        {selectedGroup && (
          <Tabs defaultActiveKey="1">
            <TabPane
              tab={
                <span>
                  <TeamOutlined />
                  Basic Info
                </span>
              }
              key="1"
            >
              <Card
                size="small"
                style={{
                  marginBottom: 16,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8
                }}
                bodyStyle={{ padding: 0 }}
              >
                <Descriptions
                  column={1}
                  bordered
                  size="middle"
                  labelStyle={{
                    background: '#f8fafc',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: 13,
                    width: '35%'
                  }}
                  contentStyle={{
                    background: '#ffffff',
                    color: '#1f2937'
                  }}
                >
                  <Descriptions.Item label="Group Name">
                    <Text strong style={{ fontSize: 14 }}>
                      {selectedGroup.cn}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Description">
                    {selectedGroup.description ? (
                      <Text style={{ fontSize: 13 }}>{selectedGroup.description}</Text>
                    ) : (
                      <Text type="secondary">No description</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Member Count">
                    <Badge
                      count={selectedGroup.memberCount || 0}
                      showZero
                      style={{
                        backgroundColor: selectedGroup.memberCount > 0 ? '#10b981' : '#94a3b8',
                        fontSize: 14,
                        fontWeight: 700,
                        padding: '0 14px',
                        height: 28
                      }}
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="Group Type">
                    <Tag
                      style={{
                        background: selectedGroup.groupType === 'Security' ? '#fef2f2' : '#eff6ff',
                        color: selectedGroup.groupType === 'Security' ? '#991b1b' : '#1e40af',
                        border: `2px solid ${selectedGroup.groupType === 'Security' ? '#fca5a5' : '#bfdbfe'}`,
                        padding: '6px 14px',
                        fontSize: 13,
                        fontWeight: 700
                      }}
                    >
                      {selectedGroup.groupType || 'Unknown'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Group Scope">
                    <Tag
                      style={{
                        background: '#eff6ff',
                        color: '#1e40af',
                        border: '2px solid #bfdbfe',
                        padding: '6px 14px',
                        fontSize: 13,
                        fontWeight: 700
                      }}
                    >
                      {selectedGroup.groupScope || 'Unknown'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Location (OU)">
                    <Text style={{ fontSize: 13 }}>
                      <FolderOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
                      {selectedGroup.parentOU || 'Root'}
                    </Text>
                  </Descriptions.Item>
                  {selectedGroup.ouPath && selectedGroup.ouPath !== selectedGroup.parentOU && (
                    <Descriptions.Item label="Full Path">
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>
                        {selectedGroup.ouPath}
                      </Text>
                    </Descriptions.Item>
                  )}
                  {selectedGroup.managedBy && (
                    <Descriptions.Item label="Managed By">
                      <Text style={{ fontSize: 13 }}>
                        <UserOutlined style={{ marginRight: 6, color: '#10b981' }} />
                        {selectedGroup.managedBy}
                      </Text>
                    </Descriptions.Item>
                  )}
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
                      {selectedGroup.dn}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setIsDetailsDrawerVisible(false);
                    handleEditGroup(selectedGroup);
                  }}
                  size="large"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: 'none',
                    fontWeight: 600,
                    borderRadius: 8,
                    height: 44
                  }}
                >
                  Edit Group
                </Button>
              </Space>
            </TabPane>

            <TabPane
              tab={
                <span>
                  <UserOutlined />
                  Members ({groupMembers.length})
                </span>
              }
              key="2"
            >
              <Card
                size="small"
                style={{
                  marginBottom: 16,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Space style={{ width: '100%', marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={() => {
                      handleAddMember(selectedGroup);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none',
                      fontWeight: 600
                    }}
                  >
                    Add Members
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => fetchGroupMembers(selectedGroup.dn)}
                    loading={loadingMembers}
                  >
                    Refresh
                  </Button>
                </Space>

                {loadingMembers ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Empty description="Loading members..." />
                  </div>
                ) : groupMembers.length > 0 ? (
                  <List
                    dataSource={groupMembers}
                    renderItem={(member) => (
                      <List.Item
                        style={{ borderBottom: '1px solid #f3f4f6', padding: '12px 8px' }}
                        actions={[
                          <Popconfirm
                            title="Remove this user from group?"
                            onConfirm={() => handleRemoveMember(member.dn)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button
                              danger
                              size="small"
                              icon={<UserDeleteOutlined />}
                            >
                              Remove
                            </Button>
                          </Popconfirm>
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              icon={<UserOutlined />}
                              style={{
                                background: member.isEnabled
                                  ? 'linear-gradient(135deg, #10b981, #059669)'
                                  : 'linear-gradient(135deg, #94a3b8, #64748b)'
                              }}
                            >
                              {member.cn ? member.cn.charAt(0).toUpperCase() : 'U'}
                            </Avatar>
                          }
                          title={
                            <div>
                              <Text strong style={{ fontSize: 13 }}>
                                {member.cn || member.sAMAccountName}
                              </Text>
                              {!member.isEnabled && (
                                <Tag
                                  color="error"
                                  style={{ marginLeft: 8, fontSize: 11 }}
                                >
                                  Disabled
                                </Tag>
                              )}
                            </div>
                          }
                          description={
                            <div>
                              {member.mail && (
                                <div style={{ fontSize: 12, color: '#6b7280' }}>
                                  {member.mail}
                                </div>
                              )}
                              {member.department && (
                                <Tag
                                  style={{
                                    fontSize: 11,
                                    marginTop: 4,
                                    background: '#eff6ff',
                                    color: '#1e40af',
                                    border: '1px solid #bfdbfe'
                                  }}
                                >
                                  {member.department}
                                </Tag>
                              )}
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty
                    description={<Text style={{ color: '#6b7280' }}>No members in this group</Text>}
                    style={{ padding: '40px 0' }}
                  />
                )}
              </Card>
            </TabPane>
          </Tabs>
        )}
      </Drawer>
    </div>
  );
};

export default GroupManagement;


