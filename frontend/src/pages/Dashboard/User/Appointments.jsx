import React, { useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';

const Appointments = () => {
    const { user } = useContext(AuthContext);

    if (!user) {
        return <FeatureGate />;
    }

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white">Consultations</h1>
                <button className="bg-[#a5d391] text-black font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer">
                    Initialize Booking
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-lg font-bold font-hero-display text-white/70">Upcoming Link</h2>
                    
                    <div className="bg-gradient-to-r from-[#a5d391]/10 via-white/5 to-[#080b12] backdrop-blur-xl border border-[#a5d391]/30 rounded-[2.5rem] p-6 lg:p-8 flex flex-col md:flex-row gap-6 items-center shadow-xl">
                        <div className="bg-[#080b12]/80 border border-white/10 rounded-2xl p-4 text-center min-w-[100px]">
                            <div className="text-[#a5d391] font-bold text-xs uppercase tracking-widest mb-1">OCT</div>
                            <div className="text-3xl font-bold font-hero-display">15</div>
                            <div className="text-white/40 text-xs mt-1">14:00 EST</div>
                        </div>
                        <div className="flex-grow text-center md:text-left">
                            <h3 className="font-bold text-xl mb-1 font-hero-display">Metabolic Baseline Review</h3>
                            <p className="text-white/60 text-sm mb-4">Dr. Elena Rostova will review your recent CGM data and adjust the macro generation algorithm.</p>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                <button className="bg-[#a5d391] text-black px-5 py-2.5 rounded-full text-xs font-bold hover:bg-white transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(165,211,145,0.3)] cursor-pointer">
                                    <span className="material-symbols-outlined text-sm">videocam</span> Join Channel
                                </button>
                                <button className="border border-white/20 text-white/70 px-5 py-2.5 rounded-full text-xs font-bold hover:text-white hover:border-white transition-colors cursor-pointer">
                                    Reschedule
                                </button>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-lg font-bold font-hero-display text-white/70 mt-12">Historical Logs</h2>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-xl">
                        {[1, 2, 3].map((item, idx) => (
                            <div key={idx} className={`p-6 flex items-center justify-between gap-3 ${idx !== 2 ? 'border-b border-white/10' : ''} hover:bg-white/5 transition-colors cursor-pointer`}>
                                <div className="min-w-0">
                                    <div className="font-bold mb-1 font-hero-display truncate">Initial AI Protocol Setup</div>
                                    <div className="text-sm text-white/50 truncate">Sep 28, 2026 • 45m Session</div>
                                </div>
                                <span className="material-symbols-outlined shrink-0 text-[#a5d391]">chevron_right</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 sticky top-24 shadow-xl">
                        <h3 className="font-bold mb-6 font-hero-display text-lg">Assigned Node</h3>
                        <div className="flex items-center gap-4 mb-6">
                            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCP3nQl8b8LU4xjhNKoFcksaAJAjAhTnIGG2n1OFkuoOSwfz2dP7FAXSAOYxRMQnk-7DuXqJnLBChFdrlYZYn7QRk44BaFOFR2McC9ByzI_n03ycyhSZau2fg6iJK1GAFUkV4y7UukilqbSfJNx3Q8s0FvRM0-MajLqixc-NBO9J64ponXllcmORWHcgIeBm5dZrQfkN2U7pz_JafhB_yLLV-RpZx1y4M7u03vzO6MnM8K3Da2D98Hb" alt="Doctor" className="w-16 h-16 rounded-full object-cover border border-[#a5d391]/40 shadow-lg" />
                            <div>
                                <div className="font-bold text-white">Dr. Elena Rostova</div>
                                <div className="text-[#a5d391] text-xs font-bold uppercase tracking-wider">Algorithmic Biologist</div>
                            </div>
                        </div>
                        <button className="w-full border border-[#a5d391]/30 text-[#a5d391] px-4 py-3 rounded-2xl text-sm font-bold hover:bg-[#a5d391] hover:text-black transition-all flex items-center justify-center gap-2 mb-4 cursor-pointer">
                            <span className="material-symbols-outlined text-sm">chat</span> Direct Message
                        </button>
                        <p className="text-xs text-white/40 text-center">Avg response time: 2 hours</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Appointments;
