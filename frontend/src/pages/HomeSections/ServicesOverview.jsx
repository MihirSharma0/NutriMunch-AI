import React, { useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

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
                    title: 'Client Roster',
                    desc: 'View assigned client profiles, health histories, daily logs, and dietary progress.',
                    icon: 'clinical_notes',
                    path: '/dashboard/nutritionist/clients'
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
                    title: 'Clinical Reports',
                    desc: 'Generate, export, and review patient health reports and nutritional adherence.',
                    icon: 'assessment',
                    path: '/dashboard/nutritionist/reports'
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
                },
                {
                    title: 'AI Nutrition Companion',
                    desc: 'Consult 24/7 AI tools for swift nutrient reference and dietary research.',
                    icon: 'smart_toy',
                    path: '/ai-chat'
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
                desc: 'Track weight trends, daily water intake targets, and Mifflin-St Jeor BMR metrics.',
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
                title: 'AI Nutrition Assistant',
                desc: '24/7 intelligent AI chatbot for dietary advice, meal ideas, and macro questions.',
                icon: 'smart_toy',
                path: '/ai-chat'
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
            title: 'Client Roster',
            desc: 'Access assigned client profiles, health logs, and dietary progress.',
            icon: 'groups',
            path: '/dashboard/nutritionist/clients'
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
            desc: 'Generate instant custom weekly meal plans based on your caloric target & budget.',
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
            desc: 'Track weight trends, daily water intake targets, and Mifflin-St Jeor BMR metrics.',
            icon: 'water_drop',
            path: '/progress'
        },
        {
            title: 'Appointments & Consultations',
            desc: 'Book one-on-one virtual consultations with certified nutritionists and nutritionists.',
            icon: 'support_agent',
            path: '/appointments'
        }
    ];

    const modalData = getModalServicesForRole(user);

    return (
        <section className="pt-4 sm:pt-6 pb-16 sm:pb-20 relative overflow-hidden z-20">
            <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 blur-[100px] rounded-full pointer-events-none -translate-y-1/2"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
                    <div className="max-w-2xl">
                        <span className="text-primary font-bold tracking-widest uppercase text-sm mb-4 block font-label-caps">Platform Services</span>
                        <h2 className="font-hero-display text-4xl md:text-5xl font-bold text-on-background mb-6">AI-Powered Health & Nutrition Services</h2>
                        <p className="text-on-background/70 text-lg leading-relaxed">
                            From personalized calorie tracking to automated AI diet generation, our smart tools are tailored to your unique lifestyle and fitness goals.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="text-on-background border border-outline-variant/50 hover:border-primary hover:text-primary px-8 py-4 rounded-full font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 group shadow-lg"
                    >
                        <span>View All Services</span>
                        <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">open_in_new</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {featuredServices.map((service, idx) => (
                        <div
                            key={idx}
                            onClick={() => navigate(service.path)}
                            className="bg-white shadow-xl shadow-black/5 border border-outline-variant/30 rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6 group hover:border-primary/50 transition-all cursor-pointer"
                        >
                            <div className="w-20 h-20 bg-surface rounded-2xl flex items-center justify-center shrink-0 border border-outline-variant/30 group-hover:scale-110 transition-transform duration-500">
                                <span className="material-symbols-outlined text-4xl text-on-background/70 group-hover:text-primary transition-colors">{service.icon}</span>
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-2xl font-bold text-on-background mb-3 group-hover:text-primary transition-colors">{service.title}</h3>
                                <p className="text-on-background/70 leading-relaxed">
                                    {service.desc}
                                </p>
                            </div>
                            <div className="ml-auto hidden md:block">
                                <span className="material-symbols-outlined text-on-background/30 text-3xl group-hover:text-primary transition-colors group-hover:translate-x-2 duration-300">arrow_forward</span>
                            </div>
                        </div>
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
                            className="fixed inset-0 z-[999999] flex flex-col items-center justify-start pt-24 pb-6 px-4 bg-[#080b12]/90 backdrop-blur-md overflow-hidden"
                            onClick={() => setShowModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="bg-[#0d121c] border border-[#a5d391]/40 rounded-3xl p-5 sm:p-6 max-w-xl w-full max-h-[calc(100vh-130px)] flex flex-col shadow-[0_0_60px_rgba(165,211,145,0.2)] relative text-white overflow-hidden my-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header Section */}
                                <div className="shrink-0 flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#a5d391] shadow-[0_0_8px_rgba(165,211,145,0.8)]"></span>
                                        <h2 className="text-base sm:text-lg font-bold font-hero-display text-white">
                                            {modalData.modalTitle}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#a5d391]/10 text-[#a5d391] border border-[#a5d391]/30">
                                            {modalData.modalBadge}
                                        </span>
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Services Grid (Compact Scrollable Body) */}
                                <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#a5d391]/40 [&::-webkit-scrollbar-thumb]:rounded-full">
                                    {modalData.items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setShowModal(false);
                                                navigate(item.path);
                                            }}
                                            className="bg-[#090d16] border border-white/10 rounded-xl p-3 hover:border-[#a5d391]/60 hover:bg-[#101726] transition-all cursor-pointer group flex flex-col justify-between"
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-[#a5d391]/10 border border-[#a5d391]/20 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="material-symbols-outlined text-[#a5d391] text-base">{item.icon}</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-white group-hover:text-[#a5d391] transition-colors leading-tight">{item.title}</h3>
                                                    <p className="text-[11px] text-white/50 leading-snug mt-0.5 line-clamp-2">{item.desc}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end gap-1 mt-2 pt-1.5 border-t border-white/5 text-[10px] font-bold text-[#a5d391] uppercase tracking-wider">
                                                <span>Launch</span>
                                                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer Section */}
                                <div className="shrink-0 mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                                    <span>Click any tool to navigate directly.</span>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
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
