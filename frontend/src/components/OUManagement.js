/* ============================================
   MODERN AD STRUCTURE VIEWER
   Professional Active Directory Management
   ============================================ */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Button,
  Space,
  Typography,
  Tree,
  Tag,
  Statistic,
  Spin,
  Badge,
  Divider,
  Descriptions,
  message,
  Drawer,
  Empty
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  TeamOutlined,
  FolderOutlined,
  ReloadOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  DesktopOutlined,
  SafetyOutlined,
  AppstoreOutlined,
  KeyOutlined,
  SettingOutlined,
  BoxPlotOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import axios from 'axios';
import config from '../config';
import { useAuth } from '../contexts/AuthContext';
import './OUManagement.css';

const { Title, Text, Paragraph } = Typography;

const OUManagement = () => {
  // ==================== STATES ====================
  
  const [allOUs, setAllOUs] = useState([]);
  const [treeData, setTreeData] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [expandedKeys, setExpandedKeys] = useState(['root']);
  const [drawerVisible, setDrawerVisible] = useState(false);
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGroups: 0,
    totalOUs: 0,
    byContainer: {}
  });

  const { getAuthHeaders } = useAuth();

  // ==================== ICON MAPPING ====================
  
  const getContainerIcon = (name) => {
    const iconMap = {
      'Builtin': <SafetyOutlined style={{ color: '#722ed1' }} />,
      'Computer': <DesktopOutlined style={{ color: '#13c2c2' }} />,
      'Computers': <DesktopOutlined style={{ color: '#13c2c2' }} />,
      'Domain Controllers': <CloudServerOutlined style={{ color: '#eb2f96' }} />,
      'ForeignSecurityPrincipals': <KeyOutlined style={{ color: '#faad14' }} />,
      'Keys': <KeyOutlined style={{ color: '#faad14' }} />,
      'LostAndFound': <BoxPlotOutlined style={{ color: '#8c8c8c' }} />,
      'Managed Service Accounts': <SettingOutlined style={{ color: '#52c41a' }} />,
      'MST Groups': <TeamOutlined style={{ color: '#fa8c16' }} />,
      'MST Users': <UserOutlined style={{ color: '#52c41a' }} />,
      'Program Data': <DatabaseOutlined style={{ color: '#1890ff' }} />,
      'System': <SettingOutlined style={{ color: '#8c8c8c' }} />,
      'TBK-Japan': <GlobalOutlined style={{ color: '#f5222d' }} />,
      'TBKK-Users': <UserOutlined style={{ color: '#52c41a' }} />,
      'TBKK Computers': <DesktopOutlined style={{ color: '#13c2c2' }} />,
      'TBKK Groups': <TeamOutlined style={{ color: '#fa8c16' }} />,
      'TBKT-Users': <UserOutlined style={{ color: '#52c41a' }} />,
      'TBKT Groups': <TeamOutlined style={{ color: '#fa8c16' }} />,
      'tempuser': <UserOutlined style={{ color: '#bfbfbf' }} />,
      'Users': <UserOutlined style={{ color: '#52c41a' }} />,
      'Wifi': <GlobalOutlined style={{ color: '#1890ff' }} />,
      'NTDS Quotas': <DatabaseOutlined style={{ color: '#8c8c8c' }} />,
      'TPM Devices': <DesktopOutlined style={{ color: '#597ef7' }} />,
    };
    
    return iconMap[name] || <FolderOutlined style={{ color: '#1890ff' }} />;
  };

  const getContainerColor = (name) => {
    const colorMap = {
      'Builtin': '#722ed1',
      'Computer': '#13c2c2',
      'Computers': '#13c2c2',
      'Domain Controllers': '#eb2f96',
      'ForeignSecurityPrincipals': '#faad14',
      'Keys': '#faad14',
      'LostAndFound': '#8c8c8c',
      'Managed Service Accounts': '#52c41a',
      'MST Groups': '#fa8c16',
      'MST Users': '#52c41a',
      'Program Data': '#1890ff',
      'System': '#8c8c8c',
      'TBK-Japan': '#f5222d',
      'TBKK-Users': '#52c41a',
      'TBKK Computers': '#13c2c2',
      'TBKK Groups': '#fa8c16',
      'TBKT-Users': '#52c41a',
      'TBKT Groups': '#fa8c16',
      'tempuser': '#bfbfbf',
      'Users': '#52c41a',
      'Wifi': '#1890ff',
      'NTDS Quotas': '#8c8c8c',
      'TPM Devices': '#597ef7',
    };
    
    return colorMap[name] || '#1890ff';
  };

  // ==================== DATA FETCHING ====================
  
  const fetchAllData = useCallback(async (endpoint) => {
    let allData = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;
    
    console.log(`📥 Fetching ${endpoint}...`);
    console.log(`   API URL: ${config.API_BASE_URL || 'UNDEFINED!'}${endpoint}`);
    
    while (hasMore) {
      try {
        // ใช้ config.apiUrl แทน config.API_BASE_URL
        const baseUrl = config.API_BASE_URL || config.apiUrl || 'http://localhost:8000';
        const url = `${baseUrl}${endpoint}`;
        
        console.log(`   Requesting: ${url}?page=${page}&page_size=${pageSize}`);
        
        const response = await axios.get(url, {
          params: { page, page_size: pageSize },
          headers: getAuthHeaders()
        });
        
        console.log(`   ✅ Page ${page}: Got ${response.data?.results?.length || response.data?.length || 0} items`);
        
        const data = response.data.results || response.data || [];
        
        if (data.length === 0) {
          hasMore = false;
        } else {
          allData = [...allData, ...data];
          page++;
        }
        
        if (data.length < pageSize) {
          hasMore = false;
        }
      } catch (error) {
        console.error(`❌ Error fetching ${endpoint}:`, error);
        console.error('   Error details:', error.response?.data || error.message);
        console.error('   Status:', error.response?.status);
        console.error('   URL:', error.config?.url);
        hasMore = false;
      }
    }
    
    console.log(`✅ ${endpoint}: Total ${allData.length} items`);
    return allData;
  }, [getAuthHeaders]);

  const loadData = useCallback(async () => {
    setLoading(true);
    console.log('🚀 ========================================');
    console.log('🚀 Starting to load AD Structure...');
    console.log('🚀 ========================================');
    
    try {
      // Fetch ข้อมูล
      console.log('📥 Step 1: Fetching data from APIs...');
      const [ous, users, groups] = await Promise.all([
        fetchAllData('/api/ous/'),
        fetchAllData('/api/users/'),
        fetchAllData('/api/groups/')
      ]);
      
      console.log('');
      console.log('✅ ========================================');
      console.log('✅ DATA RECEIVED:');
      console.log(`✅ - OUs: ${ous.length} items`);
      console.log(`✅ - Users: ${users.length} items`);
      console.log(`✅ - Groups: ${groups.length} items`);
      console.log('✅ ========================================');
      console.log('');
      
      // ตัวอย่างข้อมูล
      if (ous.length > 0) {
        console.log('📋 Sample OU:', ous[0]);
      }
      if (users.length > 0) {
        console.log('📋 Sample User:', users[0]);
      }
      if (groups.length > 0) {
        console.log('📋 Sample Group:', groups[0]);
      }
      
      setAllOUs(ous);

      // Check if data is available
      if (!ous || ous.length === 0) {
        console.error('❌ NO OUs DATA! Cannot build tree.');
        message.error('Unable to load OUs data');
        setTreeData([]);
        setStats({
          totalUsers: 0,
          totalGroups: 0,
          totalOUs: 0,
          byContainer: {}
        });
        return;
      }

      console.log('');
      console.log('📊 Step 2: Analyzing root containers...');

      // วิเคราะห์โครงสร้างตาม Root-level OUs
      let rootOUs = ous.filter(ou => {
        if (!ou || !ou.dn) return false;
        const ouCount = (ou.dn.match(/OU=/g) || []).length;
        return ouCount === 1;
      }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      console.log(`📂 Found ${rootOUs.length} root-level containers`);
      
      if (rootOUs.length === 0) {
        console.warn('⚠️ No root OUs found with filter! Trying all OUs...');
        rootOUs = ous.slice(0, 30);
        console.log(`📂 Using first ${rootOUs.length} OUs as root containers`);
      }
      
      console.log('📂 Root containers:', rootOUs.map(ou => ou.name).join(', '));

      // สร้างโครงสร้างข้อมูลแบบ Hierarchical
      const buildOUHierarchy = (parentOU, allOUs, depth = 0) => {
        if (depth > 10) return []; // ป้องกัน infinite loop
        
        // หา child OUs
        const children = allOUs.filter(ou => {
          if (ou.dn === parentOU.dn) return false;
          
          // Check if this OU is direct child of parentOU
          const ouDnWithoutParent = ou.dn.replace(`,${parentOU.dn}`, '');
          const remainingOUs = (ouDnWithoutParent.match(/OU=/g) || []).length;
          
          return ou.dn.includes(parentOU.dn) && remainingOUs === 1;
        }).sort((a, b) => a.name.localeCompare(b.name));
        
        return children;
      };

      console.log('');
      console.log('📊 Step 3: Calculating container statistics...');
      
      // นับ Users และ Groups ในแต่ละ Container
      const containerStats = {};
      rootOUs.forEach(ou => {
        const userCount = users.filter(u => u.dn && u.dn.includes(`OU=${ou.name},`)).length;
        const groupCount = groups.filter(g => g.dn && g.dn.includes(`OU=${ou.name},`)).length;
        const subOUs = ous.filter(subOU => 
          subOU.dn !== ou.dn && 
          subOU.dn && subOU.dn.includes(`OU=${ou.name},`)
        );
        
        containerStats[ou.name] = {
          users: userCount,
          groups: groupCount,
          ous: subOUs.length
        };
        
        console.log(`   ${ou.name}: ${userCount} users, ${groupCount} groups, ${subOUs.length} sub-OUs`);
      });

      const statsData = {
        totalUsers: users.length,
        totalGroups: groups.length,
        totalOUs: ous.length,
        byContainer: containerStats
      };

      console.log('');
      console.log('📊 Total Statistics:');
      console.log(`   - Total OUs: ${statsData.totalOUs}`);
      console.log(`   - Total Users: ${statsData.totalUsers}`);
      console.log(`   - Total Groups: ${statsData.totalGroups}`);
      console.log(`   - Containers: ${Object.keys(containerStats).length}`);

      setStats(statsData);

      console.log('');
      console.log('🌳 Step 4: Building tree structure...');

      // สร้าง Tree Structure แบบ Hierarchical
      const buildTreeNode = (ou, depth = 0) => {
        if (depth > 10) {
          console.warn(`   ⚠️ Max depth reached at: ${ou.name}`);
          return null;
        }
        
        const childOUs = buildOUHierarchy(ou, ous, depth);
        const directUsers = users.filter(u => {
          const userParent = u.dn.split(',').slice(1).join(',');
          return userParent === ou.dn;
        });
        const directGroups = groups.filter(g => {
          const groupParent = g.dn.split(',').slice(1).join(',');
          return groupParent === ou.dn;
        });

        // นับทั้งหมดใน OU นี้ (รวม sub-OUs)
        const totalUsers = users.filter(u => u.dn.includes(`OU=${ou.name},`)).length;
        const totalGroups = groups.filter(g => g.dn.includes(`OU=${ou.name},`)).length;

        const children = [];
        
        // เพิ่ม Child OUs
        childOUs.forEach(childOU => {
          const childNode = buildTreeNode(childOU, depth + 1);
          if (childNode) children.push(childNode);
        });

        // เพิ่ม Direct Users (จำกัดแสดง 50 คน)
        const maxDisplay = 50;
        directUsers.slice(0, maxDisplay).forEach(user => {
          children.push({
            title: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserOutlined style={{ fontSize: 12, color: '#52c41a' }} />
                <Text style={{ fontSize: 13 }}>{user.cn || user.sAMAccountName}</Text>
                {user.department && <Tag color="blue" style={{ fontSize: 11 }}>{user.department}</Tag>}
              </div>
            ),
            key: `user-${user.dn}`,
            icon: <UserOutlined style={{ color: '#52c41a', fontSize: 12 }} />,
            data: { type: 'user', user },
            isLeaf: true
          });
        });

        if (directUsers.length > maxDisplay) {
          children.push({
            title: <Text type="secondary" style={{ fontSize: 12 }}>... and {directUsers.length - maxDisplay} more users</Text>,
            key: `more-users-${ou.dn}`,
            disabled: true,
            isLeaf: true
          });
        }

        // Add Direct Groups (limit to 50 groups)
        directGroups.slice(0, maxDisplay).forEach(group => {
          const memberCount = group.member ? 
            (Array.isArray(group.member) ? group.member.length : 1) : 0;
          
          children.push({
            title: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TeamOutlined style={{ fontSize: 12, color: '#fa8c16' }} />
                <Text style={{ fontSize: 13 }}>{group.cn || group.sAMAccountName}</Text>
                {memberCount > 0 && (
                  <Tag color="orange" style={{ fontSize: 11 }}>{memberCount} members</Tag>
                )}
              </div>
            ),
            key: `group-${group.dn}`,
            icon: <TeamOutlined style={{ color: '#fa8c16', fontSize: 12 }} />,
            data: { type: 'group', group },
            isLeaf: true
          });
        });

        if (directGroups.length > maxDisplay) {
          children.push({
            title: <Text type="secondary" style={{ fontSize: 12 }}>... and {directGroups.length - maxDisplay} more groups</Text>,
            key: `more-groups-${ou.dn}`,
            disabled: true,
            isLeaf: true
          });
        }

        const containerIcon = getContainerIcon(ou.name);

        return {
          title: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {React.cloneElement(containerIcon, { style: { fontSize: 16 } })}
              <Text strong style={{ fontSize: 14 }}>{ou.name}</Text>
              {totalUsers > 0 && (
                <Badge 
                  count={totalUsers} 
                  style={{ backgroundColor: '#52c41a', fontSize: 11 }} 
                  title={`${totalUsers} users`}
                />
              )}
              {totalGroups > 0 && (
                <Badge 
                  count={totalGroups} 
                  style={{ backgroundColor: '#fa8c16', fontSize: 11 }} 
                  title={`${totalGroups} groups`}
                />
              )}
              {childOUs.length > 0 && (
                <Tag color="cyan" style={{ fontSize: 11 }}>
                  {childOUs.length} sub-OUs
                </Tag>
              )}
            </div>
          ),
          key: ou.dn,
          icon: containerIcon,
          data: { 
            type: 'ou', 
            ou, 
            stats: { 
              users: totalUsers, 
              groups: totalGroups, 
              subOUs: childOUs.length,
              directUsers: directUsers.length,
              directGroups: directGroups.length
            } 
          },
          children: children.length > 0 ? children : undefined
        };
      };

      // สร้าง Root Node
      const root = {
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <GlobalOutlined style={{ fontSize: 22, color: '#722ed1' }} />
            <Text strong style={{ fontSize: 18, color: '#722ed1' }}>TBKK.CO.TH</Text>
            <Tag color="purple" style={{ fontSize: 12 }}>Active Directory</Tag>
          </div>
        ),
        key: 'root',
        icon: <GlobalOutlined style={{ color: '#722ed1', fontSize: 18 }} />,
        data: { type: 'domain', name: 'TBKK.CO.TH' },
        children: rootOUs.map(ou => buildTreeNode(ou, 0)).filter(Boolean)
      };

      console.log('');
      console.log('🌳 Step 5: Tree structure completed!');
      console.log(`   ✅ Root node created: TBKK.CO.TH`);
      console.log(`   ✅ Children count: ${root.children?.length || 0}`);
      console.log(`   ✅ First 5 containers:`, root.children?.slice(0, 5).map(c => c.data?.ou?.name || c.key));

      if (root.children && root.children.length > 0) {
        console.log(`   ✅ Sample child structure:`, {
          key: root.children[0].key,
          hasData: !!root.children[0].data,
          hasChildren: !!root.children[0].children,
          childrenCount: root.children[0].children?.length || 0
        });
      } else {
        console.error('   ❌ WARNING: Root has NO children!');
      }

      const treeDataArray = [root];
      console.log('');
      console.log('📤 Step 6: Setting tree data to state...');
      console.log(`   - Tree data array length: ${treeDataArray.length}`);
      console.log(`   - Tree data:`, treeDataArray);

      setTreeData(treeDataArray);
      setExpandedKeys(['root']);

      console.log('');
      console.log('✅ ========================================');
      console.log('✅ ALL STEPS COMPLETED SUCCESSFULLY!');
      console.log('✅ ========================================');
      console.log(`✅ Summary:`);
      console.log(`   - ${rootOUs.length} root containers`);
      console.log(`   - ${users.length} total users`);
      console.log(`   - ${groups.length} total groups`);
      console.log(`   - ${ous.length} total OUs`);
      console.log('✅ ========================================');

      message.success({
        content: `Successfully loaded! ${rootOUs.length} containers, ${users.length} users, ${groups.length} groups`,
        duration: 3
      });
      
    } catch (error) {
      console.error('');
      console.error('❌ ========================================');
      console.error('❌ ERROR OCCURRED!');
      console.error('❌ ========================================');
      console.error('❌ Error:', error);
      console.error('❌ Message:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('❌ ========================================');
      
      message.error('Unable to load data: ' + error.message);
      
      // Set empty data
      setTreeData([]);
      setStats({
        totalUsers: 0,
        totalGroups: 0,
        totalOUs: 0,
        byContainer: {}
      });
    } finally {
      setLoading(false);
      console.log('');
      console.log('🏁 ========================================');
      console.log('🏁 LOADING PROCESS FINISHED');
      console.log('🏁 Loading state set to: false');
      console.log('🏁 ========================================');
    }
  }, [fetchAllData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================== HANDLERS ====================
  
  const handleSelect = (selectedKeys, info) => {
    if (info.node.data) {
      setSelectedNode(info.node.data);
      setDrawerVisible(true);
    }
  };

  const handleExpand = (expandedKeys) => {
    setExpandedKeys(expandedKeys);
  };

  // ==================== SEARCH ====================
  
  const filteredTreeData = useMemo(() => {
    if (!searchText) return treeData;

    const filterNodes = (nodes) => {
      return nodes.map(node => {
        const matchesSearch = 
          node.data?.ou?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
          node.data?.user?.cn?.toLowerCase().includes(searchText.toLowerCase()) ||
          node.data?.user?.sAMAccountName?.toLowerCase().includes(searchText.toLowerCase()) ||
          node.data?.group?.cn?.toLowerCase().includes(searchText.toLowerCase()) ||
          node.data?.name?.toLowerCase().includes(searchText.toLowerCase());

        if (node.children) {
          const filteredChildren = filterNodes(node.children);
          if (filteredChildren.length > 0 || matchesSearch) {
            return { ...node, children: filteredChildren };
          }
        }

        return matchesSearch ? node : null;
      }).filter(Boolean);
    };

    return filterNodes(treeData);
  }, [treeData, searchText]);

  // ==================== RENDER ====================

  // Container Cards Summary
  const containerCards = useMemo(() => {
    const cards = Object.entries(stats.byContainer)
      .sort((a, b) => (b[1].users + b[1].groups) - (a[1].users + a[1].groups))
      .slice(0, 8)
      .map(([name, counts]) => ({
        name,
        ...counts,
        icon: getContainerIcon(name),
        color: getContainerColor(name)
      }));
    
    console.log('📊 Container cards generated:', cards.length);
    return cards;
  }, [stats.byContainer]);

  // Debug: Log treeData และ filteredTreeData
  useEffect(() => {
    console.log('🔍 Current state:');
    console.log('   - treeData:', treeData.length, 'items');
    console.log('   - filteredTreeData:', filteredTreeData.length, 'items');
    console.log('   - loading:', loading);
    console.log('   - searchText:', searchText);
    
    if (treeData.length > 0) {
      console.log('   - Root children:', treeData[0]?.children?.length || 0);
    }
  }, [treeData, filteredTreeData, loading, searchText]);

  return (
    <div className="ou-management-container" style={{ padding: '24px', background: 'linear-gradient(to bottom, #f8fafc, #e5e7eb)', minHeight: '100vh' }}>
      
      {/* Professional Header with Domain Info */}
      <Card 
        style={{ 
          marginBottom: 24, 
          borderRadius: 12,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)',
          border: 'none',
          boxShadow: '0 4px 12px rgba(30, 58, 138, 0.15)'
        }}
        bodyStyle={{ padding: '36px 40px' }}
      >
        <Row align="middle" justify="space-between" style={{ marginBottom: 32 }}>
          <Col>
            <Space size="large" align="center">
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '16px',
                backdropFilter: 'blur(10px)'
              }}>
                <GlobalOutlined style={{ fontSize: 44, color: '#fff' }} />
              </div>
              <div>
                <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 4, fontWeight: 700 }}>
                  Active Directory Management
                </Title>
                <Space size="middle">
                  <Tag 
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: '#fff',
                      fontSize: 13,
                      padding: '4px 12px',
                      fontWeight: 600
                    }}
                  >
                    <DatabaseOutlined /> TBKK.CO.TH
                  </Tag>
                  <Tag 
                    style={{ 
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#fff',
                      fontSize: 13,
                      padding: '4px 12px',
                      fontWeight: 600
                    }}
                  >
                    <SafetyOutlined /> Domain Controller
                  </Tag>
                </Space>
              </div>
            </Space>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />} 
              onClick={loadData}
              loading={loading}
              size="large"
              style={{ 
                background: '#ffffff',
                border: 'none',
                color: '#1e3a8a',
                fontWeight: 600,
                height: 44,
                padding: '0 28px',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
            >
              Refresh Data
            </Button>
          </Col>
        </Row>

        {/* Professional Stats Grid */}
        <Row gutter={24}>
          <Col span={6}>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 10,
              padding: '20px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ 
                fontSize: 14, 
                color: 'rgba(255, 255, 255, 0.85)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 12,
                fontWeight: 600
              }}>
                <FolderOutlined /> Organizational Units
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>
                {stats.totalOUs}
              </div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 10,
              padding: '20px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ 
                fontSize: 14, 
                color: 'rgba(255, 255, 255, 0.85)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 12,
                fontWeight: 600
              }}>
                <UserOutlined /> Total Users
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>
                {stats.totalUsers}
              </div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 10,
              padding: '20px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ 
                fontSize: 14, 
                color: 'rgba(255, 255, 255, 0.85)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 12,
                fontWeight: 600
              }}>
                <TeamOutlined /> Security Groups
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>
                {stats.totalGroups}
              </div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 10,
              padding: '20px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ 
                fontSize: 14, 
                color: 'rgba(255, 255, 255, 0.85)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 12,
                fontWeight: 600
              }}>
                <AppstoreOutlined /> Root Containers
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>
                {Object.keys(stats.byContainer).length}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Professional Container Summary Cards */}
      {containerCards.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            marginBottom: 16,
            padding: '0 4px'
          }}>
            <Text strong style={{ fontSize: 16, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <AppstoreOutlined /> Container Overview
            </Text>
          </div>
          <Row gutter={[16, 16]}>
            {containerCards.map(container => (
              <Col xs={24} sm={12} md={8} lg={6} key={container.name}>
                <Card
                  size="small"
                  style={{ 
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'all 0.25s',
                    cursor: 'pointer',
                    background: '#ffffff'
                  }}
                  bodyStyle={{ padding: '18px' }}
                  hoverable
                  onClick={() => {
                    const keys = ['root'];
                    const findOU = allOUs.find(ou => ou.name === container.name);
                    if (findOU) keys.push(findOU.dn);
                    setExpandedKeys(keys);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                  }}
                >
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space size={10}>
                        <div style={{
                          background: `${container.color}15`,
                          borderRadius: 8,
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {React.cloneElement(container.icon, { 
                            style: { fontSize: 20, color: container.color } 
                          })}
                        </div>
                        <Text strong style={{ fontSize: 13, color: '#1f2937' }} ellipsis>
                          {container.name}
                        </Text>
                      </Space>
                    </Space>
                    <div style={{ 
                      background: '#f9fafb',
                      borderRadius: 6,
                      padding: '10px 8px'
                    }}>
                      <Row gutter={8}>
                        <Col span={8} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>
                            {container.ous}
                          </div>
                          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, textTransform: 'uppercase' }}>
                            OUs
                          </div>
                        </Col>
                        <Col span={8} style={{ textAlign: 'center', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>
                            {container.users}
                          </div>
                          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, textTransform: 'uppercase' }}>
                            <UserOutlined style={{ fontSize: 10 }} /> Users
                          </div>
                        </Col>
                        <Col span={8} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>
                            {container.groups}
                          </div>
                          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, textTransform: 'uppercase' }}>
                            <TeamOutlined style={{ fontSize: 10 }} /> Groups
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Professional Tree Structure Card */}
      <Card 
        style={{ 
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e5e7eb'
        }}
        bodyStyle={{ padding: 0 }}
      >
        {/* Professional Search Header */}
        <div style={{ 
          background: 'linear-gradient(to right, #f8fafc, #ffffff)',
          borderBottom: '2px solid #e5e7eb',
          padding: '20px 24px'
        }}>
          <Row align="middle" justify="space-between" gutter={16}>
            <Col flex="auto">
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text strong style={{ fontSize: 15, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <DatabaseOutlined /> Directory Structure
                </Text>
                <Input
                  placeholder="Search organizational units, users, or groups..."
                  prefix={<SearchOutlined style={{ color: '#6b7280', fontSize: 16 }} />}
                  allowClear
                  size="large"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ 
                    borderRadius: 8,
                    border: '2px solid #e5e7eb',
                    background: '#ffffff'
                  }}
                />
              </Space>
            </Col>
            <Col>
              <Space>
                <Tag style={{ 
                  background: '#eff6ff',
                  color: '#1e40af',
                  border: '1px solid #bfdbfe',
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 600
                }}>
                  <FolderOutlined /> {filteredTreeData.length > 0 ? filteredTreeData[0]?.children?.length || 0 : 0} Containers
                </Tag>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Tree View Content */}
        <div style={{ padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <Spin size="large" tip={
                <span style={{ color: '#6b7280', fontSize: 14, marginTop: 12, display: 'block' }}>
                  Loading Active Directory structure...
                </span>
              } />
            </div>
          ) : filteredTreeData.length === 0 ? (
            <Empty 
              description={
                <span style={{ color: '#6b7280', fontSize: 14 }}>
                  No data found matching your search criteria
                </span>
              }
              style={{ padding: '60px 0' }}
            />
          ) : (
            <div style={{ 
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '16px',
              background: '#fafbfc'
            }}>
              <Tree
                treeData={filteredTreeData}
                showIcon
                showLine={{ showLeafIcon: false }}
                expandedKeys={expandedKeys}
                onExpand={handleExpand}
                onSelect={handleSelect}
                height={700}
                style={{ 
                  fontSize: 14,
                  background: 'transparent'
                }}
                blockNode
              />
            </div>
          )}
        </div>
      </Card>

      {/* Professional Detail Drawer */}
      <Drawer
        title={
          <div style={{ 
            padding: '12px 0',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <Space size="middle" align="center">
              <div style={{
                background: selectedNode?.type === 'ou' ? '#eff6ff' : 
                           selectedNode?.type === 'user' ? '#f0fdf4' :
                           selectedNode?.type === 'group' ? '#fff7ed' : '#f3f4f6',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {selectedNode?.type === 'domain' && <GlobalOutlined style={{ fontSize: 22, color: '#3b82f6' }} />}
                {selectedNode?.type === 'ou' && React.cloneElement(getContainerIcon(selectedNode.ou?.name), { style: { fontSize: 22 } })}
                {selectedNode?.type === 'user' && <UserOutlined style={{ fontSize: 22, color: '#10b981' }} />}
                {selectedNode?.type === 'group' && <TeamOutlined style={{ fontSize: 22, color: '#f59e0b' }} />}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                  {selectedNode?.ou?.name || 
                   selectedNode?.user?.cn || 
                   selectedNode?.group?.cn ||
                   selectedNode?.name ||
                   'Details'}
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {selectedNode?.type === 'ou' && 'Organizational Unit'}
                  {selectedNode?.type === 'user' && 'User Account'}
                  {selectedNode?.type === 'group' && 'Security Group'}
                  {selectedNode?.type === 'domain' && 'Domain'}
                </Text>
              </div>
            </Space>
          </div>
        }
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={650}
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
        {/* OU Details */}
        {selectedNode?.type === 'ou' && (
          <div>
            <Card 
              size="small" 
              style={{ 
                marginBottom: 20,
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
                  fontSize: 13
                }}
                contentStyle={{
                  background: '#ffffff',
                  color: '#1f2937'
                }}
              >
                <Descriptions.Item label="Container Name">
                  <Text copyable style={{ fontSize: 14, fontWeight: 500 }}>{selectedNode.ou.name}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Distinguished Name">
                  <Text copyable code style={{ fontSize: 11, wordBreak: 'break-all', background: '#f3f4f6', padding: '4px 8px', borderRadius: 4 }}>
                    {selectedNode.ou.dn}
                  </Text>
                </Descriptions.Item>
                {selectedNode.ou.description && (
                  <Descriptions.Item label="Description">
                    <Text style={{ fontSize: 13 }}>{selectedNode.ou.description}</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ fontSize: 14, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <BarChartOutlined /> Container Statistics
              </Text>
            </div>
            
            <Row gutter={12}>
              <Col span={8}>
                <Card 
                  size="small" 
                  style={{ 
                    textAlign: 'center', 
                    background: '#f0fdf4', 
                    border: '2px solid #86efac',
                    borderRadius: 8
                  }}
                  bodyStyle={{ padding: '16px 12px' }}
                >
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>
                    {selectedNode.stats?.users || 0}
                  </div>
                  <Text style={{ fontSize: 12, color: '#065f46', fontWeight: 600, textTransform: 'uppercase' }}>
                    <UserOutlined /> Total Users
                  </Text>
                  <div style={{ marginTop: 6 }}>
                    <Tag color="green" style={{ fontSize: 11 }}>
                      {selectedNode.stats?.directUsers || 0} direct
                    </Tag>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card 
                  size="small" 
                  style={{ 
                    textAlign: 'center', 
                    background: '#fff7ed', 
                    border: '2px solid #fcd34d',
                    borderRadius: 8
                  }}
                  bodyStyle={{ padding: '16px 12px' }}
                >
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
                    {selectedNode.stats?.groups || 0}
                  </div>
                  <Text style={{ fontSize: 12, color: '#92400e', fontWeight: 600, textTransform: 'uppercase' }}>
                    <TeamOutlined /> Total Groups
                  </Text>
                  <div style={{ marginTop: 6 }}>
                    <Tag color="orange" style={{ fontSize: 11 }}>
                      {selectedNode.stats?.directGroups || 0} direct
                    </Tag>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card 
                  size="small" 
                  style={{ 
                    textAlign: 'center', 
                    background: '#eff6ff', 
                    border: '2px solid #93c5fd',
                    borderRadius: 8
                  }}
                  bodyStyle={{ padding: '16px 12px' }}
                >
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6', marginBottom: 4 }}>
                    {selectedNode.stats?.subOUs || 0}
                  </div>
                  <Text style={{ fontSize: 12, color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>
                    <FolderOutlined /> Sub-OUs
                  </Text>
                  <div style={{ marginTop: 6, visibility: 'hidden' }}>
                    <Tag style={{ fontSize: 11 }}>-</Tag>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {/* User Details */}
        {selectedNode?.type === 'user' && (
          <Card 
            size="small" 
            style={{ 
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
                fontSize: 13
              }}
              contentStyle={{
                background: '#ffffff',
                color: '#1f2937'
              }}
            >
              <Descriptions.Item label="Display Name">
                <Text style={{ fontSize: 14, fontWeight: 500 }}>{selectedNode.user.cn}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Username">
                <Text copyable code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 4 }}>{selectedNode.user.sAMAccountName}</Text>
              </Descriptions.Item>
              {selectedNode.user.mail && (
                <Descriptions.Item label="Email">
                  <Text copyable style={{ fontSize: 13 }}>{selectedNode.user.mail}</Text>
                </Descriptions.Item>
              )}
              {selectedNode.user.department && (
                <Descriptions.Item label="Department">
                  <Tag style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '4px 12px' }}>
                    {selectedNode.user.department}
                  </Tag>
                </Descriptions.Item>
              )}
              {selectedNode.user.title && (
                <Descriptions.Item label="Job Title">
                  <Text style={{ fontSize: 13 }}>{selectedNode.user.title}</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Distinguished Name">
                <Text copyable code style={{ fontSize: 11, wordBreak: 'break-all', background: '#f3f4f6', padding: '4px 8px', borderRadius: 4 }}>
                  {selectedNode.user.dn}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* Group Details */}
        {selectedNode?.type === 'group' && (
          <div>
            <Card 
              size="small" 
              style={{ 
                marginBottom: 20,
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
                  fontSize: 13
                }}
                contentStyle={{
                  background: '#ffffff',
                  color: '#1f2937'
                }}
              >
                <Descriptions.Item label="Group Name">
                  <Text style={{ fontSize: 14, fontWeight: 500 }}>{selectedNode.group.cn}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="SAM Account Name">
                  <Text copyable code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 4 }}>{selectedNode.group.sAMAccountName}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Member Count">
                  <Tag style={{ 
                    background: '#fff7ed',
                    color: '#92400e',
                    border: '2px solid #fcd34d',
                    padding: '6px 14px',
                    fontSize: 14,
                    fontWeight: 700
                  }}>
                    <TeamOutlined /> {selectedNode.group.member ? 
                      (Array.isArray(selectedNode.group.member) ? selectedNode.group.member.length : 1) : 
                      0} Members
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Distinguished Name">
                  <Text copyable code style={{ fontSize: 11, wordBreak: 'break-all', background: '#f3f4f6', padding: '4px 8px', borderRadius: 4 }}>
                    {selectedNode.group.dn}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {selectedNode.group.description && (
              <Card 
                size="small" 
                title={<Text strong style={{ fontSize: 13 }}>Description</Text>}
                style={{ 
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8
                }}
                headStyle={{
                  background: '#f8fafc',
                  borderBottom: '1px solid #e5e7eb'
                }}
              >
                <Paragraph style={{ margin: 0, fontSize: 13, color: '#374151' }}>
                  {selectedNode.group.description}
                </Paragraph>
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default OUManagement;
