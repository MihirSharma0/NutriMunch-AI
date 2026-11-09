/**
 * User & Professional Authentication (Login) Page
 * Handles credential-based login, Google OAuth single sign-on,
 * post-login redirect routing, and first-time Google role onboarding.
 */
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, ArrowRight, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { getDashboardUrl, isRouteAllowedForRole } from '../../utils/roleUtils';
import OnboardingWizard from '../../components/OnboardingWizard';
import NutritionistGoogleOnboarding from '../../components/NutritionistGoogleOnboarding';
import { getEmailError } from '../../utils/emailValidation';
import {
    LOGIN_MESSAGES, validateLoginFields, areLoginFieldsFilled,
    MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH
} from '../../utils/loginValidation';

/**
 * Login Component
 * Renders the login card with tabs for Patient, Certified Nutritionist, and Administrator accounts.
 */
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [activeTab, setActiveTab] = useState('USER');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const emailError = getEmailError(email);
    const [requiresRoleSelection, setRequiresRoleSelection] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(1);
    const [selectedRole, setSelectedRole] = useState(null);
    const [pendingGoogleCredential, setPendingGoogleCredential] = useState(null);
    const [googleProfile, setGoogleProfile] = useState({ firstName: '', lastName: '' });
    const [isSigningIn, setIsSigningIn] = useState(false);

    const { login, googleLogin, user } = useContext(AuthContext);
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();

    // Return to the page the visitor originally requested (same-site paths only)
    /**
     * Resolves the target redirect route following a successful login.
     * 
     * @param {string} role - Authenticated user role
     * @returns {string} Target path URL
     */
    const getPostLoginUrl = (role) => {
        const redirect = new URLSearchParams(window.location.search).get('redirect');
        if (redirect && redirect.startsWith('/') && !redirect.startsWith('//') && isRouteAllowedForRole(redirect, role)) {
            return redirect;
        }
        return getDashboardUrl(role);
    };

    const handleGoogleLoginSuccess = async (tokenResponse) => {
        try {
            const credential = tokenResponse.access_token;
            const result = await googleLogin(credential);
            if (result.success) {
                navigate(getPostLoginUrl(result.role));
            } else if (result.requiresRole) {
                setPendingGoogleCredential(credential);
                setGoogleProfile(result.googleProfile);
                setRequiresRoleSelection(true);
                setIsSigningIn(false);
            } else {
                setError(result.message);
                setIsSigningIn(false);
            }
        } catch (err) {
            setError('Google login failed. Please try again.');
            setIsSigningIn(false);
        }
    };

    const handleRoleSelection = (role) => {
        setSelectedRole(role);
        if (role === 'NUTRITIONIST') {
            setOnboardingStep(2);
        }
    };

    const createGoogleAccount = async (profileData) => {
        if (!pendingGoogleCredential) return false;
        setIsSigningIn(true);
        try {
            const result = await googleLogin(pendingGoogleCredential, selectedRole, profileData);
            if (result.success) {
                setRequiresRoleSelection(false);
                navigate(getPostLoginUrl(result.role));
                return true;
            } else {
                setError(result.message);
                return false;
            }
        } catch (err) {
            setError('Google login failed. Please try again.');
            return false;
        } finally {
            setIsSigningIn(false);
        }
    };

    const loginWithGoogle = useGoogleLogin({
        onSuccess: handleGoogleLoginSuccess,
        onError: () => {
            setError('Google login failed. Please try again.');
            setIsSigningIn(false);
        },
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        // TC1 / TC5: reject empty or malformed input locally, before any request.
        const validationMessage = validateLoginFields(email, password);
        if (validationMessage) {
            setError(validationMessage);
            setSuccess('');
            return;
        }
        setError('');
        setSuccess('');
        setIsSigningIn(true);
        try {
            const result = await login(email.trim(), password);
            if (result.success) {
                const actualRole = String(result.role || '').toUpperCase().replace('ROLE_', '');
                if (activeTab === 'ADMIN' && actualRole !== 'ADMIN') {
                    setError('This account does not have Administrator privileges. Please sign in under the User tab.');
                    return;
                }
                if (activeTab === 'NUTRITIONIST' && actualRole !== 'NUTRITIONIST') {
                    setError('This account is not registered as a Certified Nutritionist. Please sign in under the User tab.');
                    return;
                }
                // TC2: show the exact success message before routing away.
                setSuccess(LOGIN_MESSAGES.SUCCESS);
                window.setTimeout(() => navigate(getPostLoginUrl(result.role)), 700);
            } else {
                setError(result.message);
            }
        } finally {
            setIsSigningIn(false);
        }
    };

    const roleSubtitles = {
        USER: "Sign in to your personalized AI nutrition dashboard",
        NUTRITIONIST: "Sign in to your client management console",
        ADMIN: "Sign in to the system management portal"
    };

    const handleUserRoleSelected = async () => {
        setSelectedRole('USER');
        if (!pendingGoogleCredential) return;
        try {
            const result = await googleLogin(pendingGoogleCredential, 'USER', {});
            if (result.success) {
                // Account created and token stored. Now launch multi-step onboarding wizard.
                setOnboardingStep(3); // Step 3 indicates running OnboardingWizard for USER
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Google sign in failed. Please try again.');
        }
    };

    return (
        <div className={`min-h-screen font-sans antialiased flex flex-col justify-between relative overflow-x-hidden transition-colors duration-300 ${
            isDark 
                ? 'bg-[#080b12] text-slate-200 selection:bg-[#a5d391]/30 selection:text-[#a5d391]' 
                : 'bg-gradient-to-br from-[#e0f2fe] via-[#f3e8ff] to-[#ecfdf5] text-slate-900 selection:bg-emerald-200 selection:text-emerald-900'
        }`}>
            {/* Ambient Background Glows */}
            {isDark ? (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#a5d391]/10 blur-[150px] rounded-full pointer-events-none z-0"></div>
            ) : (
                <>
                    <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-300/25 blur-[160px] rounded-full pointer-events-none z-0"></div>
                    <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 translate-y-1/2 w-[550px] h-[550px] bg-purple-300/20 blur-[160px] rounded-full pointer-events-none z-0"></div>
                </>
            )}

            {/* BEGIN: Google Role Selection & Onboarding Modal */}
            {requiresRoleSelection && (
                <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-8 bg-[#080b12]/90 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    {selectedRole === 'NUTRITIONIST' ? (
                        <NutritionistGoogleOnboarding
                            initialFirstName={googleProfile.firstName}
                            initialLastName={googleProfile.lastName}
                            error={error}
                            onCreate={createGoogleAccount}
                            onCancel={() => {
                                setRequiresRoleSelection(false);
                                setPendingGoogleCredential(null);
                                setSelectedRole(null);
                                setOnboardingStep(1);
                            }}
                        />
                    ) : onboardingStep === 3 ? (
                        <OnboardingWizard
                            initialEmail={user?.email || ''}
                            initialFirstName={user?.firstName || ''}
                            initialLastName={user?.lastName || ''}
                            onComplete={() => navigate(getPostLoginUrl(user?.role || 'USER'))}
                        />
                    ) : (
                        <div className="w-full max-w-md bg-[#0d121c] border border-[#a5d391]/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(165,211,145,0.15)] flex flex-col items-center">
                            <div className="w-12 h-12 bg-gradient-to-tr from-[#a5d391] to-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-[#a5d391]/20">
                                <Sparkles className="w-6 h-6 text-black" />
                            </div>
                            
                            {onboardingStep === 1 && (
                                <>
                                    <h2 className="text-xl font-bold text-white mb-2 text-center">Choose your account type</h2>
                                    <p className="text-sm text-slate-400 text-center mb-8">
                                        We noticed you're signing in with Google for the first time. How would you like to use NutriMunch AI?
                                    </p>
                                    <div className="flex flex-col gap-4 w-full">
                                        <button 
                                            onClick={handleUserRoleSelected}
                                            className="w-full py-4 px-4 rounded-xl font-bold text-sm uppercase tracking-widest text-black bg-[#a5d391] hover:bg-white active:bg-slate-200 transition duration-200 cursor-pointer"
                                        >
                                            Continue as User
                                        </button>
                                        <button 
                                            onClick={() => handleRoleSelection('NUTRITIONIST')}
                                            className="w-full py-4 px-4 rounded-xl font-bold text-sm uppercase tracking-widest text-white bg-white/5 border border-white/10 hover:bg-white/10 transition duration-200 cursor-pointer"
                                        >
                                            Continue as Nutritionist
                                        </button>
                                    </div>
                                </>
                            )}

                            <button 
                                onClick={() => { 
                                    setRequiresRoleSelection(false); 
                                    setPendingGoogleCredential(null); 
                                    setOnboardingStep(1); 
                                }}
                                className="mt-6 text-xs text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider font-semibold cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            )}
            {/* END: Google Role Selection & Onboarding Modal */}

            {/* BEGIN: TopNavigation */}
            <header className="w-full px-6 lg:px-10 py-6 flex items-center justify-between z-10">
                <button 
                    onClick={() => navigate('/')} 
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-md transition duration-200 group cursor-pointer border ${
                        isDark 
                            ? 'text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border-white/10' 
                            : 'text-slate-700 hover:text-slate-900 bg-white/80 hover:bg-white border-slate-200 shadow-sm'
                    }`}
                >
                    <ArrowLeft className={`w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 ${isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'}`} />
                    <span>Back to Home</span>
                </button>

                {/* Direct Light/Dark Theme Switcher */}
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
            {/* END: TopNavigation */}

            {/* BEGIN: MainContent */}
            <main className="w-full flex-grow flex items-center justify-center px-4 sm:px-6 my-4 z-10">
                <div className="w-full max-w-[460px] flex flex-col items-center">
                    
                    {/* Brand Logo & Header Area */}
                    <div className="text-center mb-6">
                        <div 
                            onClick={() => navigate('/')}
                            className="inline-flex items-center justify-center gap-2.5 mb-3.5 group cursor-pointer"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#a5d391] to-emerald-400 flex items-center justify-center shadow-lg shadow-[#a5d391]/20 ring-1 ring-white/20">
                                <Sparkles className="w-5 h-5 text-slate-950 transform group-hover:scale-110 transition-transform duration-200" />
                            </div>
                            <span className={`text-2xl font-bold tracking-tight flex items-center gap-2 font-hero-display ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                NutriMunch <span className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full border ${isDark ? 'text-[#a5d391] bg-[#a5d391]/10 border-[#a5d391]/30' : 'text-emerald-700 bg-emerald-100 border-emerald-300'}`}>AI</span>
                            </span>
                        </div>
                        <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-2 font-hero-display ${isDark ? 'text-white' : 'text-slate-900'}`}>Welcome back</h1>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {roleSubtitles[activeTab]}
                        </p>
                    </div>

                    {/* Authentication Card */}
                    <div className={`w-full backdrop-blur-2xl border rounded-[2.5rem] p-7 sm:p-9 transition-all duration-300 ${
                        isDark
                            ? 'bg-[#0d121c]/90 border-white/10 shadow-2xl text-white'
                            : 'bg-white/95 border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.08)] text-slate-800'
                    }`}>
                        
                        {/* Role Selector Tabs */}
                        <div className={`flex p-1.5 rounded-2xl mb-6 border transition-colors ${
                            isDark
                                ? 'bg-[#080b12]/90 border-white/10'
                                : 'bg-slate-100 border-slate-200'
                        }`}>
                            {['USER', 'NUTRITIONIST', 'ADMIN'].map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => { setActiveTab(role); setError(''); }}
                                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
                                        activeTab === role 
                                        ? (isDark 
                                            ? 'bg-[#a5d391] text-black shadow-[0_0_15px_rgba(165,211,145,0.3)]' 
                                            : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25')
                                        : (isDark 
                                            ? 'text-slate-400 hover:text-white hover:bg-white/5' 
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/80')
                                    }`}
                                >
                                    {role === 'USER' ? 'User' : role === 'NUTRITIONIST' ? 'Nutritionist' : 'Admin'}
                                </button>
                            ))}
                        </div>

                        {error && (
                            <div className="bg-red-500/15 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl mb-5 text-xs font-semibold flex items-center gap-2.5 shadow-lg shadow-red-500/5">
                                <span className="material-symbols-outlined text-red-400 text-lg shrink-0">error</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-xl mb-5 text-xs font-semibold flex items-center gap-2.5">
                                <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0">check_circle</span>
                                <span>{success}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            
                            {/* Email Field Group */}
                            <div className="space-y-1.5">
                                <label className={`block text-[11px] font-semibold tracking-wider uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="email">
                                    Email Address
                                </label>
                                <div className={`relative flex items-center border rounded-xl overflow-hidden focus-within:ring-2 transition-all ${
                                    isDark
                                        ? `bg-[#090d16] ${emailError ? 'border-red-500/60 focus-within:border-red-500/60 focus-within:ring-red-500/20' : 'border-white/10 focus-within:border-[#a5d391]/60 focus-within:ring-[#a5d391]/20'}`
                                        : `bg-white border-slate-300 shadow-sm focus-within:bg-white ${emailError ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500/20' : 'focus-within:border-emerald-500 focus-within:ring-emerald-500/20'}`
                                }`}>
                                    <span className={`pl-3.5 pointer-events-none flex items-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        <Mail className="w-4 h-4" />
                                    </span>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        maxLength={MAX_EMAIL_LENGTH}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        aria-invalid={!!emailError}
                                        aria-describedby={emailError ? 'email-error' : undefined}
                                        placeholder={activeTab === 'USER' ? 'user@example.com' : activeTab === 'NUTRITIONIST' ? 'nutritionist@nutrimunch.com' : 'admin@nutrimunch.com'}
                                        className={`w-full bg-transparent border-0 py-2.5 pl-3 pr-4 text-sm focus:ring-0 focus:outline-none ${
                                            isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                                        }`}
                                    />
                                </div>
                                {emailError && <p id="email-error" className={`text-xs ${isDark ? 'text-amber-300/80' : 'text-amber-700'}`}>Check the email format before signing in.</p>}
                            </div>

                            {/* Password Field Group */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className={`block text-[11px] font-semibold tracking-wider uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="password">
                                        Password
                                    </label>
                                    <Link to="/forgot-password" className={`text-xs font-semibold transition-colors ${isDark ? 'text-[#a5d391] hover:text-white' : 'text-emerald-700 hover:text-emerald-800'}`}>
                                        Forgot Password?
                                    </Link>
                                </div>
                                <div className={`relative flex items-center border rounded-xl overflow-hidden focus-within:ring-2 transition-all ${
                                    isDark
                                        ? 'bg-[#090d16] border-white/10 focus-within:border-[#a5d391]/60 focus-within:ring-[#a5d391]/20'
                                        : 'bg-white border-slate-300 shadow-sm focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-emerald-500/20'
                                }`}>
                                    <span className={`pl-3.5 pointer-events-none flex items-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        <Lock className="w-4 h-4" />
                                    </span>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        maxLength={MAX_PASSWORD_LENGTH}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className={`w-full bg-transparent border-0 py-2.5 pl-3 pr-10 text-sm focus:ring-0 focus:outline-none tracking-widest ${
                                            isDark ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'
                                        }`}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={`absolute right-3 p-1 focus:outline-none transition-colors cursor-pointer ${
                                            isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Remember Me Checkbox */}
                            <div className="flex items-center pt-0.5">
                                <input 
                                    id="remember-me" 
                                    name="remember-me" 
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-emerald-600 focus:ring-emerald-500/30 focus:ring-offset-0 transition-colors cursor-pointer"
                                />
                                <label htmlFor="remember-me" className={`ml-2.5 block text-xs select-none cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Remember me
                                </label>
                            </div>

                            {/* Sign In Submit Button */}
                            <div className="pt-1">
                                <button 
                                    type="submit" 
                                    disabled={isSigningIn || !areLoginFieldsFilled(email, password)}
                                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition duration-150 ease-in-out flex items-center justify-center gap-2 group cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                        isDark
                                            ? 'text-black bg-[#a5d391] hover:bg-[#bbf7a7] active:bg-slate-200 border border-[#a5d391]/30 shadow-[0_0_20px_rgba(165,211,145,0.25)]'
                                            : 'text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-600/20'
                                    }`}
                                >
                                    {isSigningIn ? (
                                        <>
                                            <span className={`h-4 w-4 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-black' : 'border-white'}`} />
                                            <span>Signing in…</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Sign In as {activeTab === 'USER' ? 'User' : activeTab === 'NUTRITIONIST' ? 'Nutritionist' : 'Admin'}</span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Google Login Option */}
                            <div className="pt-1">
                                <button 
                                    type="button"
                                    disabled={isSigningIn}
                                    onClick={() => {
                                        setError('');
                                        setIsSigningIn(true);
                                        loginWithGoogle();
                                    }}
                                    className={`w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border transition-all font-semibold text-xs uppercase tracking-wider cursor-pointer disabled:cursor-wait disabled:opacity-60 ${
                                        isDark
                                            ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white'
                                            : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                                    }`}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span>Continue with Google</span>
                                </button>
                            </div>

                            {/* Register Navigation */}
                            <div className="text-center pt-2">
                                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Don't have an account? 
                                    <Link to="/register" className={`font-semibold ml-1 transition-colors ${isDark ? 'text-[#a5d391] hover:text-white' : 'text-emerald-700 hover:text-emerald-800 underline-offset-2 hover:underline'}`}>
                                        Sign up today
                                    </Link>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
            {/* END: MainContent */}

            {isSigningIn && (
                <div
                    className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#080b12]/80 px-4 backdrop-blur-md"
                    role="status"
                    aria-live="polite"
                >
                    <div className="w-full max-w-sm rounded-3xl border border-[#a5d391]/25 bg-[#0d121c] p-7 text-center shadow-[0_0_50px_rgba(165,211,145,0.12)]">
                        <div className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-white/10 border-t-[#a5d391] animate-spin" />
                        <h2 className="text-lg font-bold text-white">Signing you in</h2>
                        <p className="mt-2 text-sm text-slate-400">Preparing your NutriMunch dashboard…</p>
                        <div className="mt-6 space-y-2.5 animate-pulse" aria-hidden="true">
                            <div className="mx-auto h-2 w-3/4 rounded-full bg-white/10" />
                            <div className="mx-auto h-2 w-1/2 rounded-full bg-white/5" />
                        </div>
                    </div>
                </div>
            )}

            {/* BEGIN: Footer */}
            <footer className="w-full py-6 text-center text-xs text-slate-500 tracking-wide z-10">
                <p>© 2026 NutriMunch AI. All rights reserved.</p>
            </footer>
            {/* END: Footer */}
        </div>
    );
};

export default Login;
