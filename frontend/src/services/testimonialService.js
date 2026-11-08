/**
 * Testimonial Service
 * Manages client testimonials with dual-layer synchronization
 * between backend REST endpoints and browser localStorage caching.
 */
import api from '../api/axios';

/** LocalStorage cache key for persisting testimonials. */
const STORAGE_KEY = 'nutrimunch_testimonials_v1';

/**
 * Retrieves cached testimonials from localStorage. No sample records are
 * created: an empty cache is simply an empty list.
 *
 * @returns {Array<Object>} List of cached testimonial records
 */
export const getLocalTestimonials = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
};

/**
 * Fetches approved testimonials from the backend API, syncing them into
 * localStorage, or falls back to locally stored cache if the network fails.
 * 
 * @returns {Promise<Array<Object>>} List of approved testimonials
 */
export const fetchAllTestimonials = async () => {
    try {
        const res = await api.get('/testimonials/approved');
        if (Array.isArray(res.data)) {
            // The server list is authoritative, including when it is empty.
            localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
            return res.data;
        }
    } catch (err) {
        console.warn("Backend /testimonials endpoint unreachable, using local cache:", err);
    }
    return getLocalTestimonials();
};

/**
 * Fetches ALL testimonials (including hidden/PENDING ones) for the admin
 * moderation screen. Requires an ADMIN session. This deliberately does not
 * write to the public localStorage cache, so hidden items never leak into the
 * marketing page's offline fallback.
 *
 * @returns {Promise<Array<Object>>} All testimonial records, or [] on failure
 */
export const fetchAllForAdmin = async () => {
    try {
        const res = await api.get('/testimonials');
        return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
        console.warn('Admin testimonial list unavailable:', err);
        return [];
    }
};

/**
 * Creates or updates a testimonial via the backend API and syncs local storage.
 * 
 * @param {Object} testimonialData - Testimonial details including author and content
 * @returns {Promise<Object>} The saved testimonial item
 */
export const saveTestimonial = async (testimonialData) => {
    // A testimonial exists only once the server has persisted it. Never invent
    // a browser-only `local-*` row that would be shown as an approved review.
    let savedItem;
    if (testimonialData.id && !String(testimonialData.id).startsWith('local-')) {
        const res = await api.put(`/testimonials/${testimonialData.id}`, testimonialData);
        savedItem = res.data;
    } else {
        const res = await api.post('/testimonials', testimonialData);
        savedItem = res.data;
    }

    // Mirror the server record into the public offline cache only after success.
    try {
        const currentList = getLocalTestimonials();
        const existingIndex = currentList.findIndex(t =>
            t.id === savedItem?.id || (t.authorEmail && t.authorEmail === testimonialData.authorEmail));
        if (existingIndex >= 0) {
            currentList[existingIndex] = { ...currentList[existingIndex], ...savedItem };
        } else {
            currentList.unshift(savedItem);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
    } catch (err) {
        console.warn('Could not mirror testimonial into offline cache:', err);
    }
    window.dispatchEvent(new Event('nutrimunch_testimonials_updated'));
    return savedItem;
};

/**
 * Deletes a testimonial by ID from the backend API and local storage cache.
 * 
 * @param {string|number} id - Identifier of the testimonial to remove
 * @returns {Promise<boolean>} True if deletion succeeded
 */
export const deleteTestimonial = async (id) => {
    try {
        if (!String(id).startsWith('local-')) {
            await api.delete(`/testimonials/${id}`);
        }
    } catch (err) {
        console.error('Failed to delete testimonial:', err);
        return false;
    }

    const currentList = getLocalTestimonials().filter(t => String(t.id) !== String(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
    window.dispatchEvent(new Event('nutrimunch_testimonials_updated'));
    return true;
};
