import React, { useState, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ArrowLeft, ArrowRight, Sparkles, Camera, Check, User, ShieldCheck, X, Eye, EyeOff } from 'lucide-react';
import Starfield from '../../components/Starfield';

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
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const fileInputRef = useRef(null);
    
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeAvatar = () => {
        setAvatarPreview(null);
        setAvatarFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

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
                setSuccess('Registration successful! Redirecting to email verification...');
                setTimeout(() => navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}&firstName=${encodeURIComponent(formData.firstName)}&lastName=${encodeURIComponent(formData.lastName)}`), 1500);
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
        <div className="min-h-screen bg-[#080b12] text-slate-100 font-sans antialiased flex flex-col justify-between relative selection:bg-[#a5d391]/30 selection:text-[#a5d391] overflow-x-hidden">
            <Starfield />

            {/* Ambient Background Glows */}
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden z-0">
                <div className="w-[700px] h-[500px] bg-[#a5d391]/10 blur-[150px] rounded-full"></div>
            </div>

            {/* BEGIN: TopNavigation */}
            <header className="relative z-10 w-full px-6 py-6 md:px-10 flex items-center justify-between">
                <button 
                    onClick={() => navigate('/')} 
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-900/60 border border-slate-700/60 backdrop-blur-md hover:bg-slate-800/80 hover:text-white hover:border-slate-500 transition-all duration-200 shadow-sm cursor-pointer"
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
                        <span className="text-2xl font-bold tracking-tight text-white flex items-center gap-1.5 font-hero-display">
                            NutriMunch
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#a5d391]/10 text-[#a5d391] border border-[#a5d391]/30">AI</span>
                        </span>
                    </div>
                    <p className="text-sm font-normal text-slate-400 tracking-normal">
                        The intelligent network for personalized health & AI-powered nutrition.
                    </p>
                </div>

                {/* Registration Card */}
                <div className="w-full max-w-[560px] rounded-[2.5rem] bg-[#0d121c]/80 border border-white/10 p-6 sm:p-10 relative backdrop-blur-2xl shadow-2xl">
                    
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
                                ? 'bg-[#a5d391] text-black shadow-[0_0_15px_rgba(165,211,145,0.4)] ring-4 ring-[#a5d391]/20'
                                : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 hover:text-white'
                            }`}
                        >
                            <User className="w-3.5 h-3.5" />
                            <span>User Account</span>
                        </button>

                        <div className="hidden sm:block w-8 h-[2px] bg-slate-800"></div>

                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, role: 'NUTRITIONIST' })}
                            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                formData.role === 'NUTRITIONIST'
                                ? 'bg-[#a5d391] text-black shadow-[0_0_15px_rgba(165,211,145,0.4)] ring-4 ring-[#a5d391]/20'
                                : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 hover:text-white'
                            }`}
                        >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Nutritionist</span>
                        </button>
                    </div>

                    {/* Card Title and Intro Subtitle */}
                    <div className="text-center mb-6">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-hero-display">Create Your Account</h1>
                        <p className="text-sm text-slate-400 mt-1.5 font-normal">
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
                                    className="w-20 h-20 rounded-full object-cover border-2 border-[#a5d391] shadow-lg shadow-[#a5d391]/20"
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
                                    <Camera className="w-4 h-4 mb-0.5 text-[#a5d391]" />
                                    Change
                                </button>
                            </div>
                        ) : (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-20 h-20 rounded-full border-2 border-dashed border-slate-600/80 hover:border-[#a5d391] bg-slate-900/40 hover:bg-[#a5d391]/10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group p-2 shadow-inner"
                            >
                                <Camera className="w-5 h-5 text-slate-400 group-hover:text-[#a5d391] transition-colors duration-200" />
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-[#a5d391] mt-1">UPLOAD</span>
                            </div>
                        )}
                        <p className="text-[11px] text-slate-500 mt-2">Click to select profile photo</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-5 text-xs font-medium">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl mb-5 text-xs font-medium flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>{success}</span>
                        </div>
                    )}

                    {/* Registration Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* Row 1: First Name & Last Name (2 columns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold tracking-wider uppercase text-slate-300 mb-1.5" htmlFor="firstName">
                                    FIRST NAME <span className="text-[#a5d391]">*</span>
                                </label>
                                <input 
                                    id="firstName"
                                    name="firstName"
                                    type="text"
                                    required
                                    placeholder="Jane"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className="w-full rounded-xl bg-[#090d16]/90 border border-white/10 text-slate-100 placeholder-slate-500 text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#a5d391]/60 focus:ring-1 focus:ring-[#a5d391]/20 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold tracking-wider uppercase text-slate-300 mb-1.5" htmlFor="lastName">
                                    LAST NAME <span className="text-[#a5d391]">*</span>
                                </label>
                                <input 
                                    id="lastName"
                                    name="lastName"
                                    type="text"
                                    required
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className="w-full rounded-xl bg-[#090d16]/90 border border-white/10 text-slate-100 placeholder-slate-500 text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#a5d391]/60 focus:ring-1 focus:ring-[#a5d391]/20 transition-all"
                                />
                            </div>
                        </div>

                        {/* Row 2: Email Address (Full Width) */}
                        <div>
                            <label className="block text-[11px] font-semibold tracking-wider uppercase text-slate-300 mb-1.5" htmlFor="email">
                                EMAIL ADDRESS <span className="text-[#a5d391]">*</span>
                            </label>
                            <input 
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="jane@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full rounded-xl bg-[#090d16]/90 border border-white/10 text-slate-100 placeholder-slate-500 text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#a5d391]/60 focus:ring-1 focus:ring-[#a5d391]/20 transition-all"
                            />
                        </div>

                        {/* Additional Fields for Nutritionist */}
                        {formData.role === 'NUTRITIONIST' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-semibold tracking-wider uppercase text-slate-300 mb-1.5" htmlFor="credentials">
                                        CREDENTIALS <span className="text-[#a5d391]">*</span>
                                    </label>
                                    <input 
                                        id="credentials"
                                        name="credentials"
                                        type="text"
                                        required
                                        placeholder="e.g., MS, RD, CDN"
                                        value={formData.credentials}
                                        onChange={handleChange}
                                        className="w-full rounded-xl bg-[#090d16]/90 border border-white/10 text-slate-100 placeholder-slate-500 text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#a5d391]/60 focus:ring-1 focus:ring-[#a5d391]/20 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold tracking-wider uppercase text-slate-300 mb-1.5" htmlFor="specialization">
                                        SPECIALIZATION <span className="text-[#a5d391]">*</span>
                                    </label>
                                    <input 
                                        id="specialization"
                                        name="specialization"
                                        type="text"
                                        required
                                        placeholder="e.g., Sports Nutrition"
                                        value={formData.specialization}
                                        onChange={handleChange}
                                        className="w-full rounded-xl bg-[#090d16]/90 border border-white/10 text-slate-100 placeholder-slate-500 text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#a5d391]/60 focus:ring-1 focus:ring-[#a5d391]/20 transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Row 3: Passwords (2 columns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold tracking-wider uppercase text-slate-300 mb-1.5" htmlFor="password">
                                    PASSWORD <span className="text-[#a5d391]">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        minLength="6"
                                        required
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full rounded-xl bg-[#090d16]/90 border border-white/10 text-slate-100 placeholder-slate-500 text-sm px-3.5 py-2.5 pr-10 focus:outline-none focus:border-[#a5d391]/60 focus:ring-1 focus:ring-[#a5d391]/20 tracking-widest transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 focus:outline-none transition-colors cursor-pointer"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold tracking-wider uppercase text-slate-300 mb-1.5" htmlFor="confirmPassword">
                                    CONFIRM PASSWORD <span className="text-[#a5d391]">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        minLength="6"
                                        required
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="w-full rounded-xl bg-[#090d16]/90 border border-white/10 text-slate-100 placeholder-slate-500 text-sm px-3.5 py-2.5 pr-10 focus:outline-none focus:border-[#a5d391]/60 focus:ring-1 focus:ring-[#a5d391]/20 tracking-widest transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 focus:outline-none transition-colors cursor-pointer"
                                        tabIndex={-1}
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
                                className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-black bg-[#a5d391] hover:bg-white active:bg-slate-200 border border-[#a5d391]/30 shadow-[0_0_20px_rgba(165,211,145,0.3)] flex items-center justify-center gap-2 transform active:scale-[0.99] transition-all duration-150 cursor-pointer ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating Account...
                                    </span>
                                ) : (
                                    <>
                                        <span>Continue</span>
                                        <ArrowRight className="w-4 h-4 text-black" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Bottom Form Link */}
                    <div className="mt-6 text-center text-xs text-slate-400">
                        Already have an account? 
                        <Link to="/login" className="text-[#a5d391] hover:text-white font-semibold ml-1 transition-colors">
                            Sign in
                        </Link>
                    </div>
                </div>
            </main>
            {/* END: MainContent */}

            {/* BEGIN: Footer */}
            <footer className="relative z-10 py-6 text-center text-xs text-slate-500 font-normal">
                © 2026 NutriMunch AI. All rights reserved.
            </footer>
            {/* END: Footer */}
        </div>
    );
};

export default Register;
