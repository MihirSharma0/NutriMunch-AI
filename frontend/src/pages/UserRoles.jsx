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
    Bot,
    Calendar,
    FileText,
    Users,
    BookOpen,
    CheckCircle2,
    ArrowRight,
    Lock
} from 'lucide-react';

const UserRoles = () => {
    const [activeTab, setActiveTab] = useState('user'); // 'user' | 'nutritionist'

    const userFeatures = [
        {
            icon: Utensils,
            title: 'AI Weekly Diet Plan Generator',
            desc: 'Generate automated, fully macro-balanced weekly meal plans customized to your caloric goals, budget tier, and diet preferences (Keto, Vegan, High-Protein, Mediterranean).'
        },
        {
            icon: Camera,
            title: 'Food Photo & Calorie Scanner',
            desc: 'Snap a picture of any meal or ingredient to receive instant computer vision calorie counts, protein/fat/carb breakdowns, and dietary quality scores.'
        },
        {
            icon: Droplets,
            title: 'Smart Hydration & BMR Tracker',
            desc: 'Set daily fluid targets, log water consumption in real time, and compute accurate Mifflin-St Jeor basal metabolic rate (BMR) metrics.'
        },
        {
            icon: Bot,
            title: '24/7 AI Health Chat Assistant',
            desc: 'Interact with an intelligent, fine-tuned AI health companion for instant answers on nutrition questions, ingredient swaps, and dietary advice.'
        },
        {
            icon: Calendar,
            title: '1-on-1 Certified Nutritionist Consults',
            desc: 'Book one-on-one virtual video and chat consultations with verified professional nutritionists and licensed nutritionists.'
        },
        {
            icon: FileText,
            title: 'Health Progress & PDF Exporter',
            desc: 'Track weight trends and dietary adherence over time, and export clean PDF reports to share with your personal healthcare providers.'
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
            icon: FileText,
            title: 'White-Labeled Clinical Reports',
            desc: 'Generate comprehensive, branded PDF health reports detailing client adherence, nutritional milestones, and clinical recommendations.'
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
        { feature: 'AI Weekly Diet Plan Generator', user: true, nutritionist: true, admin: true },
        { feature: 'Food Photo Calorie & Macro Scanner', user: true, nutritionist: true, admin: true },
        { feature: 'Smart Hydration & BMR Tracking', user: true, nutritionist: true, admin: true },
        { feature: '24/7 AI Health Chat Assistant', user: true, nutritionist: true, admin: true },
        { feature: 'Book Certified Nutritionist Consultations', user: true, nutritionist: false, admin: false },
        { feature: 'Client Roster & Patient Health History', user: false, nutritionist: true, admin: true },
        { feature: 'Custom Prescription Diet Regimen Builder', user: false, nutritionist: true, admin: true },
        { feature: 'Virtual Consultation Calendar & Scheduling', user: false, nutritionist: true, admin: true },
        { feature: 'Clinical PDF Progress & Compliance Export', user: true, nutritionist: true, admin: true },
        { feature: 'User & Nutritionist Management Portal', user: false, nutritionist: false, admin: true },
        { feature: 'SQL Console & System Analytics', user: false, nutritionist: false, admin: true }
    ];

    return (
        <div className="min-h-screen bg-[#080b12] text-white pt-28 pb-20 relative overflow-hidden font-sans">
            {/* Glowing background spotlights */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/15 blur-[140px] rounded-full pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Hero Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-widest mb-6"
                    >
                        <Sparkles className="w-4 h-4" />
                        Platform Roles & Capabilities
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-hero-display tracking-tight text-white leading-tight mb-6"
                    >
                        Tailored Solutions for <br />
                        <span className="bg-gradient-to-r from-[#a5d391] via-[#c6edb6] to-[#7ec362] bg-clip-text text-transparent">
                            Every Health Journey
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-white/70 text-base sm:text-lg leading-relaxed"
                    >
                        Discover the specific features, AI tools, and professional workspace controls designed for both individual health seekers and certified nutritionists.
                    </motion.p>
                </div>

                {/* Role Selection Tabs */}
                <div className="flex justify-center mb-16">
                    <div className="bg-white/5 border border-white/10 p-1.5 rounded-2xl flex items-center gap-2 max-w-md w-full backdrop-blur-xl">
                        <button
                            onClick={() => setActiveTab('user')}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'user'
                                    ? 'bg-[#a5d391] text-black shadow-[0_0_20px_rgba(165,211,145,0.4)]'
                                    : 'text-white/70 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <User className="w-4 h-4" />
                            <span>Standard User</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('nutritionist')}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'nutritionist'
                                    ? 'bg-[#a5d391] text-black shadow-[0_0_20px_rgba(165,211,145,0.4)]'
                                    : 'text-white/70 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Stethoscope className="w-4 h-4" />
                            <span>Nutritionist / Nutritionist</span>
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
                            <div className="bg-gradient-to-br from-[#0d131f] to-[#080b12] border border-[#a5d391]/30 rounded-3xl p-8 sm:p-10 mb-12 shadow-[0_0_50px_rgba(165,211,145,0.1)] flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="space-y-4 max-w-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-[#a5d391]/20 border border-[#a5d391]/40 flex items-center justify-center text-[#a5d391]">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl sm:text-3xl font-bold font-hero-display text-white">Standard User Role</h2>
                                            <span className="text-xs font-bold text-[#a5d391] uppercase tracking-wider">For Individuals & Health Enthusiasts</span>
                                        </div>
                                    </div>
                                    <p className="text-white/70 leading-relaxed text-sm sm:text-base">
                                        As a standard user, NutriMunch AI acts as your personal digital nutritionist. Get instant access to AI-generated weekly diet plans, food photo calorie scanning, daily hydration logs, and 1-on-1 consultations with certified nutritionists.
                                    </p>
                                </div>
                                <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                    <Link
                                        to="/register"
                                        className="px-6 py-3.5 rounded-xl bg-[#a5d391] text-black font-bold text-sm hover:bg-[#8ec478] transition-all flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <span>Create Free Account</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/10 transition-all text-center"
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
                                            className="bg-[#0b1019] border border-white/10 hover:border-[#a5d391]/50 rounded-3xl p-6 flex flex-col justify-between transition-all group hover:-translate-y-1"
                                        >
                                            <div>
                                                <div className="w-12 h-12 rounded-2xl bg-[#a5d391]/10 border border-[#a5d391]/30 flex items-center justify-center text-[#a5d391] mb-5 group-hover:scale-110 transition-transform">
                                                    <IconComponent className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#a5d391] transition-colors">
                                                    {feat.title}
                                                </h3>
                                                <p className="text-white/60 text-sm leading-relaxed mb-6">
                                                    {feat.desc}
                                                </p>
                                            </div>
                                            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold text-[#a5d391]">
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
                            <div className="bg-gradient-to-br from-[#0d131f] to-[#080b12] border border-[#a5d391]/30 rounded-3xl p-8 sm:p-10 mb-12 shadow-[0_0_50px_rgba(165,211,145,0.1)] flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="space-y-4 max-w-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-[#a5d391]/20 border border-[#a5d391]/40 flex items-center justify-center text-[#a5d391]">
                                            <Stethoscope className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl sm:text-3xl font-bold font-hero-display text-white">Nutritionist & Nutritionist Role</h2>
                                            <span className="text-xs font-bold text-[#a5d391] uppercase tracking-wider">For Healthcare & Clinical Professionals</span>
                                        </div>
                                    </div>
                                    <p className="text-white/70 leading-relaxed text-sm sm:text-base">
                                        Designed specifically for certified nutritionists and nutritionists. Manage client rosters, prescribe customized weekly meal plans directly to patients, schedule virtual appointments, and generate white-labeled clinical PDF reports.
                                    </p>
                                </div>
                                <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                    <Link
                                        to="/register"
                                        className="px-6 py-3.5 rounded-xl bg-[#a5d391] text-black font-bold text-sm hover:bg-[#8ec478] transition-all flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <span>Apply as Nutritionist</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/10 transition-all text-center"
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
                                            className="bg-[#0b1019] border border-white/10 hover:border-[#a5d391]/50 rounded-3xl p-6 flex flex-col justify-between transition-all group hover:-translate-y-1"
                                        >
                                            <div>
                                                <div className="w-12 h-12 rounded-2xl bg-[#a5d391]/10 border border-[#a5d391]/30 flex items-center justify-center text-[#a5d391] mb-5 group-hover:scale-110 transition-transform">
                                                    <IconComponent className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#a5d391] transition-colors">
                                                    {feat.title}
                                                </h3>
                                                <p className="text-white/60 text-sm leading-relaxed mb-6">
                                                    {feat.desc}
                                                </p>
                                            </div>
                                            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold text-[#a5d391]">
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
                        <span className="text-xs font-bold text-[#a5d391] uppercase tracking-widest block mb-3">Side-by-Side Comparison</span>
                        <h2 className="text-3xl font-bold font-hero-display text-white mb-4">Complete Role Feature Matrix</h2>
                        <p className="text-white/60 text-sm">Compare capabilities and tools available to each account type across the platform.</p>
                    </div>

                    <div className="bg-[#0b1019] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/10 text-white text-xs uppercase tracking-wider font-bold">
                                        <th className="p-5">Platform Feature</th>
                                        <th className="p-5 text-center text-[#a5d391]">Standard User</th>
                                        <th className="p-5 text-center text-[#a5d391]">Nutritionist</th>
                                        <th className="p-5 text-center text-white/50">Admin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm text-white/80">
                                    {comparisonMatrix.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="p-5 font-semibold text-white">{row.feature}</td>
                                            <td className="p-5 text-center">
                                                {row.user ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#a5d391]/20 text-[#a5d391]">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/5 text-white/30">
                                                        <Lock className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-5 text-center">
                                                {row.nutritionist ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#a5d391]/20 text-[#a5d391]">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/5 text-white/30">
                                                        <Lock className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-5 text-center">
                                                {row.admin ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-white">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/5 text-white/30">
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
                <div className="mt-24 bg-gradient-to-r from-[#a5d391]/20 via-[#a5d391]/10 to-transparent border border-[#a5d391]/40 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_0_60px_rgba(165,211,145,0.15)]">
                    <div className="space-y-3 max-w-xl text-center md:text-left">
                        <h3 className="text-2xl sm:text-3xl font-bold font-hero-display text-white">Ready to Experience NutriMunch AI?</h3>
                        <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                            Sign up today as an individual user or apply to join our verified nutritionist network.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <Link
                            to="/register"
                            className="px-8 py-4 rounded-xl bg-[#a5d391] text-black font-bold text-sm hover:bg-[#8ec478] transition-all text-center shadow-lg hover:-translate-y-0.5"
                        >
                            Sign Up Free
                        </Link>
                        <Link
                            to="/login"
                            className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/10 transition-all text-center"
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
