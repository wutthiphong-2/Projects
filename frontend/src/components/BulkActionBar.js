import React from 'react';
import { Space, Button, Typography, Modal } from 'antd';
import {
  KeyOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
  BankOutlined
} from '@ant-design/icons';

const { Text } = Typography;

/**
 * BulkActionBar Component
 * Displays bulk action buttons when rows are selected
 */
const BulkActionBar = ({
  selectedCount,
  onBulkResetPassword,
  onBulkEnable,
  onBulkDisable,
  onBulkDelete,
  onBulkMoveOU,
  loading = false
}) => {
  if (selectedCount === 0) return null;

  const handleBulkAction = (action, actionName) => {
    Modal.confirm({
      title: `ยืนยันการ${actionName}`,
      content: `คุณต้องการ${actionName} ${selectedCount} รายการหรือไม่?`,
      okText: 'ยืนยัน',
      cancelText: 'ยกเลิก',
      okButtonProps: { danger: action === 'delete' },
      onOk: () => {
        switch (action) {
          case 'resetPassword':
            onBulkResetPassword?.();
            break;
          case 'enable':
            onBulkEnable?.();
            break;
          case 'disable':
            onBulkDisable?.();
            break;
          case 'delete':
            onBulkDelete?.();
            break;
          case 'moveOU':
            onBulkMoveOU?.();
            break;
          default:
            break;
        }
      }
    });
  };

  return (
    <div className="umx-bulk-action-bar">
      <Space size="middle" align="center">
        <Text strong style={{ fontSize: 14 }}>
          เลือกแล้ว {selectedCount} รายการ
        </Text>
        <Button
          icon={<KeyOutlined />}
          onClick={() => handleBulkAction('resetPassword', 'รีเซ็ตรหัสผ่าน')}
          loading={loading}
          size="middle"
        >
          Reset Password
        </Button>
        <Button
          icon={<UnlockOutlined />}
          onClick={() => handleBulkAction('enable', 'เปิดใช้งาน')}
          loading={loading}
          size="middle"
        >
          Enable
        </Button>
        <Button
          icon={<LockOutlined />}
          onClick={() => handleBulkAction('disable', 'ปิดใช้งาน')}
          loading={loading}
          size="middle"
        >
          Disable
        </Button>
        <Button
          icon={<BankOutlined />}
          onClick={() => handleBulkAction('moveOU', 'ย้าย OU')}
          loading={loading}
          size="middle"
          disabled={!onBulkMoveOU}
        >
          Move OU
        </Button>
        <Button
          icon={<DeleteOutlined />}
          onClick={() => handleBulkAction('delete', 'ลบ')}
          loading={loading}
          danger
          size="middle"
        >
          Delete
        </Button>
      </Space>
    </div>
  );
};

export default BulkActionBar;

