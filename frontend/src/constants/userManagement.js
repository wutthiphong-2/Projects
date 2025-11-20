/**
 * User Management Constants
 * Centralized constants for user management functionality
 */

/**
 * Timing constants (in milliseconds)
 */
export const TIMING = {
  // Wait for AD replication after user creation/update
  AD_REPLICATION_DELAY: 1500,
  
  // Debounce delay for search input
  DEBOUNCE_DELAY: 500,
  
  // Notification durations (in seconds)
  NOTIFICATION_DURATION: {
    SHORT: 3,
    MEDIUM: 5,
    LONG: 8
  },
  
  // Delay for deferred data loading
  DEFERRED_LOAD_DELAY: 1000
};

/**
 * Pagination constants
 */
export const PAGINATION = {
  // Default page size for initial load (no filters)
  DEFAULT_PAGE_SIZE: 500,
  
  // Page size when filters are applied (load more for client-side filtering)
  FILTERED_PAGE_SIZE: 1000,
  
  // Client-side pagination page size (display)
  CLIENT_PAGE_SIZE: 30,
  
  // Page size options for pagination component
  PAGE_SIZE_OPTIONS: ['20', '30', '50', '100', '200']
};

/**
 * Table configuration
 */
export const TABLE_CONFIG = {
  // Default scroll height
  SCROLL_Y: 520,
  
  // Header height for scroll calculation
  HEADER_HEIGHT: {
    DESKTOP: 260,
    MOBILE: 320
  }
};

/**
 * User status filter values
 */
export const USER_STATUS = {
  ALL: 'all',
  ENABLED: 'enabled',
  DISABLED: 'disabled'
};

/**
 * Account option values
 */
export const ACCOUNT_OPTIONS = {
  NONE: 'none',
  PASSWORD_MUST_CHANGE: 'passwordMustChange',
  USER_CANNOT_CHANGE_PASSWORD: 'userCannotChangePassword',
  PASSWORD_NEVER_EXPIRES: 'passwordNeverExpires',
  STORE_PASSWORD_REVERSIBLE: 'storePasswordReversible'
};

/**
 * Form field names
 */
export const FORM_FIELDS = {
  CN: 'cn',
  SAM_ACCOUNT_NAME: 'sAMAccountName',
  MAIL: 'mail',
  DISPLAY_NAME: 'displayName',
  GIVEN_NAME: 'givenName',
  SN: 'sn',
  TITLE: 'title',
  DEPARTMENT: 'department',
  COMPANY: 'company',
  EMPLOYEE_ID: 'employeeID',
  PHONE: 'telephoneNumber',
  MOBILE: 'mobile',
  OFFICE_LOCATION: 'physicalDeliveryOfficeName',
  DESCRIPTION: 'description',
  PASSWORD: 'password',
  CONFIRM_PASSWORD: 'confirmPassword',
  ACCOUNT_OPTION: 'accountOption'
};

/**
 * Fields to exclude from update operations
 */
export const EXCLUDE_FROM_UPDATE = [
  FORM_FIELDS.SAM_ACCOUNT_NAME,
  FORM_FIELDS.PASSWORD
];

/**
 * Default empty categorized groups structure
 */
export const EMPTY_CATEGORIZED_GROUPS = {
  Internet: [],
  VPN: [],
  USB: [],
  FileShare: [],
  PasswordPolicy: [],
  Remote: [],
  Aliases: [],
  Others: []
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  CREATE_USER: 'ไม่สามารถสร้างผู้ใช้ได้',
  UPDATE_USER: 'ไม่สามารถแก้ไขผู้ใช้ได้',
  DELETE_USER: 'ไม่สามารถลบผู้ใช้ได้',
  TOGGLE_STATUS: 'ไม่สามารถเปลี่ยนสถานะได้',
  RESET_PASSWORD: 'ไม่สามารถรีเซ็ตรหัสผ่านได้',
  FETCH_USERS: 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้',
  FETCH_USER_DETAILS: 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้',
  ADD_TO_GROUP: 'ไม่สามารถเพิ่มผู้ใช้เข้ากลุ่มได้',
  REMOVE_FROM_GROUP: 'ไม่สามารถลบผู้ใช้ออกจากกลุ่มได้',
  SAVE_GROUP_CHANGES: 'ไม่สามารถบันทึกการเปลี่ยนแปลงกลุ่มได้',
  FETCH_DEPARTMENTS: 'ไม่สามารถโหลดแผนกได้',
  FETCH_OUS: 'ไม่สามารถโหลด OU ได้',
  FETCH_GROUPS: 'ไม่สามารถโหลดกลุ่มได้'
};

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'สร้างผู้ใช้สำเร็จ',
  USER_UPDATED: 'อัพเดทผู้ใช้สำเร็จ',
  USER_DELETED: 'ลบผู้ใช้สำเร็จ',
  STATUS_CHANGED: 'เปลี่ยนสถานะสำเร็จ',
  PASSWORD_RESET: 'รีเซ็ตรหัสผ่านสำเร็จ',
  ADDED_TO_GROUP: 'เพิ่มเข้ากลุ่มสำเร็จ',
  REMOVED_FROM_GROUP: 'ลบออกจากกลุ่มสำเร็จ',
  GROUP_CHANGES_SAVED: 'บันทึกการเปลี่ยนแปลงกลุ่มสำเร็จ'
};

/**
 * Validation error messages
 */
export const VALIDATION_ERRORS = {
  USERNAME_EXISTS: 'Username ซ้ำ',
  CN_EXISTS: 'CN ซ้ำ',
  PASSWORD_POLICY: 'Password ไม่ผ่าน Active Directory Policy',
  INVALID_CREDENTIALS: 'ไม่มีสิทธิ์',
  REQUIRED_FIELD: 'กรุณากรอกข้อมูล',
  INVALID_EMAIL: 'กรุณากรอกอีเมลที่ถูกต้อง',
  PASSWORD_MISMATCH: 'รหัสผ่านไม่ตรงกัน',
  PASSWORD_TOO_SHORT: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
  PASSWORD_REQUIREMENTS: 'Password ต้องมี: ตัวพิมพ์ใหญ่, ตัวพิมพ์เล็ก, ตัวเลข, และอักขระพิเศษ'
};

