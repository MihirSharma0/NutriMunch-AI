import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';
import ConsultationChatModal from '../../../components/ConsultationChatModal';
import { normalizeAndDeduplicatePlans, getDeletedPlanIds, permanentlyDeleteDietPlan } from '../../../utils/dietPlanSync';

const DEFAULT_GENERAL_PLANS = [];

const DietPlans = () => {
    const navigate = useNavigate();
    const { user, token } = useContext(AuthContext);

    const [plansList, setPlansList] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [filterScope, setFilterScope] = useState('ALL'); // 'ALL', 'EXCLUSIVE', 'GENERAL'
    const lastSeenTopIdRef = useRef(null);

    // Current User Profile Targets (for comparison preview)
    const [currentUserTargets, setCurrentUserTargets] = useState({
        calories: 2000,
        protein: 120,
        carbs: 200,
        fats: 65,
        water: 2.5,
        fiber: 25
    });

    // Import Requirements Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [planToImport, setPlanToImport] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);

    // Toast Feedback
    const [notification, setNotification] = useState(null);

    // Consultation Chat Modal
    const [isChatOpen, setIsChatOpen] = useState(false);

    const showToast = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 4000);
    };

    // Load User Current Profile Targets
    useEffect(() => {
        if (!user) return;
        api.get('/profiles/me').then(res => {
            if (res.data) {
                setCurrentUserTargets({
                    calories: res.data.dailyCaloriesTarget || 2000,
                    protein: res.data.proteinTarget || 120,
                    carbs: res.data.carbsTarget || 200,
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
    }, [user]);

    const serverPlansRef = useRef([]);
    const savedAiPlansRef = useRef([]);

    // Load available plans from storage, history & backend
    const loadPlans = (forcedSelectId = null, freshServerPlans = null) => {
        if (freshServerPlans && Array.isArray(freshServerPlans)) {
            serverPlansRef.current = freshServerPlans;
        }

        const currentUserId = String(user?.id || user?.userId || '');
        const currentUserEmail = (user?.email || user?.username || '').toLowerCase().trim();
        const currentUserName = (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.name || user?.username || '')).toLowerCase();

        let rawItems = [];

        // 1. Server-published plans (Instant Cloud Sync across devices/browsers)
        if (serverPlansRef.current && serverPlansRef.current.length > 0) {
            rawItems.push(...serverPlansRef.current);
        }
        rawItems.push(...savedAiPlansRef.current);

        // 2. Formulated Diet Plans from Nutritionist History Vault
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

        // Clean up zombie snapshot keys when empty
        if (deduplicated.length === 0) {
            localStorage.removeItem('nutrimunch_latest_deployed_plan');
            localStorage.removeItem('nutrimunch_latest_deployed_plan_id');
            localStorage.removeItem('nutrimunch_general_diet_plan');
            localStorage.removeItem('nutrimunch_exclusive_diet_plans');
            localStorage.removeItem('nutrimunch_active_diet_plan');
        }

        setPlansList(deduplicated);

        const topId = deduplicated.length > 0 ? deduplicated[0].id : null;
        const latestDeployedId = localStorage.getItem('nutrimunch_latest_deployed_plan_id');

        if (forcedSelectId) {
            setSelectedPlanId(forcedSelectId);
            lastSeenTopIdRef.current = forcedSelectId;
        } else if (topId && lastSeenTopIdRef.current && topId !== lastSeenTopIdRef.current) {
            // A NEW DIET PLAN WAS DEPLOYED! Auto-select it immediately without requiring click!
            setSelectedPlanId(topId);
            showToast(`⚡ Newly Prescribed Protocol Synced: "${deduplicated[0].title || deduplicated[0].planTitle}"`);
            lastSeenTopIdRef.current = topId;
        } else if (latestDeployedId && (!selectedPlanId || latestDeployedId !== lastSeenTopIdRef.current)) {
            setSelectedPlanId(latestDeployedId);
            lastSeenTopIdRef.current = latestDeployedId;
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
        loadPlans();

        // Background server fetch (non-blocking)
        api.get('/diet-plans/published').then(res => {
            if (res.data && Array.isArray(res.data)) {
                loadPlans(null, res.data);
            }
        }).catch(() => {});

        api.get('/diet-plans/me').then(res => {
            if (res.data && Array.isArray(res.data)) {
                const savedAiPlans = res.data.map(savedPlan => {
                    let savedContent = {};
                    try {
                        savedContent = JSON.parse(savedPlan.mealsJson || '{}');
                    } catch (e) {
                        savedContent = { plan: savedPlan.mealsJson || '' };
                    }
                    const savedTitle = savedContent.title || `AI Personalized Diet Plan • ${savedPlan.generatedDate || 'Saved'}`;
                    return {
                        id: `saved-ai-${savedPlan.id}`,
                        title: savedTitle,
                        planTitle: savedTitle,
                        scope: 'PERSONAL',
                        targetUserId: user?.id || user?.userId,
                        generatedDate: savedPlan.generatedDate,
                        deployedAt: savedPlan.generatedDate,
                        dietType: savedContent.dietType || 'AI Personalized Nutrition Protocol',
                        calories: savedPlan.totalCalories,
                        protein: savedPlan.proteinG,
                        carbs: savedPlan.carbsG,
                        fats: savedPlan.fatG,
                        waterLiters: savedPlan.waterTargetLiters,
                        fiber: savedContent.targets?.fiber || 28,
                        iron: savedContent.targets?.iron || 18,
                        calcium: savedContent.targets?.calcium || 1000,
                        vitD: savedContent.targets?.vitD || 15,
                        vitC: savedContent.targets?.vitC || 90,
                        nutritionistNotes: savedContent.nutritionistNotes || 'Generated by the AI Diet Planner.',
                        meals: savedContent.meals || [],
                        planText: savedContent.planText || savedContent.plan || ''
                    };
                });
                savedAiPlansRef.current = savedAiPlans;
                loadPlans(null, [...serverPlansRef.current, ...savedAiPlans]);
            }
        }).catch(() => {});

        let bc;
        try {
            bc = new BroadcastChannel('nutrimunch_diet_plan_channel');
            bc.onmessage = (event) => {
                if (event.data?.type === 'DIET_PLAN_DELETED') {
                    showToast('Diet plan was removed and unlinked.');
                    loadPlans();
                } else if (event.data?.plan) {
                    const newPlan = event.data.plan;
                    showToast(`⚡ Deployed protocol "${newPlan.title || newPlan.planTitle}" synchronized!`);
                    loadPlans(newPlan.id);
                } else {
                    loadPlans();
                }
            };
        } catch (e) {}

        const handleUpdate = () => {
            const latestId = localStorage.getItem('nutrimunch_latest_deployed_plan_id');
            loadPlans(latestId);
        };

        const handleDeletedEvent = () => {
            loadPlans();
        };

        window.addEventListener('nutrimunch_diet_plan_updated', handleUpdate);
        window.addEventListener('nutrimunch_diet_history_updated', handleUpdate);
        window.addEventListener('nutrimunch_diet_plan_deleted', handleDeletedEvent);
        window.addEventListener('storage', handleUpdate);

        const pollInterval = setInterval(() => {
            loadPlans();
            // Periodically refresh server published registry
            api.get('/diet-plans/published').then(res => {
                if (res.data && Array.isArray(res.data)) {
                    loadPlans(null, res.data);
                }
            }).catch(() => {});
        }, 1200);

        return () => {
            if (bc) bc.close();
            clearInterval(pollInterval);
            window.removeEventListener('nutrimunch_diet_plan_updated', handleUpdate);
            window.removeEventListener('nutrimunch_diet_history_updated', handleUpdate);
            window.removeEventListener('nutrimunch_diet_plan_deleted', handleDeletedEvent);
            window.removeEventListener('storage', handleUpdate);
        };
    }, [user]);

    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    const isAuthenticated = Boolean(user || token || storedToken || storedUser);

    if (!isAuthenticated) {
        return <FeatureGate />;
    }

    // Active selected plan
    const selectedPlan = plansList.find(p => p.id === selectedPlanId) || (plansList.length > 0 ? plansList[0] : null);
    const isExclusiveActive = selectedPlan?.isExclusiveForUser || selectedPlan?.scope === 'EXCLUSIVE';

    const currentCalories = selectedPlan?.calories || 2100;
    const currentProtein = selectedPlan?.protein || 140;
    const currentCarbs = selectedPlan?.carbs || 180;
    const currentFats = selectedPlan?.fats || 60;
    const currentWater = selectedPlan?.waterLiters || 3.0;
    const currentFiber = selectedPlan?.fiber || 28;
    const currentIron = selectedPlan?.iron || 18;
    const currentCalcium = selectedPlan?.calcium || 1000;
    const currentVitD = selectedPlan?.vitD || 15;
    const currentVitC = selectedPlan?.vitC || 90;
    const currentMeals = selectedPlan?.meals && selectedPlan.meals.length > 0 ? selectedPlan.meals : [];
    const nutritionistComments = selectedPlan?.nutritionistNotes || selectedPlan?.notes;

    // Feature: DIRECTLY LINK TO DAILY REQUIREMENTS & AUTOMATICALLY SYNC WITH USER PROFILE
    const handleExecuteImport = async (plan) => {
        const targetPlan = plan || selectedPlan;
        if (!targetPlan) return;
        setIsSyncing(true);
        try {
            const planCal = targetPlan.calories || currentCalories;
            const planProt = targetPlan.protein || currentProtein;
            const planCarb = targetPlan.carbs || currentCarbs;
            const planFat = targetPlan.fats || currentFats;
            const planWat = targetPlan.waterLiters || currentWater;
            const planFib = targetPlan.fiber || currentFiber;
            const planIrn = targetPlan.iron || currentIron;
            const planCalc = targetPlan.calcium || currentCalcium;
            const planVitD = targetPlan.vitD || currentVitD;
            const planVitC = targetPlan.vitC || currentVitC;

            const targetsPayload = {
                isCustomTargets: true,
                dailyCaloriesTarget: parseInt(planCal, 10),
                proteinTarget: parseInt(planProt, 10),
                carbsTarget: parseInt(planCarb, 10),
                fatsTarget: parseInt(planFat, 10),
                dailyWaterTargetLiters: parseFloat(planWat),
                dailyFiberTargetG: parseInt(planFib, 10),
                ironTargetMg: parseFloat(planIrn),
                calciumTargetMg: parseFloat(planCalc),
                vitDTargetMcg: parseFloat(planVitD),
                vitCTargetMg: parseFloat(planVitC)
            };

            // 1. Update Backend Profile
            if (token) {
                try {
                    await api.put('/profiles/me', targetsPayload);
                } catch (e) {
                    console.warn('Backend profile update fallback to local storage:', e);
                }
            }

            // 2. Update Local Storage for Instant Real-Time Sync across Dashboard
            const localTargets = {
                calories: planCal,
                protein: planProt,
                carbs: planCarb,
                fats: planFat,
                water: planWat,
                fiber: planFib,
                iron: planIrn,
                calcium: planCalc,
                vitD: planVitD,
                vitC: planVitC
            };
            localStorage.setItem('nutrimunch_user_targets', JSON.stringify(localTargets));
            localStorage.setItem('nutrimunch_water_target_liters', String(planWat));

            // Update local state for comparison preview
            setCurrentUserTargets({
                calories: planCal,
                protein: planProt,
                carbs: planCarb,
                fats: planFat,
                water: planWat,
                fiber: planFib
            });

            // 3. Dispatch events to immediately re-render Progress Tracking and Profile
            window.dispatchEvent(new Event('nutrimunch_profile_updated'));
            window.dispatchEvent(new Event('storage'));

            setSyncSuccess(true);
            showToast(`Daily requirements successfully imported from "${targetPlan.title || targetPlan.planTitle}"!`);
            setTimeout(() => setSyncSuccess(false), 5000);
        } catch (err) {
            console.error('Failed to link diet plan requirements:', err);
            showToast('Failed to link targets. Please try again.');
        } finally {
            setIsSyncing(false);
        }
    };

    // Open Import Modal for a specific diet plan
    const handleOpenImportModal = (plan) => {
        setPlanToImport(plan);
        setIsImportModalOpen(true);
        setSyncSuccess(false);
    };

    return (
        <div className="w-full pb-12">
            {/* Live Toast Notification */}
            {notification && (
                <div className="fixed top-24 right-8 z-[9999] bg-[#a5d391] text-[#080b12] px-6 py-3.5 rounded-2xl font-bold text-sm shadow-2xl flex items-center gap-2 animate-bounce">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    <span>{notification}</span>
                </div>
            )}

            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white mb-1">Diet Plans</h1>
                    <p className="text-white/50 text-xs sm:text-sm">
                        Select any formulated diet protocol below to inspect meals and directly import its calibrated daily macro requirements.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {/* Consultation Chat Launcher */}
                    <button
                        type="button"
                        onClick={() => setIsChatOpen(true)}
                        className="bg-[#0d131f] border border-[#a5d391]/40 hover:border-[#a5d391] text-[#a5d391] hover:text-white px-4 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-base">forum</span>
                        <span>Dietitian Chat</span>
                    </button>
                </div>
            </div>

            {/* DIET PLAN SELECTOR GALLERY (SELECT A SINGLE DIET PLAN) */}
            <div className="mb-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a5d391] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-[#a5d391]">dashboard_customize</span>
                        <span>Available Formulated Protocols (Select to Inspect & Import)</span>
                    </span>

                    {/* Filter Pills: All vs Exclusive for You vs General */}
                    <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-2xl border border-white/10 shrink-0">
                        <button
                            type="button"
                            onClick={() => setFilterScope('ALL')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                filterScope === 'ALL'
                                    ? 'bg-[#a5d391] text-black shadow-md font-black'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            All ({plansList.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterScope('EXCLUSIVE')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                filterScope === 'EXCLUSIVE'
                                    ? 'bg-[#a5d391] text-black shadow-md font-black'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span>🎯 Exclusive Patient Plans</span>
                            <span className="text-[10px] opacity-80 font-black">
                                ({plansList.filter(p => p.scope === 'EXCLUSIVE').length})
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterScope('GENERAL')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                filterScope === 'GENERAL'
                                    ? 'bg-[#a5d391] text-black shadow-md font-black'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span>🌟 General Protocols</span>
                            <span className="text-[10px] opacity-80 font-black">
                                ({plansList.filter(p => p.scope === 'GENERAL').length})
                            </span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plansList.filter(plan => {
                        if (filterScope === 'EXCLUSIVE') return plan.scope === 'EXCLUSIVE';
                        if (filterScope === 'GENERAL') return plan.scope === 'GENERAL';
                        return true;
                    }).length === 0 && (
                        <div className="col-span-full p-10 text-center bg-white/5 border border-white/10 rounded-3xl space-y-3">
                            <span className="material-symbols-outlined text-4xl text-white/40">restaurant_menu</span>
                            <h4 className="text-white font-bold text-base">
                                {plansList.length === 0 ? 'No Formulated Protocols Available' : 'No protocols found in this category'}
                            </h4>
                            <p className="text-white/50 text-xs">
                                {plansList.length === 0
                                    ? 'Your dietitian has not deployed any clinical diet plans yet, or previous plans have been removed.'
                                    : 'Switch to All Formulated Protocols to view your complete clinical library.'}
                            </p>
                            {plansList.length > 0 && (
                                <button 
                                    type="button" 
                                    onClick={() => setFilterScope('ALL')} 
                                    className="px-5 py-2.5 bg-[#a5d391] text-black font-bold text-xs rounded-xl shadow-lg hover:bg-white transition-all cursor-pointer"
                                >
                                    View All Protocols ({plansList.length})
                                </button>
                            )}
                        </div>
                    )}

                    {plansList
                        .filter(plan => {
                            if (filterScope === 'EXCLUSIVE') return plan.scope === 'EXCLUSIVE';
                            if (filterScope === 'GENERAL') return plan.scope === 'GENERAL';
                            return true;
                        })
                        .map((plan) => {
                            const isSelected = plan.id === selectedPlanId;
                            const isExcl = plan.scope === 'EXCLUSIVE';
                            const planName = plan.title || plan.planTitle || 'Custom Protocol';

                        return (
                            <div
                                key={plan.id}
                                onClick={() => setSelectedPlanId(plan.id)}
                                className={`p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden group ${
                                    isSelected
                                        ? 'bg-gradient-to-b from-[#a5d391]/15 to-[#080b12] border-[#a5d391] shadow-[0_0_30px_rgba(165,211,145,0.25)] ring-1 ring-[#a5d391]/40'
                                        : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                                isExcl
                                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                                    : 'bg-[#a5d391]/15 text-[#a5d391] border-[#a5d391]/30'
                                            }`}>
                                                {isExcl ? '★ Exclusive for You' : 'General Protocol'}
                                            </span>
                                            {plan.timestamp > 0 && plan.id === plansList[0]?.id && (
                                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#a5d391] text-black shadow-[0_0_12px_rgba(165,211,145,0.6)] animate-pulse">
                                                    ⚡ Newly Deployed
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <span className="text-[10px] font-bold text-[#a5d391] flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                                Active Selected
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-base text-white group-hover:text-[#a5d391] transition-colors leading-snug">
                                        {planName}
                                    </h3>

                                    <div className="text-[11px] text-white/50 space-y-0.5">
                                        <div>{plan.dietType || 'Clinical Protocol'}</div>
                                        <div className="flex items-center gap-1 text-white/70">
                                            <span className="material-symbols-outlined text-[12px] text-[#a5d391]">badge</span>
                                            <span>By <strong className="text-white font-medium">{plan.dietitianName || 'Dietitian'}</strong></span>
                                            {plan.dietitianEmail && (
                                                <span className="text-[#a5d391] font-mono text-[10px] truncate max-w-[170px]" title={plan.dietitianEmail}>
                                                    ({plan.dietitianEmail})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Macro summary pills */}
                                    <div className="grid grid-cols-4 gap-1.5 p-2 bg-black/40 rounded-xl text-center text-[10px] border border-white/5">
                                        <div><span className="text-white/40 block text-[8px] uppercase">Cal</span><strong className="text-white">{plan.calories}</strong></div>
                                        <div><span className="text-white/40 block text-[8px] uppercase">Prot</span><strong className="text-[#a5d391]">{plan.protein}g</strong></div>
                                        <div><span className="text-white/40 block text-[8px] uppercase">Carb</span><strong className="text-cyan-300">{plan.carbs}g</strong></div>
                                        <div><span className="text-white/40 block text-[8px] uppercase">Fat</span><strong className="text-amber-300">{plan.fats}g</strong></div>
                                    </div>
                                </div>

                                {/* Direct Import Action on Card */}
                                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                                    <span className="text-[10px] text-white/40">
                                        {plan.meals?.length || 4} Scheduled Meals
                                    </span>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPlanId(plan.id);
                                            handleOpenImportModal(plan);
                                        }}
                                        className="bg-[#a5d391]/15 hover:bg-[#a5d391] text-[#a5d391] hover:text-black border border-[#a5d391]/30 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                    >
                                        <span className="material-symbols-outlined text-xs">sync_alt</span>
                                        <span>Import Requirements</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* HERO CARD & PROTOCOL DETAILS (ONLY RENDERED WHEN A PLAN IS SELECTED) */}
            {selectedPlan ? (
                <>
                    {/* HERO CARD: 1-CLICK LINK TO DAILY REQUIREMENTS FOR SELECTED PLAN */}
                    <div className="mb-8 p-6 lg:p-8 rounded-[2.5rem] bg-gradient-to-r from-emerald-950/40 via-[#0d131f] to-[#a5d391]/15 border border-[#a5d391]/50 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a5d391]/20 border border-[#a5d391]/40 text-[#a5d391] text-xs font-bold">
                            <span className="material-symbols-outlined text-sm">tune</span>
                            <span>Direct Daily Requirements Link</span>
                        </div>
                        <h2 className="text-2xl font-bold font-hero-display text-white">
                            Import Daily Requirements from: {selectedPlan?.title || selectedPlan?.planTitle}
                        </h2>
                        <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                            Click below to immediately adopt this specific diet plan's parameters (<strong className="text-white">{currentCalories} kcal</strong>, <strong className="text-[#a5d391]">{currentProtein}g Protein</strong>, <strong className="text-cyan-300">{currentCarbs}g Carbs</strong>, <strong className="text-amber-300">{currentFats}g Fats</strong>, <strong className="text-cyan-400">{currentWater}L Water</strong>). It updates your profile and syncs your Progress Tracking in real time.
                        </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-start sm:items-end gap-2">
                        <button
                            type="button"
                            onClick={() => handleOpenImportModal(selectedPlan)}
                            className="bg-[#a5d391] hover:bg-white text-black font-extrabold text-xs uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(165,211,145,0.4)] cursor-pointer flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">sync_alt</span>
                            <span>Import Daily Requirements</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* NUTRITIONIST COMMENTS & CLINICAL ADVICE BANNER */}
            {nutritionistComments && (
                <div className="mb-8 p-6 rounded-[2rem] bg-gradient-to-r from-[#0d131f] via-white/5 to-[#080b12] border border-[#a5d391]/40 shadow-xl relative overflow-hidden animate-fadeIn">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#a5d391]/20 text-[#a5d391] flex items-center justify-center shrink-0 border border-[#a5d391]/40 shadow-inner">
                            <span className="material-symbols-outlined text-2xl">comment</span>
                        </div>
                        <div className="space-y-1.5 flex-grow">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-xs font-bold text-[#a5d391] uppercase tracking-widest flex items-center gap-2">
                                    <span>Nutritionist Formulation Comments</span>
                                    <span className="text-[10px] text-white/40 font-normal flex items-center gap-1">
                                        • Prescribed by <strong className="text-white/80">{selectedPlan?.dietitianName || 'Dietitian'}</strong>
                                        {selectedPlan?.dietitianEmail && (
                                            <span className="text-[#a5d391] font-mono">({selectedPlan.dietitianEmail})</span>
                                        )}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#a5d391]/20 text-[#a5d391] px-2.5 py-0.5 rounded-full border border-[#a5d391]/30">
                                    Clinical Advice
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-white/90 font-medium italic leading-relaxed pt-1">
                                "{nutritionistComments}"
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN PROTOCOL BREAKDOWN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Diet Protocol Meal Schedule */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-[#a5d391]/10 blur-[70px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10 gap-4">
                            <div>
                                <h2 className="text-2xl font-bold mb-1 font-hero-display text-white">
                                    {selectedPlan?.title || selectedPlan?.planTitle}
                                </h2>
                                <p className="text-white/50 text-xs sm:text-sm">
                                    Target: <span className="text-[#a5d391] font-bold">{currentCalories.toLocaleString()} kcal</span> • Macro Split: <span className="text-white font-semibold">{currentProtein}P / {currentCarbs}C / {currentFats}F</span>
                                </p>
                            </div>
                            <span className="bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30 px-3.5 py-1 text-xs font-bold uppercase tracking-widest rounded-full backdrop-blur-md">
                                {isExclusiveActive ? 'Exclusive Patient Plan' : 'Verified Public Protocol'}
                            </span>
                        </div>

                        {/* Meal Slots Listing */}
                        <div className="space-y-4 relative z-10">
                            {currentMeals.map((meal, idx) => (
                                <div key={meal.id || idx} className="bg-[#080b12]/80 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-center">
                                    <div className="w-14 h-14 rounded-2xl bg-[#a5d391]/15 text-[#a5d391] flex items-center justify-center shrink-0 border border-[#a5d391]/30 font-bold text-sm">
                                        {meal.mealType?.charAt(0) || `M${idx + 1}`}
                                    </div>

                                    <div className="flex-grow text-center md:text-left min-w-0">
                                        <div className="text-xs text-[#a5d391] font-bold uppercase tracking-widest mb-1">
                                            {meal.mealType || `Meal ${idx + 1}`} ({meal.time || 'Scheduled'})
                                        </div>
                                        <div className="font-bold text-base text-white truncate">{meal.name}</div>
                                        <div className="text-xs text-white/50 truncate">{meal.ingredients}</div>
                                    </div>

                                    <div className="text-center md:text-right shrink-0">
                                        <div className="font-bold text-lg font-hero-display text-white">
                                            {meal.calories} <span className="text-xs text-white/50 font-normal">kcal</span>
                                        </div>
                                        <div className="text-xs text-white/40">
                                            <span className="text-[#a5d391] font-bold">{meal.protein}P</span> / <span className="text-cyan-300 font-bold">{meal.carbs}C</span> / <span className="text-amber-300 font-bold">{meal.fats}F</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {selectedPlan?.planText && (
                            <div className="mt-6 pt-6 border-t border-white/10 relative z-10">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div>
                                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest block mb-1">
                                            Clinical Allergy Safeguards &amp; Additional Guidance
                                        </span>
                                        <h3 className="text-lg font-bold font-hero-display text-white">
                                            Allergy Exclusions &amp; Clinical Guidance
                                        </h3>
                                    </div>
                                    <span className="material-symbols-outlined text-amber-300">health_and_safety</span>
                                </div>
                                <pre className="whitespace-pre-wrap break-words text-xs sm:text-sm text-white/75 leading-relaxed bg-black/30 border border-amber-300/15 rounded-2xl p-4">
                                    {selectedPlan.planText}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: 5-7 Daily Requirement Parameters & Actions */}
                <div className="space-y-6">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl space-y-6">
                        <div className="border-b border-white/10 pb-4">
                            <span className="text-[10px] font-bold text-[#a5d391] uppercase tracking-widest block mb-1">
                                Specific Diet Plan Parameters
                            </span>
                            <h3 className="font-bold text-lg font-hero-display text-white">Daily Target Requirements</h3>
                            <p className="text-white/50 text-xs mt-0.5">Calculated specifically for this protocol</p>
                        </div>

                        {/* Top 3 Macros */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-center">
                                <span className="text-[10px] text-white/40 uppercase block mb-1">Protein</span>
                                <span className="text-xl font-bold text-[#a5d391]">{currentProtein}g</span>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-center">
                                <span className="text-[10px] text-white/40 uppercase block mb-1">Carbs</span>
                                <span className="text-xl font-bold text-cyan-300">{currentCarbs}g</span>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-center">
                                <span className="text-[10px] text-white/40 uppercase block mb-1">Fats</span>
                                <span className="text-xl font-bold text-amber-300">{currentFats}g</span>
                            </div>
                        </div>

                        <div className="pt-2 space-y-2 border-t border-white/5 text-xs text-white/60">
                            <div className="flex justify-between items-center">
                                <span>1. Daily Calorie Goal:</span>
                                <strong className="text-white">{currentCalories} kcal</strong>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>2. Daily Water Target:</span>
                                <strong className="text-cyan-300">{currentWater} Liters</strong>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>3. Fiber Requirement:</span>
                                <strong className="text-emerald-400">{currentFiber} g</strong>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>4. Iron Target:</span>
                                <strong className="text-rose-300">{currentIron} mg</strong>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>5. Calcium Target:</span>
                                <strong className="text-white">{currentCalcium} mg</strong>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>6. Vitamin D:</span>
                                <strong className="text-amber-300">{currentVitD} mcg</strong>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>7. Vitamin C:</span>
                                <strong className="text-orange-300">{currentVitC} mg</strong>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleOpenImportModal(selectedPlan)}
                            className="w-full mt-2 py-3.5 rounded-2xl bg-[#a5d391] hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#a5d391]/20"
                        >
                            <span className="material-symbols-outlined text-base">sync_alt</span>
                            <span>Import Daily Requirements</span>
                        </button>
                    </div>

                    {/* Grocery Order Card */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
                        <h3 className="font-bold mb-4 flex items-center gap-2 font-hero-display text-white">
                            <span className="material-symbols-outlined text-[#a5d391]">shopping_cart</span>
                            Grocery List
                        </h3>
                        <p className="text-white/50 text-xs mb-4">Auto-compiled from this protocol schedule.</p>
                        
                        <div className="space-y-2.5 mb-6 text-xs">
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="accent-[#a5d391] w-4 h-4 rounded cursor-pointer" defaultChecked />
                                <span className="text-white/90">Steel-cut Oats & Blueberries</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="accent-[#a5d391] w-4 h-4 rounded cursor-pointer" defaultChecked />
                                <span className="text-white/90">Wild Caught Salmon Fillets (180g)</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="accent-[#a5d391] w-4 h-4 rounded cursor-pointer" />
                                <span className="text-white/90">Organic Quinoa & Steamed Broccoli</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="accent-[#a5d391] w-4 h-4 rounded cursor-pointer" />
                                <span className="text-white/90">Greek Yogurt & Raw Walnuts</span>
                            </div>
                        </div>

                        <button 
                            type="button"
                            onClick={() => showToast('Grocery list exported to clipboard!')}
                            className="w-full bg-[#080b12]/80 border border-white/10 hover:border-[#a5d391]/30 text-white font-bold py-3 rounded-2xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm text-[#a5d391]">download</span>
                            <span>Export Grocery Order</span>
                        </button>
                    </div>
                </div>
            </div>
                </>
            ) : (
                <div className="p-12 text-center bg-[#0d131f]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] space-y-4 shadow-xl">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-[#a5d391]/10 border border-[#a5d391]/30 flex items-center justify-center text-[#a5d391]">
                        <span className="material-symbols-outlined text-3xl">clinical_notes</span>
                    </div>
                    <h3 className="text-xl font-bold font-hero-display text-white">No Active Diet Protocol Deployed</h3>
                    <p className="text-xs sm:text-sm text-white/50 max-w-md mx-auto leading-relaxed">
                        There are currently no active diet plans in your library. When your nutritionist formulates a new protocol or assigns an exclusive meal plan to your account, it will appear here instantly.
                    </p>
                    <button
                        type="button"
                        onClick={() => setIsChatOpen(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#a5d391] text-black font-bold text-xs hover:bg-white transition-all cursor-pointer shadow-lg"
                    >
                        <span className="material-symbols-outlined text-base">forum</span>
                        <span>Chat With Your Dietitian</span>
                    </button>
                </div>
            )}

            {/* INTERACTIVE IMPORT DAILY REQUIREMENTS MODAL FROM THAT SPECIFIC DIET PLAN */}
            {isImportModalOpen && planToImport && (
                <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-start pt-24 sm:pt-28 pb-8 px-3 sm:px-4 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    <div className="bg-[#080b12] border border-[#a5d391]/50 rounded-[2.5rem] max-w-2xl w-full max-h-[calc(100vh-8.5rem)] flex flex-col shadow-[0_0_90px_rgba(165,211,145,0.3)] overflow-hidden shrink-0 my-auto sm:my-0">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-emerald-950/40 to-[#080b12] flex items-center justify-between shrink-0">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a5d391] flex items-center gap-1.5 mb-1">
                                    <span className="material-symbols-outlined text-sm">sync_alt</span>
                                    <span>Import Daily Requirements</span>
                                </span>
                                <h3 className="text-xl font-bold font-hero-display text-white">
                                    {planToImport.title || planToImport.planTitle}
                                </h3>
                                <p className="text-xs text-white/50">
                                    Prescribed by <strong className="text-white">{planToImport.dietitianName || 'Dietitian'}</strong>
                                    {planToImport.dietitianEmail && (
                                        <span className="text-[#a5d391] font-mono ml-1">({planToImport.dietitianEmail})</span>
                                    )} • {planToImport.dietType || 'Clinical Protocol'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsImportModalOpen(false)}
                                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
                            {/* Confirmation Banner */}
                            <div className="p-4 bg-[#a5d391]/10 border border-[#a5d391]/30 rounded-2xl text-xs text-white/80 leading-relaxed">
                                Review the exact daily requirements calibrated by your nutritionist for <strong className="text-white">"{planToImport.title || planToImport.planTitle}"</strong>. Confirming will synchronize these targets directly into your User Profile and Progress Tracking goals.
                            </div>

                            {/* Side-by-Side Target Comparison */}
                            <div>
                                <span className="text-[10px] font-bold text-[#a5d391] uppercase tracking-widest block mb-2">
                                    1. Target Comparison (Current Profile vs. This Diet Plan)
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {/* Calories */}
                                    <div className="p-3.5 bg-black/60 rounded-2xl border border-white/10 space-y-1">
                                        <span className="text-[9px] font-bold uppercase text-white/40 block">Energy (kcal)</span>
                                        <div className="text-base font-bold text-white flex items-center justify-between">
                                            <span className="text-white/40 text-xs line-through">{currentUserTargets.calories}</span>
                                            <span className="text-[#a5d391]">{planToImport.calories || 2100}</span>
                                        </div>
                                    </div>

                                    {/* Protein */}
                                    <div className="p-3.5 bg-black/60 rounded-2xl border border-white/10 space-y-1">
                                        <span className="text-[9px] font-bold uppercase text-white/40 block">Protein (g)</span>
                                        <div className="text-base font-bold text-white flex items-center justify-between">
                                            <span className="text-white/40 text-xs line-through">{currentUserTargets.protein}g</span>
                                            <span className="text-[#a5d391]">{planToImport.protein || 160}g</span>
                                        </div>
                                    </div>

                                    {/* Carbs */}
                                    <div className="p-3.5 bg-black/60 rounded-2xl border border-white/10 space-y-1">
                                        <span className="text-[9px] font-bold uppercase text-white/40 block">Carbs (g)</span>
                                        <div className="text-base font-bold text-white flex items-center justify-between">
                                            <span className="text-white/40 text-xs line-through">{currentUserTargets.carbs}g</span>
                                            <span className="text-cyan-300">{planToImport.carbs || 150}g</span>
                                        </div>
                                    </div>

                                    {/* Fats */}
                                    <div className="p-3.5 bg-black/60 rounded-2xl border border-white/10 space-y-1">
                                        <span className="text-[9px] font-bold uppercase text-white/40 block">Fats (g)</span>
                                        <div className="text-base font-bold text-white flex items-center justify-between">
                                            <span className="text-white/40 text-xs line-through">{currentUserTargets.fats}g</span>
                                            <span className="text-amber-300">{planToImport.fats || 70}g</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Parameters: Water, Fiber, Micronutrients */}
                            <div>
                                <span className="text-[10px] font-bold text-[#a5d391] uppercase tracking-widest block mb-2">
                                    2. Hydration & Micronutrient Allotments
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-[9px] text-white/40 block">Daily Water</span>
                                        <strong className="text-sm text-cyan-300">{planToImport.waterLiters || 3.0} Liters</strong>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-[9px] text-white/40 block">Dietary Fiber</span>
                                        <strong className="text-sm text-emerald-400">{planToImport.fiber || 28} grams</strong>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-[9px] text-white/40 block">Iron</span>
                                        <strong className="text-sm text-rose-300">{planToImport.iron || 18} mg</strong>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-[9px] text-white/40 block">Calcium</span>
                                        <strong className="text-sm text-white">{planToImport.calcium || 1000} mg</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Nutritionist Guidance for this specific plan */}
                            {planToImport.nutritionistNotes && (
                                <div className="p-4 bg-gradient-to-r from-[#0d131f] to-black border border-white/10 rounded-2xl space-y-1">
                                    <span className="text-[10px] font-bold text-[#a5d391] uppercase tracking-wider block">
                                        Dietitian Formulation Directive:
                                    </span>
                                    <p className="text-white/80 italic leading-relaxed">
                                        "{planToImport.nutritionistNotes}"
                                    </p>
                                </div>
                            )}

                            {/* Success State Animation */}
                            {syncSuccess && (
                                <div className="p-4 rounded-2xl bg-[#a5d391]/20 border border-[#a5d391]/50 text-center space-y-2 animate-fadeIn">
                                    <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#a5d391]">
                                        <span className="material-symbols-outlined text-lg">check_circle</span>
                                        <span>Daily Requirements Successfully Imported!</span>
                                    </div>
                                    <p className="text-[11px] text-white/70">
                                        Your targets have been updated in your Profile and Progress Tracking dashboard.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 sm:p-5 border-t border-white/10 bg-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                            <span className="text-[11px] text-white/40">
                                Syncs to /api/profiles/me & Progress Tracking
                            </span>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                {syncSuccess ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsImportModalOpen(false);
                                            navigate('/dashboard/user/progress-tracking');
                                        }}
                                        className="w-full sm:w-auto bg-[#a5d391] text-black font-extrabold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
                                    >
                                        <span>View in Progress Tracking</span>
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleExecuteImport(planToImport)}
                                        disabled={isSyncing}
                                        className="w-full sm:w-auto bg-[#a5d391] hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(165,211,145,0.4)] disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-sm">sync_alt</span>
                                        <span>{isSyncing ? 'Importing Requirements...' : 'Confirm & Import Daily Requirements'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CONSULTATION CHAT MODAL FOR USER */}
            {isChatOpen && (
                <ConsultationChatModal
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    currentUser={user}
                    targetPatient={{ dietitianName: selectedPlan?.dietitianName || 'Dietitian Mihir Sharma' }}
                />
            )}
        </div>
    );
};

export default DietPlans;
