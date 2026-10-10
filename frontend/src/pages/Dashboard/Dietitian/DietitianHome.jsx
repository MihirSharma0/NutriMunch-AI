import React, { useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';

const DietitianHome = () => {
    const { user } = useContext(AuthContext);

    if (!user) {
        return <FeatureGate />;
    }

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white">Clinical Command Center</h1>
                    <p className="text-sm text-white/50 mt-1">Real-time patient monitoring and algorithmic nutrition oversight.</p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#a5d391]/10 border border-[#a5d391]/20 text-[#a5d391] text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-[#a5d391] animate-pulse"></span>
                    Clinical AI Agent Operational
                </div>
            </div>
            
            {/* Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex flex-col justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Active Roster</div>
                        <span className="material-symbols-outlined text-[#a5d391] text-[20px]">groups</span>
                    </div>
                    <div>
                        <div className="text-3xl font-bold font-hero-display">42</div>
                        <div className="text-xs text-[#a5d391] font-bold mt-1">+3 this week</div>
                    </div>
                </div>
                
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex flex-col justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Avg Adherence</div>
                        <span className="material-symbols-outlined text-[#a5d391] text-[20px]">analytics</span>
                    </div>
                    <div>
                        <div className="text-3xl font-bold font-hero-display">88%</div>
                        <div className="text-xs text-white/50 mt-1">Across all active protocols</div>
                    </div>
                </div>

                <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-[2.5rem] p-6 flex flex-col justify-between shadow-[0_0_25px_rgba(239,68,68,0.15)]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-red-400 text-[10px] font-bold uppercase tracking-widest">AI Anomalies</div>
                        <span className="material-symbols-outlined text-red-400 text-[20px] animate-pulse">warning</span>
                    </div>
                    <div>
                        <div className="text-3xl font-bold font-hero-display text-red-400">2</div>
                        <div className="text-xs text-red-400/70 mt-1">Require manual override</div>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex flex-col justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Today's Consults</div>
                        <span className="material-symbols-outlined text-[#a5d391] text-[20px]">event_available</span>
                    </div>
                    <div>
                        <div className="text-3xl font-bold font-hero-display">4</div>
                        <div className="text-xs text-white/50 mt-1">Next at 14:00 EST</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* AI Override Alerts */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
                    <h2 className="text-lg font-bold font-hero-display mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-400">crisis_alert</span>
                        Priority Interventions
                    </h2>
                    
                    <div className="space-y-4">
                        <div className="bg-[#080b12]/80 border border-red-500/30 rounded-2xl p-5 relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                            <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                <div>
                                    <span className="text-xs font-bold bg-red-500/20 text-red-400 px-2.5 py-1 rounded-md uppercase tracking-widest">CGM Spike Detected</span>
                                </div>
                                <span className="text-xs text-white/40">10m ago</span>
                            </div>
                            <h3 className="font-bold text-white mb-1">Subject: David M. (ID: 442)</h3>
                            <p className="text-white/60 text-sm mb-4">
                                AI algorithm detected a sustained glucose spike &gt; 180 mg/dL after prescribed "Kinetic Bowl". Generative engine paused future carb loading. Human verification required to approve alternate formulation.
                            </p>
                            <button className="text-xs font-bold text-[#a5d391] hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1 cursor-pointer">
                                Review Protocol <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>

                        <div className="bg-[#080b12]/80 border border-yellow-500/30 rounded-2xl p-5 relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500"></div>
                            <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                <div>
                                    <span className="text-xs font-bold bg-yellow-500/20 text-yellow-500 px-2.5 py-1 rounded-md uppercase tracking-widest">Adherence Drop</span>
                                </div>
                                <span className="text-xs text-white/40">2h ago</span>
                            </div>
                            <h3 className="font-bold text-white mb-1">Subject: Sarah J. (ID: 891)</h3>
                            <p className="text-white/60 text-sm mb-4">
                                Macro adherence dropped below 70% for 3 consecutive days. Generative engine suggests switching from "Hypertrophy" to "Maintenance" template to reduce fatigue.
                            </p>
                            <button className="text-xs font-bold text-[#a5d391] hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1 cursor-pointer">
                                Review Protocol <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Upcoming Schedule */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
                        <h2 className="text-lg font-bold font-hero-display flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#a5d391]">videocam</span>
                            Today's Consultations
                        </h2>
                        <span className="text-xs text-[#a5d391] uppercase tracking-widest font-black bg-[#a5d391]/10 px-3 py-1 rounded-full border border-[#a5d391]/20">OCT 12</span>
                    </div>

                    <div className="space-y-4">
                        {[
                            { time: "10:00 AM", name: "Marcus Chen", type: "Baseline Review", status: "completed" },
                            { time: "02:00 PM", name: "Sarah Jenkins", type: "Protocol Adjustment", status: "next" },
                            { time: "04:30 PM", name: "David M.", type: "Emergency Override Consult", status: "pending" },
                        ].map((consult, idx) => (
                            <div key={idx} className={`flex items-center gap-3 sm:gap-4 p-4 rounded-2xl border ${consult.status === 'next' ? 'bg-[#a5d391]/10 border-[#a5d391]/30' : 'bg-[#080b12]/80 border-white/10'}`}>
                                <div className="text-center min-w-[56px] sm:min-w-[70px]">
                                    <div className="font-bold text-sm">{consult.time.split(' ')[0]}</div>
                                    <div className="text-[10px] text-white/40 uppercase tracking-widest">{consult.time.split(' ')[1]}</div>
                                </div>
                                <div className="w-px h-8 bg-white/10"></div>
                                <div className="flex-grow min-w-0">
                                    <div className="font-bold text-sm truncate">{consult.name}</div>
                                    <div className="text-xs text-white/50 truncate">{consult.type}</div>
                                </div>
                                <div>
                                    {consult.status === 'completed' && <span className="material-symbols-outlined text-[#a5d391] text-sm">check_circle</span>}
                                    {consult.status === 'next' && <button className="bg-[#a5d391] text-black text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white transition-colors cursor-pointer shadow-[0_0_15px_rgba(165,211,145,0.3)]">Join</button>}
                                    {consult.status === 'pending' && <span className="material-symbols-outlined text-white/30 text-sm">schedule</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DietitianHome;
