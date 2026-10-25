import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const PREDEFINED_ALLERGENS = [
    { id: 'Nuts', label: 'Nuts & Peanuts', icon: '🥜' },
    { id: 'Dairy', label: 'Dairy & Milk', icon: '🥛' },
    { id: 'Gluten', label: 'Gluten & Wheat', icon: '🌾' },
    { id: 'Soy', label: 'Soy & Soybeans', icon: '🫘' },
    { id: 'Eggs', label: 'Eggs', icon: '🥚' },
    { id: 'Shellfish', label: 'Shellfish', icon: '🦐' },
    { id: 'Fish', label: 'Fish & Seafood', icon: '🐟' },
    { id: 'Sesame', label: 'Sesame', icon: '🫛' }
];

const CUISINES = [
    { id: 'Indian', label: 'Indian 🇮🇳' },
    { id: 'Italian', label: 'Italian 🇮🇹' },
    { id: 'Mexican', label: 'Mexican 🇲🇽' },
    { id: 'Mediterranean', label: 'Mediterranean 🥗' },
    { id: 'Asian', label: 'Asian 🥢' },
    { id: 'Fast Food', label: 'Fast Food 🍔' }
];

const STEPS = [
    { id: 1, title: 'Basic Info', desc: 'Mandatory Account Profile' },
    { id: 2, title: 'Body Data', desc: 'Height, Weight & Activity' },
    { id: 3, title: 'Goals & Diets', desc: 'Health Target & Budget' },
    { id: 4, title: 'Preferences', desc: 'Allergens & Cuisines' }
];

