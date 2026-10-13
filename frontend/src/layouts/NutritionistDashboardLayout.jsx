import React, { useState, useContext } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Starfield from '../components/Starfield';

const NutritionistDashboardLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Signature Theme (#a5d391 / Mint / #080b12)
    const accentColor = "text-[#a5d391]";
    const accentBg = "bg-[#a5d391]";
    const accentBgLight = "bg-[#a5d391]/10";
    const accentBorder = "border-[#a5d391]/20";
    const accentShadow = "shadow-[0_0_20px_rgba(165,211,145,0.25)]";

    const navItems = [
        { name: "Command Center", path: "/dashboard/nutritionist", icon: "monitoring" },
        { name: "Clinical Profile", path: "/dashboard/nutritionist/profile", icon: "badge" },
        { name: "Diet Builder", path: "/dashboard/nutritionist/builder", icon: "restaurant_menu" },
        { name: "Schedule & Bookings", path: "/dashboard/nutritionist/schedule", icon: "event" },
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
        </div>
    );
};

export default NutritionistDashboardLayout;
