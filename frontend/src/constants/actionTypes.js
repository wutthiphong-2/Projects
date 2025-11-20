/**
 * Action Types Constants
 * Used for activity logs and notifications
 */

export const ACTION_TYPES = {
  // User actions
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_ENABLE: 'user_enable',
  USER_DISABLE: 'user_disable',
  USER_PASSWORD_RESET: 'user_password_reset',
  USER_PASSWORD_CHANGE: 'user_password_change',
  
  // Group actions
  GROUP_CREATE: 'group_create',
  GROUP_UPDATE: 'group_update',
  GROUP_DELETE: 'group_delete',
  GROUP_MEMBER_ADD: 'group_member_add',
  GROUP_MEMBER_REMOVE: 'group_member_remove',
  
  // OU actions
  OU_CREATE: 'ou_create',
  OU_UPDATE: 'ou_update',
  OU_DELETE: 'ou_delete',
  
  // Auth actions
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
};

export const ACTION_TYPE_LABELS = {
  [ACTION_TYPES.USER_CREATE]: 'สร้างผู้ใช้',
  [ACTION_TYPES.USER_UPDATE]: 'แก้ไขผู้ใช้',
  [ACTION_TYPES.USER_DELETE]: 'ลบผู้ใช้',
  [ACTION_TYPES.USER_ENABLE]: 'เปิดใช้งานผู้ใช้',
  [ACTION_TYPES.USER_DISABLE]: 'ปิดใช้งานผู้ใช้',
  [ACTION_TYPES.USER_PASSWORD_RESET]: 'รีเซ็ตรหัสผ่าน',
  [ACTION_TYPES.USER_PASSWORD_CHANGE]: 'เปลี่ยนรหัสผ่าน',
  [ACTION_TYPES.GROUP_CREATE]: 'สร้างกลุ่ม',
  [ACTION_TYPES.GROUP_UPDATE]: 'แก้ไขกลุ่ม',
  [ACTION_TYPES.GROUP_DELETE]: 'ลบกลุ่ม',
  [ACTION_TYPES.GROUP_MEMBER_ADD]: 'เพิ่มสมาชิกกลุ่ม',
  [ACTION_TYPES.GROUP_MEMBER_REMOVE]: 'ลบสมาชิกกลุ่ม',
  [ACTION_TYPES.OU_CREATE]: 'สร้าง OU',
  [ACTION_TYPES.OU_UPDATE]: 'แก้ไข OU',
  [ACTION_TYPES.OU_DELETE]: 'ลบ OU',
  [ACTION_TYPES.LOGIN]: 'เข้าสู่ระบบ',
  [ACTION_TYPES.LOGOUT]: 'ออกจากระบบ',
  [ACTION_TYPES.LOGIN_FAILED]: 'เข้าสู่ระบบล้มเหลว',
};

