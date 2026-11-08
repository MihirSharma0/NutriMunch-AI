/**
 * Server-authoritative daily nutrition sync.
 *
 * The five tracked criteria (calories, protein, carbs, fats, water) are stored
 * in the backend `progress_logs` table via GET/POST /api/progress/me. The
 * browser does not own these values: localStorage is only a read-only offline
 * display cache for records written before C6.
 */
import api from '../api/axios';

/** Zero-valued day, used whenever the server has no row for a date. */
export const EMPTY_DAY = Object.freeze({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    waterMl: 0
});

/** Convert one backend progress row into the five display metrics. */
export const dayFromRow = (row) => ({
    calories: Number(row?.caloriesConsumed) || 0,
    protein: Number(row?.proteinG) || 0,
    carbs: Number(row?.carbsG) || 0,
    fats: Number(row?.fatsG) || 0,
    waterMl: Number(row?.waterConsumedMl) || 0
});

/** Fetch every persisted day, keyed by YYYY-MM-DD. Throws on network/API failure. */
export const fetchProgressDays = async () => {
    const res = await api.get('/progress/me');
    const days = {};
    if (Array.isArray(res.data)) {
        for (const row of res.data) {
            if (row && row.logDate) days[row.logDate] = dayFromRow(row);
        }
    }
    return days;
};

/**
 * Persist a subset of the five metrics for one date. Only supplied fields are
 * sent, so a water-only post cannot erase calories/macros (backend merge).
 * Returns the full authoritative day from the server response.
 */
export const saveDayMetrics = async (logDate, partial) => {
    const payload = { logDate };
    if (partial.calories !== undefined) payload.caloriesConsumed = Math.max(0, Math.round(Number(partial.calories) || 0));
    if (partial.protein !== undefined) payload.proteinG = Math.max(0, Number(Number(partial.protein).toFixed(1)) || 0);
    if (partial.carbs !== undefined) payload.carbsG = Math.max(0, Number(Number(partial.carbs).toFixed(1)) || 0);
    if (partial.fats !== undefined) payload.fatsG = Math.max(0, Number(Number(partial.fats).toFixed(1)) || 0);
    if (partial.waterMl !== undefined) payload.waterConsumedMl = Math.max(0, Math.round(Number(partial.waterMl) || 0));
    const res = await api.post('/progress/me', payload);
    return dayFromRow(res.data);
};

/**
 * Read the pre-C6 browser-only values for a date. Used ONLY when the server is
 * unreachable or has no row for that date; never as an override of server data.
 */
export const readOfflineDay = (dateStr) => {
    const result = { ...EMPTY_DAY };
    try {
        const foods = JSON.parse(localStorage.getItem(`nutrimunch_logged_foods_${dateStr}`) || '[]');
        if (Array.isArray(foods)) {
            for (const f of foods) {
                result.calories += Number(f.calories) || 0;
                result.protein += Number(f.protein) || 0;
                result.carbs += Number(f.carbs) || 0;
                result.fats += Number(f.fats) || 0;
            }
        }
        const water = localStorage.getItem(`nutrimunch_water_consumed_${dateStr}`)
            ?? localStorage.getItem('nutrimunch_water_consumed');
        if (water !== null) result.waterMl = parseInt(water, 10) || 0;
    } catch (e) {
        console.warn('[Progress] offline cache unreadable:', e);
    }
    return result;
};
