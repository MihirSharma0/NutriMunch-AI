import React from 'react';

const WhyClientsTrustUs = () => {
    return (
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-8 relative z-20">
            <div className="bg-white/5 border border-white/10 rounded-[3rem] p-6 sm:p-12 md:p-20 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuCUQW1ayK2QptnJC4qRpFZJQfK25SrdzXBlBBKDdfgFsY3fbK5Q9MBP4F2v2a6cli_nEXhYxZdynfefZ9y6wd9ardu7fb6hI4n4NzwrwE4B--Y4wqSMdeuOKZZfTXGlE55PD6O95ZslKGxZFe9jEyC5O4jQKnL_jnYppX1ixe10PJAE_5uvWDiX9c_vA5cz5JtDILmRAtwTwIPmdRfsDOx7e2W8rsEiFw4gzv8YSmBzQ-2grz1UCn8l')] bg-cover bg-center opacity-5 mix-blend-screen pointer-events-none"></div>

                <h2 className="font-hero-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 relative z-10">Why Users Trust Us</h2>
                <p className="text-white/60 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed mb-10 sm:mb-16 relative z-10">
                    Trust isn't given; it's earned through consistent, measurable results and unwavering ethical standards in data privacy and clinical care.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative z-10 text-left">
                    <div className="bg-[#080b12]/50 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-md hover:-translate-y-2 transition-transform">
                        <span className="material-symbols-outlined text-primary text-4xl mb-6">shield_locked</span>
                        <h4 className="text-xl font-bold text-white mb-3">HIPAA Compliant</h4>
                        <p className="text-white/50 text-sm leading-relaxed">Your biometric and nutritional data is encrypted end-to-end. We never sell your data to third parties.</p>
                    </div>
                    <div className="bg-[#080b12]/50 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-md hover:-translate-y-2 transition-transform">
                        <span className="material-symbols-outlined text-[#38bdf8] text-4xl mb-6">verified_user</span>
                        <h4 className="text-xl font-bold text-white mb-3">Licensed Clinicians</h4>
                        <p className="text-white/50 text-sm leading-relaxed">Every protocol is overseen and approved by Registered Nutritionists and medical professionals.</p>
                    </div>
                    <div className="bg-[#080b12]/50 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-md hover:-translate-y-2 transition-transform">
                        <span className="material-symbols-outlined text-[#a5d391] text-4xl mb-6">assignment_turned_in</span>
                        <h4 className="text-xl font-bold text-white mb-3">Guaranteed Results</h4>
                        <p className="text-white/50 text-sm leading-relaxed">If you follow the protocol with 90% adherence and don't see results, we refund your investment entirely.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WhyClientsTrustUs;
