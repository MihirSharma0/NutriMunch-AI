import React from 'react';

const OurApproach = () => {
    return (
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-8 relative z-20">
            <div className="text-center mb-16">
                <span className="text-primary font-bold tracking-widest uppercase text-sm mb-4 block">Methodology</span>
                <h2 className="font-hero-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">Our Approach</h2>
                <p className="text-white/60 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
                    We bridge the gap between rigorous scientific research and daily culinary habits. Our methodology is built on three foundational pillars that guarantee sustainable success.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                {[
                    { title: "Clinical Baseline", desc: "We start with hard data. Blood panels, DNA markers, and microbiome analysis form the absolute foundation of your protocol.", icon: "biotech" },
                    { title: "Algorithmic Adjustments", desc: "As your body changes, so does your protocol. Our AI constantly recalibrates your macros to prevent metabolic adaptation and plateaus.", icon: "tune" },
                    { title: "Behavioral Integration", desc: "Data is useless without compliance. We integrate neuro-behavioral tactics to ensure your new dietary habits become second nature.", icon: "psychology" }
                ].map((item, idx) => (
                    <div key={idx} className="relative p-6 sm:p-8 border-l border-white/20 hover:border-primary transition-colors">
                        <div className="absolute top-8 -left-[17px] w-8 h-8 bg-[#080b12] rounded-full border border-white/20 flex items-center justify-center">
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                        </div>
                        <span className="material-symbols-outlined text-4xl text-primary mb-4 pl-4">{item.icon}</span>
                        <h3 className="text-2xl font-bold text-white mb-4 pl-4">{item.title}</h3>
                        <p className="text-white/60 leading-relaxed pl-4">{item.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default OurApproach;
