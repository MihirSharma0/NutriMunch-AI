import React, { useState, useEffect, useContext } from 'react';
import api, { API_BASE_URL } from '../../../api/axios';
import { AuthContext } from '../../../context/AuthContext';
import ConsultationChatModal from '../../../components/ConsultationChatModal';
import { permanentlyDeleteDietPlan, getDeletedPlanIds, getDeletedPlanTitles } from '../../../utils/dietPlanSync';

const DietPlanBuilder = () => {
    const { user, token } = useContext(AuthContext);
    const nutritionistName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.name || user?.username || 'Nutritionist Mihir Sharma');
    const nutritionistEmail = user?.email || (user?.username && user.username.includes('@') ? user.username : 'sharmamihir012@gmail.com');

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
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatTargetPatient, setChatTargetPatient] = useState(null);

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
    const loadDietHistory = () => {
        const deletedIds = getDeletedPlanIds();
        const deletedTitles = getDeletedPlanTitles();
        try {
            const raw = localStorage.getItem('nutrimunch_diet_plans_history');
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    const activePlans = parsed.filter(p => {
                        const id = String(p.id);
                        const title = String(p.title || p.planTitle || '').toLowerCase().trim();
                        return !deletedIds.has(id) && !deletedTitles.has(title);
                    });
                    setDietHistory(activePlans);
                    return;
                }
            }
            setDietHistory([]);
            localStorage.setItem('nutrimunch_diet_plans_history', JSON.stringify([]));
        } catch (e) {
            console.error('Failed loading diet plans history:', e);
            setDietHistory([]);
        }
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
        fiber: 28,
        iron: 18,
        calcium: 1000,
        vitD: 15,
        vitC: 90,
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
            const response = await api.get('/admin/all-user-profiles');
            if (response.data && Array.isArray(response.data)) {
                const fetched = response.data.map(p => {
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
                        fiberG: p.dailyFiberTargetG ?? null,
                        ironMg: p.ironTargetMg ?? null,
                        calciumMg: p.calciumTargetMg ?? null,
                        vitDMcg: p.vitDTargetMcg ?? null,
                        vitCMg: p.vitCTargetMg ?? null,
                        notes: p.dietType ? `Preferred Diet: ${p.dietType}` : 'No dietary information recorded.'
                    };
                });
                const patients = fetched.filter(client => client.id);
                setClientsList(patients);
                setRosterError('');
                if (patients.length === 0) {
                    setSelectedClient(null);
                } else if (!selectedClient) {
                    setSelectedClient(patients[0]);
                }
            } else {
                setClientsList([]);
                setSelectedClient(null);
                setRosterError('Patient service returned an invalid response.');
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
            fiber: patient.fiberG || 28,
            dietType: patient.dietType || prev.dietType,
            nutritionistNotes: `Prescribed based on patient profile goals: ${patient.goal}. Allergies noted: ${patient.allergies}.`
        }));
        showToast(`Imported ${patient.name}'s profile targets into the diet builder!`);
        setIsDossierOpen(false);
    };

    // Open Consultation Chat with selected patient
    const handleOpenChat = (patient) => {
        setChatTargetPatient(patient);
        setIsChatOpen(true);
    };

    const handleUpdateMeal = (mealId, field, value) => {
        setMeals(meals.map(m => m.id === mealId ? { ...m, [field]: value } : m));
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

        setIsDeploying(true);

        const currentTimestamp = new Date().toISOString();
        const planId = editingPlanId || `plan_${Date.now()}`;

        // Ensure newly saved plan is un-blacklisted if it previously shared an ID
        try {
            const deleted = getDeletedPlanIds();
            if (deleted.has(planId)) {
                deleted.delete(planId);
                localStorage.setItem('nutrimunch_deleted_plan_ids', JSON.stringify(Array.from(deleted)));
            }
        } catch (e) {}

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
            fiber: Number(planForm.fiber || 28),
            iron: Number(planForm.iron || 18),
            calcium: Number(planForm.calcium || 1000),
            vitD: Number(planForm.vitD || 15),
            vitC: Number(planForm.vitC || 90),
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

                // Sync to backend API
                api.post('/diet-plans/deploy', finalDeployedPayload).catch(() => {});

                // Dispatch notification for all platform users
                const generalNotif = {
                    senderId: String(user?.id || user?.userId || ''),
                    id: `diet_notif_${Date.now()}`,
                    title: `New Nutritional Protocol Published`,
                    message: `Nutritionist ${nutritionistName} published a new nutritional protocol: "${planForm.planTitle}". Check your diet plans to link it.`,
                    time: 'Just now',
                    icon: 'restaurant_menu',
                    type: 'DIET_PLAN',
                    path: '/diet-plans',
                    read: false
                };
                const existingNotifs = JSON.parse(localStorage.getItem('nutrimunch_user_notifications') || '[]');
                localStorage.setItem('nutrimunch_user_notifications', JSON.stringify([generalNotif, ...existingNotifs]));
                window.dispatchEvent(new Event('nutrimunch_notification_added'));
                try {
                    const cbc = new BroadcastChannel('nutrimunch_clinical_channel');
                    cbc.postMessage({ payload: generalNotif });
                    setTimeout(() => { try { cbc.close(); } catch (e) {} }, 500);
                } catch (e) {}
                api.post('/notifications/send', {
                    title: generalNotif.title,
                    message: generalNotif.message,
                    type: 'DIET_PLAN',
                    icon: 'restaurant_menu',
                    path: '/diet-plans'
                }).catch(() => {});

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

                // Dispatch notification for targeted user with direct deep link
                const planNotification = {
                    senderId: String(user?.id || user?.userId || ''),
                    id: `plan_notif_${Date.now()}`,
                    title: `Exclusive Diet Plan Formulated`,
                    message: `Nutritionist ${nutritionistName} formulated an exclusive diet plan: "${planForm.planTitle}". Review and link to your daily requirements.`,
                    time: 'Just now',
                    icon: 'restaurant_menu',
                    type: 'EXCLUSIVE_PLAN',
                    path: '/diet-plans',
                    targetUserId: String(selectedClient.userId || selectedClient.id),
                    targetUserEmail: selectedClient.email,
                    read: false
                };
                const existingNotifs = JSON.parse(localStorage.getItem('nutrimunch_user_notifications') || '[]');
                localStorage.setItem('nutrimunch_user_notifications', JSON.stringify([planNotification, ...existingNotifs]));
                window.dispatchEvent(new Event('nutrimunch_notification_added'));

                window.dispatchEvent(new Event('nutrimunch_diet_plan_updated'));
                window.dispatchEvent(new Event('storage'));
                try {
                    const bc = new BroadcastChannel('nutrimunch_diet_plan_channel');
                    bc.postMessage({ type: 'DIET_PLAN_DEPLOYED', plan: finalDeployedPayload });
                    setTimeout(() => { try { bc.close(); } catch (err) {} }, 1000);
                } catch (err) {}

                try {
                    const cbc = new BroadcastChannel('nutrimunch_clinical_channel');
                    cbc.postMessage({ payload: planNotification });
                    setTimeout(() => { try { cbc.close(); } catch (e) {} }, 500);
                } catch (e) {}

                // Sync to backend API database
                api.post('/diet-plans/deploy', finalDeployedPayload).catch(() => {});
                const numTargetId = parseInt(selectedClient.userId || selectedClient.id, 10);
                api.post('/notifications/send', {
                    userId: isNaN(numTargetId) ? null : numTargetId,
                    userEmail: selectedClient.email || null,
                    title: planNotification.title,
                    message: planNotification.message,
                    type: 'EXCLUSIVE_PLAN',
                    icon: 'restaurant_menu',
                    path: '/diet-plans'
                }).catch(() => {});

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
            fiber: plan.fiber || 28,
            iron: plan.iron || 18,
            calcium: plan.calcium || 1000,
            vitD: plan.vitD || 15,
            vitC: plan.vitC || 90,
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

        const filtered = dietHistory.filter(p => p.id !== planId);
        setDietHistory(filtered);
        
        await permanentlyDeleteDietPlan(targetPlan || planId, api);

        showToast(`"${planName}" permanently deleted from database, registries, and all user dashboards.`);
        if (selectedHistoryPlan?.id === planId) {
            setIsHistoryDossierOpen(false);
            setSelectedHistoryPlan(null);
        }
    };

    // Quick Re-Deploy from History Vault
    const handleQuickDeployFromHistory = (plan) => {
        handleLoadHistoryIntoBuilder(plan);
        setTimeout(() => {
            showToast(`Ready to deploy or edit "${plan.title || plan.planTitle}".`);
        }, 400);
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
                        <span className="material-symbols-outlined text-[#a5d391] text-2xl">restaurant_menu</span>
                        <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white">Diet Builder</h1>
                    </div>
                    <p className="text-white/60 text-xs sm:text-sm">
                        Architect and deploy general public nutrition protocols or target individual patients with bespoke macro formulations and clinical notes.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {selectedClient && targetMode === 'EXCLUSIVE' && (
                        <button
                            type="button"
                            onClick={() => handleOpenChat(selectedClient)}
                            className="bg-[#0d131f] border border-[#a5d391]/40 hover:border-[#a5d391] text-[#a5d391] hover:text-white px-4 py-3 rounded-2xl font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-base">forum</span>
                            <span>Consultation Chat</span>
                        </button>
                    )}

                    <button 
                        onClick={handleDeployPlan}
                        disabled={isDeploying}
                        className="bg-[#a5d391] text-black font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-2xl hover:bg-white transition-all shadow-[0_0_20px_rgba(165,211,145,0.35)] cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-sm">rocket_launch</span>
                        <span>{targetMode === 'GENERAL' ? 'Deploy General Plan (All Users)' : 'Deploy Exclusive Diet Plan'}</span>
                    </button>
                </div>
            </div>

            {/* Top Level Studio / History Tab Switcher */}
            <div className="flex items-center gap-2 mb-8 border-b border-white/10 pb-4">
                <button
                    type="button"
                    onClick={() => setActiveTab('STUDIO')}
                    className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                        activeTab === 'STUDIO'
                            ? 'bg-[#a5d391] text-black shadow-[0_0_25px_rgba(165,211,145,0.4)]'
                            : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10'
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
                            ? 'bg-[#a5d391] text-black shadow-[0_0_25px_rgba(165,211,145,0.4)]'
                            : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10'
                    }`}
                >
                    <span className="material-symbols-outlined text-sm">history_edu</span>
                    <span>Diet Plans History Vault</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        activeTab === 'HISTORY' ? 'bg-black text-[#a5d391]' : 'bg-[#a5d391]/20 text-[#a5d391]'
                    }`}>
                        {dietHistory.length}
                    </span>
                </button>
            </div>

            {/* TAB 1: ACTIVE DIET BUILDER STUDIO */}
            {activeTab === 'STUDIO' && (
                <div className="space-y-8 animate-fadeIn">
                    {/* DIET PLAN NAME & DISTINCT IDENTIFIER CARD */}
                    <div className="bg-gradient-to-r from-emerald-950/40 via-[#0d131f] to-[#080b12] border border-[#a5d391]/50 rounded-[2.5rem] p-6 lg:p-8 shadow-xl relative overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <div>
                                <span className="text-[10px] font-black text-[#a5d391] uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm text-[#a5d391]">badge</span>
                                    <span>Diet Plan Identity & Unique Name</span>
                                </span>
                                <h2 className="text-xl font-bold font-hero-display text-white mt-1">
                                    Distinguish & Name Your Diet Plan
                                </h2>
                                <p className="text-xs text-white/50">
                                    Every formulated diet plan must have a distinctive title to distinguish it from other clinical protocols in your history and on the user dashboard.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60">
                                    ID: #{planForm.planTitle.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'PLAN'}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl border ${
                                    targetMode === 'GENERAL'
                                        ? 'bg-[#a5d391]/20 text-[#a5d391] border-[#a5d391]/40'
                                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                }`}>
                                    {targetMode === 'GENERAL' ? 'General Scope' : `Exclusive: ${selectedClient?.name || 'Selected User'}`}
                                </span>
                            </div>
                        </div>

                        {/* Plan Title Input */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                                        Diet Plan Name *
                                    </label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-lg">edit</span>
                                        <input
                                            type="text"
                                            value={planForm.planTitle}
                                            onChange={(e) => setPlanForm({ ...planForm, planTitle: e.target.value })}
                                            placeholder="e.g. Ketogenic Metabolic Protocol #1..."
                                            className="w-full bg-[#080b12] border border-white/20 focus:border-[#a5d391] rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-white placeholder:text-white/30 outline-none transition-all shadow-inner"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                                        Diet Category
                                    </label>
                                    <select
                                        value={planForm.dietType}
                                        onChange={(e) => setPlanForm({ ...planForm, dietType: e.target.value })}
                                        className="w-full bg-[#080b12] border border-white/20 focus:border-[#a5d391] rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none transition-all cursor-pointer"
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
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-1.5">Quick Distinguishing Presets:</span>
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
                                                    ? 'bg-[#a5d391] text-black font-extrabold border-[#a5d391]'
                                                    : 'bg-white/5 hover:bg-white/15 text-white/70 border-white/10 hover:text-white'
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
                    <div className="bg-[#080b12]/90 border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div>
                        <span className="text-[10px] font-black text-[#a5d391] uppercase tracking-[0.2em] block mb-1">Protocol Distribution Scope</span>
                        <h2 className="text-xl font-bold font-hero-display text-white">Select Target Architecture</h2>
                    </div>

                    {/* Mode Toggle Buttons */}
                    <div className="bg-black/60 p-1.5 rounded-2xl border border-white/10 flex items-center gap-1">
                        <button 
                            type="button"
                            onClick={() => setTargetMode('GENERAL')}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                targetMode === 'GENERAL' 
                                    ? 'bg-[#a5d391] text-black shadow-lg shadow-[#a5d391]/20' 
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
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
                                    ? 'bg-[#a5d391] text-black shadow-lg shadow-[#a5d391]/20' 
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">person_pin</span>
                            <span>Exclusive Diet Plan (Patient Roster)</span>
                        </button>
                    </div>
                </div>

                {targetMode === 'GENERAL' ? (
                    <div className="p-4 rounded-2xl bg-[#a5d391]/10 border border-[#a5d391]/20 flex items-center gap-3 text-xs text-white/80">
                        <span className="material-symbols-outlined text-xl text-[#a5d391]">broadcast_on_home</span>
                        <div>
                            <span className="font-bold text-white">Public General Protocol: </span>
                            This general diet plan will be published across the entire platform and displayed to all registered users. Any user can review and directly link its daily requirements to their profile.
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-200">
                            <span className="material-symbols-outlined text-xl text-amber-400">shield_person</span>
                            <div>
                                <span className="font-bold text-white">Targeted Clinical Assignment: </span>
                                Select a patient from the roster below. Click "Patient Dossier" to inspect their complete health profile, allergy records, and dietary preferences.
                            </div>
                        </div>

                        {/* User & Patient Roster Integration */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 lg:p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
                                <div>
                                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#a5d391]">group</span>
                                        User & Patient Roster
                                    </h3>
                                    <p className="text-white/40 text-xs">Select patient to view synced profile dossier or formulate exclusive plan</p>
                                </div>

                                {/* Search Roster */}
                                <div className="relative w-full sm:w-64">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">search</span>
                                    <input 
                                        type="text" 
                                        placeholder="Search patient by name or ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-black/60 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#a5d391]"
                                    />
                                </div>
                            </div>

                            {/* Roster Cards List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                                {loadingClients ? (
                                    <div className="col-span-full py-8 flex flex-col items-center justify-center gap-3">
                                        <div className="relative h-12 w-12">
                                            <div className="absolute inset-0 rounded-full border-2 border-[#a5d391]/20" />
                                            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#a5d391] animate-spin" />
                                            <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-[#a5d391] text-lg">groups</span>
                                        </div>
                                        <p className="text-white/55 text-xs animate-pulse">Loading live patient profiles…</p>
                                    </div>
                                ) : rosterError ? (
                                    <div className="col-span-full py-8 text-center">
                                        <p className="text-rose-300 text-xs mb-3">{rosterError}</p>
                                        <button type="button" onClick={fetchRealUsers} className="rounded-lg bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/15">Retry</button>
                                    </div>
                                ) : filteredClients.length === 0 ? (
                                    <div className="col-span-full py-8 text-center text-white/40 text-xs">
                                        {clientsList.length === 0 ? 'No patient profiles are available yet.' : 'No patients match your search.'}
                                    </div>
                                ) : (
                                    filteredClients.map(client => {
                                        const isSelected = selectedClient && String(selectedClient.id) === String(client.id);
                                        return (
                                            <div 
                                                key={client.id}
                                                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                                                    isSelected 
                                                        ? 'bg-[#a5d391]/15 border-[#a5d391] shadow-lg shadow-[#a5d391]/10' 
                                                        : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-white/5'
                                                }`}
                                            >
                                                <div onClick={() => handleSelectPatient(client)} className="cursor-pointer">
                                                    <div className="flex justify-between items-start gap-1 mb-1.5">
                                                        <div className="font-bold text-xs text-white truncate">{client.name}</div>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                            isSelected ? 'bg-[#a5d391] text-black font-black' : 'bg-white/10 text-white/60'
                                                        }`}>
                                                            {isSelected ? 'Target User' : `#${client.id}`}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-white/50 truncate mb-1.5">{client.email}</div>
                                                    <div className="text-[10px] text-[#a5d391] font-semibold truncate bg-white/5 px-2 py-1 rounded-lg mb-2">
                                                        Goal: {client.goal}
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] text-white/50 border-t border-white/5 pt-2">
                                                        <span>Weight: <strong className="text-white">{client.weight}</strong></span>
                                                        <span>Cal: <strong className="text-white">{client.calories}</strong></span>
                                                    </div>
                                                </div>

                                                {/* Patient Actions */}
                                                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDossierPatient(client);
                                                            setIsDossierOpen(true);
                                                        }}
                                                        className="flex-1 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 rounded-xl py-1 px-2 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                        title="View full patient profile and preferences"
                                                    >
                                                        <span className="material-symbols-outlined text-xs text-[#a5d391]">account_circle</span>
                                                        <span>Dossier</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenChat(client);
                                                        }}
                                                        className="bg-[#a5d391]/15 hover:bg-[#a5d391] text-[#a5d391] hover:text-black border border-[#a5d391]/30 rounded-xl py-1 px-2.5 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                        title="Initiate clinical consultation chat"
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
                                <div className="mt-4 p-4 rounded-2xl bg-black/60 border border-[#a5d391]/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-[#a5d391]/20 border border-[#a5d391]/40 text-[#a5d391] flex items-center justify-center font-bold">
                                            {selectedClient.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-white flex items-center gap-2">
                                                <span>Active Target Patient: {selectedClient.name}</span>
                                                <span className="text-[10px] text-[#a5d391] font-mono bg-[#a5d391]/10 px-2 py-0.5 rounded-full border border-[#a5d391]/20">ID #{selectedClient.id}</span>
                                            </div>
                                            <div className="text-[11px] text-white/50">
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
                                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm text-[#a5d391]">visibility</span>
                                            <span>View Patient Dossier</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleApplyPatientTargets(selectedClient)}
                                            className="px-3 py-1.5 rounded-xl bg-[#a5d391]/20 hover:bg-[#a5d391] text-[#a5d391] hover:text-black border border-[#a5d391]/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
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
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl space-y-6">
                        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-lg font-bold font-hero-display text-white">Daily Macro & Nutritional Targets (5-7 Parameters)</h3>
                                <p className="text-white/50 text-xs">Primary clinical parameters linked directly to user profile daily requirements</p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30">
                                {targetMode === 'GENERAL' ? 'All Users Protocol' : `Patient: ${selectedClient?.name || 'Selected'}`}
                            </span>
                        </div>

                        {/* Top 4 Core Macronutrients */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-[#080b12]/80 border border-white/10 rounded-2xl p-4">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">1. Calories (kcal)</span>
                                <input 
                                    type="number"
                                    value={planForm.calories}
                                    onChange={(e) => setPlanForm({ ...planForm, calories: e.target.value })}
                                    className="w-full bg-transparent font-bold text-2xl text-white outline-none focus:text-[#a5d391]"
                                />
                            </div>

                            <div className="bg-[#080b12]/80 border border-white/10 rounded-2xl p-4">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">2. Protein (g)</span>
                                <input 
                                    type="number"
                                    value={planForm.protein}
                                    onChange={(e) => setPlanForm({ ...planForm, protein: e.target.value })}
                                    className="w-full bg-transparent font-bold text-2xl text-[#a5d391] outline-none focus:text-white"
                                />
                            </div>

                            <div className="bg-[#080b12]/80 border border-white/10 rounded-2xl p-4">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">3. Carbs (g)</span>
                                <input 
                                    type="number"
                                    value={planForm.carbs}
                                    onChange={(e) => setPlanForm({ ...planForm, carbs: e.target.value })}
                                    className="w-full bg-transparent font-bold text-2xl text-cyan-400 outline-none focus:text-white"
                                />
                            </div>

                            <div className="bg-[#080b12]/80 border border-white/10 rounded-2xl p-4">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">4. Fats (g)</span>
                                <input 
                                    type="number"
                                    value={planForm.fats}
                                    onChange={(e) => setPlanForm({ ...planForm, fats: e.target.value })}
                                    className="w-full bg-transparent font-bold text-2xl text-amber-400 outline-none focus:text-white"
                                />
                            </div>
                        </div>

                        {/* Additional Clinical Parameters: Water, Fiber, Iron, Calcium, Vit D, Vit C */}
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2 border-t border-white/5">
                            <div className="bg-[#080b12]/60 border border-white/10 rounded-xl p-3">
                                <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">5. Water (L)</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={planForm.waterLiters}
                                    onChange={(e) => setPlanForm({ ...planForm, waterLiters: e.target.value })}
                                    className="w-full bg-transparent font-bold text-lg text-cyan-300 outline-none"
                                />
                            </div>

                            <div className="bg-[#080b12]/60 border border-white/10 rounded-xl p-3">
                                <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">6. Fiber (g)</span>
                                <input
                                    type="number"
                                    value={planForm.fiber}
                                    onChange={(e) => setPlanForm({ ...planForm, fiber: e.target.value })}
                                    className="w-full bg-transparent font-bold text-lg text-emerald-400 outline-none"
                                />
                            </div>

                            <div className="bg-[#080b12]/60 border border-white/10 rounded-xl p-3">
                                <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">7. Iron (mg)</span>
                                <input
                                    type="number"
                                    value={planForm.iron}
                                    onChange={(e) => setPlanForm({ ...planForm, iron: e.target.value })}
                                    className="w-full bg-transparent font-bold text-lg text-rose-300 outline-none"
                                />
                            </div>

                            <div className="bg-[#080b12]/60 border border-white/10 rounded-xl p-3">
                                <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">Calcium (mg)</span>
                                <input
                                    type="number"
                                    value={planForm.calcium}
                                    onChange={(e) => setPlanForm({ ...planForm, calcium: e.target.value })}
                                    className="w-full bg-transparent font-bold text-lg text-white outline-none"
                                />
                            </div>

                            <div className="bg-[#080b12]/60 border border-white/10 rounded-xl p-3">
                                <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">Vit D (mcg)</span>
                                <input
                                    type="number"
                                    value={planForm.vitD}
                                    onChange={(e) => setPlanForm({ ...planForm, vitD: e.target.value })}
                                    className="w-full bg-transparent font-bold text-lg text-amber-300 outline-none"
                                />
                            </div>

                            <div className="bg-[#080b12]/60 border border-white/10 rounded-xl p-3">
                                <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">Vit C (mg)</span>
                                <input
                                    type="number"
                                    value={planForm.vitC}
                                    onChange={(e) => setPlanForm({ ...planForm, vitC: e.target.value })}
                                    className="w-full bg-transparent font-bold text-lg text-orange-300 outline-none"
                                />
                            </div>
                        </div>

                        {/* Title & Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5">Diet Plan Title</label>
                                <input 
                                    type="text"
                                    value={planForm.planTitle}
                                    onChange={(e) => setPlanForm({ ...planForm, planTitle: e.target.value })}
                                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5">Diet Protocol Category</label>
                                <select 
                                    value={planForm.dietType}
                                    onChange={(e) => setPlanForm({ ...planForm, dietType: e.target.value })}
                                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
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
                        <div className="pt-4 border-t border-white/10 space-y-2">
                            <label className="text-xs font-bold text-[#a5d391] uppercase tracking-widest flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-base">comment</span>
                                <span>Nutritionist Clinical Notes & Formulation Comments</span>
                            </label>
                            <p className="text-[11px] text-white/50">Add professional commentary, meal timing guidelines, hydration advice, or clinical warnings to accompany this diet plan.</p>
                            
                            <textarea
                                value={planForm.nutritionistNotes}
                                onChange={(e) => setPlanForm({ ...planForm, nutritionistNotes: e.target.value })}
                                rows={3}
                                placeholder="Enter clinical comments or meal timing advice for this protocol..."
                                className="w-full bg-black/60 border border-white/15 rounded-2xl p-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#a5d391] transition-all leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* Meal Routine Formulator */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-lg font-bold font-hero-display text-white">Daily Meal Schedule & Formulation</h3>
                                <p className="text-white/50 text-xs">Custom recipes and macro allotments delivered to user dashboard</p>
                            </div>
                            <button 
                                onClick={handleAddMeal}
                                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1 transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm text-[#a5d391]">add</span>
                                <span>Add Meal Slot</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {meals.map((meal, index) => (
                                <div key={meal.id} className="bg-[#080b12]/80 border border-white/10 rounded-2xl p-5 space-y-3">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-[#a5d391]/15 text-[#a5d391] font-bold text-xs flex items-center justify-center border border-[#a5d391]/30">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <input 
                                                    type="text" 
                                                    value={meal.name}
                                                    onChange={(e) => handleUpdateMeal(meal.id, 'name', e.target.value)}
                                                    className="font-bold text-sm text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#a5d391] outline-none"
                                                />
                                                <div className="text-[10px] text-white/40 flex items-center gap-2">
                                                    <span>{meal.mealType}</span>
                                                    <span>•</span>
                                                    <input 
                                                        type="text" 
                                                        value={meal.time}
                                                        onChange={(e) => handleUpdateMeal(meal.id, 'time', e.target.value)}
                                                        className="w-16 bg-transparent text-white/50 outline-none hover:text-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleRemoveMeal(meal.id)}
                                            className="text-white/30 hover:text-red-400 p-1 cursor-pointer transition-colors"
                                            title="Delete Meal"
                                        >
                                            <span className="material-symbols-outlined text-base">delete</span>
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">Ingredients & Portions</label>
                                        <input 
                                            type="text" 
                                            value={meal.ingredients}
                                            onChange={(e) => handleUpdateMeal(meal.id, 'ingredients', e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-[#a5d391]"
                                        />
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 pt-1 text-[11px]">
                                        <div className="bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5 text-center">
                                            <span className="text-[9px] text-white/40 block">Calories</span>
                                            <span className="font-bold text-white">{meal.calories} kcal</span>
                                        </div>
                                        <div className="bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5 text-center">
                                            <span className="text-[9px] text-white/40 block">Protein</span>
                                            <span className="font-bold text-[#a5d391]">{meal.protein}g</span>
                                        </div>
                                        <div className="bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5 text-center">
                                            <span className="text-[9px] text-white/40 block">Carbs</span>
                                            <span className="font-bold text-cyan-300">{meal.carbs}g</span>
                                        </div>
                                        <div className="bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5 text-center">
                                            <span className="text-[9px] text-white/40 block">Fats</span>
                                            <span className="font-bold text-amber-300">{meal.fats}g</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Deployment Summary & Status Dossier */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-[#a5d391]/10 via-[#080b12] to-black border border-[#a5d391]/30 backdrop-blur-xl rounded-[2.5rem] p-6 lg:p-8 shadow-xl space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#a5d391]/20 border border-[#a5d391]/40 text-[#a5d391] flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">published_with_changes</span>
                        </div>

                        <div>
                            <span className="text-[10px] font-bold text-[#a5d391] uppercase tracking-widest block mb-1">
                                {targetMode === 'GENERAL' ? 'Global Broadcast' : 'Direct Patient Deployment'}
                            </span>
                            <h4 className="text-xl font-bold font-hero-display text-white">{planForm.planTitle}</h4>
                        </div>

                        <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs">
                            <div className="flex justify-between text-white/60">
                                <span>Target Recipient:</span>
                                <strong className="text-white">
                                    {targetMode === 'GENERAL' ? 'All Registered Users' : (selectedClient?.name || 'Individual Patient')}
                                </strong>
                            </div>
                            <div className="flex justify-between text-white/60">
                                <span>Total Energy:</span>
                                <strong className="text-[#a5d391]">{planForm.calories} kcal</strong>
                            </div>
                            <div className="flex justify-between text-white/60">
                                <span>Macro Split:</span>
                                <strong className="text-white">{planForm.protein}P / {planForm.carbs}C / {planForm.fats}F</strong>
                            </div>
                            <div className="flex justify-between text-white/60">
                                <span>Hydration Target:</span>
                                <strong className="text-cyan-300">{planForm.waterLiters} L / day</strong>
                            </div>
                            <div className="flex justify-between text-white/60">
                                <span>Dietary Fiber:</span>
                                <strong className="text-emerald-400">{planForm.fiber} g / day</strong>
                            </div>
                            <div className="flex justify-between text-white/60">
                                <span>Meal Count:</span>
                                <strong className="text-white">{meals.length} Scheduled Meals</strong>
                            </div>
                        </div>

                        {planForm.nutritionistNotes && (
                            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/70 italic">
                                <span className="text-[10px] font-bold text-[#a5d391] uppercase tracking-wider block mb-1 not-italic">Attached Clinical Comments:</span>
                                "{planForm.nutritionistNotes}"
                            </div>
                        )}

                        <button 
                            onClick={handleDeployPlan}
                            disabled={isDeploying}
                            className="w-full py-3.5 rounded-2xl bg-[#a5d391] text-black font-bold text-xs uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_25px_rgba(165,211,145,0.4)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-sm">send</span>
                            <span>{targetMode === 'GENERAL' ? 'Publish to All Users' : 'Deploy to Patient Profile'}</span>
                        </button>
                    </div>

                    {/* Quick Guidance Box */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 text-xs text-white/60 space-y-2">
                        <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-[#a5d391]">help</span>
                            <span>Diet Protocol Rules:</span>
                        </div>
                        <ul className="space-y-1.5 list-disc list-inside">
                            <li><strong>General Plans:</strong> Available to all platform users. Users can directly link targets into their Daily Requirements with 1-click.</li>
                            <li><strong>Exclusive Plans:</strong> Customized for an individual patient. Visible on their Diet Plans page with high priority.</li>
                            <li><strong>Consultation Chat:</strong> Live two-way communication channel initiated solely by the nutritionist.</li>
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
                    <div className="bg-[#080b12]/90 border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                                <span className="text-[10px] font-black text-[#a5d391] uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm text-[#a5d391]">history_edu</span>
                                    <span>Formulation Vault</span>
                                </span>
                                <h2 className="text-2xl font-bold font-hero-display text-white mt-1">
                                    Formulated Diet Plans History
                                </h2>
                                <p className="text-xs text-white/50 mt-0.5">
                                    Chronological archive of all general public protocols and bespoke patient-targeted diet plans created by your practice.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setEditingPlanId(null);
                                    setActiveTab('STUDIO');
                                }}
                                className="bg-[#a5d391] text-black font-extrabold text-xs uppercase tracking-wider px-5 py-3 rounded-2xl hover:bg-white transition-all shadow-[0_0_20px_rgba(165,211,145,0.35)] cursor-pointer flex items-center gap-2 shrink-0"
                            >
                                <span className="material-symbols-outlined text-sm">add_circle</span>
                                <span>Create New Diet Plan</span>
                            </button>
                        </div>

                        {/* Search & Filters */}
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t border-white/10">
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
                                                ? 'bg-[#a5d391] text-black shadow-md'
                                                : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                            historyFilter === tab.key ? 'bg-black text-[#a5d391]' : 'bg-white/10 text-white/70'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Search Input */}
                            <div className="relative min-w-[260px]">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-base">search</span>
                                <input
                                    type="text"
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    placeholder="Search by plan name, patient, or notes..."
                                    className="w-full bg-[#080b12] border border-white/15 focus:border-[#a5d391] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/30 outline-none transition-all"
                                />
                                {historySearch && (
                                    <button
                                        type="button"
                                        onClick={() => setHistorySearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer"
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
                                <div className="bg-[#080b12]/60 border border-white/10 rounded-[2.5rem] p-12 text-center space-y-4">
                                    <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-[#a5d391] mx-auto">
                                        <span className="material-symbols-outlined text-3xl">restaurant</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-white font-hero-display">No Diet Plans Matching Search</h4>
                                    <p className="text-xs text-white/50 max-w-md mx-auto">
                                        No historical formulations match your current filter. Clear your query or create a new plan in the Diet Builder Studio.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { setHistoryFilter('ALL'); setHistorySearch(''); }}
                                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer"
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
                                            className="bg-gradient-to-b from-[#0d131f]/90 to-[#080b12] border border-white/10 hover:border-[#a5d391]/40 rounded-[2.5rem] p-6 lg:p-7 shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group"
                                        >
                                            {/* Glow Accent */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#a5d391]/5 group-hover:bg-[#a5d391]/10 blur-[50px] rounded-full pointer-events-none transition-all"></div>

                                            <div className="space-y-4">
                                                {/* Header & Badges */}
                                                <div className="flex justify-between items-start gap-3">
                                                    <div className="space-y-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                                                isGeneral
                                                                    ? 'bg-[#a5d391]/15 text-[#a5d391] border-[#a5d391]/30'
                                                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                            }`}>
                                                                {isGeneral ? 'General • All Users' : `Exclusive: ${plan.targetUserName || 'Patient'}`}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-white/40">
                                                                {dateStr}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-xl font-bold font-hero-display text-white group-hover:text-[#a5d391] transition-colors truncate">
                                                            {planName}
                                                        </h3>
                                                        <span className="text-xs text-white/50 block">
                                                            Category: <strong className="text-white/80">{plan.dietType || 'High-Protein Metabolic'}</strong>
                                                        </span>
                                                        <div className="flex items-center gap-1.5 text-xs text-white/60 pt-0.5">
                                                            <span className="material-symbols-outlined text-[13px] text-[#a5d391]">badge</span>
                                                            <span>Formulator: <strong className="text-white font-medium">{plan.nutritionistName || 'Nutritionist'}</strong></span>
                                                            {plan.nutritionistEmail && (
                                                                <span className="text-[#a5d391] font-mono text-[11px] truncate max-w-[200px]" title={plan.nutritionistEmail}>
                                                                    ({plan.nutritionistEmail})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <span className="text-xs text-white/30 font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 shrink-0">
                                                        #{plan.id.slice(-6)}
                                                    </span>
                                                </div>

                                                {/* 5-7 Key Nutritional Targets Grid */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
                                                    <div className="p-2.5 bg-black/50 rounded-xl border border-white/5">
                                                        <span className="text-[9px] font-bold text-white/40 uppercase block">Energy</span>
                                                        <strong className="text-xs text-white">{plan.calories} kcal</strong>
                                                    </div>
                                                    <div className="p-2.5 bg-black/50 rounded-xl border border-white/5">
                                                        <span className="text-[9px] font-bold text-white/40 uppercase block">Protein</span>
                                                        <strong className="text-xs text-[#a5d391]">{plan.protein}g</strong>
                                                    </div>
                                                    <div className="p-2.5 bg-black/50 rounded-xl border border-white/5">
                                                        <span className="text-[9px] font-bold text-white/40 uppercase block">Carbs</span>
                                                        <strong className="text-xs text-cyan-300">{plan.carbs}g</strong>
                                                    </div>
                                                    <div className="p-2.5 bg-black/50 rounded-xl border border-white/5">
                                                        <span className="text-[9px] font-bold text-white/40 uppercase block">Fats</span>
                                                        <strong className="text-xs text-amber-300">{plan.fats}g</strong>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-[11px] text-white/60 bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                                                    <span>Hydration: <strong className="text-cyan-300">{plan.waterLiters || 3.0}L</strong></span>
                                                    <span>Fiber: <strong className="text-emerald-400">{plan.fiber || 28}g</strong></span>
                                                    <span>Meals: <strong className="text-white">{plan.meals?.length || 0} slots</strong></span>
                                                </div>

                                                {/* Nutritionist Comments Snippet */}
                                                {plan.nutritionistNotes && (
                                                    <p className="text-xs text-white/60 italic bg-black/40 p-3 rounded-xl border border-white/5 line-clamp-2">
                                                        "{plan.nutritionistNotes}"
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleLoadHistoryIntoBuilder(plan)}
                                                        className="bg-[#a5d391] hover:bg-white text-black font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
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
                                                        className="bg-white/5 hover:bg-white/15 text-white border border-white/10 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                                                    >
                                                        <span className="material-symbols-outlined text-sm text-[#a5d391]">visibility</span>
                                                        <span>View Details</span>
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteHistoryPlan(plan.id)}
                                                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 border border-white/5 hover:border-red-500/30 flex items-center justify-center transition-all cursor-pointer"
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
                <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-start pt-24 sm:pt-28 pb-8 px-3 sm:px-4 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    <div className="bg-[#080b12] border border-[#a5d391]/40 rounded-[2.5rem] max-w-2xl w-full h-[78vh] max-h-[calc(100vh-8.5rem)] flex flex-col shadow-[0_0_80px_rgba(165,211,145,0.25)] overflow-hidden shrink-0 my-auto sm:my-0">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-white font-hero-display">
                                        {selectedHistoryPlan.title || selectedHistoryPlan.planTitle}
                                    </h3>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-[#a5d391] bg-[#a5d391]/15 px-2 py-0.5 rounded-full border border-[#a5d391]/30">
                                        {selectedHistoryPlan.scope || selectedHistoryPlan.targetMode}
                                    </span>
                                </div>
                                <p className="text-xs text-white/50">
                                    Formulated by <strong className="text-white">{selectedHistoryPlan.nutritionistName || 'Nutritionist'}</strong>
                                    {selectedHistoryPlan.nutritionistEmail && (
                                        <span className="text-[#a5d391] font-mono ml-1">({selectedHistoryPlan.nutritionistEmail})</span>
                                    )} • {selectedHistoryPlan.dietType}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsHistoryDossierOpen(false)}
                                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
                            {/* Targets Breakdown */}
                            <div>
                                <span className="text-[10px] font-bold text-[#a5d391] uppercase tracking-widest block mb-2">Prescribed Daily Requirements</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                        <span className="text-[10px] text-white/40 block">Calories</span>
                                        <strong className="text-base text-white">{selectedHistoryPlan.calories} kcal</strong>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                        <span className="text-[10px] text-white/40 block">Protein</span>
                                        <strong className="text-base text-[#a5d391]">{selectedHistoryPlan.protein} g</strong>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                        <span className="text-[10px] text-white/40 block">Carbs</span>
                                        <strong className="text-base text-cyan-300">{selectedHistoryPlan.carbs} g</strong>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                        <span className="text-[10px] text-white/40 block">Fats</span>
                                        <strong className="text-base text-amber-300">{selectedHistoryPlan.fats} g</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Micronutrients & Hydration */}
                            <div className="p-4 bg-black/50 border border-white/10 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div><span className="text-[10px] text-white/40 block">Water</span><strong className="text-white">{selectedHistoryPlan.waterLiters || 3.0} L</strong></div>
                                <div><span className="text-[10px] text-white/40 block">Fiber</span><strong className="text-white">{selectedHistoryPlan.fiber || 28} g</strong></div>
                                <div><span className="text-[10px] text-white/40 block">Iron</span><strong className="text-white">{selectedHistoryPlan.iron || 18} mg</strong></div>
                                <div><span className="text-[10px] text-white/40 block">Calcium</span><strong className="text-white">{selectedHistoryPlan.calcium || 1000} mg</strong></div>
                            </div>

                            {/* Clinical Notes */}
                            {selectedHistoryPlan.nutritionistNotes && (
                                <div className="p-4 bg-[#a5d391]/10 border border-[#a5d391]/20 rounded-2xl">
                                    <span className="text-[10px] font-bold text-[#a5d391] uppercase tracking-wider block mb-1">Nutritionist Clinical Directive Notes</span>
                                    <p className="text-white/80 leading-relaxed italic">"{selectedHistoryPlan.nutritionistNotes}"</p>
                                </div>
                            )}

                            {/* Scheduled Meals */}
                            <div>
                                <span className="text-[10px] font-bold text-[#a5d391] uppercase tracking-widest block mb-2">
                                    Formulated Meal Schedule ({selectedHistoryPlan.meals?.length || 0} Meals)
                                </span>
                                <div className="space-y-2.5">
                                    {selectedHistoryPlan.meals?.map((m) => (
                                        <div key={m.id} className="p-3.5 bg-white/5 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-[#a5d391] bg-black/40 px-2 py-0.5 rounded-lg">{m.time}</span>
                                                    <strong className="text-sm text-white">{m.name}</strong>
                                                    <span className="text-[10px] text-white/40 uppercase">({m.mealType})</span>
                                                </div>
                                                <p className="text-white/50 text-[11px] mt-1">{m.ingredients}</p>
                                            </div>
                                            <div className="text-right text-[11px] text-white/70 sm:shrink-0 font-mono">
                                                <span>{m.calories} kcal • {m.protein}P • {m.carbs}C • {m.fats}F</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsHistoryDossierOpen(false);
                                    handleLoadHistoryIntoBuilder(selectedHistoryPlan);
                                }}
                                className="bg-[#a5d391] hover:bg-white text-black font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2"
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
                <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-start pt-24 sm:pt-28 pb-8 px-3 sm:px-4 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    <div className="bg-[#080b12] border border-[#a5d391]/40 rounded-[2.5rem] max-w-2xl w-full h-[78vh] max-h-[calc(100vh-8.5rem)] flex flex-col shadow-[0_0_80px_rgba(165,211,145,0.25)] overflow-hidden shrink-0 my-auto sm:my-0">
                        
                        {/* Dossier Header */}
                        <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-[#a5d391]/20 border border-[#a5d391]/40 text-[#a5d391] flex items-center justify-center font-bold text-lg shadow-inner">
                                    {dossierPatient.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-white font-hero-display">{dossierPatient.name}</h3>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-[#a5d391] bg-[#a5d391]/15 px-2.5 py-0.5 rounded-full border border-[#a5d391]/30">
                                            ID #{dossierPatient.id}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/50">{dossierPatient.email} • Synced Live Profile Dossier</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsDossierOpen(false)}
                                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* Dossier Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
                            
                            {/* 1. Anthropometrics & Vitals */}
                            <div>
                                <span className="text-[10px] font-bold text-[#a5d391] uppercase tracking-widest block mb-2">1. Anthropometrics & Biometrics</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                        <span className="text-[10px] text-white/40 block mb-0.5">Height</span>
                                        <strong className="text-sm text-white">{dossierPatient.heightFtIn} ({dossierPatient.heightCm} cm)</strong>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                        <span className="text-[10px] text-white/40 block mb-0.5">Weight</span>
                                        <strong className="text-sm text-white">{dossierPatient.weight} ({dossierPatient.weightLbs} lbs)</strong>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                        <span className="text-[10px] text-white/40 block mb-0.5">Target Weight</span>
                                        <strong className="text-sm text-[#a5d391]">{dossierPatient.targetWeightKg} kg</strong>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                        <span className="text-[10px] text-white/40 block mb-0.5">BMI Score</span>
                                        <strong className="text-sm text-cyan-300">{dossierPatient.bmi}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Metabolic & Goal Baseline */}
                            <div>
                                <span className="text-[10px] font-bold text-[#a5d391] uppercase tracking-widest block mb-2">2. Metabolic Baseline & Activity</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                        <span className="text-[10px] text-white/40 block mb-0.5">Age & Gender</span>
                                        <strong className="text-sm text-white">{dossierPatient.age} yrs • {dossierPatient.gender}</strong>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                        <span className="text-[10px] text-white/40 block mb-0.5">Activity Level</span>
                                        <strong className="text-sm text-white">{dossierPatient.activityLevel}</strong>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                        <span className="text-[10px] text-white/40 block mb-0.5">Basal BMR</span>
                                        <strong className="text-sm text-white">{dossierPatient.bmr} kcal</strong>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                        <span className="text-[10px] text-white/40 block mb-0.5">Estimated TDEE</span>
                                        <strong className="text-sm text-[#a5d391]">{dossierPatient.tdee} kcal</strong>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Primary Health Goal */}
                            <div className="p-4 bg-gradient-to-r from-[#a5d391]/15 to-transparent border border-[#a5d391]/30 rounded-2xl">
                                <span className="text-[10px] font-bold text-[#a5d391] uppercase tracking-widest block mb-1">Primary Health & Clinical Objective</span>
                                <p className="text-sm font-bold text-white">{dossierPatient.goal}</p>
                            </div>

                            {/* 4. Allergies & Dietary Restrictions */}
                            <div>
                                <span className="text-[10px] font-bold text-rose-300 uppercase tracking-widest block mb-2">3. Allergies & Food Sensitivities</span>
                                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3">
                                    <span className="material-symbols-outlined text-rose-400 text-lg">warning</span>
                                    <div>
                                        <span className="font-bold text-white">Registered Allergens: </span>
                                        <span className="text-rose-200">{dossierPatient.allergies}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Food & Cuisine Preferences */}
                            <div>
                                <span className="text-[10px] font-bold text-[#a5d391] uppercase tracking-widest block mb-2">4. Dietary Preferences & Cuisine Choices</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                                        <span className="text-[10px] text-white/40 block">Diet Type</span>
                                        <strong className="text-white block">{dossierPatient.dietType}</strong>
                                        <span className="text-[10px] text-white/40 block pt-1">Preferred Cuisines</span>
                                        <span className="text-white/80">{dossierPatient.cuisinePreferences}</span>
                                    </div>

                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                                        <span className="text-[10px] text-white/40 block">Favorite Foods</span>
                                        <span className="text-[#a5d391] block font-semibold">{dossierPatient.favoriteFoods}</span>
                                        <span className="text-[10px] text-white/40 block pt-1">Disliked Foods</span>
                                        <span className="text-rose-300/80 block">{dossierPatient.dislikedFoods}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 6. Current Profile Daily Requirements Targets */}
                            <div>
                                <span className="text-[10px] font-bold text-[#a5d391] uppercase tracking-widest block mb-2">5. Current Profile Daily Requirement Targets</span>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    <div className="p-2.5 bg-black/60 rounded-xl border border-white/10 text-center">
                                        <span className="text-[9px] text-white/40 block">Calories</span>
                                        <strong className="text-white">{dossierPatient.caloriesNum} kcal</strong>
                                    </div>
                                    <div className="p-2.5 bg-black/60 rounded-xl border border-white/10 text-center">
                                        <span className="text-[9px] text-white/40 block">Protein</span>
                                        <strong className="text-[#a5d391]">{dossierPatient.proteinNum}g</strong>
                                    </div>
                                    <div className="p-2.5 bg-black/60 rounded-xl border border-white/10 text-center">
                                        <span className="text-[9px] text-white/40 block">Carbs</span>
                                        <strong className="text-cyan-300">{dossierPatient.carbsNum}g</strong>
                                    </div>
                                    <div className="p-2.5 bg-black/60 rounded-xl border border-white/10 text-center">
                                        <span className="text-[9px] text-white/40 block">Fats</span>
                                        <strong className="text-amber-300">{dossierPatient.fatsNum}g</strong>
                                    </div>
                                    <div className="p-2.5 bg-black/60 rounded-xl border border-white/10 text-center">
                                        <span className="text-[9px] text-white/40 block">Water</span>
                                        <strong className="text-cyan-400">{dossierPatient.waterLiters}L</strong>
                                    </div>
                                    <div className="p-2.5 bg-black/60 rounded-xl border border-white/10 text-center">
                                        <span className="text-[9px] text-white/40 block">Fiber</span>
                                        <strong className="text-emerald-400">{dossierPatient.fiberG}g</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dossier Footer Actions */}
                        <div className="p-4 sm:p-6 border-t border-white/10 bg-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsDossierOpen(false);
                                    handleOpenChat(dossierPatient);
                                }}
                                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
                            >
                                <span className="material-symbols-outlined text-sm text-[#a5d391]">forum</span>
                                <span>Start Consultation Chat</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleApplyPatientTargets(dossierPatient)}
                                className="px-5 py-2.5 rounded-2xl bg-[#a5d391] hover:bg-white text-black font-bold text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(165,211,145,0.35)] flex items-center gap-2 cursor-pointer transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">tune</span>
                                <span>Apply Patient Targets to Plan Formulation</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIVE CONSULTATION CHAT MODAL */}
            {isChatOpen && (
                <ConsultationChatModal
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    currentUser={user}
                    targetPatient={chatTargetPatient || selectedClient}
                />
            )}
        </div>
    );
};

export default DietPlanBuilder;
