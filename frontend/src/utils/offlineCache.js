/**
 * Short-lived, ID-only browser tombstones (C7).
 *
 * Deletion itself is server-side. These entries exist only to stop a just
 * deleted row flickering back before the next fetch completes, and expire
 * automatically so they cannot hide a future item with a reused id.
 */
const KEY = 'nutrimunch_recently_deleted_notif_ids';
export const TOMBSTONE_TTL_MILLIS = 24 * 60 * 60 * 1000; // 24 hours

export const getRecentDeletions = () => {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
        const now = Date.now();
        if (!Array.isArray(raw)) return [];
        return raw.filter(e => e && typeof e.id === 'string'
            && Number.isFinite(e.at) && now - e.at < TOMBSTONE_TTL_MILLIS);
    } catch (err) {
        console.warn('[Offline] unreadable recent-deletion cache:', err);
        return [];
    }
};

export const recentlyDeletedIds = () =>
    new Set(getRecentDeletions().map(e => e.id));

export const markRecentlyDeleted = (ids) => {
    try {
        const now = Date.now();
        const kept = getRecentDeletions();
        const seen = new Set(kept.map(e => e.id));
        for (const id of ids) {
            const key = String(id);
            if (!seen.has(key)) { kept.push({ id: key, at: now }); seen.add(key); }
        }
        localStorage.setItem(KEY, JSON.stringify(kept));
    } catch (e) {
        console.warn('[Offline] could not record recent deletion:', e);
    }
};
