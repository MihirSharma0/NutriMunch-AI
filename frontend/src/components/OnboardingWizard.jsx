/**
 * New User Onboarding Wizard
 * Multi-step onboarding dialog collecting biometrics, dietary preferences,
 * allergens, and health targets upon initial account creation.
 */
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';

/** Predefined selectable allergen list for onboarding setup. */
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

/** Selectable cuisine preferences. */
const CUISINES = [
    { id: 'Indian', label: 'Indian 🇮🇳' },
    { id: 'Italian', label: 'Italian 🇮🇹' },
    { id: 'Mexican', label: 'Mexican 🇲🇽' },
    { id: 'Mediterranean', label: 'Mediterranean 🥗' },
    { id: 'Asian', label: 'Asian 🥢' },
    { id: 'Fast Food', label: 'Fast Food 🍔' }
];

/** Onboarding workflow step definitions. */
const STEPS = [
    { id: 1, title: 'Basic Info', desc: 'Mandatory Account Profile' },
    { id: 2, title: 'Body Data', desc: 'Optional: Height, Weight & Activity' },
    { id: 3, title: 'Goals & Diets', desc: 'Optional: Health Target & Budget' },
    { id: 4, title: 'Preferences', desc: 'Optional: Allergens & Cuisines' }
];

/**
 * OnboardingWizard Component
 * Guides newly verified users through setting up their biometric profile.
 * 
 * @param {Object} props - Component properties
 * @param {string} [props.initialEmail=''] - Pre-populated email address
 * @param {string} [props.initialFirstName=''] - Pre-populated user first name
 * @param {string} [props.initialLastName=''] - Pre-populated user last name
 * @param {Function} props.onComplete - Callback invoked upon wizard completion
 */
