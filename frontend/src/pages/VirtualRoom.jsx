import React, { useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const VirtualRoom = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const isNutritionist = user?.role && (
        String(user.role).toUpperCase().includes('NUTRITIONIST') ||
        String(user.role).toUpperCase().includes('NUTRITIONIST')
    );

    const schedulePath = isNutritionist ? '/dashboard/nutritionist/schedule' : '/appointments';
    const scheduleLabel = isNutritionist ? 'View Schedule' : 'View Appointments';

    return (
        <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 sm:p-14 text-center shadow-2xl relative overflow-hidden">
                {/* Glow behind */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#a5d391]/10 rounded-full blur-[90px] pointer-events-none"></div>

                <div className="relative z-10 space-y-6">
                    <div className="w-20 h-20 rounded-full bg-[#a5d391]/15 text-[#a5d391] border border-[#a5d391]/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(165,211,145,0.25)]">
                        <span className="material-symbols-outlined text-4xl">videocam</span>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#a5d391]/10 border border-[#a5d391]/25 text-[#a5d391] text-xs font-bold uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-[#a5d391] animate-pulse"></span>
                        Upcoming Major Project Feature
                    </div>

                    <h1 className="font-hero-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
                        Virtual Consultation Room
                    </h1>

                    <div className="max-w-2xl mx-auto bg-[#080b12]/90 border border-white/15 rounded-2xl p-6 sm:p-8 shadow-inner space-y-3">
                        <p className="text-xl sm:text-2xl font-bold text-[#a5d391] leading-relaxed">
                            "We have thought to develop this feature in the major project."
                        </p>
                        <p className="text-sm text-white/60 leading-relaxed">
                            Encrypted peer-to-peer WebRTC video streaming, interactive screen-sharing, live clinical biometric overlays, and session recording are planned as part of the Major Project phase.
                        </p>
                    </div>

                    <div className="pt-4 flex flex-wrap justify-center items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="bg-[#a5d391] hover:bg-white text-black px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] hover:scale-105 cursor-pointer flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">arrow_back</span>
                            <span>Go Back</span>
                        </button>
                        <Link
                            to={schedulePath}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">calendar_month</span>
                            <span>{scheduleLabel}</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VirtualRoom;
