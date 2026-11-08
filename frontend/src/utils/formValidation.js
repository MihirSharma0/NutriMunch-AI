/**
 * Shared form validation rules (C8).
 *
 * Pure functions only — no React, no network, no storage. Mirrors the backend
 * bean limits so an obviously invalid value is rejected before a round trip.
 * Reuses C1's email helper rather than duplicating it.
 */
import { EMAIL_REGEX, getEmailError } from './emailValidation';

export { EMAIL_REGEX, getEmailError };

/** Backend RegisterRequest: @Size(min = 6, max = 40) on password. */
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 40;

/** Name / free-text caps mirroring the backend DTO limits. */
export const NAME_MAX_LENGTH = 80;
export const CONTENT_MAX_LENGTH = 4000;
export const NOTES_MAX_LENGTH = 2000;
export const SHORT_TEXT_MAX_LENGTH = 200;

/** Barcode (EAN-8 / EAN-13 / UPC): 8–14 digits. */
export const BARCODE_REGEX = /^\d{8,14}$/;
/** OTP: exactly 6 digits. */
export const OTP_REGEX = /^\d{6}$/;
/** Positive money amount, at most 2 decimals. */
export const MONEY_REGEX = /^\d+(\.\d{1,2})?$/;

/** @returns error message or '' when the password is acceptable. */
export const getPasswordError = (value, { optional = false } = {}) => {
    const raw = String(value ?? '');
    if (!raw && optional) return '';
    if (!raw) return 'Password is required.';
    if (raw.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    if (raw.length > PASSWORD_MAX_LENGTH) return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
    return '';
};

/** @returns error message or '' when a required short text field is acceptable. */
export const getShortTextError = (value, label = 'This field', max = SHORT_TEXT_MAX_LENGTH) => {
    const raw = String(value ?? '');
    if (!raw.trim()) return `${label} is required.`;
    if (raw.length > max) return `${label} must be at most ${max} characters.`;
    return '';
};

/** @returns error message or '' when a longer text field is acceptable. */
export const getContentError = (value, label = 'This field', max = CONTENT_MAX_LENGTH, required = true) => {
    const raw = String(value ?? '');
    if (!raw.trim() && required) return `${label} is required.`;
    if (raw.length > max) return `${label} must be at most ${max} characters.`;
    return '';
};

/** Clamp-and-validate a numeric field; returns { value, error }. */
export const getNumberError = (raw, { min = 0, max = Number.MAX_SAFE_INTEGER, label = 'Value', required = true } = {}) => {
    if (raw === '' || raw === null || raw === undefined) {
        return { value: null, error: required ? `${label} is required.` : '' };
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) return { value: null, error: `${label} must be a valid number.` };
    if (value < min) return { value: null, error: `${label} must be at least ${min}.` };
    if (value > max) return { value: null, error: `${label} must be at most ${max}.` };
    return { value, error: '' };
};

/** Nutrition macro ranges used by the diet-plan builder (FV-05). */
export const MACRO_LIMITS = Object.freeze({
    calories: { min: 800, max: 6000, label: 'Calories' },
    protein: { min: 0, max: 1000, label: 'Protein (g)' },
    carbs: { min: 0, max: 2000, label: 'Carbs (g)' },
    fats: { min: 0, max: 500, label: 'Fats (g)' },
    waterLiters: { min: 0, max: 20, label: 'Water (L)' }
});

/** @returns first macro validation error, or '' when all are acceptable. */
export const getMacroError = (values) => {
    for (const [key, rule] of Object.entries(MACRO_LIMITS)) {
        const { error } = getNumberError(values?.[key], { ...rule, required: true });
        if (error) return error;
    }
    return '';
};

/** Wallet credit amount: positive, ≤ 1,000,000, at most 2 decimals (FV-06). */
export const getAmountError = (raw) => {
    const text = String(raw ?? '').trim();
    if (!text) return 'Enter an amount.';
    if (!MONEY_REGEX.test(text)) return 'Enter a valid amount with at most 2 decimals.';
    const value = Number(text);
    if (value <= 0) return 'Amount must be greater than zero.';
    if (value > 1000000) return 'Amount must not exceed ₹10,00,000.';
    return '';
};

/** Barcode (FV-12). */
export const getBarcodeError = (raw) => {
    const text = String(raw ?? '').trim();
    if (!text) return 'Enter a barcode.';
    return BARCODE_REGEX.test(text) ? '' : 'Barcode must be 8–14 digits.';
};

/** OTP (FV-14). */
export const getOtpError = (raw) => {
    const text = String(raw ?? '').trim();
    if (!text) return 'Enter the 6-digit code.';
    return OTP_REGEX.test(text) ? '' : 'Enter exactly 6 digits.';
};

/** Testimonial rating (FV-08). */
export const getRatingError = (raw) => {
    const value = Number(raw);
    return Number.isInteger(value) && value >= 1 && value <= 5 ? '' : 'Rating must be between 1 and 5.';
};
