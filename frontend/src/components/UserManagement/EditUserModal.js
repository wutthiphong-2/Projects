import React, { useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  Form,
  Tabs,
  Button,
  Space,
  Card,
  Row,
  Col,
  Input,
  Radio,
  Tooltip,
  Typography,
  App
} from 'antd';
import {
  EditOutlined,
  IdcardOutlined,
  PhoneOutlined,
  SettingOutlined,
  LockOutlined,
  UnlockOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { userService } from '../../services/userService';
import { getSelectedAccountOption, prepareUpdateData, convertAccountOptionToFields } from '../../utils/userFormHelpers';
import { refreshUserAfterUpdate } from '../../utils/userActionHelpers';
import { parseUpdateUserError } from '../../utils/userErrorParsers';

const { Text } = Typography;

const EditUserModal = ({
  visible,
  onCancel,
  editingUser,
  editForm,
  fetchUsers,
  getResponsiveWidth,
  screens
}) => {
  const { message: antdMessage } = App.useApp();

  // Helper function for responsive width
  const getResponsiveWidthHelper = useMemo(() => {
    if (getResponsiveWidth) {
      return (desktop, tablet, mobile) => getResponsiveWidth(desktop, tablet, mobile);
    }
    return (desktop, tablet, mobile) => {
      if (screens?.xl || screens?.lg) return desktop;
      if (screens?.md || screens?.sm) return tablet;
      return mobile;
    };
  }, [getResponsiveWidth, screens]);

  // Set edit form values when modal opens
  useEffect(() => {
    if (visible && editingUser && editForm) {
      // Determine which account option is selected
      const selectedAccountOption = getSelectedAccountOption(editingUser);
      
      // Reset form first to clear any previous values
      editForm.resetFields();
      
      // Set form values with fresh user data
      // Use setTimeout to ensure Form component is mounted
      setTimeout(() => {
        editForm.setFieldsValue({
          cn: editingUser.cn || undefined,
          sAMAccountName: editingUser.sAMAccountName || undefined,
          mail: editingUser.mail || undefined,
          displayName: editingUser.displayName || undefined,
          givenName: editingUser.givenName || undefined,
          sn: editingUser.sn || undefined,
          title: editingUser.title || undefined,
          telephoneNumber: editingUser.telephoneNumber || undefined,
          mobile: editingUser.mobile || undefined,
          department: editingUser.department || undefined,
          company: editingUser.company || undefined,
          employeeID: editingUser.employeeID || undefined, // Ensure null/empty becomes undefined
          physicalDeliveryOfficeName: editingUser.physicalDeliveryOfficeName || undefined,
          streetAddress: editingUser.streetAddress || undefined,
          l: editingUser.l || undefined,
          st: editingUser.st || undefined,
          postalCode: editingUser.postalCode || undefined,
          co: editingUser.co || undefined,
          description: editingUser.description || undefined,
          // Account option (single selection)
          accountOption: selectedAccountOption,
        });
        
        // Debug: Log employeeID value
        if (process.env.NODE_ENV === 'development') {
          console.debug('[EditUserModal] Setting form values', {
            employeeID: editingUser.employeeID,
            employeeIDType: typeof editingUser.employeeID,
            hasEmployeeID: !!editingUser.employeeID,
            allFields: editForm.getFieldsValue()
          });
        }
      }, 0);
    } else if (!visible && editForm) {
      // Reset form when modal closes
      editForm.resetFields();
    }
  }, [visible, editingUser, editForm]);

  // Handle form submission
  const handleEditModalOk = useCallback(async () => {
    if (!editingUser?.dn) {
      antdMessage.error('No user selected');
      return;
    }

    try {
      // Validate form
      const formValues = await editForm.validateFields();
      
      // Prepare update data (exclude sAMAccountName and password)
      const { accountOption, ...restFormValues } = formValues;
      let updateData = prepareUpdateData(restFormValues, ['sAMAccountName', 'password']);
      
      // Convert accountOption to individual boolean fields
      if (accountOption !== undefined && accountOption !== 'none') {
        const accountFields = convertAccountOptionToFields(accountOption);
        Object.assign(updateData, accountFields);
      }
      
      // Update user via API
      const response = await userService.updateUser(editingUser.dn, updateData);
      
      // Refresh user data
      const refreshedUser = await refreshUserAfterUpdate(
        response,
        editingUser,
        updateData,
        userService
      );
      
      // Show success message
      antdMessage.success({
        content: `✅ อัพเดทผู้ใช้สำเร็จ!\nUsername: ${editingUser.sAMAccountName}`,
        duration: 3
      });
      
      // Refresh users list
      if (fetchUsers) {
        await fetchUsers(true, true);
      }
      
      // Close modal
      onCancel();
      
    } catch (error) {
      // Handle validation errors
      if (error?.errorFields) {
        antdMessage.error('Please fix form errors before submitting');
        return;
      }
      
      // Handle API errors
      const { title, message: errorMessage } = parseUpdateUserError(error, editingUser);
      antdMessage.error({
        content: `${title}\n${errorMessage}`,
        duration: 5
      });
    }
  }, [editingUser, editForm, fetchUsers, onCancel, antdMessage]);

  const tabItems = useMemo(() => [
    {
      key: '1',
      label: (
        <Space>
          <IdcardOutlined />
          <span>Basic Info</span>
        </Space>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cn"
                label={<Text strong style={{ fontSize: 13 }}>Common Name (CN)</Text>}
              >
                <Input placeholder="Enter common name" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sAMAccountName"
                label={<Text strong style={{ fontSize: 13 }}>Username (sAMAccountName)</Text>}
              >
                <Input placeholder="Enter username" size="large" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="mail"
            label={<Text strong style={{ fontSize: 13 }}>Email</Text>}
          >
            <Input placeholder="user@example.com" size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="givenName"
                label={<Text strong style={{ fontSize: 13 }}>First Name</Text>}
              >
                <Input placeholder="Enter first name" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sn"
                label={<Text strong style={{ fontSize: 13 }}>Last Name</Text>}
              >
                <Input placeholder="Enter last name" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="displayName"
            label={<Text strong style={{ fontSize: 13 }}>Display Name</Text>}
          >
            <Input placeholder="Enter display name" size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label={<Text strong style={{ fontSize: 13 }}>Job Title</Text>}
              >
                <Input placeholder="Enter job title" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="department"
                label={<Text strong style={{ fontSize: 13 }}>Department</Text>}
              >
                <Input 
                  placeholder="Enter department name" 
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="company"
                label={<Text strong style={{ fontSize: 13 }}>Company</Text>}
              >
                <Input placeholder="Enter company name" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="employeeID"
                label={<Text strong style={{ fontSize: 13 }}>Employee ID</Text>}
              >
                <Input placeholder="Enter employee ID" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label={<Text strong style={{ fontSize: 13 }}>Description</Text>}
          >
            <Input.TextArea
              placeholder="Enter description (optional)"
              rows={3}
            />
          </Form.Item>
        </div>
      )
    },
    {
      key: '2',
      label: (
        <Space>
          <PhoneOutlined />
          <span>Contact & Location</span>
        </Space>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="telephoneNumber"
                label={<Text strong style={{ fontSize: 13 }}>Phone</Text>}
              >
                <Input placeholder="Enter phone number" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="mobile"
                label={<Text strong style={{ fontSize: 13 }}>Mobile</Text>}
              >
                <Input placeholder="Enter mobile number" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="physicalDeliveryOfficeName"
            label={<Text strong style={{ fontSize: 13 }}>Office Location</Text>}
          >
            <Input placeholder="Enter office location" size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="streetAddress"
                label={<Text strong style={{ fontSize: 13 }}>Street Address</Text>}
              >
                <Input placeholder="Enter street address" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="l"
                label={<Text strong style={{ fontSize: 13 }}>City</Text>}
              >
                <Input placeholder="Enter city" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="st"
                label={<Text strong style={{ fontSize: 13 }}>State/Province</Text>}
              >
                <Input placeholder="Enter state/province" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="postalCode"
                label={<Text strong style={{ fontSize: 13 }}>Postal Code</Text>}
              >
                <Input placeholder="Enter postal code" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="co"
            label={<Text strong style={{ fontSize: 13 }}>Country</Text>}
          >
            <Input placeholder="Enter country code (2 letters)" size="large" maxLength={2} />
          </Form.Item>
        </div>
      )
    },
    {
      key: '3',
      label: (
        <Space>
          <SettingOutlined />
          <span>Account Settings</span>
        </Space>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          {/* Account Options Section */}
          <Card
            title={
              <Space>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 8,
                  padding: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <SettingOutlined style={{ fontSize: 16, color: '#fff' }} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 16, color: '#1f2937', fontWeight: 600 }}>Account Options</Text>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, marginTop: 4, letterSpacing: '0.3px' }}>
                    Select one password policy option
                  </div>
                </div>
              </Space>
            }
            size="small"
            style={{
              marginTop: 8,
              background: 'linear-gradient(to bottom, #ffffff, #f8fafc)',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}
            styles={{ body: { padding: '20px' } }}
          >
            <Form.Item
              name="accountOption"
              rules={[{ required: false }]}
              style={{ marginBottom: 0 }}
            >
              <Radio.Group>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Radio value="passwordMustChange" style={{ 
                    padding: '14px 18px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    transition: 'all 0.2s',
                    width: '100%',
                    margin: 0
                  }}>
                    <Space size="small">
                      <LockOutlined style={{ color: '#3b82f6', fontSize: 16 }} />
                      <Text style={{ fontSize: 14, color: '#1f2937', fontWeight: 500, letterSpacing: '0.2px' }}>User must change password at next logon</Text>
                      <Tooltip title="Forces the user to change their password the next time they log in">
                        <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 13 }} />
                      </Tooltip>
                    </Space>
                  </Radio>
                  <Radio value="userCannotChangePassword" style={{ 
                    padding: '14px 18px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    transition: 'all 0.2s',
                    width: '100%',
                    margin: 0
                  }}>
                    <Space size="small">
                      <UnlockOutlined style={{ color: '#ef4444', fontSize: 16 }} />
                      <Text style={{ fontSize: 14, color: '#1f2937', fontWeight: 500, letterSpacing: '0.2px' }}>User cannot change password</Text>
                      <Tooltip title="Prevents the user from changing their own password">
                        <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 13 }} />
                      </Tooltip>
                    </Space>
                  </Radio>
                  <Radio value="passwordNeverExpires" style={{ 
                    padding: '14px 18px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    transition: 'all 0.2s',
                    width: '100%',
                    margin: 0
                  }}>
                    <Space size="small">
                      <ClockCircleOutlined style={{ color: '#10b981', fontSize: 16 }} />
                      <Text style={{ fontSize: 14, color: '#1f2937', fontWeight: 500, letterSpacing: '0.2px' }}>Password never expires</Text>
                      <Tooltip title="The password will not expire according to the password policy">
                        <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 13 }} />
                      </Tooltip>
                    </Space>
                  </Radio>
                  <Radio value="storePasswordReversible" style={{ 
                    padding: '14px 18px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    transition: 'all 0.2s',
                    width: '100%',
                    margin: 0
                  }}>
                    <Space size="small">
                      <SafetyCertificateOutlined style={{ color: '#f59e0b', fontSize: 16 }} />
                      <Text style={{ fontSize: 14, color: '#1f2937', fontWeight: 500, letterSpacing: '0.2px' }}>Store password using reversible encryption</Text>
                      <Tooltip title="Stores the password using reversible encryption (less secure, required for some applications)">
                        <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 13 }} />
                      </Tooltip>
                    </Space>
                  </Radio>
                  <Radio value="none" style={{ 
                    padding: '14px 18px',
                    borderRadius: 8,
                    border: '1px dashed #d1d5db',
                    background: '#f9fafb',
                    transition: 'all 0.2s',
                    width: '100%',
                    margin: 0
                  }}>
                    <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: 400, fontStyle: 'italic' }}>None (default settings)</Text>
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          </Card>
        </div>
      )
    }
  ], []);

  return (
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
                Edit User Information
              </div>
              <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Modify User Details
              </Text>
            </div>
          </Space>
        </div>
      }
      open={visible}
      onOk={handleEditModalOk}
      onCancel={onCancel}
      destroyOnHidden
      width={getResponsiveWidthHelper(800, 600, '95%')}
      okText="Update User"
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
          form={editForm}
          layout="vertical"
          name="editUserForm"
        >
          <Tabs
            defaultActiveKey="1"
            type="card"
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: '0 4px'
            }}
            items={tabItems}
          />
        </Form>
      </div>
    </Modal>
  );
};

export default EditUserModal;
