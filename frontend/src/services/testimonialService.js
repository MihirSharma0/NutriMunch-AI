/**
 * Testimonial Service
 * Manages client testimonials with dual-layer synchronization
 * between backend REST endpoints and browser localStorage caching.
 */
import api from '../api/axios';

/** LocalStorage cache key for persisting testimonials. */
const STORAGE_KEY = 'nutrimunch_testimonials_v1';

/** Initial default seed testimonials used when no persisted records exist. */
const INITIAL_SEED_TESTIMONIALS = [
    {
        id: 'seed-1',
        authorName: "Sarah Jenkins",
        authorEmail: "sarah.j@example.com",
        authorRole: "Standard User",
        userId: 101,
        rating: 5,
        programResult: "-25 lbs in 4 months",
        content: "I've tried every diet out there, but this was the first time a program actually adapted to my life rather than forcing me to adapt to it. The AI macro adjustments were spot on.",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        status: "APPROVED",
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
    },
    {
        id: 'seed-2',
        authorName: "Marcus Vance",
        authorEmail: "marcus.vance@example.com",
        authorRole: "Standard User",
        userId: 102,
        rating: 5,
        programResult: "Reversed Pre-diabetes",
        content: "The clinical precision of the meal plans combined with the continuous glucose monitoring integration gave me the exact blueprint I needed to regain control of my health.",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        status: "APPROVED",
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
        id: 'seed-3',
        authorName: "Dr. Elena Rodriguez",
        authorEmail: "elena.r@example.com",
        authorRole: "Certified Nutritionist",
        userId: 103,
        rating: 5,
        programResult: "PCOS Symptoms Managed",
        content: "Finally, a platform that understands hormonal health and micronutrient synergy. The combination of expert nutritionist tools and AI tracking makes balancing patient macros effortless.",
        avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        status: "APPROVED",
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    }
];

/**
 * Retrieves cached testimonials from localStorage or initializes default seeds.
 * 
 * @returns {Array<Object>} List of cached testimonial records
 */
export const getLocalTestimonials = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_TESTIMONIALS));
            return INITIAL_SEED_TESTIMONIALS;
        }
        return JSON.parse(stored);
    } catch (e) {
        return INITIAL_SEED_TESTIMONIALS;
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
        if (Array.isArray(res.data) && res.data.length > 0) {
            // Sync backend data into local storage as cache
            localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
            return res.data;
        }
    } catch (err) {
        console.warn("Backend /testimonials endpoint unreachable or empty, using local cache:", err);
    }
    return getLocalTestimonials();
};

/**
 * Creates or updates a testimonial via the backend API and syncs local storage.
 * 
 * @param {Object} testimonialData - Testimonial details including author and content
 * @returns {Promise<Object>} The saved testimonial item
 */
export const saveTestimonial = async (testimonialData) => {
    let savedItem = null;
    try {
        if (testimonialData.id && !String(testimonialData.id).startsWith('seed-') && !String(testimonialData.id).startsWith('local-')) {
            const res = await api.put(`/testimonials/${testimonialData.id}`, testimonialData);
            savedItem = res.data;
        } else {
            const res = await api.post('/testimonials', testimonialData);
            savedItem = res.data;
        }
    } catch (err) {
        console.warn("Backend API save failed, operating in offline/localStorage mode:", err);
    }

    // Always update local storage
    const currentList = getLocalTestimonials();
    const existingIndex = currentList.findIndex(t => t.id === testimonialData.id || (t.authorEmail && t.authorEmail === testimonialData.authorEmail));

    const newItem = savedItem || {
        ...testimonialData,
        id: testimonialData.id || `local-${Date.now()}`,
        createdAt: testimonialData.createdAt || new Date().toISOString(),
        status: 'APPROVED'
    };

    if (existingIndex >= 0) {
        currentList[existingIndex] = { ...currentList[existingIndex], ...newItem };
    } else {
        currentList.unshift(newItem);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
    window.dispatchEvent(new Event('nutrimunch_testimonials_updated'));
    return newItem;
};

/**
 * Deletes a testimonial by ID from the backend API and local storage cache.
 * 
 * @param {string|number} id - Identifier of the testimonial to remove
 * @returns {Promise<boolean>} True if deletion succeeded
 */
export const deleteTestimonial = async (id) => {
    try {
        if (!String(id).startsWith('seed-') && !String(id).startsWith('local-')) {
            await api.delete(`/testimonials/${id}`);
        }
    } catch (err) {
        console.warn("Backend API delete failed:", err);
    }

    const currentList = getLocalTestimonials().filter(t => String(t.id) !== String(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
    window.dispatchEvent(new Event('nutrimunch_testimonials_updated'));
    return true;
};
