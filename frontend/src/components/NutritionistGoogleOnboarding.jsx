import React, { useEffect, useState } from 'react';

const STEPS = [
    { title: 'Basic Info', subtitle: 'Required account details' },
    { title: 'Credentials', subtitle: 'Optional clinical profile' },
    { title: 'Practice', subtitle: 'Optional practice details' },
    { title: 'Review', subtitle: 'Confirm your profile' },
];

const inputClass = 'mt-1 w-full rounded-xl border border-white/10 bg-[#080b12] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#a5d391]';
const labelClass = 'block text-xs font-bold text-white/70';

const NutritionistGoogleOnboarding = ({
    initialFirstName = '',
    initialLastName = '',
    error,
    onCreate,
    onCancel,
}) => {
    const [step, setStep] = useState(1);
    const [firstName, setFirstName] = useState(initialFirstName);
    const [lastName, setLastName] = useState(initialLastName);
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [specializationFocus, setSpecializationFocus] = useState('');
    const [credentials, setCredentials] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [yearsOfExperience, setYearsOfExperience] = useState('');
    const [consultationFee, setConsultationFee] = useState('');
    const [languages, setLanguages] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setFirstName(current => current || initialFirstName);
        setLastName(current => current || initialLastName);
    }, [initialFirstName, initialLastName]);

    const createAccount = async (includeProfessionalDetails) => {
        setSaving(true);
        const profile = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            age: Number(age),
            gender,
        };

        if (includeProfessionalDetails) {
            const fullSpecialization = [specialization, specializationFocus.trim()]
                .filter(Boolean)
                .join(' • ');
            const optionalFields = {
                specialization: fullSpecialization,
                credentials: credentials.trim(),
                licenseNumber: licenseNumber.trim(),
                yearsOfExperience: yearsOfExperience.trim(),
                consultationFee: consultationFee.trim(),
                languages: languages.trim(),
            };
            Object.entries(optionalFields).forEach(([key, value]) => {
                if (value) profile[key] = value;
            });
        }

        try {
            await onCreate(profile);
        } finally {
            setSaving(false);
        }
    };

    const progressWidth = `${((step - 1) / (STEPS.length - 1)) * 100}%`;
    const optionalDetails = [
        specialization,
        specializationFocus,
        credentials,
        licenseNumber,
        yearsOfExperience,
        consultationFee,
        languages,
    ];
    const completionPercentage = Math.round(
        ((4 + optionalDetails.filter(value => value.trim()).length) / 11) * 100
    );

    return (
        <section className="relative z-20 w-full max-w-2xl rounded-[2.5rem] border border-white/10 bg-[#080b12]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-10">
            <header className="mb-8 text-center">
                <span className="rounded-full border border-[#a5d391]/30 bg-[#a5d391]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#a5d391]">
                    Nutritionist Profile Setup
                </span>
                <h2 className="mt-3 font-hero-display text-2xl font-bold text-white sm:text-3xl">
                    Welcome to NutriMunch AI
                </h2>
                <p className="mt-1 text-xs text-white/50">
                    Complete the required account details. Your professional profile is optional.
                </p>
            </header>

            <div className="relative mb-10">
                <div className="relative z-10 flex items-center justify-between">
                    {STEPS.map((item, index) => {
                        const number = index + 1;
                        const completed = step > number;
                        const active = step === number;
                        return (
                            <div key={item.title} className="relative z-10 flex flex-col items-center">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                    completed
                                        ? 'bg-[#a5d391] text-black shadow-[0_0_15px_rgba(165,211,145,0.6)]'
                                        : active
                                            ? 'animate-pulse border-2 border-[#a5d391] bg-[#a5d391]/20 text-[#a5d391] shadow-[0_0_20px_rgba(165,211,145,0.4)]'
                                            : 'border border-white/10 bg-white/5 text-white/40'
                                }`}>
                                    {completed ? '✓' : number}
                                </div>
                                <span className={`mt-2 hidden text-center text-[10px] font-bold sm:block ${
                                    active ? 'text-[#a5d391]' : completed ? 'text-white' : 'text-white/40'
                                }`}>
                                    {item.title}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div className="absolute left-5 right-5 top-5 z-0 h-[2px] -translate-y-1/2 bg-white/10">
                    <div
                        className="h-full bg-gradient-to-r from-[#a5d391] to-[#7ec362] transition-all duration-500"
                        style={{ width: progressWidth }}
                    />
                </div>
            </div>

            {error && (
                <div role="alert" className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-center text-xs font-semibold text-red-300">
                    {error}
                </div>
            )}

            {step === 1 && (
                <form
                    className="space-y-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        setStep(2);
                    }}
                >
                    <div className="mb-2 rounded-2xl border border-white/5 bg-white/5 p-4">
                        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-[#a5d391]">
                            Step 1 of 4: Required Account Details
                        </div>
                        <p className="text-[11px] text-white/50">
                            Your name is prefilled from Google. Age and gender are required; all following profile steps can be skipped.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className={labelClass}>
                            First Name *
                            <input
                                aria-label="First Name"
                                required
                                value={firstName}
                                onChange={event => setFirstName(event.target.value)}
                                className={inputClass}
                            />
                        </label>
                        <label className={labelClass}>
                            Last Name *
                            <input
                                aria-label="Last Name"
                                required
                                value={lastName}
                                onChange={event => setLastName(event.target.value)}
                                className={inputClass}
                            />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className={labelClass}>
                            Age (Years) *
                            <input
                                type="number"
                                min="18"
                                max="120"
                                required
                                value={age}
                                onChange={event => setAge(event.target.value)}
                                placeholder="e.g. 32"
                                className={inputClass}
                            />
                        </label>
                        <label className={labelClass}>
                            Gender *
                            <select
                                required
                                value={gender}
                                onChange={event => setGender(event.target.value)}
                                className={`${inputClass} cursor-pointer`}
                            >
                                <option value="">Select gender</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                <option value="Non-Binary / Other">Non-Binary / Other</option>
                            </select>
                        </label>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="rounded-2xl bg-[#a5d391] px-8 py-3.5 text-xs font-bold text-black shadow-[0_0_15px_rgba(165,211,145,0.3)] transition hover:bg-white">
                            Next: Credentials <span aria-hidden="true">→</span>
                        </button>
                    </div>
                </form>
            )}

            {step === 2 && (
                <div className="space-y-5">
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-sky-400">
                            Step 2 of 4 (Optional): Clinical Credentials
                        </div>
                        <p className="text-[11px] text-white/50">Add your specialization and credentials, or skip all professional details.</p>
                    </div>
                    <label className={labelClass}>
                        Primary Clinical Specialization
                        <select value={specialization} onChange={event => setSpecialization(event.target.value)} className={`${inputClass} cursor-pointer`}>
                            <option value="">Select (optional)</option>
                            <option>Clinical &amp; Medical Nutrition</option>
                            <option>Sports &amp; Performance Nutrition</option>
                            <option>PCOS, Fertility &amp; Hormonal Health</option>
                            <option>Diabetes &amp; Metabolic Health</option>
                            <option>Pediatric &amp; Family Nutrition</option>
                            <option>Renal &amp; Cardiovascular Health</option>
                            <option>Weight Management &amp; Body Composition</option>
                        </select>
                    </label>
                    <label className={labelClass}>
                        Sub-Focus / Keyword Tag
                        <input value={specializationFocus} onChange={event => setSpecializationFocus(event.target.value)} placeholder="e.g. General, Diabetes care" className={inputClass} />
                    </label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className={labelClass}>
                            Academic Degrees &amp; Titles
                            <input value={credentials} onChange={event => setCredentials(event.target.value)} placeholder="e.g. RD, M.Sc. Clinical Nutrition" className={inputClass} />
                        </label>
                        <label className={labelClass}>
                            Medical License / Reg Number
                            <input value={licenseNumber} onChange={event => setLicenseNumber(event.target.value)} placeholder="e.g. RD-12484920-IN" className={inputClass} />
                        </label>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                        <button type="button" onClick={() => setStep(3)} disabled={saving} className="px-4 py-2 text-xs text-white/50 transition hover:text-white disabled:opacity-50">
                            Skip details <span aria-hidden="true">→</span>
                        </button>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setStep(1)} className="rounded-2xl bg-white/10 px-5 py-3 text-xs font-bold text-white transition hover:bg-white/20">Back</button>
                            <button type="button" onClick={() => setStep(3)} className="rounded-2xl bg-sky-400 px-7 py-3 text-xs font-bold text-black shadow-[0_0_15px_rgba(56,189,248,0.3)] transition hover:bg-white">
                                Next: Practice <span aria-hidden="true">→</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-5">
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-amber-400">
                            Step 3 of 4 (Optional): Practice Details
                        </div>
                        <p className="text-[11px] text-white/50">These details help patients understand your services. You can skip them or add them later.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className={labelClass}>
                            Clinical Experience
                            <input value={yearsOfExperience} onChange={event => setYearsOfExperience(event.target.value)} placeholder="e.g. 7+ Years Experience" className={inputClass} />
                        </label>
                        <label className={labelClass}>
                            Consultation Rate
                            <input value={consultationFee} onChange={event => setConsultationFee(event.target.value)} placeholder="e.g. ₹1,500 / Session" className={inputClass} />
                        </label>
                    </div>
                    <label className={labelClass}>
                        Languages
                        <input value={languages} onChange={event => setLanguages(event.target.value)} placeholder="e.g. English, Hindi" className={inputClass} />
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                        <button type="button" onClick={() => setStep(4)} disabled={saving} className="px-4 py-2 text-xs text-white/50 transition hover:text-white disabled:opacity-50">
                            Skip details <span aria-hidden="true">→</span>
                        </button>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setStep(2)} className="rounded-2xl bg-white/10 px-5 py-3 text-xs font-bold text-white transition hover:bg-white/20">Back</button>
                            <button type="button" onClick={() => setStep(4)} className="rounded-2xl bg-amber-400 px-7 py-3 text-xs font-bold text-black shadow-[0_0_15px_rgba(251,191,36,0.3)] transition hover:bg-white">
                                Review <span aria-hidden="true">→</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="space-y-5">
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-purple-400">
                            Step 4 of 4: Review &amp; Finish
                        </div>
                        <p className="text-[11px] text-white/50">Your account is ready. Optional profile details can be updated after signup.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-[#080b12] p-4 text-sm sm:grid-cols-2">
                        <p><span className="text-white/50">Name:</span> <span className="text-white">{`${firstName} ${lastName}`.trim()}</span></p>
                        <p><span className="text-white/50">Age:</span> <span className="text-white">{age}</span></p>
                        <p><span className="text-white/50">Gender:</span> <span className="text-white">{gender}</span></p>
                        <p><span className="text-white/50">Specialization:</span> <span className="text-white">{specialization || 'Not added'}</span></p>
                        <p><span className="text-white/50">Credentials:</span> <span className="text-white">{credentials || 'Not added'}</span></p>
                        <p><span className="text-white/50">License:</span> <span className="text-white">{licenseNumber || 'Not added'}</span></p>
                        <p><span className="text-white/50">Experience:</span> <span className="text-white">{yearsOfExperience || 'Not added'}</span></p>
                        <p><span className="text-white/50">Rate:</span> <span className="text-white">{consultationFee || 'Not added'}</span></p>
                        <p className="sm:col-span-2"><span className="text-white/50">Languages:</span> <span className="text-white">{languages || 'Not added'}</span></p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="font-bold uppercase tracking-wider text-[#a5d391]">Setup completion</span>
                            <span className="font-bold text-white">{completionPercentage}%</span>
                        </div>
                        <div
                            role="progressbar"
                            aria-label="Profile setup completion"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={completionPercentage}
                            className="h-2 overflow-hidden rounded-full bg-white/10"
                        >
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[#a5d391] to-emerald-400 transition-all"
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                        <button type="button" onClick={() => createAccount(true)} disabled={saving} className="px-4 py-2 text-xs text-white/50 transition hover:text-white disabled:opacity-50">
                            Skip &amp; Finish Setup ({completionPercentage}% complete)
                        </button>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setStep(3)} className="rounded-2xl bg-white/10 px-5 py-3 text-xs font-bold text-white transition hover:bg-white/20">Back</button>
                            <button type="button" onClick={() => createAccount(true)} disabled={saving} className="rounded-2xl bg-[#a5d391] px-7 py-3 text-xs font-bold text-black shadow-[0_0_20px_rgba(165,211,145,0.4)] transition hover:bg-white disabled:opacity-50">
                                {saving ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <footer className="mt-6 border-t border-white/5 pt-4 text-center">
                <button type="button" onClick={onCancel} className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 transition hover:text-slate-300">
                    Cancel setup
                </button>
            </footer>
        </section>
    );
};

export default NutritionistGoogleOnboarding;
