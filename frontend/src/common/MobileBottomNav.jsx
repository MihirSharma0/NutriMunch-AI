/**
 * Mobile Bottom Navigation Bar Component
 * Provides a sleek floating pill bottom navigation dock for mobile devices with primary feature icons,
 * touch-friendly subfeature overlays, and role-specific navigation items.
 * Inspired by modern mobile streaming and native apps.
 * Only visible on screens smaller than the lg breakpoint (1024px).
 */
import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/**
 * Extracts up to 2 uppercase initials from a display name string.
 *
 * @param {string} name - User's full name or username
 * @returns {string} 1-2 character uppercase initials
 */
const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Builds the bottom navigation items based on the user's role.
 * Each item can have an icon, label, path, and optional subMenu for expandable overlays.
 *
 * @param {Object|null} user - Authenticated user object
 * @returns {Array<Object>} Bottom nav items with icons, labels, paths, and optional submenus
 */
const getBottomNavItems = (user) => {
    if (!user) {
        return [
            { label: 'Home', path: '/', icon: 'home' },
            {
                label: 'Features',
                icon: 'auto_awesome',
                subMenu: [
                    { label: 'AI Diet Generator', path: '/ai-diet', icon: 'magic_button', desc: 'Generate macro-balanced meal plans' },
                    { label: 'AI Food Analyzer', path: '/ai-image', icon: 'center_focus_strong', desc: 'Scan food photos for nutrition' },
                    { label: 'Progress Tracking', path: '/progress', icon: 'monitoring', desc: 'Hydration & weight targets' },
                    { label: 'Diet Plans', path: '/diet-plans', icon: 'restaurant_menu', desc: 'Weekly meal plan library' },
                    { label: 'Consultations', path: '/appointments', icon: 'calendar_month', desc: 'Nutritionist sessions' },
                    { label: 'Health Reports', path: '/reports', icon: 'lab_profile', desc: 'Biometrics & progress' },
                ]
            },
            { label: 'Roles', path: '/user-roles', icon: 'groups' },
            { label: 'Reviews', path: '/testimonials', icon: 'rate_review' },
            { label: 'Profile', path: '/login', icon: 'person', isProfile: true },
        ];
    }

    const rawRole = user.role ? String(user.role).toUpperCase().replace('ROLE_', '') : 'USER';

    if (rawRole === 'ADMIN') {
        const profilePath = '/dashboard/admin/profile';
        return [
            { label: 'Home', path: '/', icon: 'home' },
            {
                label: 'System',
                icon: 'admin_panel_settings',
                subMenu: [
                    { label: 'System Core', path: '/dashboard/admin', icon: 'dashboard', desc: 'Controls & live telemetry' },
                    { label: 'Diet Plans', path: '/dashboard/admin/diet-plans', icon: 'menu_book', desc: 'Diet plans registry' },
                    { label: 'Payments', path: '/dashboard/admin/payments', icon: 'payments', desc: 'Wallet & audit ledger' },
                    { label: 'Refunds', path: '/dashboard/admin/appointment-refunds', icon: 'currency_exchange', desc: 'Appointment refunds' },
                    { label: 'SQL Console', path: '/dashboard/admin/sql', icon: 'terminal', desc: 'Database query console' },
                ]
            },
            {
                label: 'Users',
                icon: 'manage_accounts',
                subMenu: [
                    { label: 'User Directory', path: '/dashboard/admin/users', icon: 'manage_accounts', desc: 'Search users & roles' },
                    { label: 'Nutritionist Verification', path: '/dashboard/admin/nutritionists', icon: 'badge', desc: 'Approve or suspend' },
                    { label: 'Testimonials', path: '/dashboard/admin/testimonials', icon: 'rate_review', desc: 'Manage testimonials' },
                ]
            },
            {
                label: 'AI Suite',
                icon: 'auto_awesome',
                subMenu: [
                    { label: 'AI Diet Generator', path: '/ai-diet', icon: 'magic_button', desc: 'Generate meal plans' },
                    { label: 'AI Food Analyzer', path: '/ai-image', icon: 'center_focus_strong', desc: 'Scan food photos' },
                ]
            },
            { label: 'Profile', path: profilePath, icon: 'person', isProfile: true },
        ];
    }

    if (rawRole === 'NUTRITIONIST') {
        const profilePath = '/dashboard/nutritionist/profile';
        return [
            { label: 'Home', path: '/', icon: 'home' },
            {
                label: 'Platform',
                icon: 'auto_awesome',
                subMenu: [
                    { label: 'Command Core', path: '/dashboard/nutritionist', icon: 'dashboard', desc: 'Patient monitoring' },
                    { label: 'AI Diet Generator', path: '/ai-diet', icon: 'magic_button', desc: 'Generate meal plans' },
                    { label: 'AI Food Analyzer', path: '/ai-image', icon: 'center_focus_strong', desc: 'Scan food photos' },
                ]
            },
            {
                label: 'Consult',
                icon: 'medical_services',
                subMenu: [
                    { label: 'Schedule', path: '/dashboard/nutritionist/schedule', icon: 'calendar_month', desc: 'Calendar & slots' },
                    { label: 'History', path: '/dashboard/nutritionist/schedule#consultation-history', icon: 'history', desc: 'Past sessions' },
                ]
            },
            { label: 'Builder', path: '/dashboard/nutritionist/builder', icon: 'restaurant_menu' },
            { label: 'Profile', path: profilePath, icon: 'person', isProfile: true },
        ];
    }

    // Standard USER
    const profilePath = '/profile';
    return [
        { label: 'Home', path: '/', icon: 'home' },
        {
            label: 'AI Suite',
            icon: 'auto_awesome',
            subMenu: [
                { label: 'AI Diet Generator', path: '/ai-diet', icon: 'magic_button', desc: 'Generate meal plans' },
                { label: 'AI Food Analyzer', path: '/ai-image', icon: 'center_focus_strong', desc: 'Scan food photos' },
            ]
        },
        {
            label: 'Dietary',
            icon: 'restaurant_menu',
            subMenu: [
                { label: 'Progress Tracking', path: '/progress', icon: 'monitoring', desc: 'Hydration & weight' },
                { label: 'Diet Plans', path: '/diet-plans', icon: 'restaurant_menu', desc: 'Meal plan library' },
                { label: 'Health Reports', path: '/reports', icon: 'lab_profile', desc: 'Biometrics & progress' },
            ]
        },
        {
            label: 'Consult',
            icon: 'medical_services',
            subMenu: [
                { label: 'Appointments', path: '/appointments', icon: 'calendar_month', desc: 'Book sessions' },
                { label: 'History', path: '/appointments#consultation-history', icon: 'history', desc: 'Past consultations' },
                { label: 'Transactions', path: '/transactions', icon: 'receipt_long', desc: 'Payments & wallet' },
            ]
        },
        { label: 'Profile', path: profilePath, icon: 'person', isProfile: true },
    ];
};

