/**
 * Email Verification Token Consumer
 * Verifies email confirmation links via token query param on registration.
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from '../../api/axios';
import { useTheme } from '../../context/ThemeContext';

/**
 * VerifyEmail Component
 * Processes token validation on load and presents status feedback to the user.
 */
const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const { isDark } = useTheme();

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error');
                setMessage('No verification token provided.');
                return;
            }

            try {
                const response = await axios.get(`/auth/verify?token=${token}`);
                setStatus('success');
                setMessage(response.data.message || 'Email verified successfully!');
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Verification failed. The token may be invalid or expired.');
            }
        };

        verify();
    }, [token]);

    return (
        <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300 font-body-md ${
            isDark ? 'bg-[#080b12] text-white' : 'bg-gradient-to-br from-[#eff6ff] via-[#f0fdf4] to-[#f5f3ff] text-slate-800'
        }`}>
            {/* Ambient Background Glows */}
            {isDark ? (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 blur-[100px] rounded-full pointer-events-none z-0"></div>
            ) : (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-300/25 blur-[160px] rounded-full pointer-events-none z-0"></div>
            )}

            <div className={`max-w-md w-full space-y-8 p-6 sm:p-10 rounded-[2.5rem] relative z-10 backdrop-blur-2xl shadow-2xl text-center border transition-all duration-300 ${
                isDark 
                    ? 'bg-[#0d121c]/80 border-white/10 text-white' 
                    : 'bg-white/90 border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.08)] text-slate-800'
            }`}>

                {status === 'loading' && (
                    <div className="animate-pulse py-4">
                        <span className={`material-symbols-outlined text-6xl animate-spin mb-4 block ${isDark ? 'text-[#a5d391]' : 'text-emerald-600'}`}>sync</span>
                        <h2 className={`mt-6 text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Verifying Email...</h2>
                        <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Please wait while we confirm your email address.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-2">
                        <span className="material-symbols-outlined text-emerald-500 text-6xl mb-4 block">check_circle</span>
                        <h2 className={`mt-4 text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Verified!</h2>
                        <p className={`mt-4 text-base leading-relaxed ${isDark ? 'text-white/70' : 'text-slate-600'}`}>{message}</p>
                        <div className="mt-8">
                            <Link 
                                to="/login" 
                                className={`w-full inline-flex justify-center py-3.5 px-4 rounded-xl shadow-lg text-sm font-semibold tracking-wide transition-all transform active:scale-[0.99] ${
                                    isDark 
                                        ? 'bg-[#a5d391] hover:bg-[#b8e4a5] text-slate-900 shadow-green-900/20' 
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                                }`}
                            >
                                Go to Login
                            </Link>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="py-2">
                        <span className="material-symbols-outlined text-rose-500 text-6xl mb-4 block">error</span>
                        <h2 className={`mt-4 text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Verification Failed</h2>
                        <p className={`mt-4 text-base leading-relaxed ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{message}</p>
                        <div className="mt-8">
                            <Link 
                                to="/login" 
                                className={`w-full inline-flex justify-center py-3.5 px-4 rounded-xl border text-sm font-semibold transition-all ${
                                    isDark 
                                        ? 'border-white/20 text-white bg-white/5 hover:bg-white/10' 
                                        : 'border-slate-300 text-slate-700 bg-slate-100 hover:bg-slate-200'
                                }`}
                            >
                                Return to Login
                            </Link>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default VerifyEmail;
