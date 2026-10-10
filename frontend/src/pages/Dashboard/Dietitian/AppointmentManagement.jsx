import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';

const AppointmentManagement = () => {
    const { user, token } = useContext(AuthContext);
    const [viewMode, setViewMode] = useState('Week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
    const [notification, setNotification] = useState(null);
    
    const [eventsList, setEventsList] = useState([]);
    const [clientsList, setClientsList] = useState([]);
    const [loading, setLoading] = useState(true);

    const [newSlot, setNewSlot] = useState({
        userId: '',
        clientName: '',
        title: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        type: 'Clinical Consultation',
        notes: ''
    });

    useEffect(() => {
        if (token) {
            fetchAppointments();
            fetchClients();
        }
    }, [token]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const res = await fetch('http://localhost:8080/api/appointments/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setEventsList(data);
            }
        } catch (err) {
            console.error('Failed to fetch nutritionist appointments:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const res = await fetch('http://localhost:8080/api/admin/all-user-profiles', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter out non-user roles (dietitians & admins)
                const clientUsers = data.filter(u => u.role === 'USER' || !u.role);
                setClientsList(clientUsers);
                if (clientUsers.length > 0) {
                    setNewSlot(prev => ({
                        ...prev,
                        userId: clientUsers[0].userId,
                        clientName: `${clientUsers[0].firstName} ${clientUsers[0].lastName}`
                    }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch clients:', err);
        }
    };

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

    const handleConfirmEvent = async (id) => {
        try {
            const res = await fetch(`http://localhost:8080/api/appointments/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'Confirmed',
                    notes: selectedEvent?.notes || 'Confirmed by clinical nutritionist.'
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setEventsList(eventsList.map(ev => ev.id === id ? updated : ev));
                setSelectedEvent(null);
                showToast('Appointment confirmed and synced with patient calendar!');
            }
        } catch (err) {
            console.error('Failed to confirm appointment:', err);
            showToast('Error confirming appointment.');
        }
    };

    const handleCancelEvent = async (id) => {
        try {
            const res = await fetch(`http://localhost:8080/api/appointments/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok || res.status === 204) {
                setEventsList(eventsList.filter(ev => ev.id !== id));
                setSelectedEvent(null);
                showToast('Appointment cancelled.');
            }
        } catch (err) {
            console.error('Failed to cancel appointment:', err);
            showToast('Error cancelling appointment.');
        }
    };

    const handleAddSlotSubmit = async (e) => {
        e.preventDefault();

        try {
            const appointmentTime = `${newSlot.date}T${newSlot.time}:00`;
            const payload = {
                userId: newSlot.userId ? Number(newSlot.userId) : null,
                title: newSlot.title || 'Clinical Consultation',
                sessionType: newSlot.type,
                appointmentTime: appointmentTime,
                notes: newSlot.notes,
                status: 'Confirmed'
            };

            const res = await fetch('http://localhost:8080/api/appointments/book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const created = await res.json();
                setEventsList([created, ...eventsList]);
                setIsAvailabilityModalOpen(false);
                setNewSlot({
                    userId: clientsList.length > 0 ? clientsList[0].userId : '',
                    clientName: clientsList.length > 0 ? `${clientsList[0].firstName} ${clientsList[0].lastName}` : '',
                    title: '',
                    date: new Date().toISOString().split('T')[0],
                    time: '10:00',
                    type: 'Clinical Consultation',
                    notes: ''
                });
                showToast('New consultation slot created & published to patient portal!');
            }
        } catch (err) {
            console.error('Failed to create booking slot:', err);
            showToast('Failed to create slot.');
        }
    };

    const showToast = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3500);
    };

    const monthYearString = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const formatApptTime = (timeStr) => {
        if (!timeStr) return 'TBD';
        const d = new Date(timeStr);
        return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

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

                    {loading ? (
                        <div className="py-12 text-center text-white/50 text-sm">Loading clinical schedule...</div>
                    ) : eventsList.length === 0 ? (
                        <div className="py-12 text-center text-white/40 text-xs bg-black/20 rounded-2xl border border-white/5">
                            No consultation sessions scheduled yet. Click "Add Booking Slot" to schedule a patient consultation.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {eventsList.map(event => (
                                <div 
                                    key={event.id}
                                    onClick={() => setSelectedEvent(event)}
                                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${event.status === 'Pending Review' || event.status === 'PENDING' ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50' : event.status === 'CANCELLED' ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10 hover:border-[#a5d391]/40'}`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${event.status === 'Pending Review' || event.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : event.status === 'CANCELLED' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30'}`}>
                                                {event.status || 'Scheduled'}
                                            </span>
                                            <h3 className="text-base font-bold text-white mt-2 group-hover:text-[#a5d391] transition-colors">{event.title || 'Clinical Consultation'}</h3>
                                            <div className="text-xs text-white/60 font-semibold">{event.userName || 'Patient'} • {event.sessionType || 'Consultation'}</div>
                                        </div>
                                        <span className="material-symbols-outlined text-white/30 group-hover:text-white transition-colors">info</span>
                                    </div>

                                    <div className="flex justify-between items-center pt-3 border-t border-white/5 text-xs text-white/50">
                                        <div className="flex items-center gap-1 text-white/80 font-bold">
                                            <span className="material-symbols-outlined text-sm text-[#a5d391]">schedule</span>
                                            {formatApptTime(event.appointmentTime)}
                                        </div>
                                        <span className="text-[#a5d391] font-bold text-[11px] group-hover:underline">View Session & Notes →</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Event Session Details */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-[#080b12] border border-white/20 rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full relative shadow-2xl space-y-6">
                        <div className="flex justify-between items-start border-b border-white/10 pb-4">
                            <div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedEvent.status === 'Pending Review' || selectedEvent.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : selectedEvent.status === 'CANCELLED' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30'}`}>
                                    {selectedEvent.status || 'Scheduled'}
                                </span>
                                <h3 className="text-xl font-bold text-white mt-2">{selectedEvent.title || 'Clinical Consultation'}</h3>
                                <p className="text-xs text-[#a5d391] font-semibold">{selectedEvent.userName} ({selectedEvent.sessionType || 'Consultation'})</p>
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
                                    <div className="text-sm font-bold text-white">{formatApptTime(selectedEvent.appointmentTime)}</div>
                                </div>
                            </div>

                            {selectedEvent.userEmail && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Patient Contact</div>
                                    <div className="text-xs text-white font-semibold">{selectedEvent.userEmail}</div>
                                </div>
                            )}

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                                <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Clinical Context & Goal</div>
                                <p className="text-xs text-white/80 leading-relaxed italic">
                                    {selectedEvent.notes ? `"${selectedEvent.notes}"` : 'No custom notes provided for this consultation session.'}
                                </p>
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
                                {(selectedEvent.status === 'Pending Review' || selectedEvent.status === 'PENDING' || selectedEvent.status === 'SCHEDULED') && (
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
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Select Patient</label>
                                <select 
                                    value={newSlot.userId}
                                    onChange={(e) => setNewSlot({ ...newSlot, userId: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                >
                                    {clientsList.length > 0 ? (
                                        clientsList.map(c => (
                                            <option key={c.userId} value={c.userId}>{c.firstName} {c.lastName} ({c.email})</option>
                                        ))
                                    ) : (
                                        <option value="">Registered Client Patient</option>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Session Topic / Title</label>
                                <input 
                                    type="text"
                                    value={newSlot.title}
                                    onChange={(e) => setNewSlot({ ...newSlot, title: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    placeholder="e.g. Monthly Biometric & Macro Review"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Date</label>
                                    <input 
                                        type="date"
                                        value={newSlot.date}
                                        onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Time Slot</label>
                                    <select 
                                        value={newSlot.time}
                                        onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    >
                                        <option value="09:00">09:00 AM</option>
                                        <option value="10:00">10:00 AM</option>
                                        <option value="11:30">11:30 AM</option>
                                        <option value="14:00">02:00 PM</option>
                                        <option value="16:00">04:00 PM</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Session Type</label>
                                <select 
                                    value={newSlot.type}
                                    onChange={(e) => setNewSlot({ ...newSlot, type: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                >
                                    <option value="Clinical Consultation">Clinical Consultation</option>
                                    <option value="Dietary Protocol Review">Diet Review</option>
                                    <option value="Urgent Intervention">Urgent Check</option>
                                    <option value="Hormonal Protocol">Hormonal Protocol</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Clinical Notes / Agenda</label>
                                <textarea 
                                    rows="2"
                                    value={newSlot.notes}
                                    onChange={(e) => setNewSlot({ ...newSlot, notes: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    placeholder="Initial session agenda or review goals..."
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
                                    className="px-6 py-2.5 rounded-xl bg-[#a5d391] text-black text-xs font-bold hover:bg-white transition-all cursor-pointer shadow-lg"
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
