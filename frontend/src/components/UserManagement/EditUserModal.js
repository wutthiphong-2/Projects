import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  Modal,
  Form,
  Button,
  Space,
  Input,
  Radio,
  Tooltip,
  Typography,
  App,
  Divider,
  Tabs
} from 'antd';
import {
  EditOutlined,
  UserOutlined,
  MailOutlined,
  QuestionCircleOutlined,
  LockOutlined,
  UnlockOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  PhoneOutlined,
  IdcardOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { userService } from '../../services/userService';
import { getSelectedAccountOption, prepareUpdateData, convertAccountOptionToFields } from '../../utils/userFormHelpers';
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
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Helper for responsive width
  const getModalWidth = useCallback(() => {
    if (getResponsiveWidth) {
      return getResponsiveWidth(850, 700, '95%');
    }
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1200) return 850;
      if (window.innerWidth >= 768) return 700;
      return '95%';
    }
    if (screens?.xl || screens?.lg) return 850;
    if (screens?.md || screens?.sm) return 700;
    return '95%';
  }, [getResponsiveWidth, screens]);

  // Initialize form when modal opens
  useEffect(() => {
    if (visible && editingUser && editForm) {
      const selectedAccountOption = getSelectedAccountOption(editingUser);
      
      editForm.setFieldsValue({
        cn: editingUser.cn || '',
        sAMAccountName: editingUser.sAMAccountName || '',
        mail: editingUser.mail || '',
        displayName: editingUser.displayName || '',
        givenName: editingUser.givenName || '',
        sn: editingUser.sn || '',
        title: editingUser.title || '',
        department: editingUser.department || '',
        company: editingUser.company || '',
        employeeID: editingUser.employeeID || '',
        extensionName: editingUser.extensionName || '',
        telephoneNumber: editingUser.telephoneNumber || '',
        mobile: editingUser.mobile || '',
        physicalDeliveryOfficeName: editingUser.physicalDeliveryOfficeName || '',
        description: editingUser.description || '',
        accountOption: selectedAccountOption
      });
      
      setActiveTab('basic');
    }
  }, [visible, editingUser, editForm]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!editingUser || !editForm) return;

    try {
      setLoading(true);
      const formValues = await editForm.validateFields();
      
      // Convert accountOption to individual fields if needed
      const { accountOption, ...otherValues } = formValues;
      let updateData = prepareUpdateData(otherValues);
      
      // Convert accountOption to individual boolean fields
      if (accountOption && accountOption !== 'none') {
        const accountFields = convertAccountOptionToFields(accountOption);
        updateData = { ...updateData, ...accountFields };
      }
      
      await userService.updateUser(editingUser.dn, updateData);
      
      // Refresh user list
      if (fetchUsers) {
        await fetchUsers();
      }
      
      antdMessage.success({
        content: `อัปเดตข้อมูลผู้ใช้ ${editingUser.sAMAccountName || editingUser.cn} สำเร็จ`,
        duration: 3
      });
      
      onCancel();
    } catch (error) {
      if (error.errorFields) {
        // Form validation error
        return;
      }
      
      const { title, message: errorMessage } = parseUpdateUserError(error, editingUser);
      antdMessage.error({
        content: `${title}\n${errorMessage}`,
        duration: 5
      });
    } finally {
      setLoading(false);
    }
  }, [editingUser, editForm, fetchUsers, onCancel, antdMessage]);

  // Account option options
  const accountOptionOptions = useMemo(() => [
    {
      value: 'passwordMustChange',
      label: 'ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก',
      icon: LockOutlined,
      color: '#f59e0b'
    },
    {
      value: 'userCannotChangePassword',
      label: 'ผู้ใช้ไม่สามารถเปลี่ยนรหัสผ่านได้',
      icon: UnlockOutlined,
      color: '#6b7280'
    },
    {
      value: 'passwordNeverExpires',
      label: 'รหัสผ่านไม่หมดอายุ',
      icon: ClockCircleOutlined,
      color: '#10b981'
    },
    {
      value: 'storePasswordReversible',
      label: 'เก็บรหัสผ่านแบบเข้ารหัสแบบย้อนกลับได้',
      icon: SafetyCertificateOutlined,
      color: '#8b5cf6'
    },
    {
      value: 'none',
      label: 'ไม่ระบุ (ใช้การตั้งค่าเริ่มต้น)',
      icon: null,
      color: '#9ca3af'
    }
  ], []);

  // Tabs items
  const tabsItems = useMemo(() => [
    {
      key: 'basic',
      label: (
        <Space>
          <UserOutlined />
          <span>ข้อมูลพื้นฐาน</span>
        </Space>
      ),
      children: (
        <div style={{ paddingTop: 16 }}>
          <Form.Item
            name="cn"
            label={
              <Space>
                <span>Common Name (CN)</span>
                <Tooltip title="ชื่อเต็มที่แสดงใน Active Directory">
                  <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                </Tooltip>
              </Space>
            }
            rules={[{ required: true, message: 'กรุณากรอก Common Name' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
              placeholder="เช่น Wutthiphong Chaiyaphoom"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="sAMAccountName"
            label={
              <Space>
                <span>Username (Login)</span>
                <Tooltip title="ชื่อผู้ใช้สำหรับเข้าสู่ระบบ ไม่สามารถแก้ไขได้">
                  <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                </Tooltip>
              </Space>
            }
          >
            <Input
              disabled
              size="large"
              style={{ backgroundColor: '#f7fafc', cursor: 'not-allowed' }}
            />
          </Form.Item>

          <Form.Item
            name="mail"
            label={
              <Space>
                <span>Email</span>
                <Tooltip title="อีเมลขององค์กร">
                  <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                </Tooltip>
              </Space>
            }
          >
            <Input
              prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
              placeholder="user@tbkk.co.th"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="Display Name"
          >
            <Input
              placeholder="จะถูกกรอกอัตโนมัติจาก CN"
              size="large"
            />
          </Form.Item>

          <Divider orientation="left" style={{ margin: '24px 0' }}>
            <Space>
              <LockOutlined style={{ color: '#667eea' }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>การตั้งค่ารหัสผ่าน</span>
            </Space>
          </Divider>

          <Form.Item
            name="accountOption"
            style={{ marginBottom: 0 }}
          >
            <Radio.Group>
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                {accountOptionOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <Radio
                      key={option.value}
                      value={option.value}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        transition: 'all 0.2s',
                        margin: 0
                      }}
                    >
                      <Space>
                        {IconComponent && (
                          <span style={{ color: option.color, fontSize: 16 }}>
                            <IconComponent />
                          </span>
                        )}
                        <span style={{ fontSize: 14 }}>{option.label}</span>
                      </Space>
                    </Radio>
                  );
                })}
              </Space>
            </Radio.Group>
          </Form.Item>
        </div>
      )
    },
    {
      key: 'personal',
      label: (
        <Space>
          <IdcardOutlined />
          <span>ข้อมูลส่วนตัว</span>
        </Space>
      ),
      children: (
        <div style={{ paddingTop: 16 }}>
          <Form.Item
            name="givenName"
            label="ชื่อ (First Name)"
          >
            <Input placeholder="กรอกชื่อ" size="large" />
          </Form.Item>

          <Form.Item
            name="sn"
            label="นามสกุล (Last Name)"
          >
            <Input placeholder="กรอกนามสกุล" size="large" />
          </Form.Item>

          <Form.Item
            name="title"
            label="ตำแหน่งงาน (Job Title)"
          >
            <Input placeholder="กรอกตำแหน่งงาน" size="large" />
          </Form.Item>

          <Form.Item
            name="department"
            label="แผนก (Department)"
          >
            <Input placeholder="กรอกชื่อแผนก" size="large" />
          </Form.Item>

          <Form.Item
            name="company"
            label="บริษัท (Company)"
          >
            <Input placeholder="กรอกชื่อบริษัท" size="large" />
          </Form.Item>

          <Form.Item
            name="employeeID"
            label="รหัสพนักงาน (Employee ID)"
          >
            <Input placeholder="กรอกรหัสพนักงาน" size="large" />
          </Form.Item>

          <Form.Item
            name="extensionName"
            label="Extension Name"
          >
            <Input placeholder="เช่น K1IT00" size="large" />
          </Form.Item>
        </div>
      )
    },
    {
      key: 'contact',
      label: (
        <Space>
          <PhoneOutlined />
          <span>ข้อมูลติดต่อ</span>
        </Space>
      ),
      children: (
        <div style={{ paddingTop: 16 }}>
          <Form.Item
            name="telephoneNumber"
            label="เบอร์โทรศัพท์ (Phone)"
          >
            <Input
              prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />}
              placeholder="กรอกเบอร์โทรศัพท์"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="mobile"
            label="เบอร์มือถือ (Mobile)"
          >
            <Input
              prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />}
              placeholder="กรอกเบอร์มือถือ"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="physicalDeliveryOfficeName"
            label="ที่ตั้งสำนักงาน (Office Location)"
          >
            <Input placeholder="กรอกที่ตั้งสำนักงาน" size="large" />
          </Form.Item>

          <Form.Item
            name="description"
            label="คำอธิบาย (Description)"
          >
            <Input.TextArea
              rows={4}
              placeholder="กรอกคำอธิบายหรือหมายเหตุ"
              size="large"
            />
          </Form.Item>
        </div>
      )
    }
  ], [accountOptionOptions]);

  return (
    <Modal
      title={
        <Space size={16} align="center">
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <EditOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1a202c' }}>
              แก้ไขข้อมูลผู้ใช้
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {editingUser?.sAMAccountName || editingUser?.cn || 'User'}
            </Text>
          </div>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      destroyOnHidden
      width={getModalWidth()}
      style={{ top: 40 }}
      styles={{
        body: {
          padding: 0,
          maxHeight: 'calc(100vh - 180px)',
          overflowY: 'auto'
        }
      }}
      footer={null}
    >
      <Form
        form={editForm}
        layout="vertical"
        style={{ padding: '24px' }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabsItems}
          style={{ marginBottom: 0 }}
        />

        <Divider style={{ margin: '24px 0' }} />

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          paddingTop: 8
        }}>
          <Button
            size="large"
            onClick={onCancel}
            style={{ minWidth: 100 }}
          >
            ยกเลิก
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            onClick={handleSubmit}
            loading={loading}
            style={{
              minWidth: 160,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              fontWeight: 500
            }}
          >
            บันทึกการเปลี่ยนแปลง
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default EditUserModal;
