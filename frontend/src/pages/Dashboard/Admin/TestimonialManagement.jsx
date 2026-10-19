import React, { useState, useEffect } from 'react';
import { fetchAllTestimonials, deleteTestimonial, saveTestimonial } from '../../../services/testimonialService';

const TestimonialManagement = () => {
    const [testimonials, setTestimonials] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('ALL');
    const [notification, setNotification] = useState(null);

    const loadData = async () => {
        const data = await fetchAllTestimonials();
        setTestimonials(data);
    };

    useEffect(() => {
        loadData();
        window.addEventListener('nutrimunch_testimonials_updated', loadData);
        return () => window.removeEventListener('nutrimunch_testimonials_updated', loadData);
    }, []);

    const handleDelete = async (id, name) => {
        if (window.confirm(`Admin Action: Permanently delete testimonial from "${name}"?`)) {
            await deleteTestimonial(id);
            setNotification({ type: 'success', message: `Testimonial by ${name} deleted successfully.` });
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const handleToggleStatus = async (test) => {
        const newStatus = test.status === 'APPROVED' ? 'PENDING' : 'APPROVED';
        await saveTestimonial({ ...test, status: newStatus });
        setNotification({ type: 'success', message: `Status updated to ${newStatus} for ${test.authorName}` });
        setTimeout(() => setNotification(null), 3000);
    };

    const filteredTestimonials = testimonials.filter(t => {
        const matchesSearch = (t.authorName || t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (t.content || t.quote || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (t.programResult || t.result || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'ALL' || (filterRole === 'USER' && (t.authorRole?.includes('User') || !t.authorRole)) ||
                            (filterRole === 'NUTRITIONIST' && t.authorRole?.includes('Nutritionist'));
        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-8 animate-fadeIn pb-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-[#a5d391] text-xs font-bold uppercase tracking-widest mb-1">
                        <span className="material-symbols-outlined text-sm">rate_review</span>
                        Community Moderation Core
                    </div>
                    <h1 className="text-3xl font-hero-display font-bold text-white">Testimonial Management</h1>
                    <p className="text-white/50 text-sm">Review, verify, edit, and moderate member transformation stories.</p>
                </div>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#a5d391] animate-pulse"></span>
                    Total Stories: {testimonials.length}
                </div>
            </div>

            {/* Notification Banner */}
            {notification && (
                <div className="p-4 rounded-2xl bg-[#a5d391]/10 border border-[#a5d391]/30 text-[#a5d391] font-bold text-sm flex items-center justify-between">
                    <span>{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="text-white/50 hover:text-white">
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            )}

            {/* Controls Bar: Search & Role Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-xl">
                {/* Search input */}
                <div className="relative w-full sm:w-80">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">search</span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by author, content, or result..."
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#a5d391] transition-colors"
                    />
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                    {['ALL', 'USER', 'NUTRITIONIST'].map((role) => (
                        <button
                            key={role}
                            onClick={() => setFilterRole(role)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterRole === role ? 'bg-[#a5d391] text-[#080b12] shadow-md shadow-[#a5d391]/20' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                        >
                            {role === 'ALL' ? 'All Roles' : (role === 'USER' ? 'Standard Users' : 'Nutritionists')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Testimonials List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTestimonials.length === 0 ? (
                    <div className="col-span-2 text-center py-16 bg-white/5 border border-white/10 rounded-3xl text-white/40">
                        <span className="material-symbols-outlined text-5xl mb-2">rate_review</span>
                        <p>No testimonials match your filter query.</p>
                    </div>
                ) : (
                    filteredTestimonials.map((test) => (
                        <div key={test.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 relative flex flex-col justify-between hover:border-[#a5d391]/40 transition-all backdrop-blur-xl group">
                            <div>
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={test.avatarUrl || test.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(test.authorName || test.name)}&background=a5d391&color=000`}
                                            alt="Avatar"
                                            className="w-12 h-12 rounded-full object-cover border border-white/20"
                                        />
                                        <div>
                                            <h4 className="text-white font-bold text-base">{test.authorName || test.name}</h4>
                                            <div className="text-xs text-[#a5d391] font-semibold">{test.authorRole || 'Standard User'}</div>
                                        </div>
                                    </div>

                                    {/* Star Rating */}
                                    <div className="flex items-center text-amber-400">
                                        {[...Array(test.rating || 5)].map((_, i) => (
                                            <span key={i} className="material-symbols-outlined text-sm">star</span>
                                        ))}
                                    </div>
                                </div>

                                {/* Outcome Metric */}
                                {(test.programResult || test.result) && (
                                    <div className="inline-block px-3 py-1 rounded-full bg-[#a5d391]/10 border border-[#a5d391]/20 text-[#a5d391] text-xs font-bold mb-3">
                                        {test.programResult || test.result}
                                    </div>
                                )}

                                <p className="text-white/80 text-sm italic leading-relaxed mb-6">
                                    "{test.content || test.quote}"
                                </p>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${test.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                    {test.status || 'APPROVED'}
                                </span>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleStatus(test)}
                                        className="px-3 py-1.5 bg-white/5 hover:bg-white/15 text-white/80 text-xs font-bold rounded-xl border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-sm">published_with_changes</span>
                                        {test.status === 'APPROVED' ? 'Unpublish' : 'Approve'}
                                    </button>

                                    <button
                                        onClick={() => handleDelete(test.id, test.authorName || test.name)}
                                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold rounded-xl border border-rose-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TestimonialManagement;
