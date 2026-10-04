/**
 * Form Validation & Normalization Utility
 * Defines consistent UX, validation, normalization, accessibility, and security rules
 * for all input fields across the Bug Tracker application.
 */

// ── Control Characters Regex ──────────────────────────────────────────────────
// Matches C0 control characters (0x00-0x1F) and DEL (0x7F)
export const controlCharRegex = /[\u0000-\u001F\u007F]/;
// Matches null character specifically for multiline fields that allow line breaks
export const nullCharRegex = /\u0000/;

// ── Full Name Validation & Normalization ──────────────────────────────────────
/**
 * Normalizes full name by trimming outer whitespace and collapsing repeated spaces.
 * Preserves casing, accents, and original Unicode characters.
 */
export function normalizeFullName(value) {
  if (!value) return '';
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Unicode-aware name pattern supporting:
 * - Unicode letters (\p{L}) and combining marks (\p{M})
 * - Spaces between words
 * - Apostrophes (ASCII ' and Unicode curly ’ \u2019)
 * - Hyphens (-)
 * - Periods (e.g. Dr., Jr., III)
 */
export const unicodeNameRegex = /^[\p{L}\p{M}]+(?:[ '\u2019.-][\p{L}\p{M}]+)*$/u;

/**
 * Validates a person's full name.
 * Permissive to international conventions, strict on unsafe or garbage inputs.
 */
export function validateFullName(value, options = {}) {
  const {
    fieldName = 'full name',
    required = true,
    maxLength = 100,
    allowCompanyParentheses = false // used for client names like "Acme Corp (John Doe)"
  } = options;

  if (!value || !value.trim()) {
    if (required) {
      return { valid: false, message: `Please enter your ${fieldName}.` };
    }
    return { valid: true };
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return { valid: false, message: `Name must be ${maxLength} characters or fewer.` };
  }

  if (controlCharRegex.test(trimmed)) {
    return { valid: false, message: 'Name contains invalid control characters.' };
  }

  if (allowCompanyParentheses) {
    // Allows letters, numbers, spaces, hyphens, apostrophes, periods, and parentheses
    const clientNameRegex = /^[\p{L}\p{M}\p{N}]+(?:[ '\u2019().&/ -][\p{L}\p{M}\p{N}]+)*$/u;
    if (!clientNameRegex.test(trimmed)) {
      return { valid: false, message: 'Please enter a valid client name without prohibited symbols.' };
    }
    return { valid: true };
  }

  if (!unicodeNameRegex.test(trimmed)) {
    return { valid: false, message: 'Please enter a valid name using letters, spaces, hyphens, or apostrophes.' };
  }

  return { valid: true };
}

// ── Company / Organization Name Validation ────────────────────────────────────
export function normalizeCompanyName(value) {
  if (!value) return '';
  return value.trim().replace(/\s+/g, ' ');
}

export function validateCompanyName(value, options = {}) {
  const {
    fieldName = 'company name',
    required = true,
    minLength = 2,
    maxLength = 100,
  } = options;

  if (!value || !value.trim()) {
    if (required) {
      return { valid: false, message: `Please enter your ${fieldName}.` };
    }
    return { valid: true };
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return { valid: false, message: `Company name must be at least ${minLength} characters.` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, message: `Company name must be ${maxLength} characters or fewer.` };
  }

  if (controlCharRegex.test(trimmed)) {
    return { valid: false, message: 'Company name contains invalid control characters.' };
  }

  if (/[<>]/.test(trimmed)) {
    return { valid: false, message: 'Company name cannot contain HTML brackets (< or >).' };
  }

  return { valid: true };
}

// ── Email Address Validation ──────────────────────────────────────────────────
export const emailRegex = /^[a-z0-9]+(?:[._%+-][a-z0-9]+)*@[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/;

export function normalizeEmail(value) {
  if (!value) return '';
  return value.trim().toLowerCase();
}

export function validateEmail(email, options = {}) {
  const { required = true } = options;

  if (!email || !email.trim()) {
    if (required) {
      return { valid: false, message: 'Please enter your email address.' };
    }
    return { valid: true };
  }

  const trimmed = email.trim();

  if (trimmed.length > 254) {
    return { valid: false, message: 'Email address must be 254 characters or fewer.' };
  }

  if (controlCharRegex.test(trimmed)) {
    return { valid: false, message: 'Email address contains invalid characters.' };
  }

  if (/[A-Z]/.test(trimmed)) {
    return { valid: false, message: 'Email address must be lowercase and cannot contain uppercase letters.' };
  }

  if (!emailRegex.test(trimmed)) {
    return { valid: false, message: 'Please enter a valid email address (e.g. name@domain.com) with lowercase letters and no irregular symbols.' };
  }

  return { valid: true };
}

// ── Password Validation ───────────────────────────────────────────────────────
export function validatePasswordStrength(password) {
  if (!password) {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters.' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password must be 128 characters or fewer.' };
  }
  if (controlCharRegex.test(password)) {
    return { valid: false, message: 'Password contains invalid control characters.' };
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
}

export function validateLoginPassword(password) {
  if (!password) {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password must be 128 characters or fewer.' };
  }
  if (controlCharRegex.test(password)) {
    return { valid: false, message: 'Password contains invalid characters.' };
  }
  return { valid: true };
}

export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) {
    return { valid: false, message: 'Please confirm your password.' };
  }
  if (password !== confirmPassword) {
    return { valid: false, message: 'Passwords do not match.' };
  }
  return { valid: true };
}

// ── Project Validation ────────────────────────────────────────────────────────
export function normalizeText(value) {
  if (!value) return '';
  return value.trim().replace(/[ \t]+/g, ' ');
}

export function validateProjectName(name) {
  if (!name || !name.trim()) {
    return { valid: false, message: 'Please enter a project name.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, message: 'Project name must be at least 2 characters.' };
  }
  if (trimmed.length > 100) {
    return { valid: false, message: 'Project name must be 100 characters or fewer.' };
  }
  if (controlCharRegex.test(trimmed)) {
    return { valid: false, message: 'Project name contains invalid control characters.' };
  }
  if (/[<>]/.test(trimmed)) {
    return { valid: false, message: 'Project name cannot contain HTML brackets (< or >).' };
  }
  return { valid: true };
}

export function validateProjectDescription(description) {
  if (!description) return { valid: true };
  if (description.length > 1000) {
    return { valid: false, message: 'Project description must be 1,000 characters or fewer.' };
  }
  if (nullCharRegex.test(description)) {
    return { valid: false, message: 'Description contains invalid null characters.' };
  }
  return { valid: true };
}

// ── Ticket & Issue Validation ─────────────────────────────────────────────────
export function validateTicketTitle(title) {
  if (!title || !title.trim()) {
    return { valid: false, message: 'Please enter a title.' };
  }
  const trimmed = title.trim();
  if (trimmed.length < 3) {
    return { valid: false, message: 'Title must be at least 3 characters.' };
  }
  if (trimmed.length > 150) {
    return { valid: false, message: 'Title must be 150 characters or fewer.' };
  }
  if (controlCharRegex.test(trimmed)) {
    return { valid: false, message: 'Title contains invalid control characters.' };
  }
  if (/[<>]/.test(trimmed)) {
    return { valid: false, message: 'Title cannot contain HTML brackets (< or >).' };
  }
  return { valid: true };
}

export function validateTicketDescription(description) {
  if (!description) return { valid: true };
  if (description.length > 5000) {
    return { valid: false, message: 'Description must be 5,000 characters or fewer.' };
  }
  if (nullCharRegex.test(description)) {
    return { valid: false, message: 'Description contains invalid null characters.' };
  }
  return { valid: true };
}

// ── Comment Validation ────────────────────────────────────────────────────────
export function validateComment(content) {
  if (!content || !content.trim()) {
    return { valid: false, message: 'Comment cannot be empty.' };
  }
  if (content.length > 2000) {
    return { valid: false, message: 'Comment must be 2,000 characters or fewer.' };
  }
  if (nullCharRegex.test(content)) {
    return { valid: false, message: 'Comment contains invalid null characters.' };
  }
  return { valid: true };
}

// ── File & Image Validation ───────────────────────────────────────────────────
export function validateImageFile(file, options = {}) {
  const {
    maxSizeBytes = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  } = options;

  if (!file) return { valid: true };

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      message: 'Only image files (JPEG, PNG, WebP, GIF) are allowed.'
    };
  }

  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      message: `Image size must be smaller than ${maxMb}MB.`
    };
  }

  return { valid: true };
}

// ── Saved Filter Name Validation ──────────────────────────────────────────────
export function validateFilterName(name) {
  if (!name || !name.trim()) {
    return { valid: false, message: 'Filter name is required.' };
  }
  const trimmed = name.trim();
  if (trimmed.length > 50) {
    return { valid: false, message: 'Filter name must be 50 characters or fewer.' };
  }
  if (controlCharRegex.test(trimmed)) {
    return { valid: false, message: 'Filter name contains invalid characters.' };
  }
  return { valid: true };
}
