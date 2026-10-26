import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../api/axios';
import ConsultationChatModal from '../components/ConsultationChatModal';

export const getNavItemsForRole = (user) => {
    const aiSubMenu = [
        { label: 'AI Diet Generator', path: '/ai-diet', icon: 'magic_button', desc: 'Generate instant macro-balanced meal plans' },
        { label: 'AI Food Analyzer', path: '/ai-image', icon: 'center_focus_strong', desc: 'Scan food photos for calories & macro breakdown' },
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
            { label: 'Contact', path: '/contact' }
        ];
    }

    const userManagementSubMenu = [
        { label: 'User Directory & Roles', path: '/dashboard/admin/users', icon: 'manage_accounts', desc: 'Search by Name/Email, OTP status, role updates' },
        { label: 'Nutritionist Verification', path: '/dashboard/admin/nutritionists', icon: 'badge', desc: 'Approve or suspend nutritionist applications' }
    ];

    const systemCoreSubMenu = [
        { label: 'System Core', path: '/dashboard/admin', icon: 'dashboard', desc: 'Master system controls, credentials & live telemetry' },
        { label: 'Diet Plans Management', path: '/dashboard/admin/diet-plans', icon: 'menu_book', desc: 'Audit, inspect, promote, and purge diet plans registry' },
        { label: 'Payments', path: '/dashboard/admin/payments', icon: 'payments', desc: 'Platform credit allocations, wallet transactions & audit ledger' },
        { label: 'SQL Console', path: '/dashboard/admin/sql', icon: 'terminal', desc: 'Raw database query console & table inspection' }
    ];

    const clientManagementSubMenu = [
        { label: 'Client Roster', path: '/dashboard/nutritionist/clients', icon: 'group', desc: 'Manage patient roster, health logs & biometrics' },
        { label: 'Schedule', path: '/dashboard/nutritionist/schedule', icon: 'calendar_month', desc: 'Manage consultation calendar & slots' },
        { label: 'Consultation History', path: '/dashboard/nutritionist/schedule#consultation-history', icon: 'history', desc: 'Completed, cancelled & declined sessions with patients' }
    ];

    const clinicalToolsSubMenu = [
        { label: 'Diet Builder', path: '/dashboard/nutritionist/builder', icon: 'restaurant_menu', desc: 'Build dynamic weekly meal plans & macro protocols' },
        { label: 'Clinical Reports', path: '/dashboard/nutritionist/reports', icon: 'lab_profile', desc: 'Export patient progress reports & biometrics' }
    ];

    const dietProgressSubMenu = [
        { label: 'Progress Tracking', path: '/progress', icon: 'monitoring', desc: 'Real-time hydration, logs & weight targets' },
        { label: 'Diet Plans', path: '/diet-plans', icon: 'restaurant_menu', desc: 'Active meal routines & nutritional regimens' },
        { label: 'Health Reports', path: '/reports', icon: 'lab_profile', desc: 'Export clinical biometrics & progress cards' }
    ];

    const consultationSubMenu = [
        { label: 'Appointments', path: '/appointments', icon: 'calendar_month', desc: 'Schedule & review 1-on-1 sessions with nutritionists' },
        { label: 'Consultation History', path: '/appointments#consultation-history', icon: 'history', desc: 'Past, completed & cancelled consultations' },
        { label: 'Transactions', path: '/transactions', icon: 'receipt_long', desc: 'Wallet balance, payment history & escrow audit' }
    ];

    const userAiSubMenu = [
        { label: 'AI Diet Generator', path: '/ai-diet', icon: 'magic_button', desc: 'Generate instant macro-balanced meal plans' },
        { label: 'AI Food Analyzer', path: '/ai-image', icon: 'center_focus_strong', desc: 'Scan food photos for calories & macro breakdown' }
    ];

    const nutritionistPlatformSubMenu = [
        { label: 'Clinical Command Core', path: '/dashboard/nutritionist', icon: 'dashboard', desc: 'Real-time patient monitoring & algorithmic oversight' },
        { label: 'AI Diet Generator', path: '/ai-diet', icon: 'magic_button', desc: 'Generate instant macro-balanced meal plans' },
        { label: 'AI Food Analyzer', path: '/ai-image', icon: 'center_focus_strong', desc: 'Scan food photos for calories & macro breakdown' }
    ];

    const rawRole = user.role ? String(user.role).toUpperCase().replace('ROLE_', '') : 'USER';

    if (rawRole === 'ADMIN') {
        return [
            { label: 'Home', path: '/' },
            { label: 'System Core', subMenu: systemCoreSubMenu, headerTitle: 'System & Analytics Core' },
            { label: 'Platform Features', subMenu: userAiSubMenu, headerTitle: 'AI Platform Suite' },
            { label: 'User Management', subMenu: userManagementSubMenu, headerTitle: 'User Administration' },
            { label: 'Testimonials', path: '/dashboard/admin/testimonials' },
            { label: 'Contact', path: '/contact' }
        ];
    }

    if (rawRole === 'NUTRITIONIST') {
        return [
            { label: 'Home', path: '/' },
            { label: 'Platform Features', subMenu: nutritionistPlatformSubMenu, headerTitle: 'Platform Features' },
            { label: 'Client & Schedule', subMenu: clientManagementSubMenu, headerTitle: 'Client Management' },
            { label: 'Diet & Reports', subMenu: clinicalToolsSubMenu, headerTitle: 'Clinical Protocols' },
            { label: 'Testimonials', path: '/testimonials' },
            { label: 'Contact', path: '/contact' }
        ];
    }

    // Standard Logged-in User
    return [
        { label: 'Home', path: '/' },
        { label: 'Platform Features', subMenu: userAiSubMenu, headerTitle: 'AI Platform Suite' },
        { label: 'Diet & Progress', subMenu: dietProgressSubMenu, headerTitle: 'Diet & Health Tracking' },
        { label: 'Consultation', subMenu: consultationSubMenu, headerTitle: 'Consultations & Billing' },
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
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [chatTargetPatient, setChatTargetPatient] = useState(null);

    // Global listener so any component or notification can open chat with a specific patient
    useEffect(() => {
        const handleOpenChat = (e) => {
            if (e.detail?.targetPatient) {
                setChatTargetPatient(e.detail.targetPatient);
            }
            setIsChatModalOpen(true);
        };
        window.addEventListener('nutrimunch_open_chat', handleOpenChat);
        return () => window.removeEventListener('nutrimunch_open_chat', handleOpenChat);
    }, []);

    const navContainerRef = useRef(null);
    const dropdownRef = useRef(null);
    const notificationRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navItems = getNavItemsForRole(user);
    const rawRole = user?.role ? String(user.role).toUpperCase().replace('ROLE_', '') : 'GUEST';

    const [notifications, setNotifications] = useState([]);
    const [toastNotification, setToastNotification] = useState(null);
    // Server notification ids already known to this session; anything new and unread pops a toast
    const seenServerNotifIdsRef = useRef(null);

    useEffect(() => {
        seenServerNotifIdsRef.current = null;
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
                        backendNotifs = data
                            .filter(n => n.type !== 'CONSULTATION_MSG')
                            .map(n => ({
                                id: n.id,
                                title: n.title,
                                message: n.message,
                                time: n.timeAgo || 'Just now',
                                icon: n.icon || 'notifications',
                                path: n.path || '/progress',
                                type: n.type,
                                senderId: n.senderId,
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
                    localNotifs = stored
                        .filter(n => n.type !== 'CONSULTATION_MSG')
                        .map(n => ({
                            ...n,
                            read: Boolean(n.read) || readIds.has(String(n.id))
                        }));
                }
            } catch (e) {}

            const realNotifs = [...backendNotifs, ...localNotifs];
            const currentUserId = String(user?.id || user?.userId || '');
            const currentUserEmail = user?.email?.toLowerCase() || '';
            const isNutritionist = rawRole.includes('NUTRITIONIST');

            const uniqueReal = Array.from(new Map(realNotifs.map(item => [item.id, item])).values())
                .filter(item => !deletedIds.has(String(item.id)))
                // Never notify a user about an action they performed themselves
                .filter(item => !item.senderId || String(item.senderId) !== currentUserId)
                .filter(item => {
                    // Receiver filtering for targeted chat / exclusive notifications:
                    if (item.targetUserId) {
                        const targetId = String(item.targetUserId);
                        const targetEmail = item.targetUserEmail?.toLowerCase();
                        // For patients: only show if directed to me
                        if (!isNutritionist) {
                            return targetId === currentUserId || (targetEmail && targetEmail === currentUserEmail);
                        }
                        // For nutritionists: do not show their own outgoing message to patient as an incoming notification!
                        if (isNutritionist && item.type === 'CONSULTATION_CHAT') {
                            return false;
                        }
                    }
                    if (item.targetPatientId) {
                        // Message sent by patient to nutritionists: only nutritionists should see this!
                        if (!isNutritionist) {
                            return false;
                        }
                    }
                    return true;
                })
                .map(item => ({
                    ...item,
                    read: Boolean(item.read) || readIds.has(String(item.id))
                }));

            setNotifications(uniqueReal);

            // Pop a toast for server alerts that arrived since the last poll (credits, refunds, appointment updates...)
            const serverItems = uniqueReal.filter(item => typeof item.id === 'number');
            if (seenServerNotifIdsRef.current === null) {
                seenServerNotifIdsRef.current = new Set(serverItems.map(item => String(item.id)));
            } else {
                const fresh = serverItems.find(item => !item.read && !seenServerNotifIdsRef.current.has(String(item.id)));
                serverItems.forEach(item => seenServerNotifIdsRef.current.add(String(item.id)));
                if (fresh) {
                    setToastNotification(fresh);
                    setTimeout(() => setToastNotification(null), 8000);
                }
            }
        };

        loadNotifications();
        const interval = setInterval(loadNotifications, 3000);
        window.addEventListener('nutrimunch_notification_added', loadNotifications);
        window.addEventListener('storage', loadNotifications);
        window.addEventListener('focus', loadNotifications);

        let bc;
        try {
            bc = new BroadcastChannel('nutrimunch_clinical_channel');
            bc.onmessage = (event) => {
                loadNotifications();
                if (event.data?.payload) {
                    const p = event.data.payload;
                    const isNutritionist = rawRole.includes('NUTRITIONIST');
                    const myId = String(user?.id || user?.userId || '');
                    const myEmail = user?.email?.toLowerCase() || '';

                    // Only show floating toast if this user is the intended receiver:
                    // Self-triggered events never produce a toast for the user who caused them
                    let shouldShowToast = !(p.senderId && String(p.senderId) === myId);
                    if (shouldShowToast && p.targetUserId) {
                        if (!isNutritionist) {
                            shouldShowToast = String(p.targetUserId) === myId || (p.targetUserEmail && p.targetUserEmail.toLowerCase() === myEmail);
                        } else if (p.type === 'CONSULTATION_CHAT') {
                            shouldShowToast = false;
                        }
                    }
                    if (p.targetPatientId && !isNutritionist) {
                        shouldShowToast = false;
                    }

                    if (shouldShowToast) {
                        setToastNotification(p);
                        setTimeout(() => setToastNotification(null), 8000);
                    }
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

        // DIRECT NAVIGATION LOGIC - deep link directly to the exact page/modal!
        if (
            item.type === 'CONSULTATION_CHAT' ||
            item.type === 'CONSULTATION_REQUEST' ||
            item.path === 'chat' ||
            (item.title && (item.title.toLowerCase().includes('message') || item.title.toLowerCase().includes('consultation')))
        ) {
            if (item.targetPatientId || item.targetUserId) {
                setChatTargetPatient({
                    id: String(item.targetPatientId || item.targetUserId),
                    userId: String(item.targetPatientId || item.targetUserId),
                    name: item.targetPatientName || item.targetUserName || 'Patient'
                });
            }
            setIsChatModalOpen(true);
            return;
        }

        if (item.type === 'DIET_PLAN' || item.type === 'EXCLUSIVE_PLAN' || item.path?.includes('diet-plan')) {
            navigate('/diet-plans');
            return;
        }

        if (item.type === 'APPOINTMENT' || item.path?.includes('appointment')) {
            const isNutritionist = rawRole.includes('NUTRITIONIST');
            navigate(isNutritionist ? '/dashboard/nutritionist/schedule' : '/appointments');
            return;
        }

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

            window.dispatchEvent(new Event('nutrimunch_notification_added'));

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

            window.dispatchEvent(new Event('nutrimunch_notification_added'));

            if (token) {
                fetch(`${API_BASE_URL}/notifications/clear-all`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => {});
            }
        } catch (e) {}
    };

    const handleDismissToast = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setToastNotification(null);
    };

    const unreadCount = notifications.filter(n => !n.read).length;
    const displayName = user?.name || user?.username || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User');
    const roleLabel = rawRole === 'ADMIN' ? 'Admin' : (rawRole === 'NUTRITIONIST') ? 'Nutritionist' : 'User';

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };
    const userInitials = getInitials(displayName);

    const profilePath = rawRole === 'ADMIN' ? '/dashboard/admin/profile'
        : (rawRole === 'NUTRITIONIST') ? '/dashboard/nutritionist/profile'
        : '/profile';

    return (
        <>
            <div className="fixed top-4 left-4 right-4 z-50 pointer-events-none">
            <nav ref={navContainerRef} className="mx-auto max-w-7xl bg-[#080b12]/85 backdrop-blur-2xl border border-white/10 rounded-3xl md:rounded-3xl overflow-visible shadow-2xl pointer-events-auto">
                <div className="flex justify-between items-center px-3 sm:px-6 py-2.5 sm:py-3 gap-2">
                    <Link to="/" className="font-headline-lg text-lg sm:text-xl font-bold text-white flex items-center gap-2 whitespace-nowrap shrink-0">
                        <span className="w-2.5 h-2.5 bg-[#a5d391] rounded-full shadow-[0_0_10px_rgba(165,211,145,0.8)]"></span>
                        NutriMunch <span className="text-[#a5d391] italic font-semibold">AI</span>
                    </Link>

                    {/* Desktop Navigation Items Container */}
                    <div
                        ref={dropdownRef}
                        className="hidden lg:flex items-center gap-0.5 xl:gap-1 bg-white/5 rounded-full px-2.5 xl:px-3.5 py-1 border border-white/10 mx-1 xl:mx-2 shrink-0 shadow-inner"
                    >
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
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap inline-flex items-center justify-center gap-1 leading-none cursor-pointer ${isChildActive || isOpen ? 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
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
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap inline-flex items-center justify-center leading-none ${isActive ? 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            });
                        })()}
                    </div>

                    {/* Right User Actions & Controls (Notifications, Mobile Toggle, Login/Profile) */}
                    <div className="flex items-center gap-1.5 sm:gap-2.5 xl:gap-3 shrink-0">
                        {/* Consultation Chat Button (when user is logged in) */}
                        {user && (
                            <button
                                type="button"
                                onClick={() => setIsChatModalOpen(true)}
                                aria-label="Clinical Consultation Chat"
                                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#a5d391]/40 flex items-center justify-center text-white/80 hover:text-[#a5d391] transition-all cursor-pointer shadow-sm"
                                title="Consultation Chat with Nutritionist"
                            >
                                <span className="material-symbols-outlined text-base sm:text-lg">forum</span>
                            </button>
                        )}

                        {/* Notification Bell Button & Dropdown */}
                        <div ref={notificationRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setIsNotificationOpen(prev => !prev)}
                                aria-label="Notifications"
                                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer shadow-sm"
                            >
                                <span className="material-symbols-outlined text-base sm:text-lg">notifications</span>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 text-[#080b12] font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Popover Dropdown */}
                            {isNotificationOpen && (
                                <div className="absolute right-0 top-full pt-3 w-80 sm:w-96 max-w-[calc(100vw-2rem)] z-[99999]">
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

                        {/* Mobile Menu Toggle Button (Hamburger / Close) */}
                        <button
                            type="button"
                            className="lg:hidden flex w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer shadow-sm"
                            onClick={() => setIsMenuOpen(prev => !prev)}
                            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={isMenuOpen}
                        >
                            <span className="material-symbols-outlined text-lg sm:text-xl">{isMenuOpen ? 'close' : 'menu'}</span>
                        </button>

                        {/* Extreme Right: User Profile Pill & Logout OR Login / Sign up Button */}
                        {user ? (
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                <Link
                                    to={profilePath}
                                    title={`${displayName} • Role: ${roleLabel} • View Profile`}
                                    className="group relative flex items-center gap-1.5 sm:gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#a5d391]/40 px-2 sm:px-2.5 py-1.5 rounded-full transition-all text-xs font-bold text-white cursor-pointer shadow-sm shrink-0"
                                >
                                    {/* User Initials Avatar Circle */}
                                    <div className="w-6 h-6 rounded-full bg-[#a5d391] text-black font-black text-[10px] flex items-center justify-center border border-white/20 group-hover:border-[#a5d391] shrink-0 overflow-hidden shadow-sm">
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

                                    {/* Role Badge */}
                                    <span className={`hidden xl:inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${rawRole === 'ADMIN' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : (rawRole === 'NUTRITIONIST') ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30'}`}>
                                        {roleLabel}
                                    </span>

                                    {/* Hover Tooltip Popup displaying User Name & Role */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                                        <div className="w-2 h-2 bg-[#080b12] border-t border-l border-white/20 rotate-45 -mb-1"></div>
                                        <div className="bg-[#080b12]/95 backdrop-blur-xl border border-white/20 text-white px-3 py-1.5 rounded-xl shadow-2xl text-[10px] font-bold whitespace-nowrap flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#a5d391] animate-pulse"></span>
                                            <span className="text-white font-semibold">{displayName}</span>
                                            <span className="text-white/40">•</span>
                                            <span className="text-[#a5d391] font-black uppercase">{roleLabel}</span>
                                        </div>
                                    </div>
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="cursor-pointer bg-red-500/10 text-red-400 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-sm shrink-0 whitespace-nowrap"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="cursor-pointer bg-gradient-to-r from-[#a5d391] to-[#7ec362] text-black font-bold px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs shadow-[0_0_15px_rgba(165,211,145,0.4)] hover:shadow-[0_0_25px_rgba(165,211,145,0.8)] transition-all hover:-translate-y-0.5 whitespace-nowrap"
                            >
                                Login<span className="hidden min-[480px]:inline"> / Sign up</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Mobile Dropdown Panel */}
                <div className={`lg:hidden block grid transition-all duration-300 ease-in-out ${isMenuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
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
                                                    onClick={() => setIsMenuOpen(false)}
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
                                        onClick={() => setIsMenuOpen(false)}
                                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-[#a5d391]/20 text-[#a5d391]' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}

                            {user ? (
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        handleLogout();
                                    }}
                                    className="mt-2 text-center bg-red-500/20 text-red-300 font-bold px-4 py-2.5 rounded-xl text-sm transition-all border border-red-500/30"
                                >
                                    Logout
                                </button>
                            ) : (
                                <Link
                                    to="/login"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="mt-2 text-center bg-[#a5d391] text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-all"
                                >
                                    Login / Sign up
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </div>

            {/* Real-Time Push Notification Toast Banner */}
            {toastNotification && (
                <div className="fixed bottom-6 right-6 z-[99999] max-w-md w-full animate-bounce-in shadow-2xl pointer-events-auto">
                    <div className="bg-[#121f18] border border-[#a5d391]/40 rounded-2xl p-4 shadow-2xl shadow-emerald-950/90 backdrop-blur-xl flex items-start gap-4 pointer-events-auto">
                        <div className="w-10 h-10 rounded-xl bg-[#a5d391]/20 flex items-center justify-center shrink-0 border border-[#a5d391]/30">
                            <span className="material-symbols-outlined text-[#a5d391] animate-pulse text-xl">
                                {toastNotification.type === 'CONSULTATION_CHAT' ? 'forum' : 'notifications_active'}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-[#a5d391] bg-[#a5d391]/10 px-2 py-0.5 rounded-full border border-[#a5d391]/20">
                                    {toastNotification.type === 'CONSULTATION_CHAT' ? 'Consultation Chat' : 'Notification'}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleDismissToast}
                                    className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 cursor-pointer flex items-center justify-center"
                                    title="Dismiss"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                            <h4 className="text-sm font-bold text-white truncate">{toastNotification.title || 'Live Update Received'}</h4>
                            <p className="text-xs text-white/70 line-clamp-2 mt-0.5">{toastNotification.message}</p>
                            <div className="mt-3 flex items-center gap-3">
                                {toastNotification.type === 'CONSULTATION_CHAT' || toastNotification.path === 'chat' ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (toastNotification.targetPatientId || toastNotification.targetUserId) {
                                                setChatTargetPatient({
                                                    id: String(toastNotification.targetPatientId || toastNotification.targetUserId),
                                                    userId: String(toastNotification.targetPatientId || toastNotification.targetUserId),
                                                    name: toastNotification.targetPatientName || toastNotification.targetUserName || 'Patient'
                                                });
                                            }
                                            handleDismissToast();
                                            setIsChatModalOpen(true);
                                        }}
                                        className="text-xs font-semibold text-black bg-[#a5d391] hover:bg-[#8cc476] px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-md shadow-[#a5d391]/20 cursor-pointer"
                                    >
                                        <span>Open Consultation Chat</span>
                                        <span className="material-symbols-outlined text-xs">forum</span>
                                    </button>
                                ) : (
                                    <Link
                                        to={toastNotification.path || (toastNotification.type === 'DIET_PLAN' || toastNotification.type === 'EXCLUSIVE_PLAN' ? "/diet-plans" : "/progress")}
                                        onClick={handleDismissToast}
                                        className="text-xs font-semibold text-black bg-[#a5d391] hover:bg-[#8cc476] px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-md shadow-[#a5d391]/20 cursor-pointer"
                                    >
                                        <span>View Details</span>
                                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                    </Link>
                                )}
                                <button
                                    type="button"
                                    onClick={handleDismissToast}
                                    className="text-xs font-medium text-white/50 hover:text-white cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Consultation Chat Modal */}
            {isChatModalOpen && (
                <ConsultationChatModal
                    isOpen={isChatModalOpen}
                    onClose={() => {
                        setIsChatModalOpen(false);
                        setChatTargetPatient(null);
                    }}
                    currentUser={user}
                    targetPatient={chatTargetPatient}
                />
            )}
        </>
    );
};

export default Navbar;
