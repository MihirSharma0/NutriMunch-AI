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
import { subscribeWalletSse } from '../utils/walletSse';

/**
 * GlobalLayout Component
 * Renders the persistent shell around all child routes, managing wallet SSE subscriptions
 * and adjusting header/footer visibility for specialized pages like consultation chat.
 */
const GlobalLayout = () => {
    const { user } = useContext(AuthContext);
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
        <div className={`relative flex flex-col overflow-hidden bg-[#080b12] text-white selection:bg-[#a3e635]/30 selection:text-white ${isConsultationChat ? 'h-dvh max-h-dvh min-h-0' : 'min-h-screen'}`}>
            <Starfield />
            {/* Global Ambient Glows for vibrant space theme */}
            <div className="fixed top-[20%] left-0 -translate-x-[40%] -translate-y-1/2 w-[800px] h-[800px] bg-[#a3e635]/15 blur-[160px] rounded-full pointer-events-none z-0"></div>
            <div className="fixed bottom-[20%] right-0 translate-x-[40%] translate-y-1/2 w-[800px] h-[800px] bg-[#0ea5e9]/15 blur-[160px] rounded-full pointer-events-none z-0"></div>

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
