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
 * Response Interceptor
 * Leaves authentication failures to the requesting page so it can show the error
 * without discarding the current route or session state.
 */
api.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);

export default api;
