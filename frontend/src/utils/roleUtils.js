/**
 * Role Utility
 * Resolves role-based redirect destinations for application navigation.
 */

/**
 * Maps a raw user role string to the corresponding dashboard URL route.
 *
 * @param {string} rawRole - User role identifier (e.g., 'ROLE_ADMIN', 'ROLE_NUTRITIONIST', 'ROLE_USER')
 * @returns {string} Target dashboard URL path
 */
export const getDashboardUrl = (rawRole) => {
    if (!rawRole) return '/profile';
    const role = String(rawRole).toUpperCase().replace('ROLE_', '');
    if (role === 'ADMIN') return '/dashboard/admin';
    if (role === 'NUTRITIONIST') return '/dashboard/nutritionist';
    return '/profile';
};
