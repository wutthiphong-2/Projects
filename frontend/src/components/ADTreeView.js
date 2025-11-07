import React, { useState, useEffect } from 'react';
import {
  Tree,
  Card,
  Typography,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Row,
  Col,
  Statistic,
  Tag,
  Divider,
  Empty,
  Spin
} from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  UserOutlined,
  TeamOutlined,
  DesktopOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  CrownOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  WifiOutlined,
  CloudOutlined,
  SettingOutlined,
  EyeOutlined,
  ExpandAltOutlined,
  CompressAltOutlined
} from '@ant-design/icons';
import axios from 'axios';
import config from '../config';
import { useAuth } from '../contexts/AuthContext';
import './ADTreeView.css';

const { Title, Text } = Typography;

const ADTreeView = () => {
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOU, setEditingOU] = useState(null);
  const [selectedOU, setSelectedOU] = useState(null);
  const [ouStats, setOuStats] = useState({});
  const [form] = Form.useForm();
  const { getAuthHeaders } = useAuth();

  useEffect(() => {
    fetchTreeData();
  }, []);

  const fetchTreeData = async () => {
    setLoading(true);
    try {
      const [ousResponse, usersResponse, groupsResponse] = await Promise.all([
        axios.get(`${config.apiUrl}/api/ous/`, {
          headers: getAuthHeaders(),
          params: { page: 1, page_size: 1000 }
        }),
        axios.get(`${config.apiUrl}/api/users/`, {
          headers: getAuthHeaders(),
          params: { page: 1, page_size: 1000 }
        }),
        axios.get(`${config.apiUrl}/api/groups/`, {
          headers: getAuthHeaders(),
          params: { page: 1, page_size: 1000 }
        })
      ]);

      const ous = ousResponse.data;
      const users = usersResponse.data;
      const groups = groupsResponse.data;

      // สร้างโครงสร้างต้นไม้
      const treeStructure = buildTreeStructure(ous, users, groups);
      setTreeData(treeStructure);

      // คำนวณสถิติ
      calculateOUStats(ous, users, groups);
      
      // ขยายโหนดหลักโดยอัตโนมัติ
      setExpandedKeys(['root', 'TBKK-Users', 'TBKK-Computers', 'TBKK-Groups']);
    } catch (error) {
      message.error('ไม่สามารถโหลดข้อมูลโครงสร้าง AD ได้');
      console.error('Error fetching tree data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTreeStructure = (ous, users, groups) => {
    // สร้าง root node
    const rootNode = {
      title: (
        <div className="tree-node-root">
          <GlobalOutlined className="tree-icon-domain" />
          <span className="tree-title-domain">TBKK.CO.TH</span>
          <Tag color="blue" className="tree-tag-domain">Domain</Tag>
        </div>
      ),
      key: 'root',
      icon: <GlobalOutlined className="tree-icon-domain" />,
      children: []
    };

    // จัดกลุ่ม OU ตามประเภท
    const ouGroups = {
      'Domain Controllers': [],
      'TBKK-Users': [],
      'TBKK-Computers': [],
      'TBKK-Groups': [],
      'Other': []
    };

    ous.forEach(ou => {
      const ouPath = ou.dn.replace('DC=TBKK,DC=CO,DC=TH', '').trim();
      
      if (ouPath.includes('Domain Controllers')) {
        ouGroups['Domain Controllers'].push(ou);
      } else if (ouPath.includes('TBKK-Users')) {
        ouGroups['TBKK-Users'].push(ou);
      } else if (ouPath.includes('TBKK Computers')) {
        ouGroups['TBKK-Computers'].push(ou);
      } else if (ouPath.includes('TBKK Groups')) {
        ouGroups['TBKK-Groups'].push(ou);
      } else {
        ouGroups['Other'].push(ou);
      }
    });

    // สร้างโหนดหลัก
    const mainNodes = [
      {
        title: (
          <div className="tree-node-main">
            <CrownOutlined className="tree-icon-controller" />
            <span className="tree-title-main">Domain Controllers</span>
            <Badge count={ouGroups['Domain Controllers'].length} className="tree-badge" />
          </div>
        ),
        key: 'Domain Controllers',
        icon: <CrownOutlined className="tree-icon-controller" />,
        children: buildOUChildren(ouGroups['Domain Controllers'], users, groups, 'Domain Controllers')
      },
      {
        title: (
          <div className="tree-node-main">
            <UserOutlined className="tree-icon-users" />
            <span className="tree-title-main">TBKK-Users</span>
            <Badge count={ouGroups['TBKK-Users'].length} className="tree-badge" />
          </div>
        ),
        key: 'TBKK-Users',
        icon: <UserOutlined className="tree-icon-users" />,
        children: buildOUChildren(ouGroups['TBKK-Users'], users, groups, 'TBKK-Users')
      },
      {
        title: (
          <div className="tree-node-main">
            <DesktopOutlined className="tree-icon-computers" />
            <span className="tree-title-main">TBKK-Computers</span>
            <Badge count={ouGroups['TBKK-Computers'].length} className="tree-badge" />
          </div>
        ),
        key: 'TBKK-Computers',
        icon: <DesktopOutlined className="tree-icon-computers" />,
        children: buildOUChildren(ouGroups['TBKK-Computers'], users, groups, 'TBKK-Computers')
      },
      {
        title: (
          <div className="tree-node-main">
            <TeamOutlined className="tree-icon-groups" />
            <span className="tree-title-main">TBKK-Groups</span>
            <Badge count={ouGroups['TBKK-Groups'].length} className="tree-badge" />
          </div>
        ),
        key: 'TBKK-Groups',
        icon: <TeamOutlined className="tree-icon-groups" />,
        children: buildOUChildren(ouGroups['TBKK-Groups'], users, groups, 'TBKK-Groups')
      },
      {
        title: (
          <div className="tree-node-main">
            <SettingOutlined className="tree-icon-other" />
            <span className="tree-title-main">Other</span>
            <Badge count={ouGroups['Other'].length} className="tree-badge" />
          </div>
        ),
        key: 'Other',
        icon: <SettingOutlined className="tree-icon-other" />,
        children: buildOUChildren(ouGroups['Other'], users, groups, 'Other')
      }
    ];

    rootNode.children = mainNodes;
    return [rootNode];
  };

  const buildOUChildren = (ous, users, groups, parentType) => {
    return ous.map(ou => {
      const userCount = users.filter(user => user.dn.includes(ou.name)).length;
      const groupCount = groups.filter(group => group.dn.includes(ou.name)).length;
      
      return {
        title: (
          <div className="tree-node-ou">
            <div className="tree-node-info">
              <FolderOutlined className="tree-icon-ou" />
              <span className="tree-title-ou">{ou.name}</span>
              <div className="tree-node-stats">
                <Tag color="blue" size="small">{userCount} Users</Tag>
                <Tag color="green" size="small">{groupCount} Groups</Tag>
              </div>
            </div>
            <div className="tree-node-actions">
              <Tooltip title="ดูรายละเอียด">
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(ou);
                  }}
                  className="tree-action-button"
                />
              </Tooltip>
              <Tooltip title="แก้ไข">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditOU(ou);
                  }}
                  className="tree-action-button"
                />
              </Tooltip>
              <Tooltip title="ลบ">
                <Popconfirm
                  title="คุณแน่ใจหรือไม่ที่จะลบ OU นี้?"
                  onConfirm={(e) => {
                    e.stopPropagation();
                    handleDeleteOU(ou.dn);
                  }}
                  okText="ใช่"
                  cancelText="ไม่"
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    className="tree-action-button tree-action-delete"
                  />
                </Popconfirm>
              </Tooltip>
            </div>
          </div>
        ),
        key: ou.dn,
        icon: <FolderOutlined className="tree-icon-ou" />,
        children: buildSubOUs(ou, users, groups)
      };
    });
  };

  const buildSubOUs = (parentOU, users, groups) => {
    // หา OU ย่อยที่อยู่ใน OU นี้
    const subOUs = [];
    // ตัวอย่าง: ถ้า parentOU เป็น "Phase10" ให้หา OU ที่อยู่ใน "Phase10"
    
    return subOUs.map(subOU => {
      const userCount = users.filter(user => user.dn.includes(subOU.name)).length;
      return {
        title: (
          <div className="tree-node-subou">
            <FolderOutlined className="tree-icon-subou" />
            <span className="tree-title-subou">{subOU.name}</span>
            <Tag color="orange" size="small">{userCount} Users</Tag>
          </div>
        ),
        key: subOU.dn,
        icon: <FolderOutlined className="tree-icon-subou" />
      };
    });
  };

  const calculateOUStats = (ous, users, groups) => {
    const stats = {
      totalOUs: ous.length,
      totalUsers: users.length,
      totalGroups: groups.length,
      domainControllers: ous.filter(ou => ou.dn.includes('Domain Controllers')).length,
      userOUs: ous.filter(ou => ou.dn.includes('TBKK-Users')).length,
      computerOUs: ous.filter(ou => ou.dn.includes('TBKK Computers')).length,
      groupOUs: ous.filter(ou => ou.dn.includes('TBKK Groups')).length
    };
    setOuStats(stats);
  };

  const handleViewDetails = (ou) => {
    setSelectedOU(ou);
    // แสดง modal รายละเอียด OU
  };

  const handleEditOU = (ou) => {
    setEditingOU(ou);
    form.setFieldsValue({
      name: ou.name,
      description: ou.description
    });
    setIsModalVisible(true);
  };

  const handleDeleteOU = async (dn) => {
    try {
      await axios.delete(`${config.apiUrl}/api/ous/${encodeURIComponent(dn)}`, {
        headers: getAuthHeaders()
      });
      message.success('ลบ OU สำเร็จ');
      fetchTreeData();
    } catch (error) {
      message.error('ไม่สามารถลบ OU ได้');
    }
  };

  const handleAddOU = () => {
    setEditingOU(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingOU) {
        await axios.put(`${config.apiUrl}/api/ous/${encodeURIComponent(editingOU.dn)}`, values, {
          headers: getAuthHeaders()
        });
        message.success('แก้ไข OU สำเร็จ');
      } else {
        await axios.post(`${config.apiUrl}/api/ous`, values, {
          headers: getAuthHeaders()
        });
        message.success('สร้าง OU สำเร็จ');
      }
      
      setIsModalVisible(false);
      fetchTreeData();
    } catch (error) {
      message.error(editingOU ? 'ไม่สามารถแก้ไข OU ได้' : 'ไม่สามารถสร้าง OU ได้');
    }
  };

  const handleExpandAll = () => {
    const allKeys = getAllKeys(treeData);
    setExpandedKeys(allKeys);
  };

  const handleCollapseAll = () => {
    setExpandedKeys([]);
  };

  const getAllKeys = (nodes) => {
    let keys = [];
    nodes.forEach(node => {
      keys.push(node.key);
      if (node.children) {
        keys = keys.concat(getAllKeys(node.children));
      }
    });
    return keys;
  };

  const onSelect = (selectedKeys, info) => {
    setSelectedKeys(selectedKeys);
    if (info.selectedNodes.length > 0) {
      const selectedNode = info.selectedNodes[0];
      // จัดการการเลือกโหนด
    }
  };

  const onExpand = (expandedKeys) => {
    setExpandedKeys(expandedKeys);
  };

  if (loading) {
    return (
      <div className="tree-loading">
        <Spin size="large" />
        <Text>กำลังโหลดโครงสร้าง AD...</Text>
      </div>
    );
  }

  return (
    <div className="ad-tree-container">
      <Card className="ad-tree-card">
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} className="tree-title">
              🌳 โครงสร้าง Active Directory
            </Title>
            <Text className="tree-subtitle">
              แสดงโครงสร้าง OU แบบ Hierarchical Tree
            </Text>
          </Col>
          <Col>
            <Space size="large">
              <Button
                icon={<ExpandAltOutlined />}
                onClick={handleExpandAll}
                className="tree-control-button"
              >
                ขยายทั้งหมด
              </Button>
              <Button
                icon={<CompressAltOutlined />}
                onClick={handleCollapseAll}
                className="tree-control-button"
              >
                หดทั้งหมด
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchTreeData}
                className="tree-control-button"
              >
                รีเฟรช
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddOU}
                className="tree-add-button"
              >
                เพิ่ม OU
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card size="small" className="tree-stat-card">
              <Statistic
                title="OU ทั้งหมด"
                value={ouStats.totalOUs || 0}
                prefix={<FolderOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small" className="tree-stat-card">
              <Statistic
                title="ผู้ใช้ทั้งหมด"
                value={ouStats.totalUsers || 0}
                prefix={<UserOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small" className="tree-stat-card">
              <Statistic
                title="กลุ่มทั้งหมด"
                value={ouStats.totalGroups || 0}
                prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small" className="tree-stat-card">
              <Statistic
                title="Domain Controllers"
                value={ouStats.domainControllers || 0}
                prefix={<CrownOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Tree View */}
        <div className="tree-view-container">
          <Tree
            showIcon
            showLine={{ showLeafIcon: false }}
            defaultExpandAll={false}
            expandedKeys={expandedKeys}
            selectedKeys={selectedKeys}
            onSelect={onSelect}
            onExpand={onExpand}
            treeData={treeData}
            className="ad-tree"
          />
        </div>
      </Card>

      {/* Add/Edit OU Modal */}
      <Modal
        title={
          <span className="tree-modal-title">
            {editingOU ? '✏️ แก้ไข OU' : '✨ เพิ่ม OU ใหม่'}
          </span>
        }
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        className="tree-modal"
      >
        <Form
          form={form}
          layout="vertical"
          name="ouForm"
        >
          <Form.Item
            name="name"
            label="ชื่อ OU"
            rules={[
              {
                required: true,
                message: 'กรุณากรอกชื่อ OU!',
              },
            ]}
          >
            <Input placeholder="ชื่อ OU" />
          </Form.Item>

          <Form.Item
            name="description"
            label="คำอธิบาย"
          >
            <Input.TextArea 
              placeholder="คำอธิบาย OU" 
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ADTreeView;

