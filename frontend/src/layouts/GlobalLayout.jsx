/**
 * Global Application Layout
 * Outer layout frame providing animated background starfields, ambient gradient lighting,
 * persistent navigation header, live wallet SSE synchronization, dynamic router outlet, and footer.
 */
import React, { useContext, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';
import MobileBottomNav from '../common/MobileBottomNav';
import Starfield from '../components/Starfield';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { subscribeWalletSse } from '../utils/walletSse';

/**
 * GlobalLayout Component
 * Renders the persistent shell around all child routes, managing wallet SSE subscriptions
 * and adjusting header/footer visibility for specialized pages like consultation chat.
 */
const GlobalLayout = () => {
    const { user } = useContext(AuthContext);
    const { isDark } = useTheme();
    const { pathname } = useLocation();
    const isConsultationChat = pathname === '/consultation-chat';

    useEffect(() => {
        if (!user) return;
        // Keep one listener registered for the whole session so the shared SSE
        // stream is not torn down when individual pages unmount. The balance is
        // fetched once here and then only updated by server pushes.
        const unsubscribe = subscribeWalletSse(user, () => { });
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user?.id, user?.userId, user?.email]);

    return (
        <div className={`relative flex flex-col overflow-hidden transition-colors duration-500 ${
            isDark
                ? 'bg-[#080b12] text-white selection:bg-[#a3e635]/30 selection:text-white'
                : 'bg-gradient-to-br from-[#e0f2fe] via-[#f3e8ff] to-[#ecfdf5] text-slate-900 selection:bg-emerald-200 selection:text-emerald-900'
        } ${isConsultationChat ? 'h-dvh max-h-dvh min-h-0' : 'min-h-screen'}`}>
            <Starfield />
            {/* Ambient Glows: Space glow in dark, and light blue / purple / mint glows in light mode */}
            {isDark ? (
                <>
                    <div className="fixed top-[20%] left-0 -translate-x-[40%] -translate-y-1/2 w-[800px] h-[800px] bg-[#a3e635]/15 blur-[160px] rounded-full pointer-events-none z-0"></div>
                    <div className="fixed bottom-[20%] right-0 translate-x-[40%] translate-y-1/2 w-[800px] h-[800px] bg-[#0ea5e9]/15 blur-[160px] rounded-full pointer-events-none z-0"></div>
                </>
            ) : (
                <>
                    <div className="fixed top-[15%] left-0 -translate-x-[30%] -translate-y-1/2 w-[850px] h-[850px] bg-[#38bdf8]/20 blur-[180px] rounded-full pointer-events-none z-0"></div>
                    <div className="fixed top-[45%] right-0 translate-x-[30%] -translate-y-1/2 w-[850px] h-[850px] bg-[#c084fc]/15 blur-[180px] rounded-full pointer-events-none z-0"></div>
                    <div className="fixed bottom-[10%] left-[20%] w-[750px] h-[750px] bg-[#34d399]/20 blur-[180px] rounded-full pointer-events-none z-0"></div>
                </>
            )}

            <Navbar />
            <main className={`relative w-full flex-grow ${isConsultationChat
                ? 'min-h-0 overflow-hidden px-0 pt-20 sm:pt-[5.5rem] pb-0 sm:pb-4 flex flex-col flex-1'
                : 'px-4 pt-24 pb-28 sm:px-8 sm:pt-32 sm:pb-16'} ${isConsultationChat ? 'max-w-none' : 'mx-auto max-w-7xl'}`}>
                <Outlet />
            </main>
            {!isConsultationChat && (
                <div className="pb-24 lg:pb-0">
                    <Footer />
                </div>
            )}
            <MobileBottomNav />
        </div>
    );
};

export default GlobalLayout;
