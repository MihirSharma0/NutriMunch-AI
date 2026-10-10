import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getNavItemsForRole } from './Navbar';

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

const Footer = () => {
    const { user } = useContext(AuthContext);
    const navItems = getFooterNavItems(user);

    return (
        <footer className="bg-[#080b12] border-t border-white/10 p-edge-margin w-full mt-auto relative z-1">
            <div className="flex flex-col md:flex-row justify-between items-center w-full max-w-7xl mx-auto gap-8 py-12 px-6">
                <div className="space-y-4 text-center md:text-left">
                    <div className="font-headline-lg text-2xl font-black text-white tracking-tighter flex items-center justify-center md:justify-start gap-2">
                        <span className="w-3 h-3 bg-[#a5d391] rounded-full shadow-[0_0_10px_rgba(165,211,145,0.8)]"></span>
                        NutriMunch <span className="text-[#a5d391] italic font-semibold">AI</span>
                    </div>
                    <p className="font-body-md text-white/50 max-w-xs text-xs leading-relaxed font-medium">
                        Precision nutrition through NutriMunch AI. Elevating human health via autonomous dietary calibration and biometric intelligence.
                    </p>
                </div>

                <div className="flex flex-col items-center md:items-end gap-6">
                    {/* Dynamic Role Navigation Quick Links matching Navbar */}
                    <div className="flex flex-wrap justify-center md:justify-end gap-3 sm:gap-5 text-xs font-bold text-white/70 max-w-2xl">
                        {navItems.map((item) => (
                            <Link 
                                key={item.path + item.label} 
                                to={item.path} 
                                className="hover:text-[#a5d391] transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <p className="text-white/30 text-[10px] font-label-caps uppercase tracking-[0.3em] font-black text-center md:text-right">
                        © 2026 NUTRIMUNCH AI. ALL PLATFORM ENGINES OPERATIONAL.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
