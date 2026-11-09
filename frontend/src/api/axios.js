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
 * Do not automatically clear the token or force redirect to the login page on errors.
 * Preserves the current page so users and admins can see and fix the error on the spot.
 */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Return the rejected promise so individual caller components can handle the error in-place
        return Promise.reject(error);
    }
);

export default api;
