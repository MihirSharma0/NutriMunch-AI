/**
 * Authentication Context & State Management
 * Provides centralized authentication state (user profile, JWT token, role credentials),
 * login, registration, OTP validation, and logout handlers across the application.
 */
import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { describeLoginError } from '../utils/loginValidation';

/** React Context exposing authentication state and session methods. */
export const AuthContext = createContext();

/**
 * AuthProvider Component
 * Wraps application components to supply authentication tokens, user state,
 * and session lifecycle methods.
 * 
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Child elements
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            // localStorage is untrusted input: a corrupt or tampered payload
            // must not crash the app. Role here is display-only; the API/JWT
            // remains the only authority for access control.
            try {
                const userData = localStorage.getItem('user');
                if (userData) {
                    const parsed = JSON.parse(userData);
                    setUser(parsed && typeof parsed === 'object' ? parsed : null);
                } else {
                    setUser(null);
                }
            } catch (e) {
                console.warn('[Auth] stored user was unreadable; clearing session:', e);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setToken(null);
                setUser(null);
            }
        } else {
            setUser(null);
        }
        setLoading(false);
    }, [token]);

    /**
     * Authenticates a user with email and password credentials.
     * 
     * @param {string} email - Registered user email address
     * @param {string} password - User account password
     * @returns {Promise<Object>} Success flag and user role or error message
     */
    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, ...userData } = response.data;
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            
            setToken(token);
            setUser(userData);
            return { success: true, role: userData.role };
        } catch (error) {
            // Every credential failure maps to one generic message; a network
            // failure and the email-verification hint stay distinct.
            return {
                success: false,
                message: describeLoginError(error)
            };
        }
    };

    /**
     * Authenticates or registers a user via Google OAuth identity tokens.
     * 
     * @param {string} credential - Google OAuth credential token
     * @param {string|null} [role=null] - Desired user role if first-time account setup
     * @param {Object} [profileData={}] - Additional profile onboarding payload
     * @returns {Promise<Object>} Login outcome status
     */
    const googleLogin = async (credential, role = null, profileData = {}) => {
        try {
            const payload = { credential, ...profileData };
            if (role) {
                payload.role = role;
            }
            const response = await api.post('/auth/google', payload);
            const { token, ...userData } = response.data;
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            
            setToken(token);
            setUser(userData);
            return { success: true, role: userData.role };
        } catch (error) {
            if (error.response?.status === 428 || error.response?.data?.message === 'requires_role') {
                return {
                    success: false,
                    requiresRole: true,
                    googleProfile: {
                        firstName: error.response?.data?.firstName || '',
                        lastName: error.response?.data?.lastName || '',
                    },
                };
            }
            return { 
                success: false, 
                message: error.response?.data?.message || 'Google Login failed' 
            };
        }
    };

    /**
     * Submits a user registration payload to create an account pending OTP verification.
     * 
     * @param {Object} userData - Registration form fields (name, email, password, role)
     * @returns {Promise<Object>} Registration success status
     */
    const register = async (userData) => {
        try {
            await api.post('/auth/register', userData);
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.message || 'Registration failed' 
            };
        }
    };

    /**
     * Clears authentication credentials, tokens, and cached user details from localStorage
     * and dispatches a system-wide logout event.
     */
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Release live streams immediately; the layout effect would also catch this, but an
        // explicit signal keeps every logout path behaving identically.
        try { window.dispatchEvent(new Event('nutrimunch_logout')); } catch { /* best-effort signal */ }
        setToken(null);
        setUser(null);
    };

    /**
     * Validates a 6-digit one-time password (OTP) for account verification or password recovery.
     * 
     * @param {string} email - Target account email
     * @param {string} otp - 6-digit verification code
     * @returns {Promise<Object>} Verification outcome with user object on success
     */
    const verifyOtp = async (email, otp) => {
        try {
            const response = await api.post('/auth/verify-otp', { email, otp });
            if (response.data && response.data.token) {
                const { token, ...userData } = response.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(userData));
                setToken(token);
                setUser(userData);
                return { success: true, user: userData };
            }
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Verification failed'
            };
        }
    };

    /**
     * Requests a new verification OTP code to be dispatched to the provided email.
     * 
     * @param {string} email - User email address
     * @returns {Promise<Object>} Dispatch success status
     */
    const resendOtp = async (email) => {
        try {
            await api.post(`/auth/resend-otp?email=${encodeURIComponent(email)}`);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to resend OTP'
            };
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, token, loading, login, googleLogin, register, verifyOtp, resendOtp, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
