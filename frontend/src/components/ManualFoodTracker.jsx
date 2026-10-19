import React, { useState, useEffect, useRef } from 'react';
import { searchFoodDatabase, FOOD_DATABASE } from '../data/foodDatabase';
import api from '../api/axios';

const MEAL_TYPES = [
    { id: 'Breakfast', label: 'Breakfast', icon: 'wb_twilight' },
    { id: 'Lunch', label: 'Lunch', icon: 'light_mode' },
    { id: 'Dinner', label: 'Dinner', icon: 'dark_mode' },
    { id: 'Snack', label: 'Snack', icon: 'cookie' }
];

const ManualFoodTracker = ({ customTargets = {} }) => {
    // Current date for local log partitioning
    const todayStr = new Date().toISOString().split('T')[0];
    const storageKey = `nutrimunch_logged_foods_${todayStr}`;

    // Search & Selection State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedFood, setSelectedFood] = useState(null);
    const [servingMultiplier, setServingMultiplier] = useState(1);
    const [selectedMeal, setSelectedMeal] = useState('Breakfast');
    const [feedbackMessage, setFeedbackMessage] = useState(null);

    // Today's Logged Foods List
    const [loggedFoods, setLoggedFoods] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    const searchContainerRef = useRef(null);

    // Save to localStorage whenever loggedFoods changes
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(loggedFoods));
        } catch (e) {
            console.error('Failed to save logged foods:', e);
        }
    }, [loggedFoods, storageKey]);

    // Handle outside clicks to close autocomplete dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Instant search handler
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.trim().length > 0) {
            const results = searchFoodDatabase(query, 12);
            setSearchResults(results);
            setIsDropdownOpen(true);
        } else {
            setSearchResults([]);
            setIsDropdownOpen(false);
        }
    };

    // Selecting a food from the autocomplete results
    const handleSelectFood = (food) => {
        setSelectedFood(food);
        setServingMultiplier(1);
        setIsDropdownOpen(false);
        setSearchQuery(food.name);
    };

    // Add selected food to today's intake
    const handleAddToIntake = () => {
        if (!selectedFood) return;

        const mult = Math.max(0.1, parseFloat(servingMultiplier) || 1);
        const newEntry = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            foodId: selectedFood.id,
            name: selectedFood.name,
            category: selectedFood.category,
            mealType: selectedMeal,
            servingSize: selectedFood.servingSize,
            multiplier: mult,
            calories: Math.round(selectedFood.calories * mult),
            protein: parseFloat((selectedFood.protein * mult).toFixed(1)),
            carbs: parseFloat((selectedFood.carbs * mult).toFixed(1)),
            fats: parseFloat((selectedFood.fats * mult).toFixed(1)),
            fiber: parseFloat((selectedFood.fiber * mult).toFixed(1)),
            loggedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };

        const updatedList = [newEntry, ...loggedFoods];
        setLoggedFoods(updatedList);

        // Feedback toast
        setFeedbackMessage({
            type: 'success',
            text: `Added ${newEntry.name} (${newEntry.calories} kcal) to ${selectedMeal}!`
        });
        setTimeout(() => setFeedbackMessage(null), 3500);

        // Sync with backend progress logs if available
        const totalCals = updatedList.reduce((acc, curr) => acc + curr.calories, 0);
        api.post('/progress/me', {
            logDate: todayStr,
            caloriesConsumed: totalCals,
            notes: `Logged ${newEntry.name} (${newEntry.calories} kcal) for ${selectedMeal}. Total daily: ${totalCals} kcal`
        }).catch(() => {
            // Offline fallback
        });

        // Reset search & selection
        setSelectedFood(null);
        setSearchQuery('');
        setServingMultiplier(1);
    };

    // Remove single logged item
    const handleRemoveItem = (id) => {
        const itemToRemove = loggedFoods.find(i => i.id === id);
        const updatedList = loggedFoods.filter(i => i.id !== id);
        setLoggedFoods(updatedList);

        setFeedbackMessage({
            type: 'info',
            text: `Removed ${itemToRemove ? itemToRemove.name : 'item'} from intake.`
        });
        setTimeout(() => setFeedbackMessage(null), 3000);

        // Recalculate and update backend
        const totalCals = updatedList.reduce((acc, curr) => acc + curr.calories, 0);
        api.post('/progress/me', {
            logDate: todayStr,
            caloriesConsumed: totalCals,
            notes: `Removed item. Total daily calories: ${totalCals} kcal`
        }).catch(() => {});
    };

    // Clear all logged foods today
    const handleClearToday = () => {
        if (window.confirm("Are you sure you want to reset all logged meals for today?")) {
            setLoggedFoods([]);
            setFeedbackMessage({ type: 'info', text: "Today's logged intake has been reset." });
            setTimeout(() => setFeedbackMessage(null), 3000);
            api.post('/progress/me', {
                logDate: todayStr,
                caloriesConsumed: 0,
                notes: `Daily food intake reset.`
            }).catch(() => {});
        }
    };

    // Auto Daily Nutrition Totals Calculation
    const dailyTotals = loggedFoods.reduce((acc, item) => ({
        calories: acc.calories + (item.calories || 0),
        protein: acc.protein + (item.protein || 0),
        carbs: acc.carbs + (item.carbs || 0),
        fats: acc.fats + (item.fats || 0),
        fiber: acc.fiber + (item.fiber || 0)
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });

    // Target fallbacks
    const targetCalories = parseInt(customTargets.calories, 10) || 2000;
    const targetProtein = parseInt(customTargets.protein, 10) || 140;
    const targetCarbs = parseInt(customTargets.carbs, 10) || 200;
    const targetFats = parseInt(customTargets.fats, 10) || 65;
    const targetFiber = parseInt(customTargets.fiber, 10) || 28;

    // Macro progress percentages
    const calPercent = targetCalories > 0 ? Math.min(Math.round((dailyTotals.calories / targetCalories) * 100), 100) : 0;
    const calRemaining = Math.max(targetCalories - dailyTotals.calories, 0);
    const calOver = dailyTotals.calories > targetCalories ? dailyTotals.calories - targetCalories : 0;

    const proteinPercent = targetProtein > 0 ? Math.min(Math.round((dailyTotals.protein / targetProtein) * 100), 100) : 0;
    const carbsPercent = targetCarbs > 0 ? Math.min(Math.round((dailyTotals.carbs / targetCarbs) * 100), 100) : 0;
    const fatsPercent = targetFats > 0 ? Math.min(Math.round((dailyTotals.fats / targetFats) * 100), 100) : 0;
    const fiberPercent = targetFiber > 0 ? Math.min(Math.round((dailyTotals.fiber / targetFiber) * 100), 100) : 0;

    // Current preview calculation for selected food
    const activeMultiplier = Math.max(0.1, parseFloat(servingMultiplier) || 1);
    const previewCalories = selectedFood ? Math.round(selectedFood.calories * activeMultiplier) : 0;
    const previewProtein = selectedFood ? (selectedFood.protein * activeMultiplier).toFixed(1) : 0;
    const previewCarbs = selectedFood ? (selectedFood.carbs * activeMultiplier).toFixed(1) : 0;
    const previewFats = selectedFood ? (selectedFood.fats * activeMultiplier).toFixed(1) : 0;
    const previewFiber = selectedFood ? (selectedFood.fiber * activeMultiplier).toFixed(1) : 0;

    return (
        <div className="bg-gradient-to-br from-[#0c121e] via-[#080b12] to-[#0c121e] border border-[#a5d391]/30 rounded-[2.5rem] p-6 lg:p-8 shadow-[0_0_50px_rgba(165,211,145,0.12)] relative overflow-hidden space-y-8">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#a5d391]/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#a5d391]/15 text-[#a5d391] border border-[#a5d391]/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(165,211,145,0.25)]">
                        <span className="material-symbols-outlined text-2xl">restaurant_menu</span>
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#a5d391]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#a5d391] animate-pulse"></span>
                            Auto Daily Nutrition Count
                        </div>
                        <h2 className="text-2xl font-bold font-hero-display text-white">Manual Food-Logging</h2>
                        <p className="text-xs text-white/50">Search thousands of common foods, inspect exact macros, and log intake in real time.</p>
                    </div>
                </div>

                {loggedFoods.length > 0 && (
                    <button
                        onClick={handleClearToday}
                        className="self-start sm:self-auto text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-sm">delete_sweep</span>
                        <span>Reset Today's Log</span>
                    </button>
                )}
            </div>

            {/* Notification Banner */}
            {feedbackMessage && (
                <div className={`p-4 rounded-2xl text-xs font-bold border flex items-center gap-2 animate-in fade-in duration-200 ${
                    feedbackMessage.type === 'error'
                        ? 'bg-red-500/15 border-red-500/30 text-red-300'
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                }`}>
                    <span className="material-symbols-outlined text-base">
                        {feedbackMessage.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    <span>{feedbackMessage.text}</span>
                </div>
            )}

            {/* LIVE DAILY NUTRITION CONSUMED METRICS (Auto Daily Nutrition Count) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                {/* Total Calories Card */}
                <div className="bg-[#080b12]/90 border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Calories Consumed</span>
                        <span className="material-symbols-outlined text-amber-400 text-lg">local_fire_department</span>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold text-white">{dailyTotals.calories}</span>
                            <span className="text-xs text-white/50">/ {targetCalories} kcal</span>
                        </div>
                        <div className="w-full bg-white/10 h-2 rounded-full mt-2.5 overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                    dailyTotals.calories > targetCalories ? 'bg-red-400' : 'bg-gradient-to-r from-amber-400 to-[#a5d391]'
                                }`}
                                style={{ width: `${calPercent}%` }}
                            ></div>
                        </div>
                        <div className="text-[10px] text-white/40 mt-1.5 flex justify-between">
                            <span>{calPercent}% of target</span>
                            <span>{calOver > 0 ? `+${calOver} kcal over` : `${calRemaining} kcal left`}</span>
                        </div>
                    </div>
                </div>

                {/* Protein Card */}
                <div className="bg-[#080b12]/90 border border-[#a5d391]/25 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[#a5d391]/70 text-[10px] font-bold uppercase tracking-wider">Protein</span>
                        <span className="material-symbols-outlined text-[#a5d391] text-lg">fitness_center</span>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold text-[#a5d391]">{dailyTotals.protein.toFixed(1)}g</span>
                            <span className="text-xs text-white/50">/ {targetProtein}g</span>
                        </div>
                        <div className="w-full bg-white/10 h-2 rounded-full mt-2.5 overflow-hidden">
                            <div 
                                className="h-full bg-[#a5d391] rounded-full transition-all duration-500"
                                style={{ width: `${proteinPercent}%` }}
                            ></div>
                        </div>
                        <div className="text-[10px] text-[#a5d391]/70 mt-1.5 flex justify-between">
                            <span>{proteinPercent}% target</span>
                            <span>{dailyTotals.protein >= targetProtein ? 'Goal Reached!' : `${(targetProtein - dailyTotals.protein).toFixed(1)}g left`}</span>
                        </div>
                    </div>
                </div>

                {/* Carbs Card */}
                <div className="bg-[#080b12]/90 border border-[#38bdf8]/25 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[#38bdf8]/70 text-[10px] font-bold uppercase tracking-wider">Carbohydrates</span>
                        <span className="material-symbols-outlined text-[#38bdf8] text-lg">grain</span>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold text-[#38bdf8]">{dailyTotals.carbs.toFixed(1)}g</span>
                            <span className="text-xs text-white/50">/ {targetCarbs}g</span>
                        </div>
                        <div className="w-full bg-white/10 h-2 rounded-full mt-2.5 overflow-hidden">
                            <div 
                                className="h-full bg-[#38bdf8] rounded-full transition-all duration-500"
                                style={{ width: `${carbsPercent}%` }}
                            ></div>
                        </div>
                        <div className="text-[10px] text-[#38bdf8]/70 mt-1.5 flex justify-between">
                            <span>{carbsPercent}% target</span>
                            <span>{dailyTotals.carbs >= targetCarbs ? 'Met' : `${(targetCarbs - dailyTotals.carbs).toFixed(1)}g left`}</span>
                        </div>
                    </div>
                </div>

                {/* Fats Card */}
                <div className="bg-[#080b12]/90 border border-yellow-400/25 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-yellow-400/70 text-[10px] font-bold uppercase tracking-wider">Fats</span>
                        <span className="material-symbols-outlined text-yellow-400 text-lg">opacity</span>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold text-yellow-400">{dailyTotals.fats.toFixed(1)}g</span>
                            <span className="text-xs text-white/50">/ {targetFats}g</span>
                        </div>
                        <div className="w-full bg-white/10 h-2 rounded-full mt-2.5 overflow-hidden">
                            <div 
                                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                style={{ width: `${fatsPercent}%` }}
                            ></div>
                        </div>
                        <div className="text-[10px] text-yellow-400/70 mt-1.5 flex justify-between">
                            <span>{fatsPercent}% target</span>
                            <span>{dailyTotals.fats >= targetFats ? 'Met' : `${(targetFats - dailyTotals.fats).toFixed(1)}g left`}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* INTERACTIVE SEARCH & AUTOCOMPLETE LOGGING SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-20">
                {/* Search & Food Picker Column */}
                <div className="lg:col-span-7 space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/70 block">
                        Search Food Repository (Type any name or category)
                    </label>

                    {/* Search Input Box */}
                    <div ref={searchContainerRef} className="relative">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#a5d391] text-xl pointer-events-none">
                                search
                            </span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onFocus={() => {
                                    if (searchQuery.trim().length > 0) setIsDropdownOpen(true);
                                }}
                                placeholder="Type letters (e.g., 'chi' for Chicken, 'oat', 'paneer', 'rice', 'egg')..."
                                className="w-full bg-[#080b12]/95 border border-white/20 focus:border-[#a5d391] pl-12 pr-10 py-3.5 rounded-2xl text-white text-sm outline-none transition-all shadow-inner focus:shadow-[0_0_20px_rgba(165,211,145,0.25)] placeholder:text-white/30"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSearchResults([]);
                                        setIsDropdownOpen(false);
                                    }}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-sm p-1 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-base">close</span>
                                </button>
                            )}
                        </div>

                        {/* Autocomplete Results Dropdown */}
                        {isDropdownOpen && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#080b12]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl max-h-80 overflow-y-auto z-50 divide-y divide-white/5 animate-in fade-in duration-150">
                                <div className="px-4 py-2 text-[10px] font-bold uppercase text-[#a5d391] tracking-wider bg-white/5 flex justify-between items-center">
                                    <span>Matching Repository Results ({searchResults.length})</span>
                                    <span className="text-white/40">Click item to inspect & log</span>
                                </div>
                                {searchResults.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSelectFood(item)}
                                        className="p-3.5 hover:bg-[#a5d391]/15 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-white group-hover:text-[#a5d391] transition-colors truncate">
                                                    {item.name}
                                                </span>
                                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/70 shrink-0">
                                                    {item.category}
                                                </span>
                                            </div>
                                            <div className="text-xs text-white/50 mt-0.5">
                                                Serving: <span className="text-white/80">{item.servingSize}</span>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="font-black text-sm text-[#a5d391] block">
                                                {item.calories} <span className="text-[10px] font-normal text-white/60">kcal</span>
                                            </span>
                                            <span className="text-[10px] text-white/40 font-mono">
                                                P:{item.protein}g · C:{item.carbs}g · F:{item.fats}g
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {isDropdownOpen && searchQuery.trim().length > 0 && searchResults.length === 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#080b12]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-6 text-center text-white/50 text-xs shadow-2xl z-50">
                                No exact food matches found for "{searchQuery}". Try a broader term like "chicken", "salad", "bread", or "rice".
                            </div>
                        )}
                    </div>

                    {/* Quick Popular Picks Pills */}
                    <div className="pt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-2">
                            Quick Frequent Picks
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {['Oatmeal (Cooked)', 'Whole Boiled Egg', 'Grilled Chicken Breast', 'Brown Rice (Cooked)', 'Roti / Whole Wheat Chapati', 'Dal Tadka (Yellow Moong/Toor)', 'Banana (Fresh)', 'Raw Baby Spinach'].map(name => {
                                const matched = FOOD_DATABASE.find(f => f.name.includes(name));
                                if (!matched) return null;
                                return (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => handleSelectFood(matched)}
                                        className="text-xs bg-white/5 hover:bg-[#a5d391]/15 hover:text-[#a5d391] border border-white/10 hover:border-[#a5d391]/30 px-3 py-1.5 rounded-full transition-all text-white/70 cursor-pointer flex items-center gap-1.5"
                                    >
                                        <span>+ {name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Selected Food Inspector & Serving Multiplier Column */}
                <div className="lg:col-span-5 bg-[#080b12]/90 border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
                    {selectedFood ? (
                        <>
                            <div>
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30">
                                        {selectedFood.category}
                                    </span>
                                    <button 
                                        onClick={() => setSelectedFood(null)}
                                        className="text-white/40 hover:text-white text-xs cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                                <h3 className="text-xl font-bold font-hero-display text-white">{selectedFood.name}</h3>
                                <p className="text-xs text-white/50 mt-0.5">Base portion: {selectedFood.servingSize}</p>
                            </div>

                            {/* Serving Multiplier Selector */}
                            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2.5">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-white/70 font-semibold">Serving Multiplier:</span>
                                    <span className="text-base font-black text-[#a5d391]">{activeMultiplier}x</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {[0.5, 1, 1.5, 2, 3].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setServingMultiplier(val)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                activeMultiplier === val 
                                                    ? 'bg-[#a5d391] text-black shadow-sm font-black' 
                                                    : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'
                                            }`}
                                        >
                                            {val}x
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Meal Type Radio Selection */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">Log Under Meal</label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {MEAL_TYPES.map(meal => (
                                        <button
                                            key={meal.id}
                                            type="button"
                                            onClick={() => setSelectedMeal(meal.id)}
                                            className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                                                selectedMeal === meal.id
                                                    ? 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/40'
                                                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/5'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-sm">{meal.icon}</span>
                                            <span className="text-[10px]">{meal.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Live Dynamic Nutritional Info for Selected Quantity */}
                            <div className="grid grid-cols-4 gap-2 p-3 bg-white/5 rounded-xl text-center border border-white/5 text-xs">
                                <div>
                                    <span className="text-[9px] uppercase text-white/40 block">Calories</span>
                                    <strong className="text-amber-400 font-bold text-sm">{previewCalories}</strong>
                                    <span className="text-[9px] text-white/40 block">kcal</span>
                                </div>
                                <div>
                                    <span className="text-[9px] uppercase text-white/40 block">Protein</span>
                                    <strong className="text-[#a5d391] font-bold text-sm">{previewProtein}g</strong>
                                </div>
                                <div>
                                    <span className="text-[9px] uppercase text-white/40 block">Carbs</span>
                                    <strong className="text-[#38bdf8] font-bold text-sm">{previewCarbs}g</strong>
                                </div>
                                <div>
                                    <span className="text-[9px] uppercase text-white/40 block">Fats</span>
                                    <strong className="text-yellow-400 font-bold text-sm">{previewFats}g</strong>
                                </div>
                            </div>

                            {/* Add to Intake Button */}
                            <button
                                type="button"
                                onClick={handleAddToIntake}
                                className="w-full bg-[#a5d391] hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(165,211,145,0.35)] hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-base">add_circle</span>
                                <span>Add to Today's Intake (+{previewCalories} kcal)</span>
                            </button>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/40 space-y-3">
                            <span className="material-symbols-outlined text-4xl text-white/20">search_check</span>
                            <div className="text-sm font-bold text-white/70">No Food Selected</div>
                            <p className="text-xs text-white/40 max-w-xs">
                                Search for any food item on the left, then select it to customize serving portion and add it to your daily nutrition count.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* TODAY'S LOGGED FOODS INTAKE TIMELINE */}
            <div className="pt-4 border-t border-white/10 relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#a5d391] text-lg">history</span>
                        <h3 className="font-bold text-base text-white">Today's Consumed Intake Log</h3>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                            {loggedFoods.length} items logged
                        </span>
                    </div>

                    <div className="text-xs text-white/50">
                        Total Today: <strong className="text-[#a5d391]">{dailyTotals.calories} kcal</strong>
                    </div>
                </div>

                {loggedFoods.length === 0 ? (
                    <div className="bg-[#080b12]/60 border border-dashed border-white/10 rounded-2xl p-8 text-center text-white/40 text-xs">
                        <span className="material-symbols-outlined text-3xl mb-2 text-white/20 block">lunch_dining</span>
                        No foods logged yet today. Use the search box above to log your breakfast, lunch, dinner, or snacks!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                        {loggedFoods.map((item) => (
                            <div
                                key={item.id}
                                className="p-3.5 rounded-xl bg-[#080b12]/80 border border-white/10 hover:border-[#a5d391]/30 transition-all flex items-center justify-between gap-3 group"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#a5d391]/15 text-[#a5d391]">
                                            {item.mealType}
                                        </span>
                                        <span className="font-bold text-xs text-white truncate">{item.name}</span>
                                        <span className="text-[10px] text-white/40">({item.multiplier}x)</span>
                                    </div>
                                    <div className="text-[10px] text-white/50 mt-1 flex items-center gap-2">
                                        <span>{item.loggedAt}</span>
                                        <span>•</span>
                                        <span className="text-white/70">P: {item.protein}g</span>
                                        <span>•</span>
                                        <span className="text-white/70">C: {item.carbs}g</span>
                                        <span>•</span>
                                        <span className="text-white/70">F: {item.fats}g</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="font-extrabold text-sm text-[#a5d391]">
                                        {item.calories} <span className="text-[10px] font-normal text-white/60">kcal</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(item.id)}
                                        title="Remove entry"
                                        className="text-white/30 hover:text-red-400 p-1 transition-colors cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-base">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManualFoodTracker;
