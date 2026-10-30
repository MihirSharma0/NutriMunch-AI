/**
 * Role Utility
 * Resolves role-based redirect destinations and access permissions for application navigation.
 */

/**
 * Maps a raw user role string to the corresponding dashboard URL route.
 *
 * @param {string} rawRole - User role identifier (e.g., 'ROLE_ADMIN', 'ROLE_NUTRITIONIST', 'ROLE_USER')
 * @returns {string} Target dashboard URL path
 */
export const getDashboardUrl = (rawRole) => {
    if (!rawRole) return '/dashboard/user';
    const role = String(rawRole).toUpperCase().replace('ROLE_', '');
    if (role === 'ADMIN') return '/dashboard/admin';
    if (role === 'NUTRITIONIST') return '/dashboard/nutritionist';
    return '/dashboard/user';
};

/**
 * Validates whether a target route is authorized for a given user role.
 *
 * @param {string} route - Target path URL
 * @param {string} rawRole - User role identifier
 * @returns {boolean} True if the role is allowed to access the route
 */
export const isRouteAllowedForRole = (route, rawRole) => {
    if (!route || typeof route !== 'string') return false;
    const role = String(rawRole || '').toUpperCase().replace('ROLE_', '');

    if (route.startsWith('/dashboard/admin') && role !== 'ADMIN') {
        return false;
    }
    if (route.startsWith('/dashboard/nutritionist') && role !== 'NUTRITIONIST' && role !== 'ADMIN') {
        return false;
    }
    if (route.startsWith('/consultation-chat') && role !== 'USER' && role !== 'NUTRITIONIST') {
        return false;
    }
    return true;
};
