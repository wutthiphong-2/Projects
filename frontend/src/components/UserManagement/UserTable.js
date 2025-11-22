import React, { useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Typography,
  Tag,
  Avatar,
  Tooltip,
  Pagination,
  Dropdown,
  Empty
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FilterOutlined,
  MailOutlined,
  TeamOutlined,
  HistoryOutlined,
  KeyOutlined,
  LockOutlined,
  UnlockOutlined,
  ClockCircleOutlined,
  IdcardOutlined,
  GlobalOutlined,
  UserSwitchOutlined,
  MoreOutlined,
  ClearOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const UserTable = ({
  // Data props
  users = [],
  paginatedUsers = [],
  filteredUsers = [],
  selectedRowKeys = [],
  setSelectedRowKeys,
  
  // UI state props
  loading = false,
  screens = {},
  visibleColumns = {},
  sortedInfo = { order: null, columnKey: null },
  setSortedInfo,
  tableScrollY = 'calc(100vh - 400px)',
  openDropdownKey = null,
  setOpenDropdownKey,
  
  // Display props
  activeFilterTags = [],
  directoryCounts = { total: 0 },
  isFilteredView = false,
  currentPage = 1,
  setCurrentPage,
  pageSize = 50,
  setPageSize,
  formatCount = (count) => count?.toLocaleString() || '0',
  
  // Action handlers
  handleViewDetails,
  handleEditUser,
  handleToggleStatus,
  handleDeleteUser,
  handleResetPassword,
  handleClearAllFilters
}) => {
  // ==================== RENDER FUNCTIONS ====================
  
  const renderCopyableValue = useCallback((value, tooltips = ['คัดลอก', 'คัดลอกแล้ว']) => {
    if (!value) {
      return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
    }

    return (
      <Tooltip title={value} placement="topLeft">
        <Text
          ellipsis={{ tooltip: value }}
          copyable={{ text: value, tooltips }}
          className="copyable-text table-cell-text"
          style={{ 
            fontSize: 13,
            wordBreak: 'break-word',
            lineHeight: '1.5',
            display: 'block'
          }}
        >
          {value}
        </Text>
      </Tooltip>
    );
  }, []);

  const renderUsernameCell = useCallback((value) => (
    value ? (
      <div className="username-pill" style={{ 
        maxWidth: '100%',
        wordBreak: 'break-word',
        whiteSpace: 'normal',
        lineHeight: '1.4'
      }}>
        {renderCopyableValue(value, ['คัดลอกชื่อผู้ใช้', 'คัดลอกแล้ว'])}
      </div>
    ) : (
      <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
    )
  ), [renderCopyableValue]);

  const renderTextCell = useCallback((value) => (
    value ? (
      <Tooltip title={value} placement="topLeft">
        <Text 
          className="table-cell-text" 
          ellipsis={{ tooltip: value }}
          style={{ 
            fontSize: 13, 
            color: '#1f2937',
            wordBreak: 'break-word',
            lineHeight: '1.5',
            display: 'block'
          }}
        >
          {value}
        </Text>
      </Tooltip>
    ) : (
      <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
    )
  ), []);

  const renderDepartmentTag = useCallback((value) => (
    value ? (
      <Tooltip title={value} placement="topLeft">
        <Tag className="department-tag status-pill info">{value}</Tag>
      </Tooltip>
    ) : (
      <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
    )
  ), []);

  const renderDescriptionCell = useCallback((value) => (
    value ? (
      <Tooltip title={value} placement="topLeft">
        <Text className="table-cell-text" ellipsis style={{ fontSize: 13, color: '#4b5563' }}>
          {value}
        </Text>
      </Tooltip>
    ) : (
      <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
    )
  ), []);

  const renderDisplayName = useCallback((_, record) => (
    <div className="display-name-cell" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Avatar
        size={36}
        icon={!record.cn && <UserOutlined />}
        style={{
          background: record.isEnabled ? '#2563eb' : '#d1d5db',
          color: '#ffffff',
          fontWeight: 600,
          flexShrink: 0
        }}
      >
        {(record.cn || record.displayName || 'U').charAt(0).toUpperCase()}
      </Avatar>
      <div className="display-name-content" style={{ flex: 1, minWidth: 0 }}>
        <Tooltip title={record.cn || record.displayName || '-'} placement="topLeft">
          <div className="display-name-text table-cell-text" style={{ 
            wordBreak: 'break-word',
            lineHeight: '1.4'
          }}>
            {record.cn || record.displayName || '-'}
          </div>
        </Tooltip>
      </div>
    </div>
  ), []);

  const renderEmailCell = useCallback((value) => renderCopyableValue(value, ['คัดลอกอีเมล', 'คัดลอกแล้ว']), [renderCopyableValue]);
  const renderEmployeeIdCell = useCallback((value) => renderCopyableValue(value, ['คัดลอก Employee ID', 'คัดลอกแล้ว']), [renderCopyableValue]);
  
  const renderStatusCell = useCallback((isEnabled) => (
    <Tag
      className={`status-pill ${isEnabled ? 'success' : 'inactive'}`}
      icon={isEnabled ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
    >
      {isEnabled ? 'Active' : 'Disabled'}
    </Tag>
  ), []);

  const renderUserPrincipalNameCell = useCallback((value) => (
    value ? (
      <Tooltip title={value} placement="topLeft">
        <Text
          ellipsis
          copyable={{ text: value, tooltips: ['คัดลอก UPN', 'คัดลอกแล้ว'] }}
          className="copyable-text table-cell-text"
          style={{ fontSize: 13, maxWidth: 200 }}
        >
          {value}
        </Text>
      </Tooltip>
    ) : (
      <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
    )
  ), []);

  const renderManagerCell = useCallback((value) => {
    if (!value) {
      return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
    }
    
    // Try to find manager in users list
    const manager = users.find(u => u.dn === value);
    const managerName = manager ? (manager.cn || manager.displayName || manager.sAMAccountName) : value.split(',')[0].replace('CN=', '');
    
    return (
      <Tooltip title={value} placement="topLeft">
        <Text
          ellipsis
          className="table-cell-text"
          style={{ fontSize: 13, maxWidth: 200 }}
        >
          {managerName}
        </Text>
      </Tooltip>
    );
  }, [users]);

  const renderLastLogonCell = useCallback((value) => {
    if (!value || value === '0' || value === '') {
      return (
        <Tooltip title="ไม่เคยเข้าสู่ระบบ">
          <Tag color="default" style={{ fontSize: 12 }}>
            <HistoryOutlined style={{ marginRight: 4 }} />
            ไม่เคยเข้าสู่ระบบ
          </Tag>
        </Tooltip>
      );
    }
    
    try {
      // Handle ISO string format
      const logonDate = dayjs(value);
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
      
      // Color based on recency
      let tagColor = 'default';
      if (daysAgo > 90) tagColor = 'error';
      else if (daysAgo > 30) tagColor = 'warning';
      else if (daysAgo > 7) tagColor = 'processing';
      else tagColor = 'success';
      
      return (
        <Tooltip title={`เข้าสู่ระบบล่าสุด: ${logonDate.format('DD/MM/YYYY HH:mm')} (${timeAgoText})`}>
          <div>
            <Text style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
              {logonDate.format('DD/MM/YYYY')}
            </Text>
            <Tag color={tagColor} style={{ fontSize: 11 }}>
              {timeAgoText}
            </Tag>
          </div>
        </Tooltip>
      );
    } catch (error) {
      console.error('[UserTable] Error parsing lastLogon', {
        error: error.message,
        errorName: error.name,
        value,
        valueType: typeof value
      });
      return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
    }
  }, []);

  const renderPasswordLastSetCell = useCallback((value) => {
    if (!value || value === '0' || value === '') {
      return (
        <Tooltip title="ยังไม่เคยตั้งรหัสผ่าน">
          <Tag color="default" style={{ fontSize: 12 }}>
            <KeyOutlined style={{ marginRight: 4 }} />
            ยังไม่เคยตั้ง
          </Tag>
        </Tooltip>
      );
    }
    
    try {
      // Handle ISO string format
      const pwdDate = dayjs(value);
      if (!pwdDate.isValid()) {
        return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
      }
      
      const now = dayjs();
      const daysAgo = now.diff(pwdDate, 'day');
      
      // Color based on password age
      let tagColor = 'default';
      if (daysAgo > 180) tagColor = 'error'; // > 6 months
      else if (daysAgo > 90) tagColor = 'warning'; // > 3 months
      else if (daysAgo > 30) tagColor = 'processing'; // > 1 month
      else tagColor = 'success'; // < 1 month
      
      return (
        <Tooltip title={`ตั้งรหัสผ่านเมื่อ: ${pwdDate.format('DD/MM/YYYY HH:mm')} (${daysAgo} วันที่แล้ว)`}>
          <div>
            <Text style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
              {pwdDate.format('DD/MM/YYYY')}
            </Text>
            <Tag color={tagColor} style={{ fontSize: 11 }}>
              {daysAgo} วันที่แล้ว
            </Tag>
          </div>
        </Tooltip>
      );
    } catch (error) {
      console.error('[UserTable] Error parsing pwdLastSet', {
        error: error.message,
        errorName: error.name,
        value,
        valueType: typeof value
      });
      return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
    }
  }, []);

  const renderAccountExpiresCell = useCallback((value, record) => {
    // Debug: Log the value to see what we're getting (only in development)
    if (process.env.NODE_ENV === 'development' && value) {
      console.debug('[UserTable] AccountExpires Debug', {
        value,
        type: typeof value,
        userDn: record?.dn,
        username: record?.sAMAccountName
      });
    }
    
    // Check for null, undefined, empty string, '0', or falsy values
    if (!value || value === '0' || value === '' || value === null || value === undefined) {
      return (
        <Tooltip title="บัญชีไม่มีวันหมดอายุ">
          <Tag color="default" style={{ fontSize: 12 }}>
            <CheckCircleOutlined style={{ marginRight: 4 }} />
            ไม่หมดอายุ
          </Tag>
        </Tooltip>
      );
    }
    
    try {
      // Handle ISO string format
      const expiryDate = dayjs(value);
      if (!expiryDate.isValid()) {
        console.warn('[UserTable] Invalid accountExpires date', {
          value,
          userDn: record?.dn,
          username: record?.sAMAccountName
        });
        return (
          <Tooltip title={`Invalid date format: ${value}`}>
            <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
          </Tooltip>
        );
      }
      
      const now = dayjs();
      const daysRemaining = expiryDate.diff(now, 'day');
      
      // Check if expired
      if (daysRemaining < 0) {
        const daysExpired = Math.abs(daysRemaining);
        return (
          <Tooltip title={`หมดอายุเมื่อ: ${expiryDate.format('DD/MM/YYYY HH:mm')} (${daysExpired} วันที่แล้ว)`}>
            <div>
              <Text style={{ fontSize: 13, display: 'block', marginBottom: 4, color: '#ef4444' }}>
                {expiryDate.format('DD/MM/YYYY')}
              </Text>
              <Tag color="error" style={{ fontSize: 11 }}>
                <CloseCircleOutlined style={{ marginRight: 4 }} />
                หมดอายุแล้ว ({daysExpired} วัน)
              </Tag>
            </div>
          </Tooltip>
        );
      }
      
      // Check if expiring soon
      if (daysRemaining <= 7) {
        return (
          <Tooltip title={`จะหมดอายุ: ${expiryDate.format('DD/MM/YYYY HH:mm')} (เหลือ ${daysRemaining} วัน)`}>
            <div>
              <Text style={{ fontSize: 13, display: 'block', marginBottom: 4, color: '#f59e0b' }}>
                {expiryDate.format('DD/MM/YYYY')}
              </Text>
              <Tag color="error" style={{ fontSize: 11 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                ใกล้หมดอายุ ({daysRemaining} วัน)
              </Tag>
            </div>
          </Tooltip>
        );
      } else if (daysRemaining <= 30) {
        return (
          <Tooltip title={`จะหมดอายุ: ${expiryDate.format('DD/MM/YYYY HH:mm')} (เหลือ ${daysRemaining} วัน)`}>
            <div>
              <Text style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                {expiryDate.format('DD/MM/YYYY')}
              </Text>
              <Tag color="warning" style={{ fontSize: 11 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                เหลือ {daysRemaining} วัน
              </Tag>
            </div>
          </Tooltip>
        );
      } else {
        // Valid, not expiring soon
        return (
          <Tooltip title={`จะหมดอายุ: ${expiryDate.format('DD/MM/YYYY HH:mm')} (เหลือ ${daysRemaining} วัน)`}>
            <div>
              <Text style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                {expiryDate.format('DD/MM/YYYY')}
              </Text>
              <Tag color="success" style={{ fontSize: 11 }}>
                <CheckCircleOutlined style={{ marginRight: 4 }} />
                เหลือ {daysRemaining} วัน
              </Tag>
            </div>
          </Tooltip>
        );
      }
    } catch (error) {
      console.error('[UserTable] Error parsing accountExpires', {
        error: error.message,
        errorName: error.name,
        value,
        valueType: typeof value,
        userDn: record?.dn
      });
      return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
    }
  }, []);

  const renderActionsCell = useCallback((_, record) => {
    const dropdownKey = `dropdown-${record.dn}`;
    const isOpen = openDropdownKey === dropdownKey;

    return (
      <div className="actions-cell">
        <Space>
          {/* Primary Action - View Details */}
          <Tooltip title="ดูรายละเอียด">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
              size="small"
              aria-label="ดูรายละเอียด"
            />
          </Tooltip>
          
          {/* Kebab Menu - Other Actions */}
          <Dropdown
            menu={{
              onClick: ({ key }) => {
                setOpenDropdownKey(null);
                
                if (key === 'edit') {
                  handleEditUser(record);
                  return;
                }
                if (key === 'reset-password') {
                  handleResetPassword(record);
                  return;
                }
                if (key === 'toggle') {
                  Modal.confirm({
                    title: record.isEnabled ? 'ปิดใช้งานผู้ใช้' : 'เปิดใช้งานผู้ใช้',
                    content: `คุณต้องการ${record.isEnabled ? 'ปิด' : 'เปิด'}ใช้งาน ${record.cn || record.displayName || 'ผู้ใช้นี้'} หรือไม่?`,
                    okText: 'ยืนยัน',
                    cancelText: 'ยกเลิก',
                    icon: record.isEnabled ? <LockOutlined style={{ color: '#f59e0b' }} /> : <UnlockOutlined style={{ color: '#10b981' }} />,
                    onOk: () => handleToggleStatus(record.dn)
                  });
                  return;
                }
                if (key === 'delete') {
                  Modal.confirm({
                    title: 'ลบผู้ใช้',
                    content: `คุณต้องการลบผู้ใช้ ${record.cn || record.displayName || record.sAMAccountName || ''} หรือไม่?`,
                    okText: 'ลบ',
                    cancelText: 'ยกเลิก',
                    okButtonProps: { danger: true },
                    icon: <DeleteOutlined style={{ color: '#dc2626' }} />,
                    onOk: () => handleDeleteUser(record.dn)
                  });
                }
              },
              items: [
                {
                  key: 'edit',
                  icon: <EditOutlined style={{ color: '#059669' }} />,
                  label: 'แก้ไขข้อมูล'
                },
                {
                  key: 'reset-password',
                  icon: <KeyOutlined style={{ color: '#f59e0b' }} />,
                  label: 'รีเซ็ตรหัสผ่าน'
                },
                {
                  type: 'divider'
                },
                {
                  key: 'toggle',
                  icon: record.isEnabled ? <LockOutlined style={{ color: '#f59e0b' }} /> : <UnlockOutlined style={{ color: '#10b981' }} />,
                  label: record.isEnabled ? 'ปิดใช้งาน' : 'เปิดใช้งาน'
                },
                {
                  key: 'delete',
                  danger: true,
                  icon: <DeleteOutlined style={{ color: '#dc2626' }} />,
                  label: 'ลบผู้ใช้'
                }
              ]
            }}
            trigger={['click']}
            placement="bottomRight"
            open={isOpen}
            onOpenChange={(open) => {
              if (!open) {
                setOpenDropdownKey(null);
              } else {
                setOpenDropdownKey(dropdownKey);
              }
            }}
            getPopupContainer={() => document.body}
            destroyOnHidden={true}
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              size="small"
              aria-label="เมนูเพิ่มเติม"
            />
          </Dropdown>
        </Space>
      </div>
    );
  }, [handleViewDetails, handleEditUser, handleToggleStatus, handleDeleteUser, handleResetPassword, openDropdownKey, setOpenDropdownKey]);

  // ==================== COLUMN DEFINITIONS ====================
  
  const allColumns = useMemo(() => [
    {
      title: (
        <Tooltip title="ชื่อที่แสดงในระบบ">
          <Space size={4}>
            <UserOutlined style={{ fontSize: 14, color: '#6b7280' }} />
            <span>Display Name</span>
          </Space>
        </Tooltip>
      ),
      key: 'user',
      fixed: (screens.md || screens.lg || screens.xl) ? 'left' : undefined,
      width: 190,
      className: 'col-display-name',
      sorter: (a, b) => (a.cn || a.displayName || '').localeCompare(b.cn || b.displayName || ''),
      sortOrder: sortedInfo.columnKey === 'user' ? sortedInfo.order : null,
      ellipsis: true,
      render: renderDisplayName
    },
    {
      title: (
        <Tooltip title="ชื่อผู้ใช้สำหรับเข้าสู่ระบบ">
          <Space size={4}>
            <IdcardOutlined style={{ fontSize: 14, color: '#6b7280' }} />
            <span>Username</span>
          </Space>
        </Tooltip>
      ),
      dataIndex: 'sAMAccountName',
      key: 'sAMAccountName',
      fixed: (screens.md || screens.lg || screens.xl) ? 'left' : undefined,
      width: 160,
      className: 'col-username',
      sorter: (a, b) => (a.sAMAccountName || '').localeCompare(b.sAMAccountName || ''),
      sortOrder: sortedInfo.columnKey === 'sAMAccountName' ? sortedInfo.order : null,
      ellipsis: true,
      render: renderUsernameCell
    },
    {
      title: (
        <Tooltip title="อีเมลที่ใช้ติดต่อ">
          <Space size={4}>
            <MailOutlined style={{ fontSize: 14, color: '#6b7280' }} />
            <span>Email</span>
          </Space>
        </Tooltip>
      ),
      dataIndex: 'mail',
      key: 'mail',
      width: 230,
      className: 'col-email',
      sorter: (a, b) => (a.mail || '').localeCompare(b.mail || ''),
      sortOrder: sortedInfo.columnKey === 'mail' ? sortedInfo.order : null,
      ellipsis: {
        showTitle: false
      },
      render: (value) => {
        if (!value) {
          return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
        }
        return (
          <Tooltip title={value} placement="topLeft">
            <Text
              ellipsis={{ tooltip: value }}
              copyable={{ text: value, tooltips: ['คัดลอกอีเมล', 'คัดลอกแล้ว'] }}
              className="copyable-text table-cell-text"
              style={{ 
                fontSize: 13, 
                wordBreak: 'break-word',
                lineHeight: '1.5',
                display: 'block'
              }}
            >
              {value}
            </Text>
          </Tooltip>
        );
      }
    },
    {
      title: 'Job Title',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      className: 'col-job-title',
      responsive: ['sm'],
      ellipsis: true,
      render: renderTextCell
    },
    {
      title: (
        <Tooltip title="แผนก/หน่วยงาน">
          <Space size={4}>
            <TeamOutlined style={{ fontSize: 14, color: '#6b7280' }} />
            <span>Department</span>
          </Space>
        </Tooltip>
      ),
      dataIndex: 'department',
      key: 'department',
      width: 170,
      className: 'col-department',
      responsive: ['md'],
      ellipsis: true,
      render: renderDepartmentTag
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
      width: 200,
      className: 'col-company',
      responsive: ['lg'],
      ellipsis: true,
      render: renderTextCell
    },
    {
      title: 'Work Location',
      dataIndex: 'physicalDeliveryOfficeName',
      key: 'location',
      width: 170,
      className: 'col-location',
      responsive: ['lg'],
      ellipsis: true,
      render: renderTextCell
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 190,
      className: 'col-description',
      responsive: ['lg'],
      ellipsis: {
        showTitle: false
      },
      render: (value) => {
        if (!value) {
          return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
        }
        return (
          <Tooltip title={value} placement="topLeft">
            <Text 
              className="table-cell-text" 
              ellipsis={{ tooltip: value, rows: 2 }}
              style={{ 
                fontSize: 13, 
                color: '#4b5563',
                wordBreak: 'break-word',
                lineHeight: '1.5',
                display: 'block'
              }}
            >
              {value}
            </Text>
          </Tooltip>
        );
      }
    },
    {
      title: 'Employee ID',
      dataIndex: 'employeeID',
      key: 'employeeID',
      width: 160,
      className: 'col-employee-id',
      responsive: ['xl'],
      ellipsis: true,
      render: renderEmployeeIdCell
    },
    {
      title: 'Department Number',
      dataIndex: 'departmentNumber',
      key: 'departmentNumber',
      width: 180,
      className: 'col-department-number',
      responsive: ['md'],
      ellipsis: true,
      sorter: (a, b) => (a.departmentNumber || '').localeCompare(b.departmentNumber || ''),
      sortOrder: sortedInfo.columnKey === 'departmentNumber' ? sortedInfo.order : null,
      render: renderTextCell
    },
    {
      title: 'Phone',
      dataIndex: 'telephoneNumber',
      key: 'phone',
      width: 160,
      className: 'col-phone',
      responsive: ['lg'],
      ellipsis: true,
      render: renderTextCell
    },
    {
      title: 'Mobile',
      dataIndex: 'mobile',
      key: 'mobile',
      width: 160,
      className: 'col-mobile',
      responsive: ['lg'],
      ellipsis: true,
      render: renderTextCell
    },
    {
      title: (
        <Tooltip title="สถานะการใช้งาน (Active/Disabled)">
          <Space size={4}>
            <CheckCircleOutlined style={{ fontSize: 14, color: '#6b7280' }} />
            <span>Status</span>
          </Space>
        </Tooltip>
      ),
      dataIndex: 'isEnabled',
      key: 'status',
      width: 140,
      className: 'col-status',
      filters: [
        { text: 'Active', value: true },
        { text: 'Disabled', value: false }
      ],
      onFilter: (value, record) => record.isEnabled === value,
      render: renderStatusCell
    },
    {
      title: (
        <Tooltip title="User Principal Name (UPN)">
          <Space size={4}>
            <GlobalOutlined style={{ fontSize: 14, color: '#6b7280' }} />
            <span>UPN</span>
          </Space>
        </Tooltip>
      ),
      dataIndex: 'userPrincipalName',
      key: 'userPrincipalName',
      width: 220,
      className: 'col-upn',
      responsive: ['lg'],
      ellipsis: true,
      sorter: (a, b) => (a.userPrincipalName || '').localeCompare(b.userPrincipalName || ''),
      sortOrder: sortedInfo.columnKey === 'userPrincipalName' ? sortedInfo.order : null,
      render: renderUserPrincipalNameCell
    },
    {
      title: (
        <Tooltip title="Manager (หัวหน้า)">
          <Space size={4}>
            <UserSwitchOutlined style={{ fontSize: 14, color: '#6b7280' }} />
            <span>Manager</span>
          </Space>
        </Tooltip>
      ),
      dataIndex: 'manager',
      key: 'manager',
      width: 200,
      className: 'col-manager',
      responsive: ['lg'],
      ellipsis: true,
      render: renderManagerCell
    },
    {
      title: (
        <Tooltip title="เข้าสู่ระบบล่าสุด">
          <Space size={4}>
            <HistoryOutlined style={{ fontSize: 14, color: '#6b7280' }} />
            <span>เข้าสู่ระบบล่าสุด</span>
          </Space>
        </Tooltip>
      ),
      dataIndex: 'lastLogon',
      key: 'lastLogon',
      width: 200,
      className: 'col-last-logon',
      responsive: ['lg'],
      sorter: (a, b) => {
        if (!a.lastLogon && !b.lastLogon) return 0;
        if (!a.lastLogon || a.lastLogon === '0') return 1;
        if (!b.lastLogon || b.lastLogon === '0') return -1;
        return new Date(a.lastLogon) - new Date(b.lastLogon);
      },
      sortOrder: sortedInfo.columnKey === 'lastLogon' ? sortedInfo.order : null,
      render: renderLastLogonCell
    },
    {
      title: (
        <Tooltip title="รหัสผ่านล่าสุด">
          <Space size={4}>
            <KeyOutlined style={{ fontSize: 14, color: '#6b7280' }} />
            <span>รหัสผ่านล่าสุด</span>
          </Space>
        </Tooltip>
      ),
      dataIndex: 'pwdLastSet',
      key: 'pwdLastSet',
      width: 200,
      className: 'col-pwd-last-set',
      responsive: ['lg'],
      sorter: (a, b) => {
        if (!a.pwdLastSet && !b.pwdLastSet) return 0;
        if (!a.pwdLastSet || a.pwdLastSet === '0') return 1;
        if (!b.pwdLastSet || b.pwdLastSet === '0') return -1;
        return new Date(a.pwdLastSet) - new Date(b.pwdLastSet);
      },
      sortOrder: sortedInfo.columnKey === 'pwdLastSet' ? sortedInfo.order : null,
      render: renderPasswordLastSetCell
    },
    {
      title: (
        <Tooltip title="วันหมดอายุบัญชี">
          <Space size={4}>
            <ClockCircleOutlined style={{ fontSize: 14, color: '#6b7280' }} />
            <span>หมดอายุ</span>
          </Space>
        </Tooltip>
      ),
      dataIndex: 'accountExpires',
      key: 'accountExpires',
      width: 200,
      className: 'col-account-expires',
      responsive: ['lg'],
      sorter: (a, b) => {
        if (!a.accountExpires && !b.accountExpires) return 0;
        if (!a.accountExpires || a.accountExpires === '0' || a.accountExpires === null) return 1;
        if (!b.accountExpires || b.accountExpires === '0' || b.accountExpires === null) return -1;
        return new Date(a.accountExpires) - new Date(b.accountExpires);
      },
      sortOrder: sortedInfo.columnKey === 'accountExpires' ? sortedInfo.order : null,
      render: (value, record) => renderAccountExpiresCell(value, record)
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: (screens.md || screens.lg || screens.xl) ? 'right' : undefined,
      width: 140,
      className: 'col-actions',
      render: renderActionsCell
    }
  ], [renderDisplayName, renderUsernameCell, renderTextCell, renderDepartmentTag, renderEmployeeIdCell, renderStatusCell, renderUserPrincipalNameCell, renderManagerCell, renderLastLogonCell, renderPasswordLastSetCell, renderAccountExpiresCell, renderActionsCell, screens.md, screens.lg, screens.xl, sortedInfo, users]);

  // Filter columns based on visibility settings
  const columns = useMemo(() => allColumns.filter(col => {
    const isMobile = !screens.md;
    const isTablet = screens.md && !screens.lg;

    if (isMobile && !['user', 'sAMAccountName', 'mail', 'actions'].includes(col.key)) {
      return false;
    }

    if (isTablet && ['description', 'employeeID', 'telephoneNumber', 'mobile'].includes(col.dataIndex || col.key)) {
      return false;
    }

    // Always show User and Actions columns
    if (col.key === 'user' || col.key === 'actions') return true;
    
    // Check visibility setting for other columns
    return visibleColumns[col.key] !== false;
  }), [allColumns, screens.md, screens.lg, visibleColumns]);

  // ==================== ROW SELECTION ====================
  
  const rowSelection = useMemo(() => {
    const allKeys = paginatedUsers.map(u => u.dn);
    const allSelected = allKeys.length > 0 && selectedRowKeys.length === allKeys.length;
    const someSelected = selectedRowKeys.length > 0 && selectedRowKeys.length < allKeys.length;
    
    return {
      selectedRowKeys,
      onChange: (keys) => setSelectedRowKeys(keys),
      onSelectAll: (selected, selectedRows, changeRows) => {
        if (selected) {
          setSelectedRowKeys([...selectedRowKeys, ...changeRows.map(r => r.dn)]);
        } else {
          const changeKeys = changeRows.map(r => r.dn);
          setSelectedRowKeys(selectedRowKeys.filter(key => !changeKeys.includes(key)));
        }
      },
      columnWidth: 48,
      fixed: (screens.md || screens.lg || screens.xl) ? 'left' : undefined,
      preserveSelectedRowKeys: true,
      getCheckboxProps: (record) => ({
        indeterminate: someSelected && selectedRowKeys.includes(record.dn)
      })
    };
  }, [selectedRowKeys, paginatedUsers, screens.md, screens.lg, screens.xl, setSelectedRowKeys]);

  // ==================== TABLE CHANGE HANDLER ====================
  
  const handleTableChange = useCallback((pagination, filters, sorter) => {
    if (sorter && sorter.order) {
      setSortedInfo({
        order: sorter.order,
        columnKey: sorter.field || sorter.columnKey
      });
    } else {
      setSortedInfo({
        order: null,
        columnKey: null
      });
    }
  }, [setSortedInfo]);

  // ==================== RENDER ====================
  
  return (
    <>
      <div className="umx-table-head">
        <div>
          <div className="umx-table-title">รายชื่อผู้ใช้</div>
          <Text type="secondary" style={{ fontSize: 14, fontWeight: 400 }}>
            แสดง <Text strong style={{ color: 'var(--color-text-primary)' }}>{paginatedUsers.length}</Text> จาก <Text strong style={{ color: 'var(--color-text-primary)' }}>{formatCount(filteredUsers.length)}</Text> รายการในมุมมองนี้
          </Text>
        </div>
        <Space size={12}>
          <Tag 
            color="blue" 
            style={{ 
              fontSize: 13, 
              padding: '6px 14px', 
              borderRadius: 8,
              fontWeight: 600,
              border: 'none',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {formatCount(filteredUsers.length)} Visible
          </Tag>
          <Tag 
            color="green" 
            style={{ 
              fontSize: 13, 
              padding: '6px 14px', 
              borderRadius: 8,
              fontWeight: 600,
              border: 'none',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {formatCount(directoryCounts.total)} AD Total
          </Tag>
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={paginatedUsers}
        rowKey="dn"
        rowSelection={rowSelection}
        loading={loading}
        bordered={false}
        size="middle"
        scroll={{ 
          x: 'max-content', 
          y: tableScrollY,
          scrollToFirstRowOnChange: false
        }}
        tableLayout="fixed"
        rowClassName={(record, index) => {
          const baseClass = index % 2 === 0 ? 'table-row-light' : 'table-row-dark';
          return selectedRowKeys.includes(record.dn) ? `${baseClass} row-selected` : baseClass;
        }}
        pagination={false}
        className="umx-table"
        onChange={handleTableChange}
        locale={{
          emptyText: filteredUsers.length === 0 && !loading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div style={{ padding: '40px 20px' }}>
                  <div style={{ marginBottom: 12, fontSize: 16, fontWeight: 600, color: '#111827' }}>
                    ไม่พบผู้ใช้ตามเงื่อนไขที่เลือก
                  </div>
                  <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 16 }}>
                    ลองปรับเปลี่ยนตัวกรองหรือล้างตัวกรองทั้งหมดเพื่อดูผลลัพธ์
                  </Text>
                  {activeFilterTags.length > 0 && (
                    <Button
                      type="primary"
                      size="middle"
                      onClick={handleClearAllFilters}
                      icon={<ClearOutlined />}
                      style={{ borderRadius: 8 }}
                    >
                      ล้างตัวกรองทั้งหมด
                    </Button>
                  )}
                </div>
              }
            />
          ) : undefined
        }}
        onRow={(record) => ({
          onDoubleClick: () => handleViewDetails(record)
        })}
        onHeaderRow={() => ({
          onScroll: () => {
            if (openDropdownKey) {
              setOpenDropdownKey(null);
            }
          }
        })}
      />
      <div className="umx-table-footer">
        <div>
          <Text type="secondary" style={{ fontSize: 14 }}>
            แสดง <Text strong>{paginatedUsers.length}</Text> จาก <Text strong>{formatCount(filteredUsers.length)}</Text> รายการ
          </Text>
        </div>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={isFilteredView ? filteredUsers.length : directoryCounts.total || filteredUsers.length}
          onChange={(page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          }}
          showSizeChanger
          showQuickJumper
          pageSizeOptions={['25', '50', '100']}
          showTotal={(total, range) => `${range[0]}-${range[1]} จาก ${total}`}
          style={{ margin: 0 }}
        />
      </div>
    </>
  );
};

export default UserTable;
