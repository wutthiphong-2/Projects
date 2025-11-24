import React, { useState, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { useSearchParams } from 'react-router-dom';
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  App,
  Popconfirm,
  Card,
  Typography,
  Row,
  Col,
  Tag,
  Avatar,
  Select,
  TreeSelect,
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
  Collapse,
  Checkbox,
  Radio,
  Spin,
  Transfer
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
  MoreOutlined,
  SettingOutlined,
  GlobalOutlined,
  BellOutlined,
  ThunderboltOutlined,
  SyncOutlined,
  ExportOutlined,
  DownloadOutlined,
  SaveOutlined,
  StarOutlined,
  AppstoreOutlined,
  BarsOutlined,
  TableOutlined,
  UnorderedListOutlined,
  DragOutlined,
  CommentOutlined,
  UserSwitchOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  PrinterOutlined,
  BulbOutlined,
  FireOutlined,
  RocketOutlined,
  ClearOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useUsers } from '../../hooks/useUsers';
import { useGroups } from '../../hooks/useGroups';
import { useOUs } from '../../hooks/useOUs';
import { useActivityLogs } from '../../hooks/useActivityLogs';
import { userService } from '../../services/userService';
import { groupService } from '../../services/groupService';
import { ouService } from '../../services/ouService';
import { useNotification } from '../../contexts/NotificationContext';
import { GROUP_DEFAULTS_CONFIG, getDefaultGroupsForOU, getCategoryStatistics } from '../../config/groupDefaults';
import { apiCache } from '../../utils/cache';
import {
  formatCount,
  resolveOuLabel,
  formatErrorDetail,
  deduplicateUsers as deduplicateUserRecords
} from '../../utils/userManagementHelpers';
import {
  transformFormDataToApiFormat,
  convertAccountOptionToFields,
  prepareUpdateData,
  hasFormChanges,
  getSelectedAccountOption,
  parseAccountOptions
} from '../../utils/userFormHelpers';
import {
  isSameUser,
  updateUserInArray,
  getUserDisplayName
} from '../../utils/userHelpers';
import { handleApiError } from '../../utils/errorHandler';
import { parseCreateUserError, parseUpdateUserError } from '../../utils/userErrorParsers';
import { handleCreateUserSuccess, refreshUserAfterUpdate } from '../../utils/userActionHelpers';
import {
  TIMING,
  PAGINATION,
  TABLE_CONFIG,
  ERROR_MESSAGES,
  EMPTY_CATEGORIZED_GROUPS
} from '../../constants/userManagement';
import FilterBar from './FilterBar';
import BulkActionBar from '../BulkActionBar';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import UserDetailsDrawer from './UserDetailsDrawer';
import UserTable from './UserTable';
import './UserManagement.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { Step } = Steps;
const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;

// Helper functions for Account Options - Now imported from userFormHelpers
// parseAccountOptions and buildAccountControl are now in userFormHelpers.js

