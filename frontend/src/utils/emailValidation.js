/**
 * Email Validation Utility
 * Client-side regex check used to give instant feedback on email inputs.
 */

/**
 * Local part: letters, digits and . _ % + - (no leading, trailing or consecutive dots).
 * Domain: one or more labels that do not start or end with a hyphen, ending in a TLD of 2+ letters.
 */
export const EMAIL_REGEX = /^[A-Za-z0-9_%+-]+(\.[A-Za-z0-9_%+-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

/**
 * Returns an error message for an invalid email, or an empty string when it is valid.
 * Empty input returns no message; the field's `required` attribute covers that case.
 *
 * @param {string} value - Raw email input value
 * @returns {string} Validation message, or '' if valid or empty
 */
export const getEmailError = (value) => {
    if (!value) return '';
    return EMAIL_REGEX.test(value) ? '' : 'Please enter a valid email address (e.g. name@example.com).';
};
