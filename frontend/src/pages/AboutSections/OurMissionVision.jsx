import React from 'react';

const OurMissionVision = () => {
    return (
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-8 relative z-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12 lg:gap-24">
                <div className="bg-white/5 border border-white/10 p-6 sm:p-10 md:p-14 rounded-3xl hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-primary text-5xl mb-6">flag</span>
                    <h2 className="font-hero-display text-3xl sm:text-4xl font-bold text-white mb-6">Our Mission</h2>
                    <p className="text-white/70 text-base sm:text-lg leading-relaxed">
                        To democratize access to clinical-grade, personalized nutrition through the ethical application of artificial intelligence. We strive to eradicate generic dietary advice and empower individuals with actionable, data-driven protocols that optimize their biological potential.
                    </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 sm:p-10 md:p-14 rounded-3xl hover:bg-[#38bdf8]/10 hover:border-[#38bdf8]/30 transition-colors">
                    <span className="material-symbols-outlined text-[#38bdf8] text-5xl mb-6">visibility</span>
                    <h2 className="font-hero-display text-3xl sm:text-4xl font-bold text-white mb-6">Our Vision</h2>
                    <p className="text-white/70 text-base sm:text-lg leading-relaxed">
                        A future where chronic metabolic diseases are entirely preventable through proactive, autonomous nutritional guidance. We envision a world where your daily food intake is perfectly synchronized with your real-time physiological needs.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default OurMissionVision;