const UserManagement = () => {
  // ==================== URL QUERY PARAMETERS ====================
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize state from URL params
  const getInitialStateFromURL = (key, defaultValue) => {
    const value = searchParams.get(key);
    return value !== null ? value : defaultValue;
  };
  
  // ==================== STATES ====================
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [directoryCounts, setDirectoryCounts] = useState({
    total: 0,
    enabled: 0,
    disabled: 0,
    fetchedAt: null
  });
  const [searchText, setSearchText] = useState(getInitialStateFromURL('search', ''));
  const [departmentFilter, setDepartmentFilter] = useState(getInitialStateFromURL('department', ''));
  const [statusFilter, setStatusFilter] = useState(getInitialStateFromURL('status', 'all'));
  const [departments, setDepartments] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [ouFilter, setOuFilter] = useState(getInitialStateFromURL('ou', ''));
  const [wifiOuFilter, setWifiOuFilter] = useState(getInitialStateFromURL('wifiOu', ''));
  const [regularOuFilter, setRegularOuFilter] = useState(getInitialStateFromURL('regularOu', ''));
  
  // Table sorting state
  const [sortedInfo, setSortedInfo] = useState({
    order: null,
    columnKey: null
  });
  
  // Enhanced user creation states
  const [availableOUs, setAvailableOUs] = useState([]);
  const [loadingOUs, setLoadingOUs] = useState(false);
  const [categorizedGroups, setCategorizedGroups] = useState({});
  const [currentTab, setCurrentTab] = useState('1');
  const screens = useBreakpoint();
  
  // Helper function for responsive width
  const getResponsiveWidth = useCallback((desktopWidth, tabletWidth, mobileWidth = '95%') => {
    if (screens.xl || screens.lg) return desktopWidth;
    if (screens.md || screens.sm) return tabletWidth;
    return mobileWidth;
  }, [screens]);
  
  // Group membership management states
  const [isManageGroupsModalVisible, setIsManageGroupsModalVisible] = useState(false);
  const [managingUser, setManagingUser] = useState(null);
  const [userOriginalGroups, setUserOriginalGroups] = useState([]);
  const [userSelectedGroups, setUserSelectedGroups] = useState([]);
  const [suggestedGroupsData, setSuggestedGroupsData] = useState(null);
  const [allGroupsForTransfer, setAllGroupsForTransfer] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  
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
  // Default columns: Display Name, Username, Email, Department, Work Location, Description
  const [visibleColumns, setVisibleColumns] = useState({
    user: true,                    // Display Name ✅
    sAMAccountName: true,          // Username ✅
    mail: true,                    // Email ✅
    title: false,                  // Job Title
    department: true,              // Department ✅
    company: false,                // Company
    employeeID: false,             // Employee ID
    phone: false,                  // Phone
    mobile: false,                 // Mobile
    location: true,                // Work Location ✅
    description: true,             // Description ✅
    status: false,                 // Status
    userPrincipalName: false,      // User Principal Name
    manager: false,                // Manager
    lastLogon: false,              // Last Logon
    pwdLastSet: false,             // Password Last Set
    accountExpires: false,         // Account Expires
    extensionName: false        // Extension Name
  });
  const [isColumnSettingsVisible, setIsColumnSettingsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGINATION.CLIENT_PAGE_SIZE);
  const [tableScrollY, setTableScrollY] = useState(TABLE_CONFIG.SCROLL_Y);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState(null);
  const [openDropdownKey, setOpenDropdownKey] = useState(null);
  
  // Level 3: Premium Features States
  // Note: Some features are planned but not yet implemented
  // Removed unused states: autoRefreshEnabled, analyticsData, filterPresets, tableView, etc.
  
  // Bulk actions
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [isBulkActionModalVisible, setIsBulkActionModalVisible] = useState(false);
  
  // Smart search
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  
  // OU Modal state
  const [isOuModalVisible, setIsOuModalVisible] = useState(false);
  
  // Level 3: Modern Redesign - Sticky header state
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const [isFilterSticky, setIsFilterSticky] = useState(false);
  
  const updateTableScrollY = useCallback(() => {
    if (typeof window === 'undefined') return;
    // Ultra compact layout - much smaller header
    const HEADER_HEIGHT = screens.md || screens.lg || screens.xl ? 100 : 120;
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
  
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  // filterForm is used programmatically but not connected to Form element
  // This will cause a warning - we'll suppress it or create a hidden Form
  const [filterForm] = Form.useForm();
  const { message } = App.useApp();
  
  // Hooks
  const { fetchUserStats, loading: usersLoading } = useUsers();
  const { fetchCategorizedGroups } = useGroups();
  const { fetchUserOUs } = useOUs();
  const { fetchRecent: fetchRecentActivities } = useActivityLogs();
  const {
    notifyUserCreated,
    notifyUserUpdated,
    notifyUserDeleted,
    notifyUserStatusChanged,
    notifyPasswordReset,
    notifyError
  } = useNotification();

  // ==================== HELPER FUNCTIONS ====================
  
  const getOuLabel = useCallback(
    (dn) => resolveOuLabel(dn, availableOUs),
    [availableOUs]
  );

  /**
   * Convert error detail to string for display
   * Handles FastAPI validation errors (array of objects), strings, and objects
   */
  const handleFilterTagClose = useCallback((key) => {
    switch (key) {
      case 'department':
        setDepartmentFilter('');
        break;
      case 'ou':
        setOuFilter('');
        setWifiOuFilter('');
        setRegularOuFilter('');
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
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setDepartmentFilter('');
    setOuFilter('');
    setWifiOuFilter('');
    setRegularOuFilter('');
    setStatusFilter('all');
    setDateRangeFilter(null);
    setSearchText('');
  }, []);

  const openAdvancedFilterDrawer = useCallback(() => {
    filterForm.setFieldsValue({
      department: departmentFilter || undefined,
      ou: ouFilter || undefined,
      status: statusFilter,
      dateRange: Array.isArray(dateRangeFilter) ? dateRangeFilter : []
    });
    setIsFilterDrawerVisible(true);
  }, [departmentFilter, ouFilter, statusFilter, dateRangeFilter, filterForm]);

  const handleApplyAdvancedFilters = useCallback(async () => {
    try {
      const values = await filterForm.validateFields();
      setDepartmentFilter(values.department || '');
      const ouValue = values.ou || '';
      setOuFilter(ouValue);
      // Determine if it's WiFi or Regular
      if (ouValue) {
        const isWifi = ouValue.toLowerCase().includes('ou=wifi');
        if (isWifi) {
          setWifiOuFilter(ouValue);
          setRegularOuFilter('');
        } else {
          setRegularOuFilter(ouValue);
          setWifiOuFilter('');
        }
      } else {
        setWifiOuFilter('');
        setRegularOuFilter('');
      }
      setStatusFilter(values.status || 'all');
      setDateRangeFilter(
        values.dateRange && values.dateRange.length === 2 ? values.dateRange : null
      );
      setIsFilterDrawerVisible(false);
    } catch (error) {
      // Form validation will show errors, but log for debugging
      if (process.env.NODE_ENV === 'development') {
        console.warn('[UserManagement] Filter validation error', error);
      }
    }
  }, [filterForm]);

  const handleResetAdvancedFilters = useCallback(() => {
    filterForm.resetFields();
    setDepartmentFilter('');
    setOuFilter('');
    setWifiOuFilter('');
    setRegularOuFilter('');
    setStatusFilter('all');
    setDateRangeFilter(null);
  }, [filterForm]);

  // ==================== DATA FETCHING ====================
  
  const fetchDirectoryCounts = useCallback(async () => {
    try {
      const result = await fetchUserStats();
      if (result.success) {
        const data = result.data || {};
      setDirectoryCounts({
        total: data.total_users ?? 0,
        enabled: data.enabled_users ?? 0,
        disabled: data.disabled_users ?? 0,
        fetchedAt: data.fetched_at ?? null
      });
      } else {
        message.warning({
          key: 'user-counts',
          content: result.error || 'ไม่สามารถโหลดจำนวนผู้ใช้จาก AD ได้',
          duration: 3
        });
      }
    } catch (error) {
      message.warning({
        key: 'user-counts',
        content: 'ไม่สามารถโหลดจำนวนผู้ใช้จาก AD ได้',
        duration: 3
      });
    }
  }, [fetchUserStats, message]);

  const fetchUsers = useCallback(async (forceRefresh = false, ignoreFilters = false) => {
    setLoading(true);
    
    try {
      // Determine if we have active filters
      const hasFilters = Boolean(searchText || departmentFilter || ouFilter || statusFilter !== 'all' || 
        (Array.isArray(dateRangeFilter) && dateRangeFilter.length === 2));
      
      // For filtered views, load more data to allow client-side filtering
      // For unfiltered views, use reasonable page size
      const pageSize = ignoreFilters || !hasFilters 
        ? PAGINATION.DEFAULT_PAGE_SIZE 
        : PAGINATION.FILTERED_PAGE_SIZE;
      
      const params = {
        page_size: pageSize,
        page: 1, // Always load first page, client-side pagination handles the rest
        _t: forceRefresh ? Date.now() : undefined
      };
      
      // Only apply filters if not ignoring them
      if (!ignoreFilters) {
        // Apply search
        if (searchText) {
          params.q = searchText;
        }
        
        if (departmentFilter) {
          params.department = departmentFilter;
        }

        if (ouFilter) {
          params.ou = ouFilter;
        }
      }
      
      // Generate cache key
      const cacheKey = apiCache.generateKey('/api/users/', params);
      
      // Invalidate cache if force refresh
      if (forceRefresh) {
        apiCache.invalidate('/api/users');
        // Add timestamp to bypass cache
        params._t = Date.now();
      }
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = apiCache.get(cacheKey);
        if (cachedData) {
          // Ensure cached data is an array
          const userData = Array.isArray(cachedData) 
            ? cachedData 
            : (cachedData?.items || cachedData?.data || cachedData?.users || []);
          
          if (!Array.isArray(userData)) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[UserManagement] Cached data is not an array, clearing cache', {
                cacheKey,
                cachedDataType: typeof cachedData,
                hasItems: !!cachedData?.items,
                hasData: !!cachedData?.data,
                keys: cachedData ? Object.keys(cachedData) : []
              });
            }
            apiCache.delete(cacheKey);
          } else {
            setUsers(userData);
            await fetchDirectoryCounts();
            return { success: true, count: userData.length };
          }
        }
      }
      
      // Load data
      const result = await userService.getUsers(params);
      
      // Handle both array and paginated response formats
      let userData = [];
      if (Array.isArray(result)) {
        // Direct array response
        userData = result;
      } else if (result && Array.isArray(result.items)) {
        // Paginated response format: { items: [...], total: ..., page: ..., ... }
        userData = result.items;
      } else if (result && typeof result === 'object') {
        // Fallback: try to extract array from object
        if (process.env.NODE_ENV === 'development') {
          console.warn('[UserManagement] Unexpected response format, attempting to extract array', {
            resultType: typeof result,
            hasItems: !!result.items,
            hasData: !!result.data,
            hasUsers: !!result.users,
            keys: result ? Object.keys(result) : []
          });
        }
        userData = result.data || result.users || [];
      } else {
        // Fallback to empty array
        userData = [];
      }
      
      // Debug: Check if employeeID exists in API response (only in development)
      // Removed verbose debug logs for production
      
      // Ensure userData is always an array
      if (!Array.isArray(userData)) {
        console.error('[UserManagement] userData is not an array after processing', {
          resultType: typeof result,
          userDataType: typeof userData,
          resultKeys: result ? Object.keys(result) : [],
          userDataKeys: userData ? Object.keys(userData) : []
        });
        userData = [];
      }
      
      // Debug: Check if extensionName and employeeID are in the data (only in development)
      // Removed verbose debug logs for production
      
      setUsers(userData);
      await fetchDirectoryCounts();

      return { success: true, count: userData.length };
    } catch (error) {
      // Handle timeout and network errors
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error('[UserManagement] API request timeout', {
          error: error.message,
          code: error.code,
          url: '/api/users'
        });
        message.error({
          content: 'การเชื่อมต่อ API หมดเวลา กรุณาตรวจสอบว่า backend server ทำงานอยู่',
          duration: 5
        });
        setUsers([]); // Set empty array to prevent errors
        return { success: false, count: 0 };
      }
      
      // Handle network errors
      if (error.request && !error.response) {
        console.error('[UserManagement] Network error - backend may be down', {
          error: error.message,
          url: '/api/users',
          hasRequest: !!error.request
        });
        message.error({
          content: 'ไม่สามารถเชื่อมต่อกับ backend server ได้ กรุณาตรวจสอบว่า server ทำงานอยู่',
          duration: 5
        });
        setUsers([]); // Set empty array to prevent errors
        return { success: false, count: 0 };
      }
      
      // Handle other errors
      const errorDetail = error?.response?.data?.detail || error?.message || 'ไม่ทราบสาเหตุ';
      console.error('[UserManagement] Error fetching users', {
        error: errorDetail,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        url: '/api/users'
      });
      message.error({
        content: `ไม่สามารถโหลดข้อมูลผู้ใช้ได้: ${errorDetail}`,
        duration: 5
      });
      setUsers([]); // Set empty array to prevent errors
      return { success: false, count: 0 };
    } finally {
      setLoading(false);
    }
  }, [searchText, departmentFilter, ouFilter, statusFilter, dateRangeFilter, fetchDirectoryCounts, message]);

  // ⚡ Debounced version for search
  const debouncedFetchUsers = useMemo(
    () => debounce((forceRefresh, ignoreFilters) => {
      fetchUsers(forceRefresh, ignoreFilters);
    }, TIMING.DEBOUNCE_DELAY),
    [fetchUsers]
  );

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await userService.getDepartments();
      setDepartments(data);
    } catch (error) {
      // Silently fail - departments are optional
    }
  }, []);

  const loadUserOUs = useCallback(async () => {
    setLoadingOUs(true);
    try {
      const data = await ouService.getUserOUs();
      setAvailableOUs(data || []);
    } catch (error) {
      // Silently fail - OUs are optional
      setAvailableOUs([]);
    } finally {
      setLoadingOUs(false);
    }
  }, []);

  const fetchAvailableGroups = useCallback(async () => {
    try {
      const result = await fetchCategorizedGroups();
      if (result.success) {
        // Flatten categorized groups to simple array
        const allGroups = Object.values(result.data || {}).flat();
        setAvailableGroups(allGroups);
      }
    } catch (error) {
      // Silently fail - groups are optional
    }
  }, [fetchCategorizedGroups]);

  const loadCategorizedGroups = useCallback(async () => {
    try {
      const result = await fetchCategorizedGroups();
      if (result.success) {
        setCategorizedGroups(result.data.categories || result.data);
      } else {
        // Fallback: use empty categories
        setCategorizedGroups(EMPTY_CATEGORIZED_GROUPS);
      }
    } catch (error) {
      // Fallback: use empty categories
      setCategorizedGroups(EMPTY_CATEGORIZED_GROUPS);
    }
  }, [fetchCategorizedGroups]);

  const fetchUserDetails = useCallback(async (userDn) => {
    try {
      // Fetch full user details first
      const response = await userService.getUser(userDn).catch(() => null);
      
      // Handle different response formats
      let userDetails = null;
      if (response) {
        // Check if response has data property (wrapped response)
        if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
          userDetails = response.data;
        } else if (response.data) {
          userDetails = response.data;
        } else {
          userDetails = response;
        }
      }
      
      // Fallback to selectedUser if no details fetched
      if (!userDetails && selectedUser) {
        userDetails = selectedUser;
      }

      // Debug: Log extensionName in development
      if (process.env.NODE_ENV === 'development' && userDetails) {
        console.debug('[UserManagement] User details loaded for drawer', {
          username: userDetails.sAMAccountName,
          hasExtensionName: 'extensionName' in userDetails,
          extensionName: userDetails.extensionName,
          extensionNameType: typeof userDetails.extensionName,
          allKeys: Object.keys(userDetails).filter(k => k.toLowerCase().includes('ext') || k.toLowerCase().includes('dept'))
        });
      }

      // Update selected user with full details
      if (userDetails) {
        setSelectedUser(userDetails);
      }

      // Fetch additional information in parallel
      const [groupsRes, permissionsRes, historyRes, expiryRes] = await Promise.all([
        userService.getUserGroups(userDn).catch(() => []),
        userService.getUserPermissions(userDn).catch(() => []),
        userService.getLoginHistory(userDn).catch(() => []),
        userService.getPasswordExpiry(userDn).catch(() => null)
      ]);

      setUserGroups(groupsRes || []);
      setUserPermissions(permissionsRes || []);
      setLoginHistory(historyRes || []);
      setPasswordExpiry(expiryRes || null);
    } catch (error) {
      message.warning('ไม่สามารถโหลดข้อมูลเพิ่มเติมบางส่วนได้');
    }
  }, [selectedUser, message]);

  // ⚡ PERFORMANCE: Load only users first, defer other data
  useEffect(() => {
    fetchUsers();
    
    // Defer non-critical data loading
    const timeoutId = setTimeout(() => {
      fetchDepartments();
      fetchAvailableGroups();
      loadUserOUs();
      loadCategorizedGroups();
    }, TIMING.DEFERRED_LOAD_DELAY);
    
    // Cleanup timeout on unmount
    return () => {
      clearTimeout(timeoutId);
    };
  }, [fetchUsers, fetchDepartments, fetchAvailableGroups, loadUserOUs, loadCategorizedGroups]);

  // Level 3: Sticky header on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsHeaderSticky(scrollTop > 100);
      setIsFilterSticky(scrollTop > 200);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when scrolling - improved version
  useEffect(() => {
    if (!openDropdownKey) return;

    const handleScroll = () => {
      setOpenDropdownKey(null);
    };

    // Use event delegation on document to catch all scroll events
    const handleScrollCapture = (e) => {
      // Check if scroll is happening in table area
      const target = e.target;
      if (target.closest('.umx-table-card') || 
          target.closest('.ant-table-body') || 
          target.closest('.ant-table-body-wrapper')) {
        handleScroll(e);
      }
    };

    // Listen to all scroll events with capture phase
    document.addEventListener('scroll', handleScrollCapture, { passive: true, capture: true });
    document.addEventListener('wheel', handleScroll, { passive: true, capture: true });
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('wheel', handleScroll, { passive: true, capture: true });
    window.addEventListener('touchmove', handleScroll, { passive: true, capture: true });

    // Also try to find and attach to table body directly (may not exist yet)
    const attachToTableBody = () => {
      const tableBody = document.querySelector('.ant-table-body');
      if (tableBody) {
        tableBody.addEventListener('scroll', handleScroll, { passive: true, capture: true });
        return tableBody;
      }
      return null;
    };

    // Try immediately
    let tableBody = attachToTableBody();
    
    // Retry attaching to table body after a delay
    const retryTimeout = setTimeout(() => {
      if (!tableBody) {
        tableBody = attachToTableBody();
      }
    }, 200);

    // Use MutationObserver to watch for table body creation
    const observer = new MutationObserver(() => {
      if (!tableBody) {
        tableBody = attachToTableBody();
      }
    });

    const tableCard = document.querySelector('.umx-table-card');
    if (tableCard) {
      observer.observe(tableCard, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(retryTimeout);
      observer.disconnect();
      document.removeEventListener('scroll', handleScrollCapture, { capture: true });
      document.removeEventListener('wheel', handleScroll, { capture: true });
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('wheel', handleScroll, { capture: true });
      window.removeEventListener('touchmove', handleScroll, { capture: true });
      if (tableBody) {
        tableBody.removeEventListener('scroll', handleScroll, { capture: true });
      }
    };
  }, [openDropdownKey]);

  // Handler function for opening edit modal
  const handleEditUser = useCallback(async (user) => {
    if (!user?.dn) {
      message.error('ไม่พบข้อมูลผู้ใช้');
      return;
    }
    
    // Fetch full user details FIRST before opening modal
    // This ensures all data is available when modal opens
    try {
      const response = await userService.getUser(user.dn);
      
      // Handle different response formats
      let fullUserDetails = null;
      if (response) {
        // Check if response has data property (wrapped response)
        if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
          fullUserDetails = response.data;
        } else if (response.data) {
          fullUserDetails = response.data;
        } else {
          fullUserDetails = response;
        }
      }
      
      // Debug: Log full user details
      if (process.env.NODE_ENV === 'development' && fullUserDetails) {
        console.debug('[UserManagement] Full user details loaded for edit', {
          username: fullUserDetails.sAMAccountName,
          hasEmployeeID: !!fullUserDetails.employeeID,
          employeeID: fullUserDetails.employeeID,
          hasExtensionName: 'extensionName' in fullUserDetails,
          extensionName: fullUserDetails.extensionName,
          extensionNameType: typeof fullUserDetails.extensionName,
          isEmpty: !fullUserDetails.extensionName || fullUserDetails.extensionName === '',
          isNull: fullUserDetails.extensionName === null,
          isUndefined: fullUserDetails.extensionName === undefined,
          hasDepartment: !!fullUserDetails.department,
          department: fullUserDetails.department,
          hasCompany: !!fullUserDetails.company,
          company: fullUserDetails.company,
          allKeys: Object.keys(fullUserDetails),
          extensionRelatedKeys: Object.keys(fullUserDetails).filter(k => k.toLowerCase().includes('ext') || k.toLowerCase().includes('dept'))
        });
      }
      
      if (fullUserDetails) {
        // Set full user details and open modal
        setEditingUser(fullUserDetails);
        setIsEditModalVisible(true);
      } else {
        // Fallback to table data if API returns null
        if (process.env.NODE_ENV === 'development') {
          console.warn('[UserManagement] API returned null, using table data');
        }
        setEditingUser(user);
        setIsEditModalVisible(true);
        message.warning('ไม่สามารถโหลดข้อมูลเพิ่มเติมได้ ใช้ข้อมูลจากตารางแทน');
      }
    } catch (error) {
      console.error('[UserManagement] Error fetching user details for edit', {
        error: error.message,
        userDn: user.dn,
        username: user.sAMAccountName
      });
      // Fallback to table data if fetch fails
      setEditingUser(user);
      setIsEditModalVisible(true);
      message.warning('ไม่สามารถโหลดข้อมูลเพิ่มเติมได้ ใช้ข้อมูลจากตารางแทน');
    }
  }, [message]);

  // Handler functions for user groups management
  const handleManageGroups = useCallback(async (user) => {
    setManagingUser(user);
    setLoadingGroups(true);
    
    try {
      // Fetch all groups first
      // Backend returns array directly when page_size >= 1000
      let allGroupsResponse;
      try {
        const response = await groupService.getGroups({ page_size: 10000 });
        console.log('🔍 Raw groups response:', response);
        console.log('🔍 Response type:', typeof response);
        console.log('🔍 Is array?', Array.isArray(response));
        
        // groupService.getGroups returns response.data
        // If backend returns array (page_size >= 1000), response.data is array
        // If backend returns PaginatedResponse, response.data is { items: [...], ... }
        allGroupsResponse = response;
      } catch (error) {
        console.error('❌ Error fetching all groups:', error);
        message.error('ไม่สามารถโหลด groups ได้: ' + (error.message || 'Unknown error'));
        allGroupsResponse = [];
      }
      
      // Fetch user's current groups with better error handling
      let userGroupsResponse = [];
      try {
        const response = await userService.getUserGroups(user.dn);
        // Handle different response formats
        if (Array.isArray(response)) {
          userGroupsResponse = response;
        } else if (response?.data) {
          userGroupsResponse = Array.isArray(response.data) ? response.data : [];
        } else if (response?.groups) {
          userGroupsResponse = Array.isArray(response.groups) ? response.groups : [];
        }
      } catch (error) {
        console.warn('Error fetching user groups:', error);
        // If it's a network/content length error, try to continue with empty groups
        if (error.message?.includes('ERR_CONTENT_LENGTH_MISMATCH') || 
            error.message?.includes('Network Error')) {
          message.warning('ไม่สามารถโหลด groups ปัจจุบันของ user ได้ แต่สามารถเลือก groups ใหม่ได้');
        } else {
          message.warning('ไม่สามารถโหลด groups ปัจจุบันของ user ได้');
        }
        userGroupsResponse = [];
      }
      
      // Format groups for Transfer component
      // Backend returns array directly when page_size >= 1000
      // groupService.getGroups returns response.data (which is the array)
      let allGroups = [];
      
      // Handle different response formats
      if (Array.isArray(allGroupsResponse)) {
        // Response is directly an array (when page_size >= 1000)
        allGroups = allGroupsResponse;
      } else if (allGroupsResponse?.items && Array.isArray(allGroupsResponse.items)) {
        // PaginatedResponse format: { items: [...], total: ..., page: ..., page_size: ... }
        allGroups = allGroupsResponse.items;
      } else if (allGroupsResponse?.data) {
        // Nested data property
        if (Array.isArray(allGroupsResponse.data)) {
          allGroups = allGroupsResponse.data;
        } else if (Array.isArray(allGroupsResponse.data.items)) {
          allGroups = allGroupsResponse.data.items;
        } else if (Array.isArray(allGroupsResponse.data.results)) {
          allGroups = allGroupsResponse.data.results;
        }
      }
      
      console.log('✅ Extracted groups:', allGroups.length);
      if (allGroups.length > 0) {
        console.log('📋 Sample group:', allGroups[0]);
      } else {
        console.warn('⚠️ No groups found in response!');
        console.warn('⚠️ Response structure:', allGroupsResponse);
      }
      
      const formattedGroups = allGroups
        .filter(group => group && (group.dn || group.id || group.cn || group.name))
        .map(group => ({
          key: group.dn || group.id || `${group.cn || group.name}`,
          title: group.cn || group.name || group.dn || group.id || 'Unknown Group',
          description: group.description || group.dn || group.ouPath || group.ou_path || ''
        }));
      
      console.log('✅ Formatted groups for Transfer:', formattedGroups.length);
      
      if (formattedGroups.length === 0 && allGroupsResponse && !Array.isArray(allGroupsResponse)) {
        message.warning('ไม่พบ groups ในระบบ กรุณาตรวจสอบการเชื่อมต่อ LDAP หรือลอง refresh หน้า');
      }
      
      setAllGroupsForTransfer(formattedGroups);
      
      // Get current groups DNs
      const currentGroupDNs = userGroupsResponse
        .map(g => {
          if (typeof g === 'string') return g;
          return g.dn || g.id || null;
        })
        .filter(Boolean);
      
      setUserOriginalGroups(currentGroupDNs);
      setUserSelectedGroups(currentGroupDNs);
      
      // Fetch suggested groups based on user's OU for recommendations
      if (user.dn) {
        // Extract OU from user DN
        const dnParts = user.dn.split(',');
        const ouParts = dnParts.slice(1); // Skip CN part
        const userOUDN = ouParts.join(',');
        
        // Fetch suggestions
        try {
          const data = await ouService.getSuggestedGroups(userOUDN);
          setSuggestedGroupsData(data);
        } catch (error) {
          // Silently fail - suggestions are optional
          setSuggestedGroupsData(null);
        }
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      message.error('ไม่สามารถโหลดข้อมูล groups ได้: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingGroups(false);
    }
    
    setIsManageGroupsModalVisible(true);
  }, [message]);

  const handleSaveGroupChanges = useCallback(async () => {
    if (!managingUser?.dn) {
      message.error('No user selected');
      return;
    }
    
    try {
      // Calculate groups to add and remove
      const groupsToAdd = userSelectedGroups.filter(dn => !userOriginalGroups.includes(dn));
      const groupsToRemove = userOriginalGroups.filter(dn => !userSelectedGroups.includes(dn));
      
      let addedCount = 0;
      let removedCount = 0;
      let failedCount = 0;
      
      // Add to new groups
      for (const groupDn of groupsToAdd) {
        try {
          await groupService.addGroupMember(groupDn, managingUser.dn);
          addedCount++;
        } catch (error) {
          failedCount++;
          // Log error but continue with other groups
        }
      }
      
      // Remove from old groups
      for (const groupDn of groupsToRemove) {
        try {
          await groupService.removeGroupMember(groupDn, managingUser.dn);
          removedCount++;
        } catch (error) {
          failedCount++;
          // Log error but continue with other groups
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
      setManagingUser(null);
      setUserOriginalGroups([]);
      setUserSelectedGroups([]);
      
      // Refresh user details and users list
      await fetchUserDetails(managingUser.dn);
      await fetchUsers(true); // Force refresh users list
      
    } catch (error) {
      notifyError('Failed to update group membership', error?.response?.data?.detail || error?.message || 'An error occurred');
    }
  }, [managingUser, userOriginalGroups, userSelectedGroups, message, fetchUserDetails, fetchUsers, notifyError]);

  const handleRemoveFromGroup = useCallback(async (groupDn, groupName) => {
    if (!selectedUser) return;
    
    try {
      await groupService.removeGroupMember(groupDn, selectedUser.dn);
      
      message.success(`Removed from group: ${groupName}`);
      
      // Refresh user groups
      await fetchUserDetails(selectedUser.dn);
      
    } catch (error) {
      // Error handled by handleApiError
      const errorMsg = formatErrorDetail(error.response?.data?.detail) || error.message || 'Failed to remove user from group';
      notifyError('Cannot remove from group', errorMsg);
    }
  }, [selectedUser, fetchUserDetails, formatErrorDetail, notifyError, message]);

  const handleQuickAddGroup = useCallback(async (groupDn, groupName) => {
    if (!selectedUser?.dn) {
      message.error('No user selected');
      return;
    }
    
    if (!groupDn) {
      message.error('Invalid group');
      return;
    }
    
    try {
      await groupService.addGroupMember(groupDn, selectedUser.dn);
      message.success(`Added to group: ${groupName || 'group'}`);
      await fetchUserDetails(selectedUser.dn);
    } catch (error) {
      // Check if already a member
      const detail = formatErrorDetail(error.response?.data?.detail);
      if (detail?.includes('entryAlreadyExists') || detail?.includes('already')) {
        message.warning(`User is already a member of ${groupName || 'group'}`);
      } else {
        handleApiError(error, ERROR_MESSAGES.ADD_TO_GROUP, notifyError);
      }
    }
  }, [selectedUser, fetchUserDetails, formatErrorDetail, notifyError, message]);

  // UserDetailsDrawer component now handles tabs internally
  // Removed userDetailsTabsItems useMemo - moved to UserDetailsDrawer component

  // Manage Groups Modal tabs items - Groups only
  const manageGroupsTabsItems = useMemo(() => {
    if (!managingUser) return [];
    
    return [
      {
        key: '1',
        label: (
          <span>
            <TeamOutlined />
            Groups
          </span>
        ),
        children: (
          <Spin spinning={loadingGroups}>
            <div style={{ padding: '16px 0' }}>
              <Alert
                message="เลือก Groups"
                description={`เลือก groups ที่ต้องการให้ ${managingUser.displayName || managingUser.sAMAccountName} เป็นสมาชิก`}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              {allGroupsForTransfer.length === 0 && !loadingGroups ? (
                <Alert
                  message="ไม่พบ Groups"
                  description="ไม่สามารถโหลด groups จากระบบได้ กรุณาตรวจสอบการเชื่อมต่อ LDAP หรือลอง refresh หน้า"
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                  action={
                    <Button 
                      size="small" 
                      onClick={async () => {
                        setLoadingGroups(true);
                        try {
                          const response = await groupService.getGroups({ page_size: 10000 });
                          console.log('🔄 Retry - Raw groups response:', response);
                          
                          let allGroups = [];
                          if (Array.isArray(response)) {
                            allGroups = response;
                          } else if (response?.items) {
                            allGroups = response.items;
                          } else if (response?.data) {
                            allGroups = Array.isArray(response.data) ? response.data : (response.data?.items || []);
                          }
                          
                          const formattedGroups = allGroups
                            .filter(group => group && (group.dn || group.id || group.cn || group.name))
                            .map(group => ({
                              key: group.dn || group.id || `${group.cn || group.name}`,
                              title: group.cn || group.name || group.dn || group.id || 'Unknown Group',
                              description: group.description || group.dn || group.ouPath || group.ou_path || ''
                            }));
                          
                          setAllGroupsForTransfer(formattedGroups);
                          if (formattedGroups.length > 0) {
                            message.success(`โหลด groups สำเร็จ: ${formattedGroups.length} groups`);
                          }
                        } catch (error) {
                          console.error('Retry failed:', error);
                          message.error('ไม่สามารถโหลด groups ได้: ' + (error.message || 'Unknown error'));
                        } finally {
                          setLoadingGroups(false);
                        }
                      }}
                    >
                      Retry
                    </Button>
                  }
                />
              ) : (
                <Transfer
                  dataSource={allGroupsForTransfer}
                  titles={['Available Groups', 'Selected Groups']}
                  targetKeys={userSelectedGroups}
                  onChange={(nextTargetKeys) => {
                    setUserSelectedGroups(nextTargetKeys);
                  }}
                  render={(item) => item.title}
                  listStyle={{
                    width: '100%',
                    height: 400,
                  }}
                  operations={['Add', 'Remove']}
                  showSearch
                  filterOption={(inputValue, item) =>
                    item.title.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1 ||
                    (item.description && item.description.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1)
                  }
                  locale={{
                    itemUnit: 'group',
                    itemsUnit: 'groups',
                    searchPlaceholder: 'Search groups...',
                    notFoundContent: 'No groups found',
                  }}
                />
              )}
              <div style={{ marginTop: 16, padding: '12px', background: '#f8fafc', borderRadius: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <InfoCircleOutlined /> Selected: <strong>{userSelectedGroups.length}</strong> groups
                  {allGroupsForTransfer.length > 0 && (
                    <> | Available: <strong>{allGroupsForTransfer.length}</strong> groups</>
                  )}
                </Text>
              </div>
            </div>
          </Spin>
        )
      }
    ];
  }, [managingUser, allGroupsForTransfer, userSelectedGroups, loadingGroups]);

  // ==================== DATA PROCESSING ====================
  
  // Step 1: Deduplicate users
  const dedupedUsers = useMemo(() => {
    if (!Array.isArray(users) || users.length === 0) return [];
    return deduplicateUserRecords(users);
  }, [users]);

  // Step 2: Filter users
  const filteredUsers = useMemo(() => {
    if (!Array.isArray(dedupedUsers) || dedupedUsers.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[UserManagement] filteredUsers: dedupedUsers is empty', {
          dedupedUsersLength: dedupedUsers?.length,
          isArray: Array.isArray(dedupedUsers),
          usersLength: users.length
        });
      }
      return [];
    }
    
    let filtered = [...dedupedUsers];

    // Search filter
    if (searchText && searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      const beforeFilterCount = filtered.length;
      filtered = filtered.filter(user => {
        const cn = (user.cn || '').toLowerCase();
        const displayName = (user.displayName || '').toLowerCase();
        const sAMAccountName = (user.sAMAccountName || '').toLowerCase();
        const mail = (user.mail || '').toLowerCase();
        const department = (user.department || '').toLowerCase();
        const employeeID = (user.employeeID || '').toLowerCase();
        
        const matches = cn.includes(searchLower) ||
               displayName.includes(searchLower) ||
               sAMAccountName.includes(searchLower) ||
               mail.includes(searchLower) ||
               department.includes(searchLower) ||
               employeeID.includes(searchLower);
        
        return matches;
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('[UserManagement] Search filter applied', {
          searchText,
          searchLower,
          beforeFilter: beforeFilterCount,
          afterFilter: filtered.length,
          filtered: filtered.slice(0, 3).map(u => ({
            username: u.sAMAccountName,
            displayName: u.displayName || u.cn,
            email: u.mail
          }))
        });
      }
    }

    // Department filter
    if (departmentFilter && departmentFilter !== 'all') {
      filtered = filtered.filter(user => user.department === departmentFilter);
    }

    // OU filter
    if (ouFilter) {
      filtered = filtered.filter(user => {
        if (!user.dn) return false;
        return user.dn.toLowerCase().includes(ouFilter.toLowerCase());
      });
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      const isEnabled = statusFilter === 'enabled';
      filtered = filtered.filter(user => user.isEnabled === isEnabled);
    }

    // Date range filter
    if (Array.isArray(dateRangeFilter) && dateRangeFilter.length === 2) {
      const [startDate, endDate] = dateRangeFilter;
      filtered = filtered.filter(user => {
        if (!user.whenCreated) return false;
        const createdDate = dayjs(user.whenCreated);
        return createdDate.isAfter(startDate.subtract(1, 'day')) && 
               createdDate.isBefore(endDate.add(1, 'day'));
      });
    }

    return filtered;
  }, [dedupedUsers, searchText, departmentFilter, ouFilter, statusFilter, dateRangeFilter]);

  // Step 3: Paginate users
  const paginatedUsers = useMemo(() => {
    if (!Array.isArray(filteredUsers) || filteredUsers.length === 0) return [];
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, pageSize]);

  // Check if filters are active
  const isFilteredView = useMemo(() => {
    return Boolean(
      (searchText && searchText.trim()) ||
      (departmentFilter && departmentFilter !== 'all') ||
      ouFilter ||
      (statusFilter && statusFilter !== 'all') ||
      (Array.isArray(dateRangeFilter) && dateRangeFilter.length === 2)
    );
  }, [searchText, departmentFilter, ouFilter, statusFilter, dateRangeFilter]);

  // CSV export headers
  const headers = useMemo(() => [
    'Display Name',
    'Username',
    'Email',
    'Department',
    'Status',
    'Created Date'
  ], []);

  const handleExportCSV = useCallback(() => {
    const rows = filteredUsers.map(user => [
      user.cn || user.displayName || '',
      user.sAMAccountName || '',
      user.mail || '',
      user.department || '',
      user.isEnabled ? 'Active' : 'Disabled',
      user.whenCreated ? new Date(user.whenCreated).toLocaleDateString() : ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success('Export CSV สำเร็จ');
  }, [filteredUsers, headers, message]);

  // ==================== STATISTICS ====================
  
  // Update URL params when filters change (must be defined before handleMetricClick)
  const updateURLParams = useCallback((updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        newParams.set(key, value);
                              } else {
        newParams.delete(key);
      }
    });
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);
  
  // Handler for metric clicks (must be defined before heroMetrics useMemo)
  const handleMetricClick = useCallback((metricKey) => {
    switch (metricKey) {
      case 'enabled':
        setStatusFilter('enabled');
        updateURLParams({ status: 'enabled' });
        break;
      case 'disabled':
        setStatusFilter('disabled');
        updateURLParams({ status: 'disabled' });
        break;
      case 'total':
      case 'visible':
        setStatusFilter('all');
        updateURLParams({ status: 'all' });
        break;
      default:
        break;
    }
  }, [updateURLParams]);
  
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
      accent: '#64748b',
      onClick: () => handleMetricClick('total')
    },
    {
      key: 'enabled',
      label: 'เปิดใช้งาน',
      value: formatCount(directoryCounts.enabled),
      hint: `${formatCount(stats.enabled)} แสดงอยู่`,
      accent: '#059669',
      onClick: () => handleMetricClick('enabled')
    },
    {
      key: 'disabled',
      label: 'ปิดใช้งาน',
      value: formatCount(directoryCounts.disabled),
      hint: `${formatCount(stats.disabled)} แสดงอยู่`,
      accent: '#ef4444',
      onClick: () => handleMetricClick('disabled')
    },
    {
      key: 'visible',
      label: 'ผลลัพธ์ปัจจุบัน',
      value: formatCount(stats.total),
      hint: isFilteredView ? 'หลังใช้ตัวกรอง' : 'มุมมองปัจจุบัน',
      accent: '#f97316',
      onClick: () => handleMetricClick('visible')
    }
  ]), [
    directoryCounts.total,
    directoryCounts.enabled,
    directoryCounts.disabled,
    stats.enabled,
    stats.disabled,
    stats.total,
    formatCount,
    isFilteredView,
    handleMetricClick
  ]);

  const activeFilterTags = useMemo(() => {
    const tags = [];
    if (departmentFilter) {
      tags.push({ key: 'department', label: `แผนก: ${departmentFilter}` });
    }
    const activeOuFilter = wifiOuFilter || regularOuFilter || ouFilter;
    if (activeOuFilter) {
      const ouType = wifiOuFilter ? 'WiFi' : 'Regular';
      tags.push({ key: 'ou', label: `${ouType} OU: ${getOuLabel(activeOuFilter)}` });
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
  }, [departmentFilter, wifiOuFilter, regularOuFilter, ouFilter, statusFilter, dateRangeFilter, getOuLabel]);

  // Calculate category statistics when userGroups change
  useEffect(() => {
    if (userGroups.length > 0 && Object.keys(categorizedGroups).length > 0) {
      const stats = getCategoryStatistics(userGroups, categorizedGroups);
      setCategoryStats(stats);
    }
  }, [userGroups, categorizedGroups]);

  // ==================== USER HANDLERS ====================
  
  // (Render functions and table columns moved to UserTable.js component)
  
  const handleViewDetails = useCallback((user) => {
    if (!user || !user.dn) return;
    setSelectedUser(user);
    setIsDetailsDrawerVisible(true);
    fetchUserDetails(user.dn);
  }, [fetchUserDetails]);

  // ==================== OTHER HANDLERS ====================

  const handleCreateUser = useCallback(() => {
    setIsCreateModalVisible(true);
  }, []);

  const handleDeleteUser = useCallback(async (userDn) => {
    try {
      const user = users.find(u => u.dn === userDn);
      const userName = user?.cn || user?.displayName || 'ผู้ใช้';
      
      await userService.deleteUser(userDn);
      notifyUserDeleted(userName);
      
      // Invalidate cache and refresh
      apiCache.invalidate('/api/users');
      await fetchUsers(true, true);
    } catch (error) {
      handleApiError(error, ERROR_MESSAGES.DELETE_USER, notifyError);
    }
  }, [users, fetchUsers, notifyUserDeleted, notifyError]);

  const handleToggleStatus = useCallback(async (userDn) => {
    try {
      const user = users.find(u => u.dn === userDn);
      const userName = user?.cn || user?.displayName || 'ผู้ใช้';
      const newStatus = !user?.isEnabled;
      
      const result = await userService.toggleUserStatus(userDn, newStatus);
      
      if (result.success) {
        notifyUserStatusChanged(userName, result.data.isEnabled);
      } else {
        throw new Error(result.error);
      }
      
      // Invalidate cache and refresh
      apiCache.invalidate('/api/users');
      await fetchUsers(true, true);
      
      // Refresh details if drawer is open
      if (isDetailsDrawerVisible && selectedUser?.dn === userDn) {
        const updatedUser = { ...selectedUser, isEnabled: result.data?.isEnabled ?? !selectedUser.isEnabled };
        setSelectedUser(updatedUser);
      }
    } catch (error) {
      handleApiError(error, ERROR_MESSAGES.TOGGLE_STATUS, notifyError);
    }
  }, [users, fetchUsers, isDetailsDrawerVisible, selectedUser, notifyUserStatusChanged, notifyError]);

  const handleResetPassword = useCallback((user) => {
    setSelectedUser(user);
    passwordForm.resetFields();
    setIsPasswordModalVisible(true);
  }, [passwordForm]);

  const handlePasswordModalOk = useCallback(async () => {
    try {
      const values = await passwordForm.validateFields();
      
      if (!selectedUser?.dn) {
        message.error('No user selected');
      return;
    }
    
      await userService.resetPassword(selectedUser.dn, values.password);
      
      notifyPasswordReset(getUserDisplayName(selectedUser));
      setIsPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      // Don't log full error (may contain password)
      notifyError('Reset Password Failed', error?.response?.data?.detail || error?.message || 'Failed to reset password');
    }
  }, [selectedUser, passwordForm, message, notifyPasswordReset, getUserDisplayName, notifyError]);

  const handleDepartmentFilterChange = useCallback((value) => {
    setDepartmentFilter(value);
    updateURLParams({ department: value });
  }, [updateURLParams]);

  const handleStatusFilterChange = useCallback((value) => {
    setStatusFilter(value);
    updateURLParams({ status: value });
  }, [updateURLParams]);

  const handleWifiOuFilterChange = useCallback((value) => {
    const newValue = value || '';
    setWifiOuFilter(newValue);
    if (newValue) {
      setRegularOuFilter('');
      setOuFilter(newValue);
      updateURLParams({ wifiOu: newValue, regularOu: '', ou: newValue });
    } else {
      const regularValue = regularOuFilter || '';
      setOuFilter(regularValue);
      updateURLParams({ wifiOu: '', ou: regularValue });
    }
  }, [regularOuFilter, updateURLParams]);

  const handleRegularOuFilterChange = useCallback((value) => {
    const newValue = value || '';
    setRegularOuFilter(newValue);
    if (newValue) {
      setWifiOuFilter('');
      setOuFilter(newValue);
      updateURLParams({ regularOu: newValue, wifiOu: '', ou: newValue });
    } else {
      const wifiValue = wifiOuFilter || '';
      setOuFilter(wifiValue);
      updateURLParams({ regularOu: '', ou: wifiValue });
    }
  }, [wifiOuFilter, updateURLParams]);

  const handleSearchTextChange = useCallback((value) => {
    setSearchText(value);
    if (value.length >= 2) {
      // Generate search suggestions would go here
    }
    updateURLParams({ search: value });
  }, [updateURLParams]);

  const handleBulkAction = useCallback(async (action) => {
    if (selectedRowKeys.length === 0) {
      message.warning('กรุณาเลือกผู้ใช้ก่อน');
      return;
    }
    
    setBulkActionLoading(true);
    try {
      const selectedUsers = users.filter(u => selectedRowKeys.includes(u.dn));
      let successCount = 0;
      let failCount = 0;
      
      for (const user of selectedUsers) {
        try {
          switch (action) {
            case 'enable':
              await userService.toggleUserStatus(user.dn, true);
              break;
            case 'disable':
              await userService.toggleUserStatus(user.dn, false);
              break;
            case 'delete':
              await userService.deleteUser(user.dn);
              break;
            default:
              break;
          }
          successCount++;
        } catch (error) {
          failCount++;
        }
      }
      
      if (successCount > 0) {
        message.success(`ดำเนินการสำเร็จ ${successCount} รายการ`);
        await fetchUsers(true, true);
        setSelectedRowKeys([]);
      }
      
      if (failCount > 0) {
        message.warning(`ไม่สามารถดำเนินการได้ ${failCount} รายการ`);
      }
    } catch (error) {
      handleApiError(error, 'Bulk action failed', notifyError);
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedRowKeys, users, fetchUsers, message, notifyError]);

  // Generate search suggestions
  const generateSearchSuggestions = useCallback((query) => {
    if (!query || query.length < 2) {
      setSearchSuggestions([]);
      return;
    }
    
    const suggestions = [];
    const lowerQuery = query.toLowerCase();
    
    // Suggest departments
    departments.forEach(dept => {
      if (dept.toLowerCase().includes(lowerQuery)) {
        suggestions.push({
          type: 'department',
          label: `แผนก: ${dept}`,
          value: dept,
          icon: <TeamOutlined />
        });
      }
    });
    
    // Suggest common usernames (from current users)
    const userSuggestions = users
      .filter(u => {
        const name = (u.cn || u.displayName || u.sAMAccountName || '').toLowerCase();
        return name.includes(lowerQuery);
      })
      .slice(0, 5)
      .map(u => ({
        type: 'user',
        label: u.cn || u.displayName || u.sAMAccountName,
        value: u.sAMAccountName,
        icon: <UserOutlined />
      }));
    
    suggestions.push(...userSuggestions);
    setSearchSuggestions(suggestions.slice(0, 10));
  }, [departments, users]);

  // Separate WiFi OUs and Regular OUs
  const { wifiOUs, regularOUs } = useMemo(() => {
    const wifi = [];
    const regular = [];
    
    availableOUs.forEach(ou => {
      const dn = (ou.dn || '').toLowerCase();
      const isWifi = dn.includes('ou=wifi');
      
      if (isWifi) {
        wifi.push(ou);
      } else {
        regular.push(ou);
      }
    });
    
    return { wifiOUs: wifi, regularOUs: regular };
  }, [availableOUs]);

  // Helper function to build tree structure
  const buildTreeStructure = useCallback((ous) => {
    if (!ous || ous.length === 0) return [];

    const getParentDn = (dn) => {
      const parts = dn.split(',');
      if (parts.length <= 1) return null;
      return parts.slice(1).join(',');
    };

    const ouMap = new Map();
    ous.forEach(ou => {
      const ouName = ou.name || ou.dn.split(',')[0].replace('OU=', '');
      const fullPath = ou.fullPath || ouName;
      
      ouMap.set(ou.dn, {
        title: (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            padding: '4px 0',
            width: '100%'
          }}>
            <BankOutlined style={{ 
              fontSize: '16px', 
              color: '#3b82f6',
              flexShrink: 0
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: '15px', 
                fontWeight: 500,
                color: '#1f2937',
                lineHeight: '1.5'
              }}>
                {ouName}
              </div>
              {fullPath !== ouName && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6b7280',
                  marginTop: '2px',
                  lineHeight: '1.4'
                }}>
                  {fullPath}
                </div>
              )}
            </div>
          </div>
        ),
        value: ou.dn,
        key: ou.dn,
        fullPath: fullPath,
        name: ouName,
        dn: ou.dn,
        children: []
      });
    });

    const tree = [];
    const processed = new Set();

    ous.forEach(ou => {
      const parentDn = getParentDn(ou.dn);
      
      if (parentDn && ouMap.has(parentDn)) {
        const parent = ouMap.get(parentDn);
        const node = ouMap.get(ou.dn);
        if (!processed.has(ou.dn)) {
          parent.children.push(node);
          processed.add(ou.dn);
        }
      } else {
        const node = ouMap.get(ou.dn);
        if (!processed.has(ou.dn)) {
          tree.push(node);
          processed.add(ou.dn);
        }
      }
    });

    const sortTree = (nodes) => {
      nodes.sort((a, b) => {
        const nameA = String(a.name || '');
        const nameB = String(b.name || '');
        return nameA.localeCompare(nameB);
      });
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortTree(node.children);
        }
      });
    };

    sortTree(tree);
    return tree;
  }, []);

  const wifiTreeData = useMemo(() => {
    return buildTreeStructure(wifiOUs);
  }, [wifiOUs, buildTreeStructure]);

  const regularTreeData = useMemo(() => {
    return buildTreeStructure(regularOUs);
  }, [regularOUs, buildTreeStructure]);

  // Combined tree data for CreateUserModal (all OUs)
  const ouTreeData = useMemo(() => {
    return buildTreeStructure(availableOUs);
  }, [availableOUs, buildTreeStructure]);

  // (Render functions and table columns moved to UserTable.js component)
  
  // ==================== RENDER ====================

    return (
    <div className="umx-root">
      {/* Header Section - Match Image Design */}
      <header className={`umx-header-redesign ${isHeaderSticky ? 'umx-header-sticky' : ''}`}>
        <div className="umx-header-wrapper">
          {/* Top Row: Badge, Title, Buttons */}
          <div className="umx-header-top-row">
            <div className="umx-header-left-section">
              <Button 
                type="primary" 
                icon={<GlobalOutlined />}
                className="umx-directory-badge"
              >
                DIRECTORY
              </Button>
            </div>
            
            <div className="umx-header-right-section">
              <Button 
                type="primary" 
                icon={<UserAddOutlined />} 
                onClick={handleCreateUser}
                className="umx-create-user-btn"
              >
                สร้างผู้ใช้
              </Button>
              
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'refresh',
                      icon: <ReloadOutlined />,
                      label: 'รีเฟรชข้อมูล',
                      onClick: () => fetchUsers(true)
                    },
                    {
                      key: 'filter',
                      icon: <FilterOutlined />,
                      label: 'ตัวกรองขั้นสูง',
                      onClick: () => openAdvancedFilterDrawer()
                    },
                    {
                      key: 'columns',
                      icon: <TagOutlined />,
                      label: 'ตั้งค่าคอลัมน์',
                      onClick: () => setIsColumnSettingsVisible(true)
                    },
                    {
                      type: 'divider'
                    },
                    {
                      key: 'export',
                      icon: <ExportOutlined />,
                      label: 'ส่งออกข้อมูล',
                      disabled: true
                    }
                  ]
                }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button
                  icon={<SettingOutlined />}
                  size="large"
                  type="text"
                  className="umx-settings-btn"
                />
              </Dropdown>
            </div>
          </div>
          
          {/* Title Section */}
          <div className="umx-title-section">
            <Title level={3} className="umx-page-title" style={{ 
              marginBottom: 8,
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
              fontSize: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <UserOutlined style={{ color: '#ffffff', fontSize: 36, filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))' }} />
              User Management
            </Title>
            <Text className="umx-page-subtitle" style={{ 
              fontSize: '15px', 
              fontWeight: 500,
              color: '#ffffff',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
            }}>
              Manage and organize user accounts in your Active Directory
            </Text>
          </div>
          
          {/* Statistics Cards - Match Image */}
          <div className="umx-stats-grid">
            {heroMetrics.map((metric, index) => {
              const icons = [
                <UserOutlined key="users" />,
                <CheckCircleOutlined key="enabled" />,
                <CloseCircleOutlined key="disabled" />,
                <BarChartOutlined key="current" />
              ];
              
              return (
                <div 
                  key={metric.key} 
                  className="umx-stat-card-new"
                  onClick={metric.onClick}
                  style={{ '--card-color': metric.accent }}
                >
                  <div className="umx-stat-icon-new" style={{ color: metric.accent }}>
                    {icons[index]}
                  </div>
                  <div className="umx-stat-text">
                    <div className="umx-stat-label-new">{metric.label}</div>
                    <div className="umx-stat-value-new" style={{ color: metric.accent }}>
                      {metric.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="umx-main-content">
        {/* Bulk Action Bar */}
        {selectedRowKeys.length > 0 && (
          <BulkActionBar
            selectedCount={selectedRowKeys.length}
            onClearSelection={() => setSelectedRowKeys([])}
            onBulkAction={handleBulkAction}
            loading={bulkActionLoading}
          />
        )}
        
        {/* UserTable component with FilterBar inside */}
        <Card className="umx-table-card" styles={{ body: { padding: 0 } }}>
          {/* Filter Bar inside Card */}
          <div className="umx-filter-bar-inside-card">
      <FilterBar
        searchText={searchText}
        onSearchChange={(value) => {
          if (process.env.NODE_ENV === 'development') {
            console.debug('[UserManagement] FilterBar onSearchChange called', {
              value,
              currentSearchText: searchText,
              usersCount: users.length,
              dedupedUsersCount: dedupedUsers.length
            });
          }
          handleSearchTextChange(value);
          generateSearchSuggestions(value);
          setShowSearchSuggestions(value.length >= 2);
          // Reset to first page when searching
          setCurrentPage(1);
        }}
        onSearchFocus={() => {
          if (searchText.length >= 2) {
            setShowSearchSuggestions(true);
          }
        }}
        onSearchBlur={() => {
          setTimeout(() => setShowSearchSuggestions(false), 200);
        }}
        searchPlaceholder="ค้นหาด้วยชื่อ / Username / Email"
        onOpenOuModal={() => setIsOuModalVisible(true)}
        departmentFilter={departmentFilter}
        statusFilter={statusFilter}
        onDepartmentFilterChange={handleDepartmentFilterChange}
        onStatusFilterChange={handleStatusFilterChange}
        departments={departments}
        activeFilterTags={activeFilterTags}
        onFilterTagClose={handleFilterTagClose}
        onClearAllFilters={handleClearAllFilters}
        showSearchSuggestions={showSearchSuggestions}
        searchSuggestions={searchSuggestions}
        onSuggestionClick={(item) => {
          if (item.type === 'department') {
            setDepartmentFilter(item.value);
          } else {
            setSearchText(item.value);
          }
          setShowSearchSuggestions(false);
        }}
        compact={true}
              isFilterSticky={false}
          />
          </div>
          
          <UserTable
            users={users}
            paginatedUsers={paginatedUsers}
            filteredUsers={filteredUsers}
            selectedRowKeys={selectedRowKeys}
            setSelectedRowKeys={setSelectedRowKeys}
          loading={loading}
            screens={screens}
            visibleColumns={visibleColumns}
            sortedInfo={sortedInfo}
            setSortedInfo={setSortedInfo}
            tableScrollY={tableScrollY}
            openDropdownKey={openDropdownKey}
            setOpenDropdownKey={setOpenDropdownKey}
            activeFilterTags={activeFilterTags}
            directoryCounts={directoryCounts}
            isFilteredView={isFilteredView}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            formatCount={formatCount}
            handleViewDetails={handleViewDetails}
            handleEditUser={handleEditUser}
            handleToggleStatus={handleToggleStatus}
            handleDeleteUser={handleDeleteUser}
            handleResetPassword={handleResetPassword}
            handleClearAllFilters={handleClearAllFilters}
          />
      </Card>
      </main>

      {/* Modals and Drawers */}
      <CreateUserModal
        visible={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        fetchUsers={fetchUsers}
        availableOUs={availableOUs}
        categorizedGroups={categorizedGroups}
        ouTreeData={ouTreeData}
        loadingOUs={loadingOUs}
        screens={screens}
      />
      
      <EditUserModal
        visible={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        editingUser={editingUser}
        editForm={editForm}
        fetchUsers={fetchUsers}
        getResponsiveWidth={(screens, desktop, tablet, mobile) => {
          if (screens.xl || screens.lg) return desktop;
          if (screens.md || screens.sm) return tablet;
          return mobile;
        }}
        screens={screens}
      />

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
        destroyOnHidden
        width={(() => {
          if (screens.xl || screens.lg) return 500;
          if (screens.md || screens.sm) return 420;
          return '90%';
        })()}
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
                  Manage User Groups
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {managingUser?.cn || managingUser?.displayName || 'N/A'}
                </Text>
              </div>
            </Space>
          </div>
        }
        open={isManageGroupsModalVisible}
        onCancel={() => {
          setIsManageGroupsModalVisible(false);
          setManagingUser(null);
          setUserOriginalGroups([]);
          setUserSelectedGroups([]);
          setSuggestedGroupsData(null);
        }}
        onOk={handleSaveGroupChanges}
        okText="Save Changes"
        cancelText="Cancel"
        width={(() => {
          if (screens.xl || screens.lg) return 900;
          if (screens.md || screens.sm) return 700;
          return '95%';
        })()}
        destroyOnHidden
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            border: 'none',
            fontWeight: 600,
            borderRadius: 8
          }
        }}
      >
        <Tabs defaultActiveKey="1" items={manageGroupsTabsItems} style={{ minHeight: 500 }} />
      </Modal>
      
      {/* OU Selection Modal - Enhanced Version */}
      <Modal
        title={
          <div style={{
            padding: '12px 0',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <Space size="middle" align="center">
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: 10,
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}>
                <BankOutlined style={{ fontSize: 24, color: '#ffffff' }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
                  เลือก OU (Organizational Unit)
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  กรองผู้ใช้ตาม OU
                </Text>
              </div>
            </Space>
          </div>
        }
        open={isOuModalVisible}
        onCancel={() => setIsOuModalVisible(false)}
        footer={[
          <Button
            key="clear"
            onClick={() => {
              handleWifiOuFilterChange('');
              handleRegularOuFilterChange('');
            }}
            disabled={!wifiOuFilter && !regularOuFilter}
          >
            <ClearOutlined /> ล้างการเลือก
          </Button>,
          <Button
            key="cancel"
            onClick={() => setIsOuModalVisible(false)}
          >
            ยกเลิก
          </Button>,
          <Button
            key="apply"
            type="primary"
            onClick={() => setIsOuModalVisible(false)}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none'
            }}
          >
            <CheckCircleOutlined /> ยืนยัน
          </Button>
        ]}
        width={(() => {
          if (screens.xl || screens.lg) return 800;
          if (screens.md || screens.sm) return 700;
          return '95%';
        })()}
        destroyOnHidden
      >
        <div style={{ padding: '20px 0' }}>
          {/* Selected OU Preview */}
          {(wifiOuFilter || regularOuFilter) && (
            <div style={{
              marginBottom: 20,
              padding: '16px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              borderRadius: 12,
              border: '2px solid #3b82f6',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
            }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Space>
                    <CheckCircleOutlined style={{ fontSize: 18, color: '#3b82f6' }} />
                    <Text strong style={{ fontSize: 14, color: '#1e40af' }}>
                      OU ที่เลือก:
                    </Text>
                  </Space>
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<ClearOutlined />}
                    onClick={() => {
                      handleWifiOuFilterChange('');
                      handleRegularOuFilterChange('');
                    }}
                  >
                    ล้าง
                  </Button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {wifiOuFilter && (
                    <Tag
                      color="blue"
                      style={{
                        fontSize: 13,
                        padding: '6px 14px',
                        borderRadius: 6,
                        fontWeight: 500,
                        border: '1px solid #3b82f6'
                      }}
                    >
                      <ThunderboltOutlined style={{ marginRight: 6 }} />
                      WiFi: {resolveOuLabel(wifiOuFilter, availableOUs)}
                    </Tag>
                  )}
                  {regularOuFilter && (
                    <Tag
                      color="green"
                      style={{
                        fontSize: 13,
                        padding: '6px 14px',
                        borderRadius: 6,
                        fontWeight: 500,
                        border: '1px solid #10b981'
                      }}
                    >
                      <BankOutlined style={{ marginRight: 6 }} />
                      Regular: {resolveOuLabel(regularOuFilter, availableOUs)}
                    </Tag>
                  )}
                </div>
              </Space>
            </div>
          )}

          {/* Tabs for WiFi and Regular OUs */}
          <Tabs
            defaultActiveKey="wifi"
            items={[
              {
                key: 'wifi',
                label: (
                  <Space>
                    <ThunderboltOutlined style={{ color: '#3b82f6' }} />
                    <span>WiFi OUs</span>
                    {wifiOUs.length > 0 && (
                      <Badge count={wifiOUs.length} style={{ backgroundColor: '#3b82f6' }} />
                    )}
                  </Space>
                ),
                children: (
                  <div>
                    <TreeSelect
                      placeholder="ค้นหาหรือเลือก WiFi OU"
                      allowClear
                      showSearch
                      value={wifiOuFilter || undefined}
                      onChange={handleWifiOuFilterChange}
                      treeData={wifiTreeData}
                      treeDefaultExpandAll={false}
                      style={{ width: '100%' }}
                      listHeight={400}
                      loading={loadingOUs}
                      size="large"
                      filterTreeNode={(input, node) => {
                        const title = typeof node.title === 'string' ? node.title : (node.fullPath || '');
                        return title.toLowerCase().includes(input.toLowerCase());
                      }}
                      notFoundContent={
                        loadingOUs ? (
                          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                            <Spin size="large" />
                            <div style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>
                              กำลังโหลดข้อมูล WiFi OU...
                            </div>
                          </div>
                        ) : (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                              <div>
                                <div style={{ marginBottom: 8, fontSize: 14, color: '#6b7280' }}>
                                  ไม่พบ WiFi OU
                                </div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  ลองค้นหาด้วยคำอื่นหรือตรวจสอบการเชื่อมต่อ
                                </Text>
                              </div>
                            }
                            style={{ padding: '60px 20px' }}
                          />
                        )
                      }
                    />
                    {wifiOUs.length > 0 && (
                      <div style={{ marginTop: 12, padding: '8px 12px', background: '#f0f9ff', borderRadius: 6 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <InfoCircleOutlined style={{ marginRight: 6 }} />
                          พบ {wifiOUs.length} WiFi OU
                        </Text>
                      </div>
                    )}
                  </div>
                ),
                icon: <ThunderboltOutlined />
              },
              {
                key: 'regular',
                label: (
                  <Space>
                    <BankOutlined style={{ color: '#10b981' }} />
                    <span>Regular OUs</span>
                    {regularOUs.length > 0 && (
                      <Badge count={regularOUs.length} style={{ backgroundColor: '#10b981' }} />
                    )}
                  </Space>
                ),
                children: (
                  <div>
                    <TreeSelect
                      placeholder="ค้นหาหรือเลือก Regular OU"
                      allowClear
                      showSearch
                      value={regularOuFilter || undefined}
                      onChange={handleRegularOuFilterChange}
                      treeData={regularTreeData}
                      treeDefaultExpandAll={false}
                      style={{ width: '100%' }}
                      listHeight={400}
                      loading={loadingOUs}
                      size="large"
                      filterTreeNode={(input, node) => {
                        const title = typeof node.title === 'string' ? node.title : (node.fullPath || '');
                        return title.toLowerCase().includes(input.toLowerCase());
                      }}
                      notFoundContent={
                        loadingOUs ? (
                          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                            <Spin size="large" />
                            <div style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>
                              กำลังโหลดข้อมูล Regular OU...
                            </div>
                          </div>
                        ) : (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                              <div>
                                <div style={{ marginBottom: 8, fontSize: 14, color: '#6b7280' }}>
                                  ไม่พบ Regular OU
                                </div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  ลองค้นหาด้วยคำอื่นหรือตรวจสอบการเชื่อมต่อ
                                </Text>
                              </div>
                            }
                            style={{ padding: '60px 20px' }}
                          />
                        )
                      }
                    />
                    {regularOUs.length > 0 && (
                      <div style={{ marginTop: 12, padding: '8px 12px', background: '#f0fdf4', borderRadius: 6 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <InfoCircleOutlined style={{ marginRight: 6 }} />
                          พบ {regularOUs.length} Regular OU
                        </Text>
                      </div>
                    )}
                  </div>
                ),
                icon: <BankOutlined />
              }
            ]}
            style={{
              marginTop: 8
            }}
          />
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
                <TagOutlined style={{ fontSize: 22, color: '#3b82f6' }} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>
                  ตั้งค่าคอลัมน์
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  เลือกคอลัมน์ที่จะแสดงในตาราง
                </Text>
              </div>
          </Space>
          </div>
        }
        open={isColumnSettingsVisible}
        onCancel={() => setIsColumnSettingsVisible(false)}
        footer={[
          <Button key="reset" onClick={() => {
            setVisibleColumns({
              user: true,                    // Display Name
              sAMAccountName: true,          // Username
              mail: true,                    // Email
              title: false,                  // Job Title
              department: true,              // Department
              company: false,                // Company
              employeeID: false,             // Employee ID
              phone: false,                  // Phone
              mobile: false,                 // Mobile
              location: true,                // Work Location
              description: true,             // Description
              status: false,                 // Status
              userPrincipalName: false,      // User Principal Name
              manager: false,                // Manager
              lastLogon: false,              // Last Logon
              pwdLastSet: false,             // Password Last Set
              accountExpires: false,         // Account Expires
              extensionName: false        // Extension Name
            });
            message.success('รีเซ็ตการตั้งค่าคอลัมน์เป็นค่าเริ่มต้นแล้ว');
          }}>
            รีเซ็ตค่าเริ่มต้น
          </Button>,
          <Button 
            key="ok" 
            type="primary" 
            onClick={() => {
              setIsColumnSettingsVisible(false);
              message.success('บันทึกการตั้งค่าคอลัมน์เรียบร้อยแล้ว');
            }}
          >
            ตกลง
          </Button>
        ]}
        width={(() => {
          if (screens.xl || screens.lg) return 600;
          if (screens.md || screens.sm) return 500;
          return '95%';
        })()}
        destroyOnHidden
      >
        <div style={{ padding: '20px 0' }}>
          <Alert
            message="เลือกคอลัมน์ที่จะแสดงในตาราง"
            description="สามารถเปิด/ปิดการแสดงผลของแต่ละคอลัมน์ได้ตามต้องการ"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14, color: '#374151' }}>ข้อมูลพื้นฐาน</Text>
                  </div>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Checkbox
                checked={visibleColumns.user}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, user: e.target.checked })}
              >
                Display Name
              </Checkbox>
              <Checkbox
                checked={visibleColumns.sAMAccountName}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, sAMAccountName: e.target.checked })}
              >
                Username (sAMAccountName)
              </Checkbox>
              <Checkbox
                checked={visibleColumns.mail}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, mail: e.target.checked })}
              >
                Email
              </Checkbox>
              <Checkbox
                checked={visibleColumns.extensionName}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, extensionName: e.target.checked })}
              >
                Extension Name
              </Checkbox>
          </Space>
        </div>

          <Divider />

                <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14, color: '#374151' }}>ข้อมูลงาน</Text>
            </div>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Checkbox
                checked={visibleColumns.title}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, title: e.target.checked })}
              >
                Job Title
              </Checkbox>
              <Checkbox
                checked={visibleColumns.department}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, department: e.target.checked })}
              >
                Department
              </Checkbox>
              <Checkbox
                checked={visibleColumns.company}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, company: e.target.checked })}
              >
                Company
              </Checkbox>
              <Checkbox
                checked={visibleColumns.employeeID}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, employeeID: e.target.checked })}
              >
                Employee ID
              </Checkbox>
            </Space>
          </div>
                  
                  <Divider />
                  
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14, color: '#374151' }}>ข้อมูลติดต่อ</Text>
            </div>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Checkbox
                checked={visibleColumns.phone}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, phone: e.target.checked })}
              >
                Phone
              </Checkbox>
              <Checkbox
                checked={visibleColumns.mobile}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, mobile: e.target.checked })}
              >
                Mobile
              </Checkbox>
              <Checkbox
                checked={visibleColumns.location}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, location: e.target.checked })}
              >
                Office Location
              </Checkbox>
            </Space>
                </div>

          <Divider />

                <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14, color: '#374151' }}>ข้อมูลระบบ</Text>
            </div>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Checkbox
                checked={visibleColumns.status}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, status: e.target.checked })}
              >
                Status
              </Checkbox>
              <Checkbox
                checked={visibleColumns.userPrincipalName}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, userPrincipalName: e.target.checked })}
              >
                User Principal Name
              </Checkbox>
              <Checkbox
                checked={visibleColumns.manager}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, manager: e.target.checked })}
              >
                Manager
              </Checkbox>
              <Checkbox
                checked={visibleColumns.lastLogon}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, lastLogon: e.target.checked })}
              >
                Last Logon
              </Checkbox>
              <Checkbox
                checked={visibleColumns.pwdLastSet}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, pwdLastSet: e.target.checked })}
              >
                Password Last Set
              </Checkbox>
              <Checkbox
                checked={visibleColumns.accountExpires}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, accountExpires: e.target.checked })}
              >
                Account Expires
              </Checkbox>
            </Space>
                </div>

          <Divider />

          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14, color: '#374151' }}>อื่นๆ</Text>
            </div>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Checkbox
                checked={visibleColumns.description}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, description: e.target.checked })}
              >
                Description
              </Checkbox>
            </Space>
          </div>
        </div>
      </Modal>
      
      <UserDetailsDrawer
        visible={isDetailsDrawerVisible}
        onClose={() => setIsDetailsDrawerVisible(false)}
        user={selectedUser}
        getResponsiveWidth={(desktop, tablet, mobile) => {
          if (screens.xl || screens.lg) return desktop;
          if (screens.md || screens.sm) return tablet;
          return mobile;
        }}
        fetchUserDetails={fetchUserDetails}
        userGroups={userGroups}
        userPermissions={userPermissions}
        loginHistory={loginHistory}
        passwordExpiry={passwordExpiry}
        categorizedGroups={categorizedGroups}
        onManageGroups={handleManageGroups}
        onQuickAddGroup={handleQuickAddGroup}
        onRemoveFromGroup={handleRemoveFromGroup}
        notifyError={notifyError}
      />
      
      {/* Hidden Forms to suppress useForm warnings - used programmatically */}
      {/* These forms are always rendered to prevent React warnings about unconnected form instances */}
      <Form 
        form={filterForm} 
        style={{ display: 'none' }}
        preserve={false}
      >
        <Form.Item name="department">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="ou">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="status">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="dateRange">
          <DatePicker.RangePicker style={{ display: 'none' }} />
        </Form.Item>
      </Form>
      
      {/* Hidden Form for editForm - always connected to suppress warning */}
      <Form 
        form={editForm} 
        style={{ display: 'none' }}
        preserve={false}
      >
        <Form.Item name="cn">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="sAMAccountName">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="mail">
          <Input style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="accountOption">
          <Input style={{ display: 'none' }} />
        </Form.Item>
      </Form>
      
      {/* Hidden Form for passwordForm - always connected to suppress warning */}
      <Form 
        form={passwordForm} 
        style={{ display: 'none' }}
        preserve={false}
      >
        <Form.Item name="password">
          <Input.Password style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name="confirmPassword">
          <Input.Password style={{ display: 'none' }} />
        </Form.Item>
      </Form>
    </div>
  );
};

export default UserManagement;

