/**
 * Status Types Constants
 * Used for user, group, and other entity statuses
 */

export const USER_STATUS = {
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  ALL: 'all',
};

export const USER_STATUS_LABELS = {
  [USER_STATUS.ENABLED]: 'เปิดใช้งาน',
  [USER_STATUS.DISABLED]: 'ปิดใช้งาน',
  [USER_STATUS.ALL]: 'ทั้งหมด',
};

export const GROUP_TYPE = {
  SECURITY: 'Security',
  DISTRIBUTION: 'Distribution',
  ALL: 'all',
};

export const GROUP_SCOPE = {
  DOMAIN_LOCAL: 'DomainLocal',
  GLOBAL: 'Global',
  UNIVERSAL: 'Universal',
  ALL: 'all',
};

export const GROUP_SCOPE_LABELS = {
  [GROUP_SCOPE.DOMAIN_LOCAL]: 'Domain Local',
  [GROUP_SCOPE.GLOBAL]: 'Global',
  [GROUP_SCOPE.UNIVERSAL]: 'Universal',
  [GROUP_SCOPE.ALL]: 'ทั้งหมด',
};

