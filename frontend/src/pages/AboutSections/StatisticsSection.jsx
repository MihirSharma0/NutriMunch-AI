import React from 'react';

const StatisticsSection = () => {
    return (
        <section className="py-16 sm:py-24 relative z-20 bg-black/40 border-y border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4 sm:gap-8 md:gap-12 text-center divide-x divide-white/10">
                    <div>
                        <div className="text-3xl sm:text-5xl md:text-6xl font-black text-white mb-2 font-hero-display">24k+</div>
                        <div className="text-[#a5d391] text-xs sm:text-sm font-bold uppercase tracking-widest">Active Users</div>
                    </div>
                    <div>
                        <div className="text-3xl sm:text-5xl md:text-6xl font-black text-white mb-2 font-hero-display">1.2M</div>
                        <div className="text-[#38bdf8] text-xs sm:text-sm font-bold uppercase tracking-widest">Meals Logged</div>
                    </div>
                    <div>
                        <div className="text-3xl sm:text-5xl md:text-6xl font-black text-white mb-2 font-hero-display">94%</div>
                        <div className="text-primary text-xs sm:text-sm font-bold uppercase tracking-widest">Success Rate</div>
                    </div>
                    <div>
                        <div className="text-3xl sm:text-5xl md:text-6xl font-black text-white mb-2 font-hero-display">50+</div>
                        <div className="text-[#a5d391] text-xs sm:text-sm font-bold uppercase tracking-widest">Clinical Partners</div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default StatisticsSection;
