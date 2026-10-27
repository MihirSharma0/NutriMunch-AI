import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from '../../api/axios';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    
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
        <div className="min-h-screen bg-[#080b12] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-body-md text-white">
            <div className="max-w-md w-full space-y-8 bg-white/5 backdrop-blur-xl p-6 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative">

                <div>
                    <h2 className="mt-2 text-center text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Create New Password
                    </h2>
                    <p className="mt-4 text-center text-sm text-white/60">
                        Please enter your new password below.
                    </p>
                </div>

                {status === 'success' ? (
                    <div className="text-center">
                        <span className="material-symbols-outlined text-green-500 text-6xl mb-4 block">check_circle</span>
                        <p className="mt-4 text-green-400 text-md leading-relaxed">{message}</p>
                        <div className="mt-8">
                            <Link to="/login" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-container hover:text-on-primary-container focus:outline-none transition-all">
                                Go to Login
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {status === 'error' && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm">
                                {message}
                            </div>
                        )}
                        
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="password" className="sr-only">New Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none rounded-xl relative block w-full px-4 py-3 bg-white/5 border border-white/10 placeholder-white/30 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
                                    placeholder="New Password"
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="appearance-none rounded-xl relative block w-full px-4 py-3 bg-white/5 border border-white/10 placeholder-white/30 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
                                    placeholder="Confirm New Password"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={status === 'loading' || !token}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-container hover:text-on-primary-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-[#080b12] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {status === 'loading' ? (
                                    <span className="material-symbols-outlined animate-spin text-white">sync</span>
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
