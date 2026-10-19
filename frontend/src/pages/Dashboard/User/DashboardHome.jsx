import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';
import api, { API_BASE_URL } from '../../../api/axios';
import ConsultationChatModal from '../../../components/ConsultationChatModal';
import { normalizeAndDeduplicatePlans, getDeletedPlanIds } from '../../../utils/dietPlanSync';

const DEFAULT_SEEDS = [];

const DashboardHome = () => {
    const { user, token } = useContext(AuthContext);
    const [clinicalDirectives, setClinicalDirectives] = useState([]);

    // Diet Plan from Nutritionist state
    const [plansList, setPlansList] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const lastSeenTopIdRef = useRef(null);
    const [isSyncingTargets, setIsSyncingTargets] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);
    const [isConsultationChatOpen, setIsConsultationChatOpen] = useState(false);

    // User Profile Targets
    const [currentUserTargets, setCurrentUserTargets] = useState({
        calories: 2100,
        protein: 140,
        carbs: 180,
        fats: 65,
        water: 2.5,
        fiber: 25
    });

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

    // Load User Profile Targets
    const fetchUserTargets = () => {
        if (!token) return;
        api.get('/profiles/me').then(res => {
            if (res.data) {
                setCurrentUserTargets({
                    calories: res.data.dailyCaloriesTarget || 2100,
                    protein: res.data.proteinTarget || 140,
                    carbs: res.data.carbsTarget || 180,
                    fats: res.data.fatsTarget || 65,
                    water: res.data.dailyWaterTargetLiters || 2.5,
                    fiber: res.data.dailyFiberTargetG || 25
                });
            }
        }).catch(() => {
            try {
                const stored = JSON.parse(localStorage.getItem('nutrimunch_user_targets') || '{}');
                if (stored.calories) setCurrentUserTargets(stored);
            } catch (e) {}
        });
    };

    const serverPlansRef = useRef([]);

    // Load Formulated Diet Plans from Nutritionist
    const loadDietPlans = (forcedSelectId = null, freshServerPlans = null) => {
        if (freshServerPlans && Array.isArray(freshServerPlans)) {
            serverPlansRef.current = freshServerPlans;
        }

        const currentUserId = String(user?.id || user?.userId || '');
        const currentUserEmail = (user?.email || user?.username || '').toLowerCase().trim();
        const currentUserName = (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.name || user?.username || '')).toLowerCase();

        let rawItems = [];

        // 0. Server-published plans (Instant Cloud Sync across devices/browsers)
        if (serverPlansRef.current && serverPlansRef.current.length > 0) {
            rawItems.push(...serverPlansRef.current);
        }

        // 1. Formulated Diet Plans from History Vault
        try {
            const rawHistory = localStorage.getItem('nutrimunch_diet_plans_history');
            if (rawHistory) {
                const historyList = JSON.parse(rawHistory);
                if (Array.isArray(historyList)) {
                    rawItems.push(...historyList);
                }
            }
        } catch (e) {}

        // Normalize scopes, filter permanently deleted plans, collapse duplicates, and enforce patient isolation
        const deduplicated = normalizeAndDeduplicatePlans({
            rawList: rawItems,
            currentUserId,
            currentUserEmail,
            currentUserName,
            isUserView: true
        });

        // Clean up zombie snapshot keys if deduplicated is empty
        if (deduplicated.length === 0) {
            localStorage.removeItem('nutrimunch_latest_deployed_plan');
            localStorage.removeItem('nutrimunch_latest_deployed_plan_id');
            localStorage.removeItem('nutrimunch_general_diet_plan');
            localStorage.removeItem('nutrimunch_exclusive_diet_plans');
        }

        setPlansList(deduplicated);

        // Determine which plan to select & automatically switch if a new plan was formulated
        const topId = deduplicated.length > 0 ? deduplicated[0].id : null;

        if (forcedSelectId && deduplicated.some(p => p.id === forcedSelectId)) {
            setSelectedPlanId(forcedSelectId);
            lastSeenTopIdRef.current = forcedSelectId;
        } else if (topId && lastSeenTopIdRef.current && topId !== lastSeenTopIdRef.current) {
            // A NEW DIET PLAN WAS DEPLOYED! Auto-select it immediately
            setSelectedPlanId(topId);
            lastSeenTopIdRef.current = topId;
        } else {
            setSelectedPlanId(prev => {
                if (prev && deduplicated.some(p => p.id === prev)) {
                    return prev;
                }
                return topId;
            });
            if (topId && !lastSeenTopIdRef.current) {
                lastSeenTopIdRef.current = topId;
            }
        }
    };

    useEffect(() => {
        fetchUserTargets();
        loadDietPlans();

        // Non-blocking background sync
        api.get('/diet-plans/published').then(res => {
            if (res.data && Array.isArray(res.data)) {
                loadDietPlans(null, res.data);
            }
        }).catch(() => {});

        let bc;
        try {
            bc = new BroadcastChannel('nutrimunch_diet_plan_channel');
            bc.onmessage = (event) => {
                if (event.data?.type === 'DIET_PLAN_DELETED') {
                    loadDietPlans();
                } else if (event.data?.plan) {
                    loadDietPlans(event.data.plan.id);
                } else {
                    loadDietPlans();
                }
            };
        } catch (e) {}

        const handleUpdate = () => {
            const latestId = localStorage.getItem('nutrimunch_latest_deployed_plan_id');
            loadDietPlans(latestId);
        };

        const handleDeletedEvent = () => {
            loadDietPlans();
        };

        window.addEventListener('nutrimunch_diet_plan_updated', handleUpdate);
        window.addEventListener('nutrimunch_diet_history_updated', handleUpdate);
        window.addEventListener('nutrimunch_diet_plan_deleted', handleDeletedEvent);
        window.addEventListener('nutrimunch_profile_updated', fetchUserTargets);
        window.addEventListener('storage', () => {
            handleUpdate();
            fetchUserTargets();
        });

        // Fast responsive polling (1200ms) to ensure instant sync without page refresh
        const pollInterval = setInterval(() => {
            loadDietPlans();
            api.get('/diet-plans/published').then(res => {
                if (res.data && Array.isArray(res.data)) {
                    loadDietPlans(null, res.data);
                }
            }).catch(() => {});
        }, 1200);

        return () => {
            if (bc) bc.close();
            clearInterval(pollInterval);
            window.removeEventListener('nutrimunch_diet_plan_updated', handleUpdate);
            window.removeEventListener('nutrimunch_diet_history_updated', handleUpdate);
            window.removeEventListener('nutrimunch_diet_plan_deleted', handleDeletedEvent);
            window.removeEventListener('nutrimunch_profile_updated', fetchUserTargets);
            window.removeEventListener('storage', handleUpdate);
        };
    }, [user, token]);

    // Handle Direct Import of Diet Plan Daily Requirements to User Profile
    const handleImportPlanRequirements = async (targetPlan) => {
        if (!targetPlan) return;
        setIsSyncingTargets(true);
        try {
            const payload = {
                isCustomTargets: true,
                dailyCaloriesTarget: Number(targetPlan.calories || 2100),
                proteinTarget: Number(targetPlan.protein || 140),
                carbsTarget: Number(targetPlan.carbs || 180),
                fatsTarget: Number(targetPlan.fats || 65),
                dailyWaterTargetLiters: Number(targetPlan.waterLiters || 3.0),
                dailyFiberTargetG: Number(targetPlan.fiber || 28),
                ironTargetMg: Number(targetPlan.iron || 18),
                calciumTargetMg: Number(targetPlan.calcium || 1000),
                vitDTargetMcg: Number(targetPlan.vitD || 15),
                vitCTargetMg: Number(targetPlan.vitC || 90)
            };

            if (token) {
                await api.put('/profiles/me', payload);
            }

            const localTargets = {
                calories: payload.dailyCaloriesTarget,
                protein: payload.proteinTarget,
                carbs: payload.carbsTarget,
                fats: payload.fatsTarget,
                water: payload.dailyWaterTargetLiters,
                fiber: payload.dailyFiberTargetG
            };
            setCurrentUserTargets(localTargets);
            localStorage.setItem('nutrimunch_user_targets', JSON.stringify(localTargets));
            localStorage.setItem('nutrimunch_active_diet_plan', JSON.stringify(targetPlan));

            window.dispatchEvent(new Event('nutrimunch_profile_updated'));
            window.dispatchEvent(new Event('nutrimunch_macro_targets_updated'));
            window.dispatchEvent(new Event('storage'));

            setSyncSuccess(true);
            setTimeout(() => setSyncSuccess(false), 5000);
        } catch (e) {
            console.error('Failed importing diet plan targets:', e);
        } finally {
            setIsSyncingTargets(false);
        }
    };

    if (!user) {
        return <FeatureGate />;
    }

    // Active Selected Plan for Dashboard
    const activeDietPlan = plansList.find(p => p.id === selectedPlanId) || (plansList.length > 0 ? plansList[0] : null);
    const isPlanExclusive = activeDietPlan ? (activeDietPlan.isExclusiveForUser || activeDietPlan.scope === 'EXCLUSIVE') : false;

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white">System Overview</h1>
                    <p className="text-sm text-white/50 mt-1">Real-time biometrics, clinical nutrition telemetry, and AI optimization.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setIsConsultationChatOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#a5d391]/15 hover:bg-[#a5d391]/25 border border-[#a5d391]/30 text-[#a5d391] text-xs font-bold uppercase tracking-wider backdrop-blur-md cursor-pointer transition-all shadow-[0_0_15px_rgba(165,211,145,0.2)]"
                    >
                        <span className="material-symbols-outlined text-sm">forum</span>
                        <span>Nutritionist Live Chat</span>
                    </button>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-[#a5d391] animate-pulse"></span>
                        Live Telemetry Connected
                    </div>
                </div>
            </div>

            {/* Active Clinical Directives from Nutritionist */}
            {clinicalDirectives.length > 0 && (
                <div className="mb-8 bg-gradient-to-r from-emerald-950/60 via-[#0d131f] to-[#080b12] border border-[#a5d391]/40 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl space-y-4 relative overflow-hidden animate-fadeIn">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#a5d391]/10 blur-3xl pointer-events-none"></div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5 text-[#a5d391]">
                            <span className="material-symbols-outlined text-2xl">health_and_safety</span>
                            <h2 className="text-base font-bold font-hero-display tracking-tight text-white">Active Clinical Directives from Nutritionist</h2>
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

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex items-center justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
                    <div>
                        <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Today's Daily Target</div>
                        <div className="text-2xl font-bold font-hero-display">
                            1,850 / <span className="text-[#a5d391]">{currentUserTargets.calories || 2100}</span> kcal
                        </div>
                        <div className="text-[11px] text-white/50 mt-1">
                            P: {currentUserTargets.protein}g • C: {currentUserTargets.carbs}g • F: {currentUserTargets.fats}g
                        </div>
                    </div>
                    <div className="w-12 h-12 bg-[#a5d391]/10 rounded-2xl flex items-center justify-center border border-[#a5d391]/20 shadow-[0_0_15px_rgba(165,211,145,0.2)]">
                        <span className="material-symbols-outlined text-[#a5d391]">local_fire_department</span>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex items-center justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
                    <div>
                        <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Hydration Target</div>
                        <div className="text-2xl font-bold font-hero-display">
                            2.2 / <span className="text-cyan-400">{currentUserTargets.water || 3.0}</span> L
                        </div>
                        <div className="text-[11px] text-white/50 mt-1">Daily clinical fluid balance</div>
                    </div>
                    <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                        <span className="material-symbols-outlined text-cyan-400">water_drop</span>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex items-center justify-between hover:border-[#a5d391]/30 transition-all duration-300 shadow-xl">
                    <div>
                        <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Clinical Care</div>
                        <div className="text-lg font-bold font-hero-display">{activeDietPlan?.nutritionistName || 'No Assigned Nutritionist'}</div>
                        {activeDietPlan?.nutritionistEmail && (
                            <div className="text-[11px] text-[#a5d391] font-mono">{activeDietPlan.nutritionistEmail}</div>
                        )}
                        <div className="text-xs text-[#a5d391] mt-0.5 flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${activeDietPlan ? 'bg-[#a5d391] animate-pulse' : 'bg-white/30'}`}></span>
                            {activeDietPlan ? 'Protocol Formulation Active' : 'Awaiting Protocol Formulation'}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsConsultationChatOpen(true)}
                        className="w-12 h-12 bg-[#a5d391]/15 hover:bg-[#a5d391] text-[#a5d391] hover:text-black rounded-2xl flex items-center justify-center border border-[#a5d391]/30 transition-all cursor-pointer shadow-md"
                        title="Chat with Nutritionist"
                    >
                        <span className="material-symbols-outlined">forum</span>
                    </button>
                </div>
            </div>

            {/* PRESCRIBED DIET PLAN FROM NUTRITIONIST SHOWCASE SECTION */}
            <div className="mb-12 bg-gradient-to-br from-[#0d131f] via-[#080b12] to-[#111a14] border border-[#a5d391]/40 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_0_60px_rgba(165,211,145,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#a5d391]/10 blur-[100px] pointer-events-none"></div>

                {activeDietPlan ? (
                    <>
                        {/* Protocol Header & Selector */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10 relative z-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                isPlanExclusive
                                    ? 'bg-[#a5d391] text-black border-[#a5d391] shadow-[0_0_15px_rgba(165,211,145,0.4)]'
                                    : 'bg-emerald-500/15 text-[#a5d391] border-[#a5d391]/40'
                            }`}>
                                {isPlanExclusive ? '🎯 Prescribed Specifically for You' : '🌟 Clinic Formulated Protocol'}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-[10px] font-bold">
                                {activeDietPlan?.dietType || 'High-Protein Metabolic'}
                            </span>
                            <span className="text-white/40 text-xs">
                                Formulated by <strong className="text-white">{activeDietPlan?.nutritionistName || 'Nutritionist Mihir Sharma'}</strong>
                                {activeDietPlan?.nutritionistEmail && (
                                    <span className="text-[#a5d391] font-mono ml-1">({activeDietPlan.nutritionistEmail})</span>
                                )}
                            </span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-extrabold font-hero-display tracking-tight text-white flex items-center gap-3">
                            <span>{activeDietPlan?.title || activeDietPlan?.planTitle || 'Clinical Metabolic Optimization Protocol'}</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-white/60 max-w-3xl leading-relaxed">
                            {activeDietPlan?.nutritionistNotes || 'Maintain strict meal cadence. Hydrate consistently throughout your active metabolic window.'}
                        </p>
                    </div>

                    {/* Import to Profile Action Button */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={() => handleImportPlanRequirements(activeDietPlan)}
                            disabled={isSyncingTargets}
                            className="bg-[#a5d391] hover:bg-white text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider px-6 py-3.5 rounded-2xl transition-all shadow-[0_0_30px_rgba(165,211,145,0.35)] hover:scale-105 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSyncingTargets ? (
                                <>
                                    <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin"></span>
                                    <span>Importing Requirements...</span>
                                </>
                            ) : syncSuccess ? (
                                <>
                                    <span className="material-symbols-outlined text-base font-black">check_circle</span>
                                    <span>Requirements Imported!</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-base">cloud_download</span>
                                    <span>Import Requirements to My Profile</span>
                                </>
                            )}
                        </button>

                        <div className="flex items-center gap-3">
                            <Link
                                to="/diet-plans"
                                className="text-xs font-bold text-[#a5d391] hover:text-white underline underline-offset-4 flex items-center gap-1 transition-colors"
                            >
                                <span>Browse All Nutritionist Plans ({plansList.length})</span>
                                <span className="material-symbols-outlined text-xs">arrow_forward</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Import Success Notification Bar */}
                {syncSuccess && (
                    <div className="my-4 p-4 rounded-2xl bg-[#a5d391]/20 border border-[#a5d391]/50 text-[#a5d391] text-xs font-bold flex items-center justify-between animate-fadeIn">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">verified</span>
                            <span>Success! Daily requirements from "{activeDietPlan?.title}" have been imported directly into your profile and synced with Progress Tracking.</span>
                        </div>
                        <Link to="/progress" className="underline text-white hover:text-[#a5d391] text-xs font-bold">
                            View in Progress Tracking →
                        </Link>
                    </div>
                )}

                {/* 5 TO 7 PRIMARY PARAMETERS MATRIX */}
                <div className="my-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#a5d391] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">tune</span>
                            <span>Daily Requirements Formulated by Nutritionist (5–7 Parameters)</span>
                        </h3>
                        <span className="text-[11px] text-white/40">Directly synchronized with your daily goals</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-[#a5d391]/40 transition-all">
                            <div className="text-[10px] uppercase font-bold text-white/40">Daily Calories</div>
                            <div className="text-xl font-black text-white font-hero-display mt-0.5">{activeDietPlan?.calories || 2100} <span className="text-[10px] text-[#a5d391] font-normal">kcal</span></div>
                            <div className="text-[9px] text-white/50 mt-1">Caloric Target</div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-[#a5d391]/40 transition-all">
                            <div className="text-[10px] uppercase font-bold text-white/40">Protein</div>
                            <div className="text-xl font-black text-white font-hero-display mt-0.5">{activeDietPlan?.protein || 160} <span className="text-[10px] text-[#a5d391] font-normal">g</span></div>
                            <div className="text-[9px] text-white/50 mt-1">Muscle Protein Synthesis</div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-[#a5d391]/40 transition-all">
                            <div className="text-[10px] uppercase font-bold text-white/40">Carbohydrates</div>
                            <div className="text-xl font-black text-white font-hero-display mt-0.5">{activeDietPlan?.carbs || 150} <span className="text-[10px] text-[#a5d391] font-normal">g</span></div>
                            <div className="text-[9px] text-white/50 mt-1">Glycogen Replenishment</div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-[#a5d391]/40 transition-all">
                            <div className="text-[10px] uppercase font-bold text-white/40">Healthy Fats</div>
                            <div className="text-xl font-black text-white font-hero-display mt-0.5">{activeDietPlan?.fats || 70} <span className="text-[10px] text-[#a5d391] font-normal">g</span></div>
                            <div className="text-[9px] text-white/50 mt-1">Hormonal Balance</div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-[#a5d391]/40 transition-all">
                            <div className="text-[10px] uppercase font-bold text-white/40">Daily Hydration</div>
                            <div className="text-xl font-black text-cyan-300 font-hero-display mt-0.5">{activeDietPlan?.waterLiters || 3.0} <span className="text-[10px] text-cyan-400 font-normal">L</span></div>
                            <div className="text-[9px] text-white/50 mt-1">Fluid Requirement</div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-[#a5d391]/40 transition-all">
                            <div className="text-[10px] uppercase font-bold text-white/40">Dietary Fiber</div>
                            <div className="text-xl font-black text-emerald-300 font-hero-display mt-0.5">{activeDietPlan?.fiber || 28} <span className="text-[10px] text-emerald-400 font-normal">g</span></div>
                            <div className="text-[9px] text-white/50 mt-1">Microbiome Adherence</div>
                        </div>
                    </div>

                    {/* Micronutrient strip */}
                    <div className="mt-3 px-4 py-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-[11px] text-white/60 flex-wrap gap-2">
                        <span className="font-bold uppercase tracking-wider text-white/40">Micronutrient Partition:</span>
                        <span>Iron: <strong className="text-white">{activeDietPlan?.iron || 18} mg</strong></span>
                        <span>Calcium: <strong className="text-white">{activeDietPlan?.calcium || 1000} mg</strong></span>
                        <span>Vitamin D: <strong className="text-white">{activeDietPlan?.vitD || 15} mcg</strong></span>
                        <span>Vitamin C: <strong className="text-white">{activeDietPlan?.vitC || 90} mg</strong></span>
                    </div>
                </div>

                {/* Multiple Plans Switcher Pills (If Nutritionist formulated more than 1 plan) */}
                {plansList.length > 1 && (
                    <div className="my-5 p-4 rounded-2xl bg-black/50 border border-white/10">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2.5">
                            Available Diet Protocols Formulated by Nutritionist (Click to select & preview):
                        </div>
                        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                            {plansList.map(p => {
                                const isCurrent = p.id === activeDietPlan.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setSelectedPlanId(p.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                                            isCurrent
                                                ? 'bg-[#a5d391] text-black shadow-lg shadow-[#a5d391]/30 font-black'
                                                : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                                        }`}
                                    >
                                        <span>{p.isExclusiveForUser ? '🎯 ' : '📋 '}{p.title || p.planTitle}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isCurrent ? 'bg-black/20 text-black' : 'bg-white/10 text-white/50'}`}>
                                            {p.calories} kcal
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Prescribed Meals Today */}
                <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold font-hero-display text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#a5d391] text-lg">restaurant_menu</span>
                            <span>Prescribed Meal Schedule for Today</span>
                        </h4>
                        <span className="text-xs text-white/40">{activeDietPlan?.meals?.length || 4} scheduled meals</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {(activeDietPlan?.meals || DEFAULT_SEEDS[0].meals).map((meal, idx) => (
                            <div key={meal.id || idx} className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#a5d391]/40 rounded-2xl p-4 transition-all space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-[#a5d391] bg-[#a5d391]/10 px-2.5 py-0.5 rounded-full border border-[#a5d391]/20">
                                        {meal.mealType || 'Meal'}
                                    </span>
                                    <span className="text-white/40 text-[11px] font-semibold">{meal.time || '12:00 PM'}</span>
                                </div>
                                <h5 className="font-bold text-white text-sm truncate">{meal.name}</h5>
                                <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed">{meal.ingredients}</p>
                                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
                                    <span><strong className="text-white">{meal.calories}</strong> kcal</span>
                                    <span>P: <strong className="text-white">{meal.protein}g</strong></span>
                                    <span>C: <strong className="text-white">{meal.carbs}g</strong></span>
                                    <span>F: <strong className="text-white">{meal.fats}g</strong></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                    </>
                ) : (
                    <div className="text-center py-12 px-6 space-y-4 relative z-10">
                        <div className="w-16 h-16 mx-auto rounded-3xl bg-[#a5d391]/10 border border-[#a5d391]/30 flex items-center justify-center text-[#a5d391]">
                            <span className="material-symbols-outlined text-3xl">restaurant_menu</span>
                        </div>
                        <h3 className="text-2xl font-bold font-hero-display text-white">No Prescribed Diet Protocol Active</h3>
                        <p className="text-xs sm:text-sm text-white/50 max-w-md mx-auto leading-relaxed">
                            Your clinical nutritionist hasn't published an active nutrition protocol for your profile yet, or previous plans have been archived. When a new protocol is deployed, it will synchronize here automatically.
                        </p>
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsConsultationChatOpen(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#a5d391] text-black font-bold text-xs hover:bg-white transition-all shadow-md cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm">forum</span>
                                <span>Message Clinical Nutritionist</span>
                            </button>
                            <Link
                                to="/diet-plans"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/30 text-white font-bold text-xs transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">explore</span>
                                <span>View Protocol Library</span>
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* AI Food & Label Analyzer Launch Banner */}
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
                <Link to="/ai-image" className="shrink-0 bg-[#a5d391] hover:bg-white text-black font-bold text-xs uppercase tracking-widest px-6 py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer flex items-center gap-2 relative z-10">
                    <span>Launch AI Analyzer</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
            </div>

            {/* AI Insights & Biometric Sync Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-xl relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="material-symbols-outlined text-[#a5d391] text-2xl animate-pulse">memory</span>
                        <h3 className="font-bold text-lg font-hero-display text-white">AI Generative Insights</h3>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">
                        Biometric feedback confirms high recovery adherence. Your current macro formulation from <strong>{activeDietPlan?.nutritionistName || 'Nutritionist Mihir Sharma'}</strong> is currently yielding optimal glycemic balance with steady sustained energy.
                    </p>
                    <div className="mt-5 flex items-center gap-3">
                        <Link to="/progress" className="bg-[#a5d391] text-black font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-white transition-all shadow-md">
                            Open Progress Tracking
                        </Link>
                        <button
                            type="button"
                            onClick={() => setIsConsultationChatOpen(true)}
                            className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                        >
                            Consult Nutritionist
                        </button>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-xl">
                    <h3 className="font-bold text-lg mb-6 font-hero-display text-white">Biometric Sync Status</h3>
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
                                <span className="material-symbols-outlined text-xs text-emerald-400">restaurant</span> Prescribed Diet Sync
                            </div>
                            <span className="text-xs text-[#a5d391] font-bold bg-[#a5d391]/15 px-3 py-1 rounded-full border border-[#a5d391]/30">Active Protocol</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Live Consultation Chat Modal */}
            {isConsultationChatOpen && (
                <ConsultationChatModal
                    isOpen={isConsultationChatOpen}
                    onClose={() => setIsConsultationChatOpen(false)}
                    currentUser={user}
                />
            )}
        </div>
    );
};

export default DashboardHome;
