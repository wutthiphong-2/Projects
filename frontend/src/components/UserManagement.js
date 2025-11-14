import React, { useState, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
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
  Grid,
  Pagination,
  Dropdown,
  Menu,
  Descriptions,
  List,
  Badge,
  Tabs,
  Switch,
  Statistic,
  Empty,
  Steps,
  Progress,
  Alert,
  DatePicker,
  Collapse
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  EyeOutlined,
  UserAddOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FilterOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  BarChartOutlined,
  LockOutlined,
  UnlockOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  BankOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  TagOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import config from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { GROUP_DEFAULTS_CONFIG, getDefaultGroupsForOU, getCategoryStatistics } from '../config/groupDefaults';
import { apiCache } from '../utils/cache';
import './UserManagement.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;
const { Option } = Select;
const { Step } = Steps;
const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;

const UserManagement = () => {
  // ==================== STATES ====================
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [directoryCounts, setDirectoryCounts] = useState({
    total: 0,
    enabled: 0,
    disabled: 0,
    fetchedAt: null
  });
  const [searchText, setSearchText] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [ouFilter, setOuFilter] = useState('');
  
  // Enhanced user creation states
  const [availableOUs, setAvailableOUs] = useState([]);
  const [selectedOU, setSelectedOU] = useState(null);
  const [categorizedGroups, setCategorizedGroups] = useState({});
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [currentTab, setCurrentTab] = useState('1');
  const [accountOptions, setAccountOptions] = useState({
    mustChangePassword: false,
    userCannotChangePassword: false,
    passwordNeverExpires: false,
    storePasswordUsingReversibleEncryption: false
  });
  const [suggestedGroupsData, setSuggestedGroupsData] = useState(null); // Stores analysis results
  
  // Step wizard states
  const [currentStep, setCurrentStep] = useState(0); // 0 = Step 1, 1 = Step 2, 2 = Step 3 (Review)
  const [step1Valid, setStep1Valid] = useState(false);
  const [step2Valid, setStep2Valid] = useState(true); // Groups are optional
  const screens = useBreakpoint();
  
  // Group membership management states
  const [isManageGroupsModalVisible, setIsManageGroupsModalVisible] = useState(false);
  const [managingUser, setManagingUser] = useState(null);
  const [userOriginalGroups, setUserOriginalGroups] = useState([]);
  const [userSelectedGroups, setUserSelectedGroups] = useState([]);
  
  // Enhanced group display states
  const [groupSearchText, setGroupSearchText] = useState('');
  const [groupCategoryFilter, setGroupCategoryFilter] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState(
    new Set(GROUP_DEFAULTS_CONFIG.display.expandCategories)
  );
  const [groupViewMode, setGroupViewMode] = useState('all'); // 'all', 'member', 'available'
  const [categoryStats, setCategoryStats] = useState({});
  
  // Modals & Drawers
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDetailsDrawerVisible, setIsDetailsDrawerVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  
  // Column visibility settings (⚡ Default: Show only essential for faster loading)
  const [visibleColumns, setVisibleColumns] = useState({
    user: true,
    sAMAccountName: true,
    mail: true,
    title: true,
    department: true,
    company: true,
    employeeID: false,
    phone: false,
    mobile: false,
    location: true,
    description: true,
    status: false
  });
  const [isColumnSettingsVisible, setIsColumnSettingsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [tableScrollY, setTableScrollY] = useState(520);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState(null);
  
  const updateTableScrollY = useCallback(() => {
    if (typeof window === 'undefined') return;
    const HEADER_HEIGHT = screens.md || screens.lg || screens.xl ? 260 : 320;
    const available = window.innerHeight - HEADER_HEIGHT;
    setTableScrollY(Math.max(600, available));
  }, [screens]);

  useEffect(() => {
    updateTableScrollY();
    if (typeof window === 'undefined') return undefined;
    window.addEventListener('resize', updateTableScrollY);
    return () => {
      window.removeEventListener('resize', updateTableScrollY);
    };
  }, [updateTableScrollY]);

  // Selected data
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  
  // Additional data for details
  const [userGroups, setUserGroups] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [passwordExpiry, setPasswordExpiry] = useState(null);
  const accountOptionDetails = useMemo(() => {
    const options = selectedUser?.accountOptions || {};
    return [
      {
        key: 'mustChangePassword',
        label: 'User must change password at next logon',
        description: 'Forces password change on first login',
        icon: <CheckCircleOutlined style={{ color: '#10b981' }} />,
        inactiveIcon: <CloseCircleOutlined style={{ color: '#d1d5db' }} />,
        active: Boolean(options.mustChangePassword)
      },
      {
        key: 'userCannotChangePassword',
        label: 'User cannot change password',
        description: 'Locks the password change option for this account',
        icon: <LockOutlined style={{ color: '#f59e0b' }} />,
        inactiveIcon: <UnlockOutlined style={{ color: '#d1d5db' }} />,
        active: Boolean(options.userCannotChangePassword)
      },
      {
        key: 'passwordNeverExpires',
        label: 'Password never expires',
        description: 'User will not be required to change password',
        icon: <ClockCircleOutlined style={{ color: '#3b82f6' }} />,
        inactiveIcon: <ClockCircleOutlined style={{ color: '#d1d5db' }} />,
        active: Boolean(options.passwordNeverExpires)
      },
      {
        key: 'storePasswordUsingReversibleEncryption',
        label: 'Store password using reversible encryption',
        description: 'Only needed for legacy protocols requiring clear-text access',
        icon: <InfoCircleOutlined style={{ color: '#6366f1' }} />,
        inactiveIcon: <InfoCircleOutlined style={{ color: '#d1d5db' }} />,
        active: Boolean(options.storePasswordUsingReversibleEncryption)
      }
    ];
  }, [selectedUser]);
  
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const { getAuthHeaders } = useAuth();
  const {
    notifyUserCreated,
    notifyUserUpdated,
    notifyUserDeleted,
    notifyUserStatusChanged,
    notifyPasswordReset,
    notifyError
  } = useNotification();

  // ==================== HELPER FUNCTIONS ====================
  
  const formatCount = useCallback((value) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return '0';
  }, []);

  const formatDateTime = useCallback((value, fallback = '-') => {
    if (!value) return fallback;
    const parsed = dayjs(value);
    if (!parsed.isValid()) return fallback;
    return parsed.format('DD MMM YYYY HH:mm');
  }, []);

  const getOuLabel = useCallback((dn) => {
    if (!dn) return 'CN=Users';
    const found = availableOUs.find((ou) => ou.dn === dn);
    if (found?.fullPath) return found.fullPath;
    return dn
      .replace(/,?DC=[^,]+/gi, '')
      .replace(/^CN=/i, '')
      .replace(/^OU=/i, '')
      .replace(/OU=/gi, '')
      .replace(/,/g, ' / ');
  }, [availableOUs]);

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

  const handleFilterTagClose = (key) => {
    switch (key) {
      case 'department':
        setDepartmentFilter('');
        break;
      case 'ou':
        setOuFilter('');
        break;
      case 'status':
        setStatusFilter('all');
        break;
      case 'dateRange':
        setDateRangeFilter(null);
        break;
      default:
        break;
    }
  };

  const handleClearAllFilters = () => {
    setDepartmentFilter('');
    setOuFilter('');
    setStatusFilter('all');
    setDateRangeFilter(null);
    setSearchText('');
  };

  const openAdvancedFilterDrawer = () => {
    filterForm.setFieldsValue({
      department: departmentFilter || undefined,
      ou: ouFilter || undefined,
      status: statusFilter,
      dateRange: Array.isArray(dateRangeFilter) ? dateRangeFilter : []
    });
    setIsFilterDrawerVisible(true);
  };

  const handleApplyAdvancedFilters = async () => {
    try {
      const values = await filterForm.validateFields();
      setDepartmentFilter(values.department || '');
      setOuFilter(values.ou || '');
      setStatusFilter(values.status || 'all');
      setDateRangeFilter(
        values.dateRange && values.dateRange.length === 2 ? values.dateRange : null
      );
      setIsFilterDrawerVisible(false);
    } catch (error) {
      console.error('Failed to apply advanced filters:', error);
    }
  };

  const handleResetAdvancedFilters = () => {
    filterForm.resetFields();
    setDepartmentFilter('');
    setOuFilter('');
    setStatusFilter('all');
    setDateRangeFilter(null);
  };

  // ==================== DATA FETCHING ====================
  
  const fetchDirectoryCounts = useCallback(async () => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/users/stats`, {
        headers: getAuthHeaders()
      });
      const data = response.data || {};
      setDirectoryCounts({
        total: data.total_users ?? 0,
        enabled: data.enabled_users ?? 0,
        disabled: data.disabled_users ?? 0,
        fetchedAt: data.fetched_at ?? null
      });
    } catch (error) {
      console.error('❌ Failed to fetch AD user counts:', error);
      message.warning({
        key: 'user-counts',
        content: 'ไม่สามารถโหลดจำนวนผู้ใช้จาก AD ได้',
        duration: 3
      });
    }
  }, [getAuthHeaders]);

  const fetchUsers = useCallback(async (forceRefresh = false, ignoreFilters = false) => {
    setLoading(true);
    console.log('🔄 Fetching users...', forceRefresh ? '(Force Refresh)' : '', ignoreFilters ? '(Ignore Filters)' : '');
    
    try {
      const params = {
        page_size: 1000,
        page: 1,
        _t: forceRefresh ? Date.now() : undefined
      };
      
      // Only apply filters if not ignoring them
      if (!ignoreFilters) {
        // Apply search
        if (searchText) {
          params.q = searchText;
          console.log('🔍 Search text:', searchText);
        }
        
        if (departmentFilter) {
          params.department = departmentFilter;
          console.log('🏢 Department filter:', departmentFilter);
        }

        if (ouFilter) {
          params.ou = ouFilter;
          console.log('📁 OU filter:', ouFilter);
        }
      } else {
        console.log('⚠️ Ignoring all filters - fetching ALL users from AD');
      }
      
      console.log('📤 Request params:', params);
      console.log('📤 Request URL:', `${config.apiUrl}/api/users/`);
      
      // Generate cache key
      const cacheKey = apiCache.generateKey(`${config.apiUrl}/api/users/`, params);
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = apiCache.get(cacheKey);
        if (cachedData) {
          setUsers(cachedData);
          console.log('✅ Users loaded from cache:', cachedData.length);
          await fetchDirectoryCounts();
          return { success: true, count: cachedData.length };
        }
      }
      
      // Load first page immediately for faster initial render
      const firstPageResponse = await axios.get(`${config.apiUrl}/api/users/`, {
        headers: getAuthHeaders(),
        params: { ...params, page: 1 }
      });

      const firstPageData = firstPageResponse.data || [];
      setUsers(firstPageData);
      await fetchDirectoryCounts();

      console.log(`✅ Users fetched: ${firstPageData.length}`);
      
      if (forceRefresh) {
        console.log('🔄 Data refreshed successfully!');
      }
      
      return { success: true, count: firstPageData.length };
    } catch (error) {
      const detail = error?.response?.data?.detail || error?.message || 'ไม่ทราบสาเหตุ';
      message.error(`ไม่สามารถโหลดข้อมูลผู้ใช้ได้: ${detail}`);
      console.error('❌ Fetch users failed:', error);
      console.error('Error details:', error.response?.data);
      return { success: false, count: 0 };
    } finally {
      setLoading(false);
    }
  }, [searchText, departmentFilter, ouFilter, getAuthHeaders, fetchDirectoryCounts]);

  // ⚡ Debounced version for search (wait 500ms after user stops typing)
  const debouncedFetchUsers = useMemo(
    () => debounce((forceRefresh, ignoreFilters) => {
      fetchUsers(forceRefresh, ignoreFilters);
    }, 500),
    [fetchUsers]
  );

  const fetchDepartments = useCallback(async () => {
    try {
      console.log('🏢 Fetching departments...');
      const response = await axios.get(`${config.apiUrl}/api/users/departments`, {
        headers: getAuthHeaders()
      });
      console.log('✅ Departments fetched:', response.data.length);
      console.log('📋 Departments:', response.data);
      setDepartments(response.data);
    } catch (error) {
      console.error('❌ Error fetching departments:', error);
      console.error('Error details:', error.response?.data);
    }
  }, [getAuthHeaders]);

  const fetchUserOUs = useCallback(async () => {
    try {
      console.log('📁 Fetching user OUs...');
      const response = await axios.get(`${config.apiUrl}/api/ous/user-ous`, {
        headers: getAuthHeaders()
      });
      console.log('✅ User OUs fetched:', response.data.length);
      setAvailableOUs(response.data);
    } catch (error) {
      console.error('❌ Error fetching user OUs:', error);
      console.error('Error details:', error.response?.data);
    }
  }, [getAuthHeaders]);

  const fetchAvailableGroups = useCallback(async () => {
    try {
      console.log('👥 Fetching available groups...');
      const response = await axios.get(`${config.apiUrl}/api/users/groups`, {
        headers: getAuthHeaders()
      });
      console.log('✅ Groups fetched:', response.data.length);
      setAvailableGroups(response.data);
    } catch (error) {
      console.error('❌ Error fetching groups:', error);
      console.error('Error details:', error.response?.data);
    }
  }, [getAuthHeaders]);

  const fetchCategorizedGroups = useCallback(async () => {
    try {
      console.log('👥 Fetching categorized groups...');
      const response = await axios.get(`${config.apiUrl}/api/groups/categorized`, {
        headers: getAuthHeaders()
      });
      console.log('✅ Categorized groups fetched:', response.data.totalGroups);
      setCategorizedGroups(response.data.categories);
    } catch (error) {
      console.error('❌ Error fetching categorized groups:', error);
      console.error('Error details:', error.response?.data);
      // Fallback: use empty categories
      setCategorizedGroups({
        Internet: [],
        VPN: [],
        USB: [],
        FileShare: [],
        PasswordPolicy: [],
        Remote: [],
        Aliases: [],
        Others: []
      });
    }
  }, [getAuthHeaders]);

  const fetchUserDetails = async (userDn) => {
    try {
      console.log('📥 Fetching user details for:', userDn);
      
      // Fetch full user details first
      const userDetailsRes = await axios.get(
        `${config.apiUrl}/api/users/${encodeURIComponent(userDn)}`,
        { headers: getAuthHeaders() }
      ).catch(err => {
        console.error('Error fetching user details:', err);
        return { data: selectedUser };
      });

      // Update selected user with full details
      if (userDetailsRes.data) {
        setSelectedUser(userDetailsRes.data);
      }

      // Fetch additional information in parallel
      const [groupsRes, permissionsRes, historyRes, expiryRes] = await Promise.all([
        axios.get(`${config.apiUrl}/api/users/${encodeURIComponent(userDn)}/groups`, {
          headers: getAuthHeaders()
        }).catch(err => {
          console.error('Error fetching groups:', err);
          return { data: [] };
        }),
        axios.get(`${config.apiUrl}/api/users/${encodeURIComponent(userDn)}/permissions`, {
          headers: getAuthHeaders()
        }).catch(err => {
          console.error('Error fetching permissions:', err);
          return { data: [] };
        }),
        axios.get(`${config.apiUrl}/api/users/${encodeURIComponent(userDn)}/login-history`, {
          headers: getAuthHeaders()
        }).catch(err => {
          console.error('Error fetching login history:', err);
          return { data: [] };
        }),
        axios.get(`${config.apiUrl}/api/users/${encodeURIComponent(userDn)}/password-expiry`, {
          headers: getAuthHeaders()
        }).catch(err => {
          console.error('Error fetching password expiry:', err);
          return { data: null };
        })
      ]);

      console.log('✅ User Groups:', groupsRes.data?.length || 0);
      console.log('✅ User Permissions:', permissionsRes.data?.length || 0);
      console.log('✅ Login History:', historyRes.data?.length || 0);
      console.log('✅ Password Expiry:', expiryRes.data);

      setUserGroups(groupsRes.data || []);
      setUserPermissions(permissionsRes.data || []);
      setLoginHistory(historyRes.data || []);
      setPasswordExpiry(expiryRes.data || null);
    } catch (error) {
      console.error('Error fetching user details:', error);
      message.warning('ไม่สามารถโหลดข้อมูลเพิ่มเติมบางส่วนได้');
    }
  };

  // ⚡ PERFORMANCE: Load only users first, defer other data
  useEffect(() => {
    fetchUsers();
    
    // Defer non-critical data loading
    setTimeout(() => {
      fetchDepartments();
      fetchAvailableGroups();
      fetchUserOUs();
      fetchCategorizedGroups();
    }, 1000); // Load after 1 second
  }, [fetchUsers, fetchDepartments, fetchAvailableGroups, fetchUserOUs, fetchCategorizedGroups]);

  useEffect(() => {
    if (isFilterDrawerVisible) {
      filterForm.setFieldsValue({
        department: departmentFilter || undefined,
        ou: ouFilter || undefined,
        status: statusFilter,
        dateRange: Array.isArray(dateRangeFilter) ? dateRangeFilter : []
      });
    }
  }, [
    isFilterDrawerVisible,
    departmentFilter,
    ouFilter,
    statusFilter,
    dateRangeFilter,
    filterForm
  ]);

  // ⚡ Auto-search when searchText or departmentFilter changes (with debounce)
  useEffect(() => {
    console.log('🔍 Search/filter changed - debouncing...', searchText, departmentFilter, ouFilter);
    debouncedFetchUsers(false, false);
    
    // Cleanup debounce on unmount
    return () => {
      debouncedFetchUsers.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, departmentFilter, ouFilter]);

  // ==================== HANDLERS ====================
  
  const handleDepartmentFilterChange = (value) => {
    setDepartmentFilter(value);
  };

  const handleOuFilterChange = (value) => {
    setOuFilter(value || '');
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [ouFilter]);

  const handleViewDetails = async (user) => {
    setSelectedUser(user);
    setIsDetailsDrawerVisible(true);
    await fetchUserDetails(user.dn);
  };

  const handleCreateUser = () => {
    createForm.resetFields();
    setSelectedOU(null);
    setSelectedGroups([]);
    setSuggestedGroupsData(null);
    setCurrentTab('1');
    setCurrentStep(0); // Reset to step 1
    setStep1Valid(false);
    setStep2Valid(true);
    setAccountOptions({
      mustChangePassword: false,
      userCannotChangePassword: false,
      passwordNeverExpires: false,
      storePasswordUsingReversibleEncryption: false
    });
    setIsCreateModalVisible(true);
  };

  const handleNextStep = async () => {
    try {
      if (currentStep === 0) {
        // Validate Step 1 fields
        await createForm.validateFields(['cn', 'sAMAccountName', 'password', 'confirmPassword', 'mail']);
        setStep1Valid(true);
        setCurrentStep(1);
      } else if (currentStep === 1) {
        // Step 2 → Step 3 (Review)
        setCurrentStep(2);
      }
    } catch (error) {
      console.log('Validation failed:', error);
      message.error('Please fill in all required fields');
    }
  };

  const handleBackStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Fetch suggested groups from API based on OU analysis
  const fetchSuggestedGroupsForOU = async (ouDn) => {
    try {
      console.log('🔍 Fetching suggested groups for OU:', ouDn);
      
      // Call API to analyze OU
      const response = await axios.get(
        `${config.apiUrl}/api/ous/${encodeURIComponent(ouDn)}/suggested-groups`,
        {
          headers: getAuthHeaders(),
          params: {
            threshold: 0.6  // 60% threshold
          }
        }
      );
      
      const { totalUsers, suggestedGroups } = response.data;
      
      console.log(`✅ Analysis complete: ${totalUsers} users, ${suggestedGroups.length} groups suggested`);
      
      // Store analysis data for display
      setSuggestedGroupsData(response.data);
      
      // Extract group DNs
      const suggestedGroupDNs = suggestedGroups.map(g => g.dn);
      
      // Add base groups (PSO-OU-90Days)
      const baseGroupDNs = [];
      Object.values(categorizedGroups).forEach(categoryGroups => {
        categoryGroups.forEach(group => {
          if (GROUP_DEFAULTS_CONFIG.autoAssign.baseGroups.includes(group.cn)) {
            baseGroupDNs.push(group.dn);
          }
        });
      });
      
      // Combine base + suggested (unique)
      const allDefaultGroups = [...new Set([...baseGroupDNs, ...suggestedGroupDNs])];
      
      setSelectedGroups(allDefaultGroups);
      
      if (suggestedGroups.length > 0) {
        // Show detailed message with percentages
        const topGroups = suggestedGroups.slice(0, 3);
        const groupNames = topGroups.map(g => `${g.cn} (${g.percentage}%)`).join(', ');
        
        message.info({
          content: (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                🎯 Auto-selected {allDefaultGroups.length} groups
              </div>
              <div style={{ fontSize: 12 }}>
                Based on {totalUsers} existing users in this OU
              </div>
              <div style={{ fontSize: 11, marginTop: 4, color: '#6b7280' }}>
                Top: {groupNames}
              </div>
            </div>
          ),
          duration: 5
        });
      } else if (totalUsers === 0) {
        message.warning({
          content: 'No existing users in this OU. Using default groups.',
          duration: 3
        });
        
        // Fallback to hardcoded defaults
        const fallbackGroups = getDefaultGroupsForOU(ouDn, categorizedGroups);
        setSelectedGroups(fallbackGroups);
      }
      
    } catch (error) {
      console.error('❌ Error fetching suggested groups:', error);
      
      // Fallback to hardcoded defaults
      console.log('⚠️ Using fallback hardcoded defaults');
      const fallbackGroups = getDefaultGroupsForOU(ouDn, categorizedGroups);
      setSelectedGroups(fallbackGroups);
      
      message.warning({
        content: 'Could not analyze OU. Using default groups.',
        duration: 3
      });
    }
  };

  // Auto-assign groups when OU changes
  const handleOUChange = async (ouDn) => {
    setSelectedOU(ouDn);
    
    // Auto-assign default groups based on OU analysis
    if (ouDn) {
      console.log('🎯 OU selected:', ouDn);
      
      // Fetch suggested groups from API (dynamic analysis)
      await fetchSuggestedGroupsForOU(ouDn);
    } else {
      // No OU selected, just keep base groups
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
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    editForm.setFieldsValue({
      cn: user.cn,
      sAMAccountName: user.sAMAccountName,
      mail: user.mail,
      displayName: user.displayName,
      givenName: user.givenName,
      sn: user.sn,
      title: user.title,
      telephoneNumber: user.telephoneNumber,
      mobile: user.mobile,
      department: user.department,
      company: user.company,
      employeeID: user.employeeID,
      physicalDeliveryOfficeName: user.physicalDeliveryOfficeName,
      streetAddress: user.streetAddress,
      l: user.l,
      st: user.st,
      postalCode: user.postalCode,
      co: user.co,
      description: user.description
    });
    setIsEditModalVisible(true);
  };

  const handleDeleteUser = async (userDn) => {
    try {
      const user = users.find(u => u.dn === userDn);
      const userName = user?.cn || user?.displayName || 'ผู้ใช้';
      
      console.log('🗑️ Deleting user:', userDn);
      
      await axios.delete(`${config.apiUrl}/api/users/${encodeURIComponent(userDn)}`, {
        headers: getAuthHeaders()
      });
      
      console.log('✅ User deleted successfully');
      
      notifyUserDeleted(userName);
      
      // ⚡ Invalidate cache and refresh
      apiCache.invalidate('/api/users');
      await fetchUsers(true, true);
    } catch (error) {
      console.error('❌ Delete user error:', error);
      const errorMsg = formatErrorDetail(error.response?.data?.detail) || error.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้';
      notifyError('ไม่สามารถลบผู้ใช้ได้', errorMsg);
    }
  };

  const handleToggleStatus = async (userDn) => {
    try {
      const user = users.find(u => u.dn === userDn);
      const userName = user?.cn || user?.displayName || 'ผู้ใช้';
      
      console.log('🔄 Toggling status for:', userDn);
      
      const response = await axios.patch(
        `${config.apiUrl}/api/users/${encodeURIComponent(userDn)}/toggle-status`,
        {},
        { headers: getAuthHeaders() }
      );
      
      console.log('✅ Status toggled:', response.data.isEnabled ? 'Enabled' : 'Disabled');
      
      notifyUserStatusChanged(userName, response.data.isEnabled);
      
      // ⚡ Invalidate cache and refresh
      apiCache.invalidate('/api/users');
      await fetchUsers(true, true);
      
      // Refresh details if drawer is open
      if (isDetailsDrawerVisible && selectedUser?.dn === userDn) {
        const updatedUser = { ...selectedUser, isEnabled: response.data.isEnabled };
        setSelectedUser(updatedUser);
      }
    } catch (error) {
      console.error('❌ Toggle status error:', error);
      const errorMsg = formatErrorDetail(error.response?.data?.detail) || error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ';
      notifyError('ไม่สามารถเปลี่ยนสถานะได้', errorMsg);
    }
  };

  const handleResetPassword = (user) => {
    setSelectedUser(user);
    passwordForm.resetFields();
    setIsPasswordModalVisible(true);
  };

  const handleManageGroups = async (user) => {
    setManagingUser(user);
    
    // Get current groups DNs
    const currentGroupDNs = userGroups.map(g => g.dn);
    setUserOriginalGroups(currentGroupDNs);
    setUserSelectedGroups(currentGroupDNs);
    
    // Fetch suggested groups based on user's OU for recommendations
    if (user.dn) {
      // Extract OU from user DN
      const dnParts = user.dn.split(',');
      const ouParts = dnParts.slice(1); // Skip CN part
      const userOUDN = ouParts.join(',');
      
      console.log('📍 User OU:', userOUDN);
      
      // Fetch suggestions
      try {
        const response = await axios.get(
          `${config.apiUrl}/api/ous/${encodeURIComponent(userOUDN)}/suggested-groups`,
          {
            headers: getAuthHeaders(),
            params: { threshold: 0.5 }  // Lower threshold for recommendations (50%)
          }
        );
        
        setSuggestedGroupsData(response.data);
        console.log(`💡 Found ${response.data.suggestedGroups.length} suggested groups`);
      } catch (error) {
        console.error('⚠️ Could not fetch suggestions:', error);
        setSuggestedGroupsData(null);
      }
    }
    
    setIsManageGroupsModalVisible(true);
  };

  const handleRemoveFromGroup = async (groupDn, groupName) => {
    try {
      console.log(`🗑️ Removing user ${selectedUser.cn} from group ${groupName}`);
      
      await axios.delete(
        `${config.apiUrl}/api/groups/${encodeURIComponent(groupDn)}/members`,
        {
          headers: getAuthHeaders(),
          data: { user_dn: selectedUser.dn }
        }
      );
      
      console.log('✅ User removed from group successfully');
      message.success(`Removed from group: ${groupName}`);
      
      // Refresh user groups
      await fetchUserDetails(selectedUser.dn);
      
    } catch (error) {
      console.error('❌ Remove from group error:', error);
      const errorMsg = formatErrorDetail(error.response?.data?.detail) || error.message || 'Failed to remove user from group';
      notifyError('Cannot remove from group', errorMsg);
    }
  };

  const handleQuickAddGroup = async (groupDn, groupName) => {
    try {
      console.log(`⚡ Quick adding user to group: ${groupName}`);
      
      await axios.post(
        `${config.apiUrl}/api/groups/${encodeURIComponent(groupDn)}/members`,
        { user_dn: selectedUser.dn },
        { headers: getAuthHeaders() }
      );
      
      console.log('✅ User added to group successfully');
      message.success(`Added to group: ${groupName}`);
      
      // Refresh user groups
      await fetchUserDetails(selectedUser.dn);
      
    } catch (error) {
      console.error('❌ Quick add group error:', error);
      
      // Check if already a member
      const detail = formatErrorDetail(error.response?.data?.detail);
      if (detail?.includes('entryAlreadyExists') || detail?.includes('already')) {
        message.warning(`User is already a member of ${groupName}`);
      } else {
        const errorMsg = detail || error.message || 'Failed to add user to group';
        notifyError('Cannot add to group', errorMsg);
      }
    }
  };

  const handleSaveGroupChanges = async () => {
    try {
      console.log('💾 Saving group changes...');
      console.log('Original groups:', userOriginalGroups);
      console.log('Selected groups:', userSelectedGroups);
      
      // Calculate groups to add and remove
      const groupsToAdd = userSelectedGroups.filter(dn => !userOriginalGroups.includes(dn));
      const groupsToRemove = userOriginalGroups.filter(dn => !userSelectedGroups.includes(dn));
      
      console.log('Groups to add:', groupsToAdd.length);
      console.log('Groups to remove:', groupsToRemove.length);
      
      let addedCount = 0;
      let removedCount = 0;
      let failedCount = 0;
      
      // Add to new groups
      for (const groupDn of groupsToAdd) {
        try {
          await axios.post(
            `${config.apiUrl}/api/groups/${encodeURIComponent(groupDn)}/members`,
            { user_dn: managingUser.dn },
            { headers: getAuthHeaders() }
          );
          addedCount++;
          console.log(`✅ Added to group: ${groupDn}`);
        } catch (error) {
          failedCount++;
          console.error(`❌ Failed to add to group: ${groupDn}`, error);
        }
      }
      
      // Remove from old groups
      for (const groupDn of groupsToRemove) {
        try {
          await axios.delete(
            `${config.apiUrl}/api/groups/${encodeURIComponent(groupDn)}/members`,
            {
              headers: getAuthHeaders(),
              data: { user_dn: managingUser.dn }
            }
          );
          removedCount++;
          console.log(`✅ Removed from group: ${groupDn}`);
        } catch (error) {
          failedCount++;
          console.error(`❌ Failed to remove from group: ${groupDn}`, error);
        }
      }
      
      // Show results
      const messages = [];
      if (addedCount > 0) messages.push(`✓ Added to ${addedCount} group(s)`);
      if (removedCount > 0) messages.push(`✓ Removed from ${removedCount} group(s)`);
      if (failedCount > 0) messages.push(`⚠ ${failedCount} operation(s) failed`);
      
      if (addedCount > 0 || removedCount > 0) {
        message.success(messages.join(', '));
      } else if (failedCount > 0) {
        message.error('Failed to update group membership');
      } else {
        message.info('No changes made');
      }
      
      // Close modal and refresh
      setIsManageGroupsModalVisible(false);
      await fetchUserDetails(managingUser.dn);
      
    } catch (error) {
      console.error('❌ Save group changes error:', error);
      const errorMsg = formatErrorDetail(error.response?.data?.detail) || error.message || 'Failed to save group changes';
      notifyError('Cannot save group changes', errorMsg);
    }
  };

  const handlePasswordModalOk = async () => {
    try {
      const values = await passwordForm.validateFields();
      
      // 🔒 Security: Log without showing password
      console.log('🔐 Resetting password for user:', selectedUser.cn);
      
      // Note: Backend API might need to be extended for password reset
      // For now, we'll use the modify endpoint
      await axios.put(
        `${config.apiUrl}/api/users/${encodeURIComponent(selectedUser.dn)}`,
        { password: values.password },
        { headers: getAuthHeaders() }
      );
      
      console.log('✅ Password reset successful (password not logged for security)');
      
      notifyPasswordReset(selectedUser.cn || selectedUser.displayName);
      setIsPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      console.error('❌ Password reset error:', error.message); // Don't log full error (may contain password)
      const errorMsg = formatErrorDetail(error.response?.data?.detail) || error.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน';
      notifyError('ไม่สามารถรีเซ็ตรหัสผ่านได้', errorMsg);
    }
  };

  const handleCreateModalOk = async () => {
    let formValues = null;
    
    try {
      formValues = await createForm.validateFields();
      
      // 🔒 Security Warning: Check if using HTTPS
      if (!config.apiUrl.startsWith('https://') && window.location.protocol !== 'file:') {
        console.warn('⚠️ Security Warning: Using HTTP instead of HTTPS. Sensitive data may be exposed!');
      }
      
      // 🔒 Security: Don't log sensitive data (password)
      const { password, confirmPassword, ...safeData } = formValues;
      console.log('📤 Creating user with data:', {
        ...safeData,
        password: '***HIDDEN***', // Hide password in logs for security
        ou: selectedOU,
        groups: selectedGroups.length,
        accountOptions: accountOptions
      });
      
      // Remove confirmPassword before sending to backend
      const { confirmPassword: _, ...dataToSend } = formValues;
      
      // Add OU, groups, and account options to data
      if (selectedOU) {
        dataToSend.ou = selectedOU;
      }
      if (selectedGroups && selectedGroups.length > 0) {
        dataToSend.groups = selectedGroups;
      }
      dataToSend.mustChangePassword = accountOptions.mustChangePassword;
      dataToSend.userCannotChangePassword = accountOptions.userCannotChangePassword;
      dataToSend.passwordNeverExpires = accountOptions.passwordNeverExpires;
      dataToSend.storePasswordUsingReversibleEncryption = accountOptions.storePasswordUsingReversibleEncryption;
      
      const response = await axios.post(`${config.apiUrl}/api/users/`, dataToSend, {
        headers: getAuthHeaders()
      });
      
      // 🔒 Security: Don't log full response (may contain sensitive data)
      console.log('✅ User created successfully:', {
        success: response.data.success,
        username: response.data.user?.sAMAccountName,
        dn: response.data.user?.dn
      });
      console.log(`📊 Current user count BEFORE refresh: ${users.length}`);
      
      // Close modal first
      setIsCreateModalVisible(false);
      createForm.resetFields();
      
      // Show notification
      notifyUserCreated(formValues.cn || formValues.displayName, formValues.mail);
      
      // Check if password was set successfully
      if (response.data.passwordSet === false) {
        message.warning({
          content: (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                ⚠️ User สร้างสำเร็จ แต่ Password ยังไม่ได้ตั้ง
              </div>
              <div style={{ fontSize: 13 }}>
                กรุณาตั้ง Password ใน Active Directory Users and Computers ด้วยตนเอง
              </div>
              <div style={{ fontSize: 12, marginTop: 4, color: '#6b7280' }}>
                สาเหตุ: Backend ไม่ได้ใช้ LDAPS (SSL/TLS)
              </div>
            </div>
          ),
          duration: 8
        });
      }
      
      // ⚡ Optimistic UI: Invalidate cache immediately and refresh (reduced delay)
      console.log('🗑️ Invalidating cache after user creation...');
      apiCache.invalidate('/api/users');
      
      console.log('⏳ Brief wait for AD replication...');
      await new Promise(resolve => setTimeout(resolve, 500)); // ⚡ Reduced from 2000ms to 500ms
      
      const oldUserCount = users.length;
      console.log(`📊 Current user count BEFORE refresh: ${oldUserCount}`);
      
      console.log('🔄 Force refreshing user list (ignoring all filters)...');
      
      // Fetch with ignoreFilters = true to get ALL users
      const result = await fetchUsers(true, true);
      
      console.log('✅ User list refreshed. Result:', result);
      console.log(`📊 User count AFTER refresh: ${result.count}`);
      console.log(`📈 Change: ${oldUserCount} → ${result.count} (${result.count > oldUserCount ? '+' : ''}${result.count - oldUserCount})`);
      
      // Show detailed success message
      message.success({
        content: (
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
              ✅ สร้างผู้ใช้สำเร็จ!
            </div>
            <div style={{ fontSize: 13 }}>
              Username: <strong>{formValues.sAMAccountName}</strong>
            </div>
            <div style={{ fontSize: 13 }}>
              Email: <strong>{formValues.mail}</strong>
            </div>
            {selectedOU && (
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                📁 OU: {availableOUs.find(ou => ou.dn === selectedOU)?.fullPath || 'Default'}
              </div>
            )}
            {response.data.groupsAssigned > 0 && (
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                👥 Assigned to {response.data.groupsAssigned} group(s)
              </div>
            )}
            <div style={{ fontSize: 12, marginTop: 4, color: '#10b981' }}>
              ✓ อัพเดทแล้ว: {oldUserCount} → {result.count} users (+{result.count - oldUserCount})
            </div>
          </div>
        ),
        duration: 5
      });
    } catch (error) {
      console.error('❌ Create user error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorTitle = 'ไม่สามารถสร้างผู้ใช้ได้';
      let errorMessage = 'เกิดข้อผิดพลาดในการสร้างผู้ใช้';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        // Handle FastAPI validation errors (array of objects)
        if (Array.isArray(detail)) {
          errorTitle = '❌ ข้อมูลไม่ถูกต้อง';
          errorMessage = detail.map(err => {
            const field = err.loc?.join(' > ') || 'Unknown field';
            return `• ${field}: ${err.msg}`;
          }).join('\n');
        }
        // Handle string errors
        else if (typeof detail === 'string') {
          // ตรวจสอบ error แบบละเอียด
          if (detail.includes('entryAlreadyExists')) {
            errorTitle = '❌ Username ซ้ำ!';
            const username = formValues?.sAMAccountName || 'ที่ระบุ';
            const cn = formValues?.cn || 'ที่ระบุ';
            errorMessage = `Username "${username}" หรือ CN "${cn}" มีในระบบแล้ว\n\nกรุณาใช้ชื่ออื่นที่ไม่ซ้ำกัน`;
          } else if (detail.includes('unwillingToPerform') || detail.includes('password') || detail.includes('constraint violation')) {
            errorTitle = '❌ Password ไม่ผ่าน Active Directory Policy!';
            errorMessage = '⚠️ Password ต้องมีครบทุกข้อ:\n\n' +
              '✓ อย่างน้อย 8 ตัวอักษร\n' +
              '✓ ตัวพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว\n' +
              '✓ ตัวพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว\n' +
              '✓ ตัวเลข (0-9) อย่างน้อย 1 ตัว\n' +
              '✓ อักขระพิเศษ (!@#$%^&*) อย่างน้อย 1 ตัว\n\n' +
              '💡 ตัวอย่าง Password ที่ถูกต้อง:\n' +
              '  • SecurePass123!\n' +
              '  • MyP@ssw0rd\n' +
              '  • Test1234#\n\n' +
              '⚡ กรุณาตั้ง Password ใหม่ตาม requirement ข้างต้น';
          } else if (detail.includes('invalidCredentials')) {
            errorTitle = '❌ ไม่มีสิทธิ์!';
            errorMessage = 'Account ที่ใช้เชื่อมต่อ AD ไม่มีสิทธิ์สร้างผู้ใช้';
          } else {
            errorMessage = detail;
          }
        }
        // Handle object errors
        else if (typeof detail === 'object') {
          errorMessage = JSON.stringify(detail, null, 2);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      notifyError(errorTitle, errorMessage);
    }
  };

  const handleEditModalOk = async () => {
    let formValues = null;
    
    try {
      formValues = await editForm.validateFields();
      
      console.log('📝 Editing user:', editingUser.dn);
      console.log('📝 Form values:', formValues);
      
      // Remove fields that shouldn't be updated or are empty
      const updateData = {};
      Object.keys(formValues).forEach(key => {
        if (formValues[key] !== undefined && formValues[key] !== null) {
          // Skip sAMAccountName and password as they're not editable
          if (key !== 'sAMAccountName' && key !== 'password') {
            updateData[key] = formValues[key];
          }
        }
      });
      
      console.log('📤 Update data:', updateData);
      
      if (Object.keys(updateData).length === 0) {
        message.warning('ไม่มีข้อมูลที่ต้องแก้ไข');
        return;
      }
      
      const response = await axios.put(
        `${config.apiUrl}/api/users/${encodeURIComponent(editingUser.dn)}`,
        updateData,
        { headers: getAuthHeaders() }
      );
      
      console.log('✅ User updated:', response.data);
      
      notifyUserUpdated(updateData.cn || editingUser.cn || editingUser.displayName);
      
      const updatedDn = response.data?.dn || editingUser.dn;
      const oldDn = editingUser.dn;
      const refreshedUser = response.data?.user ? response.data.user : {
        ...editingUser,
        ...updateData,
        dn: updatedDn
      };
      
      setUsers(prev => {
        let replaced = false;
        const updated = prev.map(user => {
          if (
            user.dn === oldDn ||
            user.dn === updatedDn ||
            (refreshedUser && (
              (user.cn && refreshedUser.cn && user.cn.toLowerCase() === refreshedUser.cn.toLowerCase()) ||
              (user.displayName && refreshedUser.displayName && user.displayName.toLowerCase() === refreshedUser.displayName.toLowerCase()) ||
              (user.sAMAccountName && refreshedUser.sAMAccountName && user.sAMAccountName.toLowerCase() === refreshedUser.sAMAccountName.toLowerCase())
            ))
          ) {
            replaced = true;
            return { ...user, ...refreshedUser };
          }
          return user;
        });
        if (!replaced) {
          updated.push(refreshedUser);
        }
        return updated;
      });
      
      if (
        selectedUser?.dn === oldDn ||
        selectedUser?.dn === updatedDn ||
        (
          selectedUser &&
          refreshedUser &&
          (
            (selectedUser.cn && refreshedUser.cn && selectedUser.cn.toLowerCase() === refreshedUser.cn.toLowerCase()) ||
            (selectedUser.displayName && refreshedUser.displayName && selectedUser.displayName.toLowerCase() === refreshedUser.displayName.toLowerCase()) ||
            (selectedUser.sAMAccountName && refreshedUser.sAMAccountName && selectedUser.sAMAccountName.toLowerCase() === refreshedUser.sAMAccountName.toLowerCase())
          )
        )
      ) {
        setSelectedUser(refreshedUser);
      }
      setIsEditModalVisible(false);
      editForm.resetFields();
      setEditingUser(null);
      
      // ⚡ Invalidate cache and refresh
      apiCache.invalidate('/api/users');
      await fetchUsers(true, true);
    } catch (error) {
      console.error('❌ Update user error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorTitle = 'ไม่สามารถแก้ไขผู้ใช้ได้';
      let errorMessage = 'เกิดข้อผิดพลาดในการแก้ไขผู้ใช้';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        // Handle FastAPI validation errors (array of objects)
        if (Array.isArray(detail)) {
          errorMessage = detail.map(err => {
            const field = err.loc?.join(' > ') || 'Unknown field';
            return `• ${field}: ${err.msg}`;
          }).join('\n');
        }
        // Handle string errors
        else if (typeof detail === 'string') {
          errorMessage = detail;
        }
        // Handle object errors
        else if (typeof detail === 'object') {
          errorMessage = JSON.stringify(detail, null, 2);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      notifyError(errorTitle, errorMessage);
    }
  };

  // ==================== FILTERED DATA ====================
  
  const scoreUserRecord = useCallback((user) => {
    if (!user) return 0;
    let score = 0;
    if (user.mail) score += 4;
    if (user.title) score += 2;
    if (user.department) score += 2;
    if (user.company) score += 1.5;
    if (user.physicalDeliveryOfficeName) score += 1.2;
    if (user.employeeID) score += 1;
    if (user.telephoneNumber || user.mobile) score += 1;
    if (user.description) score += 0.5;
    if (user.isEnabled) score += 1;
    const username = (user.sAMAccountName || '').toString().toLowerCase();
    if (username) {
      if (username.endsWith('$')) {
        score -= 3;
      } else {
        score += 1;
      }
    }
    return score;
  }, []);

  const getUserDedupKey = useCallback((user) => {
    if (!user) return `unknown-${Math.random()}`;
    const displayKey = (user.cn || user.displayName || '').toString().trim().toLowerCase();
    if (displayKey) return displayKey;
    const usernameKey = (user.sAMAccountName || user.userPrincipalName || '').toString().trim().toLowerCase();
    if (usernameKey) return usernameKey;
    return (user.dn || user.id || `unknown-${Math.random()}`).toString().trim().toLowerCase();
  }, []);

  const deduplicateUsers = useCallback((userList) => {
    const map = new Map();
    userList.forEach(user => {
      const key = getUserDedupKey(user);
      const candidateScore = scoreUserRecord(user);
      const existing = map.get(key);
      if (!existing || candidateScore >= existing.score) {
        const mergedUser = { ...(existing?.user || {}), ...user };
        map.set(key, { user: mergedUser, score: Math.max(candidateScore, existing?.score || 0) });
      }
    });
    return Array.from(map.values()).map(entry => entry.user);
  }, [getUserDedupKey, scoreUserRecord]);

  const getResponsiveWidth = useCallback((desktopWidth, tabletWidth, mobileWidth = '100%') => {
    if (screens.xl || screens.lg) return desktopWidth;
    if (screens.md || screens.sm) return tabletWidth ?? desktopWidth;
    return mobileWidth;
  }, [screens]);

  const filteredUsers = useMemo(() => {
    const deduped = deduplicateUsers(users);
    return deduped.filter(user => {
      if (statusFilter === 'enabled' && !user.isEnabled) return false;
      if (statusFilter === 'disabled' && user.isEnabled) return false;

      if (ouFilter) {
        const userDn = (user.dn || '').toLowerCase();
        if (!userDn.includes(ouFilter.toLowerCase())) return false;
      }

      if (Array.isArray(dateRangeFilter) && dateRangeFilter.length === 2) {
        const createdDate = user.whenCreated ? dayjs(user.whenCreated) : null;
        if (!createdDate) return false;
        if (
          createdDate.isBefore(dateRangeFilter[0], 'day') ||
          createdDate.isAfter(dateRangeFilter[1], 'day')
        ) {
          return false;
        }
      }

      return true;
    });
  }, [users, statusFilter, ouFilter, deduplicateUsers, dateRangeFilter]);

  const isFilteredView = useMemo(
    () =>
      Boolean(
        searchText ||
        departmentFilter ||
        statusFilter !== 'all' ||
        ouFilter ||
        (Array.isArray(dateRangeFilter) && dateRangeFilter.length === 2)
      ),
    [searchText, departmentFilter, statusFilter, ouFilter, dateRangeFilter]
  );

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredUsers.length, pageSize, currentPage]);

  // ==================== STATISTICS ====================
  
  // ใช้ข้อมูลหลัง dedupe สำหรับสถิติการแสดงผล
  const stats = useMemo(() => ({
    total: filteredUsers.length,
    enabled: filteredUsers.filter(u => u.isEnabled).length,
    disabled: filteredUsers.filter(u => !u.isEnabled).length,
    departments: new Set(filteredUsers.filter(u => u.department).map(u => u.department)).size
  }), [filteredUsers]);

  const heroMetrics = useMemo(() => ([
    {
      key: 'total',
      label: 'ผู้ใช้ทั้งหมด',
      value: formatCount(directoryCounts.total),
      hint: 'ข้อมูลจาก AD',
      accent: '#2563eb'
    },
    {
      key: 'enabled',
      label: 'เปิดใช้งาน',
      value: formatCount(directoryCounts.enabled),
      hint: `${formatCount(stats.enabled)} แสดงอยู่`,
      accent: '#059669'
    },
    {
      key: 'disabled',
      label: 'ปิดใช้งาน',
      value: formatCount(directoryCounts.disabled),
      hint: `${formatCount(stats.disabled)} แสดงอยู่`,
      accent: '#ef4444'
    },
    {
      key: 'visible',
      label: 'ผลลัพธ์ปัจจุบัน',
      value: formatCount(stats.total),
      hint: isFilteredView ? 'หลังใช้ตัวกรอง' : 'มุมมองปัจจุบัน',
      accent: '#f97316'
    }
  ]), [
    directoryCounts.total,
    directoryCounts.enabled,
    directoryCounts.disabled,
    stats.enabled,
    stats.disabled,
    stats.total,
    formatCount,
    isFilteredView
  ]);

  const activeFilterTags = useMemo(() => {
    const tags = [];
    if (departmentFilter) {
      tags.push({ key: 'department', label: `แผนก: ${departmentFilter}` });
    }
    if (ouFilter) {
      tags.push({ key: 'ou', label: `OU: ${getOuLabel(ouFilter)}` });
    }
    if (statusFilter !== 'all') {
      tags.push({
        key: 'status',
        label: statusFilter === 'enabled' ? 'สถานะ: Active' : 'สถานะ: Disabled'
      });
    }
    if (Array.isArray(dateRangeFilter) && dateRangeFilter.length === 2) {
      tags.push({
        key: 'dateRange',
        label: `สร้าง: ${dateRangeFilter[0].format('DD MMM YYYY')} - ${dateRangeFilter[1].format('DD MMM YYYY')}`
      });
    }
    return tags;
  }, [departmentFilter, ouFilter, statusFilter, dateRangeFilter, getOuLabel]);
  
  // Debug: Log stats when users change
  useEffect(() => {
    if (filteredUsers.length > 0) {
      console.log('📊 Statistics (deduplicated):', stats);
      console.log(`📥 Raw users from AD: ${users.length}`);
      console.log(`✅ Visible users (deduped & filtered): ${filteredUsers.length}`);
    }
  }, [users.length, filteredUsers.length, stats]);

  // Calculate category statistics when userGroups change
  useEffect(() => {
    if (userGroups.length > 0 && Object.keys(categorizedGroups).length > 0) {
      const stats = getCategoryStatistics(userGroups, categorizedGroups);
      setCategoryStats(stats);
      console.log('📊 Category stats updated:', stats);
    }
  }, [userGroups, categorizedGroups]);

  // ==================== TABLE COLUMNS ====================
  
  const renderCopyableValue = useCallback((value, tooltips = ['คัดลอก', 'คัดลอกแล้ว']) => {
    if (!value) {
      return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
    }

    return (
      <Tooltip title={value} placement="topLeft">
        <Text
          ellipsis
          copyable={{ text: value, tooltips }}
          className="copyable-text table-cell-text"
          style={{ fontSize: 13 }}
        >
          {value}
        </Text>
      </Tooltip>
    );
  }, []);

  const renderUsernameCell = useCallback((value) => (
    value ? (
      <div className="username-pill">
        {renderCopyableValue(value, ['คัดลอกชื่อผู้ใช้', 'คัดลอกแล้ว'])}
      </div>
    ) : (
      <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
    )
  ), [renderCopyableValue]);

  const renderTextCell = useCallback((value) => (
    value ? (
      <Tooltip title={value} placement="topLeft">
        <Text className="table-cell-text" ellipsis style={{ fontSize: 13, color: '#1f2937' }}>
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
    <Space align="center" size={12} className="display-name-cell">
      <Avatar
        size={40}
        icon={!record.cn && <UserOutlined />}
        style={{
          background: record.isEnabled ? '#2563eb' : '#d1d5db',
          color: '#ffffff',
          fontWeight: 600
        }}
      >
        {(record.cn || record.displayName || 'U').charAt(0).toUpperCase()}
      </Avatar>
      <div className="display-name-content">
        <Tooltip title={record.cn || record.displayName || '-'} placement="topLeft">
          <div className="display-name-text table-cell-text">
            {record.cn || record.displayName || '-'}
          </div>
        </Tooltip>
        {record.title && (
          <Text type="secondary" style={{ fontSize: 12 }} className="table-cell-supporting">
            {record.title}
          </Text>
        )}
      </div>
    </Space>
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

  const renderActionsCell = useCallback((_, record) => (
    <div className="actions-cell">
      <Dropdown
        overlay={
          <Menu
            onClick={({ key }) => {
              if (key === 'view') {
                handleViewDetails(record);
                return;
              }
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
            }}
            items={[
              {
                key: 'view',
                icon: <EyeOutlined style={{ color: '#2563eb' }} />,
                label: 'ดูรายละเอียด'
              },
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
            ]}
          />
        }
        trigger={['click']}
        placement="bottomRight"
        overlayClassName="actions-dropdown-menu"
      >
        <Button
          className="action-dropdown-button"
          icon={<MoreOutlined />}
        >
          จัดการ
        </Button>
      </Dropdown>
    </div>
  ), [handleViewDetails, handleEditUser, handleToggleStatus, handleDeleteUser, handleResetPassword]);

  const allColumns = useMemo(() => [
    {
      title: 'Display Name',
      key: 'user',
      fixed: (screens.md || screens.lg || screens.xl) ? 'left' : undefined,
      width: 260,
      className: 'col-display-name',
      sorter: (a, b) => (a.cn || a.displayName || '').localeCompare(b.cn || b.displayName || ''),
      ellipsis: true,
      render: renderDisplayName
    },
    {
      title: 'Username',
      dataIndex: 'sAMAccountName',
      key: 'sAMAccountName',
      fixed: (screens.md || screens.lg || screens.xl) ? 'left' : undefined,
      width: 200,
      className: 'col-username',
      sorter: (a, b) => (a.sAMAccountName || '').localeCompare(b.sAMAccountName || ''),
      ellipsis: true,
      render: renderUsernameCell
    },
    {
      title: 'Email',
      dataIndex: 'mail',
      key: 'mail',
      width: 260,
      className: 'col-email',
      sorter: (a, b) => (a.mail || '').localeCompare(b.mail || ''),
      ellipsis: true,
      render: renderEmailCell
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
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 200,
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
      width: 200,
      className: 'col-location',
      responsive: ['lg'],
      ellipsis: true,
      render: renderTextCell
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 220,
      className: 'col-description',
      responsive: ['lg'],
      ellipsis: true,
      render: renderDescriptionCell
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
      title: 'Status',
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
      title: 'Actions',
      key: 'actions',
      fixed: (screens.md || screens.lg || screens.xl) ? 'right' : undefined,
      width: 140,
      className: 'col-actions',
      render: renderActionsCell
    }
  ], [renderDisplayName, renderUsernameCell, renderEmailCell, renderTextCell, renderDepartmentTag, renderDescriptionCell, renderEmployeeIdCell, renderStatusCell, renderActionsCell, screens.md, screens.lg, screens.xl]);

  // ⚡ Filter columns based on visibility settings
  const columns = allColumns.filter(col => {
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
  });

  const rowSelection = useMemo(() => ({
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    columnWidth: 48,
    fixed: (screens.md || screens.lg || screens.xl) ? 'left' : undefined,
    preserveSelectedRowKeys: true
  }), [selectedRowKeys, screens.md, screens.lg, screens.xl]);

  // ==================== RENDER ====================
  
  return (
    <div className="umx-root">
      <section className="umx-hero">
        <div className="umx-hero-content">
          <div>
            <Tag color="blue" className="umx-hero-badge">
              DIRECTORY CONTROL CENTER
            </Tag>
            <div className="umx-hero-title">User Management Workspace</div>
            <Text className="umx-hero-subtitle">
              ตรวจสอบผู้ใช้ Active Directory, จัดการสิทธิ์ และสร้างบัญชีใหม่ได้ในหน้าจอเดียว
            </Text>
          </div>
          <Space size="middle" wrap className="umx-hero-actions">
            <Button icon={<ReloadOutlined />} onClick={() => fetchUsers(true)} loading={loading}>
              รีเฟรชข้อมูล
            </Button>
            <Button icon={<FilterOutlined />} onClick={openAdvancedFilterDrawer}>
              ตัวกรองเพิ่มเติม
            </Button>
            <Button icon={<TagOutlined />} onClick={() => setIsColumnSettingsVisible(true)}>
              คอลัมน์
            </Button>
            <Button type="primary" icon={<UserAddOutlined />} onClick={handleCreateUser}>
              สร้างผู้ใช้ใหม่
            </Button>
          </Space>
        </div>
        <div className="umx-hero-metrics">
          {heroMetrics.map((metric) => (
            <div key={metric.key} className="umx-metric-card">
              <div className="umx-metric-label">{metric.label}</div>
              <div className="umx-metric-value" style={{ color: metric.accent }}>
                {metric.value}
              </div>
              <div className="umx-metric-hint">{metric.hint}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="umx-filter-panel">
        <div className="umx-filter-row">
          <Input
            placeholder="ค้นหาด้วยชื่อ อีเมล หรือ Username..."
            prefix={<SearchOutlined className="umx-filter-icon" />}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            size="large"
            className="umx-search-input"
          />
          <Space size="middle" wrap className="umx-filter-controls">
            <Select
              placeholder="แผนก"
              allowClear
              value={departmentFilter || undefined}
              onChange={handleDepartmentFilterChange}
              className="umx-filter-select"
            >
              {departments.map((dept) => (
                <Option key={dept} value={dept}>
                  {dept}
                </Option>
              ))}
            </Select>
            <Select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="umx-filter-select"
            >
              <Option value="all">สถานะทั้งหมด</Option>
              <Option value="enabled">Active</Option>
              <Option value="disabled">Disabled</Option>
            </Select>
            <Select
              showSearch
              allowClear
              placeholder="เลือก OU"
              value={ouFilter || undefined}
              onChange={handleOuFilterChange}
              className="umx-filter-select"
              optionFilterProp="children"
              filterOption={(input, option) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableOUs.map((ou) => (
                <Option key={ou.dn} value={ou.dn}>
                  {ou.fullPath}
                </Option>
              ))}
            </Select>
          </Space>
        </div>
        {activeFilterTags.length > 0 && (
          <div className="umx-active-tags">
            <Space size={[8, 8]} wrap>
              {activeFilterTags.map((tag) => (
                <Tag
                  key={tag.key}
                  closable
                  className="umx-filter-tag"
                  onClose={(e) => {
                    e.preventDefault();
                    handleFilterTagClose(tag.key);
                  }}
                >
                  {tag.label}
                </Tag>
              ))}
              <Button type="link" size="small" onClick={handleClearAllFilters}>
                ล้างตัวกรองทั้งหมด
              </Button>
            </Space>
          </div>
        )}
      </section>
      <Card className="umx-table-card" bodyStyle={{ padding: 0 }}>
        <div className="umx-table-head">
          <div>
            <div className="umx-table-title">รายชื่อผู้ใช้</div>
            <Text type="secondary">
              แสดง {paginatedUsers.length} จาก {formatCount(filteredUsers.length)} รายการในมุมมองนี้
            </Text>
          </div>
          <Space size="middle">
            <Tag color="blue">{formatCount(filteredUsers.length)} Visible</Tag>
            <Tag color="green">{formatCount(directoryCounts.total)} AD Total</Tag>
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
          scroll={{ x: 'max-content', y: tableScrollY }}
          tableLayout="fixed"
          rowClassName={(record, index) => {
            const baseClass = index % 2 === 0 ? 'table-row-light' : 'table-row-dark';
            return selectedRowKeys.includes(record.dn) ? `${baseClass} row-selected` : baseClass;
          }}
          pagination={false}
          className="umx-table"
          onRow={(record) => ({
            onDoubleClick: () => handleViewDetails(record)
          })}
        />
        <div className="umx-table-footer">
          <Pagination
            size="small"
            current={currentPage}
            pageSize={pageSize}
            total={isFilteredView ? filteredUsers.length : directoryCounts.total || filteredUsers.length}
            onChange={(page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            }}
            showSizeChanger
            showQuickJumper
            pageSizeOptions={['20', '30', '50', '100', '200']}
            showTotal={(total, range) => `${range[0]}-${range[1]} จาก ${total}`}
          />
        </div>
      </Card>

      <Drawer
        title="ตัวกรองขั้นสูง"
        placement="right"
        width={360}
        open={isFilterDrawerVisible}
        onClose={() => setIsFilterDrawerVisible(false)}
        destroyOnClose
        className="umx-filter-drawer"
      >
        <Form layout="vertical" form={filterForm}>
          <Form.Item label="แผนก" name="department">
            <Select allowClear placeholder="เลือกแผนก">
              {departments.map((dept) => (
                <Option key={dept} value={dept}>
                  {dept}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="สถานะบัญชี" name="status">
            <Select>
              <Option value="all">ทั้งหมด</Option>
              <Option value="enabled">Active</Option>
              <Option value="disabled">Disabled</Option>
            </Select>
          </Form.Item>
          <Form.Item label="OU" name="ou">
            <Select
              allowClear
              showSearch
              placeholder="เลือก OU"
              optionFilterProp="children"
              filterOption={(input, option) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableOUs.map((ou) => (
                <Option key={ou.dn} value={ou.dn}>
                  {ou.fullPath}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="วันที่สร้าง" name="dateRange">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
        <div className="umx-drawer-actions">
          <Button onClick={handleResetAdvancedFilters}>รีเซ็ต</Button>
          <Button type="primary" onClick={handleApplyAdvancedFilters}>
            ใช้ตัวกรอง
          </Button>
        </div>
      </Drawer>

      {/* Create User Modal - Step Wizard */}
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
                  Create New User
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Step {currentStep + 1} of 3
                </Text>
              </div>
            </Space>
          </div>
        }
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          setCurrentStep(0);
        }}
        width={getResponsiveWidth(720, 560, '95%')}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
            <Button
              onClick={handleBackStep}
              disabled={currentStep === 0}
              style={{ fontWeight: 600, borderRadius: 8 }}
            >
              ← Back
            </Button>
            <div>
              {currentStep < 2 ? (
                <Button
                  type="primary"
                  onClick={handleNextStep}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: 'none',
                    fontWeight: 600,
                    borderRadius: 8
                  }}
                >
                  Next Step →
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={handleCreateModalOk}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    fontWeight: 600,
                    borderRadius: 8
                  }}
                >
                  <CheckCircleOutlined /> Create User
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div style={{ padding: '20px 0' }}>
          {/* Progress Steps */}
          <Steps current={currentStep} style={{ marginBottom: 32 }}>
            <Step 
              title="Account" 
              icon={<UserOutlined />}
              description="Essential info"
            />
            <Step 
              title="Groups" 
              icon={<TeamOutlined />}
              description="Permissions"
            />
            <Step 
              title="Review" 
              icon={<CheckCircleOutlined />}
              description="Confirm"
            />
          </Steps>

          {/* Single Form wrapping all steps */}
          <Form
            form={createForm}
            layout="vertical"
            name="createUserForm"
          >
            {/* Step 1: Essential Information */}
            <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
              <div className="umx-step-wrapper">
                <div className="umx-step-columns">
                  <Card
                    className="umx-form-card"
                    title="Account Basics"
                    extra={<Tag color="blue">Required</Tag>}
                    bodyStyle={{ padding: 0 }}
                  >
                    <div className="umx-form-card-body">
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="cn"
                            label={
                              <Space>
                                <Text strong style={{ fontSize: 13 }}>Common Name (CN)</Text>
                                <Tooltip title="Full name as it will appear in Active Directory">
                                  <QuestionCircleOutlined style={{ color: '#6b7280', fontSize: 12 }} />
                                </Tooltip>
                              </Space>
                            }
                            rules={[{ required: true, message: 'Please enter CN' }]}
                          >
                            <Input placeholder="e.g., Wutthiphong Chaiyaphoom" size="large" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="sAMAccountName"
                            label={
                              <Space>
                                <Text strong style={{ fontSize: 13 }}>Username (Login)</Text>
                                <Tooltip title="This will be used to login. Cannot be changed later.">
                                  <QuestionCircleOutlined style={{ color: '#6b7280', fontSize: 12 }} />
                                </Tooltip>
                              </Space>
                            }
                            rules={[{ required: true, message: 'Please enter username' }]}
                          >
                            <Input placeholder="e.g., wutthiphong.c" size="large" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="password"
                            label={<Text strong style={{ fontSize: 13 }}>Password</Text>}
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
                              size="large"
                              autoComplete="new-password"
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="confirmPassword"
                            label={<Text strong style={{ fontSize: 13 }}>Confirm Password</Text>}
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
                              size="large"
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
                                <Text strong style={{ fontSize: 13 }}>Email</Text>
                                <Tooltip title="Corporate email address">
                                  <QuestionCircleOutlined style={{ color: '#6b7280', fontSize: 12 }} />
                                </Tooltip>
                              </Space>
                            }
                            rules={[
                              { required: true, message: 'Please enter email' },
                              { type: 'email', message: 'Please enter valid email' }
                            ]}
                          >
                            <Input placeholder="user@tbkk.co.th" size="large" suffix={<MailOutlined />} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="displayName"
                            label={<Text strong style={{ fontSize: 13 }}>Display Name</Text>}
                          >
                            <Input placeholder="Auto-filled from CN" size="large" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>
                  </Card>

                  <Card
                    className="umx-form-card"
                    title="Profile & Contact"
                    bodyStyle={{ padding: 0 }}
                  >
                    <div className="umx-form-card-body">
                      <Collapse
                        defaultActiveKey={['personal', 'contact']}
                        ghost
                        className="umx-form-collapse"
                      >
                        <Collapse.Panel header="Personal Details" key="personal">
                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Form.Item
                                name="givenName"
                                label={<Text strong style={{ fontSize: 13 }}>First Name</Text>}
                              >
                                <Input placeholder="Enter first name" size="large" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item
                                name="sn"
                                label={<Text strong style={{ fontSize: 13 }}>Last Name</Text>}
                              >
                                <Input placeholder="Enter last name" size="large" />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Form.Item
                                name="title"
                                label={<Text strong style={{ fontSize: 13 }}>Job Title</Text>}
                              >
                                <Input placeholder="Enter job title" size="large" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item
                                name="department"
                                label={<Text strong style={{ fontSize: 13 }}>Department</Text>}
                              >
                                <Input placeholder="Enter department name" size="large" />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Form.Item
                                name="company"
                                label={<Text strong style={{ fontSize: 13 }}>Company</Text>}
                              >
                                <Input placeholder="Enter company name" size="large" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item
                                name="employeeID"
                                label={<Text strong style={{ fontSize: 13 }}>Employee ID</Text>}
                              >
                                <Input placeholder="Enter employee ID" size="large" />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Collapse.Panel>

                        <Collapse.Panel header="Contact & Office" key="contact">
                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Form.Item
                                name="telephoneNumber"
                                label={<Text strong style={{ fontSize: 13 }}>Phone</Text>}
                              >
                                <Input placeholder="Enter phone number" size="large" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item
                                name="mobile"
                                label={<Text strong style={{ fontSize: 13 }}>Mobile</Text>}
                              >
                                <Input placeholder="Enter mobile number" size="large" />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Form.Item
                                name="physicalDeliveryOfficeName"
                                label={<Text strong style={{ fontSize: 13 }}>Office Location</Text>}
                              >
                                <Input placeholder="Enter office location" size="large" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item
                                name="description"
                                label={<Text strong style={{ fontSize: 13 }}>Description</Text>}
                              >
                                <Input.TextArea rows={3} placeholder="Enter description or notes" />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Collapse.Panel>
                      </Collapse>
                    </div>
                  </Card>
                </div>

                <div className="umx-step-lower">
                  <Card
                    className="umx-form-card"
                    title="Organizational Placement"
                    bodyStyle={{ padding: 0 }}
                  >
                    <div className="umx-form-card-body">
                      <Form.Item
                        label={
                          <Space>
                            <Text strong style={{ fontSize: 13 }}>Organizational Unit (OU)</Text>
                            <Tooltip title="Select where this user will be created. This will auto-select appropriate groups.">
                              <QuestionCircleOutlined style={{ color: '#6b7280', fontSize: 12 }} />
                            </Tooltip>
                          </Space>
                        }
                      >
                        <Select
                          placeholder="Select OU (optional - defaults to CN=Users)"
                          size="large"
                          allowClear
                          showSearch
                          value={selectedOU}
                          onChange={handleOUChange}
                          suffixIcon={<BankOutlined />}
                          optionFilterProp="children"
                          filterOption={(input, option) =>
                            option.children.toLowerCase().includes(input.toLowerCase())
                          }
                        >
                          {availableOUs.map(ou => (
                            <Option key={ou.dn} value={ou.dn}>
                              {ou.fullPath}
                            </Option>
                          ))}
                        </Select>
                        {selectedOU && (
                          <div className="umx-ou-preview">
                            <Space direction="vertical" size={4}>
                              <Text style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                                ✓ OU Selected: {availableOUs.find(ou => ou.dn === selectedOU)?.name}
                              </Text>
                              <Text style={{ fontSize: 11, color: '#6b7280' }}>
                                💡 Groups will be auto-selected in the next step
                              </Text>
                            </Space>
                          </div>
                        )}
                      </Form.Item>
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            {/* Step 2: Groups & Permissions */}
            <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
              <Alert
                message="Step 2: Group Membership & Permissions"
                description="Review and customize the groups that will be assigned to this user"
                type="success"
                showIcon
                style={{ marginBottom: 24 }}
              />

              {/* Account Options */}
              <Card
                size="small"
                title={<Text strong>Account Options</Text>}
                style={{ marginBottom: 16 }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Text strong>User must change password at next logon</Text>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>Forces password change on first login</Text></div>
                    </div>
                    <Switch
                      checked={accountOptions.mustChangePassword}
                      onChange={(checked) => setAccountOptions({...accountOptions, mustChangePassword: checked})}
                    />
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Text strong>User cannot change password</Text>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>Locks the password change option for this account</Text></div>
                    </div>
                    <Switch
                      checked={accountOptions.userCannotChangePassword}
                      onChange={(checked) => setAccountOptions({...accountOptions, userCannotChangePassword: checked})}
                    />
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Text strong>Password never expires</Text>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>User won't need to change password</Text></div>
                    </div>
                    <Switch
                      checked={accountOptions.passwordNeverExpires}
                      onChange={(checked) => setAccountOptions({...accountOptions, passwordNeverExpires: checked})}
                    />
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Text strong>Store password using reversible encryption</Text>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>Required only for legacy protocols that need clear-text password access</Text></div>
                    </div>
                    <Switch
                      checked={accountOptions.storePasswordUsingReversibleEncryption}
                      onChange={(checked) => setAccountOptions({...accountOptions, storePasswordUsingReversibleEncryption: checked})}
                    />
                  </div>
                </Space>
              </Card>

              <Divider orientation="left">
                <Text strong>Group Membership ({selectedGroups.length} selected)</Text>
              </Divider>

              {Object.keys(categorizedGroups).map(category => {
                let groups = categorizedGroups[category] || [];
                
                // Filter "Others" category to show only commonly used groups
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
                  <div key={category} style={{ marginBottom: 24 }}>
                    <Divider orientation="left">
                      <Text strong>{category}</Text>
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                        ({groups.length} groups)
                      </Text>
                    </Divider>
                    <div style={{
                      background: '#f9fafb',
                      padding: '12px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb'
                    }}>
                      <Space wrap size="small">
                        {groups.map(group => {
                          // Find if this group is suggested with percentage
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
                              style={{
                                padding: '8px 16px',
                                fontSize: 13,
                                fontWeight: 500,
                                borderRadius: 6,
                                border: selectedGroups.includes(group.dn) 
                                  ? '2px solid #10b981' 
                                  : isSuggested 
                                  ? '2px dashed #3b82f6'
                                  : '1px solid #d1d5db',
                                background: selectedGroups.includes(group.dn) 
                                  ? '#ecfdf5' 
                                  : isSuggested
                                  ? '#eff6ff'
                                  : '#fff',
                                color: selectedGroups.includes(group.dn) 
                                  ? '#059669' 
                                  : isSuggested
                                  ? '#1e40af'
                                  : '#374151'
                              }}
                            >
                              {isSuggested && '⭐ '}
                              {group.cn}
                              {isSuggested && percentage > 0 && (
                                <span style={{ 
                                  marginLeft: 6, 
                                  fontSize: 11, 
                                  opacity: 0.8,
                                  fontWeight: 700
                                }}>
                                  {percentage}%
                                </span>
                              )}
                            </Tag.CheckableTag>
                          );
                        })}
                      </Space>
                    </div>
                  </div>
                );
              })}

              {selectedGroups.length > 0 && (
                <div style={{
                  background: '#ecfdf5',
                  padding: '16px',
                  borderRadius: 8,
                  border: '1px solid #10b981',
                  marginTop: 16
                }}>
                  <Text strong style={{ color: '#059669' }}>
                    ✓ {selectedGroups.length} group(s) selected
                  </Text>
                </div>
              )}
            </div>

            {/* Step 3: Review & Confirm */}
            <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
              <Alert
                message="Step 3: Review & Confirm"
                description="Review all information before creating the user"
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
              />

              {/* Summary Card */}
              <Card
                title={<Text strong style={{ fontSize: 15 }}>📋 User Information Summary</Text>}
                style={{
                  background: '#fafbfc',
                  border: '2px solid #e5e7eb',
                  borderRadius: 12
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <Descriptions column={1} bordered size="middle">
                  <Descriptions.Item 
                    label={<Text strong>Common Name</Text>}
                    labelStyle={{ width: '35%', background: '#f8fafc' }}
                  >
                    <Text strong style={{ fontSize: 14 }}>
                      {createForm.getFieldValue('cn') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Username (Login)</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <Text code style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('sAMAccountName') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Email</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      <MailOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
                      {createForm.getFieldValue('mail') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Display Name</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('displayName') || createForm.getFieldValue('cn') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>First Name</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('givenName') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Last Name</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('sn') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Job Title</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('title') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Department</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('department') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Company</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('company') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Employee ID</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('employeeID') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Phone</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('telephoneNumber') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Mobile</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('mobile') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Office Location</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('physicalDeliveryOfficeName') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Description</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('description') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Organizational Unit</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    {selectedOU ? (
                      <div>
                        <Text style={{ fontSize: 13 }}>
                          <BankOutlined style={{ marginRight: 6, color: '#10b981' }} />
                          {availableOUs.find(ou => ou.dn === selectedOU)?.fullPath}
                        </Text>
                      </div>
                    ) : (
                      <Text type="secondary">Default (CN=Users)</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Groups</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <div>
                      <Text strong style={{ color: '#10b981', marginBottom: 8, display: 'block' }}>
                        {selectedGroups.length} group(s) will be assigned
                      </Text>
                      <Space wrap size="small">
                        {selectedGroups.slice(0, 10).map(groupDn => {
                          let groupName = 'Unknown';
                          let percentage = 0;
                          
                          // Find group name and percentage
                          Object.values(categorizedGroups).forEach(categoryGroups => {
                            const group = categoryGroups.find(g => g.dn === groupDn);
                            if (group) groupName = group.cn;
                          });
                          
                          const suggestedGroup = suggestedGroupsData?.suggestedGroups?.find(
                            sg => sg.dn === groupDn
                          );
                          if (suggestedGroup) percentage = suggestedGroup.percentage;
                          
                          return (
                            <Tag 
                              key={groupDn}
                              color={percentage > 0 ? 'blue' : 'default'}
                              style={{ marginBottom: 4 }}
                            >
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
                  <Descriptions.Item 
                    label={<Text strong>Account Options</Text>}
                    labelStyle={{ background: '#f8fafc' }}
                  >
                    <Space direction="vertical" size={4}>
                      {accountOptions.mustChangePassword && (
                        <Text style={{ fontSize: 12 }}>
                          <CheckCircleOutlined style={{ color: '#10b981', marginRight: 6 }} />
                          Must change password at next logon
                        </Text>
                      )}
                      {accountOptions.userCannotChangePassword && (
                        <Text style={{ fontSize: 12 }}>
                          <LockOutlined style={{ color: '#f59e0b', marginRight: 6 }} />
                          User cannot change password
                        </Text>
                      )}
                      {accountOptions.passwordNeverExpires && (
                        <Text style={{ fontSize: 12 }}>
                          <CheckCircleOutlined style={{ color: '#10b981', marginRight: 6 }} />
                          Password never expires
                        </Text>
                      )}
                      {accountOptions.storePasswordUsingReversibleEncryption && (
                        <Text style={{ fontSize: 12 }}>
                          <InfoCircleOutlined style={{ color: '#3b82f6', marginRight: 6 }} />
                          Store password using reversible encryption
                        </Text>
                      )}
                      {!accountOptions.mustChangePassword
                        && !accountOptions.userCannotChangePassword
                        && !accountOptions.passwordNeverExpires
                        && !accountOptions.storePasswordUsingReversibleEncryption && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Standard settings
                        </Text>
                      )}
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Action Buttons to Edit */}
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Space size="middle">
                  <Button onClick={() => setCurrentStep(0)} icon={<EditOutlined />}>
                    Edit Account Info
                  </Button>
                  <Button onClick={() => setCurrentStep(1)} icon={<TeamOutlined />}>
                    Edit Groups
                  </Button>
                </Space>
              </div>
            </div>
          </Form>
        </div>
      </Modal>

      {/* Edit User Modal */}
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
        open={isEditModalVisible}
        onOk={handleEditModalOk}
        onCancel={() => {
          setIsEditModalVisible(false);
          setEditingUser(null);
        }}
        width={getResponsiveWidth(800, 600, '95%')}
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
              name="physicalDeliveryOfficeName"
              label={<Text strong style={{ fontSize: 13 }}>Office Location</Text>}
            >
              <Input placeholder="Enter office location" size="large" />
            </Form.Item>

            <Form.Item
              name="description"
              label={<Text strong style={{ fontSize: 13 }}>Description</Text>}
            >
              <Input.TextArea
                placeholder="Enter description (optional)"
                rows={3}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        title={
          <div style={{
            padding: '12px 0',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <Space size="middle" align="center">
              <div style={{
                background: '#fef3c7',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <KeyOutlined style={{ fontSize: 22, color: '#f59e0b' }} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                  Reset Password
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {selectedUser?.cn || selectedUser?.displayName}
                </Text>
              </div>
            </Space>
          </div>
        }
        open={isPasswordModalVisible}
        onOk={handlePasswordModalOk}
        onCancel={() => setIsPasswordModalVisible(false)}
        width={getResponsiveWidth(500, 420, '90%')}
        okText="Reset Password"
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
            form={passwordForm}
            layout="vertical"
            name="passwordForm"
          >
            <Form.Item
              name="password"
              label={<Text strong style={{ fontSize: 13 }}>New Password</Text>}
              rules={[
                { required: true, message: 'Please enter new password' },
                { min: 8, message: 'Password must be at least 8 characters' }
              ]}
            >
              <Input.Password
                placeholder="Enter new password"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={<Text strong style={{ fontSize: 13 }}>Confirm Password</Text>}
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password
                placeholder="Confirm new password"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* User Details Drawer */}
      <Drawer
        title={
          <div style={{
            padding: '12px 0',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <Space size="middle" align="center">
              <div style={{
                background: selectedUser?.isEnabled ? '#f0fdf4' : '#fef2f2',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UserOutlined
                  style={{
                    fontSize: 22,
                    color: selectedUser?.isEnabled ? '#10b981' : '#ef4444'
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                  {selectedUser?.cn || selectedUser?.displayName || 'User Details'}
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  User Account Information
                </Text>
              </div>
            </Space>
          </div>
        }
        placement="right"
        onClose={() => setIsDetailsDrawerVisible(false)}
        open={isDetailsDrawerVisible}
        width={getResponsiveWidth(700, 560, '100%')}
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
        {selectedUser && (
          <Tabs defaultActiveKey="1">
            <TabPane
              tab={
                <span>
                  <IdcardOutlined />
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
                  <Descriptions.Item label="Display Name">
                    <Text strong style={{ fontSize: 14 }}>
                      {selectedUser.displayName || selectedUser.cn || 'N/A'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Username">
                    <Text copyable code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 4 }}>
                      {selectedUser.sAMAccountName}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">
                    {selectedUser.mail ? (
                      <Text copyable style={{ fontSize: 13 }}>{selectedUser.mail}</Text>
                    ) : (
                      <Text type="secondary">-</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag
                      icon={selectedUser.isEnabled ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                      color={selectedUser.isEnabled ? 'success' : 'error'}
                      style={{ fontWeight: 600, padding: '6px 14px', borderRadius: 20 }}
                    >
                      {selectedUser.isEnabled ? 'Active' : 'Disabled'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="First Name">
                    {selectedUser.givenName ? (
                      <Text style={{ fontSize: 13 }}>{selectedUser.givenName}</Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Last Name">
                    {selectedUser.sn ? (
                      <Text style={{ fontSize: 13 }}>{selectedUser.sn}</Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Job Title">
                    {selectedUser.title ? (
                      <Text style={{ fontSize: 13 }}>{selectedUser.title}</Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Department">
                    {selectedUser.department ? (
                      <Tag
                        style={{
                          background: '#eff6ff',
                          color: '#1e40af',
                          border: '1px solid #bfdbfe',
                          padding: '4px 12px'
                        }}
                      >
                        {selectedUser.department}
                      </Tag>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Company">
                    {selectedUser.company ? (
                      <Text style={{ fontSize: 13 }}>{selectedUser.company}</Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Employee ID">
                    {selectedUser.employeeID ? (
                      <Text code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 4 }}>
                        {selectedUser.employeeID}
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Phone">
                    {selectedUser.telephoneNumber ? (
                      <Text copyable style={{ fontSize: 13 }}>
                        <PhoneOutlined style={{ marginRight: 6, color: '#10b981' }} />
                        {selectedUser.telephoneNumber}
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Mobile">
                    {selectedUser.mobile ? (
                      <Text copyable style={{ fontSize: 13 }}>
                        <PhoneOutlined style={{ marginRight: 6, color: '#10b981' }} />
                        {selectedUser.mobile}
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Office Location">
                    {selectedUser.physicalDeliveryOfficeName ? (
                      <Text style={{ fontSize: 13 }}>
                        <EnvironmentOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
                        {selectedUser.physicalDeliveryOfficeName}
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Description">
                    {selectedUser.description ? (
                      <Text style={{ fontSize: 13 }}>{selectedUser.description}</Text>
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
                      {selectedUser.dn}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Account Created">
                    {selectedUser.whenCreated ? (
                      <Text style={{ fontSize: 13 }}>
                        <ClockCircleOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
                        {new Date(selectedUser.whenCreated).toLocaleString('th-TH', {
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
                    {selectedUser.whenChanged ? (
                      <Text style={{ fontSize: 13 }}>
                        <ClockCircleOutlined style={{ marginRight: 6, color: '#f59e0b' }} />
                        {new Date(selectedUser.whenChanged).toLocaleString('th-TH', {
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
                    {selectedUser.pwdLastSet && selectedUser.pwdLastSet !== '0' ? (
                      <Text style={{ fontSize: 13 }}>
                        <KeyOutlined style={{ marginRight: 6, color: '#10b981' }} />
                        {new Date(selectedUser.pwdLastSet).toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Last Login">
                    {selectedUser.lastLogon && selectedUser.lastLogon !== '0' ? (
                      <Text style={{ fontSize: 13 }}>
                        <HistoryOutlined style={{ marginRight: 6, color: '#8b5cf6' }} />
                        {new Date(selectedUser.lastLogon).toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่เคยเข้าสู่ระบบ</Text>
                    )}
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
                headStyle={{
                  background: '#f8fafc',
                  borderBottom: '1px solid #e5e7eb'
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
                  <Descriptions.Item label="Street Address">
                    {selectedUser.streetAddress ? (
                      <Text style={{ fontSize: 13 }}>{selectedUser.streetAddress}</Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="City">
                    {selectedUser.l ? (
                      <Text style={{ fontSize: 13 }}>{selectedUser.l}</Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="State/Province">
                    {selectedUser.st ? (
                      <Text style={{ fontSize: 13 }}>{selectedUser.st}</Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Postal Code">
                    {selectedUser.postalCode ? (
                      <Text code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 4 }}>
                        {selectedUser.postalCode}
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Country">
                    {selectedUser.co ? (
                      <Text style={{ fontSize: 13 }}>{selectedUser.co}</Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>ไม่มีข้อมูล</Text>
                    )}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

            </TabPane>


            <TabPane
              tab={
                <span>
                  <TeamOutlined />
                  Groups ({userGroups.length})
                </span>
              }
              key="2"
            >
              {/* Statistics Cards */}
              {Object.keys(categoryStats).length > 0 && (
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                  {Object.entries(categoryStats)
                    .filter(([_, stats]) => stats.total > 0) // Only show categories with groups
                    .slice(0, 4) // Show top 4 categories
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
                          // Find group name
                          let groupName = 'Unknown';
                          Object.values(categorizedGroups).forEach(categoryGroups => {
                            const group = categoryGroups.find(g => g.dn === groupDn);
                            if (group) groupName = group.cn;
                          });
                          handleQuickAddGroup(groupDn, groupName);
                        } else if (groupDn === 'manage') {
                          handleManageGroups(selectedUser);
                        }
                      }}
                      style={{ width: 140 }}
                      dropdownStyle={{ minWidth: 200 }}
                    >
                      <Option value="quickAdd" disabled>
                        <TeamOutlined /> Quick Add
                      </Option>
                      <Option value="manage" style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <TeamOutlined /> Manage All...
                      </Option>
                      {GROUP_DEFAULTS_CONFIG.quickAdd.popularGroups.map(groupName => {
                        // Find group DN
                        let groupDn = null;
                        Object.values(categorizedGroups).forEach(categoryGroups => {
                          const group = categoryGroups.find(g => g.cn === groupName);
                          if (group) groupDn = group.dn;
                        });
                        
                        if (!groupDn) return null;
                        
                        // Check if already a member
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
                      onClick={() => handleManageGroups(selectedUser)}
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
                    {GROUP_DEFAULTS_CONFIG.sort.priorityOrder.map(category => {
                      // Filter groups by category and search text
                      const categoryGroupsInUser = userGroups.filter(group => {
                        // Check category
                        let belongsToCategory = false;
                        if (categorizedGroups[category]) {
                          belongsToCategory = categorizedGroups[category].some(cg => cg.dn === group.dn);
                        }
                        
                        if (!belongsToCategory) return false;
                        
                        // Check search text
                        if (groupSearchText) {
                          return group.cn.toLowerCase().includes(groupSearchText.toLowerCase());
                        }
                        
                        // Check category filter
                        if (groupCategoryFilter !== 'all' && category !== groupCategoryFilter) {
                          return false;
                        }
                        
                        return true;
                      });
                      
                      // Hide empty categories if configured
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
                          headStyle={{
                            background: '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
                            cursor: 'pointer',
                            padding: '12px 16px'
                          }}
                          bodyStyle={{ padding: categoryGroupsInUser.length > 0 ? '12px' : '0' }}
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
                                        title={`Remove from "${group.cn}"?`}
                                        description="Are you sure?"
                                        onConfirm={() => handleRemoveFromGroup(group.dn, group.cn)}
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
                    })}
                  </>
                ) : (
                  <Empty
                    description={<Text style={{ color: '#6b7280' }}>No group memberships</Text>}
                    style={{ padding: '40px 0' }}
                  />
                )}
              </div>
            </TabPane>

            <TabPane
              tab={
                <span>
                  <SafetyCertificateOutlined />
                  Permissions
                </span>
              }
              key="3"
            >
              <Card
                size="small"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8
                }}
                bodyStyle={{ padding: '12px' }}
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
            </TabPane>

            <TabPane
              tab={
                <span>
                  <HistoryOutlined />
                  Login History
                </span>
              }
              key="4"
            >
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
                  bodyStyle={{ padding: '16px' }}
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
                          labelStyle={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}
                          contentStyle={{ fontSize: 12, color: '#1f2937' }}
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
                bodyStyle={{ padding: '12px' }}
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
            </TabPane>
          </Tabs>
        )}
      </Drawer>

      {/* Manage Groups Modal */}
      <Modal
        title={
          <div style={{
            padding: '12px 0',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <Space size="middle" align="center">
              <div style={{
                background: '#fef3c7',
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
                  Manage Group Membership
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {managingUser?.cn || 'User'}
                </Text>
              </div>
            </Space>
          </div>
        }
        open={isManageGroupsModalVisible}
        onOk={handleSaveGroupChanges}
        onCancel={() => setIsManageGroupsModalVisible(false)}
        width={getResponsiveWidth(900, 700, '100%')}
        okText="Save Changes"
        cancelText="Cancel"
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #10b981, #059669)',
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
          {/* Suggested Groups Section - Dynamic from AD Analysis */}
          {(() => {
            if (!suggestedGroupsData || !suggestedGroupsData.suggestedGroups) return null;
            
            // Filter to show only groups not yet assigned
            const newSuggestions = suggestedGroupsData.suggestedGroups.filter(
              sg => !userOriginalGroups.includes(sg.dn)
            );
            
            if (newSuggestions.length > 0) {
              return (
                <div style={{
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  padding: '16px',
                  borderRadius: 8,
                  marginBottom: 16,
                  border: '2px solid #3b82f6'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <Text strong style={{ fontSize: 14, color: '#1e40af' }}>
                        💡 Suggested Groups
                      </Text>
                      <div>
                        <Text style={{ fontSize: 12, color: '#3b82f6' }}>
                          Based on <strong>{suggestedGroupsData.totalUsers} users</strong> in the same OU
                        </Text>
                      </div>
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        // Add all suggested groups
                        const suggestedDNs = newSuggestions.map(sg => sg.dn);
                        const uniqueGroups = [...new Set([...userSelectedGroups, ...suggestedDNs])];
                        setUserSelectedGroups(uniqueGroups);
                        message.success(`Added ${newSuggestions.length} suggested group(s)`);
                      }}
                      style={{
                        background: '#3b82f6',
                        border: 'none',
                        borderRadius: 6
                      }}
                    >
                      + Add All ({newSuggestions.length})
                    </Button>
                  </div>
                  <Space wrap size="small">
                    {newSuggestions.map(sg => {
                      const isSelected = userSelectedGroups.includes(sg.dn);
                      
                      return (
                        <Tag
                          key={sg.dn}
                          style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 500,
                            borderRadius: 6,
                            border: isSelected ? '2px solid #10b981' : '2px dashed #3b82f6',
                            background: isSelected ? '#ecfdf5' : '#ffffff',
                            color: isSelected ? '#059669' : '#1e40af',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            if (isSelected) {
                              setUserSelectedGroups(userSelectedGroups.filter(g => g !== sg.dn));
                            } else {
                              setUserSelectedGroups([...userSelectedGroups, sg.dn]);
                            }
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {sg.cn}
                          <span style={{ 
                            marginLeft: 6, 
                            fontSize: 10,
                            opacity: 0.8,
                            fontWeight: 700
                          }}>
                            {sg.percentage}%
                          </span>
                        </Tag>
                      );
                    })}
                  </Space>
                </div>
              );
            }
            return null;
          })()}

          {/* Selection Summary */}
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              Select groups to assign this user to. You can select multiple groups from different categories.
            </Text>
            <div style={{
              background: '#ecfdf5',
              padding: '12px',
              borderRadius: 6,
              marginTop: 8,
              border: '1px solid #10b981'
            }}>
              <Space split={<Divider type="vertical" />}>
                <Text strong style={{ color: '#059669' }}>
                  ✓ {userSelectedGroups.length} group(s) selected
                </Text>
                {(() => {
                  const added = userSelectedGroups.filter(dn => !userOriginalGroups.includes(dn)).length;
                  const removed = userOriginalGroups.filter(dn => !userSelectedGroups.includes(dn)).length;
                  
                  return (
                    <>
                      {added > 0 && (
                        <Text style={{ color: '#10b981', fontSize: 12 }}>
                          +{added} to add
                        </Text>
                      )}
                      {removed > 0 && (
                        <Text style={{ color: '#ef4444', fontSize: 12 }}>
                          -{removed} to remove
                        </Text>
                      )}
                    </>
                  );
                })()}
              </Space>
            </div>
          </div>

          {Object.keys(categorizedGroups).map(category => {
            const groups = categorizedGroups[category] || [];
            if (groups.length === 0) return null;

            return (
              <div key={category} style={{ marginBottom: 24 }}>
                <Divider orientation="left">
                  <Text strong>{category}</Text>
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    ({groups.length} groups)
                  </Text>
                </Divider>
                <div style={{
                  background: '#f9fafb',
                  padding: '12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  <Space wrap size="small">
                    {groups.map(group => {
                      // Find if this group has percentage data from analysis
                      const suggestedGroup = suggestedGroupsData?.suggestedGroups?.find(
                        sg => sg.dn === group.dn
                      );
                      const percentage = suggestedGroup?.percentage || 0;
                      const hasPercentage = percentage > 0;
                      
                      return (
                        <Tag.CheckableTag
                          key={group.dn}
                          checked={userSelectedGroups.includes(group.dn)}
                          onChange={(checked) => {
                            if (checked) {
                              setUserSelectedGroups([...userSelectedGroups, group.dn]);
                            } else {
                              setUserSelectedGroups(userSelectedGroups.filter(dn => dn !== group.dn));
                            }
                          }}
                          style={{
                            padding: '8px 16px',
                            fontSize: 13,
                            fontWeight: 500,
                            borderRadius: 6,
                            border: userSelectedGroups.includes(group.dn) 
                              ? '2px solid #10b981' 
                              : hasPercentage
                              ? '1px solid #93c5fd'
                              : '1px solid #d1d5db',
                            background: userSelectedGroups.includes(group.dn) 
                              ? '#ecfdf5' 
                              : hasPercentage
                              ? '#f0f9ff'
                              : '#fff',
                            color: userSelectedGroups.includes(group.dn) 
                              ? '#059669' 
                              : hasPercentage
                              ? '#1e40af'
                              : '#374151',
                            cursor: 'pointer'
                          }}
                        >
                          {group.cn}
                          {hasPercentage && (
                            <span style={{ 
                              marginLeft: 6, 
                              fontSize: 10,
                              opacity: 0.7,
                              fontWeight: 700
                            }}>
                              {percentage}%
                            </span>
                          )}
                        </Tag.CheckableTag>
                      );
                    })}
                  </Space>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Column Settings Modal */}
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
                <FilterOutlined style={{ fontSize: 22, color: '#3b82f6' }} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                  Column Visibility Settings
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  เลือกคอลัมน์ที่ต้องการแสดง
                </Text>
              </div>
            </Space>
          </div>
        }
        open={isColumnSettingsVisible}
        onOk={() => setIsColumnSettingsVisible(false)}
        onCancel={() => setIsColumnSettingsVisible(false)}
        width={getResponsiveWidth(600, 480, '95%')}
        okText="Apply"
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
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
                เลือกคอลัมน์ที่ต้องการแสดงในตาราง (User และ Actions จะแสดงเสมอ)
              </Text>
            </Col>
            
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text strong><TagOutlined style={{ marginRight: 8 }} />Username</Text>
                <Switch
                  checked={visibleColumns.sAMAccountName}
                  onChange={(checked) => setVisibleColumns({ ...visibleColumns, sAMAccountName: checked })}
                />
              </div>
            </Col>
            
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text strong><MailOutlined style={{ marginRight: 8 }} />Email</Text>
                <Switch
                  checked={visibleColumns.mail}
                  onChange={(checked) => setVisibleColumns({...visibleColumns, mail: checked})}
                />
              </div>
            </Col>
            
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text strong>Job Title</Text>
                <Switch
                  checked={visibleColumns.title}
                  onChange={(checked) => setVisibleColumns({...visibleColumns, title: checked})}
                />
              </div>
            </Col>
            
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text strong><BankOutlined style={{ marginRight: 8 }} />Department</Text>
                <Switch
                  checked={visibleColumns.department}
                  onChange={(checked) => setVisibleColumns({...visibleColumns, department: checked})}
                />
              </div>
            </Col>
            
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text strong>Company</Text>
                <Switch
                  checked={visibleColumns.company}
                  onChange={(checked) => setVisibleColumns({...visibleColumns, company: checked})}
                />
              </div>
            </Col>
            
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text strong><IdcardOutlined style={{ marginRight: 8 }} />Employee ID</Text>
                <Switch
                  checked={visibleColumns.employeeID}
                  onChange={(checked) => setVisibleColumns({...visibleColumns, employeeID: checked})}
                />
              </div>
            </Col>
            
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text strong><PhoneOutlined style={{ marginRight: 8 }} />Phone</Text>
                <Switch
                  checked={visibleColumns.phone}
                  onChange={(checked) => setVisibleColumns({...visibleColumns, phone: checked})}
                />
              </div>
            </Col>
            
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text strong><PhoneOutlined style={{ marginRight: 8 }} />Mobile</Text>
                <Switch
                  checked={visibleColumns.mobile}
                  onChange={(checked) => setVisibleColumns({...visibleColumns, mobile: checked})}
                />
              </div>
            </Col>
            
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text strong><EnvironmentOutlined style={{ marginRight: 8 }} />Office Location</Text>
                <Switch
                  checked={visibleColumns.location}
                  onChange={(checked) => setVisibleColumns({...visibleColumns, location: checked})}
                />
              </div>
            </Col>
            
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text strong>Description</Text>
                <Switch
                  checked={visibleColumns.description}
                  onChange={(checked) => setVisibleColumns({...visibleColumns, description: checked})}
                />
              </div>
            </Col>
            
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text strong><CheckCircleOutlined style={{ marginRight: 8 }} />Status</Text>
                <Switch
                  checked={visibleColumns.status}
                  onChange={(checked) => setVisibleColumns({...visibleColumns, status: checked})}
                />
              </div>
            </Col>
          </Row>
          
          <Divider />
          
          <Space style={{ width: '100%', justifyContent: 'center' }}>
            <Button
              onClick={() => {
                setVisibleColumns({
                  user: true,
                  sAMAccountName: true,
                  mail: true,
                  title: true,
                  department: true,
                  company: true,
                  employeeID: true,
                  phone: true,
                  mobile: true,
                  location: true,
                  description: true,
                  status: true
                });
                message.success('แสดงทุกคอลัมน์');
              }}
              style={{ fontWeight: 600 }}
            >
              Show All
            </Button>
            <Button
              onClick={() => {
                setVisibleColumns({
                  user: true,
                  sAMAccountName: true,
                  mail: true,
                  title: true,
                  department: true,
                  company: true,
                  employeeID: false,
                  phone: false,
                  mobile: false,
                  location: true,
                  description: true,
                  status: false
                });
                message.info('แสดงเฉพาะคอลัมน์หลัก');
              }}
              style={{ fontWeight: 600 }}
            >
              Show Essential Only
            </Button>
          </Space>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;

