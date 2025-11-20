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
  Spin
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
import { useUsers } from '../hooks/useUsers';
import { useGroups } from '../hooks/useGroups';
import { useOUs } from '../hooks/useOUs';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { userService } from '../services/userService';
import { groupService } from '../services/groupService';
import { ouService } from '../services/ouService';
import { useNotification } from '../contexts/NotificationContext';
import { GROUP_DEFAULTS_CONFIG, getDefaultGroupsForOU, getCategoryStatistics } from '../config/groupDefaults';
import { apiCache } from '../utils/cache';
import {
  formatCount,
  resolveOuLabel,
  formatErrorDetail,
  deduplicateUsers as deduplicateUserRecords
} from '../utils/userManagementHelpers';
import {
  transformFormDataToApiFormat,
  convertAccountOptionToFields,
  prepareUpdateData,
  hasFormChanges,
  getSelectedAccountOption,
  parseAccountOptions
} from '../utils/userFormHelpers';
import {
  isSameUser,
  updateUserInArray,
  getUserDisplayName
} from '../utils/userHelpers';
import { handleApiError } from '../utils/errorHandler';
import { parseCreateUserError, parseUpdateUserError } from '../utils/userErrorParsers';
import { handleCreateUserSuccess, refreshUserAfterUpdate } from '../utils/userActionHelpers';
import {
  TIMING,
  PAGINATION,
  TABLE_CONFIG,
  ERROR_MESSAGES,
  EMPTY_CATEGORIZED_GROUPS
} from '../constants/userManagement';
import FilterBar from './FilterBar';
import BulkActionBar from './BulkActionBar';
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
  const [selectedOU, setSelectedOU] = useState(null);
  const [loadingOUs, setLoadingOUs] = useState(false);
  const [categorizedGroups, setCategorizedGroups] = useState({});
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [currentTab, setCurrentTab] = useState('1');
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
  const [pageSize, setPageSize] = useState(PAGINATION.CLIENT_PAGE_SIZE);
  const [tableScrollY, setTableScrollY] = useState(TABLE_CONFIG.SCROLL_Y);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState(null);
  const [openDropdownKey, setOpenDropdownKey] = useState(null);
  
  // Level 3: Premium Features States
  // Real-time updates
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(30); // seconds
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  
  // Activity feed
  const [isActivityFeedVisible, setIsActivityFeedVisible] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // Filter presets & history
  const [filterPresets, setFilterPresets] = useState([]);
  const [filterHistory, setFilterHistory] = useState([]);
  const [isFilterPresetModalVisible, setIsFilterPresetModalVisible] = useState(false);
  const [presetForm] = Form.useForm();
  
  // Table views & customization
  const [tableView, setTableView] = useState('table'); // 'table', 'grid', 'compact'
  const [columnOrder, setColumnOrder] = useState([]);
  const [isColumnCustomizationVisible, setIsColumnCustomizationVisible] = useState(false);
  
  // Bulk actions
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [isBulkActionModalVisible, setIsBulkActionModalVisible] = useState(false);
  
  // Smart search
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  
  // Analytics
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isAnalyticsVisible, setIsAnalyticsVisible] = useState(false);
  
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
  
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
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
      // Silently fail - form validation will show errors
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
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = apiCache.get(cacheKey);
        if (cachedData) {
          setUsers(cachedData);
          await fetchDirectoryCounts();
          return { success: true, count: cachedData.length };
        }
      }
      
      // Load data
      const result = await userService.getUsers(params);
      const userData = result || [];
      
      setUsers(userData);
      await fetchDirectoryCounts();

      return { success: true, count: userData.length };
    } catch (error) {
      const detail = error?.response?.data?.detail || error?.message || 'ไม่ทราบสาเหตุ';
      message.error(`ไม่สามารถโหลดข้อมูลผู้ใช้ได้: ${detail}`);
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
      const userDetails = await userService.getUser(userDn).catch(() => selectedUser);

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
    setTimeout(() => {
      fetchDepartments();
      fetchAvailableGroups();
      loadUserOUs();
      loadCategorizedGroups();
    }, TIMING.DEFERRED_LOAD_DELAY);
  }, [fetchUsers, fetchDepartments, fetchAvailableGroups, fetchUserOUs, fetchCategorizedGroups]);

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

  // Set edit form values when edit modal opens
  useEffect(() => {
    if (isEditModalVisible && editingUser) {
      // Determine which account option is selected
      const selectedAccountOption = getSelectedAccountOption(editingUser);
      
      // Set form values with fresh user data
      // Use setTimeout to ensure Form component is mounted
      setTimeout(() => {
        editForm.setFieldsValue({
          cn: editingUser.cn,
          sAMAccountName: editingUser.sAMAccountName,
          mail: editingUser.mail,
          displayName: editingUser.displayName,
          givenName: editingUser.givenName,
          sn: editingUser.sn,
          title: editingUser.title,
          telephoneNumber: editingUser.telephoneNumber,
          mobile: editingUser.mobile,
          department: editingUser.department,
          company: editingUser.company,
          employeeID: editingUser.employeeID,
          physicalDeliveryOfficeName: editingUser.physicalDeliveryOfficeName,
          streetAddress: editingUser.streetAddress,
          l: editingUser.l,
          st: editingUser.st,
          postalCode: editingUser.postalCode,
          co: editingUser.co,
          description: editingUser.description,
          // Account option (single selection)
          accountOption: selectedAccountOption,
        });
      }, 0);
    }
  }, [isEditModalVisible, editingUser, editForm]);

  // Handler functions for user groups management
  const handleManageGroups = useCallback(async (user) => {
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
      
      // Fetch suggestions
      try {
        const data = await ouService.getSuggestedGroups(userOUDN);
        setSuggestedGroupsData(data);
      } catch (error) {
        // Silently fail - suggestions are optional
        setSuggestedGroupsData(null);
      }
    }
    
    setIsManageGroupsModalVisible(true);
  }, [userGroups]);

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

  // Create tabs items for user details drawer
  const userDetailsTabsItems = useMemo(() => {
    if (!selectedUser) return [];
    
    return [
      {
        key: '1',
        label: (
          <span>
            <IdcardOutlined />
            Basic Info
          </span>
        ),
        children: (
          <>
            <Card
              size="small"
              style={{
                marginBottom: 16,
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 8
              }}
              styles={{ body: { padding: 0 } }}
            >
              <Descriptions
                column={1}
                bordered
                size="middle"
                styles={{
                  label: {
                    background: '#f8fafc',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: 13,
                    width: '35%'
                  },
                  content: {
                    background: '#ffffff',
                    color: '#1f2937'
                  }
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
              styles={{
                header: {
                  background: '#f8fafc',
                  borderBottom: '1px solid #e5e7eb'
                },
                body: { padding: 0 }
              }}
            >
              <Descriptions
                column={1}
                bordered
                size="middle"
                styles={{
                  label: {
                    background: '#f8fafc',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: 13,
                    width: '35%'
                  },
                  content: {
                    background: '#ffffff',
                    color: '#1f2937'
                  }
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
          </>
        )
      },
      {
        key: '2',
        label: (
          <span>
            <TeamOutlined />
            Groups ({userGroups.length})
          </span>
        ),
        children: (
          <>
            {/* Statistics Cards */}
            {Object.keys(categoryStats).length > 0 && (
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {Object.entries(categoryStats)
                  .filter(([_, stats]) => stats.total > 0)
                  .slice(0, 4)
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
                    styles={{ popup: { root: { minWidth: 200 } } }}
                  >
                    <Option value="quickAdd" disabled>
                      <TeamOutlined /> Quick Add
                    </Option>
                    <Option value="manage" style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <TeamOutlined /> Manage All...
                    </Option>
                    {GROUP_DEFAULTS_CONFIG.quickAdd.popularGroups.map(groupName => {
                      let groupDn = null;
                      Object.values(categorizedGroups).forEach(categoryGroups => {
                        const group = categoryGroups.find(g => g.cn === groupName);
                        if (group) groupDn = group.dn;
                      });
                      
                      if (!groupDn) return null;
                      
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
                    const categoryGroupsInUser = userGroups.filter(group => {
                      let belongsToCategory = false;
                      if (categorizedGroups[category]) {
                        belongsToCategory = categorizedGroups[category].some(cg => cg.dn === group.dn);
                      }
                      
                      if (!belongsToCategory) return false;
                      
                      if (groupSearchText) {
                        return group.cn.toLowerCase().includes(groupSearchText.toLowerCase());
                      }
                      
                      if (groupCategoryFilter !== 'all' && category !== groupCategoryFilter) {
                        return false;
                      }
                      
                      return true;
                    });
                    
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
                        styles={{
                          header: {
                            background: '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
                            cursor: 'pointer',
                            padding: '12px 16px'
                          },
                          body: { padding: categoryGroupsInUser.length > 0 ? '12px' : '0' }
                        }}
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
          </>
        )
      },
      {
        key: '3',
        label: (
          <span>
            <SafetyCertificateOutlined />
            Permissions
          </span>
        ),
        children: (
          <Card
            size="small"
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 8
            }}
            styles={{ body: { padding: '12px' } }}
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
        )
      },
      {
        key: '4',
        label: (
          <span>
            <HistoryOutlined />
            Login History
          </span>
        ),
        children: (
          <>
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
                styles={{ body: { padding: '16px' } }}
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
                        styles={{
                          label: { fontSize: 12, color: '#6b7280', fontWeight: 600 },
                          content: { fontSize: 12, color: '#1f2937' }
                        }}
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
              styles={{ body: { padding: '12px' } }}
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
          </>
        )
      }
    ];
  }, [selectedUser, userGroups, userPermissions, loginHistory, passwordExpiry, categoryStats, categorizedGroups, groupSearchText, groupCategoryFilter, expandedCategories, handleQuickAddGroup, handleManageGroups, handleRemoveFromGroup, setGroupCategoryFilter, setGroupSearchText, setExpandedCategories]);

  // Manage Groups Modal tabs items - simplified version
  const manageGroupsTabsItems = useMemo(() => {
    if (!selectedUser) return [];
    
    return [
      {
        key: '1',
        label: (
          <span>
            <IdcardOutlined />
            Basic Info
          </span>
        ),
        children: (
          <Card
            size="small"
            style={{
              marginBottom: 16,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 8
            }}
            styles={{ body: { padding: 0 } }}
          >
            <Descriptions
              column={1}
              bordered
              size="middle"
              styles={{
                label: {
                  background: '#f8fafc',
                  color: '#374151',
                  fontWeight: 600,
                  fontSize: 13,
                  width: '35%'
                },
                content: {
                  background: '#ffffff',
                  color: '#1f2937'
                }
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
            </Descriptions>
          </Card>
        )
      }
    ];
  }, [selectedUser]);

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
    debouncedFetchUsers(false, false);
    
    // Cleanup debounce on unmount
    return () => {
      debouncedFetchUsers.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, departmentFilter, ouFilter]);

  // ==================== LEVEL 3: PREMIUM FEATURES ====================
  
  // Load filter presets from localStorage on mount
  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem('umx_filter_presets');
      if (savedPresets) {
        setFilterPresets(JSON.parse(savedPresets));
      }
      
      const savedHistory = localStorage.getItem('umx_filter_history');
      if (savedHistory) {
        setFilterHistory(JSON.parse(savedHistory));
      }
      
      const savedColumnOrder = localStorage.getItem('umx_column_order');
      if (savedColumnOrder) {
        setColumnOrder(JSON.parse(savedColumnOrder));
      }
    } catch (error) {
      console.error('Error loading saved preferences:', error);
    }
  }, []);

  // Real-time auto-refresh (polling)
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const interval = setInterval(() => {
      // Only refresh if tab is active
      if (document.visibilityState === 'visible') {
        fetchUsers(false, false);
        setLastRefreshTime(new Date());
      }
    }, autoRefreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, autoRefreshInterval, fetchUsers]);

  // Fetch recent activities for activity feed
  const loadRecentActivities = useCallback(async () => {
    if (!isActivityFeedVisible) return;
    
    setActivityLoading(true);
    try {
      const result = await fetchRecentActivities({ limit: 20 });
      if (result.success) {
        setRecentActivities(result.data || []);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setActivityLoading(false);
    }
  }, [isActivityFeedVisible, fetchRecentActivities]);

  useEffect(() => {
    if (isActivityFeedVisible) {
      loadRecentActivities();
      // Refresh activities every 30 seconds when feed is visible
      const interval = setInterval(loadRecentActivities, 30000);
      return () => clearInterval(interval);
    }
  }, [isActivityFeedVisible, loadRecentActivities]);

  // Smart search suggestions
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

  // Filter presets management
  const saveFilterPreset = useCallback((name) => {
    const preset = {
      id: Date.now(),
      name,
      filters: {
        searchText,
        departmentFilter,
        statusFilter,
        wifiOuFilter,
        regularOuFilter,
        ouFilter,
        dateRangeFilter
      },
      createdAt: new Date().toISOString()
    };
    
    const newPresets = [preset, ...filterPresets].slice(0, 10);
    setFilterPresets(newPresets);
    localStorage.setItem('umx_filter_presets', JSON.stringify(newPresets));
    message.success(`บันทึก filter preset "${name}" แล้ว`);
  }, [searchText, departmentFilter, statusFilter, wifiOuFilter, regularOuFilter, ouFilter, dateRangeFilter, filterPresets, message]);

  const loadFilterPreset = useCallback((preset) => {
    const { filters } = preset;
    setSearchText(filters.searchText || '');
    setDepartmentFilter(filters.departmentFilter || '');
    setStatusFilter(filters.statusFilter || 'all');
    setWifiOuFilter(filters.wifiOuFilter || '');
    setRegularOuFilter(filters.regularOuFilter || '');
    setOuFilter(filters.ouFilter || '');
    setDateRangeFilter(filters.dateRangeFilter || null);
    
    // Add to history
    const newHistory = [preset, ...filterHistory.filter(h => h.id !== preset.id)].slice(0, 10);
    setFilterHistory(newHistory);
    localStorage.setItem('umx_filter_history', JSON.stringify(newHistory));
    
    message.success(`โหลด filter preset "${preset.name}" แล้ว`);
  }, [filterHistory, message]);

  const deleteFilterPreset = useCallback((presetId) => {
    const newPresets = filterPresets.filter(p => p.id !== presetId);
    setFilterPresets(newPresets);
    localStorage.setItem('umx_filter_presets', JSON.stringify(newPresets));
    message.success('ลบ filter preset แล้ว');
  }, [filterPresets, message]);

  // Bulk actions
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
      setIsBulkActionModalVisible(false);
    }
  }, [selectedRowKeys, users, fetchUsers, message, notifyError]);

  // ==================== HANDLERS ====================
  
  // Update URL params when filters change
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

  const handleDepartmentFilterChange = useCallback((value) => {
    setDepartmentFilter(value);
    updateURLParams({ department: value });
  }, [updateURLParams]);

  const handleWifiOuFilterChange = useCallback((value) => {
    const newValue = value || '';
    setWifiOuFilter(newValue);
    // Clear regular OU filter when WiFi OU is selected
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
    // Clear WiFi OU filter when Regular OU is selected
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

  // Legacy handler for backward compatibility
  const handleOuFilterChange = useCallback((value) => {
    setOuFilter(value || '');
    // Try to determine if it's WiFi or Regular
    const isWifi = value && value.toLowerCase().includes('ou=wifi');
    if (isWifi) {
      setWifiOuFilter(value);
      setRegularOuFilter('');
    } else {
      setRegularOuFilter(value);
      setWifiOuFilter('');
    }
  }, []);

  // Active OU filter (WiFi or Regular)
  const activeOuFilter = wifiOuFilter || regularOuFilter || ouFilter;

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

    // Helper function to parse DN and extract parent DN
    const getParentDn = (dn) => {
      const parts = dn.split(',');
      if (parts.length <= 1) return null;
      return parts.slice(1).join(',');
    };

    // Create a map of DN to OU data with enhanced display
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

    // Build tree structure
    const tree = [];
    const processed = new Set();

    ous.forEach(ou => {
      const parentDn = getParentDn(ou.dn);
      
      if (parentDn && ouMap.has(parentDn)) {
        // Has parent - add to parent's children
        const parent = ouMap.get(parentDn);
        const node = ouMap.get(ou.dn);
        if (!processed.has(ou.dn)) {
          parent.children.push(node);
          processed.add(ou.dn);
        }
      } else {
        // Root level OU
        const node = ouMap.get(ou.dn);
        if (!processed.has(ou.dn)) {
          tree.push(node);
          processed.add(ou.dn);
        }
      }
    });

    // Sort tree nodes (use name instead of title since title is JSX element)
    const sortTree = (nodes) => {
      nodes.sort((a, b) => {
        // Use name property which is always a string
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

  // Convert WiFi OUs to tree structure
  const wifiTreeData = useMemo(() => {
    return buildTreeStructure(wifiOUs);
  }, [wifiOUs, buildTreeStructure]);

  // Convert Regular OUs to tree structure
  const regularTreeData = useMemo(() => {
    return buildTreeStructure(regularOUs);
  }, [regularOUs, buildTreeStructure]);

  // Legacy ouTreeData for backward compatibility (combines both)
  const ouTreeData = useMemo(() => {
    return [...wifiTreeData, ...regularTreeData];
  }, [wifiTreeData, regularTreeData]);

  const handleStatusFilterChange = useCallback((value) => {
    setStatusFilter(value);
    updateURLParams({ status: value });
  }, [updateURLParams]);
  
  // Handle search text change with URL update
  const handleSearchTextChange = useCallback((value) => {
    setSearchText(value);
    generateSearchSuggestions(value);
    setShowSearchSuggestions(value.length >= 2);
    updateURLParams({ search: value });
  }, [updateURLParams, generateSearchSuggestions]);
  
  // Handle metric click - apply filter
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
        // Clear status filter to show all
        setStatusFilter('all');
        updateURLParams({ status: 'all' });
        break;
      default:
        break;
    }
  }, [updateURLParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [wifiOuFilter, regularOuFilter, ouFilter]);

  const handleViewDetails = useCallback(async (user) => {
    setSelectedUser(user);
    setIsDetailsDrawerVisible(true);
    await fetchUserDetails(user.dn);
  }, [fetchUserDetails]);

  const handleCreateUser = useCallback(() => {
    createForm.resetFields();
    setSelectedOU(null);
    setSelectedGroups([]);
    setSuggestedGroupsData(null);
    setCurrentTab('1');
    setCurrentStep(0); // Reset to step 1
    setStep1Valid(false);
    setStep2Valid(true);
    setIsCreateModalVisible(true);
  }, [createForm]);

  const handleNextStep = useCallback(async () => {
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
      message.error('Please fill in all required fields');
    }
  }, [currentStep, createForm, message]);

  const handleBackStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Fetch suggested groups from API based on OU analysis
  const fetchSuggestedGroupsForOU = useCallback(async (ouDn) => {
    try {
      // Call API to analyze OU
      const data = await ouService.getSuggestedGroups(ouDn);
      const { totalUsers, suggestedGroups } = data;
      
      // Store analysis data for display
      setSuggestedGroupsData(data);
      
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
          content: `🎯 Auto-selected ${allDefaultGroups.length} groups\nBased on ${totalUsers} existing users in this OU\nTop: ${groupNames}`,
          duration: TIMING.NOTIFICATION_DURATION.MEDIUM
        });
      } else if (totalUsers === 0) {
        message.warning({
          content: 'No existing users in this OU. Using default groups.',
          duration: TIMING.NOTIFICATION_DURATION.SHORT
        });
        
        // Fallback to hardcoded defaults
        const fallbackGroups = getDefaultGroupsForOU(ouDn, categorizedGroups);
        setSelectedGroups(fallbackGroups);
      }
      
    } catch (error) {
      // Fallback to hardcoded defaults
      const fallbackGroups = getDefaultGroupsForOU(ouDn, categorizedGroups);
      setSelectedGroups(fallbackGroups);
      
      message.warning({
        content: 'Could not analyze OU. Using default groups.',
        duration: TIMING.NOTIFICATION_DURATION.SHORT
      });
    }
  }, [categorizedGroups, message]);

  // Auto-assign groups when OU changes
  const handleOUChange = useCallback(async (ouDn) => {
    setSelectedOU(ouDn);
    
    // Auto-assign default groups based on OU analysis
    if (ouDn) {
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
  }, [categorizedGroups, fetchSuggestedGroupsForOU]);

  const handleEditUser = useCallback(async (user) => {
    // Fetch fresh user details from backend
    let freshUser = user;
    try {
      const userDetails = await userService.getUser(user.dn);
      if (userDetails) {
        freshUser = userDetails;
      }
    } catch (error) {
      // Use cached data if fetch fails
    }
    
    // Set editing user with fresh data
    setEditingUser(freshUser);
    
    // Show modal AFTER data is loaded
    // Form values will be set in useEffect when modal opens
    setIsEditModalVisible(true);
  }, [userService]);

  const handleDeleteUser = useCallback(async (userDn) => {
    try {
      const user = users.find(u => u.dn === userDn);
      const userName = getUserDisplayName(user) || 'ผู้ใช้';
      
      await userService.deleteUser(userDn);
      notifyUserDeleted(userName);
      
      // Invalidate cache and refresh
      apiCache.invalidate('/api/users');
      await fetchUsers(true, true);
    } catch (error) {
      handleApiError(error, ERROR_MESSAGES.DELETE_USER, notifyError);
    }
  }, [users, fetchUsers, notifyUserDeleted, getUserDisplayName, notifyError]);

  const handleToggleStatus = useCallback(async (userDn) => {
    try {
      const user = users.find(u => u.dn === userDn);
      const userName = getUserDisplayName(user) || 'ผู้ใช้';
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
  }, [users, fetchUsers, isDetailsDrawerVisible, selectedUser, notifyUserStatusChanged, getUserDisplayName, notifyError]);

  const handleResetPassword = useCallback((user) => {
    setSelectedUser(user);
    passwordForm.resetFields();
    setIsPasswordModalVisible(true);
  }, [passwordForm]);


  const handleSaveGroupChanges = async () => {
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
      await fetchUserDetails(managingUser.dn);
      
    } catch (error) {
      handleApiError(error, ERROR_MESSAGES.SAVE_GROUP_CHANGES, notifyError);
    }
  };

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
      handleApiError(error, ERROR_MESSAGES.RESET_PASSWORD, notifyError, { logError: false });
    }
  }, [selectedUser, passwordForm, message, notifyPasswordReset, getUserDisplayName, notifyError]);

  const handleCreateModalOk = useCallback(async () => {
    let formValues = null;
    
    try {
      formValues = await createForm.validateFields();
      
      // Transform form data to API format
      const dataToSend = transformFormDataToApiFormat(formValues, selectedOU, selectedGroups);
      
      // API call
      const response = await userService.createUser(dataToSend);
      
      // Close modal first
      setIsCreateModalVisible(false);
      createForm.resetFields();
      
      // Handle success
      await handleCreateUserSuccess(
        response,
        formValues,
        selectedOU,
        availableOUs,
        fetchUsers,
        notifyUserCreated,
        message,
        users
      );
      
    } catch (error) {
      const { title, message: errorMessage } = parseCreateUserError(error, formValues);
      notifyError(title, errorMessage);
    }
  }, [createForm, selectedOU, selectedGroups, availableOUs, fetchUsers, notifyUserCreated, message, users, parseCreateUserError, notifyError]);

  const handleEditModalOk = useCallback(async () => {
    let formValues = null;
    
    try {
      formValues = await editForm.validateFields();
      
      // Prepare update data
      const updateData = prepareUpdateData(formValues);
      
      // Convert accountOption if present
      if (formValues.accountOption !== undefined) {
        Object.assign(updateData, convertAccountOptionToFields(formValues.accountOption));
      }
      
      // Check if there are any changes
      if (!hasFormChanges(formValues, editingUser)) {
        message.warning('ไม่มีข้อมูลที่ต้องแก้ไข');
        return;
      }
      
      // API call
      const response = await userService.updateUser(editingUser.dn, updateData);
      
      notifyUserUpdated(updateData.cn || editingUser.cn || editingUser.displayName);
      
      // Refresh user data
      const refreshedUser = await refreshUserAfterUpdate(
        response,
        editingUser,
        updateData,
        userService
      );
      
      // Update users array
      setUsers(prev => updateUserInArray(prev, refreshedUser, editingUser));
      
      // Update selected user if it's the same user
      if (isSameUser(selectedUser, refreshedUser) || isSameUser(selectedUser, editingUser)) {
        setSelectedUser(refreshedUser);
      }
      
      // Close modal and reset
      setIsEditModalVisible(false);
      editForm.resetFields();
      setEditingUser(null);
      
      // Invalidate cache and refresh
      apiCache.invalidate('/api/users');
      await fetchUsers(true, true);
      
    } catch (error) {
      const { title, message: errorMessage } = parseUpdateUserError(error);
      notifyError(title, errorMessage);
    }
  }, [editForm, editingUser, userService, fetchUsers, notifyUserUpdated, message, selectedUser, notifyError]);

  // ==================== FILTERED DATA ====================
  
  const dedupedUsers = useMemo(
    () => deduplicateUserRecords(users),
    [users]
  );

  const getResponsiveWidth = useCallback((desktopWidth, tabletWidth, mobileWidth = '100%') => {
    if (screens.xl || screens.lg) return desktopWidth;
    if (screens.md || screens.sm) return tabletWidth ?? desktopWidth;
    return mobileWidth;
  }, [screens]);

  const filteredUsers = useMemo(() => {
    return dedupedUsers.filter(user => {
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
  }, [dedupedUsers, statusFilter, wifiOuFilter, regularOuFilter, ouFilter, dateRangeFilter]);

  const isFilteredView = useMemo(
    () =>
      Boolean(
        searchText ||
        departmentFilter ||
        statusFilter !== 'all' ||
        wifiOuFilter ||
        regularOuFilter ||
        ouFilter ||
        (Array.isArray(dateRangeFilter) && dateRangeFilter.length === 2)
      ),
    [searchText, departmentFilter, statusFilter, wifiOuFilter, regularOuFilter, ouFilter, dateRangeFilter]
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

  // Export functions (defined after filteredUsers)
  const exportToCSV = useCallback(() => {
    const headers = ['CN', 'Username', 'Email', 'Department', 'Status', 'Created'];
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
  }, [filteredUsers, message]);

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
      accent: '#2563eb',
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
  }, [handleViewDetails, handleEditUser, handleToggleStatus, handleDeleteUser, handleResetPassword, openDropdownKey]);

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
      width: 260,
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
      width: 200,
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
      width: 260,
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
          <Space>
            <Tooltip title={value} placement="topLeft">
              <Text
                ellipsis
                copyable={{ text: value, tooltips: ['คัดลอกอีเมล', 'คัดลอกแล้ว'] }}
                className="copyable-text table-cell-text"
                style={{ fontSize: 13, maxWidth: 200 }}
              >
                {value}
              </Text>
            </Tooltip>
          </Space>
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
      ellipsis: {
        showTitle: false
      },
      render: (value) => {
        if (!value) {
          return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
        }
        return (
          <Tooltip title={value} placement="topLeft">
            <Text className="table-cell-text" ellipsis style={{ fontSize: 13, color: '#4b5563', maxWidth: 200 }}>
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
      title: 'Actions',
      key: 'actions',
      fixed: (screens.md || screens.lg || screens.xl) ? 'right' : undefined,
      width: 140,
      className: 'col-actions',
      render: renderActionsCell
    }
  ], [renderDisplayName, renderUsernameCell, renderTextCell, renderDepartmentTag, renderEmployeeIdCell, renderStatusCell, renderActionsCell, screens.md, screens.lg, screens.xl, sortedInfo]);

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
  }, [selectedRowKeys, paginatedUsers, screens.md, screens.lg, screens.xl]);
  
  // Handle table sorting
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
  }, []);

  // ==================== RENDER ====================
  
  return (
    <div className="umx-root">
      {/* Modern Page Header - International Standards */}
      <header className={`umx-sticky-header ${isHeaderSticky ? 'umx-sticky-active' : ''}`}>
        <div className="umx-hero-compact">
          {/* Header Top Row: Title & Actions */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 24
          }}>
            <div>
              <Space size={12} align="center" style={{ marginBottom: 8 }}>
                <Tag color="blue" className="umx-hero-badge-compact">
                  DIRECTORY
                </Tag>
                <div className="umx-hero-title-compact">User Management</div>
              </Space>
              <Text type="secondary" style={{ fontSize: 14, marginLeft: 140 }}>
                Manage and organize user accounts in your Active Directory
              </Text>
            </div>
            
            {/* Action Buttons */}
            <Space size={12}>
              <Tooltip title="รีเฟรชข้อมูล">
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={() => fetchUsers(true)} 
                  loading={loading}
                  size="large"
                  type="text"
                  style={{ borderRadius: 8 }}
                />
              </Tooltip>
              <Tooltip title="ตัวกรองขั้นสูง">
                <Button 
                  icon={<FilterOutlined />} 
                  onClick={openAdvancedFilterDrawer}
                  size="large"
                  type="text"
                  style={{ borderRadius: 8 }}
                />
              </Tooltip>
              <Tooltip title="ตั้งค่าคอลัมน์">
                <Button 
                  icon={<TagOutlined />} 
                  onClick={() => setIsColumnSettingsVisible(true)}
                  size="large"
                  type="text"
                  style={{ borderRadius: 8 }}
                />
              </Tooltip>
              <Button 
                type="primary" 
                icon={<UserAddOutlined />} 
                onClick={handleCreateUser}
                size="large"
                style={{ 
                  borderRadius: 8,
                  fontWeight: 600,
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                }}
              >
                สร้างผู้ใช้
              </Button>
            </Space>
          </div>
          
          {/* Metrics Cards Grid */}
          <div className="umx-hero-metrics-compact">
            {heroMetrics.map((metric) => (
              <div 
                key={metric.key} 
                className="umx-metric-card-compact"
                onClick={metric.onClick}
              >
                <div className="umx-metric-label-compact">{metric.label}</div>
                <div className="umx-metric-value-compact" style={{ color: metric.accent }}>
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Ultra Compact Filter Bar - Single Row */}
      <FilterBar
        searchText={searchText}
        onSearchChange={(value) => {
          handleSearchTextChange(value);
          generateSearchSuggestions(value);
          setShowSearchSuggestions(value.length >= 2);
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
        isFilterSticky={isFilterSticky}
      />
      
      {/* Level 3: Main Content Area */}
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
        
        <Card className="umx-table-card" styles={{ body: { padding: 0 } }}>
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
      </Card>
      </main>

      {/* OU Selection Modal */}
      <Modal
        title={
          <Space size={12}>
            <BankOutlined style={{ fontSize: 20, color: '#3b82f6' }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>เลือก Organizational Unit (OU)</span>
          </Space>
        }
        open={isOuModalVisible}
        onCancel={() => setIsOuModalVisible(false)}
        footer={[
          <Button key="clear" onClick={() => {
            handleWifiOuFilterChange('');
            handleRegularOuFilterChange('');
          }}>
            ล้างการเลือก
          </Button>,
          <Button key="cancel" onClick={() => setIsOuModalVisible(false)}>
            ยกเลิก
          </Button>,
          <Button 
            key="ok" 
            type="primary" 
            onClick={() => setIsOuModalVisible(false)}
            style={{ borderRadius: 8 }}
          >
            ตกลง
          </Button>
        ]}
        width={800}
        destroyOnClose
        styles={{
          body: { padding: '24px' }
        }}
      >
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 12 }}>
              <Space size={8}>
                <GlobalOutlined style={{ color: '#3b82f6', fontSize: 16 }} />
                <Text strong style={{ fontSize: 15, color: '#374151' }}>WiFi OU</Text>
              </Space>
            </div>
            <TreeSelect
              showSearch
              allowClear
              placeholder="เลือก WiFi OU"
              value={wifiOuFilter || undefined}
              onChange={handleWifiOuFilterChange}
              treeData={wifiTreeData}
              size="large"
              style={{ width: '100%' }}
              styles={{ 
                popup: { 
                  root: { 
                    maxHeight: 400, 
                    minWidth: 350,
                    overflow: 'auto'
                  } 
                } 
              }}
              listHeight={400}
              loading={loadingOUs}
              className="umx-ou-select-modern"
              filterTreeNode={(input, node) => {
                const title = typeof node.title === 'string' ? node.title : (node.name || '');
                const fullPath = node.fullPath || '';
                const searchText = input.toLowerCase();
                return title.toLowerCase().includes(searchText) ||
                       fullPath.toLowerCase().includes(searchText);
              }}
            />
          </Col>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 12 }}>
              <Space size={8}>
                <BankOutlined style={{ color: '#059669', fontSize: 16 }} />
                <Text strong style={{ fontSize: 15, color: '#374151' }}>Regular OU</Text>
              </Space>
            </div>
            <TreeSelect
              showSearch
              allowClear
              placeholder="เลือก Regular OU"
              value={regularOuFilter || undefined}
              onChange={handleRegularOuFilterChange}
              treeData={regularTreeData}
              size="large"
              style={{ width: '100%' }}
              styles={{ 
                popup: { 
                  root: { 
                    maxHeight: 400, 
                    minWidth: 350,
                    overflow: 'auto'
                  } 
                } 
              }}
              listHeight={400}
              loading={loadingOUs}
              className="umx-ou-select-modern"
              filterTreeNode={(input, node) => {
                const title = typeof node.title === 'string' ? node.title : (node.name || '');
                const fullPath = node.fullPath || '';
                const searchText = input.toLowerCase();
                return title.toLowerCase().includes(searchText) ||
                       fullPath.toLowerCase().includes(searchText);
              }}
            />
          </Col>
        </Row>
        {(wifiOuFilter || regularOuFilter) && (
          <div style={{ marginTop: 24, padding: 16, background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
            <Text strong style={{ fontSize: 14, color: '#059669', display: 'block', marginBottom: 8 }}>
              OU ที่เลือก:
            </Text>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {wifiOuFilter && (
                <Tag color="blue" style={{ fontSize: 13, padding: '6px 12px', borderRadius: 6 }}>
                  <GlobalOutlined style={{ marginRight: 6 }} />
                  WiFi OU: {getOuLabel(wifiOuFilter)}
                </Tag>
              )}
              {regularOuFilter && (
                <Tag color="green" style={{ fontSize: 13, padding: '6px 12px', borderRadius: 6 }}>
                  <BankOutlined style={{ marginRight: 6 }} />
                  Regular OU: {getOuLabel(regularOuFilter)}
                </Tag>
              )}
            </Space>
          </div>
        )}
      </Modal>

      <Drawer
        title="ตัวกรองขั้นสูง"
        placement="right"
        width={360}
        open={isFilterDrawerVisible}
        onClose={() => setIsFilterDrawerVisible(false)}
        destroyOnHidden
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
            <TreeSelect
              allowClear
              showSearch
              placeholder="เลือก OU"
              treeData={ouTreeData}
              treeDefaultExpandAll={false}
              treeDefaultExpandedKeys={[]}
              style={{ width: '100%' }}
              styles={{ 
                popup: { 
                  root: { 
                    maxHeight: 500, 
                    overflow: 'auto',
                    minWidth: 400,
                    padding: 0
                  } 
                } 
              }}
              listHeight={500}
              size="large"
              loading={loadingOUs}
              notFoundContent={
                loadingOUs ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16, color: '#6b7280', fontSize: 15, fontWeight: 500 }}>
                      กำลังโหลด...
                    </div>
                  </div>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <Text type="secondary" style={{ fontSize: 15 }}>
                        ไม่พบ OU
                      </Text>
                    }
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
            />
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
        destroyOnHidden
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
                    styles={{ body: { padding: 0 } }}
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

                      <Divider style={{ margin: '24px 0' }} />

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
                              <Text strong style={{ fontSize: 14, color: '#1f2937' }}>Account Options</Text>
                              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 400, marginTop: 2 }}>
                                Select one password policy option
                              </div>
                            </div>
                          </Space>
                        }
                        size="small"
                        style={{
                          marginBottom: 16,
                          background: 'linear-gradient(to bottom, #ffffff, #f8fafc)',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                        }}
                        styles={{ body: { padding: '16px' } }}
                      >
                        <Form.Item
                          name="accountOption"
                          rules={[{ required: false }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Radio.Group>
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                              <Radio value="passwordMustChange" style={{ 
                                padding: '12px 16px',
                                borderRadius: 8,
                                border: '1px solid #e5e7eb',
                                background: '#ffffff',
                                transition: 'all 0.2s',
                                width: '100%',
                                margin: 0
                              }}>
                                <Space>
                                  <LockOutlined style={{ color: '#3b82f6', fontSize: 14 }} />
                                  <Text strong style={{ fontSize: 13, color: '#374151' }}>User must change password at next logon</Text>
                                  <Tooltip title="Forces the user to change their password the next time they log in">
                                    <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 11 }} />
                                  </Tooltip>
                                </Space>
                              </Radio>
                              <Radio value="userCannotChangePassword" style={{ 
                                padding: '12px 16px',
                                borderRadius: 8,
                                border: '1px solid #e5e7eb',
                                background: '#ffffff',
                                transition: 'all 0.2s',
                                width: '100%',
                                margin: 0
                              }}>
                                <Space>
                                  <UnlockOutlined style={{ color: '#ef4444', fontSize: 14 }} />
                                  <Text strong style={{ fontSize: 13, color: '#374151' }}>User cannot change password</Text>
                                  <Tooltip title="Prevents the user from changing their own password">
                                    <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 11 }} />
                                  </Tooltip>
                                </Space>
                              </Radio>
                              <Radio value="passwordNeverExpires" style={{ 
                                padding: '12px 16px',
                                borderRadius: 8,
                                border: '1px solid #e5e7eb',
                                background: '#ffffff',
                                transition: 'all 0.2s',
                                width: '100%',
                                margin: 0
                              }}>
                                <Space>
                                  <ClockCircleOutlined style={{ color: '#10b981', fontSize: 14 }} />
                                  <Text strong style={{ fontSize: 13, color: '#374151' }}>Password never expires</Text>
                                  <Tooltip title="The password will not expire according to the password policy">
                                    <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 11 }} />
                                  </Tooltip>
                                </Space>
                              </Radio>
                              <Radio value="storePasswordReversible" style={{ 
                                padding: '12px 16px',
                                borderRadius: 8,
                                border: '1px solid #e5e7eb',
                                background: '#ffffff',
                                transition: 'all 0.2s',
                                width: '100%',
                                margin: 0
                              }}>
                                <Space>
                                  <SafetyCertificateOutlined style={{ color: '#f59e0b', fontSize: 14 }} />
                                  <Text strong style={{ fontSize: 13, color: '#374151' }}>Store password using reversible encryption</Text>
                                  <Tooltip title="Stores the password using reversible encryption (less secure, required for some applications)">
                                    <QuestionCircleOutlined style={{ color: '#9ca3af', fontSize: 11 }} />
                                  </Tooltip>
                                </Space>
                              </Radio>
                              <Radio value="none" style={{ 
                                padding: '12px 16px',
                                borderRadius: 8,
                                border: '1px dashed #d1d5db',
                                background: '#f9fafb',
                                transition: 'all 0.2s',
                                width: '100%',
                                margin: 0
                              }}>
                                <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>None (default settings)</Text>
                              </Radio>
                            </Space>
                          </Radio.Group>
                        </Form.Item>
                      </Card>

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
                    styles={{ body: { padding: 0 } }}
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
                    styles={{ body: { padding: 0 } }}
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
                        <TreeSelect
                          placeholder="Select OU (optional - defaults to CN=Users)"
                          size="large"
                          allowClear
                          showSearch
                          value={selectedOU}
                          onChange={handleOUChange}
                          treeData={ouTreeData}
                          treeDefaultExpandAll={false}
                          treeDefaultExpandedKeys={[]}
                          style={{ width: '100%' }}
                          styles={{ 
                            popup: { 
                              root: { 
                                maxHeight: 500, 
                                overflow: 'auto',
                                minWidth: 400,
                                padding: 0
                              } 
                            } 
                          }}
                          listHeight={500}
                          loading={loadingOUs}
                          notFoundContent={
                            loadingOUs ? (
                              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                <Spin size="large" />
                                <div style={{ marginTop: 16, color: '#6b7280', fontSize: 15, fontWeight: 500 }}>
                                  กำลังโหลด...
                                </div>
                              </div>
                            ) : (
                              <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                  <Text type="secondary" style={{ fontSize: 15 }}>
                                    ไม่พบ OU
                                  </Text>
                                }
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
              <Form.Item shouldUpdate noStyle>
                {() => (
              <Card
                title={<Text strong style={{ fontSize: 15 }}>📋 User Information Summary</Text>}
                style={{
                  background: '#fafbfc',
                  border: '2px solid #e5e7eb',
                  borderRadius: 12
                }}
                styles={{ body: { padding: '20px' } }}
              >
                <Descriptions column={1} bordered size="middle">
                  <Descriptions.Item 
                    label={<Text strong>Common Name</Text>}
                        styles={{ label: { width: '35%', background: '#f8fafc' } }}
                  >
                    <Text strong style={{ fontSize: 14 }}>
                      {createForm.getFieldValue('cn') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Username (Login)</Text>}
                        styles={{ label: { background: '#f8fafc' } }}
                  >
                    <Text code style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('sAMAccountName') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Email</Text>}
                        styles={{ label: { background: '#f8fafc' } }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      <MailOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
                      {createForm.getFieldValue('mail') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Display Name</Text>}
                        styles={{ label: { background: '#f8fafc' } }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('displayName') || createForm.getFieldValue('cn') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>First Name</Text>}
                        styles={{ label: { background: '#f8fafc' } }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('givenName') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Last Name</Text>}
                        styles={{ label: { background: '#f8fafc' } }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('sn') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Job Title</Text>}
                        styles={{ label: { background: '#f8fafc' } }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('title') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Department</Text>}
                        styles={{ label: { background: '#f8fafc' } }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('department') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Company</Text>}
                        styles={{ label: { background: '#f8fafc' } }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('company') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Employee ID</Text>}
                        styles={{ label: { background: '#f8fafc' } }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('employeeID') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Phone</Text>}
                        styles={{ label: { background: '#f8fafc' } }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('telephoneNumber') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Mobile</Text>}
                        styles={{ label: { background: '#f8fafc' } }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('mobile') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Office Location</Text>}
                        styles={{ label: { background: '#f8fafc' } }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('physicalDeliveryOfficeName') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Description</Text>}
                        styles={{ label: { background: '#f8fafc' } }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {createForm.getFieldValue('description') || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<Text strong>Organizational Unit</Text>}
                    styles={{ label: { background: '#f8fafc' } }}
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
                    styles={{ label: { background: '#f8fafc' } }}
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
                    label={<Text strong>Status</Text>}
                    styles={{ label: { background: '#f8fafc' } }}
                  >
                    <Space direction="vertical" size={4}>
                      {editingUser?.isEnabled ? (
                        <Tag color="success">Active</Tag>
                      ) : (
                        <Tag color="default">Disabled</Tag>
                      )}
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
                )}
              </Form.Item>

              {/* Action Buttons to Edit */}
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Space size="middle">
                  <Button 
                    onClick={() => setCurrentStep(0)} 
                    icon={<EditOutlined />}
                    aria-label="แก้ไขข้อมูลบัญชี"
                  >
                    Edit Account Info
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(1)} 
                    icon={<TeamOutlined />}
                    aria-label="แก้ไขกลุ่มผู้ใช้"
                  >
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
        destroyOnHidden
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
            <Tabs
              defaultActiveKey="1"
              type="card"
              style={{
                background: '#ffffff',
                borderRadius: 8,
                padding: '0 4px'
              }}
              items={[
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
              ]}
            />
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
        destroyOnHidden
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
        styles={{
          header: {
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
            borderBottom: 'none',
            padding: '24px 24px 0'
          },
          body: {
            background: '#fafbfc',
            padding: 24
          }
        }}
      >
        {selectedUser && (
          <Tabs defaultActiveKey="1" items={userDetailsTabsItems} />
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
                  Manage User Groups
                </div>
                <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {selectedUser?.cn || selectedUser?.displayName}
                </Text>
              </div>
            </Space>
          </div>
        }
        open={isManageGroupsModalVisible}
        onCancel={() => {
          setIsManageGroupsModalVisible(false);
          setSelectedUser(null);
        }}
        width={getResponsiveWidth(900, 700, '95%')}
        footer={null}
        destroyOnHidden
      >
        <Tabs defaultActiveKey="1" items={manageGroupsTabsItems} />
      </Modal>

      {/* Level 3: Activity Feed Drawer */}
      <Drawer
        title={
          <Space>
            <BellOutlined />
            <span>Activity Feed</span>
            <Badge count={recentActivities.length} />
          </Space>
        }
        placement="right"
        width={400}
        open={isActivityFeedVisible}
        onClose={() => setIsActivityFeedVisible(false)}
        destroyOnHidden
      >
        {activityLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : recentActivities.length > 0 ? (
          <List
            dataSource={recentActivities}
            renderItem={(activity) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar
                      icon={<HistoryOutlined />}
                      style={{
                        background: activity.action_type === 'create' ? '#10b981' :
                                   activity.action_type === 'update' ? '#3b82f6' :
                                   activity.action_type === 'delete' ? '#ef4444' : '#6b7280'
                      }}
                    />
                  }
                  title={
                    <Text strong style={{ fontSize: 13 }}>
                      {activity.action_type} - {activity.target_type}
                    </Text>
                  }
                  description={
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {activity.target_name || activity.target_dn}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {activity.timestamp ? new Date(activity.timestamp).toLocaleString('th-TH') : 'N/A'}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="ไม่มี Activity ล่าสุด" />
        )}
      </Drawer>

      {/* Level 3: Filter Preset Modal */}
      <Modal
        title={
          <Space>
            <StarOutlined />
            <span>Filter Presets</span>
          </Space>
        }
        open={isFilterPresetModalVisible}
        onCancel={() => setIsFilterPresetModalVisible(false)}
        footer={null}
        width={600}
      >
        <Tabs
          items={[
            {
              key: 'saved',
              label: `Saved (${filterPresets.length})`,
              children: (
                <div>
                  {filterPresets.length > 0 ? (
                    <List
                      dataSource={filterPresets}
                      renderItem={(preset) => (
                        <List.Item
                          actions={[
                            <Button
                              type="link"
                              onClick={() => loadFilterPreset(preset)}
                            >
                              Load
                            </Button>,
                            <Button
                              type="link"
                              danger
                              onClick={() => deleteFilterPreset(preset.id)}
                            >
                              Delete
                            </Button>
                          ]}
                        >
                          <List.Item.Meta
                            avatar={<StarOutlined style={{ color: '#f59e0b' }} />}
                            title={preset.name}
                            description={
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Created: {new Date(preset.createdAt).toLocaleDateString('th-TH')}
                              </Text>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="ยังไม่มี Filter Presets" />
                  )}
                  
                  <Divider />
                  
                  <Form
                    form={presetForm}
                    onFinish={(values) => {
                      saveFilterPreset(values.name);
                      presetForm.resetFields();
                    }}
                  >
                    <Form.Item
                      name="name"
                      label="Preset Name"
                      rules={[{ required: true, message: 'กรุณากรอกชื่อ Preset' }]}
                    >
                      <Input placeholder="e.g., IT Department Active Users" />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" block>
                        <SaveOutlined /> Save Current Filters
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              )
            },
            {
              key: 'history',
              label: `History (${filterHistory.length})`,
              children: (
                <div>
                  {filterHistory.length > 0 ? (
                    <List
                      dataSource={filterHistory}
                      renderItem={(preset) => (
                        <List.Item
                          actions={[
                            <Button
                              type="link"
                              onClick={() => loadFilterPreset(preset)}
                            >
                              Load
                            </Button>
                          ]}
                        >
                          <List.Item.Meta
                            avatar={<HistoryOutlined />}
                            title={preset.name}
                            description={
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Used: {new Date(preset.createdAt).toLocaleDateString('th-TH')}
                              </Text>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="ยังไม่มี Filter History" />
                  )}
                </div>
              )
            }
          ]}
        />
      </Modal>
    </div>
  );
};

export default UserManagement;

