import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';
import { API_BASE_URL } from '../../../api/axios';

const DashboardHome = () => {
    const { user, token } = useContext(AuthContext);
    const [clinicalDirectives, setClinicalDirectives] = useState([]);

    useEffect(() => {
        const loadDirectives = async () => {
            let deletedIds = new Set();
            try {
                const storedDeleted = JSON.parse(localStorage.getItem('nutrimunch_deleted_notif_ids') || '[]');
                deletedIds = new Set(storedDeleted.map(String));
            } catch (e) {}

            let backendDirectives = [];
            if (token) {
                try {
                    const res = await fetch(`${API_BASE_URL}/notifications/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        backendDirectives = data.filter(n => n.type === 'CLINICAL_DIRECTIVE' || (n.title && n.title.includes('Clinical Directive'))).map(n => ({
                            id: n.id,
                            title: n.title,
                            message: n.message,
                            time: n.timeAgo || 'Active Protocol',
                            icon: n.icon || 'health_and_safety'
                        }));
                    }
                } catch (e) {}
            }

            try {
                const storedDirectives = JSON.parse(localStorage.getItem('nutrimunch_clinical_directives') || '[]');
                const storedNotifs = JSON.parse(localStorage.getItem('nutrimunch_user_notifications') || '[]');
                const localDirectives = [...storedDirectives, ...storedNotifs.filter(n => n.title && n.title.includes('Clinical Directive'))];
                
                const allDirectives = [...backendDirectives, ...localDirectives];
                const uniqueDirectives = Array.from(new Map(allDirectives.map(item => [item.id, item])).values())
                    .filter(item => !deletedIds.has(String(item.id)));

                setClinicalDirectives(uniqueDirectives);
            } catch (e) {
                setClinicalDirectives(backendDirectives.filter(item => !deletedIds.has(String(item.id))));
            }
        };

        loadDirectives();
        const interval = setInterval(loadDirectives, 10000);
        window.addEventListener('nutrimunch_notification_added', loadDirectives);
        window.addEventListener('storage', loadDirectives);
        window.addEventListener('focus', loadDirectives);

        let bc;
        try {
            bc = new BroadcastChannel('nutrimunch_clinical_channel');
            bc.onmessage = () => {
                loadDirectives();
            };
        } catch (e) {}

        return () => {
            clearInterval(interval);
            window.removeEventListener('nutrimunch_notification_added', loadDirectives);
            window.removeEventListener('storage', loadDirectives);
            window.removeEventListener('focus', loadDirectives);
            if (bc) bc.close();
        };
    }, [token]);

    const handleDeleteDirective = async (id) => {
        const stringId = String(id);
        setClinicalDirectives(prev => prev.filter(d => String(d.id) !== stringId));
        try {
            const storedDeleted = JSON.parse(localStorage.getItem('nutrimunch_deleted_notif_ids') || '[]');
            if (!storedDeleted.includes(stringId)) {
                localStorage.setItem('nutrimunch_deleted_notif_ids', JSON.stringify([...storedDeleted, stringId]));
            }

            const storedDirectives = JSON.parse(localStorage.getItem('nutrimunch_clinical_directives') || '[]');
            const updatedDirectives = storedDirectives.filter(n => String(n.id) !== stringId);
            localStorage.setItem('nutrimunch_clinical_directives', JSON.stringify(updatedDirectives));

            const storedNotifs = JSON.parse(localStorage.getItem('nutrimunch_user_notifications') || '[]');
            const updatedNotifs = storedNotifs.filter(n => String(n.id) !== stringId);
            localStorage.setItem('nutrimunch_user_notifications', JSON.stringify(updatedNotifs));

            window.dispatchEvent(new Event('nutrimunch_notification_added'));
            try {
                const bc = new BroadcastChannel('nutrimunch_clinical_channel');
                bc.postMessage({ type: 'CLINICAL_DIRECTIVE_DELETED', id: stringId });
                bc.close();
            } catch (err) {}

            if (token && (typeof id === 'number' || !isNaN(Number(id)))) {
                fetch(`${API_BASE_URL}/notifications/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => {});
            }
        } catch (e) {}
    };

    const handleClearAllDirectives = async () => {
        const allIds = clinicalDirectives.map(d => String(d.id));
        setClinicalDirectives([]);
        try {
            const storedDeleted = JSON.parse(localStorage.getItem('nutrimunch_deleted_notif_ids') || '[]');
            const combinedDeleted = Array.from(new Set([...storedDeleted, ...allIds]));
            localStorage.setItem('nutrimunch_deleted_notif_ids', JSON.stringify(combinedDeleted));

            localStorage.setItem('nutrimunch_clinical_directives', '[]');
            localStorage.setItem('nutrimunch_user_notifications', '[]');

            window.dispatchEvent(new Event('nutrimunch_notification_added'));
            try {
                const bc = new BroadcastChannel('nutrimunch_clinical_channel');
                bc.postMessage({ type: 'CLINICAL_DIRECTIVE_CLEAR_ALL' });
                bc.close();
            } catch (err) {}

            if (token) {
                fetch(`${API_BASE_URL}/notifications/clear-all`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => {});
            }
        } catch (e) {}
    };

    if (!user) {
        return <FeatureGate />;
    }

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white">System Overview</h1>
                    <p className="text-sm text-white/50 mt-1">Real-time biometrics and AI nutrition performance matrix.</p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#a5d391]/10 border border-[#a5d391]/20 text-[#a5d391] text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-[#a5d391] animate-pulse"></span>
                    Live Telemetry Connected
                </div>
            </div>

            {/* Active Clinical Directives from Dietitian */}
            {clinicalDirectives.length > 0 && (
                <div className="mb-8 bg-gradient-to-r from-emerald-950/60 via-[#0d131f] to-[#080b12] border border-[#a5d391]/40 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl space-y-4 relative overflow-hidden animate-fadeIn">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#a5d391]/10 blur-3xl pointer-events-none"></div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5 text-[#a5d391]">
                            <span className="material-symbols-outlined text-2xl">health_and_safety</span>
                            <h2 className="text-base font-bold font-hero-display tracking-tight text-white">Active Clinical Directives from Dietitian</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClearAllDirectives}
                                className="text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xs">delete_sweep</span>
                                <span>Clear All</span>
                            </button>
                            <span className="px-3 py-1 rounded-full bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30 text-[10px] font-black uppercase tracking-widest">
                                {clinicalDirectives.length} Active
                            </span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {clinicalDirectives.map(dir => (
                            <div key={dir.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[#a5d391]/30 transition-all">
                                <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 text-xs font-bold text-white flex-wrap">
                                        <span className="material-symbols-outlined text-sm text-[#a5d391]">assignment</span>
                                        <span className="text-[#a5d391] font-bold">{dir.title}</span>
                                        <span className="text-[10px] text-white/40 font-normal">({dir.time})</span>
                                    </div>
                                    <p className="text-xs text-white/80 leading-relaxed italic">"{dir.message}"</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Link to="/progress" className="px-4 py-2 rounded-xl bg-[#a5d391] text-[#080b12] font-bold text-xs hover:bg-white transition-all shrink-0">
                                        View Progress Tracker →
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteDirective(dir.id)}
                                        title="Delete Directive"
                                        className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 cursor-pointer flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined text-base">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex items-center justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
                    <div>
                        <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Today's Macros</div>
                        <div className="text-2xl font-bold font-hero-display">1,850 / <span className="text-[#a5d391]">2,100</span> kcal</div>
                    </div>
                    <div className="w-12 h-12 bg-[#a5d391]/10 rounded-2xl flex items-center justify-center border border-[#a5d391]/20 shadow-[0_0_15px_rgba(165,211,145,0.2)]">
                        <span className="material-symbols-outlined text-[#a5d391]">local_fire_department</span>
                    </div>
                </div>
                
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex items-center justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
                    <div>
                        <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Adherence Score</div>
                        <div className="text-2xl font-bold font-hero-display">94% <span className="text-xs text-[#a5d391] font-normal">+2% this week</span></div>
                    </div>
                    <div className="w-12 h-12 bg-[#a5d391]/10 rounded-2xl flex items-center justify-center border border-[#a5d391]/20 shadow-[0_0_15px_rgba(165,211,145,0.2)]">
                        <span className="material-symbols-outlined text-[#a5d391]">task_alt</span>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex items-center justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
                    <div>
                        <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Next Consultation</div>
                        <div className="text-lg font-bold font-hero-display">Oct 15, 2026</div>
                        <div className="text-sm text-white/50">Dr. Elena Rostova</div>
                    </div>
                    <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
                        <span className="material-symbols-outlined text-purple-400">video_camera_front</span>
                    </div>
                </div>
            </div>            {/* AI Food & Label Analyzer Launch Banner */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-white/5 to-[#a5d391]/10 backdrop-blur-xl border border-[#a5d391]/30 rounded-[2.5rem] p-6 sm:p-8 mb-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#a5d391]/15 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3.5 rounded-2xl bg-[#a5d391]/10 text-[#a5d391] border border-[#a5d391]/30 backdrop-blur-md">
                        <span className="material-symbols-outlined text-3xl">center_focus_strong</span>
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#a5d391]/10 text-[#a5d391] text-[10px] font-black uppercase tracking-widest border border-[#a5d391]/20 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#a5d391] animate-pulse"></span>
                            Module 4 Active • Vision & Barcode OCR
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold font-hero-display text-white">AI Food & Label Analyzer</h2>
                        <p className="text-white/70 text-sm mt-1 max-w-2xl leading-relaxed">
                            Scan food dishes, ingredient lists, nutrition panels, or barcodes for instant allergen cross-matching, additive detection, health verdicts (Safe / Caution / Avoid), and database recommendations.
                        </p>
                    </div>
                </div>
                <Link to="/dashboard/user/ai-image" className="shrink-0 bg-[#a5d391] hover:bg-white text-black font-bold text-xs uppercase tracking-widest px-6 py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer flex items-center gap-2 relative z-10">
                    <span>Launch AI Analyzer</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
            </div>

            {/* AI Insights & Alerts */}
            <h2 className="text-xl font-bold font-hero-display mb-6">Generative Insights</h2>
            <div className="bg-gradient-to-r from-[#a5d391]/10 via-white/5 to-transparent backdrop-blur-xl border border-[#a5d391]/30 rounded-[2.5rem] p-6 sm:p-8 mb-12 flex gap-4 items-start shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#a5d391]/10 blur-[90px] rounded-full pointer-events-none"></div>
                <span className="material-symbols-outlined text-[#a5d391] text-3xl mt-1 animate-pulse drop-shadow-[0_0_8px_rgba(165,211,145,0.4)]">memory</span>
                <div className="relative z-10">
                    <h3 className="font-bold text-white text-lg mb-2">Algorithm Adjustment</h3>
                    <p className="text-white/70 text-sm leading-relaxed max-w-3xl">
                        Your Oura ring data indicates a 15% drop in Deep Sleep over the past 3 days. The AI has automatically increased your evening carbohydrate allocation by 25g and suggested the <strong>"REM Cycle Extract"</strong> recipe for tonight to promote recovery.
                    </p>
                    <button className="mt-5 bg-[#a5d391] text-black font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer">
                        View Updated Plan
                    </button>
                </div>
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-xl">
                    <h3 className="font-bold text-lg mb-6 font-hero-display">Today's Protocol</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-[#080b12]/80 border border-white/10 rounded-2xl">
                            <span className="material-symbols-outlined text-white/40">light_mode</span>
                            <div className="flex-grow">
                                <div className="text-sm font-bold">Breakfast</div>
                                <div className="text-xs text-white/50">Kinetic Synthesis Bowl</div>
                            </div>
                            <span className="material-symbols-outlined text-[#a5d391] cursor-pointer">check_circle</span>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-[#a5d391]/10 border border-[#a5d391]/30 rounded-2xl">
                            <span className="material-symbols-outlined text-[#a5d391]">wb_sunny</span>
                            <div className="flex-grow">
                                <div className="text-sm font-bold text-[#a5d391]">Lunch</div>
                                <div className="text-xs text-[#a5d391]/80">Neural Broth v4.2</div>
                            </div>
                            <span className="material-symbols-outlined text-white/30 cursor-pointer hover:text-white">radio_button_unchecked</span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-xl">
                    <h3 className="font-bold text-lg mb-6 font-hero-display">Biometric Sync Status</h3>
                    <ul className="space-y-4">
                        <li className="flex justify-between items-center pb-4 border-b border-white/10">
                            <div className="flex items-center gap-3 text-sm">
                                <span className="material-symbols-outlined text-xs text-[#a5d391]">watch</span> Oura Ring
                            </div>
                            <span className="text-xs text-[#a5d391] font-bold bg-[#a5d391]/10 px-3 py-1 rounded-full border border-[#a5d391]/20">Synced 2m ago</span>
                        </li>
                        <li className="flex justify-between items-center pb-4 border-b border-white/10">
                            <div className="flex items-center gap-3 text-sm">
                                <span className="material-symbols-outlined text-xs text-[#a5d391]">monitor_heart</span> Apple Health
                            </div>
                            <span className="text-xs text-[#a5d391] font-bold bg-[#a5d391]/10 px-3 py-1 rounded-full border border-[#a5d391]/20">Synced 10m ago</span>
                        </li>
                        <li className="flex justify-between items-center">
                            <div className="flex items-center gap-3 text-sm">
                                <span className="material-symbols-outlined text-xs text-red-400">bloodtype</span> CGM (Dexcom)
                            </div>
                            <span className="text-xs text-red-400 font-bold bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">Disconnected</span>
                        </li>
                    </ul>
                </div>
            </div>

        </div>
    );
};

export default DashboardHome;
