import React from 'react';

const Values = () => {
    const values = [
        { title: "Scientific Rigor", desc: "We don't follow trends. Every protocol we build is deeply rooted in verified clinical data and peer-reviewed literature." },
        { title: "Radical Transparency", desc: "You have complete access to the reasoning behind every macronutrient shift and dietary recommendation." },
        { title: "Bio-Individuality", desc: "We honor the absolute uniqueness of your physiological makeup, never forcing you into a pre-packaged dietary box." },
        { title: "Sustainable Autonomy", desc: "Our ultimate goal is to educate you so thoroughly that you eventually no longer need our services." }
    ];

    return (
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-8 relative z-20">
            <div className="text-center mb-16">
                <h2 className="font-hero-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">Our Core Values</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {values.map((val, idx) => (
                    <div key={idx} className="bg-gradient-to-b from-white/10 to-transparent border border-white/10 rounded-2xl p-6 sm:p-8 hover:-translate-y-2 transition-transform duration-300">
                        <div className="text-[#a5d391] font-hero-display text-5xl font-black mb-4 opacity-50">0{idx + 1}</div>
                        <h3 className="text-xl font-bold text-white mb-4">{val.title}</h3>
                        <p className="text-white/60 leading-relaxed text-sm">{val.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Values;