const OnboardingWizard = ({ initialEmail = '', initialFirstName = '', initialLastName = '', onComplete }) => {
    const navigate = useNavigate();
    const { user, setUser } = useContext(AuthContext) || {};
    const { isDark } = useTheme();
    const [currentStep, setCurrentStep] = useState(1);

    const inputClasses = `w-full rounded-xl p-3 text-sm outline-none transition-all border ${
        isDark 
            ? 'bg-[#090d16]/90 border-white/10 text-white placeholder-gray-500 focus:border-[#a5d391]' 
            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500'
    }`;
    const labelClasses = `block text-xs font-bold mb-1 ${isDark ? 'text-white/70' : 'text-slate-700'}`;
    const infoBoxClasses = `p-4 rounded-2xl border mb-2 ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`;

    // Resolve initial names from props, user context, sessionStorage, or localStorage
    const getInitialNames = () => {
        let fn = initialFirstName;
        let ln = initialLastName;
        if (!fn || !ln) {
            try {
                const storedPending = sessionStorage.getItem('nutrimunch_pending_registration');
                if (storedPending) {
                    const parsed = JSON.parse(storedPending);
                    if (!fn && parsed.firstName) fn = parsed.firstName;
                    if (!ln && parsed.lastName) ln = parsed.lastName;
                }
            } catch (e) {}
        }
        if (!fn && user?.firstName) fn = user.firstName;
        if (!ln && user?.lastName) ln = user.lastName;
        if (!fn || !ln) {
            try {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    if (!fn && parsed.firstName) fn = parsed.firstName;
                    if (!ln && parsed.lastName) ln = parsed.lastName;
                }
            } catch (e) {}
        }
        return { firstName: fn || '', lastName: ln || '' };
    };

    const names = getInitialNames();
    const [firstName, setFirstName] = useState(names.firstName);
    const [lastName, setLastName] = useState(names.lastName);
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');

    const [heightCm, setHeightCm] = useState('');
    const [weightKg, setWeightKg] = useState('');
    const [activityLevel, setActivityLevel] = useState('');

    const [goal, setGoal] = useState('');
    const [dietType, setDietType] = useState('');
    const [mealBudget, setMealBudget] = useState('');

    const [allergies, setAllergies] = useState([]);
    const [cuisinePreferences, setCuisinePreferences] = useState([]);

    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Sync names if props or user context resolve after initial render
        if (!firstName) {
            if (initialFirstName) setFirstName(initialFirstName);
            else if (user?.firstName) setFirstName(user.firstName);
        }
        if (!lastName) {
            if (initialLastName) setLastName(initialLastName);
            else if (user?.lastName) setLastName(user.lastName);
        }

        // Fetch existing profile if available to prefill remaining fields
        const fetchExistingProfile = async () => {
            try {
                const res = await api.get('/profiles/me');
                if (res.data) {
                    if (res.data.firstName && !firstName) setFirstName(res.data.firstName);
                    if (res.data.lastName && !lastName) setLastName(res.data.lastName);
                    if (res.data.age) setAge(String(res.data.age));
                    if (res.data.gender) setGender(res.data.gender);
                    if (res.data.heightCm) setHeightCm(String(res.data.heightCm));
                    if (res.data.weightKg) setWeightKg(String(res.data.weightKg));
                    if (res.data.activityLevel) setActivityLevel(res.data.activityLevel);
                    if (res.data.goal) setGoal(res.data.goal);
                    if (res.data.dietType) setDietType(res.data.dietType);
                }
            } catch (err) {
                // Ignore profile lookups for brand-new accounts
            }
        };
        fetchExistingProfile();
    }, [initialFirstName, initialLastName, user]);

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
        if (!gender) {
            setError('Please select your gender.');
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
            gender: gender || null,
            heightCm: parseFloat(heightCm) || null,
            weightKg: parseFloat(weightKg) || null,
            activityLevel: activityLevel || null,
            goal: goal || null,
            dietType: dietType || null,
            allergies: allergies.join(', '),
            cuisinePreferences: cuisinePreferences.join(', ') || null,
            mealBudget: mealBudget || null
        };

        try {
            await api.put('/profiles/me', payload);

            // Update AuthContext user and localStorage so the app reflects updated names
            try {
                const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
                const updatedUser = {
                    ...currentUser,
                    firstName: payload.firstName,
                    lastName: payload.lastName
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                if (setUser) setUser(updatedUser);
            } catch (e) {}

            try {
                sessionStorage.removeItem('nutrimunch_pending_registration');
            } catch (e) {}

            if (onComplete) {
                onComplete();
            } else {
                navigate('/dashboard/user');
            }
        } catch (err) {
            console.error("Onboarding profile save error", err);
            try {
                sessionStorage.removeItem('nutrimunch_pending_registration');
            } catch (e) {}
            // Even if API save has an issue, proceed safely
            if (onComplete) {
                onComplete();
            } else {
                navigate('/dashboard/user');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`w-full max-w-2xl rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative z-20 backdrop-blur-2xl border transition-all ${
            isDark 
                ? 'bg-[#0d121c]/90 border-white/10 text-white' 
                : 'bg-white/95 border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.08)] text-slate-800'
        }`}>
            {/* Header Title */}
            <div className="text-center mb-8">
                <span className={`text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1 rounded-full border ${
                    isDark 
                        ? 'text-[#a5d391] bg-[#a5d391]/10 border-[#a5d391]/30' 
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                }`}>
                    Account Personalization Setup
                </span>
                <h2 className={`text-2xl sm:text-3xl font-bold font-hero-display mt-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Welcome to NutriMunch AI
                </h2>
                <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
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
                                            ? isDark ? 'bg-[#a5d391] text-black shadow-[0_0_15px_rgba(165,211,145,0.6)]' : 'bg-emerald-600 text-white shadow-md'
                                            : isActive 
                                                ? isDark ? 'bg-[#a5d391]/20 text-[#a5d391] border-2 border-[#a5d391] shadow-[0_0_20px_rgba(165,211,145,0.4)] animate-pulse' : 'bg-emerald-50 text-emerald-700 border-2 border-emerald-600 shadow-md'
                                                : isDark ? 'bg-white/5 text-white/40 border border-white/10' : 'bg-slate-100 text-slate-400 border border-slate-200'
                                    }`}
                                >
                                    {isCompleted ? '✓' : step.id}
                                </div>
                                <div className={`text-[10px] font-bold mt-2 text-center hidden sm:block ${
                                    isActive 
                                        ? isDark ? 'text-[#a5d391]' : 'text-emerald-700' 
                                        : isCompleted 
                                            ? isDark ? 'text-white' : 'text-slate-800' 
                                            : isDark ? 'text-white/40' : 'text-slate-400'
                                }`}>
                                    {step.title}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Connecting Progress Line ( ------o------ ) */}
                <div className={`absolute top-5 left-5 right-5 h-[2px] -translate-y-1/2 z-0 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                        style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-2xl text-xs text-center mb-6 font-semibold">
                    {error}
                </div>
            )}

            {/* STEP 1: BASIC INFO (MANDATORY) */}
            {currentStep === 1 && (
                <form onSubmit={handleNextFromStep1} className="space-y-5">
                    <div className={infoBoxClasses}>
                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-[#a5d391]' : 'text-emerald-700'}`}>
                            Milestone 1 of 4: Mandatory Profile Details
                        </div>
                        <p className={`text-[11px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                            This is the only required page. Your name is prefilled from Google; the remaining setup pages are optional.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClasses}>First Name *</label>
                            <input 
                                type="text"
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                                placeholder="e.g. John"
                                className={inputClasses}
                                required
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Last Name *</label>
                            <input 
                                type="text"
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                                placeholder="e.g. Doe"
                                className={inputClasses}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClasses}>Age *</label>
                            <input 
                                type="number"
                                value={age}
                                onChange={e => setAge(e.target.value)}
                                placeholder="e.g. 25"
                                min="1"
                                max="120"
                                className={inputClasses}
                                required
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Gender *</label>
                            <select
                                value={gender}
                                onChange={e => setGender(e.target.value)}
                                className={inputClasses}
                                required
                            >
                                <option value="">Select gender</option>
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
                            className={`font-bold px-8 py-3.5 rounded-2xl text-xs transition-all cursor-pointer flex items-center gap-2 ${
                                isDark 
                                    ? 'bg-[#a5d391] hover:bg-white text-black shadow-[0_0_15px_rgba(165,211,145,0.3)]' 
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 shadow-md'
                            }`}
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
                    <div className={infoBoxClasses}>
                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-[#38bdf8]' : 'text-sky-700'}`}>
                            Milestone 2 of 4 (Optional): Physical Parameters
                        </div>
                        <p className={`text-[11px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                            Enter your weight and height to calculate live Mifflin-St Jeor BMR and TDEE calorie requirements.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClasses}>Height (cm)</label>
                            <input 
                                type="number"
                                value={heightCm}
                                onChange={e => setHeightCm(e.target.value)}
                                placeholder="e.g. 175"
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>Weight (kg)</label>
                            <input 
                                type="number"
                                value={weightKg}
                                onChange={e => setWeightKg(e.target.value)}
                                placeholder="e.g. 70"
                                className={inputClasses}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClasses}>Activity Level</label>
                        <select
                            value={activityLevel}
                            onChange={e => setActivityLevel(e.target.value)}
                            className={inputClasses}
                        >
                            <option value="">Select (optional)</option>
                            <option value="Sedentary">Sedentary (Little or no exercise)</option>
                            <option value="Lightly Active">Lightly Active (1-3 days/week)</option>
                            <option value="Moderately Active">Moderately Active (3-5 days/week)</option>
                            <option value="Very Active">Very Active (6-7 days/week)</option>
                        </select>
                    </div>

                    <div className="pt-4 flex items-center justify-between gap-4">
                        <button
                            type="button"
                            onClick={() => setCurrentStep(3)}
                            className={`text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer ${
                                isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Skip Step ➔
                        </button>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentStep(1)}
                                className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                                    isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentStep(3)}
                                className={`font-bold px-7 py-3 rounded-2xl text-xs transition-all cursor-pointer flex items-center gap-2 ${
                                    isDark 
                                        ? 'bg-[#38bdf8] hover:bg-white text-black shadow-[0_0_15px_rgba(56,189,248,0.3)]' 
                                        : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20 shadow-md'
                                }`}
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
                    <div className={infoBoxClasses}>
                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-yellow-400' : 'text-amber-700'}`}>
                            Milestone 3 of 4 (Optional): Health Targets & Preferences
                        </div>
                        <p className={`text-[11px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                            Specify your target health goals and preferred diet regimen.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClasses}>Health Goal</label>
                            <select
                                value={goal}
                                onChange={e => setGoal(e.target.value)}
                                className={inputClasses}
                            >
                                <option value="">Select (optional)</option>
                                <option value="Weight Loss">Weight Loss</option>
                                <option value="Muscle Gain">Muscle Gain</option>
                                <option value="General Nutrition">General Nutrition</option>
                                <option value="Maintenance">Maintenance</option>
                            </select>
                        </div>

                        <div>
                            <label className={labelClasses}>Diet Type</label>
                            <select
                                value={dietType}
                                onChange={e => setDietType(e.target.value)}
                                className={inputClasses}
                            >
                                <option value="">Select (optional)</option>
                                <option value="Non-Vegetarian">Non-Vegetarian</option>
                                <option value="Vegetarian">Vegetarian</option>
                                <option value="Vegan">Vegan</option>
                                <option value="Keto">Keto</option>
                                <option value="Pescatarian">Pescatarian</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelClasses}>Meal Budget Tier</label>
                        <select
                            value={mealBudget}
                            onChange={e => setMealBudget(e.target.value)}
                            className={inputClasses}
                        >
                            <option value="">Select (optional)</option>
                            <option value="Budget/Affordable">Budget / Affordable ($)</option>
                            <option value="Moderate">Moderate ($$)</option>
                            <option value="High/Premium">High / Premium ($$$)</option>
                        </select>
                    </div>

                    <div className="pt-4 flex items-center justify-between gap-4">
                        <button
                            type="button"
                            onClick={() => setCurrentStep(4)}
                            className={`text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer ${
                                isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Skip Step ➔
                        </button>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentStep(2)}
                                className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                                    isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentStep(4)}
                                className={`font-bold px-7 py-3 rounded-2xl text-xs transition-all cursor-pointer flex items-center gap-2 ${
                                    isDark 
                                        ? 'bg-yellow-400 hover:bg-white text-black shadow-[0_0_15px_rgba(250,204,21,0.3)]' 
                                        : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20 shadow-md'
                                }`}
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
                    <div className={infoBoxClasses}>
                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                            Milestone 4 of 4 (Optional): Allergies & Cuisine Tastes
                        </div>
                        <p className={`text-[11px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                            Select any known food allergies and favorite cuisines to filter AI meal plans.
                        </p>
                    </div>

                    {/* Allergens Selection */}
                    <div>
                        <label className={labelClasses}>Known Allergens</label>
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
                                                ? isDark ? 'bg-red-500/20 border-red-500 text-red-200 shadow-md' : 'bg-rose-50 border-rose-500 text-rose-700 font-bold shadow-sm'
                                                : isDark ? 'bg-[#090d16]/80 border-white/10 text-white/60 hover:border-white/30' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
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
                        <label className={labelClasses}>Preferred Cuisines</label>
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
                                                ? isDark ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow-md' : 'bg-purple-50 border-purple-500 text-purple-700 font-bold shadow-sm'
                                                : isDark ? 'bg-[#090d16]/80 border-white/10 text-white/60 hover:border-white/30' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between gap-4">
                        <button
                            type="button"
                            onClick={handleFinish}
                            disabled={saving}
                            className={`text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer ${
                                isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Skip & Finish ➔
                        </button>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentStep(3)}
                                className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                                    isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={handleFinish}
                                disabled={saving}
                                className={`font-bold px-8 py-3.5 rounded-2xl text-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 ${
                                    isDark 
                                        ? 'bg-[#a5d391] hover:bg-white text-black shadow-[0_0_20px_rgba(165,211,145,0.4)]' 
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 shadow-md'
                                }`}
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
