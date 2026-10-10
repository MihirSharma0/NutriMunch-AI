import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const getNavItemsForRole = (user) => {
    const aiSubMenu = [
        { label: 'AI Diet Generator', path: '/ai-diet', icon: 'magic_button', desc: 'Generate instant macro-balanced meal plans' },
        { label: 'AI Food Analyzer', path: '/ai-image', icon: 'center_focus_strong', desc: 'Scan food photos for calories & macro breakdown' },
        { label: 'AI Health Companion', path: '/ai-chat', icon: 'smart_toy', desc: '24/7 AI nutrition assistant chat' },
        { label: 'Smart Hydration & Progress', path: '/progress', icon: 'monitoring', desc: 'Real-time fluid tracking & weight targets' },
        { label: 'Personal Diet Plans', path: '/diet-plans', icon: 'restaurant_menu', desc: 'Library of active weekly meal plan regimens' },
        { label: 'Consultations & Bookings', path: '/appointments', icon: 'calendar_month', desc: 'Schedule certified nutritionist sessions' },
        { label: 'Health Reports', path: '/reports', icon: 'lab_profile', desc: 'Export clinical biometrics & progress cards' }
    ];

    if (!user) {
        // Guest / Unauthenticated Visitor - Platform Roles links to dedicated /user-roles page
        return [
            { label: 'Home', path: '/' },
            { label: 'Platform Roles', path: '/user-roles' },
            { label: 'AI Suite & Features', subMenu: aiSubMenu },
            { label: 'Testimonials', path: '/testimonials' },
            { label: 'Pricing', path: '/pricing' },
            { label: 'About', path: '/about' },
            { label: 'Contact', path: '/contact' }
        ];
    }

    const userManagementSubMenu = [
        { label: 'User Directory & Roles', path: '/dashboard/admin/users', icon: 'manage_accounts', desc: 'Search by Name/Email, OTP status, role updates' },
        { label: 'Dietitian Verification', path: '/dashboard/admin/dietitians', icon: 'badge', desc: 'Approve or suspend nutritionist applications' }
    ];

    const clientManagementSubMenu = [
        { label: 'Client Roster', path: '/dashboard/nutritionist/clients', icon: 'group', desc: 'Manage patient roster, health logs & biometrics' },
        { label: 'Schedule', path: '/dashboard/nutritionist/schedule', icon: 'calendar_month', desc: 'Manage consultation calendar & slots' }
    ];

    const clinicalToolsSubMenu = [
        { label: 'Diet Builder', path: '/dashboard/nutritionist/builder', icon: 'restaurant_menu', desc: 'Build dynamic weekly meal plans & macro protocols' },
        { label: 'Clinical Reports', path: '/dashboard/nutritionist/reports', icon: 'lab_profile', desc: 'Export patient progress reports & biometrics' }
    ];

    const rawRole = user.role ? String(user.role).toUpperCase().replace('ROLE_', '') : 'USER';

    if (rawRole === 'ADMIN') {
        return [
            { label: 'Home', path: '/' },
            { label: 'System Core', path: '/dashboard/admin' },
            { label: 'User Management', subMenu: userManagementSubMenu, headerTitle: 'User Administration' },
            { label: 'Testimonials', path: '/dashboard/admin/testimonials' },
            { label: 'Analytics', path: '/dashboard/admin/analytics' },
            { label: 'SQL Console', path: '/dashboard/admin/sql' },
            { label: 'Profile', path: '/dashboard/admin/profile' },
            { label: 'Contact', path: '/contact' }
        ];
    }

    if (rawRole === 'NUTRITIONIST' || rawRole === 'DIETITIAN') {
        return [
            { label: 'Home', path: '/' },
            { label: 'Clinical Core', path: '/dashboard/nutritionist' },
            { label: 'Client & Schedule', subMenu: clientManagementSubMenu, headerTitle: 'Client Management' },
            { label: 'Diet & Reports', subMenu: clinicalToolsSubMenu, headerTitle: 'Clinical Protocols' },
            { label: 'Testimonials', path: '/testimonials' },
            { label: 'Profile', path: '/dashboard/nutritionist/profile' },
            { label: 'Contact', path: '/contact' }
        ];
    }

    // Standard Logged-in User
    return [
        { label: 'Home', path: '/' },
        { label: 'Platform Features', subMenu: aiSubMenu },
        { label: 'Progress Tracking', path: '/progress' },
        { label: 'Diet Plans', path: '/diet-plans' },
        { label: 'Appointments', path: '/appointments' },
        { label: 'Testimonials', path: '/testimonials' },
        { label: 'Profile', path: '/profile' },
        { label: 'Contact', path: '/contact' }
    ];
};

