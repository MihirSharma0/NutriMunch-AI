/**
 * Contact & Support Page
 * Provides support channels, executive team profiles, and searchable FAQ documentation.
 */
import React from 'react';
import FAQ from './ContactSections/FAQ';
import Owners from './ContactSections/Owners';

/**
 * Contact Component
 * Layout presenting contact cards, founding leadership profiles, and interactive FAQ sections.
 */
const Contact = () => {
    return (
        <div className="relative pt-32 pb-24 flex flex-col w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full relative z-10">

                {/* Header */}
                <div className="max-w-4xl mx-auto text-center mb-12">
                    <div className="inline-flex items-center gap-3 mb-6">
                        <span className="w-8 h-px bg-primary"></span>
                        <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-widest">Help Center</span>
                        <span className="w-8 h-px bg-primary"></span>
                    </div>
                    <h1 className="font-hero-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
                        Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#38bdf8] italic">Questions</span>
                    </h1>
                    <p className="text-white/60 text-base sm:text-lg leading-relaxed">
                        Everything you need to know about accounts, AI tools, diet plans, appointments, payments and your data.
                    </p>
                </div>

                <FAQ />

                <Owners />

                {/* Medical Disclaimer */}
                <div className="max-w-4xl mx-auto mt-16 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4 sm:gap-6 text-center md:text-left">
                    <div className="w-12 h-12 bg-[#ef4444]/20 rounded-full flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#ef4444]">medical_services</span>
                    </div>
                    <div>
                        <h4 className="text-[#ef4444] font-bold mb-1">Medical Disclaimer</h4>
                        <p className="text-white/60 text-sm">
                            NutriMunch provides nutrition guidance and is not a substitute for professional medical care. In a medical emergency or severe allergic reaction, call 112 (India) or your local emergency number, or go to the nearest hospital immediately.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
