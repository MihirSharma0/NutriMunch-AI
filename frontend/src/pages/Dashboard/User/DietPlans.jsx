import React, { useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';

const DietPlans = () => {
    const { user } = useContext(AuthContext);

    if (!user) {
        return <FeatureGate />;
    }

    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold font-hero-display mb-8 tracking-tight text-white">Generative Diet Plans</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-[#a5d391]/10 blur-[70px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10 gap-4">
                            <div>
                                <h2 className="text-2xl font-bold mb-1 font-hero-display">Today's Active Formulation</h2>
                                <p className="text-white/50 text-sm">Target: 2,100 kcal • Macro Ratio: 40/30/30</p>
                            </div>
                            <span className="bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30 px-3.5 py-1 text-xs font-bold uppercase tracking-widest rounded-full backdrop-blur-md">
                                Optimized
                            </span>
                        </div>

                        <div className="space-y-4 relative z-10">
                            {/* Meal 1 */}
                            <div className="bg-[#080b12]/80 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center">
                                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCP3nQl8b8LU4xjhNKoFcksaAJAjAhTnIGG2n1OFkuoOSwfz2dP7FAXSAOYxRMQnk-7DuXqJnLBChFdrlYZYn7QRk44BaFOFR2McC9ByzI_n03ycyhSZau2fg6iJK1GAFUkV4y7UukilqbSfJNx3Q8s0FvRM0-MajLqixc-NBO9J64ponXllcmORWHcgIeBm5dZrQfkN2U7pz_JafhB_yLLV-RpZx1y4M7u03vzO6MnM8K3Da2D98Hb" alt="Breakfast" className="w-20 h-20 rounded-xl object-cover" />
                                <div className="flex-grow text-center md:text-left">
                                    <div className="text-xs text-[#a5d391] font-bold uppercase tracking-widest mb-1">Breakfast (08:00)</div>
                                    <div className="font-bold">Kinetic Synthesis Bowl</div>
                                    <div className="text-xs text-white/50">Oats, Whey Isolate, Mixed Berries, Chia Seeds</div>
                                </div>
                                <div className="text-center md:text-right">
                                    <div className="font-bold text-lg font-hero-display">450 <span className="text-xs text-white/50">kcal</span></div>
                                    <div className="text-xs text-white/40">35P / 45C / 12F</div>
                                </div>
                            </div>
                            
                            {/* Meal 2 */}
                            <div className="bg-[#080b12]/60 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center opacity-70">
                                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZLrZKLb7jzMmFQ5c6qGbPfOriSTc2BC_huR3PJJqupenaW5lWxSI7_t5rEsctSs00W6MwL6qe-qHTKrEjUZAEjRruf0uHFev2ubNwTi4kWIBFgSVq9eO-2GXDO-gHwKpeCq41OZyuAkBa0fNoruRCpaRGqXAPY7wcb-m01KQ-q4hj5mEWx3oKu0Jdv0Iv-jfmt0C8yuj48YFkyamuApv5yVIztLtfvuR9f3xAvA3JU1uCRp1uckTy" alt="Lunch" className="w-20 h-20 rounded-xl object-cover grayscale" />
                                <div className="flex-grow text-center md:text-left">
                                    <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Lunch (13:00)</div>
                                    <div className="font-bold">Neural Broth v4.2</div>
                                    <div className="text-xs text-white/50">Chicken Bone Broth, Quinoa, Bok Choy</div>
                                </div>
                                <div className="text-center md:text-right">
                                    <div className="font-bold text-lg font-hero-display">650 <span className="text-xs text-white/50">kcal</span></div>
                                    <div className="text-xs text-white/40">55P / 60C / 20F</div>
                                </div>
                            </div>
                            
                            {/* Meal 3 */}
                            <div className="bg-[#080b12]/60 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center opacity-70">
                                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAW563tK2alaIdKa-cuEfnJW_382lfBQKNmuA-kMrz16M4r0j_X2E-NwzxGnDRl0tocPS3FptCrFu8YlmyZVNj3JFmfqOmLXYrG0ZwVT8uy224ZUKl3NEzQCmKUTO2msjUepTc_nVcKorAi6FUfm_iG51_uMfIOsUZ6jT5AARtHZZqyjyDau5TLry4qgYRmogxwX3RY3MnDdtrqs7kp4S-dvhaj0IMgdKyGytNOKy-15cE-Ml0DX-bU" alt="Dinner" className="w-20 h-20 rounded-xl object-cover grayscale" />
                                <div className="flex-grow text-center md:text-left">
                                    <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Dinner (19:30)</div>
                                    <div className="font-bold">REM Cycle Extract</div>
                                    <div className="text-xs text-white/50">Wild Salmon, Sweet Potato, Asparagus</div>
                                </div>
                                <div className="text-center md:text-right">
                                    <div className="font-bold text-lg font-hero-display">700 <span className="text-xs text-white/50">kcal</span></div>
                                    <div className="text-xs text-white/40">50P / 55C / 28F</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
                        <h3 className="font-bold mb-4 flex items-center gap-2 font-hero-display">
                            <span className="material-symbols-outlined text-[#a5d391]">shopping_cart</span>
                            Grocery List
                        </h3>
                        <p className="text-white/50 text-sm mb-4">Algorithmically compiled for the next 7 days based on your generated meal plans.</p>
                        
                        <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="accent-[#a5d391] w-4 h-4 rounded" />
                                <span className="text-sm">Organic Chicken Breast (2lbs)</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="accent-[#a5d391] w-4 h-4 rounded" />
                                <span className="text-sm">Wild Caught Salmon (1.5lbs)</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="accent-[#a5d391] w-4 h-4 rounded" />
                                <span className="text-sm">Sweet Potatoes (3lbs)</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="accent-[#a5d391] w-4 h-4 rounded" defaultChecked />
                                <span className="text-sm line-through text-white/30">Oatmeal (1 box)</span>
                            </div>
                        </div>

                        <button className="w-full bg-[#080b12]/80 border border-white/10 hover:border-[#a5d391]/30 text-white font-bold py-3 rounded-2xl transition-colors cursor-pointer">
                            Export to Instacart
                        </button>
                    </div>

                    <div className="bg-gradient-to-br from-[#a5d391]/10 to-transparent backdrop-blur-xl border border-[#a5d391]/20 rounded-[2.5rem] p-6 text-center shadow-xl">
                        <span className="material-symbols-outlined text-[#a5d391] text-4xl mb-2">smart_toy</span>
                        <h4 className="font-bold mb-2 font-hero-display text-lg">Request Macro Shift</h4>
                        <p className="text-white/60 text-xs mb-4">Going out for dinner tonight? Tell the AI to recalculate the rest of your day.</p>
                        <button className="bg-[#a5d391] text-black font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer">
                            Initialize Adjustment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DietPlans;
