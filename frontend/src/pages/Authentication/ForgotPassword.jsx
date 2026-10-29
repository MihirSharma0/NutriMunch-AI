/**
 * Forgot Password Request Page
 * Initiates self-service password recovery by requesting a secure token link via email.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';

/**
 * ForgotPassword Component
 * Form allowing registered users to input their email and request a reset link.
 */
const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
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
        <div className="min-h-screen bg-[#080b12] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-body-md text-white">
            <div className="max-w-md w-full space-y-8 bg-white/5 backdrop-blur-xl p-6 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative">

                <div>
                    <h2 className="mt-2 text-center text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Reset Password
                    </h2>
                    <p className="mt-4 text-center text-sm text-white/60">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                {status === 'success' ? (
                    <div className="text-center">
                        <span className="material-symbols-outlined text-green-500 text-6xl mb-4 block">mark_email_read</span>
                        <p className="mt-4 text-green-400 text-md leading-relaxed">{message}</p>
                        <div className="mt-8">
                            <Link to="/login" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-container hover:text-on-primary-container focus:outline-none transition-all">
                                Return to Login
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
                        
                        <div>
                            <label htmlFor="email" className="sr-only">Email address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-xl relative block w-full px-4 py-3 bg-white/5 border border-white/10 placeholder-white/30 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
                                placeholder="Email address"
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-container hover:text-on-primary-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-[#080b12] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {status === 'loading' ? (
                                    <span className="material-symbols-outlined animate-spin text-white">sync</span>
                                ) : (
                                    "Send Reset Link"
                                )}
                            </button>
                        </div>
                        
                        <div className="text-center mt-4">
                            <Link to="/login" className="font-medium text-sm text-primary hover:text-primary-container transition-colors">
                                Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
