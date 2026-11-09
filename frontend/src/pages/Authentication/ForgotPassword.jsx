/**
 * Forgot Password Request Page
 * Initiates self-service password recovery by requesting a secure token link via email.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from '../../api/axios';
import { useTheme } from '../../context/ThemeContext';
import { getEmailError } from '../../utils/emailValidation';

/**
 * ForgotPassword Component
 * Form allowing registered users to input their email and request a reset link.
 */
const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const emailError = getEmailError(email);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (emailError) return;
        setStatus('loading');
        setMessage('');

        try {
            const response = await axios.post('/auth/forgot-password', { email });
            setStatus('success');
            setMessage(response.data.message || 'A password reset link has been sent to your registered email.');
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.message || 'An error occurred. Please try again.');
        }
    };

    return (
        <div className={`min-h-screen flex flex-col justify-between font-body-md transition-colors duration-300 relative overflow-x-hidden ${
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

            {/* Top Navigation Bar */}
            <header className="relative z-10 w-full px-6 py-6 md:px-10 flex items-center justify-between">
                <button 
                    onClick={() => navigate('/login')} 
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-md transition-all duration-200 shadow-sm cursor-pointer border ${
                        isDark 
                            ? 'text-slate-300 bg-slate-900/60 border-slate-700/60 hover:bg-slate-800/80 hover:text-white' 
                            : 'text-slate-700 bg-white/80 border-slate-200 hover:bg-white hover:text-slate-900'
                    }`}
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Login</span>
                </button>

                <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                    title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer shadow-sm border ${
                        isDark
                            ? 'bg-slate-900/60 hover:bg-slate-800/80 border-white/10 text-amber-300 hover:text-amber-200 hover:border-amber-400/40 hover:shadow-[0_0_12px_rgba(252,211,77,0.3)]'
                            : 'bg-white/90 hover:bg-white border-slate-200 text-indigo-600 hover:text-indigo-800 hover:border-indigo-400/40 hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                    }`}
                >
                    <span className={`material-symbols-outlined text-lg transition-transform duration-300 ${isDark ? 'rotate-0' : 'rotate-180'}`}>
                        {isDark ? 'light_mode' : 'dark_mode'}
                    </span>
                </button>
            </header>

            <main className="flex-1 flex items-center justify-center px-4 py-6 sm:px-6 relative z-10">
                <div className={`max-w-md w-full space-y-8 backdrop-blur-2xl p-6 sm:p-10 rounded-[2.5rem] border shadow-2xl transition-all duration-300 ${
                    isDark 
                        ? 'bg-[#0d121c]/90 border-white/10 text-white' 
                        : 'bg-white/95 border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.08)] text-slate-800'
                }`}>

                <div>
                    <h2 className={`mt-2 text-center text-2xl sm:text-3xl font-bold tracking-tight font-hero-display ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Reset Password
                    </h2>
                    <p className={`mt-3 text-center text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                {status === 'success' ? (
                    <div className="text-center">
                        <span className="material-symbols-outlined text-emerald-500 text-6xl mb-4 block">mark_email_read</span>
                        <p className="mt-4 text-emerald-600 dark:text-emerald-400 text-md leading-relaxed font-semibold">{message}</p>
                        <div className="mt-8">
                            <Link to="/login" className="w-full flex justify-center py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all">
                                Return to Login
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
                        
                        <div>
                            <label htmlFor="email" className={`block text-[11px] font-semibold tracking-wider uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-invalid={!!emailError}
                                aria-describedby={emailError ? 'email-error' : undefined}
                                className={`rounded-xl block w-full px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all border ${
                                    isDark 
                                        ? `bg-[#090d16]/90 ${emailError ? 'border-red-500/60 focus:ring-red-500/20' : 'border-white/10 focus:border-[#a5d391]/60 focus:ring-[#a5d391]/20'} placeholder-slate-500 text-white` 
                                        : `bg-slate-50 ${emailError ? 'border-red-400 focus:ring-red-500/20' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'} placeholder-slate-400 text-slate-900 focus:bg-white`
                                }`}
                                placeholder="Enter your registered email"
                            />
                            {emailError && <p id="email-error" className="mt-1.5 text-xs text-red-500">{emailError}</p>}
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className={`w-full flex justify-center py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isDark 
                                        ? 'text-black bg-[#a5d391] hover:bg-white active:bg-slate-200 shadow-[0_0_20px_rgba(165,211,145,0.3)]' 
                                        : 'text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-lg shadow-emerald-600/30'
                                }`}
                            >
                                {status === 'loading' ? (
                                    <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                                ) : (
                                    "Send Reset Link"
                                )}
                            </button>
                        </div>
                        
                        <div className="text-center mt-4">
                            <Link to="/login" className={`font-semibold text-xs transition-colors ${isDark ? 'text-[#a5d391] hover:text-white' : 'text-emerald-700 hover:text-emerald-800 underline-offset-2 hover:underline'}`}>
                                Back to Login
                            </Link>
                        </div>
                    </form>
                )}
                </div>
            </main>
            <div className="py-2" />
        </div>
    );
};

export default ForgotPassword;
