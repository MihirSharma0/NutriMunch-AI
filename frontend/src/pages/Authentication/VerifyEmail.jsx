/**
 * Email Verification Token Consumer
 * Verifies email confirmation links via token query param on registration.
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from '../../api/axios';

/**
 * VerifyEmail Component
 * Processes token validation on load and presents status feedback to the user.
 */
const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');

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
        <div className="min-h-screen bg-[#080b12] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-body-md text-white">
            <div className="max-w-md w-full space-y-8 bg-white/5 backdrop-blur-xl p-6 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl text-center">

                {status === 'loading' && (
                    <div className="animate-pulse">
                        <span className="material-symbols-outlined text-primary text-6xl animate-spin mb-4 block">sync</span>
                        <h2 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight">Verifying Email...</h2>
                    </div>
                )}

                {status === 'success' && (
                    <div>
                        <span className="material-symbols-outlined text-green-500 text-6xl mb-4 block">check_circle</span>
                        <h2 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-white">Verified!</h2>
                        <p className="mt-4 text-white/60 text-lg leading-relaxed">{message}</p>
                        <div className="mt-8">
                            <Link to="/login" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-container hover:text-on-primary-container focus:outline-none transition-all">
                                Go to Login
                            </Link>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div>
                        <span className="material-symbols-outlined text-red-500 text-6xl mb-4 block">error</span>
                        <h2 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-white">Verification Failed</h2>
                        <p className="mt-4 text-red-400 text-lg leading-relaxed">{message}</p>
                        <div className="mt-8">
                            <Link to="/login" className="w-full flex justify-center py-3 px-4 border border-white/20 rounded-full shadow-sm text-sm font-medium text-white bg-white/5 hover:bg-white/10 focus:outline-none transition-all">
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
