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
      // Debug: Log editingUser data
      if (process.env.NODE_ENV === 'development') {
        console.debug('[EditUserModal] useEffect triggered', {
          visible,
          hasEditingUser: !!editingUser,
          editingUserKeys: editingUser ? Object.keys(editingUser) : [],
          editingUserSample: editingUser ? {
            cn: editingUser.cn,
            sAMAccountName: editingUser.sAMAccountName,
            mail: editingUser.mail,
            employeeID: editingUser.employeeID,
            extensionName: editingUser.extensionName,
            department: editingUser.department,
            company: editingUser.company
          } : null
        });
      }
      
      // Determine which account option is selected
      const selectedAccountOption = getSelectedAccountOption(editingUser);
      
      // Reset form first to clear any previous values
      editForm.resetFields();
      
      // Set form values with fresh user data
      // Use setTimeout to ensure Form component is mounted
      setTimeout(() => {
        const formValues = {
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
          extensionName: editingUser.extensionName || editingUser.extension_name || editingUser.departmentNumber || editingUser.department_number || undefined,
          physicalDeliveryOfficeName: editingUser.physicalDeliveryOfficeName || undefined,
          description: editingUser.description || undefined,
          // Account option (single selection)
          accountOption: selectedAccountOption,
        };
        
        editForm.setFieldsValue(formValues);
        
        // Debug: Log form values after setting
        if (process.env.NODE_ENV === 'development') {
          console.debug('[EditUserModal] Form values set', {
            formValues,
            actualFormValues: editForm.getFieldsValue(),
            employeeID: editingUser.employeeID,
            extensionName: editingUser.extensionName,
            employeeIDType: typeof editingUser.employeeID,
            extensionNameType: typeof editingUser.extensionName,
            hasEmployeeID: !!editingUser.employeeID,
            hasExtensionName: !!editingUser.extensionName
          });
        }
      }, 100); // Increased timeout to ensure form is ready
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
          <Row gutter={[20, 16]}>
            <Col span={8}>
              <Form.Item
                name="cn"
                label={<Text strong style={{ fontSize: 13 }}>Common Name (CN)</Text>}
              >
                <Input placeholder="Enter common name" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="sAMAccountName"
                label={<Text strong style={{ fontSize: 13 }}>Username (sAMAccountName)</Text>}
              >
                <Input placeholder="Enter username" size="large" disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="mail"
                label={<Text strong style={{ fontSize: 13 }}>Email</Text>}
              >
                <Input placeholder="user@example.com" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[20, 16]}>
            <Col span={8}>
              <Form.Item
                name="givenName"
                label={<Text strong style={{ fontSize: 13 }}>First Name</Text>}
              >
                <Input placeholder="Enter first name" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="sn"
                label={<Text strong style={{ fontSize: 13 }}>Last Name</Text>}
              >
                <Input placeholder="Enter last name" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="displayName"
                label={<Text strong style={{ fontSize: 13 }}>Display Name</Text>}
              >
                <Input placeholder="Enter display name" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[20, 16]}>
            <Col span={8}>
              <Form.Item
                name="title"
                label={<Text strong style={{ fontSize: 13 }}>Job Title</Text>}
              >
                <Input placeholder="Enter job title" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
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
            <Col span={8}>
              <Form.Item
                name="company"
                label={<Text strong style={{ fontSize: 13 }}>Company</Text>}
              >
                <Input placeholder="Enter company name" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[20, 16]}>
            <Col span={8}>
              <Form.Item
                name="employeeID"
                label={<Text strong style={{ fontSize: 13 }}>Employee ID</Text>}
              >
                <Input placeholder="Enter employee ID" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="extensionName"
                label={<Text strong style={{ fontSize: 13 }}>Extension Name</Text>}
              >
                <Input placeholder="e.g., K1IT00" size="large" />
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
          <Row gutter={[20, 16]}>
            <Col span={8}>
              <Form.Item
                name="telephoneNumber"
                label={<Text strong style={{ fontSize: 13 }}>Phone</Text>}
              >
                <Input placeholder="Enter phone number" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="mobile"
                label={<Text strong style={{ fontSize: 13 }}>Mobile</Text>}
              >
                <Input placeholder="Enter mobile number" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="physicalDeliveryOfficeName"
                label={<Text strong style={{ fontSize: 13 }}>Office Location</Text>}
              >
                <Input placeholder="Enter office location" size="large" />
              </Form.Item>
            </Col>
          </Row>
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
                  background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                  borderRadius: 8,
                  padding: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <SettingOutlined style={{ fontSize: 14, color: '#fff' }} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 14, color: '#1f2937', fontWeight: 600 }}>Account Options</Text>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 400, marginTop: 2 }}>
                    Select one password policy option
                  </div>
                </div>
              </Space>
            }
            size="small"
            style={{
              marginTop: 0,
              background: 'linear-gradient(to bottom, #ffffff, #f8fafc)',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}
            styles={{ body: { padding: '16px' } }}
            headStyle={{ padding: '12px 16px' }}
          >
            <Form.Item
              name="accountOption"
              rules={[{ required: false }]}
              style={{ marginBottom: 0 }}
            >
              <Radio.Group>
                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  <Radio value="passwordMustChange" style={{ 
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    transition: 'all 0.2s',
                    width: '100%',
                    margin: 0
                  }}>
                    <Space size="small">
                      <LockOutlined style={{ color: '#3b82f6', fontSize: 14 }} />
                      <Text style={{ fontSize: 13, color: '#1f2937', fontWeight: 500 }}>User must change password at next logon</Text>
                      <Tooltip title="Forces the user to change their password the next time they log in">
                        <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                      </Tooltip>
                    </Space>
                  </Radio>
                  <Radio value="userCannotChangePassword" style={{ 
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    transition: 'all 0.2s',
                    width: '100%',
                    margin: 0
                  }}>
                    <Space size="small">
                      <UnlockOutlined style={{ color: '#ef4444', fontSize: 14 }} />
                      <Text style={{ fontSize: 13, color: '#1f2937', fontWeight: 500 }}>User cannot change password</Text>
                      <Tooltip title="Prevents the user from changing their own password">
                        <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                      </Tooltip>
                    </Space>
                  </Radio>
                  <Radio value="passwordNeverExpires" style={{ 
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    transition: 'all 0.2s',
                    width: '100%',
                    margin: 0
                  }}>
                    <Space size="small">
                      <ClockCircleOutlined style={{ color: '#10b981', fontSize: 14 }} />
                      <Text style={{ fontSize: 13, color: '#1f2937', fontWeight: 500 }}>Password never expires</Text>
                      <Tooltip title="The password will not expire according to the password policy">
                        <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                      </Tooltip>
                    </Space>
                  </Radio>
                  <Radio value="storePasswordReversible" style={{ 
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    transition: 'all 0.2s',
                    width: '100%',
                    margin: 0
                  }}>
                    <Space size="small">
                      <SafetyCertificateOutlined style={{ color: '#f59e0b', fontSize: 14 }} />
                      <Text style={{ fontSize: 13, color: '#1f2937', fontWeight: 500 }}>Store password using reversible encryption</Text>
                      <Tooltip title="Stores the password using reversible encryption (less secure, required for some applications)">
                        <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                      </Tooltip>
                    </Space>
                  </Radio>
                  <Radio value="none" style={{ 
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px dashed #d1d5db',
                    background: '#f9fafb',
                    transition: 'all 0.2s',
                    width: '100%',
                    margin: 0
                  }}>
                    <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: 400, fontStyle: 'italic' }}>None (default settings)</Text>
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
        <div style={{ paddingBottom: 8 }}>
          <Space size={12} align="center">
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              borderRadius: 8,
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <EditOutlined style={{ fontSize: 20, color: '#ffffff' }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                แก้ไขข้อมูลผู้ใช้
              </div>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                {editingUser?.sAMAccountName || editingUser?.cn || 'User'}
              </Text>
            </div>
          </Space>
        </div>
      }
      open={visible}
      onOk={handleEditModalOk}
      onCancel={onCancel}
      destroyOnHidden
      width={getResponsiveWidthHelper(1100, 900, '95%')}
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 180px)',
          overflowY: 'auto',
          padding: '24px 28px'
        }
      }}
      okText="บันทึกการเปลี่ยนแปลง"
      cancelText="ยกเลิก"
      okButtonProps={{
        size: 'large',
        style: {
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          border: 'none',
          fontWeight: 600,
          borderRadius: 8,
          minWidth: 160
        }
      }}
      cancelButtonProps={{
        size: 'large',
        style: {
          fontWeight: 600,
          borderRadius: 8
        }
      }}
    >
      <div style={{ padding: '0' }}>
        <Form
          form={editForm}
          layout="vertical"
          name="editUserForm"
        >
          <Tabs
            defaultActiveKey="1"
            type="line"
            size="large"
            style={{
              background: '#ffffff'
            }}
            items={tabItems}
          />
        </Form>
      </div>
    </Modal>
  );
};

export default EditUserModal;
