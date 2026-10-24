import React from 'react';

const HowItWorks = () => {
    const steps = [
        {
            num: "01",
            title: "Book Consultation",
            desc: "Schedule a 1-on-1 virtual clinical consultation to baseline your metabolic health and targets.",
            icon: "event_available"
        },
        {
            num: "02",
            title: "Health Assessment",
            desc: "Input blood metrics, BMR data, activity frequency, and personal culinary preferences.",
            icon: "biotech"
        },
        {
            num: "03",
            title: "Personalized Plan",
            desc: "AI synthesizes your custom daily micro & macro targets with full recipe breakdowns.",
            icon: "restaurant_menu"
        },
        {
            num: "04",
            title: "Track & Achieve",
            desc: "Snap meals daily. The AI engine continuously refines your targets to eliminate weight loss plateaus.",
            icon: "monitoring"
        }
    ];

    return (
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-8 relative z-20">
            <div className="text-center mb-16">
                <span className="text-[#a5d391] font-bold tracking-widest uppercase text-xs mb-3 block font-mono">The Methodology</span>
                <h2 className="font-hero-display text-3xl sm:text-5xl font-bold text-white mb-4">How NutriMunch AI Works</h2>
                <p className="text-white/60 text-base max-w-xl mx-auto">From biological assessment to closed-loop adaptive meal reprogramming.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                {steps.map((step, idx) => (
                    <div key={idx} className="relative z-10 flex flex-col text-left group bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 hover:border-[#a5d391]/50 transition-all duration-300">
                        <div className="w-14 h-14 rounded-2xl bg-[#a5d391]/15 text-[#a5d391] flex items-center justify-center font-black text-lg mb-6 group-hover:scale-110 transition-transform">
                            {step.num}
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#a5d391] transition-colors">{step.title}</h3>
                        <p className="text-white/50 text-sm leading-relaxed max-w-xs">{step.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default HowItWorks;
