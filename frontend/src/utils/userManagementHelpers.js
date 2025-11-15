import dayjs from 'dayjs';

export const formatCount = (value) => {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return '0';
};

export const formatDateTime = (value, fallback = '-') => {
  if (!value) return fallback;
  const parsed = dayjs(value);
  if (!parsed.isValid()) return fallback;
  return parsed.format('DD MMM YYYY HH:mm');
};

export const resolveOuLabel = (dn, availableOUs = []) => {
  if (!dn) return 'CN=Users';
  const found = availableOUs.find((ou) => ou.dn === dn);
  if (found?.fullPath) return found.fullPath;
  return dn
    .replace(/,?DC=[^,]+/gi, '')
    .replace(/^CN=/i, '')
    .replace(/^OU=/i, '')
    .replace(/OU=/gi, '')
    .replace(/,/g, ' / ');
};

export const formatErrorDetail = (detail) => {
  if (!detail) return null;

  if (Array.isArray(detail)) {
    return detail
      .map((err) => {
        const field = err.loc?.join(' > ') || 'Unknown field';
        return `• ${field}: ${err.msg}`;
      })
      .join('\n');
  }

  if (typeof detail === 'string') {
    return detail;
  }

  if (typeof detail === 'object') {
    return JSON.stringify(detail, null, 2);
  }

  return String(detail);
};

export const scoreUserRecord = (user = {}) => {
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
};

export const getUserDedupKey = (user = {}) => {
  const displayKey = (user.cn || user.displayName || '').toString().trim().toLowerCase();
  if (displayKey) return displayKey;
  const usernameKey = (user.sAMAccountName || user.userPrincipalName || '')
    .toString()
    .trim()
    .toLowerCase();
  if (usernameKey) return usernameKey;
  return (user.dn || user.id || `unknown-${Math.random()}`).toString().trim().toLowerCase();
};

export const deduplicateUsers = (
  userList = [],
  {
    getKey = getUserDedupKey,
    scoreFn = scoreUserRecord,
  } = {}
) => {
  const map = new Map();
  userList.forEach((user) => {
    const key = getKey(user);
    const candidateScore = scoreFn(user);
    const existing = map.get(key);
    if (!existing || candidateScore >= existing.score) {
      const mergedUser = { ...(existing?.user || {}), ...user };
      map.set(key, {
        user: mergedUser,
        score: Math.max(candidateScore, existing?.score || 0),
      });
    }
  });
  return Array.from(map.values()).map((entry) => entry.user);
};

