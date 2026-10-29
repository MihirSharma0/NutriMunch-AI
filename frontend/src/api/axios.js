import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

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

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const currentPath = window.location.pathname;
            const isAuthRoute = currentPath.startsWith('/login') || currentPath.startsWith('/register') || currentPath.startsWith('/verify');
            if (!isAuthRoute && localStorage.getItem('token')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // Release the live streams before navigating away so an expired session can
                // never leave a socket open behind it.
                window.dispatchEvent(new Event('nutrimunch_logout'));
                window.location.href = '/login?expired=true';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
