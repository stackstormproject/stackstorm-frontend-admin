/**
 * Maps sign-in errors to a form message and per-field messages.
 * @returns {{ form: string|null, fields: Record<string,string> }}
 */
export const describeSignInError = (error) => {
  const fields = {};
  (Array.isArray(error?.details) ? error.details : []).forEach((detail) => {
    if (detail?.field && !fields[detail.field]) fields[detail.field] = detail.message;
  });
  if (error?.code === 'INVALID_CREDENTIALS') {
    return { form: 'That email and password do not match a staff account.', fields };
  }
  if (error?.code === 'ACCOUNT_LOCKED') {
    return { form: 'Too many failed attempts. The account is locked for 15 minutes.', fields };
  }
  if (error?.code === 'VALIDATION_ERROR') {
    return { form: Object.keys(fields).length ? null : error.message, fields };
  }
  if (error?.status === 429) {
    return { form: 'Too many attempts from this device. Wait a few minutes.', fields };
  }
  return { form: error?.message || 'Something went wrong. Please try again.', fields };
};

/** Only same-site paths are allowed as a post-sign-in destination (no open redirect). */
export const safeNext = (next) =>
  typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && next !== '/login'
    ? next
    : null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateSignIn = ({ email, password }) => {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your work email.';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
};
