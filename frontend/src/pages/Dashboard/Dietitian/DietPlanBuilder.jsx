import React, { useState, useEffect, useContext } from 'react';
import api, { API_BASE_URL } from '../../../api/axios';
import { AuthContext } from '../../../context/AuthContext';

const DietPlanBuilder = () => {
    const { user, token } = useContext(AuthContext);
    const dietitianName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.name || user?.username || 'Certified Clinical Dietitian');

    // Mode: 'GENERAL' (All Users) or 'EXCLUSIVE' (Individual Patient Roster)
    const [targetMode, setTargetMode] = useState('GENERAL');

    // Users & Patients Roster State
    const [clientsList, setClientsList] = useState([]);
    const [loadingClients, setLoadingClients] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedClient, setSelectedClient] = useState(null);

    // Clinical Directive State (Only active for Exclusive Diet Plan)
    const [directiveText, setDirectiveText] = useState('');
    const [directiveUrgency, setDirectiveUrgency] = useState('Standard Protocol');

    // Notification / Toast Feedback
    const [notification, setNotification] = useState(null);
    const [isDeploying, setIsDeploying] = useState(false);

    // Diet Plan Macro Parameters
    const [planForm, setPlanForm] = useState({
        planTitle: 'Clinical Metabolic Optimization Protocol',
        calories: 2100,
        protein: 160,
        carbs: 150,
        fats: 70,
        waterLiters: 3.0,
        dietType: 'High-Protein Metabolic',
        notes: 'Follow strict meal timing distribution. Keep hydration consistent throughout the day.'
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
            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                const fetched = response.data.map(p => {
                    const name = p.firstName || p.lastName ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : (p.email ? p.email.split('@')[0] : 'Patient User');
                    return {
                        id: String(p.userId || p.id),
                        userId: String(p.userId || p.id),
                        name: name,
                        email: p.email || 'patient@nutrimunch.com',
                        role: 'USER',
                        age: p.age || 26,
                        goal: p.goal || 'Metabolic Health & Conditioning',
                        adherence: p.adherence || 92,
                        status: p.status || 'Optimal',
                        weight: p.weightKg ? `${p.weightKg} kg` : '70 kg',
                        glucose: '95 mg/dL',
                        calories: p.dailyCaloriesTarget ? `${p.dailyCaloriesTarget} kcal` : '2,000 kcal',
                        protein: p.proteinTarget ? `${p.proteinTarget}g` : '140g',
                        carbs: p.carbsTarget ? `${p.carbsTarget}g` : '180g',
                        fats: p.fatsTarget ? `${p.fatsTarget}g` : '60g',
                        notes: p.dietType ? `Preferred Diet: ${p.dietType}` : 'No known dietary restrictions.'
                    };
                });
                setClientsList(fetched);
                if (fetched.length > 0 && !selectedClient) {
                    setSelectedClient(fetched[0]);
                }
            } else {
                fallbackRoster();
            }
        } catch (error) {
            fallbackRoster();
        } finally {
            setLoadingClients(false);
        }
    };

    const fallbackRoster = () => {
        const fallbacks = [
            { id: "442", userId: "442", name: "David Miller", email: "david.m@example.com", role: "USER", age: 45, goal: "Diabetes Management", adherence: 82, status: "Critical", weight: "88 kg", glucose: "142 mg/dL", calories: "1,950 kcal", protein: "140g", carbs: "160g", fats: "55g", notes: "Monitored insulin spike post-lunch. Adjusted carb threshold." },
            { id: "8472", userId: "8472", name: "Marcus Chen", email: "marcus.c@example.com", role: "USER", age: 32, goal: "Lipid Oxidation & Endurance", adherence: 94, status: "Optimal", weight: "76 kg", glucose: "92 mg/dL", calories: "2,650 kcal", protein: "175g", carbs: "310g", fats: "65g", notes: "VO2 max training phase. Excellent carbohydrate timing." },
            { id: "102", userId: "102", name: "Elena Rodriguez", email: "elena.r@example.com", role: "USER", age: 38, goal: "Hormonal Balance & PCOS", adherence: 91, status: "Optimal", weight: "61 kg", glucose: "95 mg/dL", calories: "1,850 kcal", protein: "130g", carbs: "170g", fats: "58g", notes: "Consistent REM sleep. Micronutrient balance optimal." },
            { id: "553", userId: "553", name: "James Wilson", email: "james.w@example.com", role: "USER", age: 51, goal: "Cardiovascular Health", adherence: 88, status: "Good", weight: "82 kg", glucose: "110 mg/dL", calories: "2,100 kcal", protein: "150g", carbs: "200g", fats: "60g", notes: "Sodium intake reduced by 15%. Blood pressure stable." }
        ];
        setClientsList(fallbacks);
        if (!selectedClient && fallbacks.length > 0) {
            setSelectedClient(fallbacks[0]);
        }
    };

    const filteredClients = clientsList.filter(client => {
        const matchSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            client.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            client.goal.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'ALL' || client.status.toUpperCase() === statusFilter.toUpperCase();
        return matchSearch && matchStatus;
    });

    const handleSelectPatient = (patient) => {
        setSelectedClient(patient);
        setPlanForm(prev => ({
            ...prev,
            planTitle: `Exclusive Protocol for ${patient.name}`,
            notes: `Targeted clinical diet calibrated for ${patient.name} (${patient.goal}).`
        }));
        showToast(`Target patient set to ${patient.name} (ID: #${patient.id})`);
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
        setIsDeploying(true);

        const currentTimestamp = new Date().toISOString();
        const basePlanPayload = {
            id: `plan_${Date.now()}`,
            title: planForm.planTitle,
            scope: targetMode, // 'GENERAL' or 'EXCLUSIVE'
            calories: Number(planForm.calories),
            protein: Number(planForm.protein),
            carbs: Number(planForm.carbs),
            fats: Number(planForm.fats),
            waterLiters: Number(planForm.waterLiters),
            dietType: planForm.dietType,
            notes: planForm.notes,
            dietitianName: dietitianName,
            deployedAt: currentTimestamp,
            meals: meals
        };

        try {
            if (targetMode === 'GENERAL') {
                // GENERAL DIET PLAN -> Visible to ALL users
                localStorage.setItem('nutrimunch_general_diet_plan', JSON.stringify(basePlanPayload));
                
                window.dispatchEvent(new Event('nutrimunch_diet_plan_updated'));
                window.dispatchEvent(new Event('storage'));

                showToast('General Diet Plan deployed successfully! Visible to all platform users.');
            } else {
                // EXCLUSIVE DIET PLAN -> Targeted to specific user
                if (!selectedClient) {
                    showToast('Please select a target patient from the roster first.');
                    setIsDeploying(false);
                    return;
                }

                const exclusivePayload = {
                    ...basePlanPayload,
                    targetUserId: String(selectedClient.userId || selectedClient.id),
                    targetUserEmail: selectedClient.email,
                    targetUserName: selectedClient.name,
                    clinicalDirective: directiveText.trim() ? directiveText.trim() : null
                };

                // Store in exclusive plans map keyed by userId and email
                const storedExclusive = JSON.parse(localStorage.getItem('nutrimunch_exclusive_diet_plans') || '{}');
                storedExclusive[String(selectedClient.userId || selectedClient.id)] = exclusivePayload;
                if (selectedClient.email) {
                    storedExclusive[selectedClient.email.toLowerCase()] = exclusivePayload;
                }
                localStorage.setItem('nutrimunch_exclusive_diet_plans', JSON.stringify(storedExclusive));

                // IF A CLINICAL DIRECTIVE IS PROVIDED, DISPATCH IT TO THE USER DIRECTIVES
                if (directiveText.trim()) {
                    const directiveNotification = {
                        id: `directive_${Date.now()}`,
                        title: `Clinical Directive from Dietitian ${dietitianName}`,
                        message: directiveText.trim(),
                        urgency: directiveUrgency,
                        time: 'Just now',
                        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                        icon: 'health_and_safety',
                        path: '/diet-plans',
                        targetEmail: selectedClient.email || '',
                        targetUserId: String(selectedClient.userId || selectedClient.id),
                        targetName: selectedClient.name || '',
                        dietitianName: dietitianName,
                        read: false
                    };

                    const existingNotifs = JSON.parse(localStorage.getItem('nutrimunch_user_notifications') || '[]');
                    localStorage.setItem('nutrimunch_user_notifications', JSON.stringify([directiveNotification, ...existingNotifs]));

                    const existingDirectives = JSON.parse(localStorage.getItem('nutrimunch_clinical_directives') || '[]');
                    localStorage.setItem('nutrimunch_clinical_directives', JSON.stringify([directiveNotification, ...existingDirectives]));

                    window.dispatchEvent(new Event('nutrimunch_notification_added'));

                    try {
                        const bc = new BroadcastChannel('nutrimunch_clinical_channel');
                        bc.postMessage({ type: 'CLINICAL_DIRECTIVE_SENT', payload: directiveNotification });
                        bc.close();
                    } catch (e) {}

                    // Also push to backend notification if online
                    if (token) {
                        try {
                            await fetch(`${API_BASE_URL}/notifications/send`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    targetEmail: selectedClient.email,
                                    title: `Clinical Directive from Dietitian ${dietitianName}`,
                                    message: directiveText.trim()
                                })
                            });
                        } catch (err) {}
                    }
                }

                window.dispatchEvent(new Event('nutrimunch_diet_plan_updated'));
                window.dispatchEvent(new Event('storage'));

                showToast(`Exclusive Diet Plan & Clinical Directive deployed directly for ${selectedClient.name}!`);
            }
        } catch (e) {
            console.error('Failed deploying diet plan:', e);
            showToast('Error deploying diet protocol.');
        } finally {
            setIsDeploying(false);
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
                        <span className="material-symbols-outlined text-[#a5d391] text-2xl">restaurant_menu</span>
                        <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white">Diet Builder</h1>
                    </div>
                    <p className="text-white/60 text-xs sm:text-sm">
                        Architect and deploy general public nutrition protocols or target individual patients with bespoke macro formulations and clinical directives.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleDeployPlan}
                        disabled={isDeploying}
                        className="bg-[#a5d391] text-black font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-2xl hover:bg-white transition-all shadow-[0_0_20px_rgba(165,211,145,0.35)] cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-sm">rocket_launch</span>
                        <span>{targetMode === 'GENERAL' ? 'Deploy General Plan (All Users)' : 'Deploy Exclusive Protocol & Directive'}</span>
                    </button>
                </div>
            </div>

            {/* Target Scope Switcher */}
            <div className="bg-[#080b12]/90 border border-white/10 rounded-[2.5rem] p-6 lg:p-8 mb-8 shadow-xl relative overflow-hidden">
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
                            <span className="font-bold text-white">Public Baseline Protocol: </span>
                            This general diet plan will be published across the entire platform and displayed to all registered users who do not have an individual clinical assignment.
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-200">
                            <span className="material-symbols-outlined text-xl text-amber-400">shield_person</span>
                            <div>
                                <span className="font-bold text-white">Targeted Clinical Assignment: </span>
                                Select a patient from the roster below. This exclusive diet plan will be tied solely to their account, and you can issue live Clinical Directives to guide their protocol.
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
                                    <p className="text-white/40 text-xs">Pick the individual user to receive this customized clinical protocol</p>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
                                {loadingClients ? (
                                    <div className="col-span-full py-8 text-center text-white/40 text-xs">
                                        Loading platform patient roster...
                                    </div>
                                ) : filteredClients.length === 0 ? (
                                    <div className="col-span-full py-8 text-center text-white/40 text-xs">
                                        No matching patients found in roster.
                                    </div>
                                ) : (
                                    filteredClients.map(client => {
                                        const isSelected = selectedClient && String(selectedClient.id) === String(client.id);
                                        return (
                                            <div 
                                                key={client.id}
                                                onClick={() => handleSelectPatient(client)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                                                    isSelected 
                                                        ? 'bg-[#a5d391]/15 border-[#a5d391] shadow-lg shadow-[#a5d391]/10' 
                                                        : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-white/5'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start gap-1 mb-1.5">
                                                        <div className="font-bold text-xs text-white truncate">{client.name}</div>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                            isSelected ? 'bg-[#a5d391] text-black font-black' : 'bg-white/10 text-white/60'
                                                        }`}>
                                                            {isSelected ? 'Target User' : `#${client.id}`}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-white/50 truncate mb-2">{client.email}</div>
                                                    <div className="text-[10px] text-[#a5d391] font-semibold truncate bg-white/5 px-2 py-1 rounded-lg">
                                                        Goal: {client.goal}
                                                    </div>
                                                </div>

                                                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40">
                                                    <span>Weight: <strong className="text-white/80">{client.weight}</strong></span>
                                                    <span>Target: <strong className="text-white/80">{client.calories}</strong></span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Active Target User Dossier */}
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
                                                {selectedClient.email} • Age: {selectedClient.age} • Adherence: {selectedClient.adherence}%
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-xs text-white/70 italic max-w-sm">
                                        "{selectedClient.notes}"
                                    </div>
                                </div>
                            )}

                            {/* EXCLUSIVE CLINICAL DIRECTIVE SECTION */}
                            <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-[#a5d391] uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-base">health_and_safety</span>
                                        <span>Issue Clinical Directive (Exclusive to {selectedClient?.name || 'Target Patient'})</span>
                                    </label>
                                    <span className="text-[10px] text-white/40">Real-time Patient Notification & Dashboard Sync</span>
                                </div>

                                <textarea
                                    value={directiveText}
                                    onChange={(e) => setDirectiveText(e.target.value)}
                                    rows={2}
                                    placeholder={`e.g. "Prescribed strict 140g protein threshold. Consume 3.0L water daily and eliminate processed refined carbs post-18:00."`}
                                    className="w-full bg-black/60 border border-white/15 rounded-2xl p-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#a5d391] transition-all"
                                />

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Quick Prescriptions:</span>
                                    {[
                                        "Hydration Target: 3.0L daily minimum",
                                        "Prioritize 140g clean protein distribution",
                                        "Fast 14 hours overnight for glycemic control",
                                        "Limit post-lunch simple carbohydrate intake"
                                    ].map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setDirectiveText(preset)}
                                            className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white/70 hover:text-white hover:border-[#a5d391] transition-all cursor-pointer"
                                        >
                                            + {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Protocol Parameters & Macro Builder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left 2 Columns: Macro Targets & Meals Formulation */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Macro Target Controls */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl space-y-6">
                        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-lg font-bold font-hero-display text-white">Daily Macro & Nutritional Targets</h3>
                                <p className="text-white/50 text-xs">Direct input parameters guiding AI meal calculations</p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30">
                                {targetMode === 'GENERAL' ? 'All Users Protocol' : `Patient: ${selectedClient?.name || 'Selected'}`}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-[#080b12]/80 border border-white/10 rounded-2xl p-4">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">Calories (Kcal)</span>
                                <input 
                                    type="number"
                                    value={planForm.calories}
                                    onChange={(e) => setPlanForm({ ...planForm, calories: e.target.value })}
                                    className="w-full bg-transparent font-bold text-2xl text-white outline-none focus:text-[#a5d391]"
                                />
                            </div>

                            <div className="bg-[#080b12]/80 border border-white/10 rounded-2xl p-4">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">Protein (g)</span>
                                <input 
                                    type="number"
                                    value={planForm.protein}
                                    onChange={(e) => setPlanForm({ ...planForm, protein: e.target.value })}
                                    className="w-full bg-transparent font-bold text-2xl text-[#a5d391] outline-none focus:text-white"
                                />
                            </div>

                            <div className="bg-[#080b12]/80 border border-white/10 rounded-2xl p-4">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">Carbs (g)</span>
                                <input 
                                    type="number"
                                    value={planForm.carbs}
                                    onChange={(e) => setPlanForm({ ...planForm, carbs: e.target.value })}
                                    className="w-full bg-transparent font-bold text-2xl text-cyan-400 outline-none focus:text-white"
                                />
                            </div>

                            <div className="bg-[#080b12]/80 border border-white/10 rounded-2xl p-4">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">Fats (g)</span>
                                <input 
                                    type="number"
                                    value={planForm.fats}
                                    onChange={(e) => setPlanForm({ ...planForm, fats: e.target.value })}
                                    className="w-full bg-transparent font-bold text-2xl text-amber-400 outline-none focus:text-white"
                                />
                            </div>
                        </div>

                        {/* Title & Notes */}
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
                                </select>
                            </div>
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
                                <span>Total Daily Energy:</span>
                                <strong className="text-[#a5d391]">{planForm.calories} kcal</strong>
                            </div>
                            <div className="flex justify-between text-white/60">
                                <span>Macros Split:</span>
                                <strong className="text-white">{planForm.protein}P / {planForm.carbs}C / {planForm.fats}F</strong>
                            </div>
                            <div className="flex justify-between text-white/60">
                                <span>Meal Count:</span>
                                <strong className="text-white">{meals.length} Scheduled Meals</strong>
                            </div>
                            {targetMode === 'EXCLUSIVE' && directiveText.trim() && (
                                <div className="pt-2 border-t border-white/10 text-[11px] text-amber-300">
                                    <span>Directive Included:</span>
                                    <p className="italic text-white/80 mt-0.5">"{directiveText.trim()}"</p>
                                </div>
                            )}
                        </div>

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
                            <li><strong>General Plans:</strong> Overrides the baseline generative diet plan for all regular users.</li>
                            <li><strong>Exclusive Plans:</strong> Takes top precedence on the targeted user's Diet Plans page.</li>
                            <li><strong>Clinical Directives:</strong> Dispatched in real time to the user's notification center and highlighted on their Progress Tracking page.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DietPlanBuilder;
