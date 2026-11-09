/**
 * Client Testimonials Carousel/Grid Section
 * Fetches and displays approved client reviews with star ratings and transformation results.
 */
import React, { useState, useEffect } from 'react';
import { fetchAllTestimonials } from '../../services/testimonialService';

/**
 * ClientTestimonials Component
 * Renders verified testimonial cards with avatar, rating, and transformation quote.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} [props.showHeader=true] - Whether to display section header
 * @param {boolean} [props.showAll=true] - Whether to render all items or limit
 * @param {number} [props.limit=6] - Max items to render when showAll is false
 */
const ClientTestimonials = ({ showHeader = true, showAll = true, limit = 6 }) => {
    const [testimonials, setTestimonials] = useState([]);

    const loadTestimonials = async () => {
        const data = await fetchAllTestimonials();
        setTestimonials(data);
    };

    useEffect(() => {
        loadTestimonials();
        window.addEventListener('nutrimunch_testimonials_updated', loadTestimonials);
        return () => window.removeEventListener('nutrimunch_testimonials_updated', loadTestimonials);
    }, []);

    const listToDisplay = showAll ? testimonials : testimonials.slice(0, limit);

    return (
        <section className={`max-w-7xl mx-auto px-4 sm:px-8 relative z-20 ${showHeader ? 'py-16 sm:py-24' : 'pb-12'}`}>
            {showHeader && (
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 dark:bg-primary/10 dark:border-primary/20 dark:text-primary text-xs font-bold uppercase tracking-widest mb-4">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-primary animate-pulse"></span>
                        Verified Member Stories
                    </div>
                    <h2 className="font-hero-display text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">User & Nutritionist Transformations</h2>
                    <p className="text-slate-600 dark:text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
                        Real biometrics, verified diet protocol feedback, and clinical outcomes submitted by our active platform members.
                    </p>
                </div>
            )}

            {listToDisplay.length === 0 ? (
                <div className="text-center py-12 bg-white/90 border border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-[2.5rem] shadow-sm">
                    <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-white/30 mb-2">rate_review</span>
                    <p className="text-slate-600 dark:text-white/60 text-sm">No testimonials published yet. Be the first to share your story!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                    {listToDisplay.map((test, idx) => (
                        <div key={test.id || idx} className="bg-white/95 border border-slate-200/90 shadow-md hover:border-emerald-500/50 hover:shadow-lg dark:bg-white/5 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-xl dark:hover:border-primary/40 rounded-[2.5rem] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-all">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-symbols-outlined text-6xl text-slate-400 dark:text-white">format_quote</span>
                            </div>

                            <div>
                                {/* Author Info */}
                                <div className="flex items-center gap-4 mb-5">
                                    <img 
                                        src={test.avatarUrl || test.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(test.authorName || test.name || 'User')}&background=38bdf8&color=000`} 
                                        alt={test.authorName || test.name || 'User'} 
                                        className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 dark:border-white/20 shadow-sm shrink-0" 
                                    />
                                    <div className="min-w-0">
                                        <h4 className="text-slate-900 dark:text-white font-bold text-base truncate">
                                            {test.authorName || test.name}
                                        </h4>
                                        <div className="text-xs text-emerald-700 dark:text-[#a5d391] font-semibold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">verified</span>
                                            <span className="truncate">{test.authorRole || 'Standard User'}</span>
                                        </div>
                                        {/* Star Rating */}
                                        <div className="flex items-center text-amber-500 dark:text-amber-400 text-xs mt-1">
                                            {[...Array(test.rating || 5)].map((_, i) => (
                                                <span key={i} className="material-symbols-outlined text-sm">star</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Program Result Badge */}
                                {(test.programResult || test.result) && (
                                    <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-primary/10 dark:border-primary/20 dark:text-primary text-xs font-bold mb-4">
                                        {test.programResult || test.result}
                                    </div>
                                )}

                                {/* Quote Content */}
                                <p className="text-slate-700 dark:text-white/80 leading-relaxed italic text-sm relative z-10">
                                    "{test.content || test.quote}"
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

export default ClientTestimonials;
