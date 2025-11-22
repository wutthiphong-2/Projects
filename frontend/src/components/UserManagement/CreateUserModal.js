import React, { useState, useCallback } from 'react';
import {
  Modal,
  Form,
  Steps,
  Button,
  Space,
  Card,
  Row,
  Col,
  Input,
  TreeSelect,
  Tag,
  Alert,
  Descriptions,
  Tooltip,
  Collapse,
  Radio,
  Typography,
  Empty,
  Spin,
  message
} from 'antd';
import {
  UserAddOutlined,
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
  EditOutlined,
  MailOutlined,
  BankOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  LockOutlined,
  UnlockOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { userService } from '../../services/userService';
import { ouService } from '../../services/ouService';
import { GROUP_DEFAULTS_CONFIG, getDefaultGroupsForOU } from '../../config/groupDefaults';
import { transformFormDataToApiFormat } from '../../utils/userFormHelpers';
import { parseCreateUserError } from '../../utils/userErrorParsers';
import { handleCreateUserSuccess } from '../../utils/userActionHelpers';
import { TIMING } from '../../constants/userManagement';

const { Text } = Typography;
const { Step } = Steps;
const { Panel } = Collapse;

const CreateUserModal = ({
  visible,
  onCancel,
  onSuccess,
  availableOUs = [],
  categorizedGroups = {},
  ouTreeData = [],
  loadingOUs = false,
  fetchUsers,
  users = []
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOU, setSelectedOU] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [suggestedGroupsData, setSuggestedGroupsData] = useState(null);
  const [step1Valid, setStep1Valid] = useState(false);

  // Reset state when modal closes
  const handleCancel = useCallback(() => {
    form.resetFields();
    setCurrentStep(0);
    setSelectedOU(null);
    setSelectedGroups([]);
    setSuggestedGroupsData(null);
    setStep1Valid(false);
    onCancel();
  }, [form, onCancel]);

  // Fetch suggested groups from API based on OU analysis
  const fetchSuggestedGroupsForOU = useCallback(async (ouDn) => {
    try {
      const data = await ouService.getSuggestedGroups(ouDn);
      const { totalUsers, suggestedGroups } = data;
      
      setSuggestedGroupsData(data);
      
      const suggestedGroupDNs = suggestedGroups.map(g => g.dn);
      
      const baseGroupDNs = [];
      Object.values(categorizedGroups).forEach(categoryGroups => {
        categoryGroups.forEach(group => {
          if (GROUP_DEFAULTS_CONFIG.autoAssign.baseGroups.includes(group.cn)) {
            baseGroupDNs.push(group.dn);
          }
        });
      });
      
      const allDefaultGroups = [...new Set([...baseGroupDNs, ...suggestedGroupDNs])];
      setSelectedGroups(allDefaultGroups);
      
      if (suggestedGroups.length > 0) {
        const topGroups = suggestedGroups.slice(0, 3);
        const groupNames = topGroups.map(g => `${g.cn} (${g.percentage}%)`).join(', ');
        
        message.info({
          content: `🎯 Auto-selected ${allDefaultGroups.length} groups\nBased on ${totalUsers} existing users in this OU\nTop: ${groupNames}`,
          duration: TIMING.NOTIFICATION_DURATION.MEDIUM
        });
      } else if (totalUsers === 0) {
        message.warning({
          content: 'No existing users in this OU. Using default groups.',
          duration: TIMING.NOTIFICATION_DURATION.SHORT
        });
        
        const fallbackGroups = getDefaultGroupsForOU(ouDn, categorizedGroups);
        setSelectedGroups(fallbackGroups);
      }
      
    } catch (error) {
      const fallbackGroups = getDefaultGroupsForOU(ouDn, categorizedGroups);
      setSelectedGroups(fallbackGroups);
      
      message.warning({
        content: 'Could not analyze OU. Using default groups.',
        duration: TIMING.NOTIFICATION_DURATION.SHORT
      });
    }
  }, [categorizedGroups]);

  // Auto-assign groups when OU changes
  const handleOUChange = useCallback(async (ouDn) => {
    setSelectedOU(ouDn);
    
    if (ouDn) {
      await fetchSuggestedGroupsForOU(ouDn);
    } else {
      const baseGroupDNs = [];
      Object.values(categorizedGroups).forEach(categoryGroups => {
        categoryGroups.forEach(group => {
          if (GROUP_DEFAULTS_CONFIG.autoAssign.baseGroups.includes(group.cn)) {
            baseGroupDNs.push(group.dn);
          }
        });
      });
      setSelectedGroups(baseGroupDNs);
    }
  }, [categorizedGroups, fetchSuggestedGroupsForOU]);

  const handleNextStep = useCallback(async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['cn', 'sAMAccountName', 'password', 'confirmPassword', 'mail']);
        setStep1Valid(true);
        setCurrentStep(1);
      } else if (currentStep === 1) {
        setCurrentStep(2);
      }
    } catch (error) {
      message.error('Please fill in all required fields');
    }
  }, [currentStep, form]);

  const handleBackStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleCreate = useCallback(async () => {
    let formValues = null;
    
    try {
      formValues = await form.validateFields();
      
      const dataToSend = transformFormDataToApiFormat(formValues, selectedOU, selectedGroups);
      const response = await userService.createUser(dataToSend);
      
      handleCancel();
      
      await handleCreateUserSuccess(
        response,
        formValues,
        selectedOU,
        availableOUs,
        fetchUsers,
        (userName) => message.success(`User ${userName} created successfully`),
        message,
        users
      );
      
      if (onSuccess) {
        onSuccess(response);
      }
      
    } catch (error) {
      const { title, message: errorMessage } = parseCreateUserError(error, formValues);
      message.error({
        content: errorMessage,
        duration: 5
      });
    }
  }, [form, selectedOU, selectedGroups, availableOUs, fetchUsers, users, handleCancel, onSuccess]);

  const getResponsiveWidth = (desktopWidth, tabletWidth, mobileWidth = '100%') => {
    if (window.innerWidth >= 1200) return desktopWidth;
    if (window.innerWidth >= 768) return tabletWidth ?? desktopWidth;
    return mobileWidth;
  };

  return (
    <Modal
      title={
        <Space>
          <UserAddOutlined />
          <span>Create New User</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            (Step {currentStep + 1} of 3)
          </Text>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      destroyOnHidden
      width={getResponsiveWidth(720, 560, '95%')}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            onClick={handleBackStep}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          <div>
            {currentStep < 2 ? (
              <Button
                type="primary"
                onClick={handleNextStep}
              >
                Next Step
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleCreate}
                icon={<CheckCircleOutlined />}
              >
                Create User
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ padding: '20px 0' }}>
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          <Step 
            title="Account" 
            icon={<UserOutlined />}
            description="Basic Information"
          />
          <Step 
            title="Groups" 
            icon={<TeamOutlined />}
            description="Group Membership"
          />
          <Step 
            title="Review" 
            icon={<CheckCircleOutlined />}
            description="Confirm"
          />
        </Steps>

        <Form
          form={form}
          layout="vertical"
          name="createUserForm"
        >
          {/* Step 1: Essential Information */}
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
            <div className="umx-step-wrapper">
              <div className="umx-step-columns">
                <Card
                  title="Account Information"
                  extra={<Tag color="blue">Required</Tag>}
                  style={{ marginBottom: 16 }}
                >
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="cn"
                        label={
                          <Space>
                            <span>Common Name (CN)</span>
                            <Tooltip title="Full name as it will appear in Active Directory">
                              <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                            </Tooltip>
                          </Space>
                        }
                        rules={[{ required: true, message: 'Please enter CN' }]}
                      >
                        <Input placeholder="e.g., Wutthiphong Chaiyaphoom" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="sAMAccountName"
                        label={
                          <Space>
                            <span>Username (Login)</span>
                            <Tooltip title="This will be used to login. Cannot be changed later.">
                              <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                            </Tooltip>
                          </Space>
                        }
                        rules={[{ required: true, message: 'Please enter username' }]}
                      >
                        <Input placeholder="e.g., wutthiphong.c" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="password"
                        label="Password"
                        rules={[
                          { required: true, message: 'Please enter password' },
                          { min: 8, message: 'Password must be at least 8 characters' },
                          {
                            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};:'",.<>\/\\|`~])[A-Za-z\d@$!%*?&#^()_+\-=\[\]{};:'",.<>\/\\|`~]{8,}$/,
                            message: 'Password must contain: uppercase, lowercase, number, and special character'
                          }
                        ]}
                      >
                        <Input.Password 
                          placeholder="Enter strong password" 
                          autoComplete="new-password"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="confirmPassword"
                        label="Confirm Password"
                        dependencies={['password']}
                        rules={[
                          { required: true, message: 'Please confirm your password' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('password') === value) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error('The two passwords do not match!'));
                            },
                          }),
                        ]}
                      >
                        <Input.Password
                          placeholder="Re-enter password"
                          autoComplete="new-password"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="mail"
                        label={
                          <Space>
                            <span>Email</span>
                            <Tooltip title="Corporate email address">
                              <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                            </Tooltip>
                          </Space>
                        }
                        rules={[
                          { required: true, message: 'Please enter email' },
                          { type: 'email', message: 'Please enter valid email' }
                        ]}
                      >
                        <Input placeholder="user@tbkk.co.th" suffix={<MailOutlined />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="displayName"
                        label="Display Name"
                      >
                        <Input placeholder="Auto-filled from CN" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <div style={{ marginTop: 16 }}>
                    <Form.Item
                      name="accountOption"
                      label={
                        <Space>
                          <SettingOutlined />
                          <span>Account Options</span>
                        </Space>
                      }
                      rules={[{ required: false }]}
                    >
                      <Radio.Group>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Radio value="passwordMustChange">
                            <Space>
                              <LockOutlined />
                              <span>User must change password at next logon</span>
                            </Space>
                          </Radio>
                          <Radio value="userCannotChangePassword">
                            <Space>
                              <UnlockOutlined />
                              <span>User cannot change password</span>
                            </Space>
                          </Radio>
                          <Radio value="passwordNeverExpires">
                            <Space>
                              <ClockCircleOutlined />
                              <span>Password never expires</span>
                            </Space>
                          </Radio>
                          <Radio value="storePasswordReversible">
                            <Space>
                              <SafetyCertificateOutlined />
                              <span>Store password using reversible encryption</span>
                            </Space>
                          </Radio>
                          <Radio value="none">
                            <Text type="secondary">None (default settings)</Text>
                          </Radio>
                        </Space>
                      </Radio.Group>
                    </Form.Item>
                  </div>
                </Card>

                <Card
                  title="Profile & Contact Information"
                  style={{ marginBottom: 16 }}
                >
                  <Collapse defaultActiveKey={['personal', 'contact']}>
                    <Panel header="Personal Details" key="personal">
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="givenName"
                            label="First Name"
                          >
                            <Input placeholder="Enter first name" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="sn"
                            label="Last Name"
                          >
                            <Input placeholder="Enter last name" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="title"
                            label="Job Title"
                          >
                            <Input placeholder="Enter job title" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="department"
                            label="Department"
                          >
                            <Input placeholder="Enter department name" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="company"
                            label="Company"
                          >
                            <Input placeholder="Enter company name" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="employeeID"
                            label="Employee ID"
                          >
                            <Input placeholder="Enter employee ID" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="departmentNumber"
                            label="Department Number"
                          >
                            <Input placeholder="e.g., K1IT00" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Panel>

                    <Panel header="Contact & Office" key="contact">
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="telephoneNumber"
                            label="Phone"
                          >
                            <Input placeholder="Enter phone number" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="mobile"
                            label="Mobile"
                          >
                            <Input placeholder="Enter mobile number" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="physicalDeliveryOfficeName"
                            label="Office Location"
                          >
                            <Input placeholder="Enter office location" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="description"
                            label="Description"
                          >
                            <Input.TextArea rows={3} placeholder="Enter description or notes" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Panel>
                  </Collapse>
                </Card>
              </div>

              <Card
                title="Organizational Placement"
                style={{ marginBottom: 16 }}
              >
                <Form.Item
                  label={
                    <Space>
                      <span>Organizational Unit (OU)</span>
                      <Tooltip title="Select where this user will be created. This will auto-select appropriate groups.">
                        <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                      </Tooltip>
                    </Space>
                  }
                >
                  <TreeSelect
                    placeholder="Select OU (optional - defaults to CN=Users)"
                    allowClear
                    showSearch
                    value={selectedOU}
                    onChange={handleOUChange}
                    treeData={ouTreeData}
                    treeDefaultExpandAll={false}
                    treeDefaultExpandedKeys={[]}
                    style={{ width: '100%' }}
                    listHeight={400}
                    loading={loadingOUs}
                    notFoundContent={
                      loadingOUs ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                          <Spin size="large" />
                          <div style={{ marginTop: 16, color: '#6b7280' }}>
                            กำลังโหลด...
                          </div>
                        </div>
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="ไม่พบ OU"
                          style={{ padding: '40px 20px' }}
                        />
                      )
                    }
                    filterTreeNode={(input, node) => {
                      const title = typeof node.title === 'string' ? node.title : (node.name || '');
                      const fullPath = node.fullPath || '';
                      const searchText = input.toLowerCase();
                      return title.toLowerCase().includes(searchText) ||
                             fullPath.toLowerCase().includes(searchText);
                    }}
                    treeNodeLabelProp="fullPath"
                    suffixIcon={<BankOutlined />}
                  />
                  {selectedOU && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="success" style={{ fontSize: 12 }}>
                        OU Selected: {availableOUs.find(ou => ou.dn === selectedOU)?.name}
                      </Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Groups will be auto-selected in the next step
                        </Text>
                      </div>
                    </div>
                  )}
                </Form.Item>
              </Card>
            </div>
          </div>

          {/* Step 2: Groups & Permissions */}
          <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
            <Alert
              message="Group Membership & Permissions"
              description="Review and customize the groups that will be assigned to this user"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 16 }}>
              <Text strong>Group Membership ({selectedGroups.length} selected)</Text>
            </div>

            {Object.keys(categorizedGroups).map(category => {
              let groups = categorizedGroups[category] || [];
              
              if (category === 'Others') {
                const commonSystemGroups = [
                  'Domain Users',
                  'Domain Admins',
                  'Domain Computers',
                  'Remote Desktop Users',
                  'Administrators',
                  'Users',
                  'Guests'
                ];
                groups = groups.filter(g => commonSystemGroups.includes(g.cn));
              }
              
              if (groups.length === 0) return null;

              return (
                <div key={category} style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>{category}</Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                      ({groups.length} groups)
                    </Text>
                  </div>
                  <div style={{
                    background: '#f9fafb',
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid #e5e7eb'
                  }}>
                    <Space wrap size="small">
                      {groups.map(group => {
                        const suggestedGroup = suggestedGroupsData?.suggestedGroups?.find(
                          sg => sg.dn === group.dn
                        );
                        const isSuggested = !!suggestedGroup;
                        const percentage = suggestedGroup?.percentage || 0;
                        
                        return (
                          <Tag.CheckableTag
                            key={group.dn}
                            checked={selectedGroups.includes(group.dn)}
                            onChange={(checked) => {
                              if (checked) {
                                setSelectedGroups([...selectedGroups, group.dn]);
                              } else {
                                setSelectedGroups(selectedGroups.filter(dn => dn !== group.dn));
                              }
                            }}
                          >
                            {isSuggested && '⭐ '}
                            {group.cn}
                            {isSuggested && percentage > 0 && ` ${percentage}%`}
                          </Tag.CheckableTag>
                        );
                      })}
                    </Space>
                  </div>
                </div>
              );
            })}

            {selectedGroups.length > 0 && (
              <Alert
                message={`${selectedGroups.length} group(s) selected`}
                type="success"
                style={{ marginTop: 16 }}
              />
            )}
          </div>

          {/* Step 3: Review & Confirm */}
          <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
            <Alert
              message="Review & Confirm"
              description="Review all information before creating the user"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form.Item shouldUpdate noStyle>
              {() => (
                <Card
                  title="User Information Summary"
                  style={{ marginBottom: 16 }}
                >
                  <Descriptions column={1} bordered>
                    <Descriptions.Item label="Common Name">
                      <Text strong>{form.getFieldValue('cn') || '-'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Username (Login)">
                      <Text code>{form.getFieldValue('sAMAccountName') || '-'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Email">
                      <Space>
                        <MailOutlined />
                        <span>{form.getFieldValue('mail') || '-'}</span>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Display Name">
                      {form.getFieldValue('displayName') || form.getFieldValue('cn') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="First Name">
                      {form.getFieldValue('givenName') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Last Name">
                      {form.getFieldValue('sn') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Job Title">
                      {form.getFieldValue('title') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Department">
                      {form.getFieldValue('department') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Company">
                      {form.getFieldValue('company') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Employee ID">
                      {form.getFieldValue('employeeID') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Phone">
                      {form.getFieldValue('telephoneNumber') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Mobile">
                      {form.getFieldValue('mobile') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Office Location">
                      {form.getFieldValue('physicalDeliveryOfficeName') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Description">
                      {form.getFieldValue('description') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Organizational Unit">
                      {selectedOU ? (
                        <Space>
                          <BankOutlined />
                          <span>{availableOUs.find(ou => ou.dn === selectedOU)?.fullPath}</span>
                        </Space>
                      ) : (
                        <Text type="secondary">Default (CN=Users)</Text>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Groups">
                      <div>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>
                          {selectedGroups.length} group(s) will be assigned
                        </Text>
                        <Space wrap size="small">
                          {selectedGroups.slice(0, 10).map(groupDn => {
                            let groupName = 'Unknown';
                            let percentage = 0;
                            
                            Object.values(categorizedGroups).forEach(categoryGroups => {
                              const group = categoryGroups.find(g => g.dn === groupDn);
                              if (group) groupName = group.cn;
                            });
                            
                            const suggestedGroup = suggestedGroupsData?.suggestedGroups?.find(
                              sg => sg.dn === groupDn
                            );
                            if (suggestedGroup) percentage = suggestedGroup.percentage;
                            
                            return (
                              <Tag key={groupDn} color={percentage > 0 ? 'blue' : 'default'}>
                                {percentage > 0 && '⭐ '}
                                {groupName}
                                {percentage > 0 && ` ${percentage}%`}
                              </Tag>
                            );
                          })}
                          {selectedGroups.length > 10 && (
                            <Tag>+{selectedGroups.length - 10} more...</Tag>
                          )}
                        </Space>
                      </div>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}
            </Form.Item>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Space>
                <Button 
                  onClick={() => setCurrentStep(0)} 
                  icon={<EditOutlined />}
                >
                  Edit Account Info
                </Button>
                <Button 
                  onClick={() => setCurrentStep(1)} 
                  icon={<TeamOutlined />}
                >
                  Edit Groups
                </Button>
              </Space>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default CreateUserModal;
