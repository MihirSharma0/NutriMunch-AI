import React, { useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';

const Reports = () => {
    const { user } = useContext(AuthContext);

    if (!user) {
        return <FeatureGate />;
    }

    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold font-hero-display mb-8 tracking-tight text-white">Data Exports</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Generation Block */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-xl">
                    <h3 className="font-bold mb-2 font-hero-display text-lg">Compile Custom Report</h3>
                    <p className="text-white/50 text-sm mb-6">Select the parameters for your generated health summary. Useful for sharing with primary care physicians.</p>
                    
                    <form className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-[#a5d391] mb-2 block">Timeframe</label>
                            <select className="w-full bg-[#080b12]/80 border border-white/10 px-4 py-3 rounded-xl text-sm outline-none focus:border-[#a5d391]/50 text-white transition-colors">
                                <option>Last 30 Days</option>
                                <option>Last 90 Days</option>
                                <option>Year to Date</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-[#a5d391] mb-2 block">Included Metrics</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" defaultChecked className="accent-[#a5d391] w-4 h-4 rounded" />
                                    <span className="text-sm text-white/80 group-hover:text-[#a5d391] transition-colors">Macronutrient Adherence</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" defaultChecked className="accent-[#a5d391] w-4 h-4 rounded" />
                                    <span className="text-sm text-white/80 group-hover:text-[#a5d391] transition-colors">Biometric Baselines (HRV, Sleep)</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" defaultChecked className="accent-[#a5d391] w-4 h-4 rounded" />
                                    <span className="text-sm text-white/80 group-hover:text-[#a5d391] transition-colors">Blood Glucose Spikes (CGM)</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" className="accent-[#a5d391] w-4 h-4 rounded" />
                                    <span className="text-sm text-white/80 group-hover:text-[#a5d391] transition-colors">Clinical Notes</span>
                                </label>
                            </div>
                        </div>

                        <button type="button" className="w-full bg-[#a5d391] text-black font-bold py-4 rounded-2xl mt-4 hover:bg-white transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer">
                            <span className="material-symbols-outlined text-xl">auto_awesome</span>
                            Generate PDF
                        </button>
                    </form>
                </div>

                {/* Archive Block */}
                <div>
                    <h2 className="text-lg font-bold font-hero-display text-white/70 mb-4">Report Archive</h2>
                    <div className="space-y-4">
                        
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-[#a5d391]/30 transition-colors group cursor-pointer shadow-lg">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className="w-10 h-10 shrink-0 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20 text-red-500">
                                    <span className="material-symbols-outlined">picture_as_pdf</span>
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-sm font-hero-display">Q3 Metabolic Summary</div>
                                    <div className="text-xs text-white/40">Generated Oct 01, 2026 • 2.4 MB</div>
                                </div>
                            </div>
                            <span className="material-symbols-outlined shrink-0 text-white/30 group-hover:text-[#a5d391] transition-colors">download</span>
                        </div>
                        
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-[#a5d391]/30 transition-colors group cursor-pointer shadow-lg">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className="w-10 h-10 shrink-0 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20 text-red-500">
                                    <span className="material-symbols-outlined">picture_as_pdf</span>
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-sm font-hero-display">Initial Baseline Assessment</div>
                                    <div className="text-xs text-white/40">Generated Sep 28, 2026 • 5.1 MB</div>
                                </div>
                            </div>
                            <span className="material-symbols-outlined shrink-0 text-white/30 group-hover:text-[#a5d391] transition-colors">download</span>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default Reports;
