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
                title: <>Clinical Schedule <br className="hidden md:block"/>& Bookings</>,
                description: 'Book and manage clinical nutrition consultations with qualified nutritionists through one secure, organized schedule.',
                path: '/dashboard/user/appointments',
                label: 'Open User Appointments'
            };

    return (
        <section className="py-20 relative z-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-8">
                <div className="bg-gradient-to-r from-primary to-primary-container rounded-[3rem] p-6 sm:p-10 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-primary/20">
                    <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuCUQW1ayK2QptnJC4qRpFZJQfK25SrdzXBlBBKDdfgFsY3fbK5Q9MBP4F2v2a6cli_nEXhYxZdynfefZ9y6wd9ardu7fb6hI4n4NzwrwE4B--Y4wqSMdeuOKZZfTXGlE55PD6O95ZslKGxZFe9jEyC5O4jQKnL_jnYppX1ixe10PJAE_5uvWDiX9c_vA5cz5JtDILmRAtwTwIPmdRfsDOx7e2W8rsEiFw4gzv8YSmBzQ-2grz1UCn8l')] bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none"></div>

                    <div className="relative z-10">
                        <h2 className="font-hero-display text-4xl md:text-6xl font-black text-[#080b12] mb-6 tracking-tight">
                            {ctaContent.title}
                        </h2>
                        <p className="text-[#080b12]/80 font-medium text-lg md:text-xl max-w-2xl mx-auto mb-10">
                            {ctaContent.description}
                        </p>

                        <div className="flex justify-center items-center">
                            <Link
                                to={ctaContent.path}
                                className="bg-[#080b12] text-white px-10 py-5 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl flex items-center gap-3 cursor-pointer"
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
