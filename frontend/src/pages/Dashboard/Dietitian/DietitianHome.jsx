import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';
import api from '../../../api/axios';

const DietitianHome = () => {
    const { user } = useContext(AuthContext);
    const [walletBalance, setWalletBalance] = useState(null);

    useEffect(() => {
        const userKeyId = user?.id || user?.userId;
        const userKeyEmail = user?.email?.toLowerCase();

        const resolveCachedBalance = () => {
            if (!userKeyId && !userKeyEmail) return 0;
            const keys = [
                userKeyId ? `nutrimunch_wallet_balance_id_${userKeyId}` : null,
                userKeyId ? `nutrimunch_wallet_balance_${userKeyId}` : null,
                userKeyEmail ? `nutrimunch_wallet_balance_email_${userKeyEmail}` : null,
                userKeyEmail ? `nutrimunch_wallet_balance_${userKeyEmail}` : null
            ].filter(Boolean);
            let maxBal = 0;
            for (const k of keys) {
                const v = localStorage.getItem(k);
                if (v !== null && !isNaN(Number(v))) {
                    maxBal = Math.max(maxBal, Number(v));
                }
            }
            return maxBal;
        };

        const fetchWallet = async () => {
            if (!userKeyId && !userKeyEmail) {
                setWalletBalance(0);
                return;
            }
            try {
                const res = await api.get('/wallet/me', {
                    params: {
                        userId: userKeyId || '',
                        email: userKeyEmail || ''
                    }
                });
                if (res.data && typeof res.data.balance !== 'undefined' && res.data.balance !== null) {
                    const sBal = Number(res.data.balance);
                    setWalletBalance(sBal);
                    if (userKeyId) localStorage.setItem(`nutrimunch_wallet_balance_id_${userKeyId}`, String(sBal));
                    if (userKeyEmail) localStorage.setItem(`nutrimunch_wallet_balance_email_${userKeyEmail}`, String(sBal));
                    return;
                }
            } catch (err) {}
            const cached = resolveCachedBalance();
            setWalletBalance(cached);
        };

        fetchWallet();

        const handleWalletUpdate = (e) => {
            const myId = String(userKeyId || '');
            const myEmail = (userKeyEmail || user?.username || '').toLowerCase();

            if (e?.type === 'storage' && e?.key) {
                const key = e.key;
                if (!key.startsWith('nutrimunch_wallet_balance')) return;
                const matchesMe = (myId && key.includes(myId)) || (myEmail && key.includes(myEmail));
                if (!matchesMe) return;
                const val = localStorage.getItem(key);
                if (val !== null && !isNaN(Number(val))) {
                    setWalletBalance(Number(val));
                    return;
                }
            }

            if (e?.detail) {
                const targetId = String(e.detail.recipientId || '');
                const targetEmail = (e.detail.recipientEmail || '').toLowerCase();
                const isForMe = (targetId && myId && targetId === myId) || 
                                (targetEmail && myEmail && targetEmail === myEmail) ||
                                (!targetId && !targetEmail);
                if (!isForMe) return;

                const pushedVal = e.detail.newBalance !== undefined && e.detail.newBalance !== null
                    ? e.detail.newBalance
                    : e.detail.balance;

                if (pushedVal !== undefined && pushedVal !== null) {
                    const newBal = Number(pushedVal);
                    setWalletBalance(newBal);
                    if (myId) localStorage.setItem(`nutrimunch_wallet_balance_${myId}`, String(newBal));
                    if (myEmail) localStorage.setItem(`nutrimunch_wallet_balance_${myEmail}`, String(newBal));
                    return;
                }
            }
        };

        window.addEventListener('wallet_updated', handleWalletUpdate);
        window.addEventListener('storage', handleWalletUpdate);

        let bc;
        try {
            bc = new BroadcastChannel('nutrimunch_clinical_channel');
            bc.onmessage = (event) => {
                if (event.data?.type === 'WALLET_CREDITED' || event.data?.type === 'WALLET_UPDATED') {
                    const targetId = String(event.data.recipientId || '');
                    const targetEmail = (event.data.recipientEmail || '').toLowerCase();
                    const myId = String(userKeyId || '');
                    const myEmail = (userKeyEmail || user?.username || '').toLowerCase();
                    const isForMe = (targetId && myId && targetId === myId) || 
                                    (targetEmail && myEmail && targetEmail === myEmail) ||
                                    (!targetId && !targetEmail);
                    if (!isForMe) return;

                    // Direct Push: Apply pushed balance immediately with zero server load
                    const pushedVal = event.data.newBalance !== undefined && event.data.newBalance !== null
                        ? event.data.newBalance
                        : event.data.balance;

                    if (pushedVal !== undefined && pushedVal !== null) {
                        const newBal = Number(pushedVal);
                        setWalletBalance(newBal);
                        if (myId) localStorage.setItem(`nutrimunch_wallet_balance_${myId}`, String(newBal));
                        if (myEmail) localStorage.setItem(`nutrimunch_wallet_balance_${myEmail}`, String(newBal));
                    }
                }
            };
        } catch (e) {}

        return () => {
            window.removeEventListener('wallet_updated', handleWalletUpdate);
            window.removeEventListener('storage', handleWalletUpdate);
            if (bc) bc.close();
        };
    }, [user]);

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-5 flex flex-col justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Active Roster</div>
                        <span className="material-symbols-outlined text-[#a5d391] text-[20px]">groups</span>
                    </div>
                    <div>
                        <div className="text-3xl font-bold font-hero-display">42</div>
                        <div className="text-xs text-[#a5d391] font-bold mt-1">+3 this week</div>
                    </div>
                </div>
                
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-5 flex flex-col justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Avg Adherence</div>
                        <span className="material-symbols-outlined text-[#a5d391] text-[20px]">analytics</span>
                    </div>
                    <div>
                        <div className="text-3xl font-bold font-hero-display">88%</div>
                        <div className="text-xs text-white/50 mt-1">Across all active protocols</div>
                    </div>
                </div>

                {/* Live App Wallet Earnings Card - Clickable Hyperlink to Nutritionist Transaction History */}
                <Link
                    to="/dashboard/nutritionist/transactions"
                    className="bg-gradient-to-br from-[#a5d391]/15 via-white/5 to-transparent backdrop-blur-xl border border-[#a5d391]/30 rounded-[2.5rem] p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(165,211,145,0.15)] hover:border-[#a5d391] hover:scale-[1.02] transition-all cursor-pointer group block"
                    title="Click to view full transaction ledger and session earnings"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-[#a5d391] text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#a5d391] animate-pulse"></span>
                            Wallet Earnings
                        </div>
                        <div className="flex items-center gap-1 text-[#a5d391] group-hover:translate-x-0.5 transition-transform">
                            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                            <span className="material-symbols-outlined text-sm opacity-60">arrow_forward</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold font-hero-display text-[#a5d391] font-mono">
                            {walletBalance !== null ? `₹${parseFloat(walletBalance).toFixed(2)}` : '₹0.00'}
                        </div>
                        <div className="text-xs text-white/60 mt-1 flex items-center justify-between">
                            <span>Direct session credits</span>
                            <span className="text-[#a5d391] font-bold text-[10px] uppercase tracking-wider group-hover:underline">View History →</span>
                        </div>
                    </div>
                </Link>

                <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-[2.5rem] p-5 flex flex-col justify-between shadow-[0_0_25px_rgba(239,68,68,0.15)]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-red-400 text-[10px] font-bold uppercase tracking-widest">AI Anomalies</div>
                        <span className="material-symbols-outlined text-red-400 text-[20px] animate-pulse">warning</span>
                    </div>
                    <div>
                        <div className="text-3xl font-bold font-hero-display text-red-400">2</div>
                        <div className="text-xs text-red-400/70 mt-1">Require manual override</div>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-5 flex flex-col justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
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
                                    {consult.status === 'next' && (
                                        <Link 
                                            to="/virtual-room" 
                                            className="bg-[#a5d391] text-black text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white transition-colors cursor-pointer shadow-[0_0_15px_rgba(165,211,145,0.3)] inline-block"
                                        >
                                            Join Room
                                        </Link>
                                    )}
                                    {consult.status === 'pending' && <span className="material-symbols-outlined text-white/30 text-sm">schedule</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/10 flex justify-end">
                        <Link
                            to="/dashboard/nutritionist/schedule"
                            className="bg-[#a5d391]/15 hover:bg-[#a5d391] text-[#a5d391] hover:text-black border border-[#a5d391]/30 font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                        >
                            <span className="material-symbols-outlined text-sm">calendar_month</span>
                            <span>View Schedule</span>
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* FORMULATED DIET PROTOCOLS HISTORY VAULT SECTION */}
            <div className="mt-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#a5d391] text-xl">history_edu</span>
                            <h2 className="text-xl font-bold font-hero-display text-white">Formulated Diet Protocols History</h2>
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                            Recent general public protocols and exclusive patient diet formulations created from your clinical console.
                        </p>
                    </div>

                    <a
                        href="/dashboard/nutritionist/builder"
                        className="bg-[#a5d391] hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0"
                    >
                        <span>Open Diet Builder Vault</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </a>
                </div>

                {/* History Items Grid */}
                {(() => {
                    let history = [];
                    try {
                        const raw = localStorage.getItem('nutrimunch_diet_plans_history');
                        if (raw) history = JSON.parse(raw);
                    } catch (e) {}

                    if (!history || history.length === 0) {
                        history = [
                            { id: "h1", title: "Clinical Metabolic Optimization Protocol", scope: "GENERAL", targetUserName: "All Users", calories: 2100, protein: 160, carbs: 150, fats: 70, waterLiters: 3.0, dietType: "High-Protein Metabolic" },
                            { id: "h2", title: "Ketogenic Glycemic Reset Protocol", scope: "GENERAL", targetUserName: "All Users", calories: 2050, protein: 140, carbs: 35, fats: 150, waterLiters: 3.2, dietType: "Keto Glycemic Reset" },
                            { id: "h3", title: "Exclusive Protocol for David Miller", scope: "EXCLUSIVE", targetUserName: "David Miller", calories: 2200, protein: 165, carbs: 160, fats: 68, waterLiters: 3.2, dietType: "High-Protein Metabolic" }
                        ];
                    }

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {history.slice(0, 3).map((item) => (
                                <div
                                    key={item.id}
                                    className="p-5 rounded-2xl bg-[#080b12]/80 border border-white/10 hover:border-[#a5d391]/40 transition-all flex flex-col justify-between space-y-4 group"
                                >
                                    <div>
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                                item.scope === 'GENERAL'
                                                    ? 'bg-[#a5d391]/15 text-[#a5d391] border-[#a5d391]/30'
                                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                            }`}>
                                                {item.scope === 'GENERAL' ? 'General Protocol' : `Exclusive: ${item.targetUserName || 'Patient'}`}
                                            </span>
                                            <span className="text-[10px] text-white/30 font-mono">#{item.id.slice(-6)}</span>
                                        </div>
                                        <h3 className="font-bold text-sm text-white group-hover:text-[#a5d391] transition-colors truncate">
                                            {item.title || item.planTitle || 'Custom Protocol'}
                                        </h3>
                                        <span className="text-[11px] text-white/50 block mt-0.5">
                                            {item.dietType || 'Clinical Formulation'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-4 gap-1.5 p-2 bg-white/5 rounded-xl text-center text-[10px]">
                                        <div><span className="text-white/40 block text-[8px] uppercase">Cal</span><strong className="text-white">{item.calories}</strong></div>
                                        <div><span className="text-white/40 block text-[8px] uppercase">Prot</span><strong className="text-[#a5d391]">{item.protein}g</strong></div>
                                        <div><span className="text-white/40 block text-[8px] uppercase">Carb</span><strong className="text-cyan-300">{item.carbs}g</strong></div>
                                        <div><span className="text-white/40 block text-[8px] uppercase">Fat</span><strong className="text-amber-300">{item.fats}g</strong></div>
                                    </div>

                                    <a
                                        href="/dashboard/nutritionist/builder"
                                        className="text-xs font-bold text-[#a5d391] hover:text-white transition-colors flex items-center justify-between pt-2 border-t border-white/5"
                                    >
                                        <span>View in Builder Vault</span>
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </a>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default DietitianHome;
