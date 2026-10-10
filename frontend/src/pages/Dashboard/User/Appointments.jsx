import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';
import { API_BASE_URL } from '../../../api/axios';

const Appointments = () => {
    const { user, token } = useContext(AuthContext);
    const [appointments, setAppointments] = useState([]);
    const [dietitians, setDietitians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [notification, setNotification] = useState(null);

    const [bookingForm, setBookingForm] = useState({
        dietitianId: '',
        title: 'Metabolic Baseline Review',
        sessionType: 'Clinical Consultation',
        date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days from now
        time: '14:00',
        notes: ''
    });

    useEffect(() => {
        fetchAppointments();
        fetchDietitians();
    }, [user, token]);

    useEffect(() => {
        if (isBookingModalOpen || selectedAppointment) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isBookingModalOpen, selectedAppointment]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const authToken = token || localStorage.getItem('token');
            const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
            const res = await fetch(`${API_BASE_URL}/appointments/me`, { headers });
            if (res.ok) {
                const data = await res.json();
                setAppointments(data);
            }
        } catch (err) {
            console.error('Failed to fetch user appointments:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDietitians = async () => {
        try {
            const authToken = token || localStorage.getItem('token');
            const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
            const res = await fetch(`${API_BASE_URL}/appointments/dietitians`, { headers });
            if (res.ok) {
                const data = await res.json();
                setDietitians(data);
                if (data.length > 0) {
                    setBookingForm(prev => ({ ...prev, dietitianId: data[0].id }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch dietitians:', err);
        }
    };

    const handleBookSubmit = async (e) => {
        e.preventDefault();
        try {
            const appointmentTime = `${bookingForm.date}T${bookingForm.time}:00`;
            const payload = {
                dietitianId: bookingForm.dietitianId ? Number(bookingForm.dietitianId) : null,
                title: bookingForm.title,
                sessionType: bookingForm.sessionType,
                appointmentTime: appointmentTime,
                notes: bookingForm.notes,
                status: 'Pending Review'
            };

            const res = await fetch(`${API_BASE_URL}/appointments/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const newApt = await res.json();
                setAppointments([newApt, ...appointments]);
                setIsBookingModalOpen(false);
                setBookingForm({
                    dietitianId: dietitians.length > 0 ? dietitians[0].id : '',
                    title: 'Metabolic Baseline Review',
                    sessionType: 'Clinical Consultation',
                    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
                    time: '14:00',
                    notes: ''
                });
                showToast('Consultation request submitted! Awaiting nutritionist confirmation.');
            } else {
                showToast('Failed to book appointment. Please try again.');
            }
        } catch (err) {
            console.error('Error booking appointment:', err);
            showToast('Error booking appointment.');
        }
    };

    const handleCancelAppointment = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/appointments/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok || res.status === 204) {
                setAppointments(appointments.filter(a => a.id !== id));
                setSelectedAppointment(null);
                showToast('Consultation session cancelled.');
            }
        } catch (err) {
            console.error('Failed to cancel appointment:', err);
        }
    };

    const showToast = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3500);
    };

    if (!user) {
        return <FeatureGate />;
    }

    const upcomingAppointments = appointments.filter(a => a.status !== 'CANCELLED' && a.status !== 'COMPLETED');
    const pastAppointments = appointments.filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED');
    const featuredUpcoming = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

    // Helper for formatting date strings
    const formatDate = (dateStr) => {
        if (!dateStr) return { month: 'OCT', day: '15', time: '14:00' };
        const d = new Date(dateStr);
        const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
        const day = d.getDate();
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const fullDate = d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
        return { month, day, time, fullDate };
    };

    const primaryDietitian = dietitians.length > 0 ? dietitians[0] : {
        name: 'Dr. Elena Rostova',
        email: 'elena.rostova@nutrimunch.ai',
        credentials: 'Certified Clinical Dietitian',
        specialization: 'Algorithmic Biology & Metabolism'
    };

    const openBookingForDietitian = (dietitianId) => {
        setBookingForm(prev => ({ ...prev, dietitianId }));
        setIsBookingModalOpen(true);
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

            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white mb-1">Consultations</h1>
                    <p className="text-white/50 text-xs sm:text-sm">Schedule and review 1-on-1 virtual sessions with registered clinical nutritionists.</p>
                </div>
                <button 
                    onClick={() => setIsBookingModalOpen(true)}
                    className="bg-[#a5d391] text-black font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">calendar_add_on</span>
                    Initialize Booking
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Left Content */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-lg font-bold font-hero-display text-white/70 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#a5d391]">stars</span>
                        Upcoming Consultation
                    </h2>

                    {loading ? (
                        <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-center text-white/50">
                            Loading consultation schedule...
                        </div>
                    ) : featuredUpcoming ? (
                        <div className="bg-gradient-to-r from-[#a5d391]/10 via-white/5 to-[#080b12] backdrop-blur-xl border border-[#a5d391]/30 rounded-[2.5rem] p-6 lg:p-8 flex flex-col md:flex-row gap-6 items-center shadow-xl relative overflow-hidden">
                            <div className="bg-[#080b12]/90 border border-white/10 rounded-2xl p-4 text-center min-w-[110px] shrink-0 shadow-lg">
                                <div className="text-[#a5d391] font-bold text-xs uppercase tracking-widest mb-1">
                                    {formatDate(featuredUpcoming.appointmentTime).month}
                                </div>
                                <div className="text-3xl font-bold font-hero-display text-white">
                                    {formatDate(featuredUpcoming.appointmentTime).day}
                                </div>
                                <div className="text-white/40 text-xs mt-1">
                                    {formatDate(featuredUpcoming.appointmentTime).time}
                                </div>
                            </div>

                            <div className="flex-grow text-center md:text-left">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${featuredUpcoming.status === 'Confirmed' || featuredUpcoming.status === 'SCHEDULED' ? 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                                        {featuredUpcoming.status || 'Pending Review'}
                                    </span>
                                    <span className="text-xs text-white/40 font-semibold">• {featuredUpcoming.sessionType || 'Clinical Consultation'}</span>
                                </div>

                                <h3 className="font-bold text-xl mb-1 font-hero-display text-white">{featuredUpcoming.title || 'Metabolic Baseline Review'}</h3>
                                <p className="text-white/60 text-sm mb-4">
                                    Nutritionist: <span className="text-white font-semibold">{featuredUpcoming.dietitianName || primaryDietitian.name}</span>
                                    {featuredUpcoming.notes ? ` — "${featuredUpcoming.notes}"` : ''}
                                </p>

                                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                    <a 
                                        href={featuredUpcoming.meetingLink || "https://meet.google.com/nutri-ai-session"} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="bg-[#a5d391] text-black px-5 py-2.5 rounded-full text-xs font-bold hover:bg-white transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(165,211,145,0.3)] cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-sm">videocam</span> Join Virtual Room
                                    </a>
                                    <button 
                                        onClick={() => handleCancelAppointment(featuredUpcoming.id)}
                                        className="border border-red-500/30 text-red-300 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer"
                                    >
                                        Cancel Session
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 text-center space-y-4 shadow-xl">
                            <div className="w-12 h-12 rounded-full bg-[#a5d391]/10 text-[#a5d391] flex items-center justify-center mx-auto border border-[#a5d391]/20">
                                <span className="material-symbols-outlined text-2xl">event_upcoming</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">No Upcoming Consultations</h3>
                            <p className="text-white/50 text-xs max-w-md mx-auto">
                                You don't have any active appointments scheduled. Select a registered clinical nutritionist below to review your macro protocol.
                            </p>
                            <button 
                                onClick={() => setIsBookingModalOpen(true)}
                                className="bg-[#a5d391] text-black font-bold text-xs uppercase tracking-widest px-6 py-2.5 rounded-full hover:bg-white transition-all shadow-[0_0_15px_rgba(165,211,145,0.3)] cursor-pointer"
                            >
                                Book Session Now
                            </button>
                        </div>
                    )}

                    {/* Historical & All Bookings List */}
                    <h2 className="text-lg font-bold font-hero-display text-white/70 mt-10 flex items-center gap-2">
                        <span className="material-symbols-outlined text-white/40">history</span>
                        Consultation History ({appointments.length})
                    </h2>

                    {appointments.length === 0 ? (
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 text-center text-white/40 text-xs">
                            No consultation history recorded yet.
                        </div>
                    ) : (
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-xl divide-y divide-white/10">
                            {appointments.map((item) => {
                                const dt = formatDate(item.appointmentTime);
                                return (
                                    <div 
                                        key={item.id} 
                                        onClick={() => setSelectedAppointment(item)}
                                        className="p-5 sm:p-6 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center shrink-0">
                                                <span className="text-[10px] text-[#a5d391] font-bold uppercase">{dt.month}</span>
                                                <span className="text-xs font-bold text-white">{dt.day}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-white font-hero-display truncate group-hover:text-[#a5d391] transition-colors">
                                                    {item.title || 'Clinical Consultation'}
                                                </div>
                                                <div className="text-xs text-white/50 truncate">
                                                    {dt.fullDate || 'Oct 15, 2026'} • {item.dietitianName || primaryDietitian.name} • {item.sessionType || 'Consultation'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${item.status === 'Confirmed' || item.status === 'SCHEDULED' ? 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30' : item.status === 'CANCELLED' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                                                {item.status || 'Pending'}
                                            </span>
                                            <span className="material-symbols-outlined text-white/30 group-hover:text-white transition-colors">chevron_right</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Sidebar - All Registered Nutritionists */}
                <div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 sticky top-24 shadow-xl space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold font-hero-display text-lg text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#a5d391]">medical_services</span>
                                Platform Dietitians
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30">
                                {dietitians.length} Registered
                            </span>
                        </div>

                        <p className="text-xs text-white/50">
                            Certified nutritionists available for 1-on-1 virtual consultation bookings:
                        </p>

                        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                            {dietitians.length === 0 ? (
                                <div className="text-xs text-white/40 text-center py-4">No dietitian profiles available yet.</div>
                            ) : (
                                dietitians.map((d) => (
                                    <div 
                                        key={d.id} 
                                        className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 hover:border-[#a5d391]/40 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#a5d391] to-emerald-400 text-[#080b12] font-bold text-base flex items-center justify-center shadow-md shrink-0">
                                                {d.name ? d.name.split(' ').map(n => n[0]).join('') : 'DR'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-white text-sm truncate">{d.name}</div>
                                                <div className="text-[#a5d391] text-[11px] font-semibold truncate">{d.credentials || 'Certified Dietitian'}</div>
                                                <div className="text-white/40 text-[10px] truncate">{d.specialization || 'Clinical Specialist'}</div>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => openBookingForDietitian(d.id)}
                                            className="w-full bg-[#a5d391]/10 border border-[#a5d391]/30 text-[#a5d391] hover:bg-[#a5d391] hover:text-black transition-all py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm">event</span> Book Consultation
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="bg-black/30 border border-white/10 rounded-2xl p-3 text-center">
                            <p className="text-[11px] text-white/40">⚡ Direct 1-on-1 video call links generated automatically upon booking approval.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Book Appointment */}
            {isBookingModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-8 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    <div className="bg-[#080b12] border border-white/20 rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full relative shadow-2xl space-y-6 max-h-[80vh] overflow-y-auto my-auto">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-hero-display">
                                <span className="material-symbols-outlined text-[#a5d391]">edit_calendar</span>
                                Book Clinical Consultation
                            </h3>
                            <button onClick={() => setIsBookingModalOpen(false)} className="text-white/50 hover:text-white cursor-pointer">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleBookSubmit} className="space-y-4">
                            {/* Rich Dietitian Selection Cards */}
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                                    Select Registered Dietitian ({dietitians.length} Available)
                                </label>

                                {dietitians.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {dietitians.map((d) => (
                                            <div 
                                                key={d.id}
                                                onClick={() => setBookingForm({ ...bookingForm, dietitianId: d.id })}
                                                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${bookingForm.dietitianId == d.id ? 'bg-[#a5d391]/20 border-[#a5d391] text-white' : 'bg-black/40 border-white/10 text-white/70 hover:border-white/30'}`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${bookingForm.dietitianId == d.id ? 'bg-[#a5d391] text-black' : 'bg-white/10 text-white'}`}>
                                                        {d.name ? d.name.split(' ').map(n => n[0]).join('') : 'DR'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-xs text-white truncate">{d.name}</div>
                                                        <div className="text-[10px] text-[#a5d391] truncate">{d.credentials || 'Certified Clinical Dietitian'} • {d.specialization || 'Clinical Health'}</div>
                                                        <div className="text-[10px] text-white/40 truncate">{d.email}</div>
                                                    </div>
                                                </div>

                                                {bookingForm.dietitianId == d.id && (
                                                    <span className="material-symbols-outlined text-[#a5d391] shrink-0">check_circle</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <select 
                                        value={bookingForm.dietitianId}
                                        onChange={(e) => setBookingForm({ ...bookingForm, dietitianId: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    >
                                        <option value="">Dr. Elena Rostova (Lead Clinical Dietitian)</option>
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Consultation Topic</label>
                                <input 
                                    type="text"
                                    value={bookingForm.title}
                                    onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    placeholder="e.g. Metabolic Baseline Review"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Date</label>
                                    <input 
                                        type="date"
                                        value={bookingForm.date}
                                        onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Time Slot</label>
                                    <select 
                                        value={bookingForm.time}
                                        onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    >
                                        <option value="09:00">09:00 AM</option>
                                        <option value="11:00">11:00 AM</option>
                                        <option value="14:00">02:00 PM</option>
                                        <option value="16:00">04:00 PM</option>
                                        <option value="17:30">05:30 PM</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Session Type</label>
                                <select 
                                    value={bookingForm.sessionType}
                                    onChange={(e) => setBookingForm({ ...bookingForm, sessionType: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                >
                                    <option value="Clinical Consultation">Clinical Consultation</option>
                                    <option value="Dietary Protocol Review">Dietary Protocol Review</option>
                                    <option value="Macro Calibration">Macro Calibration</option>
                                    <option value="Follow-up Check-in">Follow-up Check-in</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Notes / Questions for Dietitian</label>
                                <textarea 
                                    rows="2"
                                    value={bookingForm.notes}
                                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    placeholder="Describe your current dietary goal or recent changes..."
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setIsBookingModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white text-xs font-bold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-6 py-2.5 rounded-xl bg-[#a5d391] text-black text-xs font-bold hover:bg-white transition-all cursor-pointer shadow-lg"
                                >
                                    Book Session
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Appointment Detail View */}
            {selectedAppointment && (
                <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-8 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    <div className="bg-[#080b12] border border-white/20 rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full relative shadow-2xl space-y-6 max-h-[80vh] overflow-y-auto my-auto">
                        <div className="flex justify-between items-start border-b border-white/10 pb-4">
                            <div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedAppointment.status === 'Confirmed' || selectedAppointment.status === 'SCHEDULED' ? 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                                    {selectedAppointment.status || 'Pending Review'}
                                </span>
                                <h3 className="text-xl font-bold text-white mt-2 font-hero-display">{selectedAppointment.title || 'Consultation Session'}</h3>
                                <p className="text-xs text-[#a5d391] font-semibold">{selectedAppointment.sessionType || 'Clinical Consultation'}</p>
                            </div>
                            <button onClick={() => setSelectedAppointment(null)} className="text-white/50 hover:text-white cursor-pointer">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                                <span className="material-symbols-outlined text-2xl text-[#a5d391]">schedule</span>
                                <div>
                                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Scheduled Date & Time</div>
                                    <div className="text-sm font-bold text-white">
                                        {formatDate(selectedAppointment.appointmentTime).fullDate} • {formatDate(selectedAppointment.appointmentTime).time}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                                <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Assigned Specialist</div>
                                <div className="text-sm font-bold text-white">{selectedAppointment.dietitianName || primaryDietitian.name}</div>
                            </div>

                            {selectedAppointment.notes && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Session Notes</div>
                                    <p className="text-xs text-white/80 leading-relaxed italic">"{selectedAppointment.notes}"</p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
                            <button 
                                onClick={() => handleCancelAppointment(selectedAppointment.id)}
                                className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                            >
                                Cancel Consultation
                            </button>

                            <div className="flex gap-2">
                                <a 
                                    href={selectedAppointment.meetingLink || "https://meet.google.com/nutri-ai-session"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-5 py-2.5 rounded-xl bg-[#a5d391] text-black text-xs font-bold hover:bg-white transition-all cursor-pointer flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-sm">videocam</span> Join Room
                                </a>
                                <button 
                                    onClick={() => setSelectedAppointment(null)}
                                    className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Appointments;
