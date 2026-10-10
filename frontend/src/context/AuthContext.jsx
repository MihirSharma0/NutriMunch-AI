import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            const userData = localStorage.getItem('user');
            if (userData) {
                setUser(JSON.parse(userData));
            }
        }
        setLoading(false);
    }, [token]);

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
            let serverMsg = error.response?.data?.message || error.response?.data?.error || (typeof error.response?.data === 'string' ? error.response.data : '');

            let finalMessage = 'Incorrect Password';
            if (serverMsg && (serverMsg.toLowerCase().includes('profile') || serverMsg.toLowerCase().includes('email') || serverMsg.toLowerCase().includes('exist') || serverMsg.toLowerCase().includes('create'))) {
                finalMessage = "Profile/E-Mail Id Doesn't Exist. Please Create One";
            } else if (serverMsg && (serverMsg.toLowerCase().includes('password') || serverMsg.toLowerCase().includes('credentials') || serverMsg.toLowerCase().includes('bad') || serverMsg.toLowerCase().includes('incorrect'))) {
                finalMessage = 'Incorrect Password';
            } else if (serverMsg) {
                finalMessage = serverMsg;
            }

            return { 
                success: false, 
                message: finalMessage 
            };
        }
    };

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
                return { success: false, requiresRole: true };
            }
            return { 
                success: false, 
                message: error.response?.data?.message || 'Google Login failed' 
            };
        }
    };

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

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

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
        <AuthContext.Provider value={{ user, token, loading, login, googleLogin, register, verifyOtp, resendOtp, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
