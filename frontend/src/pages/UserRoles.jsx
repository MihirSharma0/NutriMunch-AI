/**
 * User Roles & Platform Architecture Page
 * Explains access privileges, features, and workflows across Patient, Certified Nutritionist, and Admin roles.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Stethoscope,
    ShieldCheck,
    Sparkles,
    Utensils,
    Camera,
    Droplets,
    Calendar,
    FileText,
    Users,
    BookOpen,
    CheckCircle2,
    ArrowRight,
    Lock
} from 'lucide-react';

/**
 * UserRoles Component
 * Interactive comparison matrix detailing features available for patients, nutritionists, and administrators.
 */
const UserRoles = () => {
    const [activeTab, setActiveTab] = useState('user'); // 'user' | 'nutritionist'

    const userFeatures = [
        {
            icon: Utensils,
            title: 'AI Meal Plan Generator',
            desc: 'Generate a one-day meal plan with daily nutrition targets, timed meals, ingredients, and macros based on selected goals and dietary restrictions.'
        },
        {
            icon: Camera,
            title: 'AI Food & Barcode Analyzer',
            desc: 'Upload a food photo or scan a product barcode to review nutrition facts, allergen and additive flags, diet compatibility, and suggested alternatives.'
        },
        {
            icon: Droplets,
            title: 'Smart Hydration & BMR Tracker',
            desc: 'Set daily water and nutrition targets, log hydration, and get an estimated BMR during profile setup using the Mifflin-St Jeor formula.'
        },
        {
            icon: Calendar,
            title: 'Nutritionist Consultations',
            desc: 'Browse available nutritionists and request one-on-one appointments with verified professionals. Appointment chat and virtual-room tools are available.'
        },
        {
            icon: FileText,
            title: 'Health Progress & Report Export',
            desc: 'Review health and nutrition trends over time, then print or save a report as a PDF to share with your healthcare provider.'
        }
    ];

    const nutritionistFeatures = [
        {
            icon: Users,
            title: 'Client Management Console',
            desc: 'Full-featured roster to view assigned client health profiles, biometric history, dietary preferences, allergen filters, and active meal logs.'
        },
        {
            icon: BookOpen,
            title: 'Custom Prescription Diet Builder',
            desc: 'Craft, customize, and prescribe targeted weekly caloric & macro regimens directly into your patient’s NutriMunch account.'
        },
        {
            icon: Calendar,
            title: 'Virtual Consultation Scheduler',
            desc: 'Organize your availability, accept incoming appointment requests, host video sessions, and manage client follow-up reminders.'
        },
        {
            icon: Bot,
            title: 'AI Clinical Research Companion',
            desc: 'Leverage built-in AI tools for fast ingredient nutrient density reference, drug-nutrient interaction verification, and meal formulation.'
        },
        {
            icon: ShieldCheck,
            title: 'Verified Professional Bio & Profile',
            desc: 'Showcase your clinical credentials, specializations, consultation rates, and patient reviews across the platform directory.'
        }
    ];

    const comparisonMatrix = [
        { feature: 'AI Meal Plan Generator', user: true, nutritionist: true, admin: true },
        { feature: 'AI Food & Barcode Analyzer', user: true, nutritionist: true, admin: true },
        { feature: 'Smart Hydration & BMR Tracking', user: true, nutritionist: true, admin: true },
        { feature: 'Book Certified Nutritionist Consultations', user: true, nutritionist: false, admin: false },
        { feature: 'Custom Prescription Diet Regimen Builder', user: false, nutritionist: true, admin: true },
        { feature: 'Virtual Consultation Calendar & Scheduling', user: false, nutritionist: true, admin: true },
        { feature: 'Clinical PDF Progress & Compliance Export', user: true, nutritionist: true, admin: true },
        { feature: 'User & Nutritionist Management Portal', user: false, nutritionist: false, admin: true },
        { feature: 'SQL Console & System Analytics', user: false, nutritionist: false, admin: true }
    ];

    return (
        <div className="min-h-screen bg-transparent text-slate-800 dark:text-white pt-28 pb-20 relative overflow-hidden font-sans">
            {/* Glowing background spotlights */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/15 blur-[140px] rounded-full pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Hero Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-hero-display tracking-tight text-slate-900 dark:text-white leading-tight mb-6"
                    >
                        Tailored Solutions for <br />
                        <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-[#a5d391] dark:via-[#c6edb6] dark:to-[#7ec362] bg-clip-text text-transparent">
                            Every Health Journey
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-slate-600 dark:text-white/70 text-base sm:text-lg leading-relaxed"
                    >
                        Discover the specific features, AI tools, and professional workspace controls designed for both individual health seekers and certified nutritionists.
                    </motion.p>
                </div>

                {/* Role Selection Tabs */}
                <div className="flex justify-center mb-16">
                    <div className="bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl flex items-center gap-2 max-w-md w-full backdrop-blur-xl shadow-sm">
                        <button
                            onClick={() => setActiveTab('user')}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'user'
                                    ? 'bg-emerald-700 text-white dark:bg-[#a5d391] dark:text-black shadow-md dark:shadow-[0_0_20px_rgba(165,211,145,0.4)]'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/5'
                            }`}
                        >
                            <User className="w-4 h-4" />
                            <span>Standard User</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('nutritionist')}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'nutritionist'
                                    ? 'bg-emerald-700 text-white dark:bg-[#a5d391] dark:text-black shadow-md dark:shadow-[0_0_20px_rgba(165,211,145,0.4)]'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/5'
                            }`}
                        >
                            <Stethoscope className="w-4 h-4" />
                            <span>Nutritionist</span>
                        </button>
                    </div>
                </div>

                {/* Active Role Content Section */}
                <AnimatePresence mode="wait">
                    {activeTab === 'user' ? (
                        <motion.div
                            key="user-role"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Role Overview Banner */}
                            <div className="bg-white/90 dark:bg-gradient-to-br dark:from-[#0d131f] dark:to-[#080b12] border border-emerald-200 dark:border-[#a5d391]/30 rounded-3xl p-8 sm:p-10 mb-12 shadow-md dark:shadow-[0_0_50px_rgba(165,211,145,0.1)] flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="space-y-4 max-w-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-[#a5d391]/20 border border-emerald-300 dark:border-[#a5d391]/40 flex items-center justify-center text-emerald-700 dark:text-[#a5d391]">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl sm:text-3xl font-bold font-hero-display text-slate-900 dark:text-white">Standard User Role</h2>
                                            <span className="text-xs font-bold text-emerald-700 dark:text-[#a5d391] uppercase tracking-wider">For Individuals & Health Enthusiasts</span>
                                        </div>
                                    </div>
                                    <p className="text-slate-600 dark:text-white/70 leading-relaxed text-sm sm:text-base">
                                        As a standard user, use AI tools to generate one-day meal plans and analyze food, track hydration and health progress, and request consultations with verified nutritionists.
                                    </p>
                                </div>
                                <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                    <Link
                                        to="/register"
                                        className="px-6 py-3.5 rounded-xl bg-emerald-700 text-white dark:bg-[#a5d391] dark:text-black font-bold text-sm hover:bg-emerald-800 dark:hover:bg-[#8ec478] transition-all flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <span>Create Free Account</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white font-bold text-sm border border-slate-300 dark:border-white/10 transition-all text-center"
                                    >
                                        Sign In
                                    </Link>
                                </div>
                            </div>

                            {/* Features Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
                                {userFeatures.map((feat, idx) => {
                                    const IconComponent = feat.icon;
                                    return (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: idx * 0.05 }}
                                            className="bg-white/90 dark:bg-[#0b1019] border border-slate-200 dark:border-white/10 hover:border-emerald-600/40 dark:hover:border-[#a5d391]/50 rounded-3xl p-6 flex flex-col justify-between transition-all group hover:-translate-y-1 shadow-sm"
                                        >
                                            <div>
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-[#a5d391]/10 border border-emerald-200 dark:border-[#a5d391]/30 flex items-center justify-center text-emerald-700 dark:text-[#a5d391] mb-5 group-hover:scale-110 transition-transform">
                                                    <IconComponent className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-emerald-700 dark:group-hover:text-[#a5d391] transition-colors">
                                                    {feat.title}
                                                </h3>
                                                <p className="text-slate-600 dark:text-white/60 text-sm leading-relaxed mb-6">
                                                    {feat.desc}
                                                </p>
                                            </div>
                                            <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-[#a5d391]">
                                                <span>Included in User Plan</span>
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="nutritionist-role"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Nutritionist Overview Banner */}
                            <div className="bg-white/90 dark:bg-gradient-to-br dark:from-[#0d131f] dark:to-[#080b12] border border-emerald-200 dark:border-[#a5d391]/30 rounded-3xl p-8 sm:p-10 mb-12 shadow-md dark:shadow-[0_0_50px_rgba(165,211,145,0.1)] flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="space-y-4 max-w-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-[#a5d391]/20 border border-emerald-300 dark:border-[#a5d391]/40 flex items-center justify-center text-emerald-700 dark:text-[#a5d391]">
                                            <Stethoscope className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl sm:text-3xl font-bold font-hero-display text-slate-900 dark:text-white">Nutritionist Role</h2>
                                            <span className="text-xs font-bold text-emerald-700 dark:text-[#a5d391] uppercase tracking-wider">For Healthcare & Clinical Professionals</span>
                                        </div>
                                    </div>
                                    <p className="text-slate-600 dark:text-white/70 leading-relaxed text-sm sm:text-base">
                                        Designed for certified nutritionists. Manage client rosters, prescribe customized weekly meal plans directly to patients, schedule virtual appointments, and generate white-labeled clinical PDF reports.
                                    </p>
                                </div>
                                <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                    <Link
                                        to="/register"
                                        className="px-6 py-3.5 rounded-xl bg-emerald-700 text-white dark:bg-[#a5d391] dark:text-black font-bold text-sm hover:bg-emerald-800 dark:hover:bg-[#8ec478] transition-all flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <span>Apply as Nutritionist</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white font-bold text-sm border border-slate-300 dark:border-white/10 transition-all text-center"
                                    >
                                        Workspace Login
                                    </Link>
                                </div>
                            </div>

                            {/* Features Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
                                {nutritionistFeatures.map((feat, idx) => {
                                    const IconComponent = feat.icon;
                                    return (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: idx * 0.05 }}
                                            className="bg-white/90 dark:bg-[#0b1019] border border-slate-200 dark:border-white/10 hover:border-emerald-600/40 dark:hover:border-[#a5d391]/50 rounded-3xl p-6 flex flex-col justify-between transition-all group hover:-translate-y-1 shadow-sm"
                                        >
                                            <div>
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-[#a5d391]/10 border border-emerald-200 dark:border-[#a5d391]/30 flex items-center justify-center text-emerald-700 dark:text-[#a5d391] mb-5 group-hover:scale-110 transition-transform">
                                                    <IconComponent className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-emerald-700 dark:group-hover:text-[#a5d391] transition-colors">
                                                    {feat.title}
                                                </h3>
                                                <p className="text-slate-600 dark:text-white/60 text-sm leading-relaxed mb-6">
                                                    {feat.desc}
                                                </p>
                                            </div>
                                            <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-[#a5d391]">
                                                <span>Included in Professional Plan</span>
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Feature Comparison Matrix */}
                <div className="mt-20">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <span className="text-xs font-bold text-emerald-700 dark:text-[#a5d391] uppercase tracking-widest block mb-3">Side-by-Side Comparison</span>
                        <h2 className="text-3xl font-bold font-hero-display text-slate-900 dark:text-white mb-4">Complete Role Feature Matrix</h2>
                        <p className="text-slate-600 dark:text-white/60 text-sm">Compare capabilities and tools available to each account type across the platform.</p>
                    </div>

                    <div className="bg-white/95 dark:bg-[#0b1019] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-xs uppercase tracking-wider font-bold">
                                        <th className="p-5">Platform Feature</th>
                                        <th className="p-5 text-center text-emerald-700 dark:text-[#a5d391]">Standard User</th>
                                        <th className="p-5 text-center text-emerald-700 dark:text-[#a5d391]">Nutritionist</th>
                                        <th className="p-5 text-center text-slate-600 dark:text-white/50">Admin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm text-slate-700 dark:text-white/80">
                                    {comparisonMatrix.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="p-5 font-semibold text-slate-900 dark:text-white">{row.feature}</td>
                                            <td className="p-5 text-center">
                                                {row.user ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 dark:bg-[#a5d391]/20 dark:text-[#a5d391]">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/30">
                                                        <Lock className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-5 text-center">
                                                {row.nutritionist ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 dark:bg-[#a5d391]/20 dark:text-[#a5d391]">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/30">
                                                        <Lock className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-5 text-center">
                                                {row.admin ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 dark:bg-white/10 dark:text-white">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/30">
                                                        <Lock className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Bottom Call-to-Action Section */}
                <div className="mt-24 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-[#a5d391]/20 dark:via-[#a5d391]/10 dark:to-transparent border border-emerald-200 dark:border-[#a5d391]/40 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-md dark:shadow-[0_0_60px_rgba(165,211,145,0.15)]">
                    <div className="space-y-3 max-w-xl text-center md:text-left">
                        <h3 className="text-2xl sm:text-3xl font-bold font-hero-display text-slate-900 dark:text-white">Ready to Experience NutriMunch AI?</h3>
                        <p className="text-slate-600 dark:text-white/70 text-sm sm:text-base leading-relaxed">
                            Sign up today as an individual user or apply to join our verified nutritionist network.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <Link
                            to="/register"
                            className="px-8 py-4 rounded-xl bg-emerald-700 text-white dark:bg-[#a5d391] dark:text-black font-bold text-sm hover:bg-emerald-800 dark:hover:bg-[#8ec478] transition-all text-center shadow-lg hover:-translate-y-0.5"
                        >
                            Sign Up Free
                        </Link>
                        <Link
                            to="/login"
                            className="px-8 py-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white font-bold text-sm border border-slate-300 dark:border-white/10 transition-all text-center"
                        >
                            Login to Account
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserRoles;
