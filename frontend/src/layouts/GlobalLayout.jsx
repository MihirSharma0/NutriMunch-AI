import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';
import Starfield from '../components/Starfield';

const GlobalLayout = () => {
    return (
        <div className="flex flex-col min-h-screen relative overflow-hidden bg-[#080b12] text-white selection:bg-[#a3e635]/30 selection:text-white">
            <Starfield />
            {/* Global Ambient Glows for vibrant space theme */}
            <div className="fixed top-[20%] left-0 -translate-x-[40%] -translate-y-1/2 w-[800px] h-[800px] bg-[#a3e635]/15 blur-[160px] rounded-full pointer-events-none z-0"></div>
            <div className="fixed bottom-[20%] right-0 translate-x-[40%] translate-y-1/2 w-[800px] h-[800px] bg-[#0ea5e9]/15 blur-[160px] rounded-full pointer-events-none z-0"></div>

            <Navbar />
            <main className="w-full flex-grow relative z-10 pt-28 sm:pt-32 pb-16 px-4 sm:px-8 max-w-7xl mx-auto">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default GlobalLayout;
