// Diet Plan Synchronization & Permanent Deletion Utility
// Provides single-source-of-truth syncing across Nutritionist, User Dashboard, and Admin Portal

export const getDeletedPlanIds = () => {
    try {
        const stored = localStorage.getItem('nutrimunch_deleted_plan_ids');
        if (!stored) return new Set();
        const parsed = JSON.parse(stored);
        return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch (e) {
        return new Set();
    }
};

export const getDeletedPlanTitles = () => {
    try {
        const stored = localStorage.getItem('nutrimunch_deleted_plan_titles');
        if (!stored) return new Set();
        const parsed = JSON.parse(stored);
        return new Set(Array.isArray(parsed) ? parsed.map(s => String(s).toLowerCase().trim()) : []);
    } catch (e) {
        return new Set();
    }
};

export const permanentlyDeleteDietPlan = async (planOrId, apiInstance = null) => {
    if (!planOrId) return false;

    let strId = '';
    let targetTitle = '';

    if (typeof planOrId === 'object' && planOrId !== null) {
        strId = String(planOrId.id || '').trim();
        targetTitle = String(planOrId.title || planOrId.planTitle || '').toLowerCase().trim();
    } else {
        strId = String(planOrId).trim();
    }

    // Attempt to locate plan title from local history if not already found
    if (!targetTitle) {
        try {
            const rawHist = localStorage.getItem('nutrimunch_diet_plans_history');
            if (rawHist) {
                const hist = JSON.parse(rawHist);
                const found = hist.find(p => String(p.id) === strId);
                if (found) {
                    targetTitle = String(found.title || found.planTitle || '').toLowerCase().trim();
                }
            }
        } catch (e) {}
    }

    // 1. Add to permanent blacklist (ID and Title)
    try {
        if (strId) {
            const deletedSet = getDeletedPlanIds();
            deletedSet.add(strId);
            localStorage.setItem('nutrimunch_deleted_plan_ids', JSON.stringify(Array.from(deletedSet)));
        }
        if (targetTitle) {
            const deletedTitles = getDeletedPlanTitles();
            deletedTitles.add(targetTitle);
            localStorage.setItem('nutrimunch_deleted_plan_titles', JSON.stringify(Array.from(deletedTitles)));
        }
    } catch (e) {}

    const isMatch = (item) => {
        if (!item) return false;
        const itemId = String(item.id || '').trim();
        const itemTitle = String(item.title || item.planTitle || '').toLowerCase().trim();
        return (strId && itemId === strId) || (targetTitle && itemTitle === targetTitle);
    };

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

    // 6. Remove from Active Diet Plan cache
    try {
        const rawActive = localStorage.getItem('nutrimunch_active_diet_plan');
        if (rawActive) {
            const active = JSON.parse(rawActive);
            if (isMatch(active)) {
                localStorage.removeItem('nutrimunch_active_diet_plan');
            }
        }
    } catch (e) {}

    // 7. Broadcast across tabs via BroadcastChannel
    try {
        const bc = new BroadcastChannel('nutrimunch_diet_plan_channel');
        bc.postMessage({ type: 'DIET_PLAN_DELETED', planId: strId, title: targetTitle });
        setTimeout(() => {
            try { bc.close(); } catch (err) {}
        }, 1000);
    } catch (e) {}

    // 8. Fire local window events
    window.dispatchEvent(new CustomEvent('nutrimunch_diet_plan_deleted', { detail: { planId: strId, title: targetTitle } }));
    window.dispatchEvent(new Event('nutrimunch_diet_history_updated'));
    window.dispatchEvent(new Event('nutrimunch_diet_plan_updated'));
    window.dispatchEvent(new Event('storage'));

    // 9. Delete from backend database / in-memory registry
    if (apiInstance) {
        if (strId) {
            try { await apiInstance.delete(`/diet-plans/${encodeURIComponent(strId)}`); } catch (e) {}
            try { await apiInstance.delete(`/diet-plans/deploy/${encodeURIComponent(strId)}`); } catch (e) {}
        }
        if (targetTitle && targetTitle !== strId.toLowerCase()) {
            try { await apiInstance.delete(`/diet-plans/${encodeURIComponent(targetTitle)}`); } catch (e) {}
        }
    }

    return true;
};

export const normalizeAndDeduplicatePlans = ({
    rawList = [],
    currentUserId = '',
    currentUserEmail = '',
    currentUserName = '',
    isUserView = false
}) => {
    const deletedIds = getDeletedPlanIds();
    const deletedTitles = getDeletedPlanTitles();
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

        // Permanently filter out any deleted plan (by ID or Title)
        if (deletedIds.has(id)) {
            return;
        }

        const title = (item.title || item.planTitle || 'Custom Protocol').trim();
        if (deletedTitles.has(title.toLowerCase())) {
            return;
        }

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
