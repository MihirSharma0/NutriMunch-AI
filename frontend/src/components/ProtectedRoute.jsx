import React, { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getDashboardUrl } from '../utils/roleUtils';

// Guards nested routes: logged-out visitors go to /login (and come back after signing in);
// logged-in users without an allowed role go to their own dashboard.
const ProtectedRoute = ({ allowedRoles }) => {
    const { user, token, loading } = useContext(AuthContext);
    const location = useLocation();

    if (loading) return null;

    if (!token || !user) {
        const redirect = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/login?redirect=${redirect}`} replace />;
    }

    if (allowedRoles) {
        const role = String(user.role || '').toUpperCase().replace('ROLE_', '');
        if (!allowedRoles.includes(role)) {
            return <Navigate to={getDashboardUrl(user.role)} replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
