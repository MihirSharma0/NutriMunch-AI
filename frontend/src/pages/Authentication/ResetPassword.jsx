/**
 * Reset Password Page
 * Validates the reset security token provided in URL params and updates account password.
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from '../../api/axios';
import { useTheme } from '../../context/ThemeContext';
import { getPasswordError } from '../../utils/formValidation';

/**
 * ResetPassword Component
 * Accepts new password and confirmation, verifying the security token with the backend.
 */
const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const { isDark } = useTheme();
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid reset link. No token provided.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match.');
            return;
        }
        const passwordError = getPasswordError(password);
        if (passwordError) {
            setStatus('error');
            setMessage(passwordError);
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const response = await axios.post('/auth/reset-password', { 
                token, 
                newPassword: password 
            });
            setStatus('success');
            setMessage(response.data.message || 'Password reset successfully!');
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.message || 'An error occurred. The token may be invalid or expired.');
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-body-md transition-colors duration-300 relative overflow-x-hidden ${
            isDark 
                ? 'bg-[#080b12] text-white selection:bg-[#a5d391]/30 selection:text-[#a5d391]' 
                : 'bg-gradient-to-br from-[#e0f2fe] via-[#f3e8ff] to-[#ecfdf5] text-slate-900 selection:bg-emerald-200 selection:text-emerald-900'
        }`}>
            {/* Ambient Background Glows */}
            {isDark ? (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#a5d391]/10 blur-[150px] rounded-full pointer-events-none z-0"></div>
            ) : (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-300/25 blur-[160px] rounded-full pointer-events-none z-0"></div>
            )}

            <div className={`max-w-md w-full space-y-8 backdrop-blur-2xl p-6 sm:p-10 rounded-[2.5rem] border shadow-2xl relative z-10 transition-all duration-300 ${
                isDark 
                    ? 'bg-[#0d121c]/80 border-white/10 text-white' 
                    : 'bg-white/90 border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.08)] text-slate-800'
            }`}>

                <div>
                    <h2 className={`mt-2 text-center text-2xl sm:text-3xl font-bold tracking-tight font-hero-display ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Create New Password
                    </h2>
                    <p className={`mt-3 text-center text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                        Please enter your new password below.
                    </p>
                </div>

                {status === 'success' ? (
                    <div className="text-center">
                        <span className="material-symbols-outlined text-emerald-500 text-6xl mb-4 block">check_circle</span>
                        <p className="mt-4 text-emerald-600 dark:text-emerald-400 text-md leading-relaxed font-semibold">{message}</p>
                        <div className="mt-8">
                            <Link to="/login" className="w-full flex justify-center py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all">
                                Go to Login
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {status === 'error' && (
                            <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-4 rounded-xl text-sm font-medium">
                                {message}
                            </div>
                        )}
                        
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="password" className={`block text-[11px] font-semibold tracking-wider uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    New Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    minLength="6"
                                    maxLength="40"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`rounded-xl block w-full px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all border ${
                                        isDark 
                                            ? 'bg-[#090d16]/90 border-white/10 text-white placeholder-slate-500 focus:border-[#a5d391]/60 focus:ring-[#a5d391]/20' 
                                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                                    }`}
                                    placeholder="••••••••"
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="confirmPassword" className={`block text-[11px] font-semibold tracking-wider uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    minLength="6"
                                    maxLength="40"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`rounded-xl block w-full px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all border ${
                                        isDark 
                                            ? 'bg-[#090d16]/90 border-white/10 text-white placeholder-slate-500 focus:border-[#a5d391]/60 focus:ring-[#a5d391]/20' 
                                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                                    }`}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={status === 'loading' || !token}
                                className={`w-full flex justify-center py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isDark 
                                        ? 'text-black bg-[#a5d391] hover:bg-white active:bg-slate-200 shadow-[0_0_20px_rgba(165,211,145,0.3)]' 
                                        : 'text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-lg shadow-emerald-600/30'
                                }`}
                            >
                                {status === 'loading' ? (
                                    <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                                ) : (
                                    "Reset Password"
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
