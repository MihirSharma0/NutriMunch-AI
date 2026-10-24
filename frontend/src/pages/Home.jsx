import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useContext } from 'react';
import Starfield from '../components/Starfield';
import ServicesOverview from './HomeSections/ServicesOverview';
import { AuthContext } from '../context/AuthContext';
import HowItWorks from './HomeSections/HowItWorks';
import FinalCTA from './HomeSections/FinalCTA';

const FlipFeatureCard = ({ children, backContent, wrapperClass, frontClass, backClass }) => {
    const [rotation, setRotation] = useState(0);

    const handleClick = (e) => {
        // Prevent flipping when interacting with links, buttons, or inputs
        if (e.target.closest('button, a, input, select, textarea')) {
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const isLeftClick = clickX < rect.width / 2;

        if (isLeftClick) {
            setRotation(prev => prev - 180);
        } else {
            setRotation(prev => prev + 180);
        }
    };

    const normalized = ((rotation % 360) + 360) % 360;
    const isBackShowing = normalized === 180;

    return (
        <div
            className={`relative cursor-pointer group [perspective:1500px] transition-transform duration-500 hover:-translate-y-3 ${wrapperClass}`}
            onClick={handleClick}
        >
            <div
                className="w-full h-full duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] [transform-style:preserve-3d] transition-transform will-change-transform"
                style={{
                    transform: `rotateY(${rotation}deg)`,
                    WebkitTransformStyle: 'preserve-3d',
                    transformStyle: 'preserve-3d'
                }}
            >
                {/* Front */}
                <div
                    className={`absolute inset-0 w-full h-full flex flex-col group-hover:shadow-2xl transition-shadow duration-500 ${frontClass}`}
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(0deg)',
                        WebkitTransform: 'rotateY(0deg)',
                        opacity: isBackShowing ? 0 : 1,
                        visibility: isBackShowing ? 'hidden' : 'visible',
                        pointerEvents: isBackShowing ? 'none' : 'auto',
                        transition: 'opacity 0.25s ease, visibility 0.25s ease'
                    }}
                >
                    {children}
                </div>

                {/* Back */}
                <div
                    className={`absolute inset-0 w-full h-full flex flex-col justify-center items-center text-center p-6 sm:p-10 md:p-14 rounded-[2.5rem] group-hover:shadow-2xl transition-shadow duration-500 ${backClass}`}
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        WebkitTransform: 'rotateY(180deg)',
                        opacity: isBackShowing ? 1 : 0,
                        visibility: isBackShowing ? 'visible' : 'hidden',
                        pointerEvents: isBackShowing ? 'auto' : 'none',
                        transition: 'opacity 0.25s ease, visibility 0.25s ease'
                    }}
                >
                    {backContent}
                </div>
            </div>
        </div>
    );
};

