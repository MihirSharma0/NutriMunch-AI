import React from 'react';

const HowItWorks = () => {
    const steps = [
        {
            num: "01",
            title: "Book Consultation",
            desc: "Schedule a comprehensive 1-on-1 session with our clinical nutritionists to map out your baseline and objectives.",
            icon: "event_available"
        },
        {
            num: "02",
            title: "Health Assessment",
            desc: "We analyze your blood work, metabolic rate, and lifestyle factors to create your unique biometric profile.",
            icon: "biotech"
        },
        {
            num: "03",
            title: "Personalized Plan",
            desc: "Our AI engine generates a dynamic, meal-by-meal nutritional protocol tailored exactly to your body's needs.",
            icon: "restaurant_menu"
        },
        {
            num: "04",
            title: "Track & Achieve",
            desc: "Log your progress daily. The system learns and adapts your protocol automatically to prevent plateaus.",
            icon: "monitoring"
        }
    ];

    return (
        <section className="pt-12 pb-16 sm:pb-24 max-w-7xl mx-auto px-4 sm:px-8 relative z-20">
            <div className="text-center mb-20">
                <span className="text-primary font-bold tracking-widest uppercase text-sm mb-4 block">The Process</span>
                <h2 className="font-hero-display text-4xl md:text-5xl font-bold text-white mb-6">How It Works</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                {/* Connecting Line */}
                <div className="hidden lg:block absolute top-12 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                
                {steps.map((step, idx) => (
                    <div key={idx} className="relative z-10 flex flex-col items-center text-center group">
                        <div className="w-24 h-24 bg-black/50 shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 rounded-full flex items-center justify-center mb-6 group-hover:border-primary/50 transition-all relative group-hover:-translate-y-2 duration-500">
                            <span className="material-symbols-outlined text-3xl text-white/50 group-hover:text-primary transition-colors">{step.icon}</span>
                            <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold text-sm">
                                {step.num}
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors">{step.title}</h3>
                        <p className="text-white/50 text-sm leading-relaxed max-w-xs">{step.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default HowItWorks;
