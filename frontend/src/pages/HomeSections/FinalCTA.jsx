import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const FinalCTA = () => {
    const { user } = useContext(AuthContext);
    const role = String(user?.role || '').toUpperCase().replace('ROLE_', '');
    const isAdmin = role === 'ADMIN';
    const isNutritionist = role === 'NUTRITIONIST';
    const ctaContent = isAdmin
        ? {
            title: <>Platform Administration <br className="hidden md:block"/>& Controls</>,
            description: 'Manage users, diet plans, payments, and platform operations from the administrative control center.',
            path: '/dashboard/admin',
            label: 'Open Admin Dashboard'
        }
        : isNutritionist
            ? {
                title: <>Clinical Operations <br className="hidden md:block"/>& Schedule</>,
                description: 'Review your patient appointments, manage consultation availability, and keep your clinical workflow organized.',
                path: '/dashboard/nutritionist/schedule',
                label: 'Open Clinical Schedule'
            }
            : {
                title: <>Schedule One-on-One <br className="hidden md:block"/>Consultations</>,
                description: 'Review your AI diet scans with registered clinical dietitians and sports nutrition doctors for certified biometric validation.',
                path: '/dashboard/user/appointments',
                label: 'Book Appointment Now'
            };

    return (
        <section className="pt-20 pb-8 relative z-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-8">
                <div className="bg-gradient-to-r from-[#4a6741] to-[#a5d391] rounded-[2.5rem] p-8 sm:p-14 md:p-16 text-center text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuCUQW1ayK2QptnJC4qRpFZJQfK25SrdzXBlBBKDdfgFsY3fbK5Q9MBP4F2v2a6cli_nEXhYxZdynfefZ9y6wd9ardu7fb6hI4n4NzwrwE4B--Y4wqSMdeuOKZZfTXGlE55PD6O95ZslKGxZFe9jEyC5O4jQKnL_jnYppX1ixe10PJAE_5uvWDiX9c_vA5cz5JtDILmRAtwTwIPmdRfsDOx7e2W8rsEiFw4gzv8YSmBzQ-2grz1UCn8l')] bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none"></div>

                    <div className="relative z-10">
                        <span className="inline-block px-3 py-1 rounded-full bg-black/20 text-white text-xs font-bold uppercase tracking-widest mb-4">
                            Certified Clinical Nutritionists
                        </span>
                        <h2 className="font-hero-display text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
                            {ctaContent.title}
                        </h2>
                        <p className="text-white/90 font-medium text-lg md:text-xl max-w-2xl mx-auto mb-10">
                            {ctaContent.description}
                        </p>

                        <div className="flex justify-center items-center">
                            <Link
                                to={ctaContent.path}
                                className="bg-[#080b12] text-white px-8 py-4 rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-xl flex items-center gap-3 cursor-pointer"
                            >
                                <span>{ctaContent.label}</span>
                                <span className="material-symbols-outlined text-primary text-xl">arrow_forward</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FinalCTA;