const Home = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const role = String(user?.role || '').toUpperCase().replace('ROLE_', '');
    const isStaffHome = role === 'ADMIN' || role === 'NUTRITIONIST';
    const roleContent = role === 'ADMIN'
        ? {
            eyebrow: 'Administration workspace',
            title: 'Run the nutrition platform with clarity.',
            description: 'Monitor users, diet plans, consultations, payments, and platform operations from one controlled workspace.',
            action: 'Open Admin Dashboard',
            path: '/dashboard/admin',
            icon: 'admin_panel_settings'
        }
        : role === 'NUTRITIONIST'
            ? {
                eyebrow: 'Clinical workspace',
                title: 'Deliver better nutrition care.',
                description: 'Review your patient roster, manage consultations, formulate diet protocols, and monitor clinical progress.',
                action: 'Open Clinical Dashboard',
                path: '/dashboard/nutritionist',
                icon: 'clinical_notes'
            }
            : {
                eyebrow: 'Personal nutrition workspace',
                title: 'Make every meal move you forward.',
                description: 'Generate personalized meal plans, track your targets, analyze food, and get guidance that adapts to your goals.',
                action: 'Start Your Plan',
                path: '/ai-diet',
                icon: 'restaurant_menu'
            };
    const blockShadow = Array.from({ length: 25 }).map((_, i) => {
        const x = i * 0.8;
        const y = i * 0.5;
        const colorVal = Math.floor(120 - (120 / 25) * i);
        const hex = colorVal.toString(16).padStart(2, '0');
        // Add a subtle whitish edge to the extrusion by making an early layer light
        if (i === 1) return `${x}px ${y}px 0 rgba(255,255,255,0.3)`;
        return `${x}px ${y}px 0 #${hex}${hex}${hex}`;
    }).join(', ') + ', 20px 12px 50px rgba(0,0,0,0.9)';

    return (
        <div className="relative flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-8">
            {/* Main Hero Container */}
            <div className="w-full flex-grow relative z-10 flex flex-col justify-between pt-4">

                {/* Top Section - Huge Typography */}
                <div className="relative mb-12 md:mb-16">
                    <h1
                        className="font-hero-display text-[3rem] sm:text-[4.5rem] md:text-[10rem] lg:text-[12rem] leading-none font-bold text-white tracking-tighter relative z-20"
                        style={{ textShadow: blockShadow }}
                    >
                        Nutrition
                    </h1>
                </div>

                {/* Bottom Info Grid */}
                <div className="grid grid-cols-12 gap-6 sm:gap-8 md:gap-12 items-end mb-40 md:mb-56">

                    {/* Left: Avatars */}
                    <div className="col-span-12 md:col-span-3 space-y-4">
                        <div className="flex -space-x-4">
                            <div className="w-12 h-12 rounded-full border-2 border-[#080b12] overflow-hidden shadow-lg relative z-30">
                                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCP3nQl8b8LU4xjhNKoFcksaAJAjAhTnIGG2n1OFkuoOSwfz2dP7FAXSAOYxRMQnk-7DuXqJnLBChFdrlYZYn7QRk44BaFOFR2McC9ByzI_n03ycyhSZau2fg6iJK1GAFUkV4y7UukilqbSfJNx3Q8s0FvRM0-MajLqixc-NBO9J64ponXllcmORWHcgIeBm5dZrQfkN2U7pz_JafhB_yLLV-RpZx1y4M7u03vzO6MnM8K3Da2D98Hb" alt="User" className="w-full h-full object-cover"/>
                            </div>
                            <div className="w-12 h-12 rounded-full border-2 border-[#080b12] overflow-hidden shadow-lg relative z-20">
                                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAW563tK2alaIdKa-cuEfnJW_382lfBQKNmuA-kMrz16M4r0j_X2E-NwzxGnDRl0tocPS3FptCrFu8YlmyZVNj3JFmfqOmLXYrG0ZwVT8uy224ZUKl3NEzQCmKUTO2msjUepTc_nVcKorAi6FUfm_iG51_uMfIOsUZ6jT5AARtHZZqyjyDau5TLry4qgYRmogxwX3RY3MnDdtrqs7kp4S-dvhaj0IMgdKyGytNOKy-15cE-Ml0DX-bU" alt="User" className="w-full h-full object-cover"/>
                            </div>
                            <div className="w-12 h-12 rounded-full border-2 border-[#080b12] overflow-hidden shadow-lg relative z-10">
                                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZLrZKLb7jzMmFQ5c6qGbPfOriSTc2BC_huR3PJJqupenaW5lWxSI7_t5rEsctSs00W6MwL6qe-qHTKrEjUZAEjRruf0uHFev2ubNwTi4kWIBFgSVq9eO-2GXDO-gHwKpeCq41OZyuAkBa0fNoruRCpaRGqXAPY7wcb-m01KQ-q4hj5mEWx3oKu0Jdv0Iv-jfmt0C8yuj48YFkyamuApv5yVIztLtfvuR9f3xAvA3JU1uCRp1uckTy" alt="User" className="w-full h-full object-cover"/>
                            </div>
                        </div>
                        <div>
                            <div className="text-[#a5d391] text-[10px] font-black tracking-[0.2em] flex items-center gap-2 uppercase mb-1 drop-shadow-[0_0_4px_rgba(165,211,145,0.3)]">
                                <span className="w-1.5 h-1.5 bg-[#a5d391] rounded-full animate-pulse"></span>
                                Precision Health
                            </div>
                            <div className="text-white/40 text-sm font-medium tracking-wide">Real-time AI Adaptation</div>
                        </div>
                    </div>

                    {/* Center: Description */}
                    <div className="col-span-12 md:col-span-5 md:ml-8">
                        <p className="text-white/60 text-base md:text-lg leading-relaxed font-light text-center md:text-left">
                            <span className="text-[#a5d391] text-xs font-bold uppercase tracking-widest block mb-3">{roleContent.eyebrow}</span>
                            {roleContent.description}
                        </p>
                    </div>

                    {/* Right: UI Card & Text */}
                    <div
                        onClick={() => navigate(roleContent.path)}
                        className="col-span-12 md:col-span-4 flex items-center gap-6 justify-start md:justify-end cursor-pointer group hover:opacity-90 transition-all"
                    >
                        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl shrink-0 backdrop-blur-xl group-hover:border-[#a5d391]/50 group-hover:shadow-[0_0_20px_rgba(165,211,145,0.2)] transition-all">
                            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1AIb88EtGsaDT67Bs1oUgkS5rK8JusRcj0qe2qk4ydl65aRa-fgFIe3Og0O7KdSDssEDKTJoxmMm1tWF05oLw0d_Q044JejnNFQSuu6bI8mQme42twS2bMhcvoSzdUdIPPDne4DKXqUt--BL5RwjSbHfbWCr7xhlYzmWUf-19GgHO0ADNucL9oSeYguAwFlSRACjRCOHRG2q-2E_ojPRhNBa2VHN64pxEyvVjQZAmwG58EgpQLlKp" alt="UI" className="w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-700"/>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-2xl drop-shadow-[0_0_12px_rgba(255,255,255,0.7)] group-hover:text-[#a5d391] group-hover:drop-shadow-[0_0_18px_rgba(165,211,145,1)] transition-all">{roleContent.icon}</span>
                            </div>
                        </div>
                        <div className="text-white text-[15px] leading-snug group-hover:text-[#a5d391] transition-colors">
                            {roleContent.action} <strong className="font-semibold text-white group-hover:text-[#a5d391]">➔</strong>
                        </div>
                    </div>

                </div>
            </div>



            {/* Below sections restored like before */}
            <div className="relative w-full z-20">
                {isStaffHome ? (
                    <section className="max-w-7xl mx-auto px-4 sm:px-8 -mt-24 md:-mt-36 relative z-20">
                        <div className="rounded-[2.5rem] border border-[#a5d391]/20 bg-[#0d121c] p-8 sm:p-12 shadow-2xl">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                                <div className="max-w-2xl">
                                    <span className="text-[#a5d391] text-xs font-bold uppercase tracking-widest">{roleContent.eyebrow}</span>
                                    <h2 className="font-hero-display text-3xl sm:text-5xl font-bold text-white mt-4 mb-4">{roleContent.title}</h2>
                                    <p className="text-white/60 text-base leading-relaxed">{roleContent.description}</p>
                                </div>
                                <button
                                    onClick={() => navigate(roleContent.path)}
                                    className="shrink-0 bg-[#a5d391] text-black px-6 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-white transition-colors"
                                >
                                    <span className="material-symbols-outlined">{roleContent.icon}</span>
                                    {roleContent.action}
                                </button>
                            </div>
                        </div>
                    </section>
                ) : (
                <>
                {/* Hero Image Pivot Section */}
                <section className="max-w-7xl mx-auto px-4 sm:px-8 -mt-24 md:-mt-36 relative z-20">
                    <div className="relative rounded-xl overflow-hidden shadow-[0_80px_120px_-20px_rgba(15,23,42,0.3)] aspect-[21/9] border border-white/10">
                        <img className="w-full h-full object-cover scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUQW1ayK2QptnJC4qRpFZJQfK25SrdzXBlBBKDdfgFsY3fbK5Q9MBP4F2v2a6cli_nEXhYxZdynfefZ9y6wd9ardu7fb6hI4n4NzwrwE4B--Y4wqSMdeuOKZZfTXGlE55PD6O95ZslKGxZFe9jEyC5O4jQKnL_jnYppX1ixe10PJAE_5uvWDiX9c_vA5cz5JtDILmRAtwTwIPmdRfsDOx7e2W8rsEiFw4gzv8YSmBzQ-2grz1UCn8l" alt="Dashboard"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                        {/* Floating Biometric UI */}
                        <div className="absolute bottom-4 right-4 sm:bottom-10 sm:left-10 sm:right-10 flex justify-end sm:justify-between items-end">
                            <div className="bg-black/40 backdrop-blur-3xl border border-white/10 p-8 rounded-3xl flex gap-16 inner-glow hidden sm:flex">
                                <div className="flex flex-col">
                                    <span className="font-label-caps text-label-caps text-primary-fixed mb-2 opacity-80">DAILY TARGET CALORIES</span>
                                    <span className="font-headline-lg text-4xl text-white font-black tracking-tighter">2,250 kcal</span>
                                </div>
                                <div className="w-px h-12 bg-white/10 self-center"></div>
                                <div className="flex flex-col">
                                    <span className="font-label-caps text-label-caps text-primary-fixed mb-2 opacity-80">OPTIMAL MACRO SPLIT</span>
                                    <span className="font-headline-lg text-4xl text-white font-black tracking-tighter mint-glow">35% P / 45% C / 20% F</span>
                                </div>
                            </div>
                            <button className="bg-primary-container text-on-primary-container w-20 h-20 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(165,211,145,0.3)] hover:scale-105 hover:bg-white transition-all group shrink-0 ml-auto sm:ml-0">
                                <span className="material-symbols-outlined text-4xl fill-1 group-hover:scale-110 transition-transform">play_arrow</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Bento Grid Insights */}
                <section className="pt-12 sm:pt-16 pb-6 sm:pb-8 max-w-7xl mx-auto px-4 sm:px-8 relative z-20">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                        {/* Card 1: AI Food Calorie & Nutrient Scanner */}
                        <FlipFeatureCard
                            wrapperClass="md:col-span-7 min-h-[480px]"
                            frontClass="bg-white rounded-[2.5rem] p-10 md:p-14 shadow-xl justify-between shadow-[#4a6741]/10 border border-transparent hover:border-[#4a6741]/20"
                            backClass="bg-white shadow-xl shadow-[#4a6741]/10 border border-gray-100"
                            backContent={
                                <>
                                    <span className="material-symbols-outlined text-[#4a6741] text-5xl mb-6">document_scanner</span>
                                    <h3 className="font-hero-display text-3xl font-bold text-[#111827] mb-4">Instant Image Recognition</h3>
                                    <p className="text-gray-600 text-lg leading-relaxed max-w-md mx-auto">Upload or snap a food photo to automatically estimate calorie counts, protein, carbohydrates, and fats with instant nutrition breakdown.</p>
                                    <Link
                                        to="/ai-image"
                                        onClick={(e) => e.stopPropagation()}
                                        className="mt-6 inline-flex items-center gap-2 bg-[#4a6741] hover:bg-[#395232] text-white font-extrabold text-xs uppercase tracking-wider px-6 py-2.5 rounded-full transition-all shadow-[0_4px_16px_rgba(74,103,65,0.25)] hover:scale-105 cursor-pointer"
                                    >
                                        <span>Explore AI Food Analyzer</span>
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </Link>
                                    <div className="mt-6 flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest">
                                        <span className="material-symbols-outlined text-sm">autorenew</span> Flip Back
                                    </div>
                                </>
                            }
                        >
                            <div>
                                <div className="flex items-center gap-3 mb-8 transform group-hover:translate-x-2 transition-transform duration-500">
                                    <span className="w-8 h-px bg-[#4a6741] group-hover:w-12 transition-all duration-500"></span>
                                    <span className="text-[10px] tracking-widest text-[#4a6741] font-bold uppercase">AI Food Calorie Scanner</span>
                                </div>
                                <h3 className="font-hero-display text-[2rem] sm:text-[2.75rem] md:text-[3.5rem] leading-[1.05] text-[#111827] tracking-tight font-bold pr-0 sm:pr-8">
                                    Snap a photo for <span className="text-[#4a6741] italic">instant macro</span><br/>& calorie detection.
                                </h3>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate('/ai-image'); }}
                                className="flex items-center gap-3 mt-16 cursor-pointer group/btn"
                            >
                                <span className="font-bold text-lg text-[#111827] group-hover/btn:text-[#4a6741] transition-colors">Explore AI Food Analyzer</span>
                                <span className="material-symbols-outlined text-[#4a6741] transition-transform duration-500 group-hover/btn:translate-x-4">arrow_forward</span>
                            </button>
                        </FlipFeatureCard>

                        {/* Card 2: AI Diet & Recipe Generator */}
                        <FlipFeatureCard
                            wrapperClass="md:col-span-5 min-h-[480px]"
                            frontClass="bg-[#0b121f] text-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-[#a3e635]/10 border border-transparent hover:border-[#a3e635]/20 flex flex-col justify-between"
                            backClass="bg-[#0b121f] text-white shadow-xl shadow-[#a3e635]/10 border border-white/5"
                            backContent={
                                <>
                                    <span className="material-symbols-outlined text-[#a3e635] text-5xl mb-6">restaurant_menu</span>
                                    <h3 className="font-hero-display text-3xl font-bold mb-4">Custom Meal Planning</h3>
                                    <p className="text-white/60 text-lg leading-relaxed max-w-sm mx-auto">Generate weekly meal plans, customized recipes, and grocery lists based on your specific health targets, budget, and food allergies.</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate('/ai-diet'); }}
                                        className="mt-6 inline-flex items-center gap-2 bg-[#a3e635] hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider px-6 py-2.5 rounded-full transition-all shadow-[0_0_20px_rgba(163,230,53,0.3)] cursor-pointer"
                                    >
                                        <span>Launch AI Diet Generator</span>
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </button>
                                    <div className="mt-6 flex items-center gap-2 text-white/40 text-sm font-bold uppercase tracking-widest">
                                        <span className="material-symbols-outlined text-sm">autorenew</span> Flip Back
                                    </div>
                                </>
                            }
                        >
                            <div className="p-8 sm:p-10 md:p-12 relative z-20 pb-0">
                                <Link
                                    to="/ai-diet"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] tracking-widest text-[#a3e635] hover:text-white font-bold uppercase mb-3 inline-flex items-center gap-1.5 transform group-hover:translate-x-2 transition-transform duration-500"
                                >
                                    <span>AI DIET PLANNER</span>
                                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                                </Link>
                                <h3
                                    onClick={(e) => { e.stopPropagation(); navigate('/ai-diet'); }}
                                    className="font-hero-display text-3xl sm:text-4xl md:text-[2.25rem] font-bold tracking-tight leading-[1.1] cursor-pointer hover:text-[#a3e635] transition-colors"
                                >
                                    Precision-tailored<br/>weekly meal plans.
                                </h3>
                                <div className="mt-5">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate('/ai-diet'); }}
                                        className="inline-flex items-center gap-2 bg-[#a3e635] hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(163,230,53,0.35)] hover:scale-105 cursor-pointer"
                                    >
                                        <span>Explore AI Diet Planner</span>
                                        <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                                    </button>
                                </div>
                            </div>

                            {/* Image container strictly below the text */}
                            <div className="relative w-full h-44 sm:h-52 overflow-hidden mt-6 z-10">
                                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#0b121f]/20 to-[#0b121f] z-10 pointer-events-none"></div>
                                <img
                                    className="w-full h-full object-cover object-center opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUQW1ayK2QptnJC4qRpFZJQfK25SrdzXBlBBKDdfgFsY3fbK5Q9MBP4F2v2a6cli_nEXhYxZdynfefZ9y6wd9ardu7fb6hI4n4NzwrwE4B--Y4wqSMdeuOKZZfTXGlE55PD6O95ZslKGxZFe9jEyC5O4jQKnL_jnYppX1ixe10PJAE_5uvWDiX9c_vA5cz5JtDILmRAtwTwIPmdRfsDOx7e2W8rsEiFw4gzv8YSmBzQ-2grz1UCn8l"
                                    alt="Healthy meal plan plate"
                                />
                            </div>
                        </FlipFeatureCard>
                    </div>
                </section>
                </>
                )}

                {/* Appended New Sections */}
                <div className="w-full pt-0 pb-10">
                    <ServicesOverview />
                </div>
                {!isStaffHome && (
                    <>
                        <div className="w-full border-t border-white/10 py-16">
                            <HowItWorks />
                        </div>
                    </>
                )}

                <div className="w-full pb-6">
                    <FinalCTA />
                </div>
            </div>
        </div>
    );
};

export default Home;
