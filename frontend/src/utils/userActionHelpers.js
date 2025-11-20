/**
 * User Action Helpers
 * Helper functions for user actions (create, update, delete, etc.)
 */

import { apiCache } from './cache';
import { TIMING } from '../constants/userManagement';

/**
 * Handle successful user creation
 * @param {Object} response - API response
 * @param {Object} formValues - Form values that were submitted
 * @param {string|null} selectedOU - Selected OU DN
 * @param {Array} availableOUs - Available OUs for display
 * @param {Function} fetchUsers - Function to fetch users
 * @param {Function} notifyUserCreated - Notification function
 * @param {Function} message - Ant Design message API
 * @param {Array} users - Current users array
 * @returns {Promise<Object>} - Result object
 */
export const handleCreateUserSuccess = async (
  response,
  formValues,
  selectedOU,
  availableOUs,
  fetchUsers,
  notifyUserCreated,
  message,
  users
) => {
  // Show notification
  notifyUserCreated(formValues.cn || formValues.displayName, formValues.mail);
  
  // Check if password was set successfully
  if (response.data?.passwordSet === false) {
    message.warning({
      content: '⚠️ User สร้างสำเร็จ แต่ Password ยังไม่ได้ตั้ง\nกรุณาตั้ง Password ใน Active Directory Users and Computers ด้วยตนเอง\nสาเหตุ: Backend ไม่ได้ใช้ LDAPS (SSL/TLS)',
      duration: TIMING.NOTIFICATION_DURATION.LONG
    });
  }
  
  // Invalidate cache immediately
  apiCache.invalidate('/api/users');
  
  // Wait for AD replication
  await new Promise(resolve => setTimeout(resolve, TIMING.AD_REPLICATION_DELAY));
  
  // Refresh user list
  const oldUserCount = users.length;
  const result = await fetchUsers(true, true);
  
  // Build success message
  let successMessage = `✅ สร้างผู้ใช้สำเร็จ!\nUsername: ${formValues.sAMAccountName}\nEmail: ${formValues.mail}`;
  
  if (selectedOU) {
    const ouPath = availableOUs.find(ou => ou.dn === selectedOU)?.fullPath || 'Default';
    successMessage += `\n📁 OU: ${ouPath}`;
  }
  
  if (response.data?.groupsAssigned > 0) {
    successMessage += `\n👥 Assigned to ${response.data.groupsAssigned} group(s)`;
  }
  
  successMessage += `\n✓ อัพเดทแล้ว: ${oldUserCount} → ${result.count} users (+${result.count - oldUserCount})`;
  
  // Show detailed success message
  message.success({
    content: successMessage,
    duration: TIMING.NOTIFICATION_DURATION.MEDIUM
  });
  
  return result;
};

/**
 * Refresh user data after update
 * @param {Object} response - API response
 * @param {Object} editingUser - Original user being edited
 * @param {Object} updateData - Data that was updated
 * @param {Function} userService - User service instance
 * @returns {Promise<Object>} - Refreshed user object
 */
export const refreshUserAfterUpdate = async (response, editingUser, updateData, userService) => {
  const updatedDn = response?.dn || editingUser.dn;
  let refreshedUser = response?.user || response;
  
  // If response doesn't have full user data, fetch it
  if (!refreshedUser || !refreshedUser.dn) {
    try {
      const freshUser = await userService.getUser(updatedDn);
      if (freshUser) {
        refreshedUser = freshUser;
      }
    } catch (error) {
      // Fallback to response data or merge with original
      refreshedUser = response || {
        ...editingUser,
        ...updateData,
        dn: updatedDn
      };
    }
  }
  
  // Final fallback
  if (!refreshedUser) {
    refreshedUser = {
      ...editingUser,
      ...updateData,
      dn: updatedDn
    };
  }
  
  return refreshedUser;
};

