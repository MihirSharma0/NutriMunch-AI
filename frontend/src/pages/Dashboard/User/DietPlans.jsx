import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';

const DietPlans = () => {
    const { user } = useContext(AuthContext);

    const [activePlan, setActivePlan] = useState(null);
    const [planType, setPlanType] = useState('DEFAULT'); // 'EXCLUSIVE', 'GENERAL', 'DEFAULT'
    const [clinicalDirective, setClinicalDirective] = useState(null);

    const loadActiveDietPlan = () => {
        if (!user) return;

        const currentUserId = String(user.id || user.userId || '');
        const currentUserEmail = (user.email || '').toLowerCase().trim();

        // 1. Check for Exclusive Diet Plan for THIS user
        try {
            const rawExclusive = localStorage.getItem('nutrimunch_exclusive_diet_plans');
            if (rawExclusive) {
                const exclusiveMap = JSON.parse(rawExclusive);
                const userPlan = (currentUserId && exclusiveMap[currentUserId]) || 
                                 (currentUserEmail && exclusiveMap[currentUserEmail]);
                if (userPlan) {
                    setActivePlan(userPlan);
                    setPlanType('EXCLUSIVE');

                    // If directive is inside plan or in directives storage
                    if (userPlan.clinicalDirective) {
                        setClinicalDirective({
                            message: userPlan.clinicalDirective,
                            dietitianName: userPlan.dietitianName || 'Certified Clinical Dietitian',
                            time: 'Active Order'
                        });
                    }
                    return;
                }
            }
        } catch (e) {
            console.error('Error loading exclusive diet plan:', e);
        }

        // 2. Check for General Diet Plan (Published to ALL users)
        try {
            const rawGeneral = localStorage.getItem('nutrimunch_general_diet_plan');
            if (rawGeneral) {
                const generalPlan = JSON.parse(rawGeneral);
                if (generalPlan) {
                    setActivePlan(generalPlan);
                    setPlanType('GENERAL');
                    setClinicalDirective(null);
                    return;
                }
            }
        } catch (e) {
            console.error('Error loading general diet plan:', e);
        }

        // 3. Fallback to default
        setActivePlan(null);
        setPlanType('DEFAULT');
        setClinicalDirective(null);
    };

    // Also look for live clinical directives in storage for this user
    const checkDirectives = () => {
        if (!user) return;
        try {
            const currentUserId = String(user.id || user.userId || '');
            const currentUserEmail = (user.email || '').toLowerCase().trim();
            const stored = JSON.parse(localStorage.getItem('nutrimunch_clinical_directives') || '[]');
            
            const userDirective = stored.find(d => 
                (currentUserId && String(d.targetUserId) === currentUserId) ||
                (currentUserEmail && String(d.targetEmail || '').toLowerCase() === currentUserEmail)
            );

            if (userDirective) {
                setClinicalDirective({
                    message: userDirective.message,
                    dietitianName: userDirective.dietitianName || 'Verified Clinical Dietitian',
                    time: userDirective.time || 'Live Directive'
                });
            }
        } catch (e) {}
    };

    useEffect(() => {
        loadActiveDietPlan();
        checkDirectives();

        window.addEventListener('nutrimunch_diet_plan_updated', loadActiveDietPlan);
        window.addEventListener('nutrimunch_notification_added', checkDirectives);
        window.addEventListener('storage', () => {
            loadActiveDietPlan();
            checkDirectives();
        });

        return () => {
            window.removeEventListener('nutrimunch_diet_plan_updated', loadActiveDietPlan);
            window.removeEventListener('nutrimunch_notification_added', checkDirectives);
        };
    }, [user]);

    if (!user) {
        return <FeatureGate />;
    }

    // Default Fallback Meals
    const defaultMeals = [
        {
            id: 1,
            time: '08:00 AM',
            name: 'Kinetic Synthesis Bowl',
            mealType: 'Breakfast',
            ingredients: 'Oats, Whey Isolate, Mixed Berries, Chia Seeds',
            calories: 450,
            protein: 35,
            carbs: 45,
            fats: 12,
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCP3nQl8b8LU4xjhNKoFcksaAJAjAhTnIGG2n1OFkuoOSwfz2dP7FAXSAOYxRMQnk-7DuXqJnLBChFdrlYZYn7QRk44BaFOFR2McC9ByzI_n03ycyhSZau2fg6iJK1GAFUkV4y7UukilqbSfJNx3Q8s0FvRM0-MajLqixc-NBO9J64ponXllcmORWHcgIeBm5dZrQfkN2U7pz_JafhB_yLLV-RpZx1y4M7u03vzO6MnM8K3Da2D98Hb"
        },
        {
            id: 2,
            time: '01:00 PM',
            name: 'Neural Broth & Quinoa Bowl',
            mealType: 'Lunch',
            ingredients: 'Chicken Bone Broth, Quinoa, Bok Choy, Wild Greens',
            calories: 650,
            protein: 55,
            carbs: 60,
            fats: 20,
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZLrZKLb7jzMmFQ5c6qGbPfOriSTc2BC_huR3PJJqupenaW5lWxSI7_t5rEsctSs00W6MwL6qe-qHTKrEjUZAEjRruf0uHFev2ubNwTi4kWIBFgSVq9eO-2GXDO-gHwKpeCq41OZyuAkBa0fNoruRCpaRGqXAPY7wcb-m01KQ-q4hj5mEWx3oKu0Jdv0Iv-jfmt0C8yuj48YFkyamuApv5yVIztLtfvuR9f3xAvA3JU1uCRp1uckTy"
        },
        {
            id: 3,
            time: '07:30 PM',
            name: 'REM Cycle Extract',
            mealType: 'Dinner',
            ingredients: 'Wild Salmon, Sweet Potato, Asparagus, Avocado Oil',
            calories: 700,
            protein: 50,
            carbs: 55,
            fats: 28,
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAW563tK2alaIdKa-cuEfnJW_382lfBQKNmuA-kMrz16M4r0j_X2E-NwzxGnDRl0tocPS3FptCrFu8YlmyZVNj3JFmfqOmLXYrG0ZwVT8uy224ZUKl3NEzQCmKUTO2msjUepTc_nVcKorAi6FUfm_iG51_uMfIOsUZ6jT5AARtHZZqyjyDau5TLry4qgYRmogxwX3RY3MnDdtrqs7kp4S-dvhaj0IMgdKyGytNOKy-15cE-Ml0DX-bU"
        }
    ];

    const currentCalories = activePlan?.calories || 2100;
    const currentProtein = activePlan?.protein || 140;
    const currentCarbs = activePlan?.carbs || 180;
    const currentFats = activePlan?.fats || 60;
    const currentMeals = activePlan?.meals && activePlan.meals.length > 0 ? activePlan.meals : defaultMeals;

    return (
        <div className="w-full pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white mb-1">Diet Plans</h1>
                    <p className="text-white/50 text-xs sm:text-sm">
                        {planType === 'EXCLUSIVE'
                            ? `Personalized Clinical Protocol prescribed directly by ${activePlan?.dietitianName || 'your Dietitian'}`
                            : planType === 'GENERAL'
                            ? `Verified General Diet Protocol by ${activePlan?.dietitianName || 'Clinical Dietitian'}`
                            : 'AI-Calibrated Precision Nutrition & Macro Formulation'}
                    </p>
                </div>

                {/* Plan Scope Badge */}
                <div>
                    {planType === 'EXCLUSIVE' ? (
                        <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/20 to-[#a5d391]/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 shadow-lg">
                            <span className="material-symbols-outlined text-base text-amber-400">verified</span>
                            <span>Exclusive Patient Protocol</span>
                        </div>
                    ) : planType === 'GENERAL' ? (
                        <div className="px-4 py-2 rounded-2xl bg-[#a5d391]/20 border border-[#a5d391]/40 text-[#a5d391] text-xs font-bold flex items-center gap-2 shadow-lg">
                            <span className="material-symbols-outlined text-base">public</span>
                            <span>General Clinical Diet Plan</span>
                        </div>
                    ) : (
                        <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/20 text-white/80 text-xs font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-[#a5d391]">smart_toy</span>
                            <span>AI Baseline Protocol</span>
                        </div>
                    )}
                </div>
            </div>

            {/* LIVE CLINICAL DIRECTIVE BANNER (If Exclusive or Available) */}
            {clinicalDirective && (
                <div className="mb-8 p-6 rounded-[2rem] bg-gradient-to-r from-amber-500/15 via-[#080b12] to-black border border-amber-500/40 shadow-xl relative overflow-hidden animate-fadeIn">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/40 shadow-inner">
                            <span className="material-symbols-outlined text-2xl">health_and_safety</span>
                        </div>
                        <div className="space-y-1 flex-grow">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-xs font-bold text-amber-300 uppercase tracking-widest flex items-center gap-2">
                                    <span>Active Clinical Directive</span>
                                    <span className="text-[10px] text-white/40 font-normal">• Prescribed by {clinicalDirective.dietitianName}</span>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-500/30 text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                                    Live Prescription
                                </span>
                            </div>
                            <p className="text-sm text-white font-medium italic leading-relaxed pt-1">
                                "{clinicalDirective.message}"
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Diet Protocol */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-[#a5d391]/10 blur-[70px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10 gap-4">
                            <div>
                                <h2 className="text-2xl font-bold mb-1 font-hero-display text-white">
                                    {activePlan?.title || "Today's Active Formulation"}
                                </h2>
                                <p className="text-white/50 text-xs sm:text-sm">
                                    Target: <span className="text-[#a5d391] font-bold">{currentCalories.toLocaleString()} kcal</span> • Macro Distribution: <span className="text-white font-semibold">{currentProtein}P / {currentCarbs}C / {currentFats}F</span>
                                </p>
                            </div>
                            <span className="bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30 px-3.5 py-1 text-xs font-bold uppercase tracking-widest rounded-full backdrop-blur-md">
                                {planType === 'EXCLUSIVE' ? 'Exclusive' : planType === 'GENERAL' ? 'Verified Public' : 'Optimized'}
                            </span>
                        </div>

                        {activePlan?.notes && (
                            <div className="mb-6 p-4 rounded-2xl bg-black/40 border border-white/10 text-xs text-white/70 italic">
                                "{activePlan.notes}"
                            </div>
                        )}

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
                    </div>
                </div>

                {/* Right Sidebar: Macros Breakdown & Grocery List */}
                <div className="space-y-6">
                    {/* Macro Breakdown Card */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl space-y-4">
                        <h3 className="font-bold text-base font-hero-display text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#a5d391]">pie_chart</span>
                            Macro Thresholds
                        </h3>

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

                        <div className="pt-2 text-xs text-white/50 flex justify-between items-center border-t border-white/5">
                            <span>Caloric Density:</span>
                            <strong className="text-white">{currentCalories} kcal</strong>
                        </div>
                        <div className="text-xs text-white/50 flex justify-between items-center">
                            <span>Hydration Goal:</span>
                            <strong className="text-cyan-300">{activePlan?.waterLiters || '2.8'} Liters</strong>
                        </div>
                    </div>

                    {/* Grocery List */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
                        <h3 className="font-bold mb-4 flex items-center gap-2 font-hero-display text-white">
                            <span className="material-symbols-outlined text-[#a5d391]">shopping_cart</span>
                            Grocery List
                        </h3>
                        <p className="text-white/50 text-xs mb-4">Compiled from your active daily meal schedule.</p>
                        
                        <div className="space-y-2.5 mb-6 text-xs">
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="accent-[#a5d391] w-4 h-4 rounded cursor-pointer" defaultChecked />
                                <span className="text-white/90">Steel-cut Oats & Blueberries</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="accent-[#a5d391] w-4 h-4 rounded cursor-pointer" defaultChecked />
                                <span className="text-white/90">Wild Caught Salmon Fillets</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="accent-[#a5d391] w-4 h-4 rounded cursor-pointer" />
                                <span className="text-white/90">Organic Quinoa & Bok Choy</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="accent-[#a5d391] w-4 h-4 rounded cursor-pointer" />
                                <span className="text-white/90">Lean Ground Turkey (170g)</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="accent-[#a5d391] w-4 h-4 rounded cursor-pointer" />
                                <span className="text-white/90">Greek Yogurt & Raw Walnuts</span>
                            </div>
                        </div>

                        <button className="w-full bg-[#080b12]/80 border border-white/10 hover:border-[#a5d391]/30 text-white font-bold py-3 rounded-2xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-sm text-[#a5d391]">download</span>
                            <span>Export Grocery Order</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DietPlans;