const checkIsActive = (pathname, itemPath) => {
    if (!itemPath) return false;
    if (pathname === itemPath) return true;
    if (itemPath === '/' || itemPath === '/dashboard/admin' || itemPath === '/dashboard/nutritionist') {
        return false;
    }
    return pathname.startsWith(itemPath + '/');
};

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const dropdownRef = useRef(null);

    const navItems = getNavItemsForRole(user);

    useEffect(() => {
        setIsMenuOpen(false);
        setActiveDropdown(null);
    }, [location.pathname]);

    // Handle Outside Click to Close Dropdown safely
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsMenuOpen(false);
    };

    const displayName = user?.name || user?.username || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User');

    return (
        <div className="fixed top-4 left-4 right-4 z-50 pointer-events-none">
            <nav className="mx-auto max-w-7xl bg-[#080b12]/85 backdrop-blur-2xl border border-white/10 rounded-3xl md:rounded-3xl overflow-visible shadow-2xl pointer-events-auto">
                <div className="flex justify-between items-center px-4 sm:px-6 py-3">
                    <Link to="/" className="font-headline-lg text-lg sm:text-xl font-bold text-white flex items-center gap-2 whitespace-nowrap">
                        <span className="w-2.5 h-2.5 bg-[#a5d391] rounded-full shadow-[0_0_10px_rgba(165,211,145,0.8)]"></span>
                        NutriMunch <span className="text-[#a5d391] italic font-semibold">AI</span>
                    </Link>

                    {/* Desktop Navigation Items Container */}
                    <div ref={dropdownRef} className="hidden lg:flex items-center gap-1 bg-white/5 rounded-full px-2 py-1 border border-white/5">
                        {navItems.map(item => {
                            if (item.subMenu) {
                                const isOpen = activeDropdown === item.label;
                                const isChildActive = item.subMenu.some(sub => location.pathname === sub.path);

                                return (
                                    <div 
                                        key={item.label}
                                        className="relative"
                                        onMouseEnter={() => setActiveDropdown(item.label)}
                                        onMouseLeave={() => setActiveDropdown(null)}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setActiveDropdown(prev => prev === item.label ? null : item.label)}
                                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${isChildActive || isOpen ? 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <span>{item.label}</span>
                                            <span className={`material-symbols-outlined text-sm transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>

                                        {/* Dropdown for AI Suite */}
                                        {isOpen && (
                                            <div className="absolute top-full left-0 pt-2 w-72 z-50">
                                                <div className="bg-[#080b12]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
                                                    <div className="text-[10px] font-black uppercase text-[#a5d391] tracking-widest px-3 py-1.5">
                                                        {item.headerTitle || item.label}
                                                    </div>
                                                    {item.subMenu.map(sub => {
                                                        const isSubActive = location.pathname === sub.path;
                                                        return (
                                                            <Link
                                                                key={sub.label}
                                                                to={sub.path}
                                                                onClick={() => setActiveDropdown(null)}
                                                                className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${isSubActive ? 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}
                                                            >
                                                                <span className="material-symbols-outlined text-[#a5d391] text-lg mt-0.5">{sub.icon}</span>
                                                                <div>
                                                                    <div className="text-xs font-bold text-white">{sub.label}</div>
                                                                    <div className="text-[10px] text-white/50 mt-0.5">{sub.desc}</div>
                                                                </div>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            const isActive = checkIsActive(location.pathname, item.path);
                            return (
                                <Link
                                    key={item.label}
                                    to={item.path}
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${isActive ? 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right User Profile / Login Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        {user ? (
                            <div className="flex items-center gap-2">
                                <div className="relative group">
                                    <Link
                                        to={user?.role === 'ADMIN' ? '/dashboard/admin/profile' : user?.role === 'NUTRITIONIST' || user?.role === 'DIETITIAN' ? '/dashboard/nutritionist/profile' : '/profile'}
                                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-full transition-all text-xs font-bold text-white group cursor-pointer"
                                    >
                                        <img 
                                            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=a5d391&color=000`} 
                                            alt="Avatar" 
                                            className="w-6 h-6 rounded-full object-cover border border-white/20 group-hover:border-[#a5d391]" 
                                        />
                                        <span className="max-w-[100px] truncate">{displayName}</span>
                                        <span className="material-symbols-outlined text-sm text-white/50 group-hover:rotate-180 transition-transform">expand_more</span>
                                    </Link>

                                    {/* Hover Dropdown displaying Role */}
                                    <div className="absolute right-0 top-full pt-2 w-48 z-50 hidden group-hover:block animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div className="bg-[#080b12]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-3 shadow-2xl space-y-2">
                                            <div className="flex items-center justify-between px-2 py-1 border-b border-white/10">
                                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Role</span>
                                                <span className="text-xs font-black text-[#a5d391] bg-[#a5d391]/15 px-2.5 py-0.5 rounded-full border border-[#a5d391]/30">
                                                    {user?.role ? (
                                                        String(user.role).toUpperCase().replace('ROLE_', '') === 'ADMIN' ? 'Admin' :
                                                        String(user.role).toUpperCase().replace('ROLE_', '') === 'NUTRITIONIST' || String(user.role).toUpperCase().replace('ROLE_', '') === 'DIETITIAN' ? 'Dietician' :
                                                        'User'
                                                    ) : 'User'}
                                                </span>
                                            </div>

                                            <Link
                                                to={user?.role === 'ADMIN' ? '/dashboard/admin/profile' : user?.role === 'NUTRITIONIST' || user?.role === 'DIETITIAN' ? '/dashboard/nutritionist/profile' : '/profile'}
                                                className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-sm text-[#a5d391]">account_circle</span>
                                                View Profile
                                            </Link>

                                            <Link
                                                to={user?.role === 'ADMIN' ? '/dashboard/admin' : user?.role === 'NUTRITIONIST' || user?.role === 'DIETITIAN' ? '/dashboard/nutritionist' : '/dashboard/user'}
                                                className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-sm text-[#a5d391]">dashboard</span>
                                                Dashboard
                                            </Link>

                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-all cursor-pointer text-left border-t border-white/5 mt-1"
                                            >
                                                <span className="material-symbols-outlined text-sm">logout</span>
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    className="cursor-pointer bg-red-500/10 text-red-400 px-3 py-1.5 rounded-full text-xs font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <Link to="/login" className="cursor-pointer bg-gradient-to-r from-[#a5d391] to-[#7ec362] text-black font-bold px-5 py-2 rounded-full text-xs shadow-[0_0_15px_rgba(165,211,145,0.4)] hover:shadow-[0_0_25px_rgba(165,211,145,0.8)] transition-all hover:-translate-y-0.5">
                                Login / Sign up
                            </Link>
                        )}
                    </div>

                    {/* Mobile menu toggle */}
                    <button
                        className="lg:hidden text-white/80 hover:text-white p-2 -mr-2"
                        onClick={() => setIsMenuOpen(prev => !prev)}
                        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isMenuOpen}
                    >
                        <span className="material-symbols-outlined text-2xl">{isMenuOpen ? 'close' : 'menu'}</span>
                    </button>
                </div>

                {/* Mobile dropdown panel */}
                <div className={`lg:hidden grid transition-all duration-300 ease-in-out ${isMenuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                        <div className="px-5 pb-6 pt-2 border-t border-white/10 flex flex-col gap-1">
                            {navItems.map(item => {
                                if (item.subMenu) {
                                    return (
                                        <div key={item.label} className="space-y-1 my-1">
                                            <div className="text-[10px] font-black uppercase text-[#a5d391] tracking-widest px-4 py-1">
                                                {item.headerTitle || item.label}
                                            </div>
                                            {item.subMenu.map(sub => (
                                                <Link
                                                    key={sub.label}
                                                    to={sub.path}
                                                    className={`flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${location.pathname === sub.path ? 'bg-[#a5d391]/20 text-[#a5d391]' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                                                >
                                                    <span className="material-symbols-outlined text-sm text-[#a5d391]">{sub.icon}</span>
                                                    <span>{sub.label}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    );
                                }
                                const isActive = checkIsActive(location.pathname, item.path);
                                return (
                                    <Link
                                        key={item.label}
                                        to={item.path}
                                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-[#a5d391]/20 text-[#a5d391]' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                            
                            {!user && (
                                <Link to="/login" className="mt-2 text-center bg-[#a5d391] text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-all">
                                    Login / Sign up
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default Navbar;

