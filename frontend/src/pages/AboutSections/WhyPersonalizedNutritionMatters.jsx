import React from 'react';

const WhyPersonalizedNutritionMatters = () => {
    return (
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-8 relative z-20">
            <div className="bg-[#111827] border border-white/5 rounded-[3rem] overflow-hidden flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 p-6 sm:p-12 md:p-20">
                    <span className="text-[#38bdf8] font-bold tracking-widest uppercase text-sm mb-4 block">The Paradigm Shift</span>
                    <h2 className="font-hero-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">Why Personalized Nutrition Matters</h2>
                    <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-8">
                        The one-size-fits-all approach to dieting is fundamentally flawed. Two individuals eating the exact same meal can have drastically different glycemic responses based on their microbiome, genetics, and insulin sensitivity.
                    </p>
                    <p className="text-white/60 text-base sm:text-lg leading-relaxed">
                        Personalized nutrition takes the guesswork out of eating by aligning your dietary intake directly with your body's unique biological signature, resulting in faster, safer, and highly sustainable health outcomes.
                    </p>
                </div>
                <div className="md:w-1/2 min-h-[240px] sm:min-h-[320px] md:min-h-full w-full relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#111827] to-transparent z-10 hidden md:block"></div>
                    <img 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUQW1ayK2QptnJC4qRpFZJQfK25SrdzXBlBBKDdfgFsY3fbK5Q9MBP4F2v2a6cli_nEXhYxZdynfefZ9y6wd9ardu7fb6hI4n4NzwrwE4B--Y4wqSMdeuOKZZfTXGlE55PD6O95ZslKGxZFe9jEyC5O4jQKnL_jnYppX1ixe10PJAE_5uvWDiX9c_vA5cz5JtDILmRAtwTwIPmdRfsDOx7e2W8rsEiFw4gzv8YSmBzQ-2grz1UCn8l" 
                        alt="Data Analysis" 
                        className="w-full h-full object-cover opacity-60 mix-blend-screen"
                    />
                </div>
            </div>
        </section>
    );
};

export default WhyPersonalizedNutritionMatters;
