import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../api/axios';

export const getNavItemsForRole = (user) => {
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
    const { user, logout, token } = useContext(AuthContext);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    const dropdownRef = useRef(null);
    const notificationRef = useRef(null);

    const navItems = getNavItemsForRole(user);
    const rawRole = user?.role ? String(user.role).toUpperCase().replace('ROLE_', '') : 'GUEST';

    const [notifications, setNotifications] = useState([]);
    const [toastNotification, setToastNotification] = useState(null);

    useEffect(() => {
        const loadNotifications = async () => {
            if (!user) {
                setNotifications([]);
                return;
            }

            let readIds = new Set();
            let deletedIds = new Set();
            try {
                const storedRead = JSON.parse(localStorage.getItem('nutrimunch_read_notif_ids') || '[]');
                readIds = new Set(storedRead.map(String));

                const storedDeleted = JSON.parse(localStorage.getItem('nutrimunch_deleted_notif_ids') || '[]');
                deletedIds = new Set(storedDeleted.map(String));
            } catch (e) {}

            let backendNotifs = [];
            if (token) {
                try {
                    const res = await fetch(`${API_BASE_URL}/notifications/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        backendNotifs = data.map(n => ({
                            id: n.id,
                            title: n.title,
                            message: n.message,
                            time: n.timeAgo || 'Just now',
                            icon: n.icon || 'notifications',
                            path: n.path || '/progress',
                            read: Boolean(n.readStatus) || readIds.has(String(n.id))
                        }));
                    }
                } catch (err) {
                    console.error("Error fetching backend notifications", err);
                }
            }

            let localNotifs = [];
            try {
                const stored = JSON.parse(localStorage.getItem('nutrimunch_user_notifications') || '[]');
                if (stored && Array.isArray(stored)) {
                    localNotifs = stored.map(n => ({
                        ...n,
                        read: Boolean(n.read) || readIds.has(String(n.id))
                    }));
                }
            } catch (e) {}

            const realNotifs = [...backendNotifs, ...localNotifs];
            const uniqueReal = Array.from(new Map(realNotifs.map(item => [item.id, item])).values())
                .filter(item => !deletedIds.has(String(item.id)))
                .map(item => ({
                    ...item,
                    read: Boolean(item.read) || readIds.has(String(item.id))
                }));

            setNotifications(uniqueReal);
        };

        loadNotifications();
        const interval = setInterval(loadNotifications, 10000);
        window.addEventListener('nutrimunch_notification_added', loadNotifications);
        window.addEventListener('storage', loadNotifications);
        window.addEventListener('focus', loadNotifications);

        let bc;
        try {
            bc = new BroadcastChannel('nutrimunch_clinical_channel');
            bc.onmessage = (event) => {
                loadNotifications();
                if (event.data?.payload) {
                    setToastNotification(event.data.payload);
                    setTimeout(() => setToastNotification(null), 8000);
                }
            };
        } catch (e) {}

        return () => {
            clearInterval(interval);
            window.removeEventListener('nutrimunch_notification_added', loadNotifications);
            window.removeEventListener('storage', loadNotifications);
            window.removeEventListener('focus', loadNotifications);
            if (bc) bc.close();
        };
    }, [user, rawRole, token]);

    useEffect(() => {
        setIsMenuOpen(false);
        setActiveDropdown(null);
        setIsNotificationOpen(false);
    }, [location.pathname]);

    // Handle Outside Click to Close Dropdowns safely
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setIsNotificationOpen(false);
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

    const handleNotificationClick = async (item) => {
        const stringId = String(item.id);
        setNotifications(prev => prev.map(n => String(n.id) === stringId ? { ...n, read: true } : n));
        try {
            const storedRead = JSON.parse(localStorage.getItem('nutrimunch_read_notif_ids') || '[]');
            if (!storedRead.includes(stringId)) {
                localStorage.setItem('nutrimunch_read_notif_ids', JSON.stringify([...storedRead, stringId]));
            }
            const stored = JSON.parse(localStorage.getItem('nutrimunch_user_notifications') || '[]');
            const updated = stored.map(n => String(n.id) === stringId ? { ...n, read: true } : n);
            localStorage.setItem('nutrimunch_user_notifications', JSON.stringify(updated));

            if (token && (typeof item.id === 'number' || !isNaN(Number(item.id)))) {
                fetch(`${API_BASE_URL}/notifications/${item.id}/read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => {});
            }
        } catch (e) {}
        setIsNotificationOpen(false);
        if (item.path) {
            navigate(item.path);
        }
    };

    const markAllAsRead = async () => {
        const allIds = notifications.map(n => String(n.id));
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try {
            const storedRead = JSON.parse(localStorage.getItem('nutrimunch_read_notif_ids') || '[]');
            const combinedRead = Array.from(new Set([...storedRead, ...allIds]));
            localStorage.setItem('nutrimunch_read_notif_ids', JSON.stringify(combinedRead));

            const stored = JSON.parse(localStorage.getItem('nutrimunch_user_notifications') || '[]');
            const updated = stored.map(n => ({ ...n, read: true }));
            localStorage.setItem('nutrimunch_user_notifications', JSON.stringify(updated));

            if (token) {
                fetch(`${API_BASE_URL}/notifications/read-all`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => {});
            }
        } catch (e) {}
    };

    const handleDeleteNotification = async (id, e) => {
        if (e) e.stopPropagation();
        const stringId = String(id);
        setNotifications(prev => prev.filter(n => String(n.id) !== stringId));
        try {
            const storedDeleted = JSON.parse(localStorage.getItem('nutrimunch_deleted_notif_ids') || '[]');
            if (!storedDeleted.includes(stringId)) {
                localStorage.setItem('nutrimunch_deleted_notif_ids', JSON.stringify([...storedDeleted, stringId]));
            }

            const storedNotifs = JSON.parse(localStorage.getItem('nutrimunch_user_notifications') || '[]');
            const updatedNotifs = storedNotifs.filter(n => String(n.id) !== stringId);
            localStorage.setItem('nutrimunch_user_notifications', JSON.stringify(updatedNotifs));

            const storedDirectives = JSON.parse(localStorage.getItem('nutrimunch_clinical_directives') || '[]');
            const updatedDirectives = storedDirectives.filter(n => String(n.id) !== stringId);
            localStorage.setItem('nutrimunch_clinical_directives', JSON.stringify(updatedDirectives));

            window.dispatchEvent(new Event('nutrimunch_notification_added'));
            try {
                const bc = new BroadcastChannel('nutrimunch_clinical_channel');
                bc.postMessage({ type: 'CLINICAL_DIRECTIVE_DELETED', id: stringId });
                bc.close();
            } catch (err) {}

            if (token && (typeof id === 'number' || !isNaN(Number(id)))) {
                fetch(`${API_BASE_URL}/notifications/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => {});
            }
        } catch (e) {}
    };

    const handleClearAllNotifications = async () => {
        const allIds = notifications.map(n => String(n.id));
        setNotifications([]);
        try {
            const storedDeleted = JSON.parse(localStorage.getItem('nutrimunch_deleted_notif_ids') || '[]');
            const combinedDeleted = Array.from(new Set([...storedDeleted, ...allIds]));
            localStorage.setItem('nutrimunch_deleted_notif_ids', JSON.stringify(combinedDeleted));

            localStorage.setItem('nutrimunch_user_notifications', '[]');
            localStorage.setItem('nutrimunch_clinical_directives', '[]');

            window.dispatchEvent(new Event('nutrimunch_notification_added'));
            try {
                const bc = new BroadcastChannel('nutrimunch_clinical_channel');
                bc.postMessage({ type: 'CLINICAL_DIRECTIVE_CLEAR_ALL' });
                bc.close();
            } catch (err) {}

            if (token) {
                fetch(`${API_BASE_URL}/notifications/clear-all`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => {});
            }
        } catch (e) {}
    };

    const unreadCount = notifications.filter(n => !n.read).length;
    const displayName = user?.name || user?.username || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User');
    const roleLabel = rawRole === 'ADMIN' ? 'Admin' : (rawRole === 'NUTRITIONIST' || rawRole === 'DIETITIAN') ? 'Nutritionist' : 'User';

    const profilePath = user?.role === 'ADMIN' ? '/dashboard/admin/profile' 
        : (user?.role === 'NUTRITIONIST' || user?.role === 'DIETITIAN') ? '/dashboard/nutritionist/profile' 
        : '/profile';

    return (
        <div className="fixed top-4 left-4 right-4 z-50 pointer-events-none">
            <nav className="mx-auto max-w-7xl bg-[#080b12]/85 backdrop-blur-2xl border border-white/10 rounded-3xl md:rounded-3xl overflow-visible shadow-2xl pointer-events-auto">
                <div className="flex justify-between items-center px-4 sm:px-6 py-3">
                    <Link to="/" className="font-headline-lg text-lg sm:text-xl font-bold text-white flex items-center gap-2 whitespace-nowrap">
                        <span className="w-2.5 h-2.5 bg-[#a5d391] rounded-full shadow-[0_0_10px_rgba(165,211,145,0.8)]"></span>
                        NutriMunch <span className="text-[#a5d391] italic font-semibold">AI</span>
                    </Link>

                    {/* Desktop Navigation Items Container */}
                    <div ref={dropdownRef} className="hidden lg:flex items-center gap-1 bg-white/5 rounded-full px-2 py-1 border border-white/5 mx-2 sm:mx-4">
                        {(() => {
                            const isStandaloneActive = navItems.some(nav => !nav.subMenu && checkIsActive(location.pathname, nav.path));
                            return navItems.map(item => {
                                if (item.subMenu) {
                                    const isOpen = activeDropdown === item.label;
                                    const isChildActive = !isStandaloneActive && item.subMenu.some(sub => checkIsActive(location.pathname, sub.path));

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

                                            {/* Dropdown for SubMenus */}
                                            {isOpen && (
                                                <div className="absolute top-full left-0 pt-2 w-72 z-50">
                                                    <div className="bg-[#080b12]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
                                                        <div className="text-[10px] font-black uppercase text-[#a5d391] tracking-widest px-3 py-1.5">
                                                            {item.headerTitle || item.label}
                                                        </div>
                                                        {item.subMenu.map(sub => {
                                                            const isSubActive = checkIsActive(location.pathname, sub.path);
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
                            });
                        })()}
                    </div>

                    {/* Right User Actions & Notification Bell */}
                    <div className="hidden md:flex items-center gap-3 sm:gap-3.5 ml-3 sm:ml-4">
                        
                        {/* Notification Bell Button (Placed BEFORE User Label) */}
                        <div ref={notificationRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setIsNotificationOpen(prev => !prev)}
                                aria-label="Notifications"
                                className="relative w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer shadow-sm"
                            >
                                <span className="material-symbols-outlined text-lg">notifications</span>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 text-[#080b12] font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Popover Dropdown */}
                            {isNotificationOpen && (
                                <div className="absolute right-0 top-full pt-3 w-80 sm:w-96 z-[99999]">
                                    <div className="bg-[#080b12]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[#a5d391] text-base">notifications_active</span>
                                                <h4 className="text-sm font-bold text-white font-hero-display">Notifications</h4>
                                                {unreadCount > 0 && (
                                                    <span className="text-[10px] font-bold bg-[#a5d391]/20 text-[#a5d391] px-2 py-0.5 rounded-full border border-[#a5d391]/30">
                                                        {unreadCount} new
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {unreadCount > 0 && (
                                                    <button 
                                                        onClick={markAllAsRead}
                                                        className="text-[11px] text-white/50 hover:text-[#a5d391] font-semibold transition-colors cursor-pointer"
                                                    >
                                                        Mark read
                                                    </button>
                                                )}
                                                {notifications.length > 0 && (
                                                    <button 
                                                        onClick={handleClearAllNotifications}
                                                        className="text-[11px] text-red-400/80 hover:text-red-300 font-semibold transition-colors cursor-pointer flex items-center gap-0.5"
                                                    >
                                                        <span className="material-symbols-outlined text-xs">delete_sweep</span>
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Notifications List */}
                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                            {!user ? (
                                                <div className="p-4 text-center space-y-2">
                                                    <div className="w-10 h-10 rounded-full bg-white/5 text-white/40 flex items-center justify-center mx-auto border border-white/10">
                                                        <span className="material-symbols-outlined">notifications_off</span>
                                                    </div>
                                                    <div className="text-xs font-bold text-white">No New Notifications</div>
                                                    <p className="text-[11px] text-white/50 leading-relaxed">
                                                        Sign in to receive personalized AI macro target updates and live nutritionist booking alerts.
                                                    </p>
                                                    <Link 
                                                        to="/login"
                                                        onClick={() => setIsNotificationOpen(false)}
                                                        className="inline-block mt-2 px-4 py-1.5 rounded-full bg-[#a5d391] text-black font-bold text-xs hover:bg-white transition-all shadow-md"
                                                    >
                                                        Sign In Now
                                                    </Link>
                                                </div>
                                            ) : notifications.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-white/40">
                                                    No new notifications at this time.
                                                </div>
                                            ) : (
                                                notifications.map((n) => (
                                                    <div 
                                                        key={n.id}
                                                        onClick={() => handleNotificationClick(n)}
                                                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 group ${!n.read ? 'bg-[#a5d391]/10 border-[#a5d391]/30 hover:border-[#a5d391]/60' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${!n.read ? 'bg-[#a5d391] text-black' : 'bg-white/10 text-white/60'}`}>
                                                            <span className="material-symbols-outlined text-base">{n.icon || 'notifications'}</span>
                                                        </div>
                                                        <div className="flex-grow min-w-0">
                                                            <div className="flex justify-between items-start gap-1">
                                                                <div className="text-xs font-bold text-white group-hover:text-[#a5d391] transition-colors truncate">
                                                                    {n.title}
                                                                </div>
                                                                <span className="text-[9px] text-white/40 shrink-0">{n.time}</span>
                                                            </div>
                                                            <p className="text-[11px] text-white/60 leading-relaxed mt-0.5 line-clamp-2">
                                                                {n.message}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                                            {!n.read && (
                                                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.9)]"></span>
                                                            )}
                                                            <button
                                                                onClick={(e) => handleDeleteNotification(n.id, e)}
                                                                className="p-1 text-white/30 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                                                title="Delete notification"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Profile Pill & Logout */}
                        {user ? (
                            <div className="flex items-center gap-2">
                                <Link
                                    to={profilePath}
                                    title={`Role: ${roleLabel} • View Profile`}
                                    className="group relative flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#a5d391]/40 px-3 py-1.5 rounded-full transition-all text-xs font-bold text-white cursor-pointer shadow-sm"
                                >
                                    <img 
                                        src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=a5d391&color=000`} 
                                        alt="Avatar" 
                                        className="w-6 h-6 rounded-full object-cover border border-white/20 group-hover:border-[#a5d391]" 
                                    />
                                    <span className="max-w-[110px] truncate">{displayName}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${rawRole === 'ADMIN' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : (rawRole === 'NUTRITIONIST' || rawRole === 'DIETITIAN') ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30'}`}>
                                        {roleLabel}
                                    </span>

                                    {/* Hover Tooltip Popup displaying Role */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                                        <div className="w-2 h-2 bg-[#080b12] border-t border-l border-white/20 rotate-45 -mb-1"></div>
                                        <div className="bg-[#080b12]/95 backdrop-blur-xl border border-white/20 text-white px-3 py-1.5 rounded-xl shadow-2xl text-[10px] font-bold whitespace-nowrap flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#a5d391] animate-pulse"></span>
                                            Role: <span className="text-[#a5d391] font-black uppercase">{roleLabel}</span>
                                        </div>
                                    </div>
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="cursor-pointer bg-red-500/10 text-red-400 px-3 py-1.5 rounded-full text-xs font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-sm"
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

                    {/* Mobile menu toggle & Notification icon */}
                    <div className="flex items-center gap-2 lg:hidden">
                        <button
                            type="button"
                            onClick={() => setIsNotificationOpen(prev => !prev)}
                            className="relative p-2 text-white/80 hover:text-white cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-2xl">notifications</span>
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                            )}
                        </button>

                        <button
                            className="text-white/80 hover:text-white p-2 -mr-2"
                            onClick={() => setIsMenuOpen(prev => !prev)}
                            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={isMenuOpen}
                        >
                            <span className="material-symbols-outlined text-2xl">{isMenuOpen ? 'close' : 'menu'}</span>
                        </button>
                    </div>
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
                            
                            {user ? (
                                <button onClick={handleLogout} className="mt-2 text-center bg-red-500/20 text-red-300 font-bold px-4 py-2.5 rounded-xl text-sm transition-all border border-red-500/30">
                                    Logout
                                </button>
                            ) : (
                                <Link to="/login" className="mt-2 text-center bg-[#a5d391] text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-all">
                                    Login / Sign up
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Real-Time Push Notification Toast Banner */}
            {toastNotification && (
                <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce-in shadow-2xl">
                    <div className="bg-[#121f18] border border-[#a5d391]/40 rounded-2xl p-4 shadow-2xl shadow-emerald-950/90 backdrop-blur-xl flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#a5d391]/20 flex items-center justify-center shrink-0 border border-[#a5d391]/30">
                            <span className="material-symbols-outlined text-[#a5d391] animate-pulse text-xl">health_and_safety</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-[#a5d391] bg-[#a5d391]/10 px-2 py-0.5 rounded-full border border-[#a5d391]/20">Live Directive</span>
                                <button onClick={() => setToastNotification(null)} className="text-white/40 hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                            <h4 className="text-sm font-bold text-white truncate">{toastNotification.title || 'Clinical Directive Received'}</h4>
                            <p className="text-xs text-white/70 line-clamp-2 mt-0.5">{toastNotification.message}</p>
                            <div className="mt-3 flex items-center gap-3">
                                <Link
                                    to="/progress"
                                    onClick={() => setToastNotification(null)}
                                    className="text-xs font-semibold text-black bg-[#a5d391] hover:bg-[#8cc476] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-md shadow-[#a5d391]/20"
                                >
                                    <span>View Directive</span>
                                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                </Link>
                                <button
                                    onClick={() => setToastNotification(null)}
                                    className="text-xs font-medium text-white/50 hover:text-white"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Navbar;
