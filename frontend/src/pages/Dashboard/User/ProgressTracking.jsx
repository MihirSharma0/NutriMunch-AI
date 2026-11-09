/**
 * Biometric Progress Tracking & Hydration Suite
 * Real-time daily fluid tracking with circular SVG gauges, weight target calibration,
 * historical progress logging, and manual meal nutrition tracking.
 */
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Droplet, Plus, RotateCcw, CheckCircle2, Sparkles, Edit2, Save, X } from 'lucide-react';
import api from '../../../api/axios';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';
import ManualFoodTracker from '../../../components/ManualFoodTracker';
import DarkCalendarPicker from '../../../components/DarkCalendarPicker';
import { fetchProgressDays, saveDayMetrics, readOfflineDay } from '../../../utils/progressLog';

const DEFAULT_TARGETS = {
    calories: 2000,
    protein: 140,
    carbs: 200,
    fats: 65,
    water: 2.5,
};

/**
 * ProgressTracking Component
 * Interactive hydration rings, weight milestone charts, and daily meal food log interface.
 */
const ProgressTracking = () => {
    const { user } = useContext(AuthContext);
    const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const targetDateFromUrl = queryParams.get('date');
    const targetSectionFromUrl = queryParams.get('section');

    // Dynamic Hydration Target (Fetched from User Profile / localStorage)
    const [waterTargetMl, setWaterTargetMl] = useState(() => {
        const saved = localStorage.getItem('nutrimunch_water_target_liters');
        return saved ? Math.round(parseFloat(saved) * 1000) : 3000;
    });

    // Today and backdated hydration date state
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const yesterdayStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    }, []);

    const [selectedWaterDate, setSelectedWaterDate] = useState(() => targetDateFromUrl || todayStr);

    // Deep-linking navigation: Scroll and highlight requested section from Reports page
    useEffect(() => {
        if (targetDateFromUrl) {
            setSelectedWaterDate(targetDateFromUrl);
        }

        const targetId = targetSectionFromUrl === 'water' || location.hash === '#water-section'
            ? 'water-section'
            : (targetSectionFromUrl === 'nutrition' || location.hash === '#nutrition-section' ? 'nutrition-section' : null);

        if (targetId) {
            const timer = setTimeout(() => {
                const el = document.getElementById(targetId);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-2', 'ring-[#a5d391]', 'ring-offset-4', 'ring-offset-[#080b12]');
                    setTimeout(() => {
                        el.classList.remove('ring-2', 'ring-[#a5d391]', 'ring-offset-4', 'ring-offset-[#080b12]');
                    }, 2500);
                }
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [targetDateFromUrl, targetSectionFromUrl, location.hash]);

    // Water is persisted in the backend progress_logs row for this date.
    const [waterConsumed, setWaterConsumed] = useState(0);
    const [customAmount, setCustomAmount] = useState('');
    const [logSuccessMessage, setLogSuccessMessage] = useState('');

    // Goal Edit Modal State
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [editGoalLiters, setEditGoalLiters] = useState('3.0');
    const [isSavingGoal, setIsSavingGoal] = useState(false);

    // Daily Requirements state
    const [customTargets, setCustomTargets] = useState(DEFAULT_TARGETS);
    const [isEditingRequirements, setIsEditingRequirements] = useState(false);
    const [savingRequirements, setSavingRequirements] = useState(false);
    const [requirementsMessage, setRequirementsMessage] = useState({ type: '', text: '' });



    const fetchTargets = () => {
        api.get('/profiles/me').then(res => {
            if (res.data) {
                const loadedTargets = {
                    calories: res.data.dailyCaloriesTarget || DEFAULT_TARGETS.calories,
                    protein: res.data.proteinTarget || DEFAULT_TARGETS.protein,
                    carbs: res.data.carbsTarget || DEFAULT_TARGETS.carbs,
                    fats: res.data.fatsTarget || DEFAULT_TARGETS.fats,
                    water: res.data.dailyWaterTargetLiters || DEFAULT_TARGETS.water,
                };
                setCustomTargets(loadedTargets);

                if (loadedTargets.water) {
                    const targetLiters = parseFloat(loadedTargets.water);
                    const targetMl = Math.round(targetLiters * 1000);
                    setWaterTargetMl(targetMl);
                    setEditGoalLiters(targetLiters.toString());
                    localStorage.setItem('nutrimunch_water_target_liters', targetLiters.toString());
                }
            }
        }).catch(() => {
            const saved = localStorage.getItem('nutrimunch_water_target_liters');
            if (saved) {
                setWaterTargetMl(Math.round(parseFloat(saved) * 1000));
                setEditGoalLiters(saved);
            }
        });
    };

    const handleCustomTargetChange = (e) => {
        const { name, value } = e.target;
        setCustomTargets(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyDefaultRequirements = () => {
        setCustomTargets(DEFAULT_TARGETS);
        setRequirementsMessage({ type: 'success', text: 'Reset targets to recommended default baseline.' });
        setTimeout(() => setRequirementsMessage({ type: '', text: '' }), 3000);
    };

    const handleSaveRequirements = async () => {
        setSavingRequirements(true);
        const payload = {
            isCustomTargets: true,
            dailyCaloriesTarget: parseInt(customTargets.calories, 10) || DEFAULT_TARGETS.calories,
            proteinTarget: parseInt(customTargets.protein, 10) || DEFAULT_TARGETS.protein,
            carbsTarget: parseInt(customTargets.carbs, 10) || DEFAULT_TARGETS.carbs,
            fatsTarget: parseInt(customTargets.fats, 10) || DEFAULT_TARGETS.fats,
            dailyWaterTargetLiters: parseFloat(customTargets.water) || DEFAULT_TARGETS.water,
        };

        try {
            const res = await api.put('/profiles/me', payload);
            if (res.data) {
                const updatedT = {
                    calories: res.data.dailyCaloriesTarget || customTargets.calories,
                    protein: res.data.proteinTarget || customTargets.protein,
                    carbs: res.data.carbsTarget || customTargets.carbs,
                    fats: res.data.fatsTarget || customTargets.fats,
                    water: res.data.dailyWaterTargetLiters || customTargets.water,
                };
                setCustomTargets(updatedT);
                if (updatedT.water) {
                    const targetLiters = parseFloat(updatedT.water);
                    setWaterTargetMl(Math.round(targetLiters * 1000));
                    setEditGoalLiters(targetLiters.toString());
                    localStorage.setItem('nutrimunch_water_target_liters', targetLiters.toString());
                }
            }
            setIsEditingRequirements(false);
            setRequirementsMessage({ type: 'success', text: 'Daily requirements saved & synced across Profile and Progress Tracking!' });
            window.dispatchEvent(new Event('nutrimunch_profile_updated'));
            setTimeout(() => setRequirementsMessage({ type: '', text: '' }), 4000);
        } catch (err) {
            console.error("Save error in ProgressTracking", err);
            setRequirementsMessage({ type: 'error', text: 'Failed to save daily requirements. Please check input values.' });
            setTimeout(() => setRequirementsMessage({ type: '', text: '' }), 4000);
        } finally {
            setSavingRequirements(false);
        }
    };

    useEffect(() => {
        fetchTargets();
        const handleProfileUpdate = () => {
            fetchTargets();
        };
        window.addEventListener('nutrimunch_profile_updated', handleProfileUpdate);
        window.addEventListener('storage', handleProfileUpdate);
        return () => {
            window.removeEventListener('nutrimunch_profile_updated', handleProfileUpdate);
            window.removeEventListener('storage', handleProfileUpdate);
        };
    }, []);

    // Load the authoritative water value for the selected date from the DB.
    // The old browser keys survive only as a read-only offline fallback.
    useEffect(() => {
        let active = true;
        const load = () => fetchProgressDays()
            .then(days => {
                if (!active) return;
                const day = days[selectedWaterDate];
                setWaterConsumed(day ? day.waterMl : readOfflineDay(selectedWaterDate).waterMl);
            })
            .catch(err => {
                console.error('Failed to load persisted water intake:', err);
                if (active) setWaterConsumed(readOfflineDay(selectedWaterDate).waterMl);
            });
        load();
        window.addEventListener('nutrimunch_progress_updated', load);
        return () => {
            active = false;
            window.removeEventListener('nutrimunch_progress_updated', load);
        };
    }, [selectedWaterDate]);

    if (!user) {
        return <FeatureGate />;
    }

    const handleSaveGoal = async (targetVal) => {
        const valToUse = targetVal || editGoalLiters;
        const liters = parseFloat(valToUse);
        if (!liters || liters <= 0) return;

        setIsSavingGoal(true);
        const ml = Math.round(liters * 1000);
        setWaterTargetMl(ml);
        setCustomTargets(prev => ({ ...prev, water: liters }));
        localStorage.setItem('nutrimunch_water_target_liters', liters.toString());

        try {
            await api.put('/profiles/me', {
                isCustomTargets: true,
                dailyWaterTargetLiters: liters
            });
            setLogSuccessMessage(`Fluid goal updated to ${liters} L (${ml} ml) and saved permanently!`);
            window.dispatchEvent(new Event('nutrimunch_profile_updated'));
        } catch (err) {
            setLogSuccessMessage(`Fluid target updated to ${liters} L (${ml} ml) locally.`);
        } finally {
            setIsSavingGoal(false);
            setIsEditingGoal(false);
            setTimeout(() => setLogSuccessMessage(''), 4000);
        }
    };

    const persistWater = async (next, successText) => {
        const previous = waterConsumed;
        setWaterConsumed(next);
        try {
            const saved = await saveDayMetrics(selectedWaterDate, { waterMl: next });
            setWaterConsumed(saved.waterMl);
            setLogSuccessMessage(successText);
            window.dispatchEvent(new Event('nutrimunch_progress_updated'));
        } catch (err) {
            console.error('Failed to persist water intake:', err);
            setWaterConsumed(previous);
            setLogSuccessMessage('Could not save water intake. Please try again.');
        }
        setTimeout(() => setLogSuccessMessage(''), 4000);
    };

    const handleAddWater = (amount) => {
        persistWater(waterConsumed + amount,
            `Added +${amount} ml fluid for ${selectedWaterDate === todayStr ? 'today' : selectedWaterDate}!`);
    };

    const handleResetWater = () => {
        persistWater(0, `Hydration tracker reset for ${selectedWaterDate === todayStr ? 'today' : selectedWaterDate}.`);
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        const val = parseInt(customAmount, 10);
        if (val && val > 0) {
            handleAddWater(val);
            setCustomAmount('');
        }
    };

    const percentage = waterTargetMl > 0 ? Math.min(Math.round((waterConsumed / waterTargetMl) * 100), 100) : 0;
    const remainingWater = Math.max(waterTargetMl - waterConsumed, 0);

    return (
        <div className="w-full text-slate-800 dark:text-white space-y-8">
            {/* Header Title */}
            <div>
                <span className="text-emerald-700 dark:text-[#a5d391] text-xs font-bold uppercase tracking-widest block mb-1">Biometric & Fluid Tracking</span>
                <h1 className="text-3xl font-bold font-hero-display tracking-tight text-slate-900 dark:text-white">Progress & Smart Hydration Tracker</h1>
            </div>


            {/* 1. Smart Hydration Tracker Section */}
            <div id="water-section" className="scroll-mt-24 bg-white/90 dark:bg-gradient-to-br dark:from-[#0d131f] dark:to-[#080b12] border border-slate-200 dark:border-[#a5d391]/30 rounded-[2.5rem] p-6 lg:p-8 shadow-md dark:shadow-[0_0_50px_rgba(165,211,145,0.15)] relative space-y-6 transition-all duration-300">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-500/10 dark:bg-[#a5d391]/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Backdated Date Selector Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4 relative z-30">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sky-700 dark:text-[#38bdf8] text-xl">water_drop</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Hydration Target Date:</span>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            selectedWaterDate === todayStr 
                                ? 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-[#38bdf8]/15 dark:text-[#38bdf8] dark:border-[#38bdf8]/30' 
                                : 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-400/15 dark:text-amber-300 dark:border-amber-400/30'
                        }`}>
                            {selectedWaterDate === todayStr ? 'Today (Live)' : `Backdated (${selectedWaterDate})`}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <DarkCalendarPicker
                            value={selectedWaterDate}
                            onChange={(val) => setSelectedWaterDate(val)}
                            maxDate={todayStr}
                            mode="day"
                        />
                        <button
                            type="button"
                            onClick={() => setSelectedWaterDate(todayStr)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                selectedWaterDate === todayStr ? 'bg-emerald-700 text-white dark:bg-[#a5d391] dark:text-black border-emerald-700 dark:border-[#a5d391]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:text-white/60 dark:hover:text-white border-slate-300 dark:border-white/10'
                            }`}
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedWaterDate(yesterdayStr)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                selectedWaterDate === yesterdayStr ? 'bg-emerald-700 text-white dark:bg-[#a5d391] dark:text-black border-emerald-700 dark:border-[#a5d391]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:text-white/60 dark:hover:text-white border-slate-300 dark:border-white/10'
                            }`}
                        >
                            Yesterday
                        </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
                    {/* Left: Interactive Circular Progress Ring */}
                    <div className="flex items-center gap-6">
                        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    className="stroke-slate-200 dark:stroke-white/10"
                                    strokeWidth="10"
                                    fill="transparent"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    className="stroke-emerald-600 dark:stroke-[#a5d391] transition-all duration-700 ease-out"
                                    strokeWidth="10"
                                    strokeDasharray={263.89}
                                    strokeDashoffset={263.89 - (263.89 * percentage) / 100}
                                    strokeLinecap="round"
                                    fill="transparent"
                                />
                            </svg>
                            <div className="absolute text-center flex flex-col items-center justify-center">
                                <Droplet className="w-5 h-5 text-emerald-700 dark:text-[#a5d391] mb-0.5 animate-bounce" />
                                <span className="text-2xl font-black font-hero-display leading-none text-slate-900 dark:text-white">{percentage}%</span>
                                <span className="text-[10px] text-slate-500 dark:text-white/50 font-bold uppercase tracking-wider mt-0.5">Hydrated</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-[#a5d391]/10 dark:text-[#a5d391] dark:border-[#a5d391]/30 text-xs font-bold">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Daily Fluid Goal</span>
                                </div>
                                <button
                                    onClick={() => setIsEditingGoal(true)}
                                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 hover:text-slate-900 border border-slate-300 dark:bg-white/5 dark:hover:bg-[#a5d391]/20 dark:text-white/70 dark:hover:text-[#a5d391] dark:border-white/10 transition-all cursor-pointer flex items-center gap-1 font-bold"
                                >
                                    <Edit2 className="w-3 h-3 text-emerald-700 dark:text-[#a5d391]" />
                                    <span>Edit Goal</span>
                                </button>
                            </div>
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white font-hero-display">
                                {waterConsumed.toLocaleString()} <span className="text-base text-slate-500 dark:text-white/50 font-normal">/ {waterTargetMl.toLocaleString()} ml</span>
                            </h2>
                            <p className="text-xs text-slate-600 dark:text-white/60">
                                {remainingWater > 0 
                                    ? `Need ${remainingWater.toLocaleString()} ml more to reach optimal fluid target.`
                                    : '🎉 Daily hydration goal achieved! Excellent fluid balance.'}
                            </p>
                            {logSuccessMessage && (
                                <div className="text-xs font-bold text-emerald-700 dark:text-[#a5d391] flex items-center gap-1 pt-1 animate-pulse">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{logSuccessMessage}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Edit Fluid Goal Popover / Modal Overlay */}
                    {isEditingGoal && (
                        <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-8 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                            <div className="bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-[#a5d391]/40 rounded-3xl p-6 max-w-md w-full shadow-2xl dark:shadow-[0_0_50px_rgba(165,211,145,0.2)] relative text-slate-900 dark:text-white space-y-5 animate-in fade-in zoom-in-95 max-h-[80vh] overflow-y-auto my-auto">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                                    <div className="flex items-center gap-2">
                                        <Droplet className="w-5 h-5 text-emerald-700 dark:text-[#a5d391]" />
                                        <h3 className="text-lg font-bold font-hero-display text-slate-900 dark:text-white">Update Fluid Target</h3>
                                    </div>
                                    <button
                                        onClick={() => setIsEditingGoal(false)}
                                        className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/60 dark:hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed">
                                    Set your custom daily water target. Updating here automatically syncs with your <strong className="text-slate-900 dark:text-white">Profile</strong> and persists permanently.
                                </p>

                                {/* Preset Goal Options */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-[#a5d391]">Quick Presets</label>
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                        {['2.0', '2.5', '3.0', '3.5', '4.0'].map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => {
                                                    setEditGoalLiters(preset);
                                                    handleSaveGoal(preset);
                                                }}
                                                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                                    editGoalLiters === preset 
                                                        ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-[#a5d391] dark:text-black dark:border-[#a5d391]' 
                                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white dark:border-white/10'
                                                }`}
                                            >
                                                {preset} L
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Liters Input */}
                                <form onSubmit={(e) => { e.preventDefault(); handleSaveGoal(); }} className="space-y-4 pt-1">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-white/70 block mb-1">
                                            Custom Target (Liters)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0.5"
                                                max="10.0"
                                                value={editGoalLiters}
                                                onChange={(e) => setEditGoalLiters(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-[#080b12] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-bold outline-none focus:border-emerald-600 dark:focus:border-[#a5d391]"
                                                placeholder="e.g. 3.5"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 dark:text-white/40">Liters</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingGoal(false)}
                                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/70 font-bold text-xs"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSavingGoal}
                                            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#a5d391] dark:hover:bg-[#8ec478] dark:text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            <span>{isSavingGoal ? 'Saving & Syncing...' : 'Save & Sync with Profile'}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Right: Quick Water Logging Action Buttons */}
                    <div className="flex flex-col gap-3 w-full lg:w-auto">
                        <div className="text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider text-center lg:text-left">
                            Quick Add Fluid Intake
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <button
                                onClick={() => handleAddWater(250)}
                                className="px-4 py-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 dark:bg-white/5 dark:hover:bg-[#a5d391]/20 dark:border-white/10 dark:hover:border-[#a5d391]/50 dark:text-white dark:hover:text-[#a5d391] transition-all cursor-pointer flex flex-col items-center gap-1 text-xs font-bold group shadow-sm"
                            >
                                <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">local_drink</span>
                                <span>+250 ml</span>
                            </button>
                            <button
                                onClick={() => handleAddWater(500)}
                                className="px-4 py-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 dark:bg-white/5 dark:hover:bg-[#a5d391]/20 dark:border-white/10 dark:hover:border-[#a5d391]/50 dark:text-white dark:hover:text-[#a5d391] transition-all cursor-pointer flex flex-col items-center gap-1 text-xs font-bold group shadow-sm"
                            >
                                <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">water_full</span>
                                <span>+500 ml</span>
                            </button>
                            <button
                                onClick={() => handleAddWater(750)}
                                className="px-4 py-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 dark:bg-white/5 dark:hover:bg-[#a5d391]/20 dark:border-white/10 dark:hover:border-[#a5d391]/50 dark:text-white dark:hover:text-[#a5d391] transition-all cursor-pointer flex flex-col items-center gap-1 text-xs font-bold group shadow-sm"
                            >
                                <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">sports_bar</span>
                                <span>+750 ml</span>
                            </button>
                            <button
                                onClick={() => handleAddWater(1000)}
                                className="px-4 py-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 dark:bg-white/5 dark:hover:bg-[#a5d391]/20 dark:border-white/10 dark:hover:border-[#a5d391]/50 dark:text-white dark:hover:text-[#a5d391] transition-all cursor-pointer flex flex-col items-center gap-1 text-xs font-bold group shadow-sm"
                            >
                                <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">water_bottle</span>
                                <span>+1000 ml</span>
                            </button>
                        </div>

                        {/* Custom Input & Reset Bar */}
                        <div className="flex items-center gap-2 pt-1">
                            <form onSubmit={handleCustomSubmit} className="flex-1 flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder="Custom ml (e.g. 350)"
                                    value={customAmount}
                                    onChange={(e) => setCustomAmount(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#080b12] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-emerald-600 dark:focus:border-[#a5d391] outline-none shadow-sm"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#a5d391] dark:text-black dark:hover:bg-[#8ec478] font-bold text-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 shadow-sm"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add</span>
                                </button>
                            </form>
                            <button
                                onClick={handleResetWater}
                                title="Reset Today's Water"
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 dark:text-white/50 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Manual Food-Logging & Auto Daily Nutrition Count */}
            <div id="nutrition-section" className="scroll-mt-24 transition-all duration-300 rounded-[2.5rem]">
                <ManualFoodTracker customTargets={customTargets} initialDate={targetDateFromUrl} />
            </div>

            {/* 3. Daily Requirements Section */}
            <div className="bg-white/95 border border-slate-200/90 shadow-xl dark:bg-gradient-to-r dark:from-emerald-950/40 dark:via-white/5 dark:to-[#a5d391]/10 dark:backdrop-blur-xl dark:border-[#a5d391]/40 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-emerald-700 dark:text-[#a5d391] text-3xl">tune</span>
                        <div>
                            <h3 className="text-xl font-bold font-hero-display text-slate-900 dark:text-white">Daily Requirements</h3>
                            <p className="text-xs text-slate-600 dark:text-white/50">
                                {isEditingRequirements 
                                    ? 'Fill your daily nutrition targets manually below or click "Default Baseline".' 
                                    : 'Active daily target protocol driving AI meal generation and progress tracking.'}
                            </p>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        {!isEditingRequirements ? (
                            <button
                                type="button"
                                onClick={() => setIsEditingRequirements(true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#a5d391] dark:hover:bg-white dark:text-black px-5 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-md shadow-emerald-600/20 dark:shadow-[0_0_15px_rgba(165,211,145,0.3)] cursor-pointer flex items-center gap-2 whitespace-nowrap"
                            >
                                <span className="material-symbols-outlined text-sm">edit</span>
                                <span>Edit Requirements</span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleApplyDefaultRequirements}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-transparent px-4 py-2 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-sm">restart_alt</span>
                                    <span>Default Baseline</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingRequirements(false)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white/70 dark:border-transparent px-4 py-2 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveRequirements}
                                    disabled={savingRequirements}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#a5d391] dark:hover:bg-white dark:text-black px-5 py-2 rounded-2xl font-bold text-xs transition-all cursor-pointer shadow-md shadow-emerald-600/20 dark:shadow-[0_0_15px_rgba(165,211,145,0.3)] flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-sm">save</span>
                                    <span>{savingRequirements ? 'Saving...' : 'Save'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Feedback Notification Banner */}
                {requirementsMessage.text && (
                    <div className={`mb-6 p-4 rounded-2xl text-xs font-bold border flex items-center gap-2 animate-in fade-in duration-200 ${
                        requirementsMessage.type === 'error'
                            ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    }`}>
                        <span className="material-symbols-outlined text-sm">
                            {requirementsMessage.type === 'error' ? 'error' : 'check_circle'}
                        </span>
                        <span>{requirementsMessage.text}</span>
                    </div>
                )}

                {/* VISUAL STATE A: LOCKED IN SAVED TARGET PROTOCOL CARD VIEW */}
                {!isEditingRequirements ? (
                    <div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-slate-50 border border-slate-200 dark:bg-[#080b12]/90 dark:border-white/10 p-4 rounded-2xl text-center shadow-sm">
                                <div className="text-slate-500 dark:text-white/40 text-[10px] font-bold uppercase tracking-wider mb-1">Daily Calories</div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{customTargets.calories || 2000} <span className="text-xs font-normal text-slate-500 dark:text-white/50">kcal</span></div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 dark:bg-[#080b12]/90 dark:border-white/10 p-4 rounded-2xl text-center shadow-sm">
                                <div className="text-emerald-700 dark:text-[#a5d391]/70 text-[10px] font-bold uppercase tracking-wider mb-1">Protein Target</div>
                                <div className="text-2xl font-bold text-emerald-700 dark:text-[#a5d391]">{customTargets.protein || 140} <span className="text-xs font-normal text-emerald-600/70 dark:text-[#a5d391]/70">g</span></div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 dark:bg-[#080b12]/90 dark:border-white/10 p-4 rounded-2xl text-center shadow-sm">
                                <div className="text-sky-700 dark:text-[#38bdf8]/70 text-[10px] font-bold uppercase tracking-wider mb-1">Carbs Target</div>
                                <div className="text-2xl font-bold text-sky-700 dark:text-[#38bdf8]">{customTargets.carbs || 200} <span className="text-xs font-normal text-sky-600/70 dark:text-[#38bdf8]/70">g</span></div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 dark:bg-[#080b12]/90 dark:border-white/10 p-4 rounded-2xl text-center shadow-sm">
                                <div className="text-amber-700 dark:text-yellow-400/70 text-[10px] font-bold uppercase tracking-wider mb-1">Fats Target</div>
                                <div className="text-2xl font-bold text-amber-700 dark:text-yellow-400">{customTargets.fats || 65} <span className="text-xs font-normal text-amber-600/70 dark:text-yellow-400/70">g</span></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 pt-4 border-t border-slate-200 dark:border-white/10 text-xs">
                            <div className="flex items-center gap-2 text-slate-800 dark:text-white/80 bg-slate-50 dark:bg-[#080b12]/60 p-3 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                                <span className="material-symbols-outlined text-sky-600 dark:text-[#38bdf8] text-sm">water_drop</span>
                                <span>Water: <strong className="text-slate-900 dark:text-white">{customTargets.water || 2.5} L</strong></span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* VISUAL STATE B: FORM INPUT EDITING MODE */
                    <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-slate-50 border border-slate-200 dark:bg-[#080b12]/90 dark:border-white/10 p-4 rounded-2xl shadow-sm">
                                <div className="text-slate-600 dark:text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">Daily Calories (kcal)</div>
                                <input
                                    type="number"
                                    name="calories"
                                    value={customTargets.calories}
                                    onChange={handleCustomTargetChange}
                                    className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-[#38bdf8]/40 px-3 py-2 rounded-xl text-xl font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-600 dark:focus:border-[#38bdf8] shadow-sm"
                                    placeholder="e.g. 2000"
                                />
                            </div>

                            <div className="bg-slate-50 border border-slate-200 dark:bg-[#080b12]/90 dark:border-white/10 p-4 rounded-2xl shadow-sm">
                                <div className="text-emerald-700 dark:text-[#a5d391]/70 text-[10px] font-bold uppercase tracking-wider mb-2">Protein Target (g)</div>
                                <input
                                    type="number"
                                    name="protein"
                                    value={customTargets.protein}
                                    onChange={handleCustomTargetChange}
                                    className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-[#a5d391]/40 px-3 py-2 rounded-xl text-xl font-bold text-emerald-700 dark:text-[#a5d391] outline-none focus:border-emerald-600 dark:focus:border-[#a5d391] shadow-sm"
                                    placeholder="e.g. 140"
                                />
                            </div>

                            <div className="bg-slate-50 border border-slate-200 dark:bg-[#080b12]/90 dark:border-white/10 p-4 rounded-2xl shadow-sm">
                                <div className="text-sky-700 dark:text-[#38bdf8]/70 text-[10px] font-bold uppercase tracking-wider mb-2">Carbs Target (g)</div>
                                <input
                                    type="number"
                                    name="carbs"
                                    value={customTargets.carbs}
                                    onChange={handleCustomTargetChange}
                                    className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-[#38bdf8]/40 px-3 py-2 rounded-xl text-xl font-bold text-sky-700 dark:text-[#38bdf8] outline-none focus:border-sky-600 dark:focus:border-[#38bdf8] shadow-sm"
                                    placeholder="e.g. 200"
                                />
                            </div>

                            <div className="bg-slate-50 border border-slate-200 dark:bg-[#080b12]/90 dark:border-white/10 p-4 rounded-2xl shadow-sm">
                                <div className="text-amber-700 dark:text-yellow-400/70 text-[10px] font-bold uppercase tracking-wider mb-2">Fats Target (g)</div>
                                <input
                                    type="number"
                                    name="fats"
                                    value={customTargets.fats}
                                    onChange={handleCustomTargetChange}
                                    className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-yellow-400/40 px-3 py-2 rounded-xl text-xl font-bold text-amber-700 dark:text-yellow-400 outline-none focus:border-amber-600 dark:focus:border-yellow-400 shadow-sm"
                                    placeholder="e.g. 65"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 pt-4 border-t border-slate-200 dark:border-white/10 text-xs">
                            <div className="bg-slate-50 border border-slate-200 dark:bg-[#080b12]/60 dark:border-white/5 p-3 rounded-xl shadow-sm">
                                <div className="text-slate-600 dark:text-white/40 text-[9px] uppercase font-bold mb-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sky-600 dark:text-[#38bdf8] text-xs">water_drop</span>
                                    <span>Water (L)</span>
                                </div>
                                <input
                                    type="number"
                                    step="0.1"
                                    name="water"
                                    value={customTargets.water}
                                    onChange={handleCustomTargetChange}
                                    className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-2 py-1 rounded text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-600 shadow-sm"
                                />
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressTracking;