const OnboardingWizard = ({ initialEmail = '', initialFirstName = '', initialLastName = '', onComplete }) => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);

    // Form Data State
    const [firstName, setFirstName] = useState(initialFirstName);
    const [lastName, setLastName] = useState(initialLastName);
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('Male');

    const [heightCm, setHeightCm] = useState('170');
    const [weightKg, setWeightKg] = useState('70');
    const [activityLevel, setActivityLevel] = useState('Sedentary');

    const [goal, setGoal] = useState('General Nutrition');
    const [dietType, setDietType] = useState('Non-Vegetarian');
    const [mealBudget, setMealBudget] = useState('Budget/Affordable');

    const [allergies, setAllergies] = useState([]);
    const [cuisinePreferences, setCuisinePreferences] = useState([]);

    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    // Toggle Allergen
    const toggleAllergen = (id) => {
        setAllergies(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    // Toggle Cuisine
    const toggleCuisine = (id) => {
        setCuisinePreferences(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    // Validate Step 1 (Mandatory)
    const handleNextFromStep1 = (e) => {
        if (e) e.preventDefault();
        setError('');
        if (!firstName.trim()) {
            setError('Please enter your First Name.');
            return;
        }
        if (!lastName.trim()) {
            setError('Please enter your Last Name.');
            return;
        }
        if (!age || parseInt(age, 10) <= 0) {
            setError('Please enter a valid age.');
            return;
        }
        setCurrentStep(2);
    };

    // Save and complete onboarding
    const handleFinish = async () => {
        setSaving(true);
        setError('');

        const payload = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            age: parseInt(age, 10) || 25,
            gender: gender,
            heightCm: parseFloat(heightCm) || 170,
            weightKg: parseFloat(weightKg) || 70,
            activityLevel: activityLevel,
            goal: goal,
            dietType: dietType,
            allergies: allergies.join(', '),
            cuisinePreferences: cuisinePreferences.join(', '),
            mealBudget: mealBudget
        };

        try {
            await api.put('/profiles/me', payload);
            if (onComplete) {
                onComplete();
            } else {
                navigate('/profile');
            }
        } catch (err) {
            console.error("Onboarding profile save error", err);
            // Even if API save has an issue, proceed safely
            if (onComplete) {
                onComplete();
            } else {
                navigate('/profile');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full max-w-2xl bg-[#080b12]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative z-20">
            {/* Header Title */}
            <div className="text-center mb-8">
                <span className="text-[10px] font-black uppercase text-[#a5d391] tracking-[0.25em] bg-[#a5d391]/10 px-3 py-1 rounded-full border border-[#a5d391]/30">
                    Account Personalization Setup
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold font-hero-display text-white mt-3">
                    Welcome to NutriMunch AI
                </h2>
                <p className="text-xs text-white/50 mt-1">
                    Complete your health profile to calibrate AI meal generation and custom target metrics.
                </p>
            </div>

            {/* MILESTONE STEPPER PROGRESS BAR ( ------o------o------o------ ) */}
            <div className="mb-10 relative">
                <div className="flex items-center justify-between relative z-10">
                    {STEPS.map((step, idx) => {
                        const isCompleted = currentStep > step.id;
                        const isActive = currentStep === step.id;

                        return (
                            <div key={step.id} className="flex flex-col items-center relative z-10 group">
                                {/* Node Milestone Circle */}
                                <div 
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                                        isCompleted 
                                            ? 'bg-[#a5d391] text-black shadow-[0_0_15px_rgba(165,211,145,0.6)]' 
                                            : isActive 
                                                ? 'bg-[#a5d391]/20 text-[#a5d391] border-2 border-[#a5d391] shadow-[0_0_20px_rgba(165,211,145,0.4)] animate-pulse' 
                                                : 'bg-white/5 text-white/40 border border-white/10'
                                    }`}
                                >
                                    {isCompleted ? '✓' : step.id}
                                </div>
                                <div className={`text-[10px] font-bold mt-2 text-center hidden sm:block ${isActive ? 'text-[#a5d391]' : isCompleted ? 'text-white' : 'text-white/40'}`}>
                                    {step.title}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Connecting Progress Line ( ------o------ ) */}
                <div className="absolute top-5 left-5 right-5 h-[2px] bg-white/10 -translate-y-1/2 z-0">
                    <div 
                        className="h-full bg-gradient-to-r from-[#a5d391] to-[#7ec362] transition-all duration-500"
                        style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/40 text-red-300 p-3 rounded-2xl text-xs text-center mb-6 font-semibold">
                    {error}
                </div>
            )}

            {/* STEP 1: BASIC INFO (MANDATORY) */}
            {currentStep === 1 && (
                <form onSubmit={handleNextFromStep1} className="space-y-5">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 mb-2">
                        <div className="text-xs font-bold text-[#a5d391] uppercase tracking-wider mb-1">
                            Milestone 1 of 4: Mandatory Profile Details
                        </div>
                        <p className="text-[11px] text-white/50">
                            Please provide your basic name and age details to personalize your account.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-white/70 mb-1">First Name *</label>
                            <input 
                                type="text"
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                                placeholder="e.g. John"
                                className="w-full bg-[#080b12] border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[#a5d391]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-white/70 mb-1">Last Name *</label>
                            <input 
                                type="text"
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                                placeholder="e.g. Doe"
                                className="w-full bg-[#080b12] border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[#a5d391]"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-white/70 mb-1">Age *</label>
                            <input 
                                type="number"
                                value={age}
                                onChange={e => setAge(e.target.value)}
                                placeholder="e.g. 25"
                                min="1"
                                max="120"
                                className="w-full bg-[#080b12] border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[#a5d391]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-white/70 mb-1">Gender</label>
                            <select
                                value={gender}
                                onChange={e => setGender(e.target.value)}
                                className="w-full bg-[#080b12] border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[#a5d391]"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                                <option value="Prefer Not to Say">Prefer Not to Say</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            className="bg-[#a5d391] hover:bg-white text-black font-bold px-8 py-3.5 rounded-2xl text-xs transition-all shadow-[0_0_15px_rgba(165,211,145,0.3)] cursor-pointer flex items-center gap-2"
                        >
                            <span>Next: Body Data</span>
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    </div>
                </form>
            )}

            {/* STEP 2: BODY METRICS (OPTIONAL / SKIP) */}
            {currentStep === 2 && (
                <div className="space-y-5">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 mb-2">
                        <div className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider mb-1">
                            Milestone 2 of 4: Physical Parameters
                        </div>
                        <p className="text-[11px] text-white/50">
                            Enter your weight and height to calculate live Mifflin-St Jeor BMR and TDEE calorie requirements.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-white/70 mb-1">Height (cm)</label>
                            <input 
                                type="number"
                                value={heightCm}
                                onChange={e => setHeightCm(e.target.value)}
                                placeholder="e.g. 175"
                                className="w-full bg-[#080b12] border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[#38bdf8]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-white/70 mb-1">Weight (kg)</label>
                            <input 
                                type="number"
                                value={weightKg}
                                onChange={e => setWeightKg(e.target.value)}
                                placeholder="e.g. 70"
                                className="w-full bg-[#080b12] border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[#38bdf8]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/70 mb-1">Activity Level</label>
                        <select
                            value={activityLevel}
                            onChange={e => setActivityLevel(e.target.value)}
                            className="w-full bg-[#080b12] border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[#38bdf8]"
                        >
                            <option value="Sedentary">Sedentary (Little or no exercise)</option>
                            <option value="Lightly Active">Lightly Active (1-3 days/week)</option>
                            <option value="Moderately Active">Moderately Active (3-5 days/week)</option>
                            <option value="Very Active">Very Active (6-7 days/week)</option>
                        </select>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => setCurrentStep(3)}
                            className="text-xs text-white/50 hover:text-white px-4 py-2 rounded-xl transition-colors cursor-pointer order-2 sm:order-1"
                        >
                            Skip Step ➔
                        </button>

                        <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                            <button
                                type="button"
                                onClick={() => setCurrentStep(1)}
                                className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentStep(3)}
                                className="flex-1 sm:flex-none bg-[#38bdf8] hover:bg-white text-black font-bold px-7 py-3 rounded-2xl text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] cursor-pointer flex items-center justify-center gap-2"
                            >
                                <span>Next: Goals & Diets</span>
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3: GOALS & DIET TYPE (OPTIONAL / SKIP) */}
            {currentStep === 3 && (
                <div className="space-y-5">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 mb-2">
                        <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-1">
                            Milestone 3 of 4: Health Targets & Preferences
                        </div>
                        <p className="text-[11px] text-white/50">
                            Specify your target health goals and preferred diet regimen.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-white/70 mb-1">Health Goal</label>
                            <select
                                value={goal}
                                onChange={e => setGoal(e.target.value)}
                                className="w-full bg-[#080b12] border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-yellow-400"
                            >
                                <option value="Weight Loss">Weight Loss</option>
                                <option value="Muscle Gain">Muscle Gain</option>
                                <option value="General Nutrition">General Nutrition</option>
                                <option value="Maintenance">Maintenance</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-white/70 mb-1">Diet Type</label>
                            <select
                                value={dietType}
                                onChange={e => setDietType(e.target.value)}
                                className="w-full bg-[#080b12] border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-yellow-400"
                            >
                                <option value="Non-Vegetarian">Non-Vegetarian</option>
                                <option value="Vegetarian">Vegetarian</option>
                                <option value="Vegan">Vegan</option>
                                <option value="Keto">Keto</option>
                                <option value="Pescatarian">Pescatarian</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/70 mb-1">Meal Budget Tier</label>
                        <select
                            value={mealBudget}
                            onChange={e => setMealBudget(e.target.value)}
                            className="w-full bg-[#080b12] border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-yellow-400"
                        >
                            <option value="Budget/Affordable">Budget / Affordable ($)</option>
                            <option value="Moderate">Moderate ($$)</option>
                            <option value="High/Premium">High / Premium ($$$)</option>
                        </select>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => setCurrentStep(4)}
                            className="text-xs text-white/50 hover:text-white px-4 py-2 rounded-xl transition-colors cursor-pointer order-2 sm:order-1"
                        >
                            Skip Step ➔
                        </button>

                        <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                            <button
                                type="button"
                                onClick={() => setCurrentStep(2)}
                                className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentStep(4)}
                                className="flex-1 sm:flex-none bg-yellow-400 hover:bg-white text-black font-bold px-7 py-3 rounded-2xl text-xs transition-all shadow-[0_0_15px_rgba(250,204,21,0.3)] cursor-pointer flex items-center justify-center gap-2"
                            >
                                <span>Next: Preferences</span>
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 4: ALLERGIES & CUISINE PREFERENCES (OPTIONAL / FINISH) */}
            {currentStep === 4 && (
                <div className="space-y-5">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 mb-2">
                        <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
                            Milestone 4 of 4: Allergies & Cuisine Tastes
                        </div>
                        <p className="text-[11px] text-white/50">
                            Select any known food allergies and favorite cuisines to filter AI meal plans.
                        </p>
                    </div>

                    {/* Allergens Selection */}
                    <div>
                        <label className="block text-xs font-bold text-white/70 mb-2">Known Allergens</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {PREDEFINED_ALLERGENS.map((item) => {
                                const isSelected = allergies.includes(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => toggleAllergen(item.id)}
                                        className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-left cursor-pointer flex items-center gap-2 ${
                                            isSelected 
                                                ? 'bg-red-500/20 border-red-500 text-red-200 shadow-md' 
                                                : 'bg-[#080b12] border-white/10 text-white/60 hover:border-white/30'
                                        }`}
                                    >
                                        <span>{item.icon}</span>
                                        <span className="truncate">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Cuisine Selection */}
                    <div>
                        <label className="block text-xs font-bold text-white/70 mb-2">Preferred Cuisines</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {CUISINES.map((item) => {
                                const isSelected = cuisinePreferences.includes(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => toggleCuisine(item.id)}
                                        className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-left cursor-pointer ${
                                            isSelected 
                                                ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow-md' 
                                                : 'bg-[#080b12] border-white/10 text-white/60 hover:border-white/30'
                                        }`}
                                    >
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={handleFinish}
                            disabled={saving}
                            className="text-xs text-white/50 hover:text-white px-4 py-2 rounded-xl transition-colors cursor-pointer order-2 sm:order-1"
                        >
                            Skip & Finish ➔
                        </button>

                        <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                            <button
                                type="button"
                                onClick={() => setCurrentStep(3)}
                                className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={handleFinish}
                                disabled={saving}
                                className="flex-1 sm:flex-none bg-[#a5d391] hover:bg-white text-black font-bold px-8 py-3.5 rounded-2xl text-xs transition-all shadow-[0_0_20px_rgba(165,211,145,0.4)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                <span>{saving ? 'Finalizing Setup...' : 'Complete Profile & Launch Engine'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnboardingWizard;
