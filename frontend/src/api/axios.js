import axios from 'axios';

/**
 * Base API URL derived from Vite environment variables or defaulting to local Spring Boot backend.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/**
 * Pre-configured Axios instance for handling HTTP communication with the NutriMunch backend.
 * Automatically injects authentication tokens and handles unauthorized session expiration.
 */
const api = axios.create({
    baseURL: API_BASE_URL,
});

/**
 * Request Interceptor
 * Intercepts outgoing HTTP requests and attaches the JWT Bearer authorization token
 * from browser localStorage if available.
 */
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Auth endpoints legitimately return 401 for wrong credentials. Those must keep
 * their exact C1 messages ("Incorrect Password", "Profile/E-Mail Id Doesn't
 * Exist. Please Create One") and must NOT tear down the session.
 */
const isAuthRequest = (url) => {
    const path = String(url || '');
    return path.includes('/auth/');
};

/**
 * Response Interceptor
 * An expired/invalid JWT on any other endpoint means the session is no longer
 * valid: clear it and broadcast one event so AuthContext can route to login.
 */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const url = error?.config?.url || '';
        if (status === 401 && !isAuthRequest(url) && localStorage.getItem('token')) {
            try {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.dispatchEvent(new Event('nutrimunch_session_expired'));
            } catch (e) {
                console.warn('[Auth] could not clear expired session:', e);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
