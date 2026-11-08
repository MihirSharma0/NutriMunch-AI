/**
 * Diet Plan Synchronization & Storage Utilities
 * Provides resilient cross-tab synchronization (BroadcastChannel + LocalStorage)
 * and reconciliation between backend REST endpoints and local offline caches.
 */
// Diet Plan Synchronization & Permanent Deletion Utility
// Provides single-source-of-truth syncing across Nutritionist, User Dashboard, and Admin Portal

/**
 * Deletion is owned by the backend: published plans are soft-deleted in the
 * `nutritionist_diet_plans` table and every read query filters `deleted = false`.
 * Browser tombstones (and title-based matching) were removed in C7 because they
 * hid *new* plans that happened to reuse a deleted plan's title, and because a
 * deletion only persisted in one browser. Local caches are cleared here purely
 * so stale entries do not linger until the next server fetch.
 */
/**
 * Permanently purges a diet plan from backend storage, active session caches,
 * and local storage registries, broadcasting removal across browser tabs.
 * 
 * @param {Object|string|number} planOrId - Plan object or identifier to remove
 * @param {Object} [apiInstance=null] - Optional Axios instance for remote API calls
 * @returns {Promise<boolean>} True if deletion completed
 */
export const permanentlyDeleteDietPlan = async (planOrId, apiInstance = null) => {
    if (!planOrId) return false;

    const strId = typeof planOrId === 'object' && planOrId !== null
        ? String(planOrId.id || '').trim()
        : String(planOrId).trim();

    // Match by ID only. Titles are not unique and must never be used to hide
    // a different (newer) plan.
    const isMatch = (item) => item && strId && String(item.id || '').trim() === strId;

    // 2. Remove from History Vault
    try {
        const rawHistory = localStorage.getItem('nutrimunch_diet_plans_history');
        if (rawHistory) {
            const history = JSON.parse(rawHistory);
            if (Array.isArray(history)) {
                const updated = history.filter(p => !isMatch(p));
                localStorage.setItem('nutrimunch_diet_plans_history', JSON.stringify(updated));
            }
        }
    } catch (e) {}

    // 3. Remove from Latest Deployed Plan
    try {
        const rawLatest = localStorage.getItem('nutrimunch_latest_deployed_plan');
        if (rawLatest) {
            const latest = JSON.parse(rawLatest);
            if (isMatch(latest)) {
                const history = JSON.parse(localStorage.getItem('nutrimunch_diet_plans_history') || '[]');
                if (history.length > 0) {
                    localStorage.setItem('nutrimunch_latest_deployed_plan', JSON.stringify(history[0]));
                    localStorage.setItem('nutrimunch_latest_deployed_plan_id', String(history[0].id));
                } else {
                    localStorage.removeItem('nutrimunch_latest_deployed_plan');
                    localStorage.removeItem('nutrimunch_latest_deployed_plan_id');
                }
            }
        }
    } catch (e) {}

    // 4. Remove from General Plan cache
    try {
        const rawGen = localStorage.getItem('nutrimunch_general_diet_plan');
        if (rawGen) {
            const gen = JSON.parse(rawGen);
            if (isMatch(gen)) {
                const history = JSON.parse(localStorage.getItem('nutrimunch_diet_plans_history') || '[]');
                const nextGen = history.find(p => (p.scope === 'GENERAL' || p.targetMode === 'GENERAL') && !isMatch(p));
                if (nextGen) {
                    localStorage.setItem('nutrimunch_general_diet_plan', JSON.stringify(nextGen));
                } else {
                    localStorage.removeItem('nutrimunch_general_diet_plan');
                }
            }
        }
    } catch (e) {}

    // 5. Remove from Exclusive Plans map
    try {
        const rawExcl = localStorage.getItem('nutrimunch_exclusive_diet_plans');
        if (rawExcl) {
            const exclMap = JSON.parse(rawExcl);
            let modified = false;
            Object.keys(exclMap).forEach(key => {
                if (exclMap[key] && isMatch(exclMap[key])) {
                    delete exclMap[key];
                    modified = true;
                }
            });
            if (modified) {
                localStorage.setItem('nutrimunch_exclusive_diet_plans', JSON.stringify(exclMap));
            }
        }
    } catch (e) {}

    // 7. Broadcast across tabs via BroadcastChannel
    try {
        const bc = new BroadcastChannel('nutrimunch_diet_plan_channel');
        bc.postMessage({ type: 'DIET_PLAN_DELETED', planId: strId });
        setTimeout(() => {
            try { bc.close(); } catch (err) {}
        }, 1000);
    } catch (e) {}

    // 8. Fire local window events
    window.dispatchEvent(new CustomEvent('nutrimunch_diet_plan_deleted', { detail: { planId: strId } }));
    window.dispatchEvent(new Event('nutrimunch_diet_history_updated'));
    window.dispatchEvent(new Event('nutrimunch_diet_plan_updated'));
    window.dispatchEvent(new Event('storage'));

    // 9. Delete from the backend database. Surface a failed delete so the
    // caller never reports success for a deletion the server did not commit.
    if (apiInstance && strId) {
        try {
            await apiInstance.delete(`/diet-plans/${encodeURIComponent(strId)}`);
        } catch (err) {
            console.error('Failed to delete diet plan from server:', err);
            return false;
        }
    }

    return true;
};

