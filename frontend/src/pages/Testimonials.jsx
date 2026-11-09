/**
 * Testimonials Page
 * Showcases verified transformation stories, success metrics, and review submission forms.
 */
import React from 'react';
import ClientTestimonials from './HomeSections/ClientTestimonials';
import ShareYourStoryForm from './TestimonialSections/ShareYourStoryForm';

/**
 * Testimonials Component
 * Renders verified community reviews and provides story submission access for logged-in members.
 */
const Testimonials = () => {
    return (
        <div className="relative pt-32 pb-24 flex flex-col w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full relative z-10">

                {/* Header */}
                <div className="text-center mb-12 sm:mb-16">
                    <div className="inline-flex items-center gap-3 mb-6">
                        <span className="w-8 h-px bg-emerald-600 dark:bg-primary"></span>
                        <span className="font-label-caps text-label-caps text-emerald-800 dark:text-primary uppercase font-bold tracking-widest">Live Platform Outcomes</span>
                        <span className="w-8 h-px bg-emerald-600 dark:bg-primary"></span>
                    </div>
                    <h1 className="font-hero-display text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 text-slate-900 dark:text-white">
                        The data <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-sky-600 dark:from-primary dark:to-[#38bdf8] italic">speaks</span> <br/>for itself.
                    </h1>
                    <p className="text-slate-600 dark:text-white/60 max-w-2xl mx-auto text-base sm:text-lg">
                        Real biometrics, verified diet protocol feedback, and clinical outcomes submitted by our active platform members.
                    </p>
                </div>

                {/* Live Testimonials Grid */}
                <ClientTestimonials showHeader={false} showAll={true} />

                {/* Appended Sections */}
                <ShareYourStoryForm />
            </div>
        </div>
    );
};

export default Testimonials;