/**
 * Checks whether a bottom nav item or any of its submenu items match the current route.
 */
const isItemActive = (pathname, item) => {
    if (item.path) {
        if (pathname === item.path) return true;
        if (item.path !== '/' && pathname.startsWith(item.path + '/')) return true;
    }
    if (item.subMenu) {
        return item.subMenu.some(sub => {
            if (pathname === sub.path) return true;
            if (sub.path && sub.path !== '/' && pathname.startsWith(sub.path + '/')) return true;
            return false;
        });
    }
    return false;
};

/**
 * MobileBottomNav Component
 * Renders a floating pill bottom navigation dock visible only on mobile/tablet screens (<1024px).
 * Features touch-friendly subfeature overlay panels that slide up above the pill when tapped.
 */
const MobileBottomNav = () => {
    const { user } = useContext(AuthContext);
    const { isDark } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [activeOverlay, setActiveOverlay] = useState(null);
    const overlayRef = useRef(null);
    const navRef = useRef(null);

    const navItems = getBottomNavItems(user);

    const displayName = user?.name || user?.fullName || user?.username || (user?.email ? user.email.split('@')[0] : 'User');
    const userInitials = getInitials(displayName);

    // Close overlay on route change
    useEffect(() => {
        setActiveOverlay(null);
    }, [location.pathname]);

    // Close overlay on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                overlayRef.current && !overlayRef.current.contains(event.target) &&
                navRef.current && !navRef.current.contains(event.target)
            ) {
                setActiveOverlay(null);
            }
        };
        if (activeOverlay !== null) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeOverlay]);

    // Close overlay on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') setActiveOverlay(null);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    // Automatically hide bottom navigation when any full-screen modal or dialog is open
    const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
    useEffect(() => {
        const checkModal = () => {
            if (typeof document === 'undefined') return;
            const hasBodyOverflow = document.body.style.overflow === 'hidden' || document.body.hasAttribute('data-modal-open');
            const hasModalElement = !!document.querySelector(
                '[role="dialog"], [aria-modal="true"], [data-modal="true"]'
            );
            setIsAnyModalOpen(hasBodyOverflow || hasModalElement);
        };

        checkModal();

        const observer = new MutationObserver(checkModal);
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['style', 'class', 'data-modal-open'],
            childList: true,
            subtree: true,
        });

        window.addEventListener('popstate', checkModal);

        return () => {
            observer.disconnect();
            window.removeEventListener('popstate', checkModal);
        };
    }, []);

    const handleNavItemClick = (item, index) => {
        if (item.subMenu) {
            setActiveOverlay(prev => prev === index ? null : index);
        } else if (item.path) {
            setActiveOverlay(null);
            navigate(item.path);
        }
    };

    // Don't render on consultation chat page or when any modal/dialog is open
    if (location.pathname === '/consultation-chat' || isAnyModalOpen) return null;

    return (
        <>
            {/* Subfeature Slide-Up Sheet Overlay */}
            {activeOverlay !== null && navItems[activeOverlay]?.subMenu && (
                <>
                    {/* Dark frosted backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] lg:hidden transition-opacity duration-200"
                        onClick={() => setActiveOverlay(null)}
                    />
                    {/* Overlay Sheet anchored above the floating bottom pill */}
                    <div
                        ref={overlayRef}
                        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.2rem)] left-3 right-3 max-w-md mx-auto z-[80] lg:hidden transition-all duration-200"
                    >
                        <div className={`backdrop-blur-2xl border rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden transition-colors ${
                            isDark 
                                ? 'bg-[#0b1017]/95 border-white/15 ring-1 ring-[#a5d391]/20' 
                                : 'bg-white/95 border-slate-200 ring-1 ring-emerald-500/20 text-slate-800'
                        }`}>
                            {/* Overlay Header */}
                            <div className={`flex items-center justify-between px-4 py-3.5 border-b ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/50'}`}>
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                        isDark 
                                            ? 'bg-[#a5d391]/15 border border-[#a5d391]/30 text-[#a5d391]' 
                                            : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                    }`}>
                                        <span className="material-symbols-outlined text-base">
                                            {navItems[activeOverlay].icon}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className={`text-sm font-bold tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {navItems[activeOverlay].label}
                                        </h3>
                                        <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Select a feature to navigate</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveOverlay(null)}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                        isDark 
                                            ? 'bg-white/10 hover:bg-white/20 text-white/60 hover:text-white' 
                                            : 'bg-slate-200/80 hover:bg-slate-300 text-slate-600 hover:text-slate-900'
                                    }`}
                                    aria-label="Close submenu"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>

                            {/* Subfeature Items */}
                            <div className="p-2 space-y-1.5 max-h-[55vh] overflow-y-auto">
                                {navItems[activeOverlay].subMenu.map(sub => {
                                    const isSubActive = location.pathname === sub.path ||
                                        (sub.path && sub.path !== '/' && location.pathname.startsWith(sub.path + '/'));
                                    return (
                                        <Link
                                            key={sub.label}
                                            to={sub.path}
                                            onClick={() => setActiveOverlay(null)}
                                            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all active:scale-[0.98] ${
                                                isSubActive
                                                    ? 'bg-[#a5d391]/15 border border-[#a5d391]/40 shadow-sm'
                                                    : 'hover:bg-white/5 active:bg-white/10 border border-transparent'
                                            }`}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                                                isSubActive
                                                    ? 'bg-[#a5d391] text-black shadow-[0_0_12px_rgba(165,211,145,0.6)]'
                                                    : 'bg-white/5 text-[#a5d391] border border-white/10'
                                            }`}>
                                                <span className="material-symbols-outlined text-lg">{sub.icon}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className={`text-xs font-bold ${isSubActive ? 'text-[#a5d391]' : 'text-white'}`}>
                                                    {sub.label}
                                                </div>
                                                {sub.desc && (
                                                    <div className="text-[10px] text-white/50 mt-0.5 truncate">{sub.desc}</div>
                                                )}
                                            </div>
                                            <span className={`material-symbols-outlined text-sm shrink-0 transition-transform ${
                                                isSubActive ? 'text-[#a5d391] translate-x-0.5' : 'text-white/25'
                                            }`}>
                                                chevron_right
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Floating Pill Bottom Navigation Dock (Reference Image 2) */}
            <nav
                ref={navRef}
                className={`fixed bottom-3 sm:bottom-4 left-3 right-3 max-w-md mx-auto ${activeOverlay !== null ? 'z-[80]' : 'z-[60]'} lg:hidden select-none pointer-events-auto`}
                role="navigation"
                aria-label="Mobile bottom navigation"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                <div className={`backdrop-blur-2xl border rounded-full px-2 py-1.5 transition-colors ${
                    isDark
                        ? 'bg-[#0b1017]/90 border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.7)] ring-1 ring-white/5'
                        : 'bg-white/90 border-slate-200/90 shadow-[0_12px_40px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/40 text-slate-800'
                }`}>
                    <div className="flex items-center justify-around">
                        {navItems.map((item, index) => {
                            const active = isItemActive(location.pathname, item);
                            const hasSubmenu = !!item.subMenu;
                            const isOverlayOpen = activeOverlay === index;
                            const isSelected = active || isOverlayOpen;

                            return (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={() => handleNavItemClick(item, index)}
                                    className={`
                                        relative flex flex-col items-center justify-center min-w-0 flex-1 py-1 px-1 rounded-2xl
                                        transition-all duration-200 cursor-pointer group active:scale-95
                                    `}
                                    aria-label={item.label}
                                    aria-expanded={hasSubmenu ? isOverlayOpen : undefined}
                                >
                                    {/* Icon Squircle Highlight Box (Inspired by Reference Image 2) */}
                                    <div className={`
                                        relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200
                                        ${isSelected
                                            ? (isDark
                                                ? 'bg-white/15 text-[#a5d391] shadow-inner border border-white/20'
                                                : 'bg-white text-emerald-700 shadow-sm border border-slate-300')
                                            : (isDark
                                                ? 'text-white/50 hover:text-white/90 group-hover:bg-white/5'
                                                : 'text-slate-600 hover:text-slate-900 group-hover:bg-slate-100')
                                        }
                                    `}>
                                        {/* Profile Avatar / Initials vs Standard Icon */}
                                        {item.isProfile && user ? (
                                            <div className="w-6 h-6 rounded-full bg-[#a5d391] text-black font-black text-[10px] flex items-center justify-center border border-white/20 overflow-hidden shadow-sm">
                                                {user?.avatar && !user.avatar.includes('ui-avatars.com') ? (
                                                    <img
                                                        src={user.avatar}
                                                        alt={displayName}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <span>{userInitials}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span
                                                className={`material-symbols-outlined text-xl leading-none transition-transform duration-200 ${
                                                    isSelected ? 'scale-110' : ''
                                                }`}
                                                style={isSelected ? { fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" } : {}}
                                            >
                                                {item.icon}
                                            </span>
                                        )}

                                        {/* Submenu indicator dot on top right */}
                                        {hasSubmenu && (
                                            <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full transition-colors ${
                                                isOverlayOpen
                                                    ? 'bg-[#a5d391] shadow-[0_0_6px_rgba(165,211,145,0.9)]'
                                                    : (isDark ? 'bg-white/30' : 'bg-slate-300')
                                            }`} />
                                        )}
                                    </div>

                                    {/* Item Label */}
                                    <span className={`text-[10px] font-bold leading-tight mt-0.5 truncate max-w-full tracking-tight transition-colors ${
                                        isSelected
                                            ? (isDark ? 'text-[#a5d391]' : 'text-emerald-700')
                                            : (isDark ? 'text-white/45' : 'text-slate-600')
                                    }`}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </>
    );
};

export default MobileBottomNav;
