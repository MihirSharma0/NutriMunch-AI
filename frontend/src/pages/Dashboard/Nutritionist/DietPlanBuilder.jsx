/**
 * Clinical Diet Plan Builder Studio
 * Professional authoring suite for certified nutritionists to construct custom 7-day
 * macronutrient regimes, meal schedules, and deploy plans to assigned patients.
 */
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import { AuthContext } from '../../../context/AuthContext';
import { permanentlyDeleteDietPlan } from '../../../utils/dietPlanSync';
import { getMacroError } from '../../../utils/formValidation';

/**
 * DietPlanBuilder Component
 * Interactive meal builder and deployment studio supporting exclusive patient prescribing and general publication.
 */
const DietPlanBuilder = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const nutritionistName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.name || user?.username || 'Nutritionist');
    const nutritionistEmail = user?.email || (user?.username && user.username.includes('@') ? user.username : '');

    // Navigation Tab: 'STUDIO' (Diet Builder Studio) or 'HISTORY' (Formulated Diet Plans History Vault)
    const [activeTab, setActiveTab] = useState('STUDIO');

    // Mode: 'GENERAL' (All Users) or 'EXCLUSIVE' (Individual Patient Roster)
    const [targetMode, setTargetMode] = useState('GENERAL');

    // Users & Patients Roster State
    const [clientsList, setClientsList] = useState([]);
    const [loadingClients, setLoadingClients] = useState(true);
    const [rosterError, setRosterError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);

    // Patient Dossier Modal State
    const [dossierPatient, setDossierPatient] = useState(null);
    const [isDossierOpen, setIsDossierOpen] = useState(false);

    // Consultation Chat Modal State

    // Notification / Toast Feedback
    const [notification, setNotification] = useState(null);
    const [isDeploying, setIsDeploying] = useState(false);

    // Diet Plans History Vault State
    const [dietHistory, setDietHistory] = useState([]);
    const [editingPlanId, setEditingPlanId] = useState(null);
    const [historyFilter, setHistoryFilter] = useState('ALL'); // 'ALL', 'GENERAL', 'EXCLUSIVE'
    const [historySearch, setHistorySearch] = useState('');
    const [selectedHistoryPlan, setSelectedHistoryPlan] = useState(null);
    const [isHistoryDossierOpen, setIsHistoryDossierOpen] = useState(false);

    // Load only previously saved diet plan history.
    const loadDietHistory = async () => {
        // No client-side deletion blacklist: the backend already filters
        // soft-deleted plans. Cached history is offline-only display data.
        let localHistory = [];
        try {
            const raw = localStorage.getItem('nutrimunch_diet_plans_history');
            const parsed = raw !== null ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) localHistory = parsed;
        } catch (e) { localHistory = []; }

        // The server is the source of truth for plans this nutritionist created,
        // so they reappear after logging in from any browser. A shared browser
        // can never reveal another nutritionist's local drafts.
        let serverHistory = [];
        try {
            const res = await api.get('/diet-plans/published');
            if (Array.isArray(res.data)) serverHistory = res.data.filter(isActive);
        } catch (e) { serverHistory = []; }

        const myId = String(user?.id || user?.userId || '');
        const myEmail = String(user?.email || '').toLowerCase().trim();
        const isMine = (plan) =>
            (myId && String(plan.nutritionistId ?? '') === myId) ||
            (myEmail && String(plan.authorEmail || plan.nutritionistEmail || '').toLowerCase().trim() === myEmail);

        // Server rows are authoritative across devices; local drafts authored by
        // this account are kept too, so a just-deployed plan never flickers away.
        const merged = [...serverHistory];
        localHistory.filter(isMine).forEach(plan => {
            if (!merged.some(existing => String(existing.id) === String(plan.id))) merged.push(plan);
        });
        merged.sort((a, b) =>
            (new Date(b.deployedAt || b.createdAt || 0).getTime()) -
            (new Date(a.deployedAt || a.createdAt || 0).getTime()));
        setDietHistory(merged);
        try { localStorage.setItem('nutrimunch_diet_plans_history', JSON.stringify(merged)); } catch (e) {}
    };

    useEffect(() => {
        loadDietHistory();
        window.addEventListener('nutrimunch_diet_history_updated', loadDietHistory);
        window.addEventListener('storage', loadDietHistory);
        return () => {
            window.removeEventListener('nutrimunch_diet_history_updated', loadDietHistory);
            window.removeEventListener('storage', loadDietHistory);
        };
    }, []);

    // Diet Plan Macro & Daily Requirement Parameters (5-7 primary parameters + micronutrients)
    const [planForm, setPlanForm] = useState({
        planTitle: 'Clinical Metabolic Optimization Protocol',
        calories: 2100,
        protein: 160,
        carbs: 150,
        fats: 70,
        waterLiters: 3.0,
        dietType: 'High-Protein Metabolic',
        nutritionistNotes: 'Maintain strict meal cadence. Hydrate with 500ml water upon waking. Emphasize whole-food bioavailable protein sources.'
    });

    // Meal Schedule Formulation
    const [meals, setMeals] = useState([
        {
            id: 1,
            time: '08:00 AM',
            name: 'Kinetic Synthesis Bowl',
            mealType: 'Breakfast',
            ingredients: 'Steel-cut oats, Whey Isolate (1 scoop), Blueberries, Chia seeds, Almond butter',
            calories: 520,
            protein: 38,
            carbs: 58,
            fats: 14
        },
        {
            id: 2,
            time: '01:00 PM',
            name: 'Pan-Seared Salmon & Quinoa',
            mealType: 'Lunch',
            ingredients: 'Wild salmon fillet (180g), Tricolor quinoa (1 cup), Steamed broccoli, Extra virgin olive oil',
            calories: 680,
            protein: 52,
            carbs: 48,
            fats: 24
        },
        {
            id: 3,
            time: '04:30 PM',
            name: 'Metabolic Power Snack',
            mealType: 'Snack',
            ingredients: 'Greek yogurt (200g), Raw walnuts (25g), Ground flaxseed, Cinnamon',
            calories: 320,
            protein: 24,
            carbs: 16,
            fats: 14
        },
        {
            id: 4,
            time: '07:30 PM',
            name: 'Lean Herb Turkey & Roasted Vegetables',
            mealType: 'Dinner',
            ingredients: 'Lean ground turkey (170g), Sweet potato wedges, Asparagus spears, Avocado oil',
            calories: 580,
            protein: 46,
            carbs: 42,
            fats: 18
        }
    ]);

    const showToast = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 4000);
    };

    // Load Real Platform Users / Patients for Roster
    useEffect(() => {
        fetchRealUsers();
    }, []);

    const fetchRealUsers = async () => {
        try {
            setLoadingClients(true);
            const [profilesResponse, appointmentsResponse] = await Promise.all([
                api.get('/client-profiles'),
                api.get('/appointments/me'),
            ]);
            if (Array.isArray(profilesResponse.data) && Array.isArray(appointmentsResponse.data)) {
                const acceptedStatuses = new Set(['CONFIRMED', 'ACCEPTED', 'APPROVED', 'SCHEDULED']);
                const acceptedAppointments = appointmentsResponse.data.filter(appointment =>
                    acceptedStatuses.has(String(appointment.status || '').trim().toUpperCase())
                    && appointment.userId != null
                    && appointment.id != null,
                );
                const appointmentByPatient = new Map();
                acceptedAppointments.forEach(appointment => {
                    const patientId = String(appointment.userId);
                    if (!appointmentByPatient.has(patientId)) {
                        appointmentByPatient.set(patientId, appointment);
                    }
                });
                const fetched = profilesResponse.data
                    .filter(profile => appointmentByPatient.has(String(profile.userId || profile.id)))
                    .map(p => {
                        const name = p.firstName || p.lastName ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : (p.email ? p.email.split('@')[0] : 'User');
                        const heightCm = p.heightCm || null;
                        const weightKg = p.weightKg || null;
                        const totalIn = heightCm ? heightCm / 2.54 : null;
                        const ft = Math.floor(totalIn / 12);
                        const inch = Math.round(totalIn % 12);
                        const lbs = weightKg ? Math.round(weightKg * 2.20462) : null;
                        const bmi = weightKg && heightCm ? (weightKg / ((heightCm / 100) * (heightCm / 100))).toFixed(1) : 'Not set';

                        return {
                            id: String(p.userId || p.id),
                            userId: String(p.userId || p.id),
                            appointmentId: appointmentByPatient.get(String(p.userId || p.id)).id,
                            name: name,
                            email: p.email || '',
                            role: 'USER',
                            age: p.age ?? 'Not set',
                            gender: p.gender || 'Not specified',
                            goal: p.goal || 'No goal set',
                            adherence: p.adherence ?? null,
                            status: p.status || 'Not assessed',
                            heightCm: heightCm,
                            heightFtIn: heightCm ? `${ft}' ${inch}"` : 'Not set',
                            weightKg: weightKg,
                            weightLbs: lbs,
                            weight: weightKg ? `${weightKg} kg` : 'Not set',
                            targetWeightKg: p.targetWeightKg ?? null,
                            bmi: bmi,
                            activityLevel: p.activityLevel || 'Not set',
                            dietType: p.dietType || 'Not set',
                            allergies: p.allergies || 'Not set',
                            cuisinePreferences: p.cuisinePreferences || 'Not set',
                            favoriteFoods: p.favoriteFoods || 'Not set',
                            dislikedFoods: p.dislikedFoods || 'Not set',
                            lifestyleClass: p.lifestyleClass || 'Not set',
                            mealBudget: p.mealBudget || 'Not set',
                            bmr: p.bmr ?? null,
                            tdee: p.tdee ?? null,
                            calories: p.dailyCaloriesTarget ? `${p.dailyCaloriesTarget} kcal` : 'Not set',
                            caloriesNum: p.dailyCaloriesTarget ?? null,
                            protein: p.proteinTarget ? `${p.proteinTarget}g` : 'Not set',
                            proteinNum: p.proteinTarget ?? null,
                            carbs: p.carbsTarget ? `${p.carbsTarget}g` : 'Not set',
                            carbsNum: p.carbsTarget ?? null,
                            fats: p.fatsTarget ? `${p.fatsTarget}g` : 'Not set',
                            fatsNum: p.fatsTarget ?? null,
                            waterLiters: p.dailyWaterTargetLiters ?? null,
                            notes: p.dietType ? `Preferred Diet: ${p.dietType}` : 'No dietary information recorded.'
                        };
                    });
                const patients = fetched.filter(client => client.id);
                setClientsList(patients);
                setRosterError('');
                if (patients.length === 0) {
                    setSelectedClient(null);
                } else {
                    setSelectedClient(current =>
                        patients.find(patient => patient.id === current?.id) || patients[0],
                    );
                }
            } else {
                setClientsList([]);
                setSelectedClient(null);
                setRosterError('Could not load accepted consultations and patient profiles. Please retry.');
            }
        } catch (error) {
            console.error('Failed loading patient roster', error);
            setClientsList([]);
            setSelectedClient(null);
            setRosterError('Unable to load patients. Check your connection and retry.');
        } finally {
            setLoadingClients(false);
        }
    };

    const filteredClients = clientsList.filter(client => {
        const matchSearch = String(client.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            String(client.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            client.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            String(client.goal || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchSearch;
    });

    const handleSelectPatient = (patient) => {
        setSelectedClient(patient);
        setPlanForm(prev => ({
            ...prev,
            planTitle: `Exclusive Protocol for ${patient.name}`,
            nutritionistNotes: `Targeted clinical diet calibrated for ${patient.name} (${patient.goal}). Adhere strictly to daily hydration and macro splits.`
        }));
        showToast(`Target patient set to ${patient.name} (ID: #${patient.id})`);
    };

    // Apply Patient's Profile Targets Directly to Diet Plan Form
    const handleApplyPatientTargets = (patient) => {
        setPlanForm(prev => ({
            ...prev,
            planTitle: `Exclusive Protocol for ${patient.name}`,
            calories: patient.caloriesNum || 2100,
            protein: patient.proteinNum || 150,
            carbs: patient.carbsNum || 180,
            fats: patient.fatsNum || 60,
            waterLiters: patient.waterLiters || 3.0,
            dietType: patient.dietType || prev.dietType,
            nutritionistNotes: `Prescribed based on patient profile goals: ${patient.goal}. Allergies noted: ${patient.allergies}.`
        }));
        showToast(`Imported ${patient.name}'s profile targets into the diet builder!`);
        setIsDossierOpen(false);
    };

    // Open Consultation Chat with selected patient
    const handleOpenChat = (patient) => {
        if (patient?.appointmentId) {
            navigate(`/consultation-chat?appointmentId=${encodeURIComponent(patient.appointmentId)}`);
        }
    };

    const handleUpdateMeal = (mealId, field, value) => {
        setMeals(currentMeals => currentMeals.map(meal => (
            meal.id === mealId ? { ...meal, [field]: value } : meal
        )));
    };

    const handleAddMeal = () => {
        const newMeal = {
            id: Date.now(),
            time: '03:30 PM',
            name: 'Custom Nutritional Formulation',
            mealType: 'Snack / Intra-day',
            ingredients: 'Whey protein, Walnuts, Green tea',
            calories: 250,
            protein: 25,
            carbs: 10,
            fats: 8
        };
        setMeals([...meals, newMeal]);
        showToast('New meal slot added to diet schedule');
    };

    const handleRemoveMeal = (mealId) => {
        if (meals.length <= 1) {
            showToast('Diet plan must contain at least one meal');
            return;
        }
        setMeals(meals.filter(m => m.id !== mealId));
    };

    // Deploy Diet Plan
    const handleDeployPlan = async () => {
        if (!planForm.planTitle.trim()) {
            showToast('Please provide a distinct Diet Plan Name before deploying.');
            return;
        }

        // C8: reject unbounded / negative macros before any save or deploy.
        const macroError = getMacroError(planForm);
        if (macroError) {
            showToast(macroError);
            return;
        }
        if (!Array.isArray(meals) || meals.length === 0) {
            showToast('Add at least one meal before deploying.');
            return;
        }

        setIsDeploying(true);

        const currentTimestamp = new Date().toISOString();
        const planId = editingPlanId || `plan_${Date.now()}`;

        const basePlanPayload = {
            id: planId,
            title: planForm.planTitle.trim(),
            planTitle: planForm.planTitle.trim(),
            scope: targetMode, // 'GENERAL' or 'EXCLUSIVE'
            targetMode: targetMode,
            calories: Number(planForm.calories),
            protein: Number(planForm.protein),
            carbs: Number(planForm.carbs),
            fats: Number(planForm.fats),
            waterLiters: Number(planForm.waterLiters),
            dietType: planForm.dietType,
            nutritionistNotes: planForm.nutritionistNotes,
            nutritionistName: nutritionistName,
            nutritionistEmail: nutritionistEmail,
            author: nutritionistName,
            authorEmail: nutritionistEmail,
            nutritionistId: user?.id || null,
            deployedAt: currentTimestamp,
            meals: meals
        };

        const cleanTitle = planForm.planTitle.trim().toLowerCase();

        try {
            let finalDeployedPayload = null;

            if (targetMode === 'GENERAL') {
                // GENERAL DIET PLAN -> Visible to ALL users
                finalDeployedPayload = {
                    ...basePlanPayload,
                    scope: 'GENERAL',
                    targetMode: 'GENERAL',
                    targetUserName: 'All Platform Users',
                    targetUserId: null
                };

                localStorage.setItem('nutrimunch_general_diet_plan', JSON.stringify(finalDeployedPayload));
                localStorage.setItem('nutrimunch_latest_deployed_plan', JSON.stringify(finalDeployedPayload));
                localStorage.setItem('nutrimunch_latest_deployed_plan_id', finalDeployedPayload.id);
                
                // Add / update in History Vault (collapsing duplicate titles)
                const filteredHistory = dietHistory.filter(h => 
                    String(h.id) !== String(planId) && 
                    (h.title || h.planTitle || '').trim().toLowerCase() !== cleanTitle
                );
                const updatedHistory = [finalDeployedPayload, ...filteredHistory];
                setDietHistory(updatedHistory);
                localStorage.setItem('nutrimunch_diet_plans_history', JSON.stringify(updatedHistory));
                window.dispatchEvent(new Event('nutrimunch_diet_history_updated'));
                window.dispatchEvent(new Event('nutrimunch_diet_plan_updated'));
                window.dispatchEvent(new Event('storage'));
                try {
                    const bc = new BroadcastChannel('nutrimunch_diet_plan_channel');
                    bc.postMessage({ type: 'DIET_PLAN_DEPLOYED', plan: finalDeployedPayload });
                    setTimeout(() => { try { bc.close(); } catch (err) {} }, 1000);
                } catch (err) {}

                // Sync to backend API. A failed deploy must never look successful.
                try {
                    await api.post('/diet-plans/deploy', finalDeployedPayload);
                } catch (deployErr) {
                    console.error('Failed to deploy diet plan:', deployErr);
                    throw deployErr;
                }

                // General plans are discovered in the diet plan section; no notification is created.
                showToast(`"${planForm.planTitle}" deployed successfully! Saved to history & active for all users.`);
            } else {
                // EXCLUSIVE DIET PLAN -> Targeted to specific user
                if (!selectedClient) {
                    showToast('Please select a target patient from the roster first.');
                    setIsDeploying(false);
                    return;
                }

                finalDeployedPayload = {
                    ...basePlanPayload,
                    scope: 'EXCLUSIVE',
                    targetMode: 'EXCLUSIVE',
                    targetUserId: String(selectedClient.userId || selectedClient.id),
                    targetUserEmail: selectedClient.email,
                    targetUserName: selectedClient.name
                };

                // Store in exclusive plans map keyed by userId and email
                const storedExclusive = JSON.parse(localStorage.getItem('nutrimunch_exclusive_diet_plans') || '{}');
                storedExclusive[String(selectedClient.userId || selectedClient.id)] = finalDeployedPayload;
                if (selectedClient.email) {
                    storedExclusive[selectedClient.email.toLowerCase()] = finalDeployedPayload;
                }
                localStorage.setItem('nutrimunch_exclusive_diet_plans', JSON.stringify(storedExclusive));
                localStorage.setItem('nutrimunch_latest_deployed_plan', JSON.stringify(finalDeployedPayload));
                localStorage.setItem('nutrimunch_latest_deployed_plan_id', finalDeployedPayload.id);

                // Add / update in History Vault
                const filteredHistory = dietHistory.filter(h => 
                    String(h.id) !== String(planId) && 
                    (h.title || h.planTitle || '').trim().toLowerCase() !== cleanTitle
                );
                const updatedHistory = [finalDeployedPayload, ...filteredHistory];
                setDietHistory(updatedHistory);
                localStorage.setItem('nutrimunch_diet_plans_history', JSON.stringify(updatedHistory));
                window.dispatchEvent(new Event('nutrimunch_diet_history_updated'));

                // The server creates the single notification for the assigned client.
                window.dispatchEvent(new Event('nutrimunch_diet_plan_updated'));
                window.dispatchEvent(new Event('storage'));
                try {
                    const bc = new BroadcastChannel('nutrimunch_diet_plan_channel');
                    bc.postMessage({ type: 'DIET_PLAN_DEPLOYED', plan: finalDeployedPayload });
                    setTimeout(() => { try { bc.close(); } catch (err) {} }, 1000);
                } catch (err) {}

                // Sync to backend API database. A failed deploy must never look successful.
                try {
                    await api.post('/diet-plans/deploy', finalDeployedPayload);
                } catch (deployErr) {
                    console.error('Failed to deploy diet plan:', deployErr);
                    throw deployErr;
                }
                showToast(`"${planForm.planTitle}" deployed directly for ${selectedClient.name}! Saved to history.`);
            }
        } catch (e) {
            console.error('Failed deploying diet plan:', e);
            showToast('Error deploying diet protocol.');
        } finally {
            setIsDeploying(false);
        }
    };

    // Load a Historical Diet Plan into the Active Builder
    const handleLoadHistoryIntoBuilder = (plan) => {
        setPlanForm({
            planTitle: plan.title || plan.planTitle || 'Custom Protocol',
            calories: plan.calories || 2100,
            protein: plan.protein || 160,
            carbs: plan.carbs || 150,
            fats: plan.fats || 70,
            waterLiters: plan.waterLiters || 3.0,
            dietType: plan.dietType || 'High-Protein Metabolic',
            nutritionistNotes: plan.nutritionistNotes || ''
        });

        if (plan.meals && Array.isArray(plan.meals) && plan.meals.length > 0) {
            setMeals(plan.meals);
        }

        if (plan.scope === 'EXCLUSIVE' || plan.targetMode === 'EXCLUSIVE') {
            setTargetMode('EXCLUSIVE');
            if (plan.targetUserId && clientsList.length > 0) {
                const found = clientsList.find(c => String(c.userId || c.id) === String(plan.targetUserId));
                if (found) setSelectedClient(found);
            }
        } else {
            setTargetMode('GENERAL');
        }

        setEditingPlanId(plan.id);
        setActiveTab('STUDIO');
        showToast(`Loaded "${plan.title || plan.planTitle}" into active builder studio!`);
    };

    // Delete a Plan from History Vault (Permanently deletes from database, registries, and user dashboards)
    const handleDeleteHistoryPlan = async (planId) => {
        if (!planId) return;
        const targetPlan = dietHistory.find(p => p.id === planId);
        const planName = targetPlan?.title || targetPlan?.planTitle || 'Diet Protocol';

        const ok = await permanentlyDeleteDietPlan(targetPlan || planId, api);
        if (!ok) {
            showToast('Could not delete the plan. The server did not confirm the deletion — please try again.');
            return;
        }

        const filtered = dietHistory.filter(p => p.id !== planId);
        setDietHistory(filtered);

        showToast(`"${planName}" permanently deleted from database, registries, and all user dashboards.`);
        if (selectedHistoryPlan?.id === planId) {
            setIsHistoryDossierOpen(false);
            setSelectedHistoryPlan(null);
        }
    };

    return (
        <div className="w-full relative pb-12">
            {/* Live Notification Feedback Toast */}
            {notification && (
                <div className="fixed top-24 right-8 z-[9999] bg-[#a5d391] text-[#080b12] px-6 py-3.5 rounded-2xl font-bold text-sm shadow-2xl flex items-center gap-2 animate-bounce">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    <span>{notification}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-emerald-700 dark:text-[#a5d391] text-2xl">restaurant_menu</span>
                        <h1 className="text-3xl font-bold font-hero-display tracking-tight text-slate-900 dark:text-white">Diet Builder</h1>
                    </div>
                    <p className="text-slate-600 dark:text-white/60 text-xs sm:text-sm">
                        Architect and deploy general public nutrition protocols or target individual patients with bespoke macro formulations and clinical notes.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {selectedClient && targetMode === 'EXCLUSIVE' && (
                        <button
                            type="button"
                            onClick={() => handleOpenChat(selectedClient)}
                            className="bg-slate-100 dark:bg-[#0d131f] border border-slate-300 dark:border-[#a5d391]/40 hover:border-emerald-600 dark:hover:border-[#a5d391] text-emerald-800 dark:text-[#a5d391] hover:text-emerald-950 dark:hover:text-white px-4 py-3 rounded-2xl font-bold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-base">forum</span>
                            <span>Consultation Chat</span>
                        </button>
                    )}

                    <button 
                        onClick={handleDeployPlan}
                        disabled={isDeploying}
                        className="bg-emerald-700 text-white dark:bg-[#a5d391] dark:text-black font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-2xl hover:bg-emerald-800 dark:hover:bg-white transition-all shadow-md dark:shadow-[0_0_20px_rgba(165,211,145,0.35)] cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-sm">rocket_launch</span>
                        <span>{targetMode === 'GENERAL' ? 'Deploy General Plan (All Users)' : 'Deploy Exclusive Diet Plan'}</span>
                    </button>
                </div>
            </div>

            {/* Top Level Studio / History Tab Switcher */}
            <div className="flex items-center gap-2 mb-8 border-b border-slate-200 dark:border-white/10 pb-4">
                <button
                    type="button"
                    onClick={() => setActiveTab('STUDIO')}
                    className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                        activeTab === 'STUDIO'
                            ? 'bg-emerald-700 text-white dark:bg-[#a5d391] dark:text-black shadow-md dark:shadow-[0_0_25px_rgba(165,211,145,0.4)]'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/60 dark:hover:text-white dark:border-white/10'
                    }`}
                >
                    <span className="material-symbols-outlined text-sm">tune</span>
                    <span>Diet Builder Studio</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('HISTORY')}
                    className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                        activeTab === 'HISTORY'
                            ? 'bg-emerald-700 text-white dark:bg-[#a5d391] dark:text-black shadow-md dark:shadow-[0_0_25px_rgba(165,211,145,0.4)]'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/60 dark:hover:text-white dark:border-white/10'
                    }`}
                >
                    <span className="material-symbols-outlined text-sm">history_edu</span>
                    <span>Diet Plans History Vault</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        activeTab === 'HISTORY' ? 'bg-emerald-900 text-white dark:bg-black dark:text-[#a5d391]' : 'bg-emerald-100 text-emerald-800 dark:bg-[#a5d391]/20 dark:text-[#a5d391]'
                    }`}>
                        {dietHistory.length}
                    </span>
                </button>
            </div>

            {/* TAB 1: ACTIVE DIET BUILDER STUDIO */}
            {activeTab === 'STUDIO' && (
                <div className="space-y-8 animate-fadeIn">
                    {/* DIET PLAN NAME & DISTINCT IDENTIFIER CARD */}
                    <div className="bg-emerald-50/50 dark:bg-gradient-to-r dark:from-emerald-950/40 dark:via-[#0d131f] dark:to-[#080b12] border border-emerald-300 dark:border-[#a5d391]/50 rounded-[2.5rem] p-6 lg:p-8 shadow-md dark:shadow-xl relative overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <div>
                                <span className="text-[10px] font-black text-emerald-700 dark:text-[#a5d391] uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm text-emerald-700 dark:text-[#a5d391]">badge</span>
                                    <span>Diet Plan Identity & Unique Name</span>
                                </span>
                                <h2 className="text-xl font-bold font-hero-display text-slate-900 dark:text-white mt-1">
                                    Distinguish & Name Your Diet Plan
                                </h2>
                                <p className="text-xs text-slate-600 dark:text-white/50">
                                    Every formulated diet plan must have a distinctive title to distinguish it from other clinical protocols in your history and on the user dashboard.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-white/60">
                                    ID: #{planForm.planTitle.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'PLAN'}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl border ${
                                    targetMode === 'GENERAL'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-[#a5d391]/20 dark:text-[#a5d391] dark:border-[#a5d391]/40'
                                        : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                                }`}>
                                    {targetMode === 'GENERAL' ? 'General Scope' : `Exclusive: ${selectedClient?.name || 'Selected User'}`}
                                </span>
                            </div>
                        </div>

                        {/* Plan Title Input */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-1.5">
                                        Diet Plan Name *
                                    </label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white/40 text-lg">edit</span>
                                        <input
                                            type="text"
                                            value={planForm.planTitle}
                                            onChange={(e) => setPlanForm({ ...planForm, planTitle: e.target.value })}
                                            placeholder="e.g. Ketogenic Metabolic Protocol #1..."
                                            className="w-full bg-white dark:bg-[#080b12] border border-slate-300 dark:border-white/20 focus:border-emerald-600 dark:focus:border-[#a5d391] rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none transition-all shadow-inner"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-1.5">
                                        Diet Category
                                    </label>
                                    <select
                                        value={planForm.dietType}
                                        onChange={(e) => setPlanForm({ ...planForm, dietType: e.target.value })}
                                        className="w-full bg-white dark:bg-[#080b12] border border-slate-300 dark:border-white/20 focus:border-emerald-600 dark:focus:border-[#a5d391] rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white outline-none transition-all cursor-pointer"
                                    >
                                        <option value="High-Protein Metabolic">High-Protein Metabolic</option>
                                        <option value="Keto Glycemic Reset">Keto Glycemic Reset</option>
                                        <option value="Mediterranean Longevity">Mediterranean Longevity</option>
                                        <option value="PCOS Hormonal Balance">PCOS Hormonal Balance</option>
                                        <option value="Cardiovascular Sodium Reduced">Cardiovascular Sodium Reduced</option>
                                        <option value="Vegetarian Precision Nutrients">Vegetarian Precision Nutrients</option>
                                        <option value="Endurance Glycogen Re-load">Endurance Glycogen Re-load</option>
                                    </select>
                                </div>
                            </div>

                            {/* Quick Preset Title Chips */}
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/50 block mb-1.5">Quick Distinguishing Presets:</span>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        "Clinical Metabolic Optimization Protocol",
                                        "Ketogenic Glycemic Reset Protocol",
                                        "High-Protein Hypertrophy Blueprint",
                                        "PCOS Hormonal & Insulin Stabilization",
                                        "Cardiovascular DASH Sodium-Control Diet",
                                        "Mediterranean Longevity Protocol",
                                        "Anti-Inflammatory Gut Recovery"
                                    ].map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setPlanForm(prev => ({ ...prev, planTitle: preset }))}
                                            className={`text-[11px] px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                                                planForm.planTitle === preset
                                                    ? 'bg-emerald-700 text-white font-extrabold border-emerald-700 dark:bg-[#a5d391] dark:text-black dark:border-[#a5d391]'
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/15 dark:text-white/70 dark:border-white/10 dark:hover:text-white'
                                            }`}
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Target Scope Switcher */}
                    <div className="bg-white/95 dark:bg-black border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl relative overflow-hidden transition-colors">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div>
                                <span className="text-[10px] font-black text-emerald-700 dark:text-[#a5d391] uppercase tracking-[0.2em] block mb-1">Protocol Distribution Scope</span>
                                <h2 className="text-xl font-bold font-hero-display text-slate-900 dark:text-white">Select Target Architecture</h2>
                            </div>

                            {/* Mode Toggle Buttons */}
                            <div className="bg-slate-100 dark:bg-[#0a0a0a] p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-1">
                                <button 
                                    type="button"
                                    onClick={() => setTargetMode('GENERAL')}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                        targetMode === 'GENERAL' 
                                            ? 'bg-emerald-600 text-white dark:bg-[#a5d391] dark:text-black shadow-md shadow-emerald-600/20 dark:shadow-[#a5d391]/20' 
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/5'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">public</span>
                                    <span>General Diet Plan (All Users)</span>
                                </button>

                                <button 
                                    type="button"
                                    onClick={() => setTargetMode('EXCLUSIVE')}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                        targetMode === 'EXCLUSIVE' 
                                            ? 'bg-emerald-600 text-white dark:bg-[#a5d391] dark:text-black shadow-md shadow-emerald-600/20 dark:shadow-[#a5d391]/20' 
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/5'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">person_pin</span>
                                    <span>Exclusive Diet Plan (Patient Roster)</span>
                                </button>
                            </div>
                        </div>

                        {targetMode === 'GENERAL' ? (
                            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-[#a5d391]/10 border border-emerald-200 dark:border-[#a5d391]/20 flex items-center gap-3 text-xs text-slate-700 dark:text-white/80">
                                <span className="material-symbols-outlined text-xl text-emerald-700 dark:text-[#a5d391]">broadcast_on_home</span>
                                <div>
                                    <span className="font-bold text-slate-900 dark:text-white">Public General Protocol: </span>
                                    This general diet plan will be published across the entire platform and displayed to all registered users. Any user can review and directly link its daily requirements to their profile.
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200">
                                    <span className="material-symbols-outlined text-xl text-amber-600 dark:text-amber-400">shield_person</span>
                                    <div>
                                        <span className="font-bold text-slate-900 dark:text-white">Targeted Clinical Assignment: </span>
                                        Select a patient below. Click "Patient Dossier" to inspect their complete health profile, allergy records, and dietary preferences.
                                    </div>
                                </div>

                        {/* Patient selection for the diet plan */}
                        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-5 lg:p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                                <div>
                                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-emerald-700 dark:text-[#a5d391]">group</span>
                                        Choose a client
                                    </h3>
                                    <p className="text-slate-600 dark:text-white/40 text-xs">Select patient to view synced profile dossier or formulate exclusive plan</p>
                                </div>

                                {/* Search clients */}
                                <div className="relative w-full sm:w-64">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 text-sm">search</span>
                                    <input 
                                        type="text" 
                                        placeholder="Search clients by name or ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-white dark:bg-black/60 border border-slate-300 dark:border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-emerald-600 dark:focus:border-[#a5d391] shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Client selection cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                                {loadingClients ? (
                                    <div className="col-span-full py-8 flex flex-col items-center justify-center gap-3">
                                        <div className="relative h-12 w-12">
                                            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 dark:border-[#a5d391]/20" />
                                            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-600 dark:border-t-[#a5d391] animate-spin" />
                                            <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-emerald-700 dark:text-[#a5d391] text-lg">groups</span>
                                        </div>
                                        <p className="text-slate-600 dark:text-white/55 text-xs animate-pulse">Loading live patient profiles…</p>
                                    </div>
                                ) : rosterError ? (
                                    <div className="col-span-full py-8 text-center">
                                        <p className="text-rose-600 dark:text-rose-300 text-xs mb-3">{rosterError}</p>
                                        <button type="button" onClick={fetchRealUsers} className="rounded-lg bg-slate-200 dark:bg-white/10 px-4 py-2 text-xs text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-white/15">Retry</button>
                                    </div>
                                ) : filteredClients.length === 0 ? (
                                    <div className="col-span-full py-8 text-center text-slate-500 dark:text-white/40 text-xs">
                                        {clientsList.length === 0
                                            ? 'No patients with an accepted consultation are available.'
                                            : 'No patients match your search.'}
                                    </div>
                                ) : (
                                    filteredClients.map(client => {
                                        const isSelected = selectedClient && String(selectedClient.id) === String(client.id);
                                        return (
                                            <div 
                                                key={client.id}
                                                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                                                    isSelected 
                                                        ? 'bg-emerald-50 dark:bg-[#a5d391]/15 border-emerald-500 dark:border-[#a5d391] shadow-md dark:shadow-lg dark:shadow-[#a5d391]/10' 
                                                        : 'bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/30 shadow-sm'
                                                }`}
                                            >
                                                <div onClick={() => handleSelectPatient(client)} className="cursor-pointer">
                                                    <div className="flex justify-between items-start gap-1 mb-1.5">
                                                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{client.name}</div>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                            isSelected ? 'bg-emerald-600 text-white dark:bg-[#a5d391] dark:text-black font-black' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/60'
                                                        }`}>
                                                            {isSelected ? 'Target User' : `#${client.id}`}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-600 dark:text-white/50 truncate mb-1.5">{client.email}</div>
                                                    <div className="text-[10px] text-emerald-800 dark:text-[#a5d391] font-semibold truncate bg-emerald-50 dark:bg-white/5 px-2 py-1 rounded-lg mb-2">
                                                        Goal: {client.goal}
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-white/50 border-t border-slate-200 dark:border-white/5 pt-2">
                                                        <span>Weight: <strong className="text-slate-900 dark:text-white">{client.weight}</strong></span>
                                                        <span>Cal: <strong className="text-slate-900 dark:text-white">{client.calories}</strong></span>
                                                    </div>
                                                </div>

                                                {/* Patient Actions */}
                                                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDossierPatient(client);
                                                            setIsDossierOpen(true);
                                                        }}
                                                        className="flex-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white/80 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-xl py-1 px-2 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                        title="View full patient profile and preferences"
                                                    >
                                                        <span className="material-symbols-outlined text-xs text-emerald-700 dark:text-[#a5d391]">account_circle</span>
                                                        <span>Dossier</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenChat(client);
                                                        }}
                                                        className="flex-1 bg-emerald-100 hover:bg-emerald-600 text-emerald-800 hover:text-white dark:bg-[#a5d391]/15 dark:hover:bg-[#a5d391] dark:text-[#a5d391] dark:hover:text-black border border-emerald-300 dark:border-[#a5d391]/30 rounded-xl py-1 px-2 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                        title="Open chat for this accepted consultation"
                                                    >
                                                        <span className="material-symbols-outlined text-xs">forum</span>
                                                        <span>Chat</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Active Target User Card */}
                            {selectedClient && (
                                <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-black/60 border border-emerald-300 dark:border-[#a5d391]/40 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-[#a5d391]/20 border border-emerald-300 dark:border-[#a5d391]/40 text-emerald-700 dark:text-[#a5d391] flex items-center justify-center font-bold">
                                            {selectedClient.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                <span>Active Target Patient: {selectedClient.name}</span>
                                                <span className="text-[10px] text-emerald-800 dark:text-[#a5d391] font-mono bg-emerald-50 dark:bg-[#a5d391]/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-[#a5d391]/20">ID #{selectedClient.id}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-600 dark:text-white/50">
                                                {selectedClient.email} • {selectedClient.heightFtIn} • {selectedClient.weight} • BMI: {selectedClient.bmi}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDossierPatient(selectedClient);
                                                setIsDossierOpen(true);
                                            }}
                                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-transparent"
                                        >
                                            <span className="material-symbols-outlined text-sm text-emerald-700 dark:text-[#a5d391]">visibility</span>
                                            <span>View Patient Dossier</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleApplyPatientTargets(selectedClient)}
                                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#a5d391]/20 dark:hover:bg-[#a5d391] dark:text-[#a5d391] dark:hover:text-black border border-emerald-600 dark:border-[#a5d391]/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-sm">sync_alt</span>
                                            <span>Import Profile Targets</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Protocol Parameters & Macro Builder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left 2 Columns: Macro Targets & Meals Formulation */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Macro Target Controls - 5 to 7 parameters on which daily requirement is judged */}
                    <div className="bg-white/95 dark:bg-black border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl space-y-6 transition-colors">
                        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
                            <div>
                                <h3 className="text-lg font-bold font-hero-display text-slate-900 dark:text-white">Daily Nutrition Targets (5)</h3>
                                <p className="text-slate-600 dark:text-white/50 text-xs">Primary clinical parameters linked directly to user profile daily requirements</p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#a5d391]/20 dark:text-[#a5d391] dark:border-[#a5d391]/30">
                                {targetMode === 'GENERAL' ? 'All Users Protocol' : `Patient: ${selectedClient?.name || 'Selected'}`}
                            </span>
                        </div>

                        {/* Top 4 Core Macronutrients */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-600 dark:text-white/50 uppercase tracking-wider block mb-1">1. Calories (kcal)</span>
                                <input 
                                    type="number"
                                    value={planForm.calories}
                                    onChange={(e) => setPlanForm({ ...planForm, calories: e.target.value })}
                                    className="w-full bg-transparent font-bold text-2xl text-slate-900 dark:text-white outline-none focus:text-emerald-600 dark:focus:text-[#a5d391]"
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-[#080b12]/80 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-600 dark:text-white/50 uppercase tracking-wider block mb-1">2. Protein (g)</span>
                                <input 
                                    type="number"
                                    value={planForm.protein}
                                    onChange={(e) => setPlanForm({ ...planForm, protein: e.target.value })}
                                    className="w-full bg-transparent font-bold text-2xl text-emerald-700 dark:text-[#a5d391] outline-none focus:text-slate-900 dark:focus:text-white"
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-[#080b12]/80 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-600 dark:text-white/50 uppercase tracking-wider block mb-1">3. Carbs (g)</span>
                                <input 
                                    type="number"
                                    value={planForm.carbs}
                                    onChange={(e) => setPlanForm({ ...planForm, carbs: e.target.value })}
                                    className="w-full bg-transparent font-bold text-2xl text-sky-700 dark:text-cyan-400 outline-none focus:text-slate-900 dark:focus:text-white"
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-[#080b12]/80 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-600 dark:text-white/50 uppercase tracking-wider block mb-1">4. Fats (g)</span>
                                <input 
                                    type="number"
                                    value={planForm.fats}
                                    onChange={(e) => setPlanForm({ ...planForm, fats: e.target.value })}
                                    className="w-full bg-transparent font-bold text-2xl text-amber-700 dark:text-amber-400 outline-none focus:text-slate-900 dark:focus:text-white"
                                />
                            </div>
                        </div>

                        {/* Water target */}
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-200 dark:border-white/5">
                            <div className="bg-slate-50 dark:bg-[#080b12]/60 border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-sm">
                                <span className="text-[9px] font-bold text-slate-600 dark:text-white/40 uppercase block mb-1">5. Water (L)</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={planForm.waterLiters}
                                    onChange={(e) => setPlanForm({ ...planForm, waterLiters: e.target.value })}
                                    className="w-full bg-transparent font-bold text-lg text-sky-700 dark:text-cyan-300 outline-none"
                                />
                            </div>

                        </div>

                        {/* Title & Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-700 dark:text-white/50 uppercase tracking-widest mb-1.5">Diet Plan Title</label>
                                <input 
                                    type="text"
                                    value={planForm.planTitle}
                                    onChange={(e) => setPlanForm({ ...planForm, planTitle: e.target.value })}
                                    className="w-full bg-white dark:bg-black/60 border border-slate-300 dark:border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 dark:focus:border-[#a5d391] shadow-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-700 dark:text-white/50 uppercase tracking-widest mb-1.5">Diet Protocol Category</label>
                                <select 
                                    value={planForm.dietType}
                                    onChange={(e) => setPlanForm({ ...planForm, dietType: e.target.value })}
                                    className="w-full bg-white dark:bg-black/60 border border-slate-300 dark:border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 dark:focus:border-[#a5d391] shadow-sm"
                                >
                                    <option value="High-Protein Metabolic">High-Protein Metabolic</option>
                                    <option value="Keto Glycemic Reset">Keto Glycemic Reset</option>
                                    <option value="Mediterranean Longevity">Mediterranean Longevity</option>
                                    <option value="PCOS Hormonal Balance">PCOS Hormonal Balance</option>
                                    <option value="Cardiovascular Sodium Reduced">Cardiovascular Sodium Reduced</option>
                                    <option value="Vegetarian Precision Nutrients">Vegetarian Precision Nutrients</option>
                                </select>
                            </div>
                        </div>

                        {/* NUTRITIONIST COMMENTS & CLINICAL GUIDANCE SECTION */}
                        <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-2">
                            <label className="text-xs font-bold text-emerald-800 dark:text-[#a5d391] uppercase tracking-widest flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-base">comment</span>
                                <span>Nutritionist Clinical Notes & Formulation Comments</span>
                            </label>
                            <p className="text-[11px] text-slate-600 dark:text-white/50">Add professional commentary, meal timing guidelines, hydration advice, or clinical warnings to accompany this diet plan.</p>
                            
                            <textarea
                                value={planForm.nutritionistNotes}
                                onChange={(e) => setPlanForm({ ...planForm, nutritionistNotes: e.target.value })}
                                rows={3}
                                placeholder="Enter clinical comments or meal timing advice for this protocol..."
                                className="w-full bg-white dark:bg-black/60 border border-slate-300 dark:border-white/15 rounded-2xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-emerald-600 dark:focus:border-[#a5d391] transition-all leading-relaxed shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Meal Routine Formulator */}
                    <div className="bg-white/95 dark:bg-black border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl space-y-6 transition-colors">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-4">
                            <div>
                                <h3 className="text-lg font-bold font-hero-display text-slate-900 dark:text-white">Daily Meal Schedule & Formulation</h3>
                                <p className="text-slate-600 dark:text-white/50 text-xs">Custom recipes and macro allotments delivered to user dashboard</p>
                            </div>
                            <button 
                                onClick={handleAddMeal}
                                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1 transition-all cursor-pointer border border-slate-200 dark:border-transparent"
                            >
                                <span className="material-symbols-outlined text-sm text-emerald-700 dark:text-[#a5d391]">add</span>
                                <span>Add Meal Slot</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {meals.map((meal, index) => (
                                <div key={meal.id} className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3 shadow-sm">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-[#a5d391]/15 text-emerald-800 dark:text-[#a5d391] font-bold text-xs flex items-center justify-center border border-emerald-300 dark:border-[#a5d391]/30">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <input 
                                                    type="text" 
                                                    value={meal.name}
                                                    onChange={(e) => handleUpdateMeal(meal.id, 'name', e.target.value)}
                                                    className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-white/20 focus:border-emerald-600 dark:focus:border-[#a5d391] outline-none"
                                                />
                                                <div className="text-[10px] text-slate-500 dark:text-white/40 flex items-center gap-2">
                                                    <span>{meal.mealType}</span>
                                                    <span>•</span>
                                                    <input 
                                                        type="text" 
                                                        value={meal.time}
                                                        onChange={(e) => handleUpdateMeal(meal.id, 'time', e.target.value)}
                                                        className="w-16 bg-transparent text-slate-600 dark:text-white/50 outline-none hover:text-slate-900 dark:hover:text-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleRemoveMeal(meal.id)}
                                            className="text-slate-400 hover:text-red-500 dark:text-white/30 dark:hover:text-red-400 p-1 cursor-pointer transition-colors"
                                            title="Delete Meal"
                                        >
                                            <span className="material-symbols-outlined text-base">delete</span>
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-600 dark:text-white/40 uppercase tracking-widest mb-1">Ingredients & Portions</label>
                                        <input 
                                            type="text" 
                                            value={meal.ingredients}
                                            onChange={(e) => handleUpdateMeal(meal.id, 'ingredients', e.target.value)}
                                            className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white/80 focus:outline-none focus:border-emerald-600 dark:focus:border-[#a5d391] shadow-sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                        {[
                                            { field: 'calories', label: 'Calories', unit: 'kcal', step: '1', color: 'text-slate-900 dark:text-white' },
                                            { field: 'protein', label: 'Protein', unit: 'g', step: '0.1', color: 'text-emerald-700 dark:text-[#a5d391]' },
                                            { field: 'carbs', label: 'Carbs', unit: 'g', step: '0.1', color: 'text-sky-700 dark:text-cyan-300' },
                                            { field: 'fats', label: 'Fats', unit: 'g', step: '0.1', color: 'text-amber-700 dark:text-amber-300' }
                                        ].map(({ field, label, unit, step, color }) => (
                                            <label
                                                key={field}
                                                className="bg-white dark:bg-black/40 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-center shadow-xs focus-within:border-emerald-600 dark:focus-within:border-[#a5d391] transition-colors"
                                            >
                                                <span className="text-[9px] text-slate-500 dark:text-white/50 block">{label}</span>
                                                <span className="flex items-center justify-center gap-1">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step={step}
                                                        value={meal[field] ?? ''}
                                                        onChange={(e) => handleUpdateMeal(
                                                            meal.id,
                                                            field,
                                                            e.target.value === '' ? '' : Number(e.target.value)
                                                        )}
                                                        aria-label={`${label} for ${meal.name}`}
                                                        className={`w-full min-w-0 bg-transparent text-center text-xs font-bold outline-none ${color}`}
                                                    />
                                                    <span className="shrink-0 text-[10px] text-slate-500 dark:text-white/50">{unit}</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Deployment Summary & Status Dossier */}
                <div className="space-y-6">
                    <div className="bg-white/95 dark:bg-black border border-slate-200 dark:border-white/15 rounded-[2.5rem] p-6 lg:p-8 shadow-xl dark:shadow-2xl space-y-4 transition-colors">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-black border border-emerald-300 dark:border-[#a5d391]/40 text-emerald-700 dark:text-[#a5d391] flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-2xl">published_with_changes</span>
                        </div>

                        <div>
                            <span className="text-[10px] font-black text-emerald-700 dark:text-[#a5d391] uppercase tracking-widest block mb-1">
                                {targetMode === 'GENERAL' ? 'Global Broadcast' : 'Direct Patient Deployment'}
                            </span>
                            <h4 className="text-xl font-bold font-hero-display text-slate-900 dark:text-white">{planForm.planTitle || 'Untitled Protocol'}</h4>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-600 dark:text-white/60">
                                <span>Target Recipient:</span>
                                <strong className="text-slate-900 dark:text-white font-semibold">
                                    {targetMode === 'GENERAL' ? 'All Registered Users' : (selectedClient?.name || 'Individual Patient')}
                                </strong>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-white/60">
                                <span>Total Energy:</span>
                                <strong className="text-emerald-700 dark:text-[#a5d391] font-bold">{planForm.calories || 0} kcal</strong>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-white/60">
                                <span>Macro Split:</span>
                                <strong className="text-slate-900 dark:text-white font-bold">{planForm.protein || 0}P / {planForm.carbs || 0}C / {planForm.fats || 0}F</strong>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-white/60">
                                <span>Hydration Target:</span>
                                <strong className="text-sky-700 dark:text-cyan-300 font-bold">{planForm.waterLiters || 3.0} L / day</strong>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-white/60">
                                <span>Meal Count:</span>
                                <strong className="text-slate-900 dark:text-white font-semibold">{meals.length} Scheduled Meals</strong>
                            </div>
                        </div>

                        {planForm.nutritionistNotes && (
                            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-[#0a0a0a] border border-emerald-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-white/70 italic">
                                <span className="text-[10px] font-bold text-emerald-800 dark:text-[#a5d391] uppercase tracking-wider block mb-1 not-italic">Attached Clinical Comments:</span>
                                "{planForm.nutritionistNotes}"
                            </div>
                        )}

                        <button 
                            onClick={handleDeployPlan}
                            disabled={isDeploying}
                            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white dark:bg-[#a5d391] dark:text-black dark:hover:bg-white dark:active:bg-slate-200 font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-emerald-600/20 dark:shadow-[0_0_25px_rgba(165,211,145,0.4)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-sm">send</span>
                            <span>{targetMode === 'GENERAL' ? 'Publish to All Users' : 'Deploy to Patient Profile'}</span>
                        </button>
                    </div>

                    {/* Quick Guidance Box */}
                    <div className="bg-white/90 dark:bg-black border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 text-xs text-slate-600 dark:text-white/60 space-y-2 shadow-sm">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-emerald-700 dark:text-[#a5d391]">help</span>
                            <span>Diet Protocol Rules:</span>
                        </div>
                        <ul className="space-y-1.5 list-disc list-inside">
                            <li><strong className="text-slate-800 dark:text-white">General Plans:</strong> Available to all platform users. Users can directly link targets into their Daily Requirements with 1-click.</li>
                            <li><strong className="text-slate-800 dark:text-white">Exclusive Plans:</strong> Customized for an individual patient. Visible on their Diet Plans page with high priority.</li>
                            <li><strong className="text-slate-800 dark:text-white">Consultation Chat:</strong> Live two-way communication channel initiated solely by the nutritionist.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        )}

            {/* TAB 2: FORMULATED DIET PLANS HISTORY VAULT */}
            {activeTab === 'HISTORY' && (
                <div className="space-y-6 animate-fadeIn">
                    {/* Vault Header & Filter Controls */}
                    <div className="bg-white/95 dark:bg-black border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl transition-colors">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                                <span className="text-[10px] font-black text-emerald-700 dark:text-[#a5d391] uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm text-emerald-700 dark:text-[#a5d391]">history_edu</span>
                                    <span>Formulation Vault</span>
                                </span>
                                <h2 className="text-2xl font-bold font-hero-display text-slate-900 dark:text-white mt-1">
                                    Formulated Diet Plans History
                                </h2>
                                <p className="text-xs text-slate-600 dark:text-white/50 mt-0.5">
                                    Chronological archive of all general public protocols and bespoke patient-targeted diet plans created by your practice.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setEditingPlanId(null);
                                    setActiveTab('STUDIO');
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white dark:bg-[#a5d391] dark:text-black dark:hover:bg-white font-extrabold text-xs uppercase tracking-wider px-5 py-3 rounded-2xl transition-all shadow-md shadow-emerald-600/20 dark:shadow-[0_0_20px_rgba(165,211,145,0.35)] cursor-pointer flex items-center gap-2 shrink-0"
                            >
                                <span className="material-symbols-outlined text-sm">add_circle</span>
                                <span>Create New Diet Plan</span>
                            </button>
                        </div>

                        {/* Search & Filters */}
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                            {/* Filter Chips */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                                {[
                                    { key: 'ALL', label: 'All Formulated Plans', count: dietHistory.length },
                                    { key: 'GENERAL', label: 'General Protocols', count: dietHistory.filter(p => p.scope === 'GENERAL' || p.targetMode === 'GENERAL').length },
                                    { key: 'EXCLUSIVE', label: 'Exclusive Patient Plans', count: dietHistory.filter(p => p.scope === 'EXCLUSIVE' || p.targetMode === 'EXCLUSIVE').length }
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setHistoryFilter(tab.key)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                            historyFilter === tab.key
                                                ? 'bg-emerald-600 text-white dark:bg-[#a5d391] dark:text-black shadow-md shadow-emerald-600/20 dark:shadow-md'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/60 dark:hover:text-white border border-slate-200 dark:border-white/10'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                            historyFilter === tab.key ? 'bg-emerald-800 text-emerald-100 dark:bg-black dark:text-[#a5d391]' : 'bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-white/70'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Search Input */}
                            <div className="relative min-w-[260px]">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 text-base">search</span>
                                <input
                                    type="text"
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    placeholder="Search by plan name, patient, or notes..."
                                    className="w-full bg-slate-50 dark:bg-[#080b12] border border-slate-300 dark:border-white/15 focus:border-emerald-500 dark:focus:border-[#a5d391] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none transition-all shadow-sm"
                                />
                                {historySearch && (
                                    <button
                                        type="button"
                                        onClick={() => setHistorySearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white text-xs cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* History Cards Grid */}
                    {(() => {
                        const filtered = dietHistory.filter(plan => {
                            const isGen = plan.scope === 'GENERAL' || plan.targetMode === 'GENERAL';
                            const isExcl = plan.scope === 'EXCLUSIVE' || plan.targetMode === 'EXCLUSIVE';
                            const matchFilter = historyFilter === 'ALL' ||
                                (historyFilter === 'GENERAL' && isGen) ||
                                (historyFilter === 'EXCLUSIVE' && isExcl);
                            const q = historySearch.toLowerCase().trim();
                            const matchSearch = !q ||
                                (plan.title || plan.planTitle || '').toLowerCase().includes(q) ||
                                (plan.dietType || '').toLowerCase().includes(q) ||
                                (plan.targetUserName || '').toLowerCase().includes(q) ||
                                (plan.nutritionistNotes || '').toLowerCase().includes(q);
                            return matchFilter && matchSearch;
                        });

                        if (filtered.length === 0) {
                            return (
                                <div className="bg-white/90 dark:bg-black border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-12 text-center space-y-4 shadow-sm">
                                    <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-emerald-700 dark:text-[#a5d391] mx-auto">
                                        <span className="material-symbols-outlined text-3xl">restaurant</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white font-hero-display">No Diet Plans Matching Search</h4>
                                    <p className="text-xs text-slate-600 dark:text-white/50 max-w-md mx-auto">
                                        No historical formulations match your current filter. Clear your query or create a new plan in the Diet Builder Studio.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { setHistoryFilter('ALL'); setHistorySearch(''); }}
                                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold dark:text-white transition-all cursor-pointer border border-slate-200 dark:border-white/10"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filtered.map((plan) => {
                                    const isGeneral = plan.scope === 'GENERAL' || plan.targetMode === 'GENERAL';
                                    const planName = plan.title || plan.planTitle || 'Custom Protocol';
                                    const dateStr = plan.deployedAt ? new Date(plan.deployedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently Deployed';

                                    return (
                                        <div
                                            key={plan.id}
                                            className="bg-white/95 dark:bg-black border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-[#a5d391]/40 rounded-[2.5rem] p-6 lg:p-7 shadow-lg dark:shadow-2xl transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group"
                                        >
                                            {/* Glow Accent */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-[#a5d391]/5 group-hover:bg-emerald-500/10 dark:group-hover:bg-[#a5d391]/10 blur-[50px] rounded-full pointer-events-none transition-all"></div>

                                            <div className="space-y-4">
                                                {/* Header & Badges */}
                                                <div className="flex justify-between items-start gap-3">
                                                    <div className="space-y-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                                                isGeneral
                                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-[#a5d391]/15 dark:text-[#a5d391] dark:border-[#a5d391]/30'
                                                                    : 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                                                            }`}>
                                                                {isGeneral ? 'General • All Users' : `Exclusive: ${plan.targetUserName || 'Patient'}`}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-slate-500 dark:text-white/40">
                                                                {dateStr}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-xl font-bold font-hero-display text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-[#a5d391] transition-colors truncate">
                                                            {planName}
                                                        </h3>
                                                        <span className="text-xs text-slate-600 dark:text-white/50 block">
                                                            Category: <strong className="text-slate-800 dark:text-white/80">{plan.dietType || 'High-Protein Metabolic'}</strong>
                                                        </span>
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-white/60 pt-0.5">
                                                            <span className="material-symbols-outlined text-[13px] text-emerald-700 dark:text-[#a5d391]">badge</span>
                                                            <span>Formulator: <strong className="text-slate-900 dark:text-white font-medium">{plan.nutritionistName || 'Nutritionist'}</strong></span>
                                                            {plan.nutritionistEmail && (
                                                                <span className="text-emerald-700 dark:text-[#a5d391] font-mono text-[11px] truncate max-w-[200px]" title={plan.nutritionistEmail}>
                                                                    ({plan.nutritionistEmail})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <span className="text-xs text-slate-500 dark:text-white/30 font-mono bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 shrink-0">
                                                        #{plan.id.slice(-6)}
                                                    </span>
                                                </div>

                                                {/* 5-7 Key Nutritional Targets Grid */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-white/5">
                                                    <div className="p-2.5 bg-slate-50 dark:bg-black/50 rounded-xl border border-slate-200 dark:border-white/5">
                                                        <span className="text-[9px] font-bold text-slate-500 dark:text-white/40 uppercase block">Energy</span>
                                                        <strong className="text-xs text-slate-900 dark:text-white">{plan.calories} kcal</strong>
                                                    </div>
                                                    <div className="p-2.5 bg-slate-50 dark:bg-black/50 rounded-xl border border-slate-200 dark:border-white/5">
                                                        <span className="text-[9px] font-bold text-slate-500 dark:text-white/40 uppercase block">Protein</span>
                                                        <strong className="text-xs text-emerald-700 dark:text-[#a5d391]">{plan.protein}g</strong>
                                                    </div>
                                                    <div className="p-2.5 bg-slate-50 dark:bg-black/50 rounded-xl border border-slate-200 dark:border-white/5">
                                                        <span className="text-[9px] font-bold text-slate-500 dark:text-white/40 uppercase block">Carbs</span>
                                                        <strong className="text-xs text-sky-700 dark:text-cyan-300">{plan.carbs}g</strong>
                                                    </div>
                                                    <div className="p-2.5 bg-slate-50 dark:bg-black/50 rounded-xl border border-slate-200 dark:border-white/5">
                                                        <span className="text-[9px] font-bold text-slate-500 dark:text-white/40 uppercase block">Fats</span>
                                                        <strong className="text-xs text-amber-700 dark:text-amber-300">{plan.fats}g</strong>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-white/60 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5">
                                                    <span>Hydration: <strong className="text-sky-700 dark:text-cyan-300">{plan.waterLiters || 3.0}L</strong></span>
                                                    <span>Meals: <strong className="text-slate-900 dark:text-white">{plan.meals?.length || 0} slots</strong></span>
                                                </div>

                                                {/* Nutritionist Comments Snippet */}
                                                {plan.nutritionistNotes && (
                                                    <p className="text-xs text-slate-700 dark:text-white/60 italic bg-emerald-50/60 dark:bg-black/40 p-3 rounded-xl border border-emerald-200/60 dark:border-white/5 line-clamp-2">
                                                        "{plan.nutritionistNotes}"
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleLoadHistoryIntoBuilder(plan)}
                                                        className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white dark:bg-[#a5d391] dark:hover:bg-white dark:text-black font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                                                        title="Load this plan into Builder Studio to edit or redeploy"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">tune</span>
                                                        <span>Load in Builder</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedHistoryPlan(plan);
                                                            setIsHistoryDossierOpen(true);
                                                        }}
                                                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/5 dark:hover:bg-white/15 dark:text-white border border-slate-200 dark:border-white/10 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                                                    >
                                                        <span className="material-symbols-outlined text-sm text-emerald-700 dark:text-[#a5d391]">visibility</span>
                                                        <span>View Details</span>
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteHistoryPlan(plan.id)}
                                                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-red-500/20 text-slate-500 hover:text-red-600 dark:bg-white/5 dark:hover:bg-red-500/20 dark:text-white/40 dark:hover:text-red-400 border border-slate-200 hover:border-red-500/30 dark:border-white/5 dark:hover:border-red-500/30 flex items-center justify-center transition-all cursor-pointer"
                                                    title="Remove from history vault"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* FULL HISTORICAL PLAN DETAILS DOSSIER MODAL */}
            {isHistoryDossierOpen && selectedHistoryPlan && (
                <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-start pt-24 sm:pt-28 pb-8 px-3 sm:px-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    <div className="bg-white dark:bg-black border border-slate-200 dark:border-[#a5d391]/40 rounded-[2.5rem] max-w-2xl w-full h-[78vh] max-h-[calc(100vh-8.5rem)] flex flex-col shadow-2xl dark:shadow-[0_0_80px_rgba(165,211,145,0.25)] overflow-hidden shrink-0 my-auto sm:my-0">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-between shrink-0">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white font-hero-display">
                                        {selectedHistoryPlan.title || selectedHistoryPlan.planTitle}
                                    </h3>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-[#a5d391] bg-emerald-100 dark:bg-[#a5d391]/15 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-[#a5d391]/30">
                                        {selectedHistoryPlan.scope || selectedHistoryPlan.targetMode}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-white/50">
                                    Formulated by <strong className="text-slate-900 dark:text-white">{selectedHistoryPlan.nutritionistName || 'Nutritionist'}</strong>
                                    {selectedHistoryPlan.nutritionistEmail && (
                                        <span className="text-emerald-700 dark:text-[#a5d391] font-mono ml-1">({selectedHistoryPlan.nutritionistEmail})</span>
                                    )} • {selectedHistoryPlan.dietType}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsHistoryDossierOpen(false)}
                                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
                            {/* Targets Breakdown */}
                            <div>
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-[#a5d391] uppercase tracking-widest block mb-2">Prescribed Daily Requirements</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block">Calories</span>
                                        <strong className="text-base text-slate-900 dark:text-white">{selectedHistoryPlan.calories} kcal</strong>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block">Protein</span>
                                        <strong className="text-base text-emerald-700 dark:text-[#a5d391]">{selectedHistoryPlan.protein} g</strong>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block">Carbs</span>
                                        <strong className="text-base text-sky-700 dark:text-cyan-300">{selectedHistoryPlan.carbs} g</strong>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block">Fats</span>
                                        <strong className="text-base text-amber-700 dark:text-amber-300">{selectedHistoryPlan.fats} g</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Water target */}
                            <div className="p-4 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-2xl">
                                <div><span className="text-[10px] text-slate-500 dark:text-white/40 block">Water</span><strong className="text-slate-900 dark:text-white">{selectedHistoryPlan.waterLiters || 3.0} L</strong></div>
                            </div>

                            {/* Clinical Notes */}
                            {selectedHistoryPlan.nutritionistNotes && (
                                <div className="p-4 bg-emerald-50/80 dark:bg-[#a5d391]/10 border border-emerald-200 dark:border-[#a5d391]/20 rounded-2xl">
                                    <span className="text-[10px] font-bold text-emerald-800 dark:text-[#a5d391] uppercase tracking-wider block mb-1">Nutritionist Clinical Directive Notes</span>
                                    <p className="text-slate-700 dark:text-white/80 leading-relaxed italic">"{selectedHistoryPlan.nutritionistNotes}"</p>
                                </div>
                            )}

                            {/* Scheduled Meals */}
                            <div>
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-[#a5d391] uppercase tracking-widest block mb-2">
                                    Formulated Meal Schedule ({selectedHistoryPlan.meals?.length || 0} Meals)
                                </span>
                                <div className="space-y-2.5">
                                    {selectedHistoryPlan.meals?.map((m) => (
                                        <div key={m.id} className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-emerald-800 dark:text-[#a5d391] bg-emerald-100 dark:bg-black/40 px-2 py-0.5 rounded-lg">{m.time}</span>
                                                    <strong className="text-sm text-slate-900 dark:text-white">{m.name}</strong>
                                                    <span className="text-[10px] text-slate-500 dark:text-white/40 uppercase">({m.mealType})</span>
                                                </div>
                                                <p className="text-slate-600 dark:text-white/50 text-[11px] mt-1">{m.ingredients}</p>
                                            </div>
                                            <div className="text-right text-[11px] text-slate-700 dark:text-white/70 sm:shrink-0 font-mono">
                                                <span>{m.calories} kcal • {m.protein}P • {m.carbs}C • {m.fats}F</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsHistoryDossierOpen(false);
                                    handleLoadHistoryIntoBuilder(selectedHistoryPlan);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white dark:bg-[#a5d391] dark:hover:bg-white dark:text-black font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-emerald-600/20"
                            >
                                <span className="material-symbols-outlined text-sm">tune</span>
                                <span>Load into Builder Studio</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FULL PATIENT PROFILE & PREFERENCES DOSSIER MODAL */}
            {isDossierOpen && dossierPatient && (
                <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-start pt-24 sm:pt-28 pb-8 px-3 sm:px-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    <div className="bg-white dark:bg-black border border-slate-200 dark:border-[#a5d391]/40 rounded-[2.5rem] max-w-2xl w-full h-[78vh] max-h-[calc(100vh-8.5rem)] flex flex-col shadow-2xl dark:shadow-[0_0_80px_rgba(165,211,145,0.25)] overflow-hidden shrink-0 my-auto sm:my-0">
                        
                        {/* Dossier Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#a5d391]/20 dark:border-[#a5d391]/40 dark:text-[#a5d391] flex items-center justify-center font-bold text-lg shadow-inner">
                                    {dossierPatient.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white font-hero-display">{dossierPatient.name}</h3>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-[#a5d391] bg-emerald-100 dark:bg-[#a5d391]/15 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-[#a5d391]/30">
                                            ID #{dossierPatient.id}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-white/50">{dossierPatient.email} • Synced Live Profile Dossier</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsDossierOpen(false)}
                                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* Dossier Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
                            
                            {/* 1. Anthropometrics & Vitals */}
                            <div>
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-[#a5d391] uppercase tracking-widest block mb-2">1. Anthropometrics & Biometrics</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block mb-0.5">Height</span>
                                        <strong className="text-sm text-slate-900 dark:text-white">{dossierPatient.heightFtIn} ({dossierPatient.heightCm} cm)</strong>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block mb-0.5">Weight</span>
                                        <strong className="text-sm text-slate-900 dark:text-white">{dossierPatient.weight} ({dossierPatient.weightLbs} lbs)</strong>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block mb-0.5">Target Weight</span>
                                        <strong className="text-sm text-emerald-700 dark:text-[#a5d391]">{dossierPatient.targetWeightKg} kg</strong>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block mb-0.5">BMI Score</span>
                                        <strong className="text-sm text-sky-700 dark:text-cyan-300">{dossierPatient.bmi}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Metabolic & Goal Baseline */}
                            <div>
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-[#a5d391] uppercase tracking-widest block mb-2">2. Metabolic Baseline & Activity</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block mb-0.5">Age & Gender</span>
                                        <strong className="text-sm text-slate-900 dark:text-white">{dossierPatient.age} yrs • {dossierPatient.gender}</strong>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block mb-0.5">Activity Level</span>
                                        <strong className="text-sm text-slate-900 dark:text-white">{dossierPatient.activityLevel}</strong>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block mb-0.5">Basal BMR</span>
                                        <strong className="text-sm text-slate-900 dark:text-white">{dossierPatient.bmr} kcal</strong>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block mb-0.5">Estimated TDEE</span>
                                        <strong className="text-sm text-emerald-700 dark:text-[#a5d391]">{dossierPatient.tdee} kcal</strong>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Primary Health Goal */}
                            <div className="p-4 bg-emerald-50 dark:bg-gradient-to-r dark:from-[#a5d391]/15 dark:to-transparent border border-emerald-200 dark:border-[#a5d391]/30 rounded-2xl">
                                <span className="text-[10px] font-bold text-emerald-800 dark:text-[#a5d391] uppercase tracking-widest block mb-1">Primary Health & Clinical Objective</span>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{dossierPatient.goal}</p>
                            </div>

                            {/* 4. Allergies & Dietary Restrictions */}
                            <div>
                                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-widest block mb-2">3. Allergies & Food Sensitivities</span>
                                <div className="p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-2xl flex items-center gap-3">
                                    <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-lg">warning</span>
                                    <div>
                                        <span className="font-bold text-slate-900 dark:text-white">Registered Allergens: </span>
                                        <span className="text-rose-800 dark:text-rose-200 font-medium">{dossierPatient.allergies}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Food & Cuisine Preferences */}
                            <div>
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-[#a5d391] uppercase tracking-widest block mb-2">4. Dietary Preferences & Cuisine Choices</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-1">
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block">Diet Type</span>
                                        <strong className="text-slate-900 dark:text-white block">{dossierPatient.dietType}</strong>
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block pt-1">Preferred Cuisines</span>
                                        <span className="text-slate-700 dark:text-white/80">{dossierPatient.cuisinePreferences}</span>
                                    </div>

                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-1">
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block">Favorite Foods</span>
                                        <span className="text-emerald-700 dark:text-[#a5d391] block font-semibold">{dossierPatient.favoriteFoods}</span>
                                        <span className="text-[10px] text-slate-500 dark:text-white/40 block pt-1">Disliked Foods</span>
                                        <span className="text-rose-700 dark:text-rose-300/80 block">{dossierPatient.dislikedFoods}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 6. Current Profile Daily Requirements Targets */}
                            <div>
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-[#a5d391] uppercase tracking-widest block mb-2">5. Current Profile Daily Requirement Targets</span>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    <div className="p-2.5 bg-slate-50 dark:bg-black/60 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                                        <span className="text-[9px] text-slate-500 dark:text-white/40 block">Calories</span>
                                        <strong className="text-slate-900 dark:text-white">{dossierPatient.caloriesNum} kcal</strong>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 dark:bg-black/60 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                                        <span className="text-[9px] text-slate-500 dark:text-white/40 block">Protein</span>
                                        <strong className="text-emerald-700 dark:text-[#a5d391]">{dossierPatient.proteinNum}g</strong>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 dark:bg-black/60 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                                        <span className="text-[9px] text-slate-500 dark:text-white/40 block">Carbs</span>
                                        <strong className="text-sky-700 dark:text-cyan-300">{dossierPatient.carbsNum}g</strong>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 dark:bg-black/60 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                                        <span className="text-[9px] text-slate-500 dark:text-white/40 block">Fats</span>
                                        <strong className="text-amber-700 dark:text-amber-300">{dossierPatient.fatsNum}g</strong>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 dark:bg-black/60 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                                        <span className="text-[9px] text-slate-500 dark:text-white/40 block">Water</span>
                                        <strong className="text-sky-700 dark:text-cyan-400">{dossierPatient.waterLiters}L</strong>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 dark:bg-black/60 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dossier Footer Actions */}
                        <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsDossierOpen(false);
                                    handleOpenChat(dossierPatient);
                                }}
                                className="px-4 py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all border border-slate-300 dark:border-white/10"
                            >
                                <span className="material-symbols-outlined text-sm text-emerald-700 dark:text-[#a5d391]">forum</span>
                                <span>Start Consultation Chat</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleApplyPatientTargets(dossierPatient)}
                                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#a5d391] dark:hover:bg-white dark:text-black font-bold text-xs uppercase tracking-widest shadow-md shadow-emerald-600/20 dark:shadow-[0_0_20px_rgba(165,211,145,0.35)] flex items-center gap-2 cursor-pointer transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">tune</span>
                                <span>Apply Patient Targets to Plan Formulation</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default DietPlanBuilder;
