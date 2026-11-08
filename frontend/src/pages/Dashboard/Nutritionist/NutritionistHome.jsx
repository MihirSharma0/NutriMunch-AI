/**
 * Nutritionist Clinical Command Dashboard
 * Telemetry command center for certified nutritionists displaying patient rosters,
 * upcoming appointments, earnings balance, and rapid consultation actions.
 */
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';
import api from '../../../api/axios';
import { getCanonicalBalance } from '../../../utils/walletSse';

/**
 * NutritionistHome Component
 * Clinical practice overview presenting consultation calendar, patient metrics, and wallet balance.
 */
const NutritionistHome = () => {
    const { user } = useContext(AuthContext);
    const [walletBalance, setWalletBalance] = useState(() => getCanonicalBalance() ?? 0);
    const [upcomingConsultations, setUpcomingConsultations] = useState([]);
    const [consultationRecords, setConsultationRecords] = useState([]);
    const [consultationsLoading, setConsultationsLoading] = useState(true);
    const [protocolHistory, setProtocolHistory] = useState([]);
    const myId = String(user?.id || user?.userId || '');
    const myEmail = String(user?.email || '').toLowerCase().trim();

    // Own created plans come from the server so this dashboard works after any
    // login, on any device, and never shows another nutritionist's plans.
    useEffect(() => {
        let cancelled = false;
        const loadProtocols = async () => {
            let serverList = [];
            let localList = [];
            try {
                const res = await api.get('/diet-plans/published');
                if (Array.isArray(res.data)) serverList = res.data;
            } catch { /* fall back to the local draft cache below */ }
            try {
                const raw = localStorage.getItem('nutrimunch_diet_plans_history');
                const parsed = raw ? JSON.parse(raw) : [];
                localList = (Array.isArray(parsed) ? parsed : []).filter(plan =>
                    (myId && String(plan.nutritionistId ?? '') === myId) ||
                    (myEmail && String(plan.authorEmail || plan.nutritionistEmail || '').toLowerCase().trim() === myEmail));
            } catch { localList = []; }

            const merged = [...serverList];
            localList.forEach(plan => {
                if (!merged.some(existing => String(existing.id) === String(plan.id))) merged.push(plan);
            });
            merged.sort((a, b) =>
                (new Date(b.deployedAt || b.createdAt || 0).getTime()) -
                (new Date(a.deployedAt || a.createdAt || 0).getTime()));
            if (!cancelled) setProtocolHistory(merged);
        };
        loadProtocols();
        window.addEventListener('nutrimunch_diet_history_updated', loadProtocols);
        window.addEventListener('storage', loadProtocols);
        return () => {
            cancelled = true;
            window.removeEventListener('nutrimunch_diet_history_updated', loadProtocols);
            window.removeEventListener('storage', loadProtocols);
        };
    }, [myId, myEmail]);

    // Server-authoritative wallet balance: one fetch at session start, SSE pushes
    // afterwards. No per-navigation balance GET and no localStorage balance keys.
    useEffect(() => {
        const applyBalance = (bal) => {
            const num = Number(bal);
            if (!isNaN(num)) setWalletBalance(num);
        };
        const onResync = (e) => applyBalance(e?.detail?.balance);
        const onPush = (e) => {
            const d = e?.detail;
            if (!d) return;
            const myId = String(user?.id || user?.userId || '');
            const myEmail = String(user?.email || '').toLowerCase();
            const targetId = String(d.recipientId || '');
            const targetEmail = String(d.recipientEmail || '').toLowerCase();
            const isForMe = (targetId && myId && targetId === myId) ||
                            (targetEmail && myEmail && targetEmail === myEmail) ||
                            (!targetId && !targetEmail);
            if (!isForMe) return;
            applyBalance(d.newBalance ?? d.balance);
        };

        const initial = getCanonicalBalance();
        if (initial !== null) applyBalance(initial);
        window.addEventListener('wallet_balance_resynced', onResync);
        window.addEventListener('wallet_update', onPush);
        window.addEventListener('wallet_updated', onPush);

        return () => {
            window.removeEventListener('wallet_balance_resynced', onResync);
            window.removeEventListener('wallet_update', onPush);
            window.removeEventListener('wallet_updated', onPush);
        };
    }, [user]);

    useEffect(() => {
        let active = true;
        const loadUpcomingConsultations = async () => {
            if (!user) {
                setConsultationsLoading(false);
                return;
            }
            try {
                const { data } = await api.get('/appointments/me');
                const now = new Date();
                const records = (Array.isArray(data) ? data : [])
                    .filter(appointment => {
                        const appointmentDate = new Date(appointment.appointmentTime);
                        const status = String(appointment.status || '').toUpperCase();
                        return !Number.isNaN(appointmentDate.getTime())
                            && !['CANCELLED', 'COMPLETED', 'REJECTED'].includes(status);
                    })
                    .sort((a, b) => new Date(a.appointmentTime) - new Date(b.appointmentTime));
                const upcoming = records
                    .filter(appointment => new Date(appointment.appointmentTime) >= now)
                    .slice(0, 4);
                if (active) {
                    setConsultationRecords(records);
                    setUpcomingConsultations(upcoming);
                }
            } catch (error) {
                console.error('Failed to load upcoming consultations:', error);
                if (active) {
                    setConsultationRecords([]);
                    setUpcomingConsultations([]);
                }
            } finally {
                if (active) setConsultationsLoading(false);
            }
        };

        loadUpcomingConsultations();
        const interval = setInterval(loadUpcomingConsultations, 30000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [user]);

    if (!user) {
        return <FeatureGate />;
    }

    const activeRoster = new Set(
        consultationRecords
            .map((appointment) => appointment.userId || appointment.userEmail || appointment.userName)
            .filter(Boolean)
    ).size;
    const pendingRequests = consultationRecords.filter(
        (appointment) => String(appointment.status || '').toUpperCase() === 'PENDING'
    ).length;
    const todayConsultations = upcomingConsultations.filter((appointment) => {
        const appointmentDate = new Date(appointment.appointmentTime);
        const today = new Date();
        return appointmentDate.toDateString() === today.toDateString();
    }).length;
    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white">Nutritionist Workspace</h1>
                    <p className="text-sm text-white/50 mt-1">Manage consultations, clients, and personalized nutrition plans from one place.</p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#a5d391]/10 border border-[#a5d391]/20 text-[#a5d391] text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-[#a5d391] animate-pulse"></span>
                    Workspace ready
                </div>
            </div>
            
            {/* Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-5 flex flex-col justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Pending Requests</div>
                        <span className="material-symbols-outlined text-amber-300 text-[20px]">pending_actions</span>
                    </div>
                    <div>
                        <div className="text-3xl font-bold font-hero-display">{pendingRequests}</div>
                        <div className="text-xs text-white/50 mt-1">{pendingRequests ? 'Requests waiting for your review' : 'No requests waiting for review'}</div>
                    </div>
                </div>
                
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-5 flex flex-col justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Today's Schedule</div>
                        <span className="material-symbols-outlined text-[#a5d391] text-[20px]">today</span>
                    </div>
                    <div>
                        <div className="text-3xl font-bold font-hero-display">{todayConsultations}</div>
                        <div className="text-xs text-white/50 mt-1">{todayConsultations ? 'Consultations scheduled today' : 'No consultations scheduled today'}</div>
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

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-5 flex flex-col justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Active Clients</div>
                        <span className="material-symbols-outlined text-[#a5d391] text-[20px]">groups</span>
                    </div>
                    <div>
                        <div className="text-3xl font-bold font-hero-display">{activeRoster}</div>
                        <div className="text-xs text-white/50 mt-1">Clients with active consultations</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <Link to="/dashboard/nutritionist/schedule" className="bg-[#a5d391]/10 border border-[#a5d391]/25 rounded-2xl p-5 hover:bg-[#a5d391]/20 transition-colors">
                    <span className="material-symbols-outlined text-[#a5d391]">calendar_month</span>
                    <h2 className="font-bold mt-3">Review schedule</h2>
                    <p className="text-xs text-white/50 mt-1">Approve requests and manage consultation times.</p>
                </Link>
                <Link to="/dashboard/nutritionist/builder" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#a5d391]/40 transition-colors">
                    <span className="material-symbols-outlined text-[#a5d391]">edit_note</span>
                    <h2 className="font-bold mt-3">Create diet plan</h2>
                    <p className="text-xs text-white/50 mt-1">Build and save a personalized nutrition protocol.</p>
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Upcoming Schedule */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
                        <h2 className="text-lg font-bold font-hero-display flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#a5d391]">videocam</span>
                            Next Consultations
                        </h2>
                        <span className="text-xs text-[#a5d391] uppercase tracking-widest font-black bg-[#a5d391]/10 px-3 py-1 rounded-full border border-[#a5d391]/20">
                            {upcomingConsultations.length} Scheduled
                        </span>
                    </div>

                    <div className="space-y-4">
                        {consultationsLoading ? (
                            <div className="py-8 text-center text-xs text-white/50">Loading upcoming consultations…</div>
                        ) : upcomingConsultations.length === 0 ? (
                            <div className="py-8 text-center">
                                <span className="material-symbols-outlined text-3xl text-white/25">event_available</span>
                                <p className="text-xs text-white/50 mt-2">Your schedule is clear. New consultation requests will appear here.</p>
                                <Link
                                    to="/dashboard/nutritionist/schedule"
                                    className="inline-flex items-center gap-1 mt-4 text-xs font-bold uppercase tracking-wider text-[#a5d391] hover:text-white"
                                >
                                    Open schedule
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </Link>
                            </div>
                        ) : upcomingConsultations.map((consult, idx) => {
                            const appointmentDate = new Date(consult.appointmentTime);
                            const isNext = idx === 0;
                            const patientName = consult.userName || consult.userEmail || 'Patient';
                            const sessionTitle = consult.title || consult.sessionType || 'Nutrition Consultation';
                            return (
                            <div key={consult.id || `${consult.appointmentTime}-${idx}`} className={`flex items-center gap-3 sm:gap-4 p-4 rounded-2xl border ${isNext ? 'bg-[#a5d391]/10 border-[#a5d391]/30' : 'bg-[#080b12]/80 border-white/10'}`}>
                                <div className="text-center min-w-[56px] sm:min-w-[70px]">
                                    <div className="font-bold text-sm">{appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    <div className="text-[10px] text-white/40 uppercase tracking-widest">{appointmentDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                                </div>
                                <div className="w-px h-8 bg-white/10"></div>
                                <div className="flex-grow min-w-0">
                                    <div className="font-bold text-sm truncate">{patientName}</div>
                                    <div className="text-xs text-white/50 truncate">{sessionTitle}</div>
                                </div>
                                <div>
                                    {isNext && (
                                        <Link 
                                            to="/virtual-room" 
                                            className="bg-[#a5d391] text-black text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white transition-colors cursor-pointer shadow-[0_0_15px_rgba(165,211,145,0.3)] inline-block"
                                        >
                                            Join Room
                                        </Link>
                                    )}
                                    {!isNext && <span className="material-symbols-outlined text-white/30 text-sm">schedule</span>}
                                </div>
                            </div>
                            );
                        })}
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

                {/* History Items Grid — own plans, loaded from the server */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {protocolHistory.length === 0 ? (
                                <div className="md:col-span-3 py-8 text-center text-xs text-white/50">
                                    No saved diet protocols available.
                                </div>
                            ) : protocolHistory.slice(0, 3).map((item) => (
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
            </div>
        </div>
    );
};

export default NutritionistHome;
