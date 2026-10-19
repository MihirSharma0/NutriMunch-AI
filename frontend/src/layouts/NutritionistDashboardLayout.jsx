import React, { useState, useEffect, useContext } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import Starfield from '../components/Starfield';
import { subscribeWalletSse } from '../utils/walletSse';

const NutritionistDashboardLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [walletBalance, setWalletBalance] = useState(null);
    const [walletToast, setWalletToast] = useState(null);

    const userKeyId = user?.id || user?.userId;
    const userKeyEmail = user?.email?.toLowerCase();

    const resolveCachedBalance = () => {
        if (!userKeyId && !userKeyEmail) return 0;
        const keys = [
            userKeyId ? `nutrimunch_wallet_balance_id_${userKeyId}` : null,
            userKeyId ? `nutrimunch_wallet_balance_${userKeyId}` : null,
            userKeyEmail ? `nutrimunch_wallet_balance_email_${userKeyEmail}` : null,
            userKeyEmail ? `nutrimunch_wallet_balance_${userKeyEmail}` : null
        ].filter(Boolean);
        let maxBal = 0;
        for (const k of keys) {
            const v = localStorage.getItem(k);
            if (v !== null && !isNaN(Number(v))) {
                maxBal = Math.max(maxBal, Number(v));
            }
        }
        return maxBal;
    };

    const loadWallet = async () => {
        if (!userKeyId && !userKeyEmail) {
            setWalletBalance(0);
            return;
        }
        try {
            const res = await api.get('/wallet/me', {
                params: {
                    userId: userKeyId || '',
                    email: userKeyEmail || ''
                }
            });

            const localCached = resolveCachedBalance();

            if (res.data && typeof res.data.balance !== 'undefined' && res.data.balance !== null) {
                const sBal = Number(res.data.balance);
                setWalletBalance(sBal);
                if (userKeyId) localStorage.setItem(`nutrimunch_wallet_balance_id_${userKeyId}`, String(sBal));
                if (userKeyEmail) localStorage.setItem(`nutrimunch_wallet_balance_email_${userKeyEmail}`, String(sBal));
                return;
            }
        } catch (err) {
            // silent catch
        }
        const cached = resolveCachedBalance();
        setWalletBalance(cached);
    };

    useEffect(() => {
        loadWallet();
        const handleWalletUpdate = (e) => {
            const myId = String(userKeyId || '');
            const myEmail = (userKeyEmail || user?.username || '').toLowerCase();

            if (e?.type === 'storage' && e?.key) {
                const key = e.key;
                if (!key.startsWith('nutrimunch_wallet_balance')) return;
                const matchesMe = (myId && key.includes(myId)) || (myEmail && key.includes(myEmail));
                if (!matchesMe) return;
                const val = localStorage.getItem(key);
                if (val !== null && !isNaN(Number(val))) {
                    setWalletBalance(Number(val));
                    return;
                }
            }

            if (e?.detail) {
                const targetId = String(e.detail.recipientId || '');
                const targetEmail = (e.detail.recipientEmail || '').toLowerCase();
                const isForMe = (targetId && myId && targetId === myId) || 
                                (targetEmail && myEmail && targetEmail === myEmail) ||
                                (!targetId && !targetEmail);
                if (!isForMe) return;

                const pushedVal = e.detail.newBalance !== undefined && e.detail.newBalance !== null
                    ? e.detail.newBalance
                    : e.detail.balance;

                if (pushedVal !== undefined && pushedVal !== null) {
                    const newBal = Number(pushedVal);
                    setWalletBalance(newBal);
                    if (myId) localStorage.setItem(`nutrimunch_wallet_balance_${myId}`, String(newBal));
                    if (myEmail) localStorage.setItem(`nutrimunch_wallet_balance_${myEmail}`, String(newBal));

                    // Live SSE Toast Notification
                    if (e.detail.amount !== undefined && e.detail.amount !== null && Number(e.detail.amount) !== 0) {
                        const amtNum = Number(e.detail.amount);
                        const sign = amtNum > 0 ? '+' : '';
                        const desc = e.detail.description || e.detail.notes || (amtNum > 0 ? 'Consultation Fee Credited' : 'Funds Adjusted');
                        setWalletToast({
                            text: `${desc}: ${sign}₹${Math.abs(amtNum).toFixed(2)} (New Balance: ₹${newBal.toFixed(2)})`,
                            isPositive: amtNum > 0
                        });
                        setTimeout(() => setWalletToast(null), 4000);
                    }
                    return;
                }
            }
        };

        window.addEventListener('wallet_update', handleWalletUpdate);
        window.addEventListener('wallet_updated', handleWalletUpdate);
        window.addEventListener('storage', handleWalletUpdate);

        let bc;
        try {
            bc = new BroadcastChannel('nutrimunch_clinical_channel');
            bc.onmessage = (event) => {
                if (event.data?.type === 'WALLET_CREDITED' || event.data?.type === 'WALLET_UPDATED') {
                    const targetId = String(event.data.recipientId || '');
                    const targetEmail = (event.data.recipientEmail || '').toLowerCase();
                    const myId = String(userKeyId || '');
                    const myEmail = (userKeyEmail || user?.username || '').toLowerCase();
                    const isForMe = (targetId && myId && targetId === myId) || 
                                    (targetEmail && myEmail && targetEmail === myEmail) ||
                                    (!targetId && !targetEmail);
                    if (!isForMe) return;

                    // Direct Push: Apply pushed balance immediately with zero server load
                    const pushedVal = event.data.newBalance !== undefined && event.data.newBalance !== null
                        ? event.data.newBalance
                        : event.data.balance;

                    if (pushedVal !== undefined && pushedVal !== null) {
                        const newBal = Number(pushedVal);
                        setWalletBalance(newBal);
                        if (myId) localStorage.setItem(`nutrimunch_wallet_balance_${myId}`, String(newBal));
                        if (myEmail) localStorage.setItem(`nutrimunch_wallet_balance_${myEmail}`, String(newBal));
                    }
                }
            };
        } catch (e) {}

        // Connect Server-Sent Events (SSE) stream for live push updates
        const unsubscribeSse = subscribeWalletSse(user, (newBal) => {
            setWalletBalance(newBal);
        });

        return () => {
            window.removeEventListener('wallet_update', handleWalletUpdate);
            window.removeEventListener('wallet_updated', handleWalletUpdate);
            window.removeEventListener('storage', handleWalletUpdate);
            if (bc) bc.close();
            unsubscribeSse();
        };
    }, [user, userKeyId, userKeyEmail]);

    // Signature Theme (#a5d391 / Mint / #080b12)
    const accentColor = "text-[#a5d391]";
    const accentBg = "bg-[#a5d391]";
    const accentBgLight = "bg-[#a5d391]/10";
    const accentBorder = "border-[#a5d391]/20";
    const accentShadow = "shadow-[0_0_20px_rgba(165,211,145,0.25)]";

    const navItems = [
        { name: "Command Center", path: "/dashboard/nutritionist", icon: "monitoring" },
        { name: "AI Diet Generator", path: "/ai-diet", icon: "magic_button" },
        { name: "AI Food Analyzer", path: "/ai-image", icon: "center_focus_strong" },
        { name: "AI Health Companion", path: "/ai-chat", icon: "smart_toy" },
        { name: "Clinical Profile", path: "/dashboard/nutritionist/profile", icon: "badge" },
        { name: "Client Roster", path: "/dashboard/nutritionist/clients", icon: "group" },
        { name: "Diet Builder", path: "/dashboard/nutritionist/builder", icon: "restaurant_menu" },
        { name: "Schedule & Bookings", path: "/dashboard/nutritionist/schedule", icon: "event" },
        { name: "Earnings & Ledger", path: "/dashboard/nutritionist/transactions", icon: "receipt_long" },
        { name: "Clinical Reports", path: "/dashboard/nutritionist/reports", icon: "lab_profile" },
        { name: "Stories & Ratings", path: "/testimonials", icon: "rate_review" },
        { name: "Platform Roles Matrix", path: "/user-roles", icon: "grid_view" }
    ];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="h-screen bg-[#080b12] text-white flex font-body-md selection:bg-[#a5d391]/30 selection:text-white relative overflow-hidden">
            {/* Ambient Starfield Background matching Home Page */}
            <Starfield />

            {/* Ambient Lighting Glows */}
            <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#a5d391]/5 blur-[140px] rounded-full pointer-events-none z-0"></div>

            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:flex flex-col w-72 bg-[#080b12]/90 backdrop-blur-2xl border-r border-white/10 relative z-20">
                <div className="p-8 border-b border-white/10 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-32 h-32 ${accentBg} blur-[80px] -translate-x-1/2 -translate-y-1/2 opacity-25 pointer-events-none`}></div>
                    <Link to="/" className="text-xl font-hero-display font-bold flex items-center gap-2 text-white relative z-10">
                        <span className={`material-symbols-outlined ${accentColor} text-2xl drop-shadow-[0_0_8px_rgba(165,211,145,0.4)]`}>nutrition</span>
                        NutriMunch <span className="font-normal italic text-white/50">Nutritionist</span>
                    </Link>
                    <div className="mt-2 text-[10px] font-black text-[#a5d391] uppercase tracking-[0.2em] relative z-10 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#a5d391] animate-pulse"></span>
                        Clinical Console
                    </div>
                </div>

                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item, idx) => {
                        const isActive = location.pathname === item.path || (location.pathname === '/dashboard/nutritionist' && item.path === '/dashboard/nutritionist');
                        return (
                            <Link 
                                key={idx} 
                                to={item.path}
                                className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all duration-300 ${isActive ? `${accentBgLight} ${accentColor} border ${accentBorder} ${accentShadow} backdrop-blur-md` : 'text-white/50 hover:bg-white/5 hover:text-white border border-transparent'}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button onClick={handleLogout} className="flex items-center gap-4 px-4 py-3 rounded-2xl font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full text-left cursor-pointer">
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-grow flex flex-col h-screen w-full relative z-10 overflow-y-auto">
                {/* Header */}
                <header className="h-20 bg-[#080b12]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button 
                            className="lg:hidden text-white/70 hover:text-white"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <span className="material-symbols-outlined text-3xl">menu</span>
                        </button>
                        <h2 className="text-xl font-bold font-hero-display tracking-wide hidden sm:block">NutriMunch <span className={`${accentColor} italic`}>Nutritionist</span></h2>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        {/* Live Nutritionist Wallet Balance */}
                        {walletBalance !== null && (
                            <Link 
                                to="/dashboard/nutritionist/transactions"
                                title="Nutritionist Earnings Wallet — Click to view Transaction History & Ledger"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#a5d391]/10 border border-[#a5d391]/30 hover:border-[#a5d391]/60 text-white text-xs font-bold shadow-sm transition-all group cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[#a5d391] text-base group-hover:scale-110 transition-transform">account_balance_wallet</span>
                                <span className="text-white/60 font-normal text-[11px] hidden sm:inline">Earnings:</span>
                                <span className="text-[#a5d391] font-mono tracking-tight font-bold">₹{walletBalance.toFixed(2)}</span>
                            </Link>
                        )}

                        <button className="relative text-white/60 hover:text-white transition-colors bg-white/5 w-10 h-10 rounded-full flex items-center justify-center border border-white/10 hover:border-white/30 backdrop-blur-md">
                            <span className="material-symbols-outlined text-sm">notifications</span>
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#a5d391] rounded-full border-2 border-[#080b12] shadow-[0_0_6px_rgba(165,211,145,0.8)]"></span>
                        </button>

                        <button 
                            onClick={handleLogout} 
                            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
                            title="Logout"
                        >
                            <span className="material-symbols-outlined text-xl">logout</span>
                        </button>
                        
                        <Link to="/dashboard/nutritionist/profile" className="flex items-center gap-3 pl-3 sm:pl-6 border-l border-white/10 cursor-pointer group">
                            <div className="text-right hidden sm:block">
                                <div className={`text-sm font-bold text-white group-hover:${accentColor} transition-colors`}>{user?.name || user?.username || 'Clinical Specialist'}</div>
                                <div className="text-[10px] text-[#a5d391] uppercase tracking-widest font-black">Algorithmic Biologist</div>
                            </div>
                            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.username || 'Dietitian')}&background=a5d391&color=000`} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-white/20 group-hover:border-[#a5d391] transition-colors shadow-lg" />
                        </Link>
                    </div>
                </header>

                {/* Dashboard Pages Output */}
                <div className="flex-grow p-6 lg:p-12 overflow-x-hidden relative">
                    <div className="relative z-10 h-full max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                    <aside className="w-72 bg-[#080b12] border-r border-white/10 relative z-10 flex flex-col h-full">
                        <div className="p-6 flex justify-between items-center border-b border-white/10">
                            <span className="text-xl font-hero-display font-bold text-white">Menu</span>
                            <button onClick={() => setIsSidebarOpen(false)} className="text-white/50 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                            {navItems.map((item, idx) => {
                                const isActive = location.pathname === item.path || (location.pathname === '/dashboard/nutritionist' && item.path === '/dashboard/nutritionist');
                                return (
                                    <Link 
                                        key={idx} 
                                        to={item.path}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all ${isActive ? `${accentBgLight} ${accentColor}` : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                        {item.name}
                                    </Link>
                                )
                            })}
                        </nav>
                        <div className="p-4 border-t border-white/10">
                            <button 
                                onClick={() => {
                                    setIsSidebarOpen(false);
                                    handleLogout();
                                }} 
                                className="flex items-center gap-4 px-4 py-3 rounded-2xl font-bold text-red-400 hover:bg-red-500/10 transition-colors w-full text-left cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[20px]">logout</span>
                                Logout
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {/* Real-time Wallet SSE Notification Toast */}
            {walletToast && (
                <div className="fixed top-20 right-8 z-[9999] bg-[#0c121e]/95 backdrop-blur-md border border-[#a5d391]/40 text-white px-5 py-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-3 animate-bounce">
                    <span className={`material-symbols-outlined text-xl ${walletToast.isPositive ? 'text-[#a5d391]' : 'text-amber-400'}`}>
                        {walletToast.isPositive ? 'add_circle' : 'account_balance_wallet'}
                    </span>
                    <span className="text-xs font-bold tracking-wide">{walletToast.text}</span>
                </div>
            )}
        </div>
    );
};

export default NutritionistDashboardLayout;
