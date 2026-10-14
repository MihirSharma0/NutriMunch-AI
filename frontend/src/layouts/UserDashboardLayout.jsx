import React, { useState, useContext } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Starfield from '../components/Starfield';
import ConsultationChatModal from '../components/ConsultationChatModal';

const UserDashboardLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isConsultationChatOpen, setIsConsultationChatOpen] = useState(false);

    // Signature Theme (#a5d391 / Mint / #080b12)
    const accentColor = "text-[#a5d391]";
    const accentBg = "bg-[#a5d391]";
    const accentBgLight = "bg-[#a5d391]/10";
    const accentBorder = "border-[#a5d391]/20";
    const accentShadow = "shadow-[0_0_20px_rgba(165,211,145,0.25)]";

    const navItems = [
        { name: "Overview", path: "/dashboard/user", icon: "dashboard" },
        { name: "Progress Tracking", path: "/dashboard/user/progress", icon: "monitoring" },
        { name: "Diet Plans", path: "/dashboard/user/diet-plans", icon: "restaurant_menu" },
        { name: "Appointments", path: "/dashboard/user/appointments", icon: "calendar_month" },
        { name: "Reports", path: "/dashboard/user/reports", icon: "lab_profile" },
        { name: "AI Chat Assistant", path: "/dashboard/user/ai-chat", icon: "smart_toy" },
        { name: "AI Diet Generator", path: "/dashboard/user/ai-diet", icon: "magic_button" },
        { name: "AI Food Analyzer", path: "/dashboard/user/ai-image", icon: "center_focus_strong" },
        { name: "Stories & Ratings", path: "/testimonials", icon: "rate_review" },
        { name: "Platform Roles", path: "/user-roles", icon: "badge" },
        { name: "My Profile", path: "/dashboard/user/profile", icon: "person" }
    ];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="h-screen bg-[#080b12] text-white flex font-body-md selection:bg-[#a5d391]/30 selection:text-white relative overflow-hidden">
            {/* Ambient Starfield Background */}
            <Starfield />

            {/* Ambient Glows */}
            <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#a5d391]/5 blur-[140px] rounded-full pointer-events-none z-0"></div>

            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:flex flex-col w-72 bg-[#080b12]/90 backdrop-blur-2xl border-r border-white/10 relative z-20">
                <div className="p-8 border-b border-white/10 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-32 h-32 ${accentBg} blur-[80px] -translate-x-1/2 -translate-y-1/2 opacity-25 pointer-events-none`}></div>
                    <Link to="/" className="text-xl font-hero-display font-bold flex items-center gap-2 text-white relative z-10">
                        <span className={`material-symbols-outlined ${accentColor} text-2xl drop-shadow-[0_0_8px_rgba(165,211,145,0.4)]`}>nutrition</span>
                        NutriMunch <span className="font-normal italic text-white/50">User</span>
                    </Link>
                    <div className="mt-2 text-[10px] font-black text-[#a5d391] uppercase tracking-[0.2em] relative z-10 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#a5d391] animate-pulse"></span>
                        Member Portal
                    </div>
                </div>

                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item, idx) => {
                        const isActive = location.pathname === item.path || (location.pathname === '/dashboard/user' && item.path === '/dashboard/user');
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
                <header className="min-h-[4.5rem] bg-[#080b12]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 lg:px-10 py-3 sticky top-0 z-30 shadow-md">
                    <div className="flex items-center gap-4 py-1">
                        <button 
                            className="lg:hidden text-white/70 hover:text-white p-1 rounded-lg transition-colors"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <span className="material-symbols-outlined text-2xl">menu</span>
                        </button>
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg lg:text-xl font-bold font-hero-display tracking-wide text-white flex items-center gap-2">
                                <span>NutriMunch</span>
                                <span className={`${accentColor} italic font-semibold`}>Health Suite</span>
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Dietitian Consultation Chat Header Button */}
                        <button 
                            type="button"
                            onClick={() => setIsConsultationChatOpen(true)}
                            className="relative text-white/70 hover:text-[#a5d391] transition-all bg-white/5 hover:bg-white/10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border border-white/10 hover:border-[#a5d391]/40 backdrop-blur-md shadow-sm cursor-pointer"
                            title="Consultation Chat with Dietitian"
                        >
                            <span className="material-symbols-outlined text-lg sm:text-xl">forum</span>
                        </button>

                        {/* Notification Bell Button */}
                        <button className="relative text-white/70 hover:text-white transition-all bg-white/5 hover:bg-white/10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border border-white/10 hover:border-white/20 backdrop-blur-md shadow-sm">
                            <span className="material-symbols-outlined text-lg sm:text-xl">notifications</span>
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#a5d391] rounded-full shadow-[0_0_6px_rgba(165,211,145,0.8)]"></span>
                        </button>

                        {/* Mobile Logout Button */}
                        <button 
                            onClick={handleLogout} 
                            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
                            title="Logout"
                        >
                            <span className="material-symbols-outlined text-lg">logout</span>
                        </button>
                        
                        {/* Vertical Separator Divider */}
                        <div className="h-7 w-[1px] bg-white/15 mx-1 hidden sm:block"></div>

                        {/* User Profile Info Pill */}
                        <Link to="/dashboard/user/profile" className="flex items-center gap-3 py-1 px-2 sm:px-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group">
                            <div className="text-right hidden sm:block leading-tight">
                                <div className={`text-sm font-bold text-white group-hover:${accentColor} transition-colors tracking-tight`}>
                                    {user?.name || user?.username || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User')}
                                </div>
                                <div className="text-[11px] text-white/60 font-medium tracking-tight mt-0.5">
                                    {user?.email || 'user@example.com'}
                                </div>
                            </div>
                            <div className="relative">
                                <img 
                                    src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.username || user?.email || 'User')}&background=a5d391&color=000`} 
                                    alt="Avatar" 
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-white/20 group-hover:border-[#a5d391] transition-all shadow-md" 
                                />
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#080b12] rounded-full"></span>
                            </div>
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
                                const isActive = location.pathname === item.path || (location.pathname === '/dashboard/user' && item.path === '/dashboard/user');
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

            {/* Floating Consultation Chat Widget Launcher */}
            <button
                type="button"
                onClick={() => setIsConsultationChatOpen(true)}
                className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-[#a5d391] to-[#7ec362] text-black font-extrabold p-3 sm:px-5 sm:py-3.5 rounded-full shadow-[0_0_25px_rgba(165,211,145,0.4)] hover:shadow-[0_0_35px_rgba(165,211,145,0.8)] hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                title="Consultation Chat with Dietitian"
            >
                <span className="material-symbols-outlined text-xl">forum</span>
                <span className="hidden sm:inline text-xs uppercase tracking-wider font-bold">Dietitian Chat</span>
            </button>

            {/* Consultation Chat Modal */}
            {isConsultationChatOpen && (
                <ConsultationChatModal
                    isOpen={isConsultationChatOpen}
                    onClose={() => setIsConsultationChatOpen(false)}
                    currentUser={user}
                />
            )}
        </div>
    );
};

export default UserDashboardLayout;