/**
 * Merges and normalizes diet plans from remote endpoints and local storage caches,
 * applying scope filters (GENERAL vs EXCLUSIVE for current user) and deduplicating by ID/title.
 * 
 * @param {Object} params - Configuration and filter options
 * @param {Array<Object>} params.apiPlans - Plans returned by backend API
 * @param {Array<Object>} params.localHistory - Cached history plans
 * @param {Object|null} params.generalPlan - Active general diet plan
 * @param {Object|null} params.exclusivePlan - Active exclusive diet plan for user
 * @param {string|number} params.currentUserId - Authenticated user ID
 * @param {string} params.currentUserEmail - Authenticated user email
 * @param {string} params.currentUserName - Authenticated user display name
 * @returns {Array<Object>} Normalized, deduplicated, and sorted diet plan list
 */
export const normalizeAndDeduplicatePlans = ({
    rawList = [],
    currentUserId = '',
    currentUserEmail = '',
    currentUserName = '',
    isUserView = false
}) => {
    const seenIds = new Set();
    const seenCanonicalKeys = new Set();
    const normalized = [];

    const uId = String(currentUserId || '').trim();
    const uEmail = String(currentUserEmail || '').toLowerCase().trim();
    const uName = String(currentUserName || '').toLowerCase().trim();

    // 1. Normalize items and enforce user isolation
    rawList.forEach((item, idx) => {
        if (!item) return;
        const id = String(item.id || `plan_auto_${idx}`);

        // Deletion is server-side: the backend already excludes soft-deleted
        // plans, so no browser blacklist is applied here.
        const title = (item.title || item.planTitle || 'Custom Protocol').trim();

        // Scope resolution:
        // If targetMode or scope is EXCLUSIVE -> EXCLUSIVE.
        // If targetMode or scope is GENERAL -> GENERAL.
        const rawScope = String(item.scope || item.targetMode || '').toUpperCase().trim();
        const isExclusive = rawScope === 'EXCLUSIVE' || (Boolean(item.targetUserId) && rawScope !== 'GENERAL');

        const targetNameLower = (item.targetUserName || '').toLowerCase().trim();
        const targetEmailLower = (item.targetUserEmail || '').toLowerCase().trim();
        const targetIdStr = String(item.targetUserId || '').trim();

        const isMyExclusive = isExclusive && (
            (uId && targetIdStr === uId) ||
            (uEmail && targetEmailLower === uEmail) ||
            (uName && targetNameLower && (uName.includes(targetNameLower) || targetNameLower.includes(uName))) ||
            Boolean(item.isExclusiveForUser)
        );

        // Security / Clinical Isolation:
        // When rendered on a patient dashboard, NEVER show other patients' exclusive plans!
        if (isUserView && isExclusive && !isMyExclusive) {
            return;
        }

        const scope = isExclusive ? 'EXCLUSIVE' : 'GENERAL';

        let timestamp = 0;
        if (item.deployedAt) {
            const parsed = new Date(item.deployedAt).getTime();
            if (!isNaN(parsed)) timestamp = parsed;
        }

        const nutritionistEmail = item.nutritionistEmail || item.authorEmail || (item.author && item.author.includes('@') ? item.author : '');

        normalized.push({
            ...item,
            id,
            title,
            planTitle: title,
            scope,
            nutritionistEmail: nutritionistEmail || item.nutritionistEmail || '',
            isExclusiveForUser: isMyExclusive,
            timestamp
        });
    });

    // 2. Sort newest timestamp first so the latest iteration takes precedence
    normalized.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // 3. Deduplicate by unique ID and Canonical Key (collapses repetitive iterations with identical title & scope)
    const deduplicated = [];
    normalized.forEach(item => {
        if (seenIds.has(item.id)) return;

        const normalizedTitle = item.title.toLowerCase().trim();
        const canonicalKey = `${item.scope}_${normalizedTitle}`;

        if (seenCanonicalKeys.has(canonicalKey)) {
            return;
        }

        seenIds.add(item.id);
        seenCanonicalKeys.add(canonicalKey);
        deduplicated.push(item);
    });

    return deduplicated;
};
