import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { saveTestimonial, deleteTestimonial, getLocalTestimonials } from '../../services/testimonialService';

const getVerifiedRoleForUser = (user) => {
    if (!user || !user.role) return 'Standard User';
    const r = String(user.role).toUpperCase();
    if (r === 'ROLE_NUTRITIONIST' || r === 'NUTRITIONIST') {
        return 'Certified Nutritionist';
    }
    if (r === 'ROLE_ADMIN' || r === 'ADMIN') {
        return 'Platform Administrator';
    }
    return 'Standard User';
};

const ShareYourStoryForm = () => {
    const { user } = useContext(AuthContext);

    // Form fields
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [role, setRole] = useState(getVerifiedRoleForUser(user));
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [programResult, setProgramResult] = useState('');
    const [content, setContent] = useState('');
    const [editingId, setEditingId] = useState(null);

    // UI state
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [myTestimonials, setMyTestimonials] = useState([]);
    const [notification, setNotification] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync user details & lock role strictly to user's authenticated account
    useEffect(() => {
        const verifiedRole = getVerifiedRoleForUser(user);
        setRole(verifiedRole);
        if (user) {
            if (!name) setName(user.name || '');
            if (!email) setEmail(user.email || '');
        }
    }, [user]);

    // Load user's existing testimonials
    const loadUserTestimonials = () => {
        const all = getLocalTestimonials();
        if (user?.email) {
            const mine = all.filter(t => t.authorEmail === user.email || t.userId === user.id);
            setMyTestimonials(mine);
        } else {
            setMyTestimonials([]);
        }
    };

    useEffect(() => {
        loadUserTestimonials();
        window.addEventListener('nutrimunch_testimonials_updated', loadUserTestimonials);
        return () => window.removeEventListener('nutrimunch_testimonials_updated', loadUserTestimonials);
    }, [user]);

    const handleRatingClick = (num) => {
        setRating(num);
    };

    const handleEdit = (test) => {
        setEditingId(test.id);
        setName(test.authorName || '');
        setEmail(test.authorEmail || '');
        // Role is locked to the authenticated user's role
        setRole(getVerifiedRoleForUser(user));
        setRating(test.rating || 5);
        setProgramResult(test.programResult || '');
        setContent(test.content || '');
        window.scrollTo({ top: document.getElementById('story-form-container')?.offsetTop - 80, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to remove your testimonial?")) {
            await deleteTestimonial(id);
            setNotification({ type: 'success', message: 'Testimonial removed successfully.' });
            setTimeout(() => setNotification(null), 3000);
            if (editingId === id) {
                resetForm();
            }
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setProgramResult('');
        setContent('');
        setRating(5);
        setRole(getVerifiedRoleForUser(user));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setNotification({ type: 'error', message: 'You must be logged in to submit a testimonial.' });
            return;
        }

        if (!name.trim() || !content.trim()) {
            setNotification({ type: 'error', message: 'Please provide your name and transformation story.' });
            return;
        }

        setIsSubmitting(true);
        const avatarUrl = user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=38bdf8&color=000`;
        const verifiedRole = getVerifiedRoleForUser(user);

        const payload = {
            id: editingId,
            authorName: name,
            authorEmail: email || user?.email,
            authorRole: verifiedRole, // Enforce authentic role in payload
            userId: user?.id || null,
            rating: rating,
            programResult: programResult || 'General Wellness & AI Diet Protocol',
            content: content,
            avatarUrl: avatarUrl,
            status: 'APPROVED'
        };

        await saveTestimonial(payload);
        setIsSubmitting(false);
        setIsPreviewOpen(false);
        setNotification({
            type: 'success',
            message: editingId ? 'Testimonial updated successfully and published to Home Page!' : 'Testimonial created & deployed to Home Page!'
        });
        setTimeout(() => setNotification(null), 4000);
        resetForm();
    };

    if (!user) {
        return (
            <section id="story-form-container" className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-8 relative z-20">
                <div className="bg-gradient-to-br from-primary/10 via-[#080b12]/80 to-[#38bdf8]/10 border border-white/10 rounded-[3rem] p-8 sm:p-12 md:p-14 text-center relative overflow-hidden shadow-2xl backdrop-blur-xl">
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-3xl text-primary">lock</span>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                        Login Required
                    </div>

                    <h2 className="font-hero-display text-3xl sm:text-4xl font-bold text-white mb-4">
                        Share Your Transformation Story
                    </h2>

                    <p className="text-white/60 mb-8 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
                        To submit a verified testimonial and share your health outcomes with the NutriMunch community, please log in to your account.
                    </p>

                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 bg-primary text-[#080b12] font-bold px-8 py-4 rounded-full text-sm hover:bg-white transition-all shadow-lg shadow-primary/20 cursor-pointer hover:-translate-y-0.5"
                    >
                        <span className="material-symbols-outlined text-lg">login</span>
                        Login to Submit Testimonial
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section id="story-form-container" className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-8 relative z-20">
            <div className="bg-gradient-to-br from-primary/10 via-[#080b12]/80 to-[#38bdf8]/10 border border-white/10 rounded-[3rem] p-6 sm:p-10 md:p-14 text-center relative overflow-hidden shadow-2xl backdrop-blur-xl">

                {/* Notification Banner */}
                {notification && (
                    <div className={`mb-6 p-4 rounded-2xl border text-sm font-bold flex items-center justify-between animate-fadeIn ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">{notification.type === 'success' ? 'check_circle' : 'error'}</span>
                            <span>{notification.message}</span>
                        </div>
                        <button onClick={() => setNotification(null)} className="text-white/50 hover:text-white">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                )}

                <div className="absolute top-0 right-0 p-8 sm:p-12 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-6xl sm:text-8xl md:text-[10rem] text-primary">rate_review</span>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    {editingId ? 'Edit Your Testimonial' : 'Share Your Health Journey'}
                </div>

                <h2 className="font-hero-display text-3xl sm:text-4xl font-bold text-white mb-3 relative z-10">
                    {editingId ? 'Modify Your Experience' : 'Deploy Your Outcome to the Platform'}
                </h2>
                <p className="text-white/60 mb-8 sm:mb-10 max-w-2xl mx-auto text-sm sm:text-base relative z-10">
                    Have you experienced transformed biometric metrics, body composition, or sustained energy? Share your rating and review to inspire the NutriMunch community.
                </p>

                <form onSubmit={handleSubmit} className="relative z-10 text-left space-y-6">

                    {/* User Info Header with Role Locked to Authenticated Account */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div>
                            <label className="block text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-[50px] bg-black/50 border border-white/10 rounded-2xl px-5 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                placeholder="Jane Doe"
                                required
                            />
                        </div>

                        {/* Verified Role - Read-only & locked to account role */}
                        <div>
                            <label className="block text-white/50 text-xs font-bold uppercase tracking-widest mb-2 pl-1">Verified Role</label>
                            <div className="w-full h-[50px] bg-black/60 border border-white/10 rounded-2xl px-5 text-white/90 text-sm flex items-center justify-between font-semibold select-none cursor-not-allowed">
                                <span className="flex items-center gap-2 min-w-0">
                                    <span className="material-symbols-outlined text-base text-[#a5d391] shrink-0">verified</span>
                                    <span className="whitespace-nowrap font-bold text-xs sm:text-sm text-white">{role}</span>
                                </span>
                                <span className="material-symbols-outlined text-sm text-white/40 shrink-0" title="Locked Account Role">lock</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Transformation Result</label>
                            <input
                                type="text"
                                value={programResult}
                                onChange={(e) => setProgramResult(e.target.value)}
                                className="w-full h-[50px] bg-black/50 border border-white/10 rounded-2xl px-5 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                placeholder="e.g. -25 lbs, +35% Deep Sleep"
                            />
                        </div>
                    </div>

                    {/* Star Rating Picker */}
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <label className="block text-white font-bold text-sm mb-1">Overall Satisfaction Rating</label>
                            <p className="text-white/40 text-xs">Select your rating out of 5 stars</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => {
                                const active = (hoverRating || rating) >= star;
                                return (
                                    <button
                                        type="button"
                                        key={star}
                                        onClick={() => handleRatingClick(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        className="text-3xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                                    >
                                        <span className={`material-symbols-outlined fill-current ${active ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-white/20'}`}>
                                            star
                                        </span>
                                    </button>
                                );
                            })}
                            <span className="ml-2 text-amber-400 font-bold text-sm bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
                                {rating} / 5
                            </span>
                        </div>
                    </div>

                    {/* Testimonial Textarea */}
                    <div>
                        <label className="block text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Transformation Details & Feedback</label>
                        <textarea
                            rows="4"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-primary transition-colors resize-none text-sm leading-relaxed"
                            placeholder="Describe how NutriMunch AI dynamic meal planning, water tracking, or nutritionist support impacted your health..."
                            required
                        ></textarea>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setIsPreviewOpen(true)}
                                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3.5 rounded-xl border border-white/15 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-lg">visibility</span>
                                Preview Card
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="w-full sm:w-auto bg-transparent hover:bg-white/5 text-white/60 hover:text-white font-bold px-4 py-3.5 rounded-xl border border-white/10 text-sm cursor-pointer"
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto bg-primary text-[#080b12] font-bold px-8 py-3.5 rounded-xl hover:bg-white transition-all shadow-lg shadow-primary/20 text-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg">publish</span>
                            {isSubmitting ? 'Deploying...' : (editingId ? 'Update Testimonial' : 'Submit & Deploy Live')}
                        </button>
                    </div>
                </form>

                {/* Manage User's Own Submitted Testimonials */}
                {myTestimonials.length > 0 && (
                    <div className="mt-12 pt-10 border-t border-white/10 text-left">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">rate_review</span>
                                Your Submitted Testimonials ({myTestimonials.length})
                            </h3>
                            <span className="text-xs text-white/40">Manage your active stories</span>
                        </div>

                        <div className="space-y-4">
                            {myTestimonials.map((test) => (
                                <div key={test.id} className="bg-black/60 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-primary/30 transition-all">
                                    <div className="space-y-2 flex-grow">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-white text-base">{test.authorName}</span>
                                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold">
                                                {test.authorRole}
                                            </span>
                                            <div className="flex items-center text-amber-400 text-xs">
                                                {[...Array(test.rating || 5)].map((_, i) => (
                                                    <span key={i} className="material-symbols-outlined text-sm">star</span>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-white/70 text-xs sm:text-sm italic line-clamp-2">"{test.content}"</p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleEdit(test)}
                                            className="px-3.5 py-2 bg-white/5 hover:bg-white/15 border border-white/10 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(test.id)}
                                            className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Live Testimonial Preview */}
            {isPreviewOpen && (
                <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-8 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    <div className="bg-[#080b12] border border-white/20 rounded-[2.5rem] p-8 max-w-lg w-full relative shadow-2xl space-y-6 max-h-[80vh] overflow-y-auto my-auto">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">visibility</span>
                                Testimonial Card Preview
                            </h3>
                            <button onClick={() => setIsPreviewOpen(false)} className="text-white/50 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Card Preview */}
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 relative overflow-hidden space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=38bdf8&color=000`}
                                        alt="Avatar"
                                        className="w-12 h-12 rounded-full object-cover border border-white/20"
                                    />
                                    <div>
                                        <h4 className="text-white font-bold text-base">{name || 'Your Name'}</h4>
                                        <div className="text-xs text-primary font-semibold">{role}</div>
                                    </div>
                                </div>
                                <div className="flex items-center text-amber-400">
                                    {[...Array(rating)].map((_, i) => (
                                        <span key={i} className="material-symbols-outlined text-sm">star</span>
                                    ))}
                                </div>
                            </div>

                            {programResult && (
                                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                                    {programResult}
                                </div>
                            )}

                            <p className="text-white/80 text-sm leading-relaxed italic">
                                "{content || 'Your story content will be rendered here...'}"
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setIsPreviewOpen(false)}
                                className="px-6 py-2.5 bg-white/10 text-white font-bold text-xs rounded-xl hover:bg-white/20 transition-all cursor-pointer"
                            >
                                Back to Form
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-6 py-2.5 bg-primary text-[#080b12] font-bold text-xs rounded-xl hover:bg-white transition-all shadow-lg cursor-pointer"
                            >
                                Confirm & Deploy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ShareYourStoryForm;
