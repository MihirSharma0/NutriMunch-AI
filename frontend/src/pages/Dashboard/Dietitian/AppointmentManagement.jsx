import React, { useState } from 'react';

const AppointmentManagement = () => {
    const [viewMode, setViewMode] = useState('Week');
    const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 12)); // Oct 12, 2026
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
    const [notification, setNotification] = useState(null);

    const [eventsList, setEventsList] = useState([
        { id: 1, title: 'Baseline Metabolic Assessment', client: 'Marcus Chen', time: '10:00 - 11:00 AM', dayOffset: 0, status: 'Confirmed', type: 'Clinical Consultation', notes: 'Review continuous glucose monitor logs and VO2 max test results.' },
        { id: 2, title: 'Macro Adjustment & Progress', client: 'Sarah Jenkins', time: '02:00 - 03:00 PM', dayOffset: 0, status: 'Confirmed', type: 'Dietary Protocol Review', notes: 'Evaluate hypertrophy protein intake and evening hydration.' },
        { id: 3, title: 'Insulin Override & Crisis Protocol', client: 'David Miller', time: '04:30 - 05:30 PM', dayOffset: 0, status: 'Pending Review', type: 'Urgent Intervention', notes: 'Post-prandial glucose spike reported.' },
        { id: 4, title: 'PCOS Micronutrient Synthesis', client: 'Elena Rodriguez', time: '11:00 - 12:00 PM', dayOffset: 1, status: 'Confirmed', type: 'Hormonal Protocol', notes: 'Adjust REM cycle vitamin D3 & omega-3 ratios.' },
        { id: 5, title: 'Cardiovascular Diet Check-in', client: 'James Wilson', time: '09:00 - 10:00 AM', dayOffset: 2, status: 'Confirmed', type: 'Follow-up', notes: 'Check 14-day sodium intake reduction.' },
    ]);

    const [newSlot, setNewSlot] = useState({
        client: '',
        title: '',
        date: '2026-10-15',
        time: '10:00 AM',
        type: 'Clinical Consultation',
        notes: ''
    });

    const handlePrev = () => {
        const d = new Date(currentDate);
        if (viewMode === 'Day') d.setDate(d.getDate() - 1);
        else if (viewMode === 'Week') d.setDate(d.getDate() - 7);
        else d.setMonth(d.getMonth() - 1);
        setCurrentDate(d);
    };

    const handleNext = () => {
        const d = new Date(currentDate);
        if (viewMode === 'Day') d.setDate(d.getDate() + 1);
        else if (viewMode === 'Week') d.setDate(d.getDate() + 7);
        else d.setMonth(d.getMonth() + 1);
        setCurrentDate(d);
    };

    const handleConfirmEvent = (id) => {
        setEventsList(eventsList.map(ev => ev.id === id ? { ...ev, status: 'Confirmed' } : ev));
        setSelectedEvent(null);
        setNotification('Appointment confirmed and synced with patient calendar!');
        setTimeout(() => setNotification(null), 3500);
    };

    const handleCancelEvent = (id) => {
        setEventsList(eventsList.filter(ev => ev.id !== id));
        setSelectedEvent(null);
        setNotification('Appointment cancelled.');
        setTimeout(() => setNotification(null), 3500);
    };

    const handleAddSlotSubmit = (e) => {
        e.preventDefault();
        if (!newSlot.client.trim() || !newSlot.title.trim()) return;

        const created = {
            id: Date.now(),
            client: newSlot.client,
            title: newSlot.title,
            time: `${newSlot.time} (60m)`,
            dayOffset: 0,
            status: 'Confirmed',
            type: newSlot.type,
            notes: newSlot.notes || 'Custom consultation session.'
        };

        setEventsList([created, ...eventsList]);
        setIsAvailabilityModalOpen(false);
        setNewSlot({ client: '', title: '', date: '2026-10-15', time: '10:00 AM', type: 'Clinical Consultation', notes: '' });
        setNotification('New consultation slot created & published to patient portal!');
        setTimeout(() => setNotification(null), 3500);
    };

    const monthYearString = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="w-full relative">

            {/* Toast Notification */}
            {notification && (
                <div className="fixed top-24 right-8 z-50 bg-[#a5d391] text-[#080b12] px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl flex items-center gap-2 animate-bounce">
                    <span className="material-symbols-outlined">event_available</span>
                    {notification}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white mb-1">Clinical Schedule & Bookings</h1>
                    <p className="text-white/50 text-xs sm:text-sm">Manage consultation slots, client bookings, and clinical calendar hours.</p>
                </div>
                <button 
                    onClick={() => setIsAvailabilityModalOpen(true)}
                    className="bg-[#a5d391] text-black font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer shrink-0 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    Add Booking Slot
                </button>
            </div>
            
            {/* Calendar Container */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                
                {/* Navigation Header */}
                <div className="p-6 border-b border-white/10 flex flex-wrap justify-between items-center gap-3 bg-[#080b12]/80">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handlePrev}
                            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-white cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <h2 className="text-xl font-bold font-hero-display text-white whitespace-nowrap">{monthYearString}</h2>
                        <button 
                            onClick={handleNext}
                            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-white cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {['Day', 'Week', 'Month'].map(mode => (
                            <button 
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === mode ? 'bg-[#a5d391] text-black shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active Appointments List View */}
                <div className="p-6 sm:p-8 space-y-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-[#a5d391] mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">event</span>
                        Upcoming Consultation Sessions ({eventsList.length})
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {eventsList.map(event => (
                            <div 
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${event.status === 'Pending Review' ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50' : 'bg-white/5 border-white/10 hover:border-[#a5d391]/40'}`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${event.status === 'Pending Review' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30'}`}>
                                            {event.status}
                                        </span>
                                        <h3 className="text-base font-bold text-white mt-2 group-hover:text-[#a5d391] transition-colors">{event.title}</h3>
                                        <div className="text-xs text-white/60 font-semibold">{event.client} • {event.type}</div>
                                    </div>
                                    <span className="material-symbols-outlined text-white/30 group-hover:text-white transition-colors">info</span>
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-white/5 text-xs text-white/50">
                                    <div className="flex items-center gap-1 text-white/80 font-bold">
                                        <span className="material-symbols-outlined text-sm text-[#a5d391]">schedule</span>
                                        {event.time}
                                    </div>
                                    <span className="text-[#a5d391] font-bold text-[11px] group-hover:underline">View Session & Notes →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal: Event Session Details */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-[#080b12] border border-white/20 rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full relative shadow-2xl space-y-6">
                        <div className="flex justify-between items-start border-b border-white/10 pb-4">
                            <div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedEvent.status === 'Pending Review' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30'}`}>
                                    {selectedEvent.status}
                                </span>
                                <h3 className="text-xl font-bold text-white mt-2">{selectedEvent.title}</h3>
                                <p className="text-xs text-[#a5d391] font-semibold">{selectedEvent.client} ({selectedEvent.type})</p>
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="text-white/50 hover:text-white cursor-pointer">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                                <span className="material-symbols-outlined text-2xl text-[#a5d391]">schedule</span>
                                <div>
                                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Scheduled Time</div>
                                    <div className="text-sm font-bold text-white">{selectedEvent.time}</div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                                <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Clinical Context & Goal</div>
                                <p className="text-xs text-white/80 leading-relaxed italic">"{selectedEvent.notes}"</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
                            <button 
                                onClick={() => handleCancelEvent(selectedEvent.id)}
                                className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                            >
                                Cancel Session
                            </button>

                            <div className="flex gap-2">
                                {selectedEvent.status === 'Pending Review' && (
                                    <button 
                                        onClick={() => handleConfirmEvent(selectedEvent.id)}
                                        className="px-5 py-2.5 rounded-xl bg-[#a5d391] text-black text-xs font-bold hover:bg-white transition-all cursor-pointer"
                                    >
                                        Approve Session
                                    </button>
                                )}
                                <button 
                                    onClick={() => setSelectedEvent(null)}
                                    className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Add Booking Slot */}
            {isAvailabilityModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-[#080b12] border border-white/20 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full relative shadow-2xl space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#a5d391]">add_circle</span>
                                Add Consultation Booking Slot
                            </h3>
                            <button onClick={() => setIsAvailabilityModalOpen(false)} className="text-white/50 hover:text-white cursor-pointer">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleAddSlotSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Patient Name</label>
                                <input 
                                    type="text"
                                    value={newSlot.client}
                                    onChange={(e) => setNewSlot({ ...newSlot, client: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    placeholder="e.g. David Miller"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Session Topic / Title</label>
                                <input 
                                    type="text"
                                    value={newSlot.title}
                                    onChange={(e) => setNewSlot({ ...newSlot, title: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    placeholder="e.g. Monthly Biometric Review"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Time Slot</label>
                                    <select 
                                        value={newSlot.time}
                                        onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    >
                                        <option value="09:00 AM">09:00 AM</option>
                                        <option value="10:00 AM">10:00 AM</option>
                                        <option value="11:30 AM">11:30 AM</option>
                                        <option value="02:00 PM">02:00 PM</option>
                                        <option value="04:00 PM">04:00 PM</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Type</label>
                                    <select 
                                        value={newSlot.type}
                                        onChange={(e) => setNewSlot({ ...newSlot, type: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    >
                                        <option value="Clinical Consultation">Consultation</option>
                                        <option value="Dietary Protocol Review">Diet Review</option>
                                        <option value="Urgent Intervention">Urgent Check</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Notes / Instructions</label>
                                <textarea 
                                    rows="2"
                                    value={newSlot.notes}
                                    onChange={(e) => setNewSlot({ ...newSlot, notes: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    placeholder="Initial session agenda..."
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setIsAvailabilityModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white text-xs font-bold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-6 py-2.5 rounded-xl bg-[#a5d391] text-black text-xs font-bold hover:bg-white transition-all cursor-pointer"
                                >
                                    Create Slot
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentManagement;
