/**
 * One-Time Password (OTP) Verification Page
 * Verifies 6-digit email OTPs to activate new accounts and triggers onboarding flow.
 */
import React, { useState, useContext } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, KeyRound } from 'lucide-react';
import OnboardingWizard from '../../components/OnboardingWizard';
import { getEmailError } from '../../utils/emailValidation';
import { getOtpError } from '../../utils/formValidation';

/**
 * VerifyOtp Component
 * 6-digit OTP code entry form with resend timer countdown and onboarding launch.
 */
const VerifyOtp = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { verifyOtp, resendOtp, user } = useContext(AuthContext);
    const { isDark } = useTheme();

    // Retrieve pending registration details from router state or sessionStorage
    const pendingData = (() => {
        try {
            const raw = sessionStorage.getItem('nutrimunch_pending_registration');
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    })();

    const emailParam = searchParams.get('email') || location.state?.email || pendingData.email || '';
    
    const [email, setEmail] = useState(emailParam);
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const emailError = getEmailError(email);
    const [success, setSuccess] = useState('');
    const [resendDisabled, setResendDisabled] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [verifiedUser, setVerifiedUser] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (!email || !otp) {
            setError('Please provide both email and OTP code.');
            return;
        }
        if (emailError) return;
        const otpError = getOtpError(otp);
        if (otpError) {
            setError(otpError);
            return;
        }
        
        const result = await verifyOtp(email, otp);
        if (result.success) {
            const activeUser = result.user || user || {};
            const role = String(activeUser.role || location.state?.role || pendingData.role || 'USER').toUpperCase().replace('ROLE_', '');

            if (role === 'NUTRITIONIST') {
                navigate('/dashboard/nutritionist');
            } else if (role === 'ADMIN') {
                navigate('/dashboard/admin');
            } else {
                setVerifiedUser(activeUser);
                setShowOnboarding(true);
            }
        } else {
            setError(result.message);
        }
    };

    const handleResend = async () => {
        if (!email) {
            setError('Please provide your email address first.');
            return;
        }
        if (emailError) return;
        
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
        <div className={`min-h-screen flex items-center justify-center p-4 md:p-8 font-body-md overflow-x-hidden relative transition-colors duration-300 ${
            isDark 
                ? 'bg-[#080b12] text-white selection:bg-[#a5d391]/30 selection:text-[#a5d391]' 
                : 'bg-gradient-to-br from-[#e0f2fe] via-[#f3e8ff] to-[#ecfdf5] text-slate-900 selection:bg-emerald-200 selection:text-emerald-900'
        }`}>
            {/* Background Glow */}
            {isDark ? (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 blur-[100px] rounded-full pointer-events-none z-0"></div>
            ) : (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-300/25 blur-[160px] rounded-full pointer-events-none z-0"></div>
            )}
            
            {/* Back Button */}
            <button 
                onClick={() => navigate('/login')} 
                className={`absolute top-6 left-6 md:top-10 md:left-10 z-50 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-md transition-all cursor-pointer border ${
                    isDark 
                        ? 'text-gray-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border-white/10' 
                        : 'text-slate-700 hover:text-slate-900 bg-white/80 hover:bg-white border-slate-200 shadow-sm'
                }`}
            >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Login</span>
            </button>

            {showOnboarding ? (
                <OnboardingWizard 
                    initialEmail={email} 
                    initialFirstName={verifiedUser?.firstName || location.state?.firstName || pendingData.firstName || ''} 
                    initialLastName={verifiedUser?.lastName || location.state?.lastName || pendingData.lastName || ''} 
                    onComplete={() => navigate('/dashboard/user')} 
                />
            ) : (
                <div className={`w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 sm:p-10 relative z-10 backdrop-blur-2xl transition-all duration-300 border ${
                    isDark 
                        ? 'bg-[#0d121c]/80 border-white/10 text-white' 
                        : 'bg-white/90 border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.08)] text-slate-800'
                }`}>
                    <div className="flex flex-col items-center mb-8">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${
                            isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-emerald-700'
                        }`}>
                            <KeyRound className="w-8 h-8" />
                        </div>
                        <h2 className={`text-2xl sm:text-3xl font-headline-lg font-bold text-center mb-2 font-hero-display ${isDark ? 'text-white' : 'text-slate-900'}`}>Verify Account</h2>
                        <p className={`text-center text-sm px-4 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                            Please enter the 6-digit OTP code sent to your email to verify your account. If you received a link instead, you can click it directly.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-4 rounded-xl mb-6 text-sm text-center font-medium">
                            {error}
                        </div>
                    )}
                    
                    {success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 p-4 rounded-xl mb-6 text-sm text-center font-medium">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className={`block text-[11px] font-semibold tracking-wider uppercase mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Email</label>
                            <input 
                                type="email"
                                className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all border ${
                                    isDark 
                                        ? `bg-[#090d16]/90 text-white placeholder-gray-500 ${emailError ? 'border-red-500/60 focus:ring-red-500/20' : 'border-white/10 focus:border-[#a5d391]/60 focus:ring-[#a5d391]/20'}` 
                                        : `bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white ${emailError ? 'border-red-400 focus:ring-red-500/20' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'}`
                                }`}
                                placeholder="john@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-invalid={!!emailError}
                                aria-describedby={emailError ? 'email-error' : undefined}
                                required
                            />
                            {emailError && <p id="email-error" className="mt-1.5 text-xs text-red-500">{emailError}</p>}
                        </div>
                        
                        <div>
                            <label className={`block text-[11px] font-semibold tracking-wider uppercase mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>OTP Code</label>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                pattern="[0-9]{6}"
                                maxLength="6"
                                className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all text-center tracking-widest text-lg font-bold border ${
                                    isDark 
                                        ? 'bg-[#090d16]/90 border-white/10 text-white placeholder-gray-600 focus:border-[#a5d391]/60 focus:ring-[#a5d391]/20' 
                                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                                }`}
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            className={`w-full font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-widest transition-all mt-4 cursor-pointer ${
                                isDark 
                                    ? 'bg-[#a5d391] hover:bg-white text-black shadow-[0_0_20px_rgba(165,211,145,0.3)]' 
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                            }`}
                        >
                            Verify Code & Continue
                        </button>
                        
                        <div className={`text-center mt-4 pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                            <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Didn't receive the code?</p>
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendDisabled}
                                className={`text-xs font-semibold transition-colors cursor-pointer ${
                                    resendDisabled 
                                    ? 'text-gray-500 cursor-not-allowed' 
                                    : (isDark ? 'text-[#a5d391] hover:text-white' : 'text-emerald-600 hover:text-emerald-700')
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
