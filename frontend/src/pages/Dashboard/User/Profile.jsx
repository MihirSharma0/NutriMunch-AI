/**
 * User Biometric Profile & Preferences Editor
 * Configures biometric parameters (height, weight, activity multiplier),
 * dietary lifestyle selections, allergen exclusions, and custom hydration goals.
 */
import React, { useContext, useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import api from '../../../api/axios';
import FeatureGate from '../../../components/FeatureGate';
import { subscribeWalletSse } from '../../../utils/walletSse';

const PREDEFINED_ALLERGENS = [
    { id: 'Nuts', label: 'Nuts & Peanuts', icon: '🥜' },
    { id: 'Dairy', label: 'Dairy & Milk', icon: '🥛' },
    { id: 'Gluten', label: 'Gluten & Wheat', icon: '🌾' },
    { id: 'Soy', label: 'Soy & Soybeans', icon: '🫘' },
    { id: 'Eggs', label: 'Eggs', icon: '🥚' },
    { id: 'Shellfish', label: 'Shellfish & Crustaceans', icon: '🦐' },
    { id: 'Fish', label: 'Fish & Seafood', icon: '🐟' },
    { id: 'Sesame', label: 'Sesame', icon: '🫛' },
    { id: 'Sulfites', label: 'Sulfites', icon: '🍷' }
];

const CUISINES = [
    { id: 'Indian', label: 'Indian', flag: '🇮🇳' },
    { id: 'Italian', label: 'Italian', flag: '🇮🇹' },
    { id: 'Mexican', label: 'Mexican', flag: '🇲🇽' },
    { id: 'Mediterranean', label: 'Mediterranean', flag: '🥗' },
    { id: 'Asian', label: 'Asian', flag: '🥢' },
    { id: 'Fast Food', label: 'Fast Food', flag: '🍔' },
    { id: 'Middle Eastern', label: 'Middle Eastern', flag: '🥙' },
    { id: 'Continental', label: 'Continental', flag: '🥖' },
    { id: 'Japanese', label: 'Japanese', flag: '🍣' },
    { id: 'American', label: 'American', flag: '🇺🇸' }
];

const DEFAULT_TARGETS = {
    calories: 2000,
    protein: 140,
    carbs: 200,
    fats: 65,
    sugar: 50,
    water: 2.5,
    fiber: 28,
    iron: 18,
    calcium: 1000,
    vitD: 15,
    vitB12: 2.4,
    vitC: 90,
    zinc: 11
};

/**
 * Profile Component
 * Form allowing members to review and modify their physical metrics, dietary requirements, and health targets.
 */
const Profile = () => {
    const { user } = useContext(AuthContext);

    if (!user) {
        return <FeatureGate />;
    }
    if (String(user.role || '').replace('ROLE_', '').toUpperCase() === 'NUTRITIONIST') {
        return <Navigate to="/dashboard/nutritionist/profile" replace />;
    }

    // Active section tab: 'all' | 'body' | 'goals' | 'allergies' | 'budget'
    const [activeTab, setActiveTab] = useState('all');

    // Units switcher
    const [unitMode, setUnitMode] = useState('metric'); // 'metric' | 'imperial'

    // UI State for Editing Requirements Form
    const [isEditingRequirements, setIsEditingRequirements] = useState(false);

    // Form Profile state
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        age: '',
        gender: 'Male',
        heightCm: '',
        weightKg: '',
        heightFt: '',
        heightIn: '',
        weightLbs: '',
        activityLevel: 'Sedentary',
        goal: 'General Nutrition',
        dietType: 'Non-Vegetarian',
        allergies: [], // array of predefined allergen strings
        customAllergies: [], // array of custom allergen tags
        cuisinePreferences: [], // array of selected cuisines
        favoriteFoods: [], // array of tags
        dislikedFoods: [], // array of tags
        lifestyleClass: 'Middle-Class',
        mealBudget: 'Budget/Affordable'
    });

    // Target Requirements state
    const [customTargets, setCustomTargets] = useState(DEFAULT_TARGETS);

    // Temp tag input states
    const [customAllergenInput, setCustomAllergenInput] = useState('');
    const [favFoodInput, setFavFoodInput] = useState('');
    const [dislikedFoodInput, setDislikedFoodInput] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const resolveWalletBalance = () => {
        try {
            const userKeyId = user?.id || user?.userId;
            const userKeyEmail = user?.email?.toLowerCase();
            if (!userKeyId && !userKeyEmail) return 0;

            const keysToCheck = [
                userKeyId ? `nutrimunch_wallet_balance_id_${userKeyId}` : null,
                userKeyId ? `nutrimunch_wallet_balance_${userKeyId}` : null,
                userKeyEmail ? `nutrimunch_wallet_balance_email_${userKeyEmail}` : null,
                userKeyEmail ? `nutrimunch_wallet_balance_${userKeyEmail}` : null
            ].filter(Boolean);

            let maxBal = 0;
            for (const k of keysToCheck) {
                const val = localStorage.getItem(k);
                if (val !== null && !isNaN(Number(val))) {
                    maxBal = Math.max(maxBal, Number(val));
                }
            }
            return maxBal;
        } catch (e) {
            return 0;
        }
    };

    const [walletBalance, setWalletBalance] = useState(() => resolveWalletBalance());
    const [walletLoading, setWalletLoading] = useState(false);

    const loadWallet = async () => {
        try {
            setWalletLoading(true);
            const userKeyId = user?.id || user?.userId;
            const userKeyEmail = user?.email?.toLowerCase();

            if (!userKeyId && !userKeyEmail) {
                setWalletBalance(0);
                return;
            }

            const res = await api.get('/wallet/me', {
                params: {
                    userId: userKeyId || '',
                    email: userKeyEmail || ''
                }
            });

            if (res.data && typeof res.data.balance !== 'undefined' && res.data.balance !== null) {
                const sBal = Number(res.data.balance);
                setWalletBalance(sBal);
                if (userKeyId) {
                    localStorage.setItem(`nutrimunch_wallet_balance_id_${userKeyId}`, String(sBal));
                    localStorage.setItem(`nutrimunch_wallet_balance_${userKeyId}`, String(sBal));
                }
                if (userKeyEmail) {
                    localStorage.setItem(`nutrimunch_wallet_balance_email_${userKeyEmail}`, String(sBal));
                    localStorage.setItem(`nutrimunch_wallet_balance_${userKeyEmail}`, String(sBal));
                }
                return;
            }
        } catch (err) {
            console.warn('Failed to load wallet on profile:', err);
        } finally {
            const fallbackBal = resolveWalletBalance();
            setWalletBalance(prev => (prev !== undefined && prev !== null ? prev : fallbackBal));
            setWalletLoading(false);
        }
    };

    useEffect(() => {
        loadWallet();

        const handleWalletUpdated = (e) => {
            const myId = String(user?.id || user?.userId || '');
            const myEmail = (user?.email || user?.username || '').toLowerCase();

            if (e?.type === 'storage' && e?.key) {
                const key = e.key;
                if (!key.startsWith('nutrimunch_wallet_balance')) return;
                const matchesMe = (myId && key.includes(myId)) || (myEmail && key.includes(myEmail));
                if (!matchesMe) return;
                const val = localStorage.getItem(key);
                if (val !== null && !isNaN(Number(val))) {
                    setWalletBalance(Number(val));
                    return;
                }
            }

            if (e?.detail) {
                const targetId = String(e.detail.recipientId || '');
                const targetEmail = (e.detail.recipientEmail || '').toLowerCase();
                const isForMe = (targetId && myId && targetId === myId) ||
                                (targetEmail && myEmail && targetEmail === myEmail) ||
                                (!targetId && !targetEmail);
                if (!isForMe) return;

                const pushedVal = e.detail.newBalance !== undefined && e.detail.newBalance !== null
                    ? e.detail.newBalance
                    : e.detail.balance;

                if (pushedVal !== undefined && pushedVal !== null) {
                    const newBal = Number(pushedVal);
                    setWalletBalance(newBal);
                    if (myId) localStorage.setItem(`nutrimunch_wallet_balance_${myId}`, String(newBal));
                    if (myEmail) localStorage.setItem(`nutrimunch_wallet_balance_${myEmail}`, String(newBal));
                    return;
                }
            }
        };

        window.addEventListener('wallet_update', handleWalletUpdated);
        window.addEventListener('wallet_updated', handleWalletUpdated);
        window.addEventListener('storage', handleWalletUpdated);

        const unsubscribeSse = subscribeWalletSse(user, (newBal) => {
            const numBal = Number(newBal);
            if (!isNaN(numBal)) {
                setWalletBalance(numBal);
            }
        });

        let bc;
        try {
            bc = new BroadcastChannel('nutrimunch_clinical_channel');
            bc.onmessage = (event) => {
                if (event.data?.type === 'WALLET_CREDITED' || event.data?.type === 'WALLET_UPDATED') {
                    const targetId = String(event.data.recipientId || '');
                    const targetEmail = (event.data.recipientEmail || '').toLowerCase();
                    const myId = String(user?.id || user?.userId || '');
                    const myEmail = (user?.email || user?.username || '').toLowerCase();
                    const isForMe = (targetId && myId && targetId === myId) ||
                                    (targetEmail && myEmail && targetEmail === myEmail) ||
                                    (!targetId && !targetEmail);
                    if (!isForMe) return;

                    // Direct Push: Apply pushed balance immediately with zero server load
                    const pushedVal = event.data.newBalance !== undefined && event.data.newBalance !== null
                        ? event.data.newBalance
                        : event.data.balance;

                    if (pushedVal !== undefined && pushedVal !== null) {
                        const newBal = Number(pushedVal);
                        setWalletBalance(newBal);
                        if (myId) localStorage.setItem(`nutrimunch_wallet_balance_${myId}`, String(newBal));
                        if (myEmail) localStorage.setItem(`nutrimunch_wallet_balance_${myEmail}`, String(newBal));
                    }
                }
            };
        } catch (e) {}

        return () => {
            if (unsubscribeSse) unsubscribeSse();
            window.removeEventListener('wallet_update', handleWalletUpdated);
            window.removeEventListener('wallet_updated', handleWalletUpdated);
            window.removeEventListener('storage', handleWalletUpdated);
            if (bc) bc.close();
        };
    }, [user]);

    // Helper to parse comma-separated string or array into array of clean strings
    const parseList = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        return val.split(',').map(s => s.trim()).filter(Boolean);
    };

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) {
                setLoading(false);
                setTargets(DEFAULT_TARGETS);
                setCustomTargets(DEFAULT_TARGETS);
                return;
            }
            try {
                const res = await api.get('/profiles/me');
                if (res.data) {
                    const heightCm = res.data.heightCm || 170;
                    const weightKg = res.data.weightKg || 70;

                    // Imperial conversions
                    const totalInches = heightCm / 2.54;
                    const ft = Math.floor(totalInches / 12);
                    const inch = Math.round(totalInches % 12);
                    const lbs = Math.round(weightKg * 2.20462);

                    const allAllergies = parseList(res.data.allergies);
                    const predefinedIds = PREDEFINED_ALLERGENS.map(a => a.id);
                    const selectedPredefined = allAllergies.filter(a => predefinedIds.includes(a));
                    const selectedCustom = allAllergies.filter(a => !predefinedIds.includes(a));

                    setProfile({
                        firstName: res.data.firstName || user?.firstName || '',
                        lastName: res.data.lastName || user?.lastName || '',
                        age: res.data.age || 25,
                        gender: res.data.gender || 'Male',
                        heightCm: heightCm,
                        weightKg: weightKg,
                        heightFt: ft || 5,
                        heightIn: inch || 7,
                        weightLbs: lbs || 154,
                        activityLevel: res.data.activityLevel || 'Sedentary',
                        goal: res.data.goal || 'General Nutrition',
                        dietType: res.data.dietType || 'Non-Vegetarian',
                        allergies: selectedPredefined,
                        customAllergies: selectedCustom,
                        cuisinePreferences: parseList(res.data.cuisinePreferences),
                        favoriteFoods: parseList(res.data.favoriteFoods),
                        dislikedFoods: parseList(res.data.dislikedFoods),
                        lifestyleClass: res.data.lifestyleClass || 'Middle-Class',
                        mealBudget: res.data.mealBudget || 'Budget/Affordable'
                    });

                    if (res.data.dailyCaloriesTarget) {
                        const loadedTargets = {
                            calories: res.data.dailyCaloriesTarget || DEFAULT_TARGETS.calories,
                            protein: res.data.proteinTarget || DEFAULT_TARGETS.protein,
                            carbs: res.data.carbsTarget || DEFAULT_TARGETS.carbs,
                            fats: res.data.fatsTarget || DEFAULT_TARGETS.fats,
                            sugar: res.data.sugarTargetG || DEFAULT_TARGETS.sugar,
                            tdee: res.data.tdee || 2000,
                            bmr: res.data.bmr || 1600,
                            water: res.data.dailyWaterTargetLiters || DEFAULT_TARGETS.water,
                            fiber: res.data.dailyFiberTargetG || DEFAULT_TARGETS.fiber,
                            iron: res.data.ironTargetMg || DEFAULT_TARGETS.iron,
                            calcium: res.data.calciumTargetMg || DEFAULT_TARGETS.calcium,
                            vitD: res.data.vitDTargetMcg || DEFAULT_TARGETS.vitD,
                            vitB12: res.data.vitB12TargetMcg || DEFAULT_TARGETS.vitB12,
                            vitC: res.data.vitCTargetMg || DEFAULT_TARGETS.vitC,
                            zinc: res.data.zincTargetMg || DEFAULT_TARGETS.zinc
                        };
                        setTargets(loadedTargets);
                        setCustomTargets(loadedTargets);
                        if (loadedTargets.water) {
                            localStorage.setItem('nutrimunch_water_target_liters', loadedTargets.water.toString());
                        }
                    } else {
                        // Pre-fill defaults if not set yet
                        setCustomTargets(DEFAULT_TARGETS);
                    }
                }
            } catch (err) {
                console.error("Failed to load profile", err);
                setCustomTargets(DEFAULT_TARGETS);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
        window.addEventListener('nutrimunch_profile_updated', fetchProfile);
        window.addEventListener('storage', fetchProfile);
        return () => {
            window.removeEventListener('nutrimunch_profile_updated', fetchProfile);
            window.removeEventListener('storage', fetchProfile);
        };
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleCustomTargetChange = (e) => {
        const { name, value } = e.target;
        setCustomTargets(prev => ({ ...prev, [name]: value }));
    };

    // Apply default baseline values
    const handleApplyDefaults = () => {
        setCustomTargets(DEFAULT_TARGETS);
        setMessage({ type: 'success', text: 'Reset targets to recommended default baseline.' });
    };

    // Metric / Imperial sync
    const handleMetricHeightChange = (e) => {
        const cm = parseFloat(e.target.value) || 0;
        const totalIn = cm / 2.54;
        setProfile(prev => ({
            ...prev,
            heightCm: cm,
            heightFt: Math.floor(totalIn / 12),
            heightIn: Math.round(totalIn % 12)
        }));
    };

    const handleImperialHeightChange = (ftVal, inVal) => {
        const ft = parseFloat(ftVal) || 0;
        const inch = parseFloat(inVal) || 0;
        const totalIn = ft * 12 + inch;
        const cm = Math.round(totalIn * 2.54);
        setProfile(prev => ({
            ...prev,
            heightFt: ft,
            heightIn: inch,
            heightCm: cm
        }));
    };

    const handleMetricWeightChange = (e) => {
        const kg = parseFloat(e.target.value) || 0;
        setProfile(prev => ({
            ...prev,
            weightKg: kg,
            weightLbs: Math.round(kg * 2.20462)
        }));
    };

    const handleImperialWeightChange = (e) => {
        const lbs = parseFloat(e.target.value) || 0;
        const kg = Math.round((lbs / 2.20462) * 10) / 10;
        setProfile(prev => ({
            ...prev,
            weightLbs: lbs,
            weightKg: kg
        }));
    };

    // Predefined Allergen Toggle
    const togglePredefinedAllergen = (allergenId) => {
        setProfile(prev => {
            const exists = prev.allergies.includes(allergenId);
            return {
                ...prev,
                allergies: exists
                    ? prev.allergies.filter(a => a !== allergenId)
                    : [...prev.allergies, allergenId]
            };
        });
    };

    // Add Custom Allergen Tag
    const addCustomAllergen = () => {
        if (!customAllergenInput.trim()) return;
        const tag = customAllergenInput.trim();
        if (!profile.customAllergies.includes(tag)) {
            setProfile(prev => ({
                ...prev,
                customAllergies: [...prev.customAllergies, tag]
            }));
        }
        setCustomAllergenInput('');
    };

    const removeCustomAllergen = (tag) => {
        setProfile(prev => ({
            ...prev,
            customAllergies: prev.customAllergies.filter(t => t !== tag)
        }));
    };

    // Cuisine Toggle
    const toggleCuisine = (cuisineId) => {
        setProfile(prev => {
            const exists = prev.cuisinePreferences.includes(cuisineId);
            return {
                ...prev,
                cuisinePreferences: exists
                    ? prev.cuisinePreferences.filter(c => c !== cuisineId)
                    : [...prev.cuisinePreferences, cuisineId]
            };
        });
    };

    // Favorite Foods Tag Handlers
    const addFavFood = () => {
        if (!favFoodInput.trim()) return;
        const tag = favFoodInput.trim();
        if (!profile.favoriteFoods.includes(tag)) {
            setProfile(prev => ({
                ...prev,
                favoriteFoods: [...prev.favoriteFoods, tag]
            }));
        }
        setFavFoodInput('');
    };

    const removeFavFood = (tag) => {
        setProfile(prev => ({
            ...prev,
            favoriteFoods: prev.favoriteFoods.filter(t => t !== tag)
        }));
    };

    // Disliked Foods Tag Handlers
    const addDislikedFood = () => {
        if (!dislikedFoodInput.trim()) return;
        const tag = dislikedFoodInput.trim();
        if (!profile.dislikedFoods.includes(tag)) {
            setProfile(prev => ({
                ...prev,
                dislikedFoods: [...prev.dislikedFoods, tag]
            }));
        }
        setDislikedFoodInput('');
    };

    const removeDislikedFood = (tag) => {
        setProfile(prev => ({
            ...prev,
            dislikedFoods: prev.dislikedFoods.filter(t => t !== tag)
        }));
    };

    // Save Profile
    const handleSave = async () => {
        const numAge = parseInt(profile.age, 10);
        const numHeight = parseFloat(profile.heightCm);
        const numWeight = parseFloat(profile.weightKg);

        if (!numAge || numAge <= 0) {
            setMessage({ type: 'error', text: 'Please enter a valid positive age' });
            return;
        }
        if (!numHeight || numHeight <= 0) {
            setMessage({ type: 'error', text: 'Please enter a valid positive height in cm' });
            return;
        }
        if (!numWeight || numWeight <= 0) {
            setMessage({ type: 'error', text: 'Please enter a valid positive weight in kg' });
            return;
        }

        setSaving(true);
        setMessage({ type: '', text: '' });

        if (!user) {
            setTargets(customTargets);
            setIsEditingRequirements(false);
            setSaving(false);
            setMessage({ type: 'success', text: 'Daily requirements updated in Guest Mode! Login or Register to save targets to your account.' });
            return;
        }

        // Combine predefined and custom allergies into single comma-separated string
        const combinedAllergies = [...profile.allergies, ...profile.customAllergies].join(', ');
        const combinedCuisines = profile.cuisinePreferences.join(', ');
        const combinedFavs = profile.favoriteFoods.join(', ');
        const combinedDislikes = profile.dislikedFoods.join(', ');

        const payload = {
            firstName: profile.firstName,
            lastName: profile.lastName,
            age: numAge,
            gender: profile.gender,
            heightCm: numHeight,
            weightKg: numWeight,
            activityLevel: profile.activityLevel,
            goal: profile.goal,
            dietType: profile.dietType,
            allergies: combinedAllergies,
            cuisinePreferences: combinedCuisines,
            favoriteFoods: combinedFavs,
            dislikedFoods: combinedDislikes,
            lifestyleClass: profile.lifestyleClass,
            mealBudget: profile.mealBudget,
            isCustomTargets: true,
            dailyCaloriesTarget: parseInt(customTargets.calories, 10) || DEFAULT_TARGETS.calories,
            proteinTarget: parseInt(customTargets.protein, 10) || DEFAULT_TARGETS.protein,
            carbsTarget: parseInt(customTargets.carbs, 10) || DEFAULT_TARGETS.carbs,
            fatsTarget: parseInt(customTargets.fats, 10) || DEFAULT_TARGETS.fats,
            sugarTargetG: parseInt(customTargets.sugar, 10) || DEFAULT_TARGETS.sugar,
            dailyWaterTargetLiters: parseFloat(customTargets.water) || DEFAULT_TARGETS.water,
            dailyFiberTargetG: parseInt(customTargets.fiber, 10) || DEFAULT_TARGETS.fiber,
            ironTargetMg: parseFloat(customTargets.iron) || DEFAULT_TARGETS.iron,
            calciumTargetMg: parseFloat(customTargets.calcium) || DEFAULT_TARGETS.calcium,
            vitDTargetMcg: parseFloat(customTargets.vitD) || DEFAULT_TARGETS.vitD,
            vitB12TargetMcg: parseFloat(customTargets.vitB12) || DEFAULT_TARGETS.vitB12,
            vitCTargetMg: parseFloat(customTargets.vitC) || DEFAULT_TARGETS.vitC,
            zincTargetMg: parseFloat(customTargets.zinc) || DEFAULT_TARGETS.zinc
        };

        try {
            const res = await api.put('/profiles/me', payload);
            if (res.data && res.data.dailyCaloriesTarget) {
                const updatedT = {
                    calories: res.data.dailyCaloriesTarget,
                    protein: res.data.proteinTarget,
                    carbs: res.data.carbsTarget,
                    fats: res.data.fatsTarget,
                    sugar: res.data.sugarTargetG || DEFAULT_TARGETS.sugar,
                    tdee: res.data.tdee,
                    bmr: res.data.bmr,
                    water: res.data.dailyWaterTargetLiters,
                    fiber: res.data.dailyFiberTargetG,
                    iron: res.data.ironTargetMg,
                    calcium: res.data.calciumTargetMg,
                    vitD: res.data.vitDTargetMcg,
                    vitB12: res.data.vitB12TargetMcg,
                    vitC: res.data.vitCTargetMg,
                    zinc: res.data.zincTargetMg
                };
                setTargets(updatedT);
                setCustomTargets(updatedT);
                if (updatedT.water) {
                    localStorage.setItem('nutrimunch_water_target_liters', updatedT.water.toString());
                    window.dispatchEvent(new Event('nutrimunch_profile_updated'));
                }
            }

            // Collapse form to display card mode after successful save
            setIsEditingRequirements(false);

            // Update user in local storage if names updated
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const updated = JSON.parse(storedUser);
                updated.firstName = profile.firstName;
                updated.lastName = profile.lastName;
                localStorage.setItem('user', JSON.stringify(updated));
            }

            setMessage({ type: 'success', text: 'Daily requirements saved & active target protocol updated!' });
        } catch (err) {
            console.error("Save error", err);
            const serverMsg = err.response?.data?.message || err.response?.data || err.message;
            setMessage({ type: 'error', text: serverMsg ? `Save failed: ${serverMsg}` : 'Failed to save profile. Please check input values.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh] text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#a5d391] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-white/60 font-semibold text-sm">Loading User Profile & Personalization Engine...</p>
                </div>
            </div>
        );
    }

    const rawRole = user?.role ? String(user.role).toUpperCase().replace('ROLE_', '') : 'USER';
    const isNutritionist = rawRole === 'NUTRITIONIST';

    return (
        <div className="w-full max-w-5xl mx-auto pb-16">
            {/* Professional Nutritionist Banner */}
            {isNutritionist && (
                <div className="mb-8 bg-gradient-to-r from-emerald-950/90 via-[#0d131f] to-[#080b12] border border-[#a5d391]/40 rounded-3xl p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">badge</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                Professional Nutritionist Account
                            </h3>
                            <p className="text-xs text-white/60 mt-0.5">
                                Manage your Clinical Specializations, Degrees, License ID, Fees, Bio & Patient Portfolio.
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/dashboard/nutritionist/profile"
                        className="px-5 py-2.5 rounded-2xl bg-[#a5d391] text-black font-bold text-xs hover:bg-white transition-all shadow-md shrink-0 flex items-center gap-1.5"
                    >
                        <span>Edit Clinical Profile</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                </div>
            )}

            {/* Header Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white flex items-center gap-3">
                        <span>User Profile & Personalization</span>
                    </h1>
                    <p className="text-sm text-white/60 mt-1">
                        Configure body metrics, diet protocols, allergens, and budget tiers to drive the AI Nutrition Engine.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#a5d391] hover:bg-white text-black px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap self-start md:self-auto disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-xl">save</span>
                    <span>{saving ? 'Saving...' : 'Save Parameters'}</span>
                </button>
            </div>

            {/* Notification Banner */}
            {message.text && (
                <div className={`p-4 mb-8 rounded-2xl border flex items-center gap-3 ${message.type === 'success' ? 'bg-[#a5d391]/10 border-[#a5d391] text-[#a5d391]' : 'bg-red-500/10 border-red-500 text-red-400'}`}>
                    <span className="material-symbols-outlined text-xl">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                    <div className="text-sm font-semibold">{message.text}</div>
                </div>
            )}

            {/* User Profile Header Card */}
            <div className="bg-gradient-to-r from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/15 rounded-[2.5rem] p-6 sm:p-8 mb-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <img
                        src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent((profile.firstName || 'U') + ' ' + (profile.lastName || ''))}&background=a5d391&color=000`}
                        alt="Profile"
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-[#080b12] outline outline-2 outline-[#a5d391]/60 shadow-2xl shrink-0"
                    />
                    <div className="text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a5d391]/15 text-[#a5d391] text-[11px] font-bold uppercase tracking-widest border border-[#a5d391]/30 mb-2">
                            <span className="w-2 h-2 rounded-full bg-[#a5d391] animate-pulse"></span>
                            {user?.role ? (
                                String(user.role).toUpperCase().replace('ROLE_', '') === 'ADMIN' ? 'Verified Administrator' :
                                String(user.role).toUpperCase().replace('ROLE_', '') === 'NUTRITIONIST' ? 'Certified Nutritionist' :
                                'Verified Standard User'
                            ) : 'Verified Standard User'}
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold font-hero-display text-white">
                            {profile.firstName || 'User'} {profile.lastName || ''}
                        </h2>
                        <div className="text-white/50 text-sm mt-0.5">{user?.email}</div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center md:justify-end items-center">
                    {/* Live App Wallet Balance Badge */}
                    <Link
                        to="/transactions"
                        title="View App Wallet & Transaction History"
                        className="bg-[#080b12]/90 hover:bg-white/10 px-4 py-2.5 rounded-2xl border border-[#a5d391]/30 hover:border-[#a5d391]/60 text-center shadow-[0_0_15px_rgba(165,211,145,0.15)] flex flex-col justify-center transition-all cursor-pointer group"
                    >
                        <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider flex items-center justify-center gap-1 group-hover:text-[#a5d391] transition-colors">
                            <span className="material-symbols-outlined text-[13px] text-[#a5d391]">account_balance_wallet</span>
                            App Wallet
                            <span className="material-symbols-outlined text-[11px] text-[#a5d391]">receipt_long</span>
                        </div>
                        <div className="text-sm font-bold font-mono text-[#a5d391]">
                            {walletLoading ? '...' : `₹${Number(walletBalance || 0).toFixed(2)}`}
                        </div>
                    </Link>

                    <div className="bg-[#080b12]/80 px-4 py-2.5 rounded-2xl border border-white/10 text-center">
                        <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Goal</div>
                        <div className="text-sm font-bold text-[#a5d391]">{profile.goal}</div>
                    </div>
                    <div className="bg-[#080b12]/80 px-4 py-2.5 rounded-2xl border border-white/10 text-center">
                        <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Diet</div>
                        <div className="text-sm font-bold text-[#38bdf8]">{profile.dietType}</div>
                    </div>
                    <div className="bg-[#080b12]/80 px-4 py-2.5 rounded-2xl border border-white/10 text-center">
                        <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Budget</div>
                        <div className="text-sm font-bold text-yellow-400">{profile.mealBudget}</div>
                    </div>
                </div>
            </div>

            {/* Mind Map 4-Node Navigation Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('body')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${activeTab === 'body' || activeTab === 'all' ? 'bg-[#a5d391]/15 border-[#a5d391] text-white shadow-[0_0_15px_rgba(165,211,145,0.2)]' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-[#a5d391] text-2xl">accessibility_new</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full text-white/80">Node 1</span>
                    </div>
                    <div className="font-bold text-sm text-white">Body Data</div>
                    <div className="text-xs text-white/50 mt-1 line-clamp-1">Name, age, height, weight & activity</div>
                </button>

                <button
                    onClick={() => setActiveTab('goals')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${activeTab === 'goals' || activeTab === 'all' ? 'bg-[#38bdf8]/15 border-[#38bdf8] text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-[#38bdf8] text-2xl">sports_score</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full text-white/80">Node 2</span>
                    </div>
                    <div className="font-bold text-sm text-white">Goals & Diets</div>
                    <div className="text-xs text-white/50 mt-1 line-clamp-1">Fitness goals & diet types</div>
                </button>

                <button
                    onClick={() => setActiveTab('allergies')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${activeTab === 'allergies' || activeTab === 'all' ? 'bg-amber-500/15 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-amber-400 text-2xl">warning</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full text-white/80">Node 3</span>
                    </div>
                    <div className="font-bold text-sm text-white">Allergies & Preferences</div>
                    <div className="text-xs text-white/50 mt-1 line-clamp-1">Allergen chips & cuisine filters</div>
                </button>

                <button
                    onClick={() => setActiveTab('budget')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${activeTab === 'budget' || activeTab === 'all' ? 'bg-purple-500/15 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-purple-400 text-2xl">payments</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full text-white/80">Node 4</span>
                    </div>
                    <div className="font-bold text-sm text-white">Budget Profiles</div>
                    <div className="text-xs text-white/50 mt-1 line-clamp-1">Lifestyle class & meal budget</div>
                </button>
            </div>

            {/* View Filter Pill Switcher */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 text-xs">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'all' ? 'bg-[#a5d391] text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                    >
                        View All Sections
                    </button>
                    <button
                        onClick={() => setActiveTab('body')}
                        className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'body' ? 'bg-[#a5d391] text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                    >
                        Body Data
                    </button>
                    <button
                        onClick={() => setActiveTab('goals')}
                        className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'goals' ? 'bg-[#a5d391] text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                    >
                        Goals & Diets
                    </button>
                    <button
                        onClick={() => setActiveTab('allergies')}
                        className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'allergies' ? 'bg-[#a5d391] text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                    >
                        Allergies & Preferences
                    </button>
                    <button
                        onClick={() => setActiveTab('budget')}
                        className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'budget' ? 'bg-[#a5d391] text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                    >
                        Budget Profiles
                    </button>
                </div>

                {/* Units Switcher */}
                <div className="hidden sm:flex items-center gap-1.5 bg-[#080b12]/80 border border-white/10 p-1.5 rounded-2xl text-xs">
                    <span className="text-white/40 px-2 font-bold uppercase tracking-wider text-[10px]">Units:</span>
                    <button
                        onClick={() => setUnitMode('metric')}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${unitMode === 'metric' ? 'bg-[#38bdf8] text-black' : 'text-white/50 hover:text-white'}`}
                    >
                        Metric (cm / kg)
                    </button>
                    <button
                        onClick={() => setUnitMode('imperial')}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${unitMode === 'imperial' ? 'bg-[#38bdf8] text-black' : 'text-white/50 hover:text-white'}`}
                    >
                        Imperial (ft / lbs)
                    </button>
                </div>
            </div>

            {/* NODE 1: BODY DATA */}
            {(activeTab === 'all' || activeTab === 'body') && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 mb-8 shadow-xl relative">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#a5d391]/20 border border-[#a5d391]/40 flex items-center justify-center text-[#a5d391]">
                                <span className="material-symbols-outlined">accessibility_new</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold font-hero-display text-white">Body Data</h3>
                                <p className="text-xs text-white/50">Name, age, gender, height, weight & physiological activity level</p>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-[#a5d391] bg-[#a5d391]/10 px-3 py-1 rounded-full border border-[#a5d391]/20">Branch 1</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* First Name */}
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-[#a5d391] mb-2 block">First Name</label>
                            <input
                                type="text"
                                name="firstName"
                                value={profile.firstName}
                                onChange={handleChange}
                                className="w-full bg-[#080b12]/80 border border-white/10 px-4 py-3.5 rounded-2xl font-bold text-white outline-none focus:border-[#a5d391]/50 transition-colors"
                                placeholder="First Name"
                            />
                        </div>

                        {/* Last Name */}
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-[#a5d391] mb-2 block">Last Name</label>
                            <input
                                type="text"
                                name="lastName"
                                value={profile.lastName}
                                onChange={handleChange}
                                className="w-full bg-[#080b12]/80 border border-white/10 px-4 py-3.5 rounded-2xl font-bold text-white outline-none focus:border-[#a5d391]/50 transition-colors"
                                placeholder="Last Name"
                            />
                        </div>

                        {/* Age */}
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-[#a5d391] mb-2 block flex items-center justify-between">
                                <span>Age (Years)</span>
                                {profile.age && <span className="text-[10px] text-white/40 font-normal">{profile.age < 30 ? 'Young Adult' : profile.age < 55 ? 'Adult' : 'Senior'} Stage</span>}
                            </label>
                            <input
                                type="number"
                                name="age"
                                value={profile.age}
                                onChange={handleChange}
                                className="w-full bg-[#080b12]/80 border border-white/10 px-4 py-3.5 rounded-2xl font-bold text-white outline-none focus:border-[#a5d391]/50 transition-colors"
                                placeholder="Years (e.g. 25)"
                            />
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-[#a5d391] mb-2 block">Gender</label>
                            <select
                                name="gender"
                                value={profile.gender}
                                onChange={handleChange}
                                className="w-full bg-[#080b12]/80 border border-white/10 px-4 py-3.5 rounded-2xl font-bold text-white appearance-none outline-none focus:border-[#a5d391]/50 transition-colors"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other / Non-binary</option>
                            </select>
                        </div>

                        {/* Height */}
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-[#a5d391] mb-2 block flex items-center justify-between">
                                <span>Height</span>
                                <span className="text-[10px] text-white/40">{unitMode === 'metric' ? `${profile.heightCm} cm` : `${profile.heightFt} ft ${profile.heightIn} in`}</span>
                            </label>
                            {unitMode === 'metric' ? (
                                <input
                                    type="number"
                                    name="heightCm"
                                    value={profile.heightCm}
                                    onChange={handleMetricHeightChange}
                                    className="w-full bg-[#080b12]/80 border border-white/10 px-4 py-3.5 rounded-2xl font-bold text-white outline-none focus:border-[#a5d391]/50 transition-colors"
                                    placeholder="Height in cm"
                                />
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="number"
                                        value={profile.heightFt}
                                        onChange={(e) => handleImperialHeightChange(e.target.value, profile.heightIn)}
                                        className="bg-[#080b12]/80 border border-white/10 px-4 py-3.5 rounded-2xl font-bold text-white outline-none focus:border-[#a5d391]/50 transition-colors"
                                        placeholder="Feet"
                                    />
                                    <input
                                        type="number"
                                        value={profile.heightIn}
                                        onChange={(e) => handleImperialHeightChange(profile.heightFt, e.target.value)}
                                        className="bg-[#080b12]/80 border border-white/10 px-4 py-3.5 rounded-2xl font-bold text-white outline-none focus:border-[#a5d391]/50 transition-colors"
                                        placeholder="Inches"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Weight */}
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-[#a5d391] mb-2 block flex items-center justify-between">
                                <span>Weight</span>
                                <span className="text-[10px] text-white/40">{unitMode === 'metric' ? `${profile.weightKg} kg` : `${profile.weightLbs} lbs`}</span>
                            </label>
                            {unitMode === 'metric' ? (
                                <input
                                    type="number"
                                    name="weightKg"
                                    value={profile.weightKg}
                                    onChange={handleMetricWeightChange}
                                    className="w-full bg-[#080b12]/80 border border-white/10 px-4 py-3.5 rounded-2xl font-bold text-white outline-none focus:border-[#a5d391]/50 transition-colors"
                                    placeholder="Weight in kg"
                                />
                            ) : (
                                <input
                                    type="number"
                                    name="weightLbs"
                                    value={profile.weightLbs}
                                    onChange={handleImperialWeightChange}
                                    className="w-full bg-[#080b12]/80 border border-white/10 px-4 py-3.5 rounded-2xl font-bold text-white outline-none focus:border-[#a5d391]/50 transition-colors"
                                    placeholder="Weight in lbs"
                                />
                            )}
                        </div>
                    </div>

                    {/* Activity Level Selection Cards */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-[#a5d391] mb-3 block">
                            Activity Level Selection
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            {[
                                { id: 'Sedentary', title: 'Sedentary', icon: '🧘', desc: 'Desk job, minimal daily movement' },
                                { id: 'Lightly Active', title: 'Lightly Active', icon: '🚶', desc: 'Light exercise 1-3 days/week' },
                                { id: 'Moderately Active', title: 'Moderately Active', icon: '🏃', desc: 'Moderate exercise 3-5 days/week' },
                                { id: 'Very Active', title: 'Very Active', icon: '🏋️', desc: 'Heavy sports 6-7 days/week' },
                                { id: 'Highly Active-Athlete', title: 'Athlete / Extra', icon: '⚡', desc: 'Intense 2x daily workouts or manual labor' }
                            ].map((act) => (
                                <button
                                    key={act.id}
                                    type="button"
                                    onClick={() => setProfile(prev => ({ ...prev, activityLevel: act.id }))}
                                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${profile.activityLevel === act.id ? 'bg-[#a5d391]/20 border-[#a5d391] text-white shadow-lg' : 'bg-[#080b12]/60 border-white/10 text-white/70 hover:border-white/30'}`}
                                >
                                    <div className="text-2xl mb-2">{act.icon}</div>
                                    <div className="font-bold text-xs text-white mb-1">{act.title}</div>
                                    <div className="text-[10px] text-white/50 leading-tight">{act.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* NODE 2: GOALS & DIETS */}
            {(activeTab === 'all' || activeTab === 'goals') && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 mb-8 shadow-xl relative">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#38bdf8]/20 border border-[#38bdf8]/40 flex items-center justify-center text-[#38bdf8]">
                                <span className="material-symbols-outlined">sports_score</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold font-hero-display text-white">Goals & Diets</h3>
                                <p className="text-xs text-white/50">Fitness goal target & dietary classification protocol</p>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-[#38bdf8] bg-[#38bdf8]/10 px-3 py-1 rounded-full border border-[#38bdf8]/20">Branch 2</span>
                    </div>

                    {/* Fitness Goals */}
                    <div className="mb-8">
                        <label className="text-xs font-bold uppercase tracking-widest text-[#38bdf8] mb-3 block">
                            Fitness Goals (Weight Loss, Muscle Gain, etc.)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            {[
                                { id: 'Weight Loss', title: 'Weight Loss', icon: '🔥', desc: 'Caloric deficit (-500 kcal) for body fat reduction' },
                                { id: 'Muscle Gain', title: 'Muscle Gain', icon: '🏋️‍♂️', desc: 'Caloric surplus (+500 kcal) with high protein' },
                                { id: 'Weight Maintenance', title: 'Maintenance', icon: '⚖️', desc: 'Caloric balance to maintain current weight' },
                                { id: 'Strength-Performance', title: 'Performance', icon: '⚡', desc: 'Optimized energy & carb fueling for athletes' },
                                { id: 'General Nutrition', title: 'General Health', icon: '🥗', desc: 'Balanced vitality and micronutrient focus' }
                            ].map((g) => (
                                <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => setProfile(prev => ({ ...prev, goal: g.id }))}
                                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${profile.goal === g.id ? 'bg-[#38bdf8]/20 border-[#38bdf8] text-white shadow-lg' : 'bg-[#080b12]/60 border-white/10 text-white/70 hover:border-white/30'}`}
                                >
                                    <div className="text-2xl mb-2">{g.icon}</div>
                                    <div className="font-bold text-xs text-white mb-1">{g.title}</div>
                                    <div className="text-[10px] text-white/50 leading-tight">{g.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Diet Types */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-[#38bdf8] mb-3 block">
                            Diet Types (Vegetarian, Vegan, Non-Veg, etc.)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                            {[
                                { id: 'Vegetarian', title: 'Vegetarian', icon: '🥗' },
                                { id: 'Non-Vegetarian', title: 'Non-Veg', icon: '🍗' },
                                { id: 'Vegan', title: 'Vegan', icon: '🌿' },
                                { id: 'Eggetarian', title: 'Eggetarian', icon: '🥚' },
                                { id: 'Pescatarian', title: 'Pescatarian', icon: '🐟' },
                                { id: 'Keto', title: 'Keto', icon: '🥑' },
                                { id: 'Paleo', title: 'Paleo', icon: '🥩' }
                            ].map((d) => (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => setProfile(prev => ({ ...prev, dietType: d.id }))}
                                    className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${profile.dietType === d.id ? 'bg-[#38bdf8]/20 border-[#38bdf8] text-white shadow-lg' : 'bg-[#080b12]/60 border-white/10 text-white/70 hover:border-white/30'}`}
                                >
                                    <div className="text-2xl mb-1">{d.icon}</div>
                                    <div className="font-bold text-xs">{d.title}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* NODE 3: ALLERGIES & PREFERENCES */}
            {(activeTab === 'all' || activeTab === 'allergies') && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 mb-8 shadow-xl relative">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                                <span className="material-symbols-outlined">warning</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold font-hero-display text-white">Allergies & Preferences</h3>
                                <p className="text-xs text-white/50">Predefined & custom allergen recording and cuisine/flavor preferences</p>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">Branch 3</span>
                    </div>

                    {/* Predefined Allergen Chips */}
                    <div className="mb-6">
                        <label className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3 block">
                            Predefined Allergen Recording
                        </label>
                        <div className="flex flex-wrap gap-2.5">
                            {PREDEFINED_ALLERGENS.map((item) => {
                                const active = profile.allergies.includes(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => togglePredefinedAllergen(item.id)}
                                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${active ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'bg-[#080b12]/80 text-white/70 border-white/10 hover:border-white/30'}`}
                                    >
                                        <span>{item.icon}</span>
                                        <span>{item.label}</span>
                                        {active && <span className="material-symbols-outlined text-sm">check</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Custom Allergen Recording */}
                    <div className="mb-8">
                        <label className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2 block">
                            Custom Allergen Recording
                        </label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={customAllergenInput}
                                onChange={(e) => setCustomAllergenInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomAllergen(); } }}
                                placeholder="Type custom allergen (e.g. Kiwi, Mustard, Mushrooms) & press Enter"
                                className="flex-grow bg-[#080b12]/80 border border-white/10 px-4 py-3 rounded-2xl font-bold text-xs text-white outline-none focus:border-amber-400/50 transition-colors"
                            />
                            <button
                                type="button"
                                onClick={addCustomAllergen}
                                className="bg-amber-500 hover:bg-amber-400 text-black px-5 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                            >
                                + Add Tag
                            </button>
                        </div>
                        {profile.customAllergies.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {profile.customAllergies.map((tag) => (
                                    <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                                        <span>⚠️ {tag}</span>
                                        <button type="button" onClick={() => removeCustomAllergen(tag)} className="hover:text-white cursor-pointer ml-1">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Food & Cuisine Preferences */}
                    <div className="pt-4 border-t border-white/10">
                        <label className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3 block">
                            Food & Cuisine Preferences
                        </label>

                        {/* Cuisine Chips */}
                        <div className="mb-6">
                            <div className="text-xs font-semibold text-white/70 mb-2">Preferred Cuisines:</div>
                            <div className="flex flex-wrap gap-2">
                                {CUISINES.map((c) => {
                                    const active = profile.cuisinePreferences.includes(c.id);
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => toggleCuisine(c.id)}
                                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${active ? 'bg-amber-400/20 text-amber-300 border-amber-400 shadow-md' : 'bg-[#080b12]/60 text-white/60 border-white/10 hover:border-white/30'}`}
                                        >
                                            <span>{c.flag}</span>
                                            <span>{c.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Favorite Foods */}
                        <div className="mb-6">
                            <div className="text-xs font-semibold text-white/70 mb-2">Favorite Foods & Ingredients:</div>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={favFoodInput}
                                    onChange={(e) => setFavFoodInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFavFood(); } }}
                                    placeholder="Add favorite food tag (e.g. Avocado, Grilled Salmon, Paneer)"
                                    className="flex-grow bg-[#080b12]/80 border border-white/10 px-4 py-2.5 rounded-2xl font-bold text-xs text-white outline-none focus:border-amber-400/50"
                                />
                                <button type="button" onClick={addFavFood} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer">+ Add</button>
                            </div>
                            {profile.favoriteFoods.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {profile.favoriteFoods.map((tag) => (
                                        <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                                            <span>❤️ {tag}</span>
                                            <button type="button" onClick={() => removeFavFood(tag)} className="hover:text-white cursor-pointer">×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Disliked Foods */}
                        <div>
                            <div className="text-xs font-semibold text-white/70 mb-2">Disliked Foods & Ingredients:</div>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={dislikedFoodInput}
                                    onChange={(e) => setDislikedFoodInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDislikedFood(); } }}
                                    placeholder="Add disliked food tag (e.g. Bitter gourd, Organ meats, Olives)"
                                    className="flex-grow bg-[#080b12]/80 border border-white/10 px-4 py-2.5 rounded-2xl font-bold text-xs text-white outline-none focus:border-amber-400/50"
                                />
                                <button type="button" onClick={addDislikedFood} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer">+ Add</button>
                            </div>
                            {profile.dislikedFoods.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {profile.dislikedFoods.map((tag) => (
                                        <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold">
                                            <span>🚫 {tag}</span>
                                            <button type="button" onClick={() => removeDislikedFood(tag)} className="hover:text-white cursor-pointer">×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* NODE 4: BUDGET PROFILES */}
            {(activeTab === 'all' || activeTab === 'budget') && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 mb-8 shadow-xl relative">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                                <span className="material-symbols-outlined">payments</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold font-hero-display text-white">Budget Profiles</h3>
                                <p className="text-xs text-white/50">Lifestyle class & meal budget tier classification for generative AI meal planning</p>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">Branch 4</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Lifestyle Class */}
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-3 block">
                                Lifestyle Class (Middle or High-Income)
                            </label>
                            <div className="space-y-3">
                                {[
                                    { id: 'Middle-Class', title: 'Middle-Class', icon: '📊', desc: 'Cost-conscious nutrition, everyday pantry staples, high meal value' },
                                    { id: 'High-Income Class', title: 'High-Income Class', icon: '💎', desc: 'Premium organic, imported delicacies, artisanal & prime selections' },
                                    { id: 'Student/Economy', title: 'Student / Economy Tier', icon: '🎓', desc: 'Maximum budget optimization & streamlined batch meal prep' }
                                ].map((lc) => (
                                    <button
                                        key={lc.id}
                                        type="button"
                                        onClick={() => setProfile(prev => ({ ...prev, lifestyleClass: lc.id }))}
                                        className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${profile.lifestyleClass === lc.id ? 'bg-purple-500/20 border-purple-400 text-white shadow-lg' : 'bg-[#080b12]/60 border-white/10 text-white/70 hover:border-white/30'}`}
                                    >
                                        <span className="text-2xl">{lc.icon}</span>
                                        <div>
                                            <div className="font-bold text-sm text-white">{lc.title}</div>
                                            <div className="text-xs text-white/50 mt-0.5">{lc.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Meal Budget Tier */}
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-3 block">
                                Meal Budget Tier (Budget or Premium)
                            </label>
                            <div className="space-y-3">
                                {[
                                    { id: 'Budget/Affordable', title: 'Budget / Affordable ($)', icon: '💰', desc: 'Economical localized meal plans prioritizing affordability' },
                                    { id: 'Moderate', title: 'Moderate ($$)', icon: '⚖️', desc: 'Balanced variety with quality ingredient flexibility' },
                                    { id: 'High/Premium', title: 'High / Premium ($$$)', icon: '✨', desc: 'Unconstrained luxury, organic superfoods & chef recipes' }
                                ].map((mb) => (
                                    <button
                                        key={mb.id}
                                        type="button"
                                        onClick={() => setProfile(prev => ({ ...prev, mealBudget: mb.id }))}
                                        className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${profile.mealBudget === mb.id ? 'bg-purple-500/20 border-purple-400 text-white shadow-lg' : 'bg-[#080b12]/60 border-white/10 text-white/70 hover:border-white/30'}`}
                                    >
                                        <span className="text-2xl">{mb.icon}</span>
                                        <div>
                                            <div className="font-bold text-sm text-white">{mb.title}</div>
                                            <div className="text-xs text-white/50 mt-0.5">{mb.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DAILY REQUIREMENTS SECTION */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-white/5 to-[#a5d391]/10 backdrop-blur-xl border border-[#a5d391]/40 rounded-[2.5rem] p-6 sm:p-8 mb-8 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#a5d391] text-3xl">tune</span>
                        <div>
                            <h3 className="text-xl font-bold font-hero-display text-white">Daily Requirements</h3>
                            <p className="text-xs text-white/50">
                                {isEditingRequirements
                                    ? 'Fill your daily nutrition targets manually below or click "Apply Default Baseline".'
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
                                className="bg-[#a5d391] hover:bg-white text-black px-5 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-[0_0_15px_rgba(165,211,145,0.3)] cursor-pointer flex items-center gap-2 whitespace-nowrap"
                            >
                                <span className="material-symbols-outlined text-sm">edit</span>
                                <span>Edit Requirements</span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleApplyDefaults}
                                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-sm">restart_alt</span>
                                    <span>Default Baseline</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-[#a5d391] hover:bg-white text-black px-5 py-2 rounded-2xl font-bold text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(165,211,145,0.3)] flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-sm">save</span>
                                    <span>{saving ? 'Saving...' : 'Save'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* VISUAL STATE A: LOCKED IN SAVED TARGET PROTOCOL CARD VIEW */}
                {!isEditingRequirements ? (
                    <div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-[#080b12]/90 p-4 rounded-2xl border border-white/10 text-center">
                                <div className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-1">Daily Calories</div>
                                <div className="text-2xl font-bold text-white">{customTargets.calories || 2000} <span className="text-xs font-normal text-white/50">kcal</span></div>
                            </div>

                            <div className="bg-[#080b12]/90 p-4 rounded-2xl border border-white/10 text-center">
                                <div className="text-[#a5d391]/70 text-[10px] font-bold uppercase tracking-wider mb-1">Protein Target</div>
                                <div className="text-2xl font-bold text-[#a5d391]">{customTargets.protein || 140} <span className="text-xs font-normal text-[#a5d391]/70">g</span></div>
                            </div>

                            <div className="bg-[#080b12]/90 p-4 rounded-2xl border border-white/10 text-center">
                                <div className="text-pink-400/70 text-[10px] font-bold uppercase tracking-wider mb-1">Sugar Limit</div>
                                <div className="text-2xl font-bold text-pink-400">{customTargets.sugar || 50} <span className="text-xs font-normal text-pink-400/70">g</span></div>
                            </div>

                            <div className="bg-[#080b12]/90 p-4 rounded-2xl border border-white/10 text-center">
                                <div className="text-yellow-400/70 text-[10px] font-bold uppercase tracking-wider mb-1">Fats Target</div>
                                <div className="text-2xl font-bold text-yellow-400">{customTargets.fats || 65} <span className="text-xs font-normal text-yellow-400/70">g</span></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* VISUAL STATE B: FORM INPUT EDITING MODE */
                    <div>
                        {/* Main Macro Inputs Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {/* Calories */}
                            <div className="bg-[#080b12]/90 p-4 rounded-2xl border border-white/10">
                                <div className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">Daily Calories (kcal)</div>
                                <input
                                    type="number"
                                    name="calories"
                                    value={customTargets.calories}
                                    onChange={handleCustomTargetChange}
                                    className="w-full bg-white/5 border border-[#38bdf8]/40 px-3 py-2 rounded-xl text-xl font-bold text-white outline-none focus:border-[#38bdf8]"
                                    placeholder="e.g. 2000"
                                />
                            </div>

                            {/* Protein */}
                            <div className="bg-[#080b12]/90 p-4 rounded-2xl border border-white/10">
                                <div className="text-[#a5d391]/70 text-[10px] font-bold uppercase tracking-wider mb-2">Protein Target (g)</div>
                                <input
                                    type="number"
                                    name="protein"
                                    value={customTargets.protein}
                                    onChange={handleCustomTargetChange}
                                    className="w-full bg-white/5 border border-[#a5d391]/40 px-3 py-2 rounded-xl text-xl font-bold text-[#a5d391] outline-none focus:border-[#a5d391]"
                                    placeholder="e.g. 140"
                                />
                            </div>

                            {/* Sugar */}
                            <div className="bg-[#080b12]/90 p-4 rounded-2xl border border-white/10">
                                <div className="text-pink-400/70 text-[10px] font-bold uppercase tracking-wider mb-2">Sugar Limit (g)</div>
                                <input
                                    type="number"
                                    name="sugar"
                                    value={customTargets.sugar}
                                    onChange={handleCustomTargetChange}
                                    className="w-full bg-white/5 border border-pink-400/40 px-3 py-2 rounded-xl text-xl font-bold text-pink-400 outline-none focus:border-pink-400"
                                    placeholder="e.g. 50"
                                />
                            </div>

                            {/* Fats */}
                            <div className="bg-[#080b12]/90 p-4 rounded-2xl border border-white/10">
                                <div className="text-yellow-400/70 text-[10px] font-bold uppercase tracking-wider mb-2">Fats Target (g)</div>
                                <input
                                    type="number"
                                    name="fats"
                                    value={customTargets.fats}
                                    onChange={handleCustomTargetChange}
                                    className="w-full bg-white/5 border border-yellow-400/40 px-3 py-2 rounded-xl text-xl font-bold text-yellow-400 outline-none focus:border-yellow-400"
                                    placeholder="e.g. 65"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Save Action Bar */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/10">
                <div className="text-xs text-white/40">
                    All updates trigger real-time AI meal plan and recommendation recalculation.
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#a5d391] hover:bg-white text-black px-8 py-4 rounded-2xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save & Calibrate Engine'}
                </button>
            </div>
        </div>
    );
};

export default Profile;
