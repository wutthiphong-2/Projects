/**
 * User Form Helpers
 * Utility functions for transforming and validating user form data
 */

/**
 * Convert account option (single selection) to individual boolean fields
 * @param {string} accountOption - Selected account option
 * @returns {Object} - Account control fields
 */
export const convertAccountOptionToFields = (accountOption) => {
  if (!accountOption || accountOption === 'none') {
    return {};
  }
  
  return {
    passwordMustChange: accountOption === 'passwordMustChange',
    userCannotChangePassword: accountOption === 'userCannotChangePassword',
    passwordNeverExpires: accountOption === 'passwordNeverExpires',
    storePasswordReversible: accountOption === 'storePasswordReversible'
  };
};

/**
 * Prepare update data from form values, excluding specified fields
 * @param {Object} formValues - Form values
 * @param {Array<string>} excludeFields - Fields to exclude (default: ['sAMAccountName', 'password'])
 * @returns {Object} - Prepared update data
 */
export const prepareUpdateData = (formValues, excludeFields = ['sAMAccountName', 'password']) => {
  const updateData = {};
  
  Object.keys(formValues).forEach(key => {
    if (
      formValues[key] !== undefined && 
      formValues[key] !== null && 
      !excludeFields.includes(key)
    ) {
      updateData[key] = formValues[key];
    }
  });
  
  return updateData;
};

/**
 * Transform form data to API format for user creation
 * @param {Object} formValues - Form values
 * @param {string|null} selectedOU - Selected OU DN
 * @param {Array<string>} selectedGroups - Selected group DNs
 * @returns {Object} - Transformed data ready for API
 */
export const transformFormDataToApiFormat = (formValues, selectedOU, selectedGroups) => {
  // Remove confirmPassword and accountOption before sending to backend
  const { confirmPassword, accountOption, ...dataToSend } = formValues;
  
  // Convert accountOption (single selection) to individual boolean fields
  if (accountOption !== undefined && accountOption !== 'none') {
    Object.assign(dataToSend, convertAccountOptionToFields(accountOption));
  }
  
  // Add OU and groups to data
  if (selectedOU) {
    dataToSend.ou = selectedOU;
  }
  
  if (selectedGroups && selectedGroups.length > 0) {
    dataToSend.groups = selectedGroups;
  }
  
  return dataToSend;
};

/**
 * Check if form values have any changes compared to original user
 * @param {Object} formValues - Current form values
 * @param {Object} originalUser - Original user data
 * @param {Array<string>} excludeFields - Fields to exclude from comparison
 * @returns {boolean} - True if there are changes
 */
export const hasFormChanges = (formValues, originalUser, excludeFields = ['sAMAccountName', 'password']) => {
  if (!originalUser) return true;
  
  return Object.keys(formValues).some(key => {
    if (excludeFields.includes(key)) return false;
    
    const formValue = formValues[key];
    const originalValue = originalUser[key];
    
    // Handle undefined/null comparison
    if (formValue === undefined || formValue === null) return false;
    if (originalValue === undefined || originalValue === null) return formValue !== undefined && formValue !== null;
    
    // Compare values
    return formValue !== originalValue;
  });
};

/**
 * Parse user account control options from userAccountControl value
 * @param {string|number} userAccountControl - User account control value
 * @returns {Object} - Parsed account options
 */
export const parseAccountOptions = (userAccountControl) => {
  if (!userAccountControl) {
    return {
      passwordMustChange: false,
      userCannotChangePassword: false,
      passwordNeverExpires: false,
      storePasswordReversible: false,
    };
  }
  
  const uac = parseInt(userAccountControl, 10);
  return {
    passwordMustChange: !!(uac & 0x80000),  // PASSWORD_EXPIRED
    userCannotChangePassword: !!(uac & 0x40),  // PASSWD_CANT_CHANGE
    passwordNeverExpires: !!(uac & 0x10000),  // DONT_EXPIRE_PASSWD
    storePasswordReversible: !!(uac & 0x80),  // ENCRYPTED_TEXT_PASSWORD_ALLOWED
  };
};

/**
 * Build user account control value from options
 * @param {number} baseUac - Base user account control value
 * @param {Object} options - Account options
 * @returns {number} - Built user account control value
 */
export const buildAccountControl = (baseUac, options) => {
  let uac = baseUac || 512;  // Default to normal account
  
  // PASSWORD_EXPIRED (0x80000) - User must change password at next logon
  if (options.passwordMustChange) {
    uac |= 0x80000;
  } else {
    uac &= ~0x80000;
  }
  
  // PASSWD_CANT_CHANGE (0x40) - User cannot change password
  if (options.userCannotChangePassword) {
    uac |= 0x40;
  } else {
    uac &= ~0x40;
  }
  
  // DONT_EXPIRE_PASSWD (0x10000) - Password never expires
  if (options.passwordNeverExpires) {
    uac |= 0x10000;
  } else {
    uac &= ~0x10000;
  }
  
  // ENCRYPTED_TEXT_PASSWORD_ALLOWED (0x80) - Store password using reversible encryption
  if (options.storePasswordReversible) {
    uac |= 0x80;
  } else {
    uac &= ~0x80;
  }
  
  return uac;
};

/**
 * Determine which account option is selected based on user data
 * @param {Object} user - User object with account options
 * @returns {string} - Selected account option key
 */
export const getSelectedAccountOption = (user) => {
  if (!user) return 'none';
  
  // Check if user has parsed account options
  if (user.passwordMustChange !== undefined) {
    if (user.passwordMustChange) return 'passwordMustChange';
    if (user.userCannotChangePassword) return 'userCannotChangePassword';
    if (user.passwordNeverExpires) return 'passwordNeverExpires';
    if (user.storePasswordReversible) return 'storePasswordReversible';
    return 'none';
  }
  
  // Parse from userAccountControl if available
  if (user.userAccountControl) {
    const options = parseAccountOptions(user.userAccountControl);
    if (options.passwordMustChange) return 'passwordMustChange';
    if (options.userCannotChangePassword) return 'userCannotChangePassword';
    if (options.passwordNeverExpires) return 'passwordNeverExpires';
    if (options.storePasswordReversible) return 'storePasswordReversible';
  }
  
  return 'none';
};

