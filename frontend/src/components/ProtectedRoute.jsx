/**
 * Route Protection Guard
 * Inspects authentication status and user roles, redirecting unauthenticated visitors to login
 * and displaying an inline message when an authenticated role is not permitted.
 */
import React, { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

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

    // Display-only gate: localStorage role can be tampered with, so this only
    // decides which dashboard shell to show. Every API call is separately
    // authorised by the JWT / server-side role checks.
    const role = String(user?.role || '').toUpperCase().replace('ROLE_', '');
    const accessDenied = Boolean(allowedRoles && user && !allowedRoles.includes(role));

    if (loading) return null;

    if (!token || !user) {
        const redirect = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/login?redirect=${redirect}`} replace />;
    }

    if (accessDenied) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-6">
                <div className="max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center shadow-xl">
                    <h1 className="text-lg font-bold text-white">Access unavailable</h1>
                    <p className="mt-2 text-sm text-white/70">
                        This feature is not available for your account. You can stay on this page or use the navigation to return.
                    </p>
                </div>
            </div>
        );
    }

    return <Outlet />;
};

export default ProtectedRoute;
