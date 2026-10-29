/**
 * User & Professional Authentication (Login) Page
 * Handles credential-based login, Google OAuth single sign-on,
 * post-login redirect routing, and first-time Google role onboarding.
 */
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ArrowLeft, ArrowRight, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { getDashboardUrl } from '../../utils/roleUtils';
import OnboardingWizard from '../../components/OnboardingWizard';

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
    const [requiresRoleSelection, setRequiresRoleSelection] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(1);
    const [selectedRole, setSelectedRole] = useState(null);
    const [pendingGoogleCredential, setPendingGoogleCredential] = useState(null);
    
    // Profile Fields
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('Not Specified');
    const [heightCm, setHeightCm] = useState('');
    const [weightKg, setWeightKg] = useState('');
    const [goal, setGoal] = useState('Maintenance');
    const [credentials, setCredentials] = useState('');
    const [specialization, setSpecialization] = useState('');

    const { login, googleLogin } = useContext(AuthContext);
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
        if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
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
                setRequiresRoleSelection(true);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Google login failed. Please try again.');
        }
    };

    const handleRoleSelection = (role) => {
        setSelectedRole(role);
        if (role === 'NUTRITIONIST') {
            setOnboardingStep(2);
        }
    };

    const handleOnboardingSubmit = async (e) => {
        if (e) e.preventDefault();
        setRequiresRoleSelection(false);
        if (!pendingGoogleCredential) return;
        
        let profileData = {};
        if (selectedRole === 'USER') {
            profileData = {
                age: age ? parseInt(age) : null,
                gender,
                heightCm: heightCm ? parseFloat(heightCm) : null,
                weightKg: weightKg ? parseFloat(weightKg) : null,
                goal
            };
        } else if (selectedRole === 'NUTRITIONIST') {
            profileData = { credentials, specialization };
        }

        try {
            const result = await googleLogin(pendingGoogleCredential, selectedRole, profileData);
            if (result.success) {
                navigate(getPostLoginUrl(result.role));
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Google login failed. Please try again.');
        }
    };

    const loginWithGoogle = useGoogleLogin({
        onSuccess: handleGoogleLoginSuccess,
        onError: () => setError('Google login failed. Please try again.'),
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(email, password);
        if (result.success) {
            navigate(getPostLoginUrl(result.role));
        } else {
            setError(result.message);
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
        <div className="min-h-screen bg-[#080b12] text-slate-200 font-sans antialiased flex flex-col justify-between selection:bg-[#a5d391]/30 selection:text-[#a5d391] relative overflow-x-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#a5d391]/10 blur-[150px] rounded-full pointer-events-none z-0"></div>

            {/* BEGIN: Google Role Selection & Onboarding Modal */}
            {requiresRoleSelection && (
                <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-8 bg-[#080b12]/90 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    {onboardingStep === 3 ? (
                        <OnboardingWizard onComplete={() => navigate('/profile')} />
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

                            {onboardingStep === 2 && selectedRole === 'NUTRITIONIST' && (
                                <form onSubmit={handleOnboardingSubmit} className="w-full flex flex-col gap-4">
                                    <h2 className="text-xl font-bold text-white mb-1 text-center">
                                        Professional Details
                                    </h2>
                                    <p className="text-xs text-slate-400 text-center mb-4">
                                        Share your professional background.
                                    </p>
                                    
                                    <div>
                                        <label className="block text-[10px] font-semibold tracking-wider uppercase text-slate-400 mb-1">Specialization</label>
                                        <input type="text" required value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="e.g. Sports Nutrition" className="w-full bg-[#090d16] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:border-[#a5d391]/60 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold tracking-wider uppercase text-slate-400 mb-1">Credentials (Optional)</label>
                                        <input type="text" value={credentials} onChange={e => setCredentials(e.target.value)} placeholder="e.g. RD, CNS" className="w-full bg-[#090d16] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:border-[#a5d391]/60 focus:outline-none" />
                                    </div>
                                    
                                    <button 
                                        type="submit"
                                        className="w-full py-3 mt-4 rounded-xl font-bold text-sm uppercase tracking-widest text-black bg-[#a5d391] hover:bg-white active:bg-slate-200 transition duration-200 cursor-pointer"
                                    >
                                        Complete Setup
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setOnboardingStep(1)}
                                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider font-semibold cursor-pointer"
                                    >
                                        Back
                                    </button>
                                </form>
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 backdrop-blur-md transition duration-200 group cursor-pointer"
                >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back to Home</span>
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
                            <span className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 font-hero-display">
                                NutriMunch <span className="text-[10px] uppercase font-semibold tracking-wider text-[#a5d391] bg-[#a5d391]/10 border border-[#a5d391]/30 px-2 py-0.5 rounded-full">AI</span>
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2 font-hero-display">Welcome back</h1>
                        <p className="text-sm text-slate-400">
                            {roleSubtitles[activeTab]}
                        </p>
                    </div>

                    {/* Authentication Card */}
                    <div className="w-full bg-[#0d121c]/80 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-[2.5rem] p-7 sm:p-9">
                        
                        {/* Role Selector Tabs */}
                        <div className="flex bg-[#080b12]/80 p-1 rounded-2xl mb-6 border border-white/10">
                            {['USER', 'NUTRITIONIST', 'ADMIN'].map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => { setActiveTab(role); setError(''); }}
                                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
                                        activeTab === role 
                                        ? 'bg-[#a5d391] text-black shadow-[0_0_15px_rgba(165,211,145,0.3)]' 
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
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

                        <form onSubmit={handleSubmit} className="space-y-5">
                            
                            {/* Email Field Group */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-semibold tracking-wider uppercase text-slate-300" htmlFor="email">
                                    Email Address
                                </label>
                                <div className="relative flex items-center bg-[#090d16]/90 border border-white/10 rounded-xl overflow-hidden focus-within:border-[#a5d391]/60 focus-within:ring-2 focus-within:ring-[#a5d391]/20 transition-all">
                                    <span className="pl-3.5 pointer-events-none text-slate-400 flex items-center">
                                        <Mail className="w-4 h-4" />
                                    </span>
                                    <input 
                                        id="email" 
                                        name="email" 
                                        type="email" 
                                        required 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={activeTab === 'USER' ? 'user@example.com' : activeTab === 'NUTRITIONIST' ? 'nutritionist@nutrimunch.com' : 'admin@nutrimunch.com'}
                                        className="w-full bg-transparent border-0 py-2.5 pl-3 pr-4 text-sm text-white placeholder-slate-500 focus:ring-0 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Password Field Group */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[11px] font-semibold tracking-wider uppercase text-slate-300" htmlFor="password">
                                        Password
                                    </label>
                                    <Link to="/forgot-password" className="text-xs font-medium text-[#a5d391] hover:text-white transition-colors">
                                        Forgot Password?
                                    </Link>
                                </div>
                                <div className="relative flex items-center bg-[#090d16]/90 border border-white/10 rounded-xl overflow-hidden focus-within:border-[#a5d391]/60 focus-within:ring-2 focus-within:ring-[#a5d391]/20 transition-all">
                                    <span className="pl-3.5 pointer-events-none text-slate-400 flex items-center">
                                        <Lock className="w-4 h-4" />
                                    </span>
                                    <input 
                                        id="password" 
                                        name="password" 
                                        type={showPassword ? "text" : "password"} 
                                        required 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="w-full bg-transparent border-0 py-2.5 pl-3 pr-10 text-sm text-white placeholder-slate-600 focus:ring-0 focus:outline-none tracking-widest"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 text-slate-400 hover:text-slate-200 p-1 focus:outline-none transition-colors cursor-pointer"
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
                                    className="h-4 w-4 rounded border-slate-700 bg-slate-900/80 text-[#a5d391] focus:ring-[#a5d391]/30 focus:ring-offset-0 transition-colors cursor-pointer"
                                />
                                <label htmlFor="remember-me" className="ml-2.5 block text-xs text-slate-300 select-none cursor-pointer">
                                    Remember me
                                </label>
                            </div>

                            {/* Sign In Submit Button */}
                            <div className="pt-1">
                                <button 
                                    type="submit" 
                                    className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-black bg-[#a5d391] hover:bg-white active:bg-slate-200 border border-[#a5d391]/30 shadow-[0_0_20px_rgba(165,211,145,0.3)] transition duration-150 ease-in-out flex items-center justify-center gap-2 group cursor-pointer"
                                >
                                    <span>Sign In as {activeTab === 'USER' ? 'User' : activeTab === 'NUTRITIONIST' ? 'Nutritionist' : 'Admin'}</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </div>

                            {/* Google Login Option */}
                            <div className="pt-1">
                                <button 
                                    type="button"
                                    onClick={() => loginWithGoogle()}
                                    className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white font-medium text-xs uppercase tracking-wider cursor-pointer"
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
                                <p className="text-xs text-slate-400">
                                    Don't have an account? 
                                    <Link to="/register" className="font-semibold text-[#a5d391] hover:text-white ml-1 transition-colors">
                                        Sign up today
                                    </Link>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
            {/* END: MainContent */}

            {/* BEGIN: Footer */}
            <footer className="w-full py-6 text-center text-xs text-slate-500 tracking-wide z-10">
                <p>© 2026 NutriMunch AI. All rights reserved.</p>
            </footer>
            {/* END: Footer */}
        </div>
    );
};

export default Login;
