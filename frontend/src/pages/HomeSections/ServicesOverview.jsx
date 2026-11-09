/**
 * Services Overview Section
 * Interactive catalog showcasing AI-driven nutritional capabilities, clinical features, and modal dialogs.
 */
import React, { useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

/**
 * Resolves modal service offerings based on the current user's role.
 * 
 * @param {Object|null} user - Current user object
 * @returns {Array<Object>} List of feature service descriptions
 */
const getModalServicesForRole = (user) => {
    const rawRole = user?.role ? String(user.role).toUpperCase().replace('ROLE_', '') : 'GUEST';

    if (rawRole === 'ADMIN') {
        return {
            modalTitle: 'Admin Management & Platform Tools',
            modalBadge: 'Admin Tools',
            items: [
                {
                    title: 'Admin Overview',
                    desc: 'System dashboard with platform metrics, user counts, and quick management stats.',
                    icon: 'admin_panel_settings',
                    path: '/dashboard/admin'
                },
                {
                    title: 'User Management',
                    desc: 'Manage user accounts, change roles, assign access, and view user logs.',
                    icon: 'group',
                    path: '/dashboard/admin/users'
                },
                {
                    title: 'Nutritionist Management',
                    desc: 'Review and verify nutritionist credentials, profiles, and consultation status.',
                    icon: 'medical_services',
                    path: '/dashboard/admin/nutritionists'
                },
                {
                    title: 'Platform Analytics',
                    desc: 'View comprehensive platform growth, active sessions, and AI request metrics.',
                    icon: 'analytics',
                    path: '/dashboard/admin/analytics'
                },
                {
                    title: 'SQL Console',
                    desc: 'Run raw database queries, audit tables, and inspect system database records.',
                    icon: 'terminal',
                    path: '/dashboard/admin/sql'
                },
                {
                    title: 'Admin Profile',
                    desc: 'Manage administrative credentials, security settings, and audit preferences.',
                    icon: 'manage_accounts',
                    path: '/dashboard/admin/profile'
                },
                {
                    title: 'AI Diet Generator',
                    desc: 'Inspect and test automated AI weekly meal plan generation tools.',
                    icon: 'restaurant_menu',
                    path: '/ai-diet'
                },
                {
                    title: 'AI Food Analyzer',
                    desc: 'Test computer vision food photo analysis and nutrient extraction tools.',
                    icon: 'center_focus_strong',
                    path: '/ai-image'
                }
            ]
        };
    }

    if (rawRole === 'NUTRITIONIST') {
        return {
            modalTitle: 'Nutritionist Workspace & Clinical Tools',
            modalBadge: 'Nutritionist Tools',
            items: [
                {
                    title: 'Overview Console',
                    desc: 'Dashboard for active patient requests, pending appointments, and daily tasks.',
                    icon: 'dashboard',
                    path: '/dashboard/nutritionist'
                },
                {
                    title: 'Custom Diet Builder',
                    desc: 'Craft and prescribe personalized macro & micro nutrient meal regimens.',
                    icon: 'menu_book',
                    path: '/dashboard/nutritionist/builder'
                },
                {
                    title: 'Appointment Schedule',
                    desc: 'Organize virtual patient consultations, availability, and video bookings.',
                    icon: 'calendar_month',
                    path: '/dashboard/nutritionist/schedule'
                },
                {
                    title: 'Nutritionist Profile',
                    desc: 'Manage your clinical bio, consultation fee, specializations, and schedule.',
                    icon: 'badge',
                    path: '/dashboard/nutritionist/profile'
                },
                {
                    title: 'AI Food Analyzer',
                    desc: 'Quickly scan ingredient photos for clinical nutritional breakdowns.',
                    icon: 'center_focus_strong',
                    path: '/ai-image'
                }
            ]
        };
    }

    // Default / Logged-in USER or GUEST
    return {
        modalTitle: 'All Platform Services & AI Suite',
        modalBadge: 'User Services',
        items: [
            {
                title: 'AI Diet Generator',
                desc: 'Generate custom weekly meal plans customized to your caloric goals & budget.',
                icon: 'restaurant_menu',
                path: '/ai-diet'
            },
            {
                title: 'AI Food Analyzer',
                desc: 'Scan food photos for instant calories, macros, and ingredient breakdowns.',
                icon: 'center_focus_strong',
                path: '/ai-image'
            },
            {
                title: 'Progress & Water Tracking',
                desc: 'Log daily water and meals, track weight changes, and compare your hydration and nutrition intake with your targets.',
                icon: 'water_drop',
                path: '/progress'
            },
            {
                title: 'Expert Consultations',
                desc: 'Book one-on-one virtual consultations with certified nutritionists and nutritionists.',
                icon: 'support_agent',
                path: '/appointments'
            },
            {
                title: 'Diet Plans Library',
                desc: 'Browse, create, and manage active personal meal regimens and recipes.',
                icon: 'menu_book',
                path: '/diet-plans'
            },
            {
                title: 'User Profile & Preferences',
                desc: 'Manage biometrics, macro targets, allergen filters, and health objectives.',
                icon: 'person',
                path: '/profile'
            },
            {
                title: 'Health Reports Exporter',
                desc: 'Download comprehensive PDF reports detailing your weekly progress and targets.',
                icon: 'summarize',
                path: '/reports'
            }
        ]
    };
};

/**
 * ServicesOverview Component
 * Grid of platform service cards with interactive feature detail modals.
 */
const ServicesOverview = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [showModal, setShowModal] = useState(false);

    const rawRole = user?.role ? String(user.role).toUpperCase().replace('ROLE_', '') : 'GUEST';
    const featuredServices = rawRole === 'ADMIN'
        ? [
        {
            title: 'Admin Dashboard',
            desc: 'Review platform activity, user access, diet plans, payments, and operational controls.',
            icon: 'admin_panel_settings',
            path: '/dashboard/admin'
        },
        {
            title: 'Diet Plan Management',
            desc: 'Audit every stored nutrition plan, including plans generated by AI and nutritionists.',
            icon: 'menu_book',
            path: '/dashboard/admin/diet-plans'
        },
        {
            title: 'User & Nutritionist Management',
            desc: 'Manage accounts, roles, verification, and nutritionist access across the platform.',
            icon: 'manage_accounts',
            path: '/dashboard/admin/users'
        },
        {
            title: 'Payment Operations',
            desc: 'Review wallet allocations, credits, and transaction records from the administration console.',
            icon: 'payments',
            path: '/dashboard/admin/payments'
        }
    ]
        : rawRole === 'NUTRITIONIST'
            ? [
        {
            title: 'Clinical Dashboard',
            desc: 'Review your live patient workload, consultations, and clinical tasks.',
            icon: 'clinical_notes',
            path: '/dashboard/nutritionist'
        },
        {
            title: 'Diet Plan Builder',
            desc: 'Create structured nutritionist-formulated protocols with targets and meal schedules.',
            icon: 'menu_book',
            path: '/dashboard/nutritionist/builder'
        },
        {
            title: 'Consultation Schedule',
            desc: 'Manage upcoming appointments, availability, and virtual consultations.',
            icon: 'calendar_month',
            path: '/dashboard/nutritionist/schedule'
        }
    ]
            : [
        {
            title: 'AI Diet Generator',
            desc: 'Create a personalized daily meal plan based on your nutrition goals and dietary preferences.',
            icon: 'restaurant_menu',
            path: '/ai-diet'
        },
        {
            title: 'AI Food Analyzer',
            desc: 'Scan food photos for instant calories, macros, and ingredient breakdown.',
            icon: 'center_focus_strong',
            path: '/ai-image'
        },
        {
            title: 'Progress & Water Tracking',
            desc: 'Log daily water and meals, track weight changes, and compare your hydration and nutrition intake with your targets.',
            icon: 'water_drop',
            path: '/progress'
        },
        {
            title: 'Appointments & Consultations',
            desc: 'Browse nutritionists, request appointments, and manage your consultations.',
            icon: 'support_agent',
            path: '/appointments'
        }
    ];

    const modalData = getModalServicesForRole(user);

    return (
        <section className="services-overview relative z-20 overflow-hidden py-16 sm:py-20">
            <div className="absolute -left-40 top-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-[100px] pointer-events-none dark:bg-[#a5d391]/10"></div>
            <div className="absolute -right-36 bottom-0 h-80 w-80 rounded-full bg-sky-400/10 blur-[100px] pointer-events-none dark:bg-sky-500/10"></div>

            <div className="relative mx-auto max-w-7xl px-4 sm:px-8">
                <div className="mb-10 flex flex-col gap-6 sm:mb-12 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-700/15 bg-emerald-700/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800 dark:border-[#a5d391]/20 dark:bg-[#a5d391]/10 dark:text-[#a5d391]">
                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                            Platform Services
                        </span>
                        <h2 className="font-hero-display text-3xl font-bold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
                            AI-Powered Health & Nutrition Services
                        </h2>
                        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-white/65 sm:text-lg">
                            Practical tools to plan meals, understand food, and keep track of your health progress.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="group inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-600 hover:text-emerald-800 hover:shadow-md dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-[#a5d391]/60 dark:hover:text-[#a5d391]"
                    >
                        <span>Explore all services</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {featuredServices.map((service, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => navigate(service.path)}
                            className="group relative flex min-h-[245px] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-[0_12px_30px_-22px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-[0_22px_42px_-26px_rgba(16,120,75,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-[#0d121c] dark:shadow-[0_16px_40px_-28px_rgba(0,0,0,0.85)] dark:hover:border-[#a5d391]/40 dark:hover:shadow-[0_22px_45px_-24px_rgba(165,211,145,0.16)] dark:focus-visible:ring-[#a5d391] dark:focus-visible:ring-offset-[#080b12]"
                        >
                            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl transition-colors group-hover:bg-emerald-500/10 dark:bg-[#a5d391]/5 dark:group-hover:bg-[#a5d391]/10"></div>
                            <div className="relative mb-8 flex w-full items-start justify-between">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-700/10 bg-gradient-to-br from-emerald-50 to-sky-50 text-emerald-800 transition-transform duration-300 group-hover:scale-105 dark:border-[#a5d391]/20 dark:from-[#a5d391]/15 dark:to-sky-400/10 dark:text-[#a5d391]">
                                    <span className="material-symbols-outlined text-[30px]">{service.icon}</span>
                                </div>
                                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-all group-hover:border-emerald-700 group-hover:bg-emerald-700 group-hover:text-white dark:border-white/10 dark:bg-white/5 dark:text-white/55 dark:group-hover:border-[#a5d391] dark:group-hover:bg-[#a5d391] dark:group-hover:text-[#080b12]">
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:-rotate-45" />
                                </span>
                            </div>
                            <div className="relative mt-auto">
                                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800/65 dark:text-[#a5d391]/60">
                                    {String(idx + 1).padStart(2, '0')} / Service
                                </span>
                                <h3 className="text-xl font-bold leading-snug text-slate-950 transition-colors group-hover:text-emerald-800 dark:text-white dark:group-hover:text-[#a5d391]">
                                    {service.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/60">
                                    {service.desc}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Portal Modal Overlay for All Services - Renders directly in document.body to guarantee frontmost stacking */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[999999] flex flex-col items-center justify-start pt-24 pb-6 px-4 bg-slate-900/60 dark:bg-[#080b12]/90 backdrop-blur-md overflow-hidden"
                            onClick={() => setShowModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-[#a5d391]/40 rounded-3xl p-5 sm:p-6 max-w-xl w-full max-h-[calc(100vh-130px)] flex flex-col shadow-2xl dark:shadow-[0_0_60px_rgba(165,211,145,0.2)] relative text-slate-900 dark:text-white overflow-hidden my-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header Section */}
                                <div className="shrink-0 flex items-center justify-between mb-3 pb-3 border-b border-slate-200 dark:border-white/10">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-[#a5d391] shadow-sm dark:shadow-[0_0_8px_rgba(165,211,145,0.8)]"></span>
                                        <h2 className="text-base sm:text-lg font-bold font-hero-display text-slate-900 dark:text-white">
                                            {modalData.modalTitle}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#a5d391]/10 dark:text-[#a5d391] dark:border-[#a5d391]/30">
                                            {modalData.modalBadge}
                                        </span>
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/70 dark:hover:text-white transition-colors cursor-pointer"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Services Grid (Compact Scrollable Body) */}
                                <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-emerald-600/40 dark:[&::-webkit-scrollbar-thumb]:bg-[#a5d391]/40 [&::-webkit-scrollbar-thumb]:rounded-full">
                                    {modalData.items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setShowModal(false);
                                                navigate(item.path);
                                            }}
                                            className="bg-slate-50 border border-slate-200 hover:border-emerald-600/60 hover:bg-slate-100 dark:bg-[#090d16] dark:border-white/10 dark:hover:border-[#a5d391]/60 dark:hover:bg-[#101726] rounded-xl p-3 transition-all cursor-pointer group flex flex-col justify-between shadow-sm"
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#a5d391]/10 dark:border-[#a5d391]/20 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="material-symbols-outlined text-emerald-700 dark:text-[#a5d391] text-base">{item.icon}</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-[#a5d391] transition-colors leading-tight">{item.title}</h3>
                                                    <p className="text-[11px] text-slate-600 dark:text-white/50 leading-snug mt-0.5 line-clamp-2">{item.desc}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end gap-1 mt-2 pt-1.5 border-t border-slate-200 dark:border-white/5 text-[10px] font-bold text-emerald-700 dark:text-[#a5d391] uppercase tracking-wider">
                                                <span>Launch</span>
                                                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer Section */}
                                <div className="shrink-0 mt-3 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-600 dark:text-white/50">
                                    <span>Click any tool to navigate directly.</span>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-slate-200 dark:border-transparent"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </section>
    );
};

export default ServicesOverview;
