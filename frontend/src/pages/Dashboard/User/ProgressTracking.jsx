import React, { useState, useEffect, useContext } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Droplet, Plus, RotateCcw, CheckCircle2, Sparkles, TrendingUp, Activity, Edit2, Save, X } from 'lucide-react';
import api from '../../../api/axios';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const ProgressTracking = () => {
    const { user } = useContext(AuthContext);

    if (!user) {
        return <FeatureGate />;
    }

    // Dynamic Hydration Target (Fetched from User Profile / localStorage)
    const [waterTargetMl, setWaterTargetMl] = useState(() => {
        const saved = localStorage.getItem('nutrimunch_water_target_liters');
        return saved ? Math.round(parseFloat(saved) * 1000) : 3000;
    });

    const [waterConsumed, setWaterConsumed] = useState(() => {
        const saved = localStorage.getItem('nutrimunch_water_consumed');
        return saved ? parseInt(saved, 10) : 1250;
    });
    const [customAmount, setCustomAmount] = useState('');
    const [logSuccessMessage, setLogSuccessMessage] = useState('');

    // Goal Edit Modal State
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [editGoalLiters, setEditGoalLiters] = useState('3.0');
    const [isSavingGoal, setIsSavingGoal] = useState(false);

    const fetchWaterTarget = () => {
        api.get('/profiles/me').then(res => {
            if (res.data && res.data.dailyWaterTargetLiters) {
                const targetLiters = parseFloat(res.data.dailyWaterTargetLiters);
                const targetMl = Math.round(targetLiters * 1000);
                setWaterTargetMl(targetMl);
                setEditGoalLiters(targetLiters.toString());
                localStorage.setItem('nutrimunch_water_target_liters', targetLiters.toString());
            }
        }).catch(() => {
            const saved = localStorage.getItem('nutrimunch_water_target_liters');
            if (saved) {
                setWaterTargetMl(Math.round(parseFloat(saved) * 1000));
                setEditGoalLiters(saved);
            }
        });
    };

    useEffect(() => {
        fetchWaterTarget();
        const handleProfileUpdate = () => {
            fetchWaterTarget();
        };
        window.addEventListener('nutrimunch_profile_updated', handleProfileUpdate);
        window.addEventListener('storage', handleProfileUpdate);
        return () => {
            window.removeEventListener('nutrimunch_profile_updated', handleProfileUpdate);
            window.removeEventListener('storage', handleProfileUpdate);
        };
    }, []);

    const handleSaveGoal = async (targetVal) => {
        const valToUse = targetVal || editGoalLiters;
        const liters = parseFloat(valToUse);
        if (!liters || liters <= 0) return;

        setIsSavingGoal(true);
        const ml = Math.round(liters * 1000);
        setWaterTargetMl(ml);
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

    useEffect(() => {
        localStorage.setItem('nutrimunch_water_consumed', waterConsumed.toString());
    }, [waterConsumed]);

    const handleAddWater = (amount) => {
        const newTotal = waterConsumed + amount;
        setWaterConsumed(newTotal);
        setLogSuccessMessage(`Added +${amount} ml water! Logged successfully.`);
        setTimeout(() => setLogSuccessMessage(''), 3000);

        // API call to sync with backend progress log endpoint
        api.post('/progress/me', {
            logDate: new Date().toISOString().split('T')[0],
            notes: `Water intake logged: +${amount} ml (Total: ${newTotal} ml)`
        }).catch(() => {
            // Silently handle offline mode
        });
    };

    const handleResetWater = () => {
        setWaterConsumed(0);
        setLogSuccessMessage('Hydration tracker reset for today.');
        setTimeout(() => setLogSuccessMessage(''), 3000);
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

    const data = {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
        datasets: [
            {
                label: 'Weight (lbs)',
                data: [195, 192, 189.5, 188, 185, 183],
                borderColor: '#a5d391',
                backgroundColor: 'rgba(165, 211, 145, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#080b12',
                pointBorderColor: '#a5d391',
                pointBorderWidth: 2,
                pointRadius: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(8, 11, 18, 0.9)',
                titleColor: '#fff',
                bodyColor: '#a5d391',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: 'rgba(255,255,255,0.5)' }
            },
            x: {
                grid: { display: false },
                ticks: { color: 'rgba(255,255,255,0.5)' }
            }
        }
    };

    return (
        <div className="w-full text-white space-y-8">
            {/* Header Title */}
            <div>
                <span className="text-[#a5d391] text-xs font-bold uppercase tracking-widest block mb-1">Biometric & Fluid Tracking</span>
                <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white">Progress & Smart Hydration Tracker</h1>
            </div>

            {/* Smart Hydration Tracker Section */}
            <div className="bg-gradient-to-br from-[#0d131f] to-[#080b12] border border-[#a5d391]/30 rounded-[2.5rem] p-6 lg:p-8 shadow-[0_0_50px_rgba(165,211,145,0.15)] relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#a5d391]/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                    {/* Left: Interactive Circular Progress Ring */}
                    <div className="flex items-center gap-6">
                        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    className="stroke-white/10"
                                    strokeWidth="10"
                                    fill="transparent"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    className="stroke-[#a5d391] transition-all duration-700 ease-out"
                                    strokeWidth="10"
                                    strokeDasharray={263.89}
                                    strokeDashoffset={263.89 - (263.89 * percentage) / 100}
                                    strokeLinecap="round"
                                    fill="transparent"
                                />
                            </svg>
                            <div className="absolute text-center flex flex-col items-center justify-center">
                                <Droplet className="w-5 h-5 text-[#a5d391] mb-0.5 animate-bounce" />
                                <span className="text-2xl font-black font-hero-display leading-none">{percentage}%</span>
                                <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider mt-0.5">Hydrated</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#a5d391]/10 text-[#a5d391] border border-[#a5d391]/30 text-xs font-bold">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Daily Fluid Goal</span>
                                </div>
                                <button
                                    onClick={() => setIsEditingGoal(true)}
                                    className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-[#a5d391]/20 text-xs text-white/70 hover:text-[#a5d391] border border-white/10 transition-all cursor-pointer flex items-center gap-1 font-bold"
                                >
                                    <Edit2 className="w-3 h-3 text-[#a5d391]" />
                                    <span>Edit Goal</span>
                                </button>
                            </div>
                            <h2 className="text-3xl font-extrabold text-white font-hero-display">
                                {waterConsumed.toLocaleString()} <span className="text-base text-white/50 font-normal">/ {waterTargetMl.toLocaleString()} ml</span>
                            </h2>
                            <p className="text-xs text-white/60">
                                {remainingWater > 0 
                                    ? `Need ${remainingWater.toLocaleString()} ml more to reach optimal fluid target.`
                                    : '🎉 Daily hydration goal achieved! Excellent fluid balance.'}
                            </p>
                            {logSuccessMessage && (
                                <div className="text-xs font-bold text-[#a5d391] flex items-center gap-1 pt-1 animate-pulse">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{logSuccessMessage}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Edit Fluid Goal Popover / Modal Overlay */}
                    {isEditingGoal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                            <div className="bg-[#0d121c] border border-[#a5d391]/40 rounded-3xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(165,211,145,0.2)] relative text-white space-y-5 animate-in fade-in zoom-in-95">
                                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <Droplet className="w-5 h-5 text-[#a5d391]" />
                                        <h3 className="text-lg font-bold font-hero-display text-white">Update Fluid Target</h3>
                                    </div>
                                    <button
                                        onClick={() => setIsEditingGoal(false)}
                                        className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <p className="text-xs text-white/60 leading-relaxed">
                                    Set your custom daily water target. Updating here automatically syncs with your <strong className="text-white">Profile</strong> and persists permanently.
                                </p>

                                {/* Preset Goal Options */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#a5d391]">Quick Presets</label>
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
                                                        ? 'bg-[#a5d391] text-black border-[#a5d391]' 
                                                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
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
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-white/70 block mb-1">
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
                                                className="w-full bg-[#080b12] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-[#a5d391]"
                                                placeholder="e.g. 3.5"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">Liters</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingGoal(false)}
                                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSavingGoal}
                                            className="px-5 py-2 rounded-xl bg-[#a5d391] hover:bg-[#8ec478] text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
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
                        <div className="text-xs font-bold text-white/70 uppercase tracking-wider text-center lg:text-left">
                            Quick Add Fluid Intake
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <button
                                onClick={() => handleAddWater(250)}
                                className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-[#a5d391]/20 border border-white/10 hover:border-[#a5d391]/50 text-white hover:text-[#a5d391] transition-all cursor-pointer flex flex-col items-center gap-1 text-xs font-bold group shadow-md"
                            >
                                <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">local_drink</span>
                                <span>+250 ml</span>
                            </button>
                            <button
                                onClick={() => handleAddWater(500)}
                                className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-[#a5d391]/20 border border-white/10 hover:border-[#a5d391]/50 text-white hover:text-[#a5d391] transition-all cursor-pointer flex flex-col items-center gap-1 text-xs font-bold group shadow-md"
                            >
                                <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">water_full</span>
                                <span>+500 ml</span>
                            </button>
                            <button
                                onClick={() => handleAddWater(750)}
                                className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-[#a5d391]/20 border border-white/10 hover:border-[#a5d391]/50 text-white hover:text-[#a5d391] transition-all cursor-pointer flex flex-col items-center gap-1 text-xs font-bold group shadow-md"
                            >
                                <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">sports_bar</span>
                                <span>+750 ml</span>
                            </button>
                            <button
                                onClick={() => handleAddWater(1000)}
                                className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-[#a5d391]/20 border border-white/10 hover:border-[#a5d391]/50 text-white hover:text-[#a5d391] transition-all cursor-pointer flex flex-col items-center gap-1 text-xs font-bold group shadow-md"
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
                                    className="w-full bg-[#080b12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-[#a5d391] outline-none"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-[#a5d391] text-black font-bold text-xs hover:bg-[#8ec478] transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add</span>
                                </button>
                            </form>
                            <button
                                onClick={handleResetWater}
                                title="Reset Today's Water"
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Weight Loss & Lipid Oxidation Trend Chart */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h2 className="text-xl font-bold mb-1 font-hero-display flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-[#a5d391]" />
                            Lipid Oxidation & Weight Curve
                        </h2>
                        <p className="text-white/50 text-sm">Trajectory mapped over active training protocol.</p>
                    </div>
                    <select className="w-full md:w-auto bg-[#080b12]/80 border border-white/10 px-4 py-2.5 rounded-xl text-sm font-bold outline-none text-white/70 focus:text-white cursor-pointer">
                        <option>Last 6 Weeks</option>
                        <option>Last 3 Months</option>
                        <option>All Time</option>
                    </select>
                </div>
                
                <div className="h-[220px] sm:h-[260px] lg:h-[300px] w-full">
                    <Line data={data} options={options} />
                </div>
            </div>

            {/* Metabolic Biomarkers & Adherence Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
                    <h3 className="font-bold mb-6 font-hero-display text-lg flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[#a5d391]" />
                        Metabolic Biomarkers
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 rounded-2xl bg-[#080b12]/60 border border-white/5">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#a5d391] text-[20px]">monitor_heart</span>
                                <span className="text-sm">Resting Heart Rate</span>
                            </div>
                            <span className="font-bold text-[#38bdf8]">54 bpm</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-2xl bg-[#080b12]/60 border border-white/5">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#a5d391] text-[20px]">favorite</span>
                                <span className="text-sm">HRV Baseline</span>
                            </div>
                            <span className="font-bold text-[#a5d391]">82 ms</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-2xl bg-[#080b12]/60 border border-white/5">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#a5d391] text-[20px]">bloodtype</span>
                                <span className="text-sm">Avg Blood Glucose</span>
                            </div>
                            <span className="font-bold text-white">92 mg/dL</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
                    <h3 className="font-bold mb-6 font-hero-display text-lg">Algorithm Adherence</h3>
                    <div className="flex items-center justify-center h-40">
                        <div className="relative flex items-center justify-center w-32 h-32 rounded-full border-4 border-white/10 border-t-[#a5d391]">
                            <div className="text-center">
                                <div className="text-3xl font-bold font-hero-display">94%</div>
                                <div className="text-[10px] text-[#a5d391] uppercase tracking-widest font-bold mt-1">Accuracy</div>
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-sm text-white/50 mt-4">Your macro tracking has been within 5% of the generative targets for 12 consecutive days.</p>
                </div>
            </div>
        </div>
    );
};

export default ProgressTracking;

