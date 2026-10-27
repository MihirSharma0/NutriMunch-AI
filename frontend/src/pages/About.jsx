import React, { useState, useRef } from 'react';
import OurMissionVision from './AboutSections/OurMissionVision';
import OurApproach from './AboutSections/OurApproach';
import WhyPersonalizedNutritionMatters from './AboutSections/WhyPersonalizedNutritionMatters';
import ExpandedTeam from './AboutSections/ExpandedTeam';
import Values from './AboutSections/Values';
import StatisticsSection from './AboutSections/StatisticsSection';
import WhyClientsTrustUs from './AboutSections/WhyClientsTrustUs';

const TiltCard = ({ children, className }) => {
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const cardRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const rotateX = ((y / rect.height) - 0.5) * -15;
        const rotateY = ((x / rect.width) - 0.5) * 15;
        
        setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 });
    };

    const isHovered = tilt.x !== 0 || tilt.y !== 0;

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`,
                transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out'
            }}
            className={`will-change-transform ${className}`}
        >
            {children}
        </div>
    );
};

const FlipCard = ({ person }) => {
    const [rotation, setRotation] = useState(0);

    const handleClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const isLeftClick = clickX < rect.width / 2;

        if (isLeftClick) {
            setRotation(prev => prev - 180);
        } else {
            setRotation(prev => prev + 180);
        }
    };

    return (
        <div className="relative w-full h-[380px] sm:h-[420px] md:h-[450px] cursor-pointer group [perspective:1000px] transition-transform duration-500 hover:-translate-y-1" onClick={handleClick}>
            <div 
                className="w-full h-full duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] [transform-style:preserve-3d] transition-transform will-change-transform"
                style={{ transform: `rotateY(${rotation}deg)` }}
            >
                
                {/* Front */}
                <div className="absolute inset-0 [backface-visibility:hidden] bg-white/5 border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col transition-all duration-500 group-hover:border-white/20 group-hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.1)]">
                    <img src={person.image} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-700" alt={person.name} />
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 bg-gradient-to-t from-[#080b12] via-[#080b12]/80 to-transparent pt-16 sm:pt-24 text-center">
                        <h4 className="text-2xl sm:text-3xl font-bold text-white mb-2">{person.name}</h4>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center mt-2">
                            <span className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                View Bio <span className="material-symbols-outlined text-sm">autorenew</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Back */}
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white/5 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-6 sm:p-10 flex flex-col justify-center items-center text-center shadow-[inset_0_0_50px_rgba(255,255,255,0.05)]">
                    <h4 className="text-xl sm:text-2xl font-bold mb-2 text-white">{person.name}</h4>
                    <p className={`text-sm font-bold tracking-widest uppercase mb-6 flex items-center justify-center gap-2 ${person.color}`}>
                        {person.role}
                    </p>
                    <p className="text-white/70 text-base sm:text-lg leading-relaxed">{person.bio}</p>
                    
                    <div className="mt-auto pt-8">
                         <span className="text-white/40 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-sm">arrow_back</span> Return
                        </span>
                    </div>
                </div>

            </div>
        </div>
    );
};

const About = () => {
    const team = [
        {
            name: "Dr. Elena Rostova",
            role: "Chief Algorithmic Biologist",
            color: "text-primary",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCP3nQl8b8LU4xjhNKoFcksaAJAjAhTnIGG2n1OFkuoOSwfz2dP7FAXSAOYxRMQnk-7DuXqJnLBChFdrlYZYn7QRk44BaFOFR2McC9ByzI_n03ycyhSZau2fg6iJK1GAFUkV4y7UukilqbSfJNx3Q8s0FvRM0-MajLqixc-NBO9J64ponXllcmORWHcgIeBm5dZrQfkN2U7pz_JafhB_yLLV-RpZx1y4M7u03vzO6MnM8K3Da2D98Hb",
            bio: "Former lead researcher at the Global Genomics Institute. Pioneer in predictive metabolic modeling."
        },
        {
            name: "Marcus Chen",
            role: "VP of Neural Networks",
            color: "text-[#38bdf8]",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAW563tK2alaIdKa-cuEfnJW_382lfBQKNmuA-kMrz16M4r0j_X2E-NwzxGnDRl0tocPS3FptCrFu8YlmyZVNj3JFmfqOmLXYrG0ZwVT8uy224ZUKl3NEzQCmKUTO2msjUepTc_nVcKorAi6FUfm_iG51_uMfIOsUZ6jT5AARtHZZqyjyDau5TLry4qgYRmogxwX3RY3MnDdtrqs7kp4S-dvhaj0IMgdKyGytNOKy-15cE-Ml0DX-bU",
            bio: "Architect of the NutriMunch AI engine. Specializes in real-time deep learning pipelines."
        },
        {
            name: "Sarah Jenkins",
            role: "Director of Culinary Synth",
            color: "text-[#a3e635]",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZLrZKLb7jzMmFQ5c6qGbPfOriSTc2BC_huR3PJJqupenaW5lWxSI7_t5rEsctSs00W6MwL6qe-qHTKrEjUZAEjRruf0uHFev2ubNwTi4kWIBFgSVq9eO-2GXDO-gHwKpeCq41OZyuAkBa0fNoruRCpaRGqXAPY7wcb-m01KQ-q4hj5mEWx3oKu0Jdv0Iv-jfmt0C8yuj48YFkyamuApv5yVIztLtfvuR9f3xAvA3JU1uCRp1uckTy",
            bio: "Translates complex metabolic data into Michelin-grade, accessible generative recipes."
        }
    ];

    return (
        <div className="relative pt-32 pb-24 flex flex-col w-full overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full relative z-10">
                {/* Hero Section */}
                <div className="text-center mb-16 sm:mb-24">
                    <div className="inline-flex items-center gap-3 mb-6">
                        <span className="w-8 h-px bg-primary"></span>
                        <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-widest">About The Protocol</span>
                        <span className="w-8 h-px bg-primary"></span>
                    </div>
                    <h1 className="font-hero-display text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-8">
                        Pioneering the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#38bdf8] italic">genesis</span> <br/>of algorithmic biology.
                    </h1>
                    <p className="text-white/60 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        We are a collective of metabolic engineers, data scientists, and culinary architects committed to mapping the infinite variables of human nutrition.
                    </p>
                </div>

                {/* Glassmorphic Mission Grid */}
                <div className="relative mb-20 sm:mb-32 flex justify-center overflow-hidden">
                    {/* Parallax Background Text */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 w-full flex justify-center">
                        <h1 className="font-hero-display text-[15vw] md:text-[14vw] leading-[0.8] font-black uppercase bg-gradient-to-b from-white/80 to-white/0 bg-clip-text text-transparent opacity-40 blur-[1px] select-none tracking-tighter whitespace-nowrap">
                            NUTRITION
                        </h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 relative z-10 w-full">
                        <TiltCard className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 md:p-12 hover:border-primary/30 transition-colors duration-500">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 border border-primary/20">
                                <span className="material-symbols-outlined text-primary text-3xl">fingerprint</span>
                            </div>
                            <h3 className="font-headline-lg text-2xl sm:text-3xl font-bold mb-4">The Biometric Singularity</h3>
                            <p className="text-white/60 leading-relaxed text-base sm:text-lg mb-8">
                                We believe that generic dietary advice is obsolete. Our mission is to achieve the biometric singularity—a state where your continuous health data is instantly translated into hyper-personalized, molecular-level nutritional directives.
                            </p>
                            <div className="mt-auto flex items-center gap-2 text-primary font-label-caps uppercase tracking-widest text-sm opacity-0 hover:opacity-100 transition-opacity duration-300">
                                <span>Initialize Protocol</span>
                                <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
                            </div>
                        </TiltCard>

                        <TiltCard className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 md:p-12 hover:border-[#38bdf8]/30 transition-colors duration-500">
                            <div className="w-16 h-16 rounded-2xl bg-[#38bdf8]/10 flex items-center justify-center mb-8 border border-[#38bdf8]/20">
                                <span className="material-symbols-outlined text-[#38bdf8] text-3xl">public</span>
                            </div>
                            <h3 className="font-headline-lg text-2xl sm:text-3xl font-bold mb-4">Global Data Harvesting</h3>
                            <p className="text-white/60 leading-relaxed text-base sm:text-lg mb-8">
                                By synthesizing global health trends, epidemiological research, and real-time user telemetry across millions of data points, our neural networks are constantly evolving to provide the most precise dietary interventions known to science.
                            </p>
                            <div className="mt-auto flex items-center gap-2 text-[#38bdf8] font-label-caps uppercase tracking-widest text-sm opacity-0 hover:opacity-100 transition-opacity duration-300">
                                <span>Observe Network</span>
                                <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
                            </div>
                        </TiltCard>
                    </div>
                </div>

                {/* Team Section */}
                <div className="mb-12">
                    <h2 className="font-hero-display text-3xl sm:text-4xl font-bold tracking-tight mb-12 text-center">Architects of the Convergence</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                        {team.map((person, index) => (
                            <FlipCard key={index} person={person} />
                        ))}
                    </div>
                </div>

                {/* Appended New Sections */}
                <OurMissionVision />
                <OurApproach />
                <WhyPersonalizedNutritionMatters />
                <ExpandedTeam />
                <Values />
                <StatisticsSection />
                <WhyClientsTrustUs />
            </div>
        </div>
    );
};

export default About;
