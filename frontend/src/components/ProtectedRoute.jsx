/**
 * Route Protection Guard
 * Inspects authentication status and user roles, redirecting unauthenticated visitors to login
 * and restricting unauthorized roles from protected dashboards.
 */
import React, { useContext, useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getDashboardUrl } from '../utils/roleUtils';

/**
 * ProtectedRoute Component
 * Validates that the active session has the required role permissions to view child routes.
 * 
 * @param {Object} props - Component properties
 * @param {Array<string>} [props.allowedRoles] - Roles permitted to access nested routes
 */
const ProtectedRoute = ({ allowedRoles }) => {
    const { user, token, loading } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const accessDeniedHandled = useRef(false);

    const role = String(user?.role || '').toUpperCase().replace('ROLE_', '');
    const accessDenied = Boolean(allowedRoles && user && !allowedRoles.includes(role));

    useEffect(() => {
        if (!accessDenied || accessDeniedHandled.current) return;

        accessDeniedHandled.current = true;
        window.alert('This feature is not available for your account.');

        navigate(getDashboardUrl(user?.role), { replace: true });
    }, [accessDenied, navigate, user?.role]);

    if (loading) return null;

    if (!token || !user) {
        const redirect = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/login?redirect=${redirect}`} replace />;
    }

    if (accessDenied) {
        return null;
    }

    return <Outlet />;
};

export default ProtectedRoute;
