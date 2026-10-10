export const getDashboardUrl = (rawRole) => {
    if (!rawRole) return '/profile';
    const role = String(rawRole).toUpperCase().replace('ROLE_', '');
    if (role === 'ADMIN') return '/dashboard/admin';
    if (role === 'NUTRITIONIST' || role === 'DIETITIAN') return '/dashboard/nutritionist';
    return '/profile';
};
