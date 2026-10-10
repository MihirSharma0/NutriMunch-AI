import React from 'react';
import { Link } from 'react-router-dom';

const AINutritionCoach = () => {
    return (
        <section className="py-16 sm:py-24 md:py-section-gap relative z-20 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
                <div className="order-2 lg:order-1 relative">
                    <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full"></div>
                    <img 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCP3nQl8b8LU4xjhNKoFcksaAJAjAhTnIGG2n1OFkuoOSwfz2dP7FAXSAOYxRMQnk-7DuXqJnLBChFdrlYZYn7QRk44BaFOFR2McC9ByzI_n03ycyhSZau2fg6iJK1GAFUkV4y7UukilqbSfJNx3Q8s0FvRM0-MajLqixc-NBO9J64ponXllcmORWHcgIeBm5dZrQfkN2U7pz_JafhB_yLLV-RpZx1y4M7u03vzO6MnM8K3Da2D98Hb" 
                        alt="AI Coach Dashboard" 
                        className="relative z-10 w-full rounded-[2.5rem] border border-white/10 shadow-2xl"
                    />
                    <Link to="/ai-chat" className="absolute -bottom-6 -right-6 bg-black/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl z-20 animate-bounce shadow-xl hover:border-[#a5d391]/50 transition-all group">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-[#a5d391] text-3xl group-hover:scale-110 transition-transform">smart_toy</span>
                            <div>
                                <div className="text-white text-sm font-bold flex items-center gap-1">
                                    AI Coach Online
                                    <span className="material-symbols-outlined text-xs text-[#a5d391]">open_in_new</span>
                                </div>
                                <div className="text-white/50 text-xs">Analyzing biometrics...</div>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="order-1 lg:order-2">
                    <span className="text-[#a5d391] font-bold tracking-widest uppercase text-sm mb-4 block">Meet Your New Guide</span>
                    <h2 className="font-hero-display text-4xl md:text-5xl font-bold text-white mb-6">24/7 AI Nutrition Coach</h2>
                    <p className="text-white/60 text-lg leading-relaxed mb-8">
                        Imagine having a world-class nutritionist in your pocket, available 24/7. Our AI coach analyzes your daily inputs, answers complex nutritional questions instantly, and adjusts your plan in real-time based on your progress.
                    </p>
                    
                    <ul className="space-y-4 mb-10">
                        {['Instant Meal Modifications', 'Grocery Shopping Assistance', 'Real-time Macro Calculations', 'Dining Out Recommendations'].map((item, i) => (
                            <li key={i} className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#a5d391]">check_circle</span>
                                <span className="text-white/80 font-medium">{item}</span>
                            </li>
                        ))}
                    </ul>

                    <Link 
                        to="/ai-chat"
                        className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-[#a5d391] transition-all shadow-lg hover:shadow-[0_0_20px_rgba(165,211,145,0.6)] cursor-pointer hover:-translate-y-0.5"
                    >
                        Chat with AI Now
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default AINutritionCoach;
