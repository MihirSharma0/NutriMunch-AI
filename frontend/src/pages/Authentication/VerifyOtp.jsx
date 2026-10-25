import React, { useState, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ArrowLeft, Sparkles, KeyRound } from 'lucide-react';
import Starfield from '../../components/Starfield';
import OnboardingWizard from '../../components/OnboardingWizard';

const VerifyOtp = () => {
    const [searchParams] = useSearchParams();
    const emailParam = searchParams.get('email') || '';
    const firstNameParam = searchParams.get('firstName') || '';
    const lastNameParam = searchParams.get('lastName') || '';
    
    const [email, setEmail] = useState(emailParam);
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [resendDisabled, setResendDisabled] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [showOnboarding, setShowOnboarding] = useState(false);
    
    const { verifyOtp, resendOtp, user } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (!email || !otp) {
            setError('Please provide both email and OTP code.');
            return;
        }
        
        const result = await verifyOtp(email, otp);
        if (result.success) {
            setShowOnboarding(true);
        } else {
            setError(result.message);
        }
    };

    const handleResend = async () => {
        if (!email) {
            setError('Please provide your email address first.');
            return;
        }
        
        setError('');
        setSuccess('');
        setResendDisabled(true);
        setResendTimer(60);
        
        const timer = setInterval(() => {
            setResendTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setResendDisabled(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        const result = await resendOtp(email);
        if (result.success) {
            setSuccess('A new OTP has been sent to your email.');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="min-h-screen bg-[#080b12] flex items-start sm:items-center justify-center p-4 pt-20 sm:pt-6 md:p-8 font-body-md overflow-x-hidden relative">
            <Starfield />
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 blur-[100px] rounded-full pointer-events-none z-0"></div>
            
            {/* Back Button */}
            <button 
                onClick={() => navigate('/login')} 
                className="absolute top-6 left-6 md:top-10 md:left-10 z-50 flex items-center gap-2 text-gray-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back to Login</span>
            </button>

            {showOnboarding ? (
                <OnboardingWizard 
                    initialEmail={email} 
                    initialFirstName={firstNameParam || user?.firstName || ''}
                    initialLastName={lastNameParam || user?.lastName || ''}
                    onComplete={() => navigate('/profile')} 
                />
            ) : (
                <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl p-6 sm:p-10 relative z-10">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mb-4">
                            <KeyRound className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-headline-lg font-bold text-center text-white mb-2">Verify Account</h2>
                        <p className="text-center text-gray-400 text-sm px-4">
                            Please enter the 6-digit OTP code sent to your email to verify your account. If you received a link instead, you can click it directly.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-sm text-center">
                            {error}
                        </div>
                    )}
                    
                    {success && (
                        <div className="bg-green-500/20 border border-green-500/50 text-green-200 p-4 rounded-xl mb-6 text-sm text-center">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
                            <input 
                                type="email" 
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-400/50 transition-colors placeholder-gray-600"
                                placeholder="john@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">OTP Code</label>
                            <input 
                                type="text" 
                                maxLength="6"
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-400/50 transition-colors placeholder-gray-600 text-center tracking-widest text-lg font-bold"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-black font-bold py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(74,222,128,0.4)] transition-all mt-4 text-[15px]"
                        >
                            Verify Code & Continue
                        </button>
                        
                        <div className="text-center mt-4 pt-4 border-t border-white/10">
                            <p className="text-gray-400 text-sm mb-2">Didn't receive the code?</p>
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendDisabled}
                                className={`text-sm font-semibold transition-colors ${
                                    resendDisabled 
                                    ? 'text-gray-600 cursor-not-allowed' 
                                    : 'text-green-400 hover:text-green-300'
                                }`}
                            >
                                {resendDisabled ? `Resend available in ${resendTimer}s` : 'Resend OTP'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default VerifyOtp;
