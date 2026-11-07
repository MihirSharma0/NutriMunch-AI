/**
 * Login Module Validation
 *
 * Shared, deterministic rules for the login form so invalid input is rejected in
 * the browser before any network request. Mirrors the backend limits and the
 * supplied login-module test specification (TC1–TC5).
 *
 * Note on the supplied spec: it describes a "username" of at most 20 characters
 * drawn from [A-Za-z0-9!@#$%^&*()]. NutriMunch authenticates by email address,
 * which necessarily contains '@' and '.' and is commonly longer than 20 chars.
 * The identifier rule is therefore adapted to a 254-character email format, while
 * every other rule (empty-field message, unified failure message, masked password,
 * button gating, stable identifiers, success message) is implemented exactly.
 */
import { EMAIL_REGEX } from './emailValidation';

/** Maximum identifier length (RFC 5321 mailbox limit). */
export const MAX_EMAIL_LENGTH = 254;

/**
 * Maximum submitted password length. Registration enforces 6–40 characters, but
 * existing accounts (admin credential updates, Google-provisioned passwords) can
 * be longer, so login uses a generous ceiling instead of the spec's 20.
 */
export const MAX_PASSWORD_LENGTH = 128;

/** Exact response strings required by the login-module specification. */
export const LOGIN_MESSAGES = Object.freeze({
    EMPTY_FIELDS: 'Fields cannot be empty',
    SUCCESS: 'Login Successful',
    INVALID: 'Invalid Username/Password',
    NETWORK: 'Unable to reach the server. Please try again.'
});

/**
 * Validates both fields before a login request is sent.
 *
 * @param {string} email - Raw identifier input
 * @param {string} password - Raw password input
 * @returns {string} The message to display, or '' when the input is acceptable
 */
export const validateLoginFields = (email, password) => {
    const rawEmail = String(email ?? '');
    const rawPassword = String(password ?? '');

    if (!rawEmail.trim() || !rawPassword.trim()) return LOGIN_MESSAGES.EMPTY_FIELDS;
    if (rawEmail.length > MAX_EMAIL_LENGTH || rawPassword.length > MAX_PASSWORD_LENGTH) {
        return LOGIN_MESSAGES.INVALID;
    }
    if (!EMAIL_REGEX.test(rawEmail.trim())) return LOGIN_MESSAGES.INVALID;
    return '';
};

/** True only when both text boxes contain a non-blank value (spec: btnLogin gating). */
export const areLoginFieldsFilled = (email, password) =>
    String(email ?? '').trim().length > 0 && String(password ?? '').trim().length > 0;

/**
 * Resolves the message shown to the user. Expected credential outcomes keep
 * their original actionable text. Unexpected backend failures carry a `debug`
 * field: that technical detail is printed to Inspect -> Console while the user
 * only sees the generic message.
 *
 * @param {Object} error - Axios-style error
 * @returns {string} Message to display
 */
export const describeLoginError = (error) => {
    const data = error?.response?.data;
    if (!error?.response) return LOGIN_MESSAGES.NETWORK;
    if (data?.debug) {
        console.error('[login] Unexpected authentication error:', data.debug);
    }
    const serverMsg = data?.message || data?.error || (typeof data === 'string' ? data : '');
    return serverMsg || LOGIN_MESSAGES.INVALID;
};
