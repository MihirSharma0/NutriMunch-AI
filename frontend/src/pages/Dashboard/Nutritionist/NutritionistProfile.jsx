/**
 * Certified Nutritionist Profile & Practice Settings
 * Manages clinical credentials, medical license, specialization focus,
 * consultation fees, and public biography.
 */
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import api from '../../../api/axios';
import { User, Award, CheckCircle, Shield, Clock, DollarSign, Globe, BadgeCheck, Stethoscope, Sparkles, Mail, Calendar } from 'lucide-react';

/**
 * NutritionistProfile Component
 * Professional credentials and consultation rate management interface for nutritionists.
 */
const NutritionistProfile = () => {
    const { user } = useContext(AuthContext);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Personal & Professional Profile Form Fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('Prefer not to say');
    const [specializationCategory, setSpecializationCategory] = useState('Clinical & Medical Nutrition');
    const [specializationDetail, setSpecializationDetail] = useState('');
    const [credentials, setCredentials] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [yearsOfExperience, setYearsOfExperience] = useState('5+ Years');
    const [consultationFee, setConsultationFee] = useState('₹1,500 / Session');
    const [languages, setLanguages] = useState('English, Hindi');
    const [availability, setAvailability] = useState('Mon-Fri | 09:00 AM - 05:00 PM EST');
    const [bio, setBio] = useState('');

    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');
            setRegisteredEmail(user.email || '');
        }
        fetchProfile();

        const handleProfileUpdate = () => {
            fetchProfile();
        };

        window.addEventListener('nutrimunch_profile_updated', handleProfileUpdate);
        window.addEventListener('focus', handleProfileUpdate);
        window.addEventListener('storage', handleProfileUpdate);

        let bc;
        try {
            bc = new BroadcastChannel('nutrimunch_clinical_channel');
            bc.onmessage = () => fetchProfile();
        } catch (e) {}

        return () => {
            window.removeEventListener('nutrimunch_profile_updated', handleProfileUpdate);
            window.removeEventListener('focus', handleProfileUpdate);
            window.removeEventListener('storage', handleProfileUpdate);
            if (bc) bc.close();
        };
    }, [user]);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/nutritionist/profile');
            const data = response.data;
            setProfile(data);
            if (data.email) setRegisteredEmail(data.email);
            if (data.age != null) setAge(String(data.age));
            if (data.gender) setGender(data.gender);

            if (data.specialization) {
                const parts = data.specialization.split(' • ');
                if (parts.length > 1) {
                    setSpecializationCategory(parts[0]);
                    setSpecializationDetail(parts.slice(1).join(' • '));
                } else {
                    setSpecializationDetail(data.specialization);
                }
            }
            setCredentials(data.credentials || 'Registered Nutritionist (RD) • M.Sc. Clinical Nutrition');
            setLicenseNumber(data.licenseNumber || 'RD-84920-IN');
            setYearsOfExperience(data.yearsOfExperience || '7+ Years Experience');
            setConsultationFee(data.consultationFee || '₹1,500 / Session');
            setLanguages(data.languages || 'English, Hindi');
            setAvailability(data.availability || 'Mon-Fri | 09:00 AM - 05:00 PM EST');
            setBio(data.bio || 'Dedicated clinical nutritionist specializing in metabolic health optimization, biomarker analysis, personalized macronutrient protocols, and sustainable lifestyle transformation.');
        } catch (error) {
            console.error("Error fetching nutritionist profile:", error);
            setMessage({ text: 'Failed to load profile details from server.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        const combinedSpecialization = specializationDetail
            ? `${specializationCategory} • ${specializationDetail}`
            : specializationCategory;

        try {
            await api.put('/nutritionist/profile', {
                firstName,
                lastName,
                age,
                gender,
                specialization: combinedSpecialization,
                credentials,
                licenseNumber,
                yearsOfExperience,
                consultationFee,
                languages,
                availability,
                bio
            });
            setMessage({ text: 'Professional clinical profile updated live!', type: 'success' });
            fetchProfile();
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage({ text: 'Failed to update professional profile.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a5d391]"></div>
            </div>
        );
    }

    const isApproved = Boolean(profile?.isApproved === true || profile?.approvalStatus === 'APPROVED' || profile?.approvalStatus === 'VERIFIED');
    const fullName = `${firstName} ${lastName}`.trim() || registeredEmail || user?.email || 'Certified Nutritionist';

    return (
        <div className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-8 animate-fadeIn">
            {/* Header Title & Verification Badge */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/40 via-[#090d16] to-[#080b12] border border-[#a5d391]/30 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#a5d391]/10 blur-3xl pointer-events-none"></div>
                <div className="flex items-center gap-4">
                    {isApproved ? (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#a5d391] to-emerald-400 text-black flex items-center justify-center font-black text-xl shadow-lg border border-[#a5d391]/50 shrink-0">
                            {fullName.split(' ').map(n => n[0]).join('') || 'DR'}
                        </div>
                    ) : (
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 p-2 flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
                            <img src="/pending_avatar.png" alt="Pending Approval" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-white font-hero-display tracking-tight">{fullName}</h1>
                            <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border ${isApproved ? 'bg-[#a5d391]/20 text-[#a5d391] border-[#a5d391]/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                                <BadgeCheck className="w-3.5 h-3.5" />
                                {isApproved ? 'Verified Clinical Nutritionist' : 'Pending Admin Verification'}
                            </span>
                        </div>
                        <p className="text-white/50 text-xs mt-1">
                            {registeredEmail ? `Registered Account: ${registeredEmail}` : 'Manage public profile, specializations, credentials & patient consultation settings.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">License ID</div>
                        <div className="text-xs font-mono font-bold text-[#a5d391]">{licenseNumber || 'RD-84920-IN'}</div>
                    </div>
                </div>
            </div>

            {!isApproved && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/40">
                            <span className="material-symbols-outlined text-amber-300">hourglass_empty</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-white">License Verification Pending Approval</h4>
                            <p className="text-xs text-amber-300/80 mt-0.5">
                                Your nutritionist license credentials are currently awaiting approval from system administrators.
                            </p>
                        </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 border border-amber-500/40 shrink-0 text-center">
                        Pending Admin Verification
                    </span>
                </div>
            )}

            {message.text && (
                <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg animate-fadeIn ${
                    message.type === 'success'
                        ? 'bg-[#a5d391]/10 border border-[#a5d391]/30 text-[#a5d391]'
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : null}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Main Profile Editor Form (Left 2 Columns) */}
                <div className="lg:col-span-2 bg-[#090d16]/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl space-y-6">
                    <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                        <Stethoscope className="w-5 h-5 text-[#a5d391]" />
                        <h2 className="text-lg font-bold text-white font-hero-display">Personal & Professional Credentials</h2>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">

                        {/* Registered Email (Read-Only) */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-[#a5d391]" />
                                    Registered Email Address
                                </label>
                                <span className="text-[9px] font-black uppercase tracking-wider text-[#a5d391] bg-[#a5d391]/10 px-2 py-0.5 rounded-full border border-[#a5d391]/20">
                                    Verified Account Email
                                </span>
                            </div>
                            <input
                                type="email"
                                value={registeredEmail || user?.email || ''}
                                disabled
                                className="w-full bg-[#0d121c]/60 border border-white/10 rounded-xl py-3 px-4 text-xs text-white/60 font-semibold focus:outline-none cursor-not-allowed"
                            />
                        </div>

                        {/* Name Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-[#a5d391]" />
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-semibold focus:border-[#a5d391] focus:outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-[#a5d391]" />
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-semibold focus:border-[#a5d391] focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Demographics: Age & Gender */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-[#a5d391]" />
                                    Age (Years)
                                </label>
                                <input
                                    type="number"
                                    min="18"
                                    max="100"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    placeholder="e.g. 32"
                                    className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-semibold focus:border-[#a5d391] focus:outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-[#a5d391]" />
                                    Gender
                                </label>
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-semibold focus:border-[#a5d391] focus:outline-none transition-all cursor-pointer"
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Non-Binary / Other">Non-Binary / Other</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                </select>
                            </div>
                        </div>

                        {/* Specialization Category Dropdown & Custom Focus */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                    <Award className="w-3.5 h-3.5 text-[#a5d391]" />
                                    Primary Clinical Specialization
                                </label>
                                <select
                                    value={specializationCategory}
                                    onChange={(e) => setSpecializationCategory(e.target.value)}
                                    className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-semibold focus:border-[#a5d391] focus:outline-none transition-all cursor-pointer"
                                >
                                    <option value="Clinical & Medical Nutrition">Clinical & Medical Nutrition</option>
                                    <option value="Sports & Performance Nutrition">Sports & Performance Nutrition</option>
                                    <option value="PCOS, Fertility & Hormonal Health">PCOS, Fertility & Hormonal Health</option>
                                    <option value="Diabetes & Metabolic Health">Diabetes & Metabolic Health</option>
                                    <option value="Pediatric & Family Nutrition">Pediatric & Family Nutrition</option>
                                    <option value="Renal & Cardiovascular Health">Renal & Cardiovascular Health</option>
                                    <option value="Weight Management & Body Composition">Weight Management & Body Composition</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-[#a5d391]" />
                                    Sub-Focus / Keyword Tag
                                </label>
                                <input
                                    type="text"
                                    value={specializationDetail}
                                    onChange={(e) => setSpecializationDetail(e.target.value)}
                                    placeholder="e.g. Insulin Resistance, VO2 Max Protocols"
                                    className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-semibold focus:border-[#a5d391] focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Credentials & Registration License */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-[#a5d391]" />
                                    Academic Degrees & Titles
                                </label>
                                <input
                                    type="text"
                                    value={credentials}
                                    onChange={(e) => setCredentials(e.target.value)}
                                    placeholder="e.g. Registered Nutritionist (RD), M.Sc. Nutrition"
                                    className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-semibold focus:border-[#a5d391] focus:outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                    <BadgeCheck className="w-3.5 h-3.5 text-[#a5d391]" />
                                    Medical License / Reg Number
                                </label>
                                <input
                                    type="text"
                                    value={licenseNumber}
                                    onChange={(e) => setLicenseNumber(e.target.value)}
                                    placeholder="e.g. RD-84920-IN"
                                    className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-semibold focus:border-[#a5d391] focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Experience, Fee, Languages */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-[#a5d391]" />
                                    Clinical Experience
                                </label>
                                <input
                                    type="text"
                                    value={yearsOfExperience}
                                    onChange={(e) => setYearsOfExperience(e.target.value)}
                                    placeholder="e.g. 7+ Years Exp."
                                    className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-semibold focus:border-[#a5d391] focus:outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                    <DollarSign className="w-3.5 h-3.5 text-[#a5d391]" />
                                    Consultation Rate
                                </label>
                                <input
                                    type="text"
                                    value={consultationFee}
                                    onChange={(e) => setConsultationFee(e.target.value)}
                                    placeholder="e.g. ₹1,500 / Session"
                                    className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-semibold focus:border-[#a5d391] focus:outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                    <Globe className="w-3.5 h-3.5 text-[#a5d391]" />
                                    Languages
                                </label>
                                <input
                                    type="text"
                                    value={languages}
                                    onChange={(e) => setLanguages(e.target.value)}
                                    placeholder="e.g. English, Hindi"
                                    className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-semibold focus:border-[#a5d391] focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Availability Hours */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-[#a5d391]" />
                                Weekly Consultation Availability & Slot Hours
                            </label>
                            <input
                                type="text"
                                value={availability}
                                onChange={(e) => setAvailability(e.target.value)}
                                placeholder="e.g. Mon-Fri | 09:00 AM - 05:00 PM EST"
                                className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-semibold focus:border-[#a5d391] focus:outline-none transition-all"
                            />
                        </div>

                        {/* Professional Bio & Narrative */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                <Stethoscope className="w-3.5 h-3.5 text-[#a5d391]" />
                                Professional Bio & Patient Philosophy
                            </label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Describe your medical nutrition background, clinical methodologies, and patient care philosophy..."
                                className="w-full h-32 bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-semibold focus:border-[#a5d391] focus:outline-none transition-all resize-none leading-relaxed"
                            ></textarea>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-widest text-black bg-[#a5d391] hover:bg-white transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-black"></div>
                                        <span>Saving Profile...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Save Clinical Profile</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Column: Live Patient Preview Card ("How Patients See You") */}
                <div className="space-y-6">
                    <div className="bg-[#090d16]/90 backdrop-blur-xl border border-[#a5d391]/30 rounded-[2.5rem] p-6 shadow-2xl space-y-5 sticky top-24">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="font-bold text-xs uppercase tracking-widest text-[#a5d391] flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4" />
                                Patient View Live Preview
                            </h3>
                            <span className="text-[9px] font-black uppercase tracking-wider bg-[#a5d391]/20 text-[#a5d391] px-2 py-0.5 rounded-full">
                                Booking Card
                            </span>
                        </div>

                        {/* Live Render Card */}
                        <div className="bg-black/60 border border-white/10 rounded-3xl p-5 space-y-4 hover:border-[#a5d391]/50 transition-all shadow-xl">
                            <div className="flex items-start gap-4">
                                {isApproved ? (
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#a5d391] to-emerald-400 text-black font-black text-lg flex items-center justify-center shadow-lg shrink-0">
                                        {fullName.split(' ').map(n => n[0]).join('') || 'DR'}
                                    </div>
                                ) : (
                                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 p-2 flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
                                        <img src="/pending_avatar.png" alt="Pending Approval" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-white text-base truncate">{fullName}</span>
                                        {isApproved ? (
                                            <BadgeCheck className="w-4 h-4 text-[#a5d391] shrink-0" title="Verified Practitioner License" />
                                        ) : (
                                            <span className="material-symbols-outlined text-amber-300 text-base shrink-0 animate-pulse" title="Pending Admin Approval">hourglass_empty</span>
                                        )}
                                    </div>
                                    <div className="text-[#a5d391] text-xs font-bold truncate mt-0.5">{credentials || 'Certified Clinical Nutritionist'}</div>
                                    <div className="text-white/60 text-[11px] font-medium truncate">{specializationCategory}</div>
                                    {specializationDetail && (
                                        <div className="text-white/40 text-[10px] italic truncate">"{specializationDetail}"</div>
                                    )}
                                </div>
                            </div>

                            <p className="text-xs text-white/70 line-clamp-3 leading-relaxed italic bg-white/5 p-3 rounded-2xl border border-white/5">
                                "{bio || 'Dedicated clinical nutritionist specializing in metabolic health optimization and bio-individual macro protocols.'}"
                            </p>

                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                    <div className="text-white/40 text-[9px] uppercase font-bold">Experience</div>
                                    <div className="text-white font-bold">{yearsOfExperience}</div>
                                </div>
                                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                    <div className="text-white/40 text-[9px] uppercase font-bold">Consultation Rate</div>
                                    <div className="text-[#a5d391] font-bold">{consultationFee}</div>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-[11px] text-white/60 border-t border-white/10 pt-3">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5 text-[#a5d391]" />
                                    <span className="truncate">Email: <strong className="text-white">{registeredEmail || user?.email}</strong></span>
                                </div>
                                {(age || (gender && gender !== 'Prefer not to say')) && (
                                    <div className="flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-[#a5d391]" />
                                        <span>
                                            Demographics: <strong className="text-white">{age ? `${age} Yrs` : ''} {gender && gender !== 'Prefer not to say' ? `• ${gender}` : ''}</strong>
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Globe className="w-3.5 h-3.5 text-[#a5d391]" />
                                    <span>Languages: <strong className="text-white">{languages}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-[#a5d391]" />
                                    <span className="truncate">{availability}</span>
                                </div>
                            </div>

                            <button className="w-full bg-[#a5d391] text-black hover:bg-white transition-all py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#a5d391]/20 cursor-default">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Book 1-on-1 Consultation</span>
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default NutritionistProfile;
