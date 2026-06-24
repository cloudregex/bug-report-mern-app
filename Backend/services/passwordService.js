import bcrypt from 'bcryptjs';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_HISTORY_LIMIT = 5;

const PASSWORD_RULES = [
  { test: (p) => p.length >= PASSWORD_MIN_LENGTH, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` },
  { test: (p) => /[A-Z]/.test(p), message: 'Password must contain at least one uppercase letter' },
  { test: (p) => /[a-z]/.test(p), message: 'Password must contain at least one lowercase letter' },
  { test: (p) => /[0-9]/.test(p), message: 'Password must contain at least one number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), message: 'Password must contain at least one special character' }
];

export const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }

  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) {
      return { valid: false, message: rule.message };
    }
  }

  return { valid: true };
};

export const hashPassword = (password) => bcrypt.hash(password, 10);

export const isPasswordInHistory = async (password, passwordHistory = []) => {
  for (const oldHash of passwordHistory) {
    if (await bcrypt.compare(password, oldHash)) {
      return true;
    }
  }
  return false;
};

export const pushPasswordHistory = (user, newHash) => {
  const history = [...(user.passwordHistory || []), newHash];
  user.passwordHistory = history.slice(-PASSWORD_HISTORY_LIMIT);
};
