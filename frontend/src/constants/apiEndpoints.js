/**
 * API Endpoints Constants
 * Centralized endpoint definitions
 */

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/auth/login',
    VERIFY: '/api/auth/verify',
    LOGOUT: '/api/auth/logout',
  },
  
  // Users
  USERS: {
    BASE: '/api/users/',
    STATS: '/api/users/stats',
    DEPARTMENTS: '/api/users/departments',
    GROUPS: '/api/users/groups',
    USER_OUS: '/api/ous/user-ous',
    LOGIN_INSIGHTS: {
      RECENT: '/api/users/login-insights/recent',
      NEVER: '/api/users/login-insights/never',
    },
    BY_DN: (dn) => `/api/users/${encodeURIComponent(dn)}`,
    GROUPS_BY_DN: (dn) => `/api/users/${encodeURIComponent(dn)}/groups`,
    PERMISSIONS_BY_DN: (dn) => `/api/users/${encodeURIComponent(dn)}/permissions`,
    LOGIN_HISTORY_BY_DN: (dn) => `/api/users/${encodeURIComponent(dn)}/login-history`,
    PASSWORD_EXPIRY_BY_DN: (dn) => `/api/users/${encodeURIComponent(dn)}/password-expiry`,
  },
  
  // Groups
  GROUPS: {
    BASE: '/api/groups',
    CATEGORIZED: '/api/groups/categorized',
    BY_DN: (dn) => `/api/groups/${encodeURIComponent(dn)}`,
    MEMBERS_BY_DN: (dn) => `/api/groups/${encodeURIComponent(dn)}/members`,
    ADD_MEMBER: (dn) => `/api/groups/${encodeURIComponent(dn)}/members`,
    REMOVE_MEMBER: (dn, userDn) => `/api/groups/${encodeURIComponent(dn)}/members/${encodeURIComponent(userDn)}`,
    DEFAULT_BY_OU: (ouDn) => `/api/groups/default-by-ou?ou_dn=${encodeURIComponent(ouDn)}`,
  },
  
  // OUs
  OUS: {
    BASE: '/api/ous',
    BY_DN: (dn) => `/api/ous/${encodeURIComponent(dn)}`,
    SUGGESTED_GROUPS: (dn) => `/api/ous/${encodeURIComponent(dn)}/suggested-groups`,
  },
  
  // Activity Logs
  ACTIVITY_LOGS: {
    BASE: '/api/activity-logs/',
    STATS: '/api/activity-logs/stats',
    ACTION_TYPES: '/api/activity-logs/action-types',
    RECENT: '/api/activity-logs/recent',
  },
};

