import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const getNavItemsForRole = (user) => {
    const aiSubMenu = [
        { label: 'AI Diet Generator', path: '/ai-diet', icon: 'magic_button', desc: 'Generate instant macro-balanced meal plans' },
        { label: 'AI Food Analyzer', path: '/ai-image', icon: 'center_focus_strong', desc: 'Scan food photos for instant calories & breakdown' },
        { label: 'AI Health Companion', path: '/ai-chat', icon: 'smart_toy', desc: '24/7 AI nutrition assistant chat' }
    ];

    if (!user) {
        // Guest / Unauthenticated Visitor
        return [
            { label: 'Home', path: '/' },
            { label: 'Requirements', path: '/profile' },
            { label: 'AI Suite', subMenu: aiSubMenu },
            { label: 'Pricing', path: '/pricing' },
            { label: 'About', path: '/about' },
            { label: 'Contact', path: '/contact' }
        ];
    }

    const rawRole = user.role ? String(user.role).toUpperCase().replace('ROLE_', '') : 'USER';

    if (rawRole === 'ADMIN') {
        return [
            { label: 'Home', path: '/' },
            { label: 'Overview', path: '/dashboard/admin' },
            { label: 'Users', path: '/dashboard/admin/users' },
            { label: 'Dietitians', path: '/dashboard/admin/dietitians' },
            { label: 'Analytics', path: '/dashboard/admin/analytics' },
            { label: 'SQL Console', path: '/dashboard/admin/sql' },
            { label: 'Profile', path: '/dashboard/admin/profile' },
            { label: 'Contact', path: '/contact' }
        ];
    }

    if (rawRole === 'NUTRITIONIST' || rawRole === 'DIETITIAN') {
        return [
            { label: 'Home', path: '/' },
            { label: 'Overview', path: '/dashboard/nutritionist' },
            { label: 'Clients', path: '/dashboard/nutritionist/clients' },
            { label: 'Diet Builder', path: '/dashboard/nutritionist/builder' },
            { label: 'Schedule', path: '/dashboard/nutritionist/schedule' },
            { label: 'Reports', path: '/dashboard/nutritionist/reports' },
            { label: 'Profile', path: '/dashboard/nutritionist/profile' },
            { label: 'Contact', path: '/contact' }
        ];
    }

    // Standard Logged-in User
    return [
        { label: 'Home', path: '/' },
        { label: 'Requirements', path: '/profile' },
        { label: 'AI Suite', subMenu: aiSubMenu },
        { label: 'Progress', path: '/progress' },
        { label: 'Diet Plans', path: '/diet-plans' },
        { label: 'Appointments', path: '/appointments' },
        { label: 'Contact', path: '/contact' }
    ];
};

const checkIsActive = (pathname, itemPath) => {
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
    const [isAiDropdownOpen, setIsAiDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const navItems = getNavItemsForRole(user);

    useEffect(() => {
        setIsMenuOpen(false);
        setIsAiDropdownOpen(false);
    }, [location.pathname]);

    // Handle Outside Click to Close Dropdown safely
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsAiDropdownOpen(false);
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
                    <div className="hidden lg:flex items-center gap-1 bg-white/5 rounded-full px-2 py-1 border border-white/5">
                        {navItems.map(item => {
                            if (item.subMenu) {
                                const isChildActive = item.subMenu.some(sub => location.pathname === sub.path);
                                return (
                                    <div 
                                        key={item.label}
                                        ref={dropdownRef}
                                        className="relative"
                                        onMouseEnter={() => setIsAiDropdownOpen(true)}
                                        onMouseLeave={() => setIsAiDropdownOpen(false)}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setIsAiDropdownOpen(prev => !prev)}
                                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${isChildActive || isAiDropdownOpen ? 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <span>{item.label}</span>
                                            <span className={`material-symbols-outlined text-sm transition-transform duration-200 ${isAiDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>

                                        {isAiDropdownOpen && (
                                            <div className="absolute top-full left-0 pt-2 w-72 z-50">
                                                <div className="bg-[#080b12]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
                                                    <div className="text-[10px] font-black uppercase text-[#a5d391] tracking-widest px-3 py-1.5">
                                                        AI Health & Nutrition Suite
                                                    </div>
                                                    {item.subMenu.map(sub => {
                                                        const isSubActive = location.pathname === sub.path;
                                                        return (
                                                            <Link
                                                                key={sub.label}
                                                                to={sub.path}
                                                                onClick={() => setIsAiDropdownOpen(false)}
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
                                <Link
                                    to={user?.role === 'ADMIN' ? '/dashboard/admin/profile' : user?.role === 'NUTRITIONIST' || user?.role === 'DIETITIAN' ? '/dashboard/nutritionist/profile' : '/profile'}
                                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-full transition-all text-xs font-bold text-white group"
                                >
                                    <img 
                                        src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=a5d391&color=000`} 
                                        alt="Avatar" 
                                        className="w-6 h-6 rounded-full object-cover border border-white/20 group-hover:border-[#a5d391]" 
                                    />
                                    <span className="max-w-[100px] truncate">{displayName}</span>
                                </Link>
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
                                                {item.label} Engines
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
