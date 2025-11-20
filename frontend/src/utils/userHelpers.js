/**
 * User Helpers
 * Utility functions for user comparison, validation, and manipulation
 */

/**
 * Check if two users are the same by comparing various identifiers
 * @param {Object} user1 - First user object
 * @param {Object} user2 - Second user object
 * @returns {boolean} - True if users are the same
 */
export const isSameUser = (user1, user2) => {
  if (!user1 || !user2) return false;
  
  // Check by DN (most reliable identifier)
  if (user1.dn && user2.dn) {
    return user1.dn === user2.dn;
  }
  
  // Fallback: check by other identifiers
  const identifiers = ['cn', 'displayName', 'sAMAccountName'];
  return identifiers.some(id => {
    const val1 = user1[id]?.toLowerCase();
    const val2 = user2[id]?.toLowerCase();
    return val1 && val2 && val1 === val2;
  });
};

/**
 * Find user in array by DN or other identifiers
 * @param {Array<Object>} users - Array of user objects
 * @param {Object|string} targetUser - User object or DN string
 * @returns {Object|null} - Found user or null
 */
export const findUser = (users, targetUser) => {
  if (!users || !Array.isArray(users) || !targetUser) return null;
  
  const targetDn = typeof targetUser === 'string' ? targetUser : targetUser.dn;
  
  if (targetDn) {
    const found = users.find(user => user.dn === targetDn);
    if (found) return found;
  }
  
  // Fallback: check by other identifiers
  if (typeof targetUser === 'object') {
    return users.find(user => isSameUser(user, targetUser)) || null;
  }
  
  return null;
};

/**
 * Update user in array
 * @param {Array<Object>} users - Array of user objects
 * @param {Object} updatedUser - Updated user object
 * @param {Object|string} oldUser - Old user object or DN string
 * @returns {Array<Object>} - Updated array
 */
export const updateUserInArray = (users, updatedUser, oldUser) => {
  if (!users || !Array.isArray(users) || !updatedUser) return users;
  
  const oldDn = typeof oldUser === 'string' ? oldUser : oldUser?.dn;
  const updatedDn = updatedUser.dn;
  
  let replaced = false;
  const updated = users.map(user => {
    if (
      user.dn === oldDn ||
      user.dn === updatedDn ||
      isSameUser(user, updatedUser) ||
      isSameUser(user, oldUser)
    ) {
      replaced = true;
      return { ...user, ...updatedUser };
    }
    return user;
  });
  
  // If user wasn't found, add it
  if (!replaced) {
    updated.push(updatedUser);
  }
  
  return updated;
};

/**
 * Validate user object has required fields
 * @param {Object} user - User object to validate
 * @param {Array<string>} requiredFields - Required field names
 * @returns {Object} - Validation result { valid: boolean, missing: Array<string> }
 */
export const validateUser = (user, requiredFields = ['dn']) => {
  if (!user || typeof user !== 'object') {
    return { valid: false, missing: requiredFields };
  }
  
  const missing = requiredFields.filter(field => !user[field]);
  
  return {
    valid: missing.length === 0,
    missing
  };
};

/**
 * Get user display name (fallback to various fields)
 * @param {Object} user - User object
 * @returns {string} - Display name
 */
export const getUserDisplayName = (user) => {
  if (!user) return 'Unknown User';
  
  return user.displayName || user.cn || user.sAMAccountName || 'Unknown User';
};

/**
 * Get user identifier for display (username or email)
 * @param {Object} user - User object
 * @returns {string} - User identifier
 */
export const getUserIdentifier = (user) => {
  if (!user) return '';
  
  return user.sAMAccountName || user.mail || user.dn || '';
};

/**
 * Check if user is enabled
 * @param {Object} user - User object
 * @returns {boolean} - True if user is enabled
 */
export const isUserEnabled = (user) => {
  if (!user) return false;
  return user.isEnabled === true || user.userAccountControl === undefined;
};

/**
 * Format user for display in lists
 * @param {Object} user - User object
 * @returns {Object} - Formatted user object
 */
export const formatUserForDisplay = (user) => {
  if (!user) return null;
  
  return {
    ...user,
    displayName: getUserDisplayName(user),
    identifier: getUserIdentifier(user),
    isEnabled: isUserEnabled(user)
  };
};

