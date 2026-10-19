import React from 'react';
import { Link } from 'react-router-dom';

const FinalCTA = () => {
    return (
        <section className="py-20 relative z-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-8">
                <div className="bg-gradient-to-r from-primary to-primary-container rounded-[3rem] p-6 sm:p-10 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-primary/20">
                    <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuCUQW1ayK2QptnJC4qRpFZJQfK25SrdzXBlBBKDdfgFsY3fbK5Q9MBP4F2v2a6cli_nEXhYxZdynfefZ9y6wd9ardu7fb6hI4n4NzwrwE4B--Y4wqSMdeuOKZZfTXGlE55PD6O95ZslKGxZFe9jEyC5O4jQKnL_jnYppX1ixe10PJAE_5uvWDiX9c_vA5cz5JtDILmRAtwTwIPmdRfsDOx7e2W8rsEiFw4gzv8YSmBzQ-2grz1UCn8l')] bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <h2 className="font-hero-display text-4xl md:text-6xl font-black text-[#080b12] mb-6 tracking-tight">
                            Stop Guessing. <br className="hidden md:block"/>Start Optimizing.
                        </h2>
                        <p className="text-[#080b12]/80 font-medium text-lg md:text-xl max-w-2xl mx-auto mb-10">
                            Join thousands of others who have transformed their bodies and minds with our clinical, AI-driven nutritional protocols.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                            <Link 
                                to="/appointments" 
                                className="bg-[#080b12] text-white px-10 py-5 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl flex items-center gap-3 cursor-pointer"
                            >
                                <span>Schedule Consultation</span>
                                <span className="material-symbols-outlined text-primary text-xl">arrow_forward</span>
                            </Link>
                            <Link 
                                to="/pricing" 
                                className="bg-white/20 text-[#080b12] border border-[#080b12]/10 backdrop-blur-md px-10 py-5 rounded-full font-bold text-lg hover:bg-white/30 transition-colors flex items-center gap-3 cursor-pointer"
                            >
                                <span>View Pricing</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FinalCTA;
