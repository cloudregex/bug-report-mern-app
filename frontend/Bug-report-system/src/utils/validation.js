export const emailRegex = /^[a-z0-9]+(?:[._%+-][a-z0-9]+)*@[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/;

export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return { valid: false, message: 'Email is required.' };
  }
  const trimmed = email.trim();
  if (/[A-Z]/.test(trimmed)) {
    return { valid: false, message: 'Email address must be lowercase and cannot contain uppercase letters.' };
  }
  if (!emailRegex.test(trimmed)) {
    return { valid: false, message: 'Please enter a valid email address (e.g. name@domain.com) with lowercase letters and no irregular symbols.' };
  }
  return { valid: true };
};

export const validatePasswordStrength = (password) => {
  if (!password) {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character.' };
  }
  return { valid: true };
};
