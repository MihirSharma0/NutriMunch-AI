/**
 * Feature Gate Component
 * Displays an access card and sign-in prompt when a guest attempts to access authenticated features.
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Starfield from './Starfield';

/** Feature metadata descriptions mapped by route path for guest previews. */
const FEATURE_DESCRIPTIONS = {
    '/progress': {
        title: 'Smart Hydration & Progress Tracking',
        icon: 'monitoring',
        category: 'Biometric Analytics',
        desc: 'Log daily fluid intake, monitor real-time circular water hydration rings, calibrate body weight targets, and store historical biometric progress over time.'
    },
    '/diet-plans': {
        title: 'Personal Diet Plans Library',
        icon: 'restaurant_menu',
        category: 'Clinical Meal Regimens',
        desc: 'Access your active 7-day meal plans, view daily breakfast/lunch/snack/dinner recipes, inspect macro ratios, and follow personalized diet regimens.'
    },
    '/appointments': {
        title: 'Consultations & Bookings',
        icon: 'calendar_month',
        category: 'Clinical Telehealth',
        desc: 'Browse certified platform nutritionists and nutritionists, view available consultation slots, schedule virtual appointments, and receive prescription meal plans.'
    },
    '/reports': {
        title: 'Health Reports & Biometric Exporter',
        icon: 'lab_profile',
        category: 'Clinical Documentation',
        desc: 'Export comprehensive health summaries, nutrient compliance trends, BMR/TDEE calculations, and printable doctor-ready PDF reports.'
    },
    '/profile': {
        title: 'User Profile & Biometrics Engine',
        icon: 'person',
        category: 'Account & Biometrics',
        desc: 'Manage your age, height, weight, activity multiplier, dietary restrictions, allergen filters, and custom water intake goals.'
    },
    '/dashboard/nutritionist': {
        title: 'Certified Nutritionist Clinical Console',
        icon: 'badge',
        category: 'Clinical Practice Suite',
        desc: 'Manage assigned patient rosters, construct custom prescription diet plans, accept consultation requests, and monitor client biometrics.'
    },
    '/dashboard/admin': {
        title: 'Platform System Core & Administration',
        icon: 'admin_panel_settings',
        category: 'System Control',
        desc: 'Access system analytics, manage user accounts, verify nutritionist licenses, execute SQL queries, and moderate platform testimonials.'
    }
};

/**
 * FeatureGate Component
 * Interstitial component encouraging guests to register or log in to unlock feature functionality.
 * 
 * @param {Object} props - Optional override props for title, description, and icon
 */
const FeatureGate = ({ titleOverride, descOverride, iconOverride }) => {
    const location = useLocation();
    const currentPath = location.pathname;

    const matchedConfig = FEATURE_DESCRIPTIONS[currentPath] || {
        title: titleOverride || 'Protected Platform Feature',
        icon: iconOverride || 'lock',
        category: 'Member Access Required',
        desc: descOverride || 'This advanced feature uses biometric algorithms to analyze data and provide personalized dynamic diet recommendations.'
    };

    return (
        <div className="min-h-[80vh] pt-32 pb-24 flex items-center justify-center relative overflow-hidden px-4 sm:px-8">
            <Starfield />

            {/* Ambient Lighting Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#a5d391]/10 blur-[150px] rounded-full pointer-events-none z-0"></div>

            <div className="max-w-2xl w-full bg-[#080b12]/90 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 sm:p-12 text-center relative z-10 shadow-2xl space-y-8 animate-fadeIn">

                {/* Feature Icon Badge */}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[#a5d391]/20 to-[#38bdf8]/10 border border-[#a5d391]/30 shadow-[0_0_30px_rgba(165,211,145,0.2)]">
                    <span className="material-symbols-outlined text-4xl text-[#a5d391]">{matchedConfig.icon}</span>
                </div>

                {/* Category Pill */}
                <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#a5d391] text-xs font-bold uppercase tracking-widest mb-3">
                        <span className="w-2 h-2 rounded-full bg-[#a5d391] animate-pulse"></span>
                        {matchedConfig.category}
                    </div>
                    <h1 className="font-hero-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
                        {matchedConfig.title}
                    </h1>
                </div>

                {/* Feature Description Box */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-[#a5d391]">info</span>
                        About This Feature
                    </div>
                    <p className="text-white/80 text-sm leading-relaxed font-medium">
                        {matchedConfig.desc}
                    </p>
                </div>

                {/* Explicit Required Notice Box */}
                <div className="bg-[#a5d391]/10 border border-[#a5d391]/30 rounded-2xl p-6 space-y-2">
                    <div className="flex items-center justify-center gap-2 text-[#a5d391] font-bold text-base sm:text-lg">
                        <span className="material-symbols-outlined text-xl">lock</span>
                        Authentication Required
                    </div>
                    <p className="text-white text-sm sm:text-base font-semibold">
                        To use this feature, please login to our platform.
                    </p>
                </div>

                {/* Action CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                    <Link
                        to="/login"
                        className="w-full sm:w-auto bg-[#a5d391] text-[#080b12] font-bold px-8 py-3.5 rounded-2xl hover:bg-white transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] hover:scale-105 text-sm flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">login</span>
                        Login to Platform
                    </Link>
                    <Link
                        to="/register"
                        className="w-full sm:w-auto bg-white/10 text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-white/20 border border-white/15 transition-all text-sm flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        Create Free Account
                    </Link>
                </div>

                <div className="text-xs text-white/40 font-medium">
                    Guest access available for <Link to="/ai-diet" className="text-[#a5d391] hover:underline">AI Diet Planner</Link> and <Link to="/ai-image" className="text-[#a5d391] hover:underline">AI Food Scanner</Link>.
                </div>
            </div>
        </div>
    );
};

export default FeatureGate;
