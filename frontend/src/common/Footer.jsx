/**
 * Global Footer Component
 * Renders the bottom site footer with brand mission statement, dynamic role-based navigation links,
 * and system copyright information.
 */
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getNavItemsForRole } from './Navbar';

/**
 * Flattens and deduplicates navigation links suitable for display in the footer.
 * 
 * @param {Object|null} user - Authenticated user object
 * @returns {Array<Object>} Flattened array of navigation link items
 */
const getFooterNavItems = (user) => {
    const navItems = getNavItemsForRole(user);
    const flattened = [];
    const seenPaths = new Set();

    navItems.forEach(item => {
        if (item.subMenu) {
            item.subMenu.forEach(sub => {
                if (sub.path && !seenPaths.has(sub.path)) {
                    seenPaths.add(sub.path);
                    flattened.push({ label: sub.label, path: sub.path });
                }
            });
        }
        if (item.path && !seenPaths.has(item.path)) {
            seenPaths.add(item.path);
            flattened.push({ label: item.label, path: item.path });
        }
    });

    return flattened;
};

/**
 * Footer Component
 * Visual site footer displaying quick links, company bio, and copyright metadata.
 */
const Footer = () => {
    const { user } = useContext(AuthContext);
    const { isDark } = useTheme();
    const navItems = getFooterNavItems(user);

    return (
        <footer className={`border-t p-edge-margin w-full mt-auto relative z-1 transition-colors duration-300 ${
            isDark ? 'bg-[#080b12] border-white/10 text-white' : 'bg-white/80 border-slate-200 text-slate-800'
        }`}>
            <div className="flex flex-col md:flex-row justify-between items-center w-full max-w-7xl mx-auto gap-8 py-12 px-6">
                <div className="space-y-4 text-center md:text-left">
                    <div className={`font-headline-lg text-2xl font-black tracking-tighter flex items-center justify-center md:justify-start gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <span className="w-3 h-3 bg-[#a5d391] rounded-full shadow-[0_0_10px_rgba(165,211,145,0.8)]"></span>
                        NutriMunch <span className={`${isDark ? 'text-[#a5d391]' : 'text-emerald-600'} italic font-semibold`}>AI</span>
                    </div>
                    <p className={`font-body-md max-w-xs text-xs leading-relaxed font-medium ${isDark ? 'text-white/50' : 'text-slate-600'}`}>
                        Precision nutrition through NutriMunch AI. Elevating human health via autonomous dietary calibration and biometric intelligence.
                    </p>
                </div>

                <div className="flex flex-col items-center md:items-end gap-6">
                    {/* Dynamic Role Navigation Quick Links matching Navbar */}
                    <div className={`flex flex-wrap justify-center md:justify-end gap-3 sm:gap-5 text-xs font-bold max-w-2xl ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                        {navItems.map((item) => (
                            <Link 
                                key={item.path + item.label} 
                                to={item.path} 
                                className={`transition-colors px-2 py-1 rounded-lg ${
                                    isDark ? 'hover:text-[#a5d391] hover:bg-white/5' : 'hover:text-emerald-700 hover:bg-slate-100'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <p className={`text-[10px] font-label-caps uppercase tracking-[0.3em] font-black text-center md:text-right ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                        © 2026 NUTRIMUNCH AI. ALL PLATFORM ENGINES OPERATIONAL.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
