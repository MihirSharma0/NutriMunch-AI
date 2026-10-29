import React, { useContext, useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getDashboardUrl } from '../utils/roleUtils';

// Guards nested routes: logged-out visitors go to /login (and come back after signing in);
// logged-in users without an allowed role go to their own dashboard.
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

        if (typeof window.history.state?.idx === 'number' && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate(getDashboardUrl(user.role), { replace: true });
        }
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
