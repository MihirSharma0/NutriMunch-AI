/**
 * How It Works Section
 * Step-by-step guide to the core NutriMunch user workflow.
 */
import React from 'react';

/**
 * Shows how users can set up their profile, explore nutrition tools,
 * connect with a nutritionist, and track their progress.
 */
const HowItWorks = () => {
    const steps = [
        {
            num: '01',
            title: 'Set Up Your Profile',
            desc: 'Add your health details, goals, dietary preferences, and allergies to personalize your experience.',
            icon: 'person_edit'
        },
        {
            num: '02',
            title: 'Explore Nutrition Tools',
            desc: 'Generate a daily meal plan or analyze food and product barcodes with the AI tools.',
            icon: 'auto_awesome'
        },
        {
            num: '03',
            title: 'Connect with a Nutritionist',
            desc: 'Browse verified nutritionists and request a consultation for one-on-one support.',
            icon: 'support_agent'
        },
        {
            num: '04',
            title: 'Track Your Progress',
            desc: 'Log meals, water, and weight, then review your nutrition and health trends over time.',
            icon: 'monitoring'
        }
    ];

    return (
        <section className="relative z-20 mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24">
            <div className="mb-12 max-w-2xl sm:mb-16">
                <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-700/15 bg-emerald-700/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800 dark:border-[#a5d391]/20 dark:bg-[#a5d391]/10 dark:text-[#a5d391]">
                    <span className="material-symbols-outlined text-sm">route</span>
                    Your journey
                </span>
                <h2 className="font-hero-display text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
                    A clearer path to healthier habits
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-white/60 sm:text-lg">
                    Start with your profile, use the tools that fit your needs, and build steady progress at your own pace.
                </p>
            </div>

            <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-gradient-to-r from-emerald-300 via-slate-200 to-sky-300 dark:from-emerald-500/30 dark:via-white/10 dark:to-sky-500/30 xl:block"></div>
                {steps.map((step, idx) => (
                    <article
                        key={step.num}
                        className="group relative z-10 flex min-h-[250px] flex-col rounded-3xl border border-slate-200/90 bg-white/90 p-6 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/30 hover:shadow-[0_24px_48px_-30px_rgba(16,120,75,0.35)] dark:border-white/10 dark:bg-[#0d121c]/90 dark:shadow-[0_18px_40px_-30px_rgba(0,0,0,0.9)] dark:hover:border-[#a5d391]/30 sm:p-7"
                    >
                        <div className="mb-8 flex items-center justify-between">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-700/10 bg-gradient-to-br from-emerald-50 to-sky-50 text-emerald-800 transition-transform duration-300 group-hover:scale-105 dark:border-[#a5d391]/20 dark:from-[#a5d391]/15 dark:to-sky-400/10 dark:text-[#a5d391]">
                                <span className="material-symbols-outlined text-3xl">{step.icon}</span>
                            </div>
                            <span className="rounded-full border border-emerald-700/15 bg-emerald-700/5 px-3 py-1.5 font-mono text-xs font-bold tracking-wider text-emerald-800 dark:border-[#a5d391]/20 dark:bg-[#a5d391]/10 dark:text-[#a5d391]">
                                STEP {step.num}
                            </span>
                        </div>
                        <div className="mt-auto">
                            <h3 className="text-xl font-bold leading-snug text-slate-950 transition-colors group-hover:text-emerald-800 dark:text-white dark:group-hover:text-[#a5d391]">
                                {step.title}
                            </h3>
                            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-white/60">
                                {step.desc}
                            </p>
                        </div>
                        {idx < steps.length - 1 && (
                            <span className="material-symbols-outlined absolute -bottom-3 left-1/2 z-20 hidden -translate-x-1/2 rounded-full border border-slate-200 bg-white px-1 text-slate-400 dark:border-white/10 dark:bg-[#0d121c] dark:text-white/40 xl:block">
                                arrow_forward
                            </span>
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
};

export default HowItWorks;
