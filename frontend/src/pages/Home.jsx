/**
 * Home Landing Page
 * Displays the primary landing experience, including hero headline,
 * 3D interactive flip feature cards, services overview, client testimonials, and final CTA.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useContext } from 'react';
import ServicesOverview from './HomeSections/ServicesOverview';
import { AuthContext } from '../context/AuthContext';
import HowItWorks from './HomeSections/HowItWorks';
import FinalCTA from './HomeSections/FinalCTA';

/**
 * FlipFeatureCard Component
 * Interactive 3D flip card responding to left/right mouse clicks to reveal technical details.
 * 
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Front face content
 * @param {React.ReactNode} props.backContent - Back face content
 */
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

/**
 * Home Component
 * Root landing page presenting hero callouts, platform capabilities, and conversion pathways.
 */
/**
 * HeroCarousel Component
 * Animated feature showcase carousel with left/right navigation, dot indicators, and auto-play.
 * Each slide visually represents a core NutriMunch AI feature with styled mock-UI panels.
 */
const HeroCarousel = () => {
    const navigate = useNavigate();
    const [activeIdx, setActiveIdx] = useState(0);
    const [animDir, setAnimDir] = useState('right');
    const [isAnimating, setIsAnimating] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const intervalRef = useRef(null);
    const TOTAL = 5;

    const goTo = useCallback((idx, dir) => {
        if (isAnimating || idx === activeIdx) return;
        setAnimDir(dir ?? (idx > activeIdx ? 'right' : 'left'));
        setIsAnimating(true);
        setTimeout(() => { setActiveIdx(idx); setIsAnimating(false); }, 420);
    }, [isAnimating, activeIdx]);

    const goNext = useCallback(() => {
        if (isAnimating) return;
        const next = (activeIdx + 1) % TOTAL;
        setAnimDir('right'); setIsAnimating(true);
        setTimeout(() => { setActiveIdx(next); setIsAnimating(false); }, 420);
    }, [isAnimating, activeIdx]);

    const goPrev = useCallback(() => {
        if (isAnimating) return;
        const prev = (activeIdx - 1 + TOTAL) % TOTAL;
        setAnimDir('left'); setIsAnimating(true);
        setTimeout(() => { setActiveIdx(prev); setIsAnimating(false); }, 420);
    }, [isAnimating, activeIdx]);

    useEffect(() => {
        if (isPaused) { clearInterval(intervalRef.current); return; }
        intervalRef.current = setInterval(goNext, 4500);
        return () => clearInterval(intervalRef.current);
    }, [goNext, isPaused]);

    const animClass = isAnimating
        ? animDir === 'right' ? 'opacity-0 translate-x-10' : 'opacity-0 -translate-x-10'
        : 'opacity-100 translate-x-0';

    /** Dot nav colours per slide */
    const accents = ['#a5d391', '#38bdf8', '#f472b6', '#fbbf24', '#a78bfa'];
    const accent = accents[activeIdx];

    /** Dot nav */
    const Dots = () => (
        <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL }).map((_, i) => (
                <button
                    key={i}
                    aria-label={`Slide ${i + 1}`}
                    onClick={() => goTo(i)}
                    className="rounded-full transition-all duration-300"
                    style={{
                        width: i === activeIdx ? 22 : 8, height: 8,
                        background: i === activeIdx ? accent : 'rgba(255,255,255,0.3)',
                        boxShadow: i === activeIdx ? `0 0 10px ${accent}90` : 'none'
                    }}
                />
            ))}
        </div>
    );

    /** Arrow buttons */
    const Arrows = () => (
        <div className="flex items-center gap-2">
            <button
                aria-label="Previous" onClick={goPrev}
                className="w-11 h-11 sm:w-13 sm:h-13 bg-black/50 backdrop-blur-xl border border-white/15 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300 hover:scale-110 shadow-lg"
            >
                <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <button
                aria-label="Next" onClick={goNext}
                className="w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center text-black transition-all duration-300 hover:scale-110 hover:bg-white shadow-xl"
                style={{ background: accent, boxShadow: `0 0 20px ${accent}60` }}
            >
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </button>
        </div>
    );

    return (
        <section
            className="max-w-7xl mx-auto px-4 sm:px-8 -mt-24 md:-mt-36 relative z-20"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className="relative rounded-2xl overflow-hidden shadow-[0_80px_120px_-20px_rgba(15,23,42,0.5)] border border-white/10" style={{ aspectRatio: '21/9' }}>

                {/* ──────────── SLIDE 1: Hero food plate image ──────────── */}
                {activeIdx === 0 && (
                    <div className={`absolute inset-0 transition-all duration-420 ease-out ${animClass}`}>
                        <img
                            className="w-full h-full object-cover scale-105"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUQW1ayK2QptnJC4qRpFZJQfK25SrdzXBlBBKDdfgFsY3fbK5Q9MBP4F2v2a6cli_nEXhYxZdynfefZ9y6wd9ardu7fb6hI4n4NzwrwE4B--Y4wqSMdeuOKZZfTXGlE55PD6O95ZslKGxZFe9jEyC5O4jQKnL_jnYppX1ixe10PJAE_5uvWDiX9c_vA5cz5JtDILmRAtwTwIPmdRfsDOx7e2W8rsEiFw4gzv8YSmBzQ-2grz1UCn8l"
                            alt="Healthy colourful meal plate"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute top-5 left-5 sm:top-8 sm:left-8">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border backdrop-blur-md bg-[#a5d391]/15 border-[#a5d391]/50 text-[#a5d391]">AI Meal Planning</span>
                        </div>
                        <div className="absolute bottom-6 sm:bottom-10 left-6 sm:left-10 right-6 sm:right-10 flex justify-end sm:justify-between items-end">
                            <div className="bg-black/45 backdrop-blur-3xl border border-white/10 p-5 sm:p-7 rounded-2xl sm:rounded-3xl flex gap-8 sm:gap-14 hidden sm:flex">
                                <div><p className="text-[9px] uppercase tracking-widest text-white/60 font-bold mb-1">Daily Target</p><p className="text-2xl sm:text-3xl font-black text-[#a5d391]">2,250 kcal</p></div>
                                <div className="w-px bg-white/10" />
                                <div><p className="text-[9px] uppercase tracking-widest text-white/60 font-bold mb-1">Macro Split</p><p className="text-2xl sm:text-3xl font-black text-white">35P / 45C / 20F</p></div>
                            </div>
                            <div className="flex flex-col items-end gap-3 ml-auto sm:ml-0">
                                <Arrows /><Dots />
                            </div>
                        </div>
                    </div>
                )}

                {/* ──────────── SLIDE 2: Consultation Chat Feature ──────────── */}
                {activeIdx === 1 && (
                    <div className={`absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#071120] to-[#0d1f36] transition-all duration-420 ease-out ${animClass} flex`}>
                        {/* Left: Feature Info */}
                        <div className="flex flex-col justify-center px-8 sm:px-14 w-1/2 gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full w-fit border backdrop-blur-md bg-[#38bdf8]/10 border-[#38bdf8]/40 text-[#38bdf8]">Live Chat</span>
                            <h3 className="text-white font-bold text-xl sm:text-3xl md:text-4xl leading-tight font-hero-display">
                                Chat directly with your <span className="text-[#38bdf8]">Nutritionist</span>
                            </h3>
                            <p className="text-white/50 text-xs sm:text-sm leading-relaxed max-w-xs">Real-time secure messaging, file sharing, diet plan updates and appointment scheduling — all in one conversation thread.</p>
                            <button onClick={() => navigate('/consultation-chat')} className="mt-2 inline-flex items-center gap-2 bg-[#38bdf8] hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-all w-fit shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                                <span>Start Consulting</span>
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                        {/* Right: Mock Chat UI */}
                        <div className="hidden sm:flex flex-col justify-center w-1/2 pr-8 sm:pr-14 gap-3">
                            {/* Chat window mock */}
                            <div className="bg-[#0d1b2e]/80 border border-[#38bdf8]/20 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-col gap-3">
                                {/* Chat header */}
                                <div className="flex items-center gap-3 pb-2 border-b border-white/10">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#38bdf8] to-cyan-400 flex items-center justify-center text-black text-xs font-black">N</div>
                                    <div>
                                        <p className="text-white text-xs font-bold">Dr. Priya Sharma</p>
                                        <p className="text-[#38bdf8] text-[9px] flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block"></span> Online</p>
                                    </div>
                                </div>
                                {/* Messages */}
                                <div className="flex flex-col gap-2 text-xs">
                                    <div className="self-start bg-[#38bdf8]/10 border border-[#38bdf8]/20 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] text-white/80">
                                        Hi! I've reviewed your progress. Your protein intake is excellent 💪
                                    </div>
                                    <div className="self-end bg-[#38bdf8]/25 border border-[#38bdf8]/30 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%] text-white">
                                        Thanks! Should I adjust my carbs on rest days?
                                    </div>
                                    <div className="self-start bg-[#38bdf8]/10 border border-[#38bdf8]/20 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] text-white/80">
                                        Yes — reduce by 20%. I'll update your plan now ✅
                                    </div>
                                </div>
                                {/* Input bar mock */}
                                <div className="flex items-center gap-2 mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2">
                                    <span className="text-white/30 text-[10px] flex-1">Type a message...</span>
                                    <span className="material-symbols-outlined text-[#38bdf8] text-base">send</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-6 right-6 sm:right-10 flex flex-col items-end gap-3">
                            <Arrows /><Dots />
                        </div>
                    </div>
                )}

                {/* ──────────── SLIDE 3: AI Food Image Analyzer ──────────── */}
                {activeIdx === 2 && (
                    <div className={`absolute inset-0 bg-gradient-to-br from-[#0d0a1e] via-[#120d26] to-[#1a0d2e] transition-all duration-420 ease-out ${animClass} flex`}>
                        {/* Left: Mock Scanner UI */}
                        <div className="hidden sm:flex flex-col justify-center pl-8 sm:pl-14 w-1/2 gap-4">
                            <div className="relative w-48 h-48 mx-auto">
                                {/* Camera viewfinder */}
                                <div className="absolute inset-0 rounded-2xl border-2 border-[#f472b6]/40 bg-black/40 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                                    <div className="w-28 h-28 rounded-xl overflow-hidden opacity-80">
                                        <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=80&fit=crop" alt="food" className="w-full h-full object-cover" />
                                    </div>
                                    {/* scan line */}
                                    <div className="absolute left-0 right-0 h-px bg-[#f472b6]/70 top-[40%] animate-bounce shadow-[0_0_10px_rgba(244,114,182,0.8)]" />
                                </div>
                                {/* Corner accents */}
                                <div className="absolute top-1 left-1 w-5 h-5 border-t-2 border-l-2 border-[#f472b6] rounded-tl-lg" />
                                <div className="absolute top-1 right-1 w-5 h-5 border-t-2 border-r-2 border-[#f472b6] rounded-tr-lg" />
                                <div className="absolute bottom-1 left-1 w-5 h-5 border-b-2 border-l-2 border-[#f472b6] rounded-bl-lg" />
                                <div className="absolute bottom-1 right-1 w-5 h-5 border-b-2 border-r-2 border-[#f472b6] rounded-br-lg" />
                            </div>
                            {/* Macro result card */}
                            <div className="bg-[#1a0d2e]/80 border border-[#f472b6]/20 rounded-xl p-3 mx-4 backdrop-blur-xl">
                                <p className="text-[#f472b6] text-[9px] font-black uppercase tracking-widest mb-2">🍱 Detected: Veggie Grain Bowl</p>
                                <div className="grid grid-cols-4 gap-1 text-center">
                                    {[['320','kcal'],['18g','Protein'],['42g','Carbs'],['9g','Fat']].map(([v,l]) => (
                                        <div key={l} className="bg-black/30 rounded-lg p-1.5">
                                            <p className="text-white text-sm font-black">{v}</p>
                                            <p className="text-white/40 text-[8px]">{l}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* Right: Feature Info */}
                        <div className="flex flex-col justify-center px-8 sm:px-14 w-full sm:w-1/2 gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full w-fit border backdrop-blur-md bg-[#f472b6]/10 border-[#f472b6]/40 text-[#f472b6]">AI Vision Scanner</span>
                            <h3 className="text-white font-bold text-xl sm:text-3xl md:text-4xl leading-tight font-hero-display">
                                Snap a photo for <span className="text-[#f472b6]">instant macro</span> detection
                            </h3>
                            <p className="text-white/50 text-xs sm:text-sm leading-relaxed max-w-xs">Upload any food photo or scan a barcode — our AI instantly estimates calories, protein, carbs, fats and flags allergen conflicts.</p>
                            <button onClick={() => navigate('/ai-image')} className="mt-2 inline-flex items-center gap-2 bg-[#f472b6] hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-all w-fit shadow-[0_0_20px_rgba(244,114,182,0.4)]">
                                <span>Try Food Scanner</span>
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                        <div className="absolute bottom-6 right-6 sm:right-10 flex flex-col items-end gap-3">
                            <Arrows /><Dots />
                        </div>
                    </div>
                )}

                {/* ──────────── SLIDE 4: Progress Tracking ──────────── */}
                {activeIdx === 3 && (
                    <div className={`absolute inset-0 bg-gradient-to-br from-[#0b1a12] via-[#081510] to-[#0f2418] transition-all duration-420 ease-out ${animClass} flex`}>
                        {/* Left: Feature info */}
                        <div className="flex flex-col justify-center px-8 sm:px-14 w-full sm:w-1/2 gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full w-fit border backdrop-blur-md bg-[#fbbf24]/10 border-[#fbbf24]/40 text-[#fbbf24]">Progress Tracker</span>
                            <h3 className="text-white font-bold text-xl sm:text-3xl md:text-4xl leading-tight font-hero-display">
                                Track calories, water <br/>&amp; <span className="text-[#fbbf24]">biometrics daily</span>
                            </h3>
                            <p className="text-white/50 text-xs sm:text-sm leading-relaxed max-w-xs">Log meals, monitor hydration with live water gauges, track weight trends and review weekly nutrition reports — all in one dashboard.</p>
                            <button onClick={() => navigate('/progress')} className="mt-2 inline-flex items-center gap-2 bg-[#fbbf24] hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-all w-fit shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                                <span>View Progress</span>
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                        {/* Right: Mock dashboard */}
                        <div className="hidden sm:flex flex-col justify-center pr-8 sm:pr-14 w-1/2 gap-3">
                            <div className="bg-[#0f2418]/80 border border-[#fbbf24]/20 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-col gap-3">
                                <p className="text-[#fbbf24] text-[9px] font-black uppercase tracking-widest">Today's Overview</p>
                                {/* Calorie bar */}
                                {[
                                    { label: 'Calories', val: '1,820', max: '2,250', pct: 81, col: '#fbbf24' },
                                    { label: 'Protein', val: '89g', max: '140g', pct: 64, col: '#a5d391' },
                                    { label: 'Carbs', val: '180g', max: '220g', pct: 82, col: '#38bdf8' },
                                    { label: 'Water', val: '1.8L', max: '2.5L', pct: 72, col: '#60a5fa' },
                                ].map(({label, val, max, pct, col}) => (
                                    <div key={label}>
                                        <div className="flex justify-between text-[9px] mb-1">
                                            <span className="text-white/60 font-bold">{label}</span>
                                            <span className="text-white/80">{val} / {max}</span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: col, boxShadow: `0 0 6px ${col}80` }} />
                                        </div>
                                    </div>
                                ))}
                                {/* Weight badge */}
                                <div className="flex gap-2 mt-1">
                                    <div className="flex-1 bg-black/30 rounded-xl p-2 text-center">
                                        <p className="text-[#fbbf24] text-base font-black">72.4<span className="text-xs font-medium">kg</span></p>
                                        <p className="text-white/40 text-[8px]">Current Weight</p>
                                    </div>
                                    <div className="flex-1 bg-black/30 rounded-xl p-2 text-center">
                                        <p className="text-green-400 text-base font-black">-1.2<span className="text-xs font-medium">kg</span></p>
                                        <p className="text-white/40 text-[8px]">This Week</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-6 right-6 sm:right-10 flex flex-col items-end gap-3">
                            <Arrows /><Dots />
                        </div>
                    </div>
                )}

                {/* ──────────── SLIDE 5: Appointment Booking / Nutritionist ──────────── */}
                {activeIdx === 4 && (
                    <div className={`absolute inset-0 bg-gradient-to-br from-[#130d1e] via-[#1a0e2e] to-[#0d0820] transition-all duration-420 ease-out ${animClass} flex`}>
                        {/* Left: Mock booking UI */}
                        <div className="hidden sm:flex flex-col justify-center pl-8 sm:pl-14 w-1/2 gap-3">
                            <div className="bg-[#1a0d2e]/80 border border-[#a78bfa]/20 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-col gap-3">
                                <p className="text-[#a78bfa] text-[9px] font-black uppercase tracking-widest">Book a Session</p>
                                {/* Nutritionist cards */}
                                {[
                                    { name: 'Dr. Priya Sharma', spec: 'Sports Nutrition', rating: '4.9', avail: 'Available Today', init: 'P' },
                                    { name: 'Dr. Arun Mehta', spec: 'Weight Management', rating: '4.8', avail: 'Next: 3 PM', init: 'A' },
                                ].map(n => (
                                    <div key={n.name} className="flex items-center gap-3 bg-black/30 rounded-xl p-2.5 border border-[#a78bfa]/10">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#a78bfa] to-purple-400 flex items-center justify-center text-black text-xs font-black shrink-0">{n.init}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-xs font-bold truncate">{n.name}</p>
                                            <p className="text-white/40 text-[9px]">{n.spec}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[#fbbf24] text-[9px] font-black">⭐ {n.rating}</p>
                                            <p className="text-green-400 text-[8px]">{n.avail}</p>
                                        </div>
                                    </div>
                                ))}
                                {/* Time slots */}
                                <p className="text-white/40 text-[9px] font-bold mt-1">Select a time slot:</p>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {['9:00 AM','10:30 AM','2:00 PM','4:30 PM'].map((t, i) => (
                                        <div key={t} className={`rounded-lg py-1.5 text-center text-[9px] font-bold border ${i === 1 ? 'bg-[#a78bfa]/25 border-[#a78bfa] text-[#a78bfa]' : 'bg-black/20 border-white/10 text-white/50'}`}>{t}</div>
                                    ))}
                                </div>
                                <button className="w-full bg-[#a78bfa] hover:bg-white text-black text-[10px] font-black rounded-xl py-2 transition-all mt-1">Confirm Booking →</button>
                            </div>
                        </div>
                        {/* Right: Feature info */}
                        <div className="flex flex-col justify-center px-8 sm:px-14 w-full sm:w-1/2 gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full w-fit border backdrop-blur-md bg-[#a78bfa]/10 border-[#a78bfa]/40 text-[#a78bfa]">Nutritionist Network</span>
                            <h3 className="text-white font-bold text-xl sm:text-3xl md:text-4xl leading-tight font-hero-display">
                                Book sessions with <span className="text-[#a78bfa]">certified</span> nutritionists
                            </h3>
                            <p className="text-white/50 text-xs sm:text-sm leading-relaxed max-w-xs">Browse verified dietitians, view specializations and ratings, book video or chat consultations, and join a live virtual room — all from one place.</p>
                            <button onClick={() => navigate('/appointments')} className="mt-2 inline-flex items-center gap-2 bg-[#a78bfa] hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-all w-fit shadow-[0_0_20px_rgba(167,139,250,0.4)]">
                                <span>Book Appointment</span>
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                        <div className="absolute bottom-6 right-6 sm:right-10 flex flex-col items-end gap-3">
                            <Arrows /><Dots />
                        </div>
                    </div>
                )}
            </div>
        </section>
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
        <div className="relative flex flex-col w-full">
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
            <div className="relative bg-background w-full z-20">
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
                {/* Hero Image Carousel Section */}
                <HeroCarousel />

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
                <div className="w-full bg-background text-on-background pt-0 pb-10">
                    <ServicesOverview />
                </div>
                {!isStaffHome && <div className="w-full bg-[#080b12] text-white py-16 border-t border-white/10">
                    <HowItWorks />
                </div>}

                <div className="w-full bg-background text-on-background pb-24">
                    <FinalCTA />
                </div>
            </div>
        </div>
    );
};

export default Home;
