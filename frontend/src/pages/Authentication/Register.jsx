/**
 * Account Registration Page
 * Collects new user details, role selection (User vs Nutritionist),
 * credentials/specialization info for dietitians, and dispatches verification OTP.
 */
import React, { useState, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, ArrowRight, Sparkles, Camera, Check, User, ShieldCheck, X, Eye, EyeOff } from 'lucide-react';
import { getEmailError } from '../../utils/emailValidation';

/**
 * Register Component
 * Interactive signup form with profile picture preview, role toggle, and validation.
 */
const Register = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'USER',
        credentials: '',
        specialization: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [error, setError] = useState('');
    const emailError = getEmailError(formData.email);
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);
    
    const { register } = useContext(AuthContext);
    const { isDark } = useTheme();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeAvatar = () => {
        setAvatarPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;
        if (emailError) return;

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const result = await register({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                credentials: formData.credentials,
                specialization: formData.specialization,
                avatar: avatarPreview // base64 string or file if needed
            });

            if (result.success) {
                // Save pending registration details so OTP verification and Onboarding can prefill them
                try {
                    sessionStorage.setItem('nutrimunch_pending_registration', JSON.stringify({
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email,
                        role: formData.role
                    }));
                } catch (e) {}

                setSuccess('Registration successful! Redirecting to email verification...');
                setTimeout(() => navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}`, {
                    state: {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email,
                        role: formData.role
                    }
                }), 1500);
            } else {
                setError(result.message);
                setIsLoading(false);
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className={`min-h-screen font-sans antialiased flex flex-col justify-between relative overflow-x-hidden transition-colors duration-300 ${
            isDark 
                ? 'bg-[#080b12] text-slate-100 selection:bg-[#a5d391]/30 selection:text-[#a5d391]' 
                : 'bg-gradient-to-br from-[#e0f2fe] via-[#f3e8ff] to-[#ecfdf5] text-slate-900 selection:bg-emerald-200 selection:text-emerald-900'
        }`}>
            {/* Ambient Background Glows */}
            {isDark ? (
                <div aria-hidden="true" className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden z-0">
                    <div className="w-[700px] h-[500px] bg-[#a5d391]/10 blur-[150px] rounded-full"></div>
                </div>
            ) : (
                <div aria-hidden="true" className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden z-0">
                    <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-300/25 blur-[160px] rounded-full"></div>
                    <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 translate-y-1/2 w-[550px] h-[550px] bg-purple-300/20 blur-[160px] rounded-full"></div>
                </div>
            )}

            {/* BEGIN: TopNavigation */}
            <header className="relative z-10 w-full px-6 py-6 md:px-10 flex items-center justify-between">
                <button 
                    onClick={() => navigate('/')} 
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-md transition-all duration-200 shadow-sm cursor-pointer border ${
                        isDark 
                            ? 'text-slate-300 bg-slate-900/60 border-slate-700/60 hover:bg-slate-800/80 hover:text-white hover:border-slate-500' 
                            : 'text-slate-700 bg-white/80 border-slate-200 hover:bg-white hover:text-slate-900'
                    }`}
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Home</span>
                </button>
            </header>
            {/* END: TopNavigation */}

            {/* BEGIN: MainContent */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-4 sm:px-6">
                
                {/* Top Branding: Logo & Tagline */}
                <div className="flex flex-col items-center text-center mb-6 space-y-2.5">
                    <div 
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2.5 cursor-pointer group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#a5d391] to-emerald-400 flex items-center justify-center shadow-lg shadow-[#a5d391]/20">
                            <Sparkles className="w-5 h-5 text-slate-950 transform group-hover:scale-110 transition-transform duration-200" />
                        </div>
                        <span className={`text-2xl font-bold tracking-tight flex items-center gap-1.5 font-hero-display ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            NutriMunch
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${isDark ? 'bg-[#a5d391]/10 text-[#a5d391] border-[#a5d391]/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>AI</span>
                        </span>
                    </div>
                    <p className={`text-sm font-normal tracking-normal ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        The intelligent network for personalized health & AI-powered nutrition.
                    </p>
                </div>

                {/* Registration Card */}
                <div className={`w-full max-w-[560px] rounded-[2.5rem] p-6 sm:p-10 relative backdrop-blur-2xl transition-all duration-300 border ${
                    isDark 
                        ? 'bg-[#0d121c]/80 border-white/10 shadow-2xl text-white' 
                        : 'bg-white/90 border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.08)] text-slate-800'
                }`}>
                    
                    {/* Hidden File Input */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        className="hidden" 
                    />

                    {/* Role / Stepper Selection Indicator */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, role: 'USER' })}
                            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                formData.role === 'USER'
                                ? (isDark 
                                    ? 'bg-[#a5d391] text-black shadow-[0_0_15px_rgba(165,211,145,0.4)] ring-4 ring-[#a5d391]/20' 
                                    : 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-4 ring-emerald-500/20')
                                : (isDark 
                                    ? 'bg-slate-800/80 text-slate-400 border border-slate-700/60 hover:text-white' 
                                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-white')
                            }`}
                        >
                            <User className="w-3.5 h-3.5" />
                            <span>User Account</span>
                        </button>

                        <div className={`hidden sm:block w-8 h-[2px] ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}></div>

                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, role: 'NUTRITIONIST' })}
                            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                formData.role === 'NUTRITIONIST'
                                ? (isDark 
                                    ? 'bg-[#a5d391] text-black shadow-[0_0_15px_rgba(165,211,145,0.4)] ring-4 ring-[#a5d391]/20' 
                                    : 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-4 ring-emerald-500/20')
                                : (isDark 
                                    ? 'bg-slate-800/80 text-slate-400 border border-slate-700/60 hover:text-white' 
                                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-white')
                            }`}
                        >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Nutritionist</span>
                        </button>
                    </div>

                    {/* Card Title and Intro Subtitle */}
                    <div className="text-center mb-6">
                        <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight font-hero-display ${isDark ? 'text-white' : 'text-slate-900'}`}>Create Your Account</h1>
                        <p className={`text-sm mt-1.5 font-normal ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {formData.role === 'NUTRITIONIST' ? 'Join as a verified health expert' : "Let's start with your basic details."}
                        </p>
                    </div>

                    {/* Profile Avatar Upload Zone */}
                    <div className="flex flex-col items-center justify-center mb-6">
                        {avatarPreview ? (
                            <div className="relative group flex items-center justify-center">
                                <img 
                                    src={avatarPreview} 
                                    alt="Avatar Preview" 
                                    className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500 shadow-lg shadow-emerald-500/20"
                                />
                                <button
                                    type="button"
                                    onClick={removeAvatar}
                                    className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-transform transform hover:scale-110 cursor-pointer"
                                    title="Remove Picture"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold uppercase tracking-wider transition-opacity cursor-pointer"
                                >
                                    <Camera className="w-4 h-4 mb-0.5 text-emerald-400" />
                                    Change
                                </button>
                            </div>
                        ) : (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-20 h-20 rounded-full border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group p-2 shadow-inner ${
                                    isDark 
                                        ? 'border-slate-600/80 hover:border-[#a5d391] bg-slate-900/40 hover:bg-[#a5d391]/10' 
                                        : 'border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50'
                                }`}
                            >
                                <Camera className={`w-5 h-5 transition-colors duration-200 ${isDark ? 'text-slate-400 group-hover:text-[#a5d391]' : 'text-slate-400 group-hover:text-emerald-600'}`} />
                                <span className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${isDark ? 'text-slate-400 group-hover:text-[#a5d391]' : 'text-slate-400 group-hover:text-emerald-600'}`}>UPLOAD</span>
                            </div>
                        )}
                        <p className={`text-[11px] mt-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Click to select profile photo</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-5 text-xs font-medium">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl mb-5 text-xs font-medium flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span>{success}</span>
                        </div>
                    )}

                    {/* Registration Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* Row 1: First Name & Last Name (2 columns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-[11px] font-semibold tracking-wider uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="firstName">
                                    FIRST NAME <span className={isDark ? 'text-[#a5d391]' : 'text-emerald-600'}>*</span>
                                </label>
                                <input 
                                    id="firstName"
                                    name="firstName"
                                    type="text"
                                    required
                                    placeholder="Jane"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className={`w-full rounded-xl text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 transition-all border ${
                                        isDark 
                                            ? 'bg-[#090d16]/90 border-white/10 text-slate-100 placeholder-slate-500 focus:border-[#a5d391]/60 focus:ring-[#a5d391]/20' 
                                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                                    }`}
                                />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-semibold tracking-wider uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="lastName">
                                    LAST NAME <span className={isDark ? 'text-[#a5d391]' : 'text-emerald-600'}>*</span>
                                </label>
                                <input 
                                    id="lastName"
                                    name="lastName"
                                    type="text"
                                    required
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className={`w-full rounded-xl text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 transition-all border ${
                                        isDark 
                                            ? 'bg-[#090d16]/90 border-white/10 text-slate-100 placeholder-slate-500 focus:border-[#a5d391]/60 focus:ring-[#a5d391]/20' 
                                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Row 2: Email Address (Full Width) */}
                        <div>
                            <label className={`block text-[11px] font-semibold tracking-wider uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="email">
                                EMAIL ADDRESS <span className={isDark ? 'text-[#a5d391]' : 'text-emerald-600'}>*</span>
                            </label>
                            <input 
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="jane@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                aria-invalid={!!emailError}
                                aria-describedby={emailError ? 'email-error' : undefined}
                                className={`w-full rounded-xl text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 transition-all border ${
                                    isDark 
                                        ? `bg-[#090d16]/90 ${emailError ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20' : 'border-white/10 focus:border-[#a5d391]/60 focus:ring-[#a5d391]/20'} text-slate-100 placeholder-slate-500` 
                                        : `bg-slate-50 ${emailError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'} text-slate-900 placeholder-slate-400 focus:bg-white`
                                }`}
                            />
                            {emailError && <p id="email-error" className={`mt-1.5 text-xs ${isDark ? 'text-red-400' : 'text-red-500'}`}>{emailError}</p>}
                        </div>

                        {/* Additional Fields for Nutritionist */}
                        {formData.role === 'NUTRITIONIST' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-[11px] font-semibold tracking-wider uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="credentials">
                                        CREDENTIALS <span className={isDark ? 'text-[#a5d391]' : 'text-emerald-600'}>*</span>
                                    </label>
                                    <input 
                                        id="credentials"
                                        name="credentials"
                                        type="text"
                                        required
                                        placeholder="e.g., MS, RD, CDN"
                                        value={formData.credentials}
                                        onChange={handleChange}
                                        className={`w-full rounded-xl text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 transition-all border ${
                                            isDark 
                                                ? 'bg-[#090d16]/90 border-white/10 text-slate-100 placeholder-slate-500 focus:border-[#a5d391]/60 focus:ring-[#a5d391]/20' 
                                                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                                        }`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-[11px] font-semibold tracking-wider uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="specialization">
                                        SPECIALIZATION <span className={isDark ? 'text-[#a5d391]' : 'text-emerald-600'}>*</span>
                                    </label>
                                    <input 
                                        id="specialization"
                                        name="specialization"
                                        type="text"
                                        required
                                        placeholder="e.g., Sports Nutrition"
                                        value={formData.specialization}
                                        onChange={handleChange}
                                        className={`w-full rounded-xl text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 transition-all border ${
                                            isDark 
                                                ? 'bg-[#090d16]/90 border-white/10 text-slate-100 placeholder-slate-500 focus:border-[#a5d391]/60 focus:ring-[#a5d391]/20' 
                                                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                                        }`}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Row 3: Passwords (2 columns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-[11px] font-semibold tracking-wider uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="password">
                                    PASSWORD <span className={isDark ? 'text-[#a5d391]' : 'text-emerald-600'}>*</span>
                                </label>
                                <div className="relative flex items-center">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        minLength="6"
                                        maxLength="40"
                                        required
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={`w-full rounded-xl text-sm pl-3.5 pr-10 py-2.5 focus:outline-none focus:ring-2 tracking-widest transition-all border ${
                                            isDark 
                                                ? 'bg-[#090d16]/90 border-white/10 text-slate-100 placeholder-slate-500 focus:border-[#a5d391]/60 focus:ring-[#a5d391]/20' 
                                                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        className={`absolute right-3 p-1 focus:outline-none transition-colors cursor-pointer ${
                                            isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={`block text-[11px] font-semibold tracking-wider uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="confirmPassword">
                                    CONFIRM PASSWORD <span className={isDark ? 'text-[#a5d391]' : 'text-emerald-600'}>*</span>
                                </label>
                                <div className="relative flex items-center">
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        minLength="6"
                                        maxLength="40"
                                        required
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className={`w-full rounded-xl text-sm pl-3.5 pr-10 py-2.5 focus:outline-none focus:ring-2 tracking-widest transition-all border ${
                                            isDark 
                                                ? 'bg-[#090d16]/90 border-white/10 text-slate-100 placeholder-slate-500 focus:border-[#a5d391]/60 focus:ring-[#a5d391]/20' 
                                                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                        className={`absolute right-3 p-1 focus:outline-none transition-colors cursor-pointer ${
                                            isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button CTA */}
                        <div className="pt-3">
                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transform active:scale-[0.99] transition-all duration-150 cursor-pointer ${
                                    isDark 
                                        ? 'text-black bg-[#a5d391] hover:bg-white active:bg-slate-200 border border-[#a5d391]/30 shadow-[0_0_20px_rgba(165,211,145,0.3)]' 
                                        : 'text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-lg shadow-emerald-600/30'
                                } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className={`animate-spin h-4 w-4 ${isDark ? 'text-black' : 'text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating Account...
                                    </span>
                                ) : (
                                    <>
                                        <span>Continue</span>
                                        <ArrowRight className={`w-4 h-4 ${isDark ? 'text-black' : 'text-white'}`} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Bottom Form Link */}
                    <div className={`mt-6 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Already have an account? 
                        <Link to="/login" className={`font-semibold ml-1 transition-colors ${isDark ? 'text-[#a5d391] hover:text-white' : 'text-emerald-600 hover:text-emerald-700'}`}>
                            Sign in
                        </Link>
                    </div>
                </div>
            </main>
            {/* END: MainContent */}

            {/* BEGIN: Footer */}
            <footer className={`relative z-10 py-6 text-center text-xs font-normal ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                © 2026 NutriMunch AI. All rights reserved.
            </footer>
            {/* END: Footer */}
        </div>
    );
};

export default Register;
