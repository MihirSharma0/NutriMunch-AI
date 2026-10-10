import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-[#080b12] border-t border-white/10 p-edge-margin w-full mt-auto relative z-20">
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
                    {/* Navigation Quick Links */}
                    <div className="flex flex-wrap justify-center md:justify-end gap-4 sm:gap-6 text-xs font-bold text-white/70">
                        <Link to="/" className="hover:text-[#a5d391] transition-colors">Home</Link>
                        <Link to="/user-roles" className="hover:text-[#a5d391] transition-colors">Platform Roles</Link>
                        <Link to="/ai-diet" className="hover:text-[#a5d391] transition-colors">AI Diet Generator</Link>
                        <Link to="/ai-image" className="hover:text-[#a5d391] transition-colors">AI Food Analyzer</Link>
                        <Link to="/progress" className="hover:text-[#a5d391] transition-colors">Progress Tracker</Link>
                        <Link to="/testimonials" className="hover:text-[#a5d391] transition-colors">Stories & Ratings</Link>
                        <Link to="/pricing" className="hover:text-[#a5d391] transition-colors">Pricing</Link>
                        <Link to="/about" className="hover:text-[#a5d391] transition-colors">About</Link>
                        <Link to="/contact" className="hover:text-[#a5d391] transition-colors">Contact</Link>
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
