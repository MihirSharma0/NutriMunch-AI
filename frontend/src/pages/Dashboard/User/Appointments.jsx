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
    const [historyFilter, setHistoryFilter] = useState('ALL');

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


    // Helper to check if appointment date/time has passed
    const isDatePassed = (dateStr) => {
        if (!dateStr) return true;
        const time = new Date(dateStr).getTime();
        return !isNaN(time) && time <= Date.now();
    };

    // Helper for formatting date strings
    const formatDate = (dateStr) => {
        if (!dateStr) return { month: 'OCT', day: '15', time: '14:00', fullDate: 'Oct 15, 2026' };
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { month: 'OCT', day: '15', time: '14:00', fullDate: 'Oct 15, 2026' };
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

    // Default starter history if user has 0 records yet
    const getDefaultHistoricalAppointments = () => {
        const dName = primaryDietitian.name || 'Dr. Elena Rostova';
        const dEmail = primaryDietitian.email || 'elena.rostova@nutrimunch.ai';
        const dCred = primaryDietitian.credentials || 'Certified Clinical Dietitian';
        const now = Date.now();

        return [
            {
                id: 'hist-ongoing-1',
                title: 'Metabolic Biomarker & Nutrition Assessment',
                sessionType: 'Clinical Consultation',
                appointmentTime: new Date(now + 2 * 3600 * 1000).toISOString(), // 2 hours from now (ongoing/future)
                status: 'Ongoing',
                dietitianName: dName,
                dietitianEmail: dEmail,
                dietitianCredentials: dCred,
                notes: 'Active assessment of caloric deficit and nutrient partition efficiency.',
                meetingLink: 'https://meet.google.com/nutri-ai-session'
            },
            {
                id: 'hist-upcoming-2',
                title: 'Comprehensive Gut Microbiome Consultation',
                sessionType: 'Dietary Protocol Review',
                appointmentTime: new Date(now + 4 * 86400 * 1000).toISOString(), // 4 days from now (future)
                status: 'Scheduled',
                dietitianName: dName,
                dietitianEmail: dEmail,
                dietitianCredentials: dCred,
                notes: 'Reviewing digestive tolerance, fermented food integration, and fiber targets.',
                meetingLink: 'https://meet.google.com/nutri-ai-session'
            },
            {
                id: 'hist-past-1',
                title: 'Initial Macro Calibration & Intake Review',
                sessionType: 'Macro Calibration',
                appointmentTime: new Date(now - 5 * 86400 * 1000).toISOString(), // 5 days ago (past)
                status: 'Completed',
                dietitianName: dName,
                dietitianEmail: dEmail,
                dietitianCredentials: dCred,
                notes: 'Calibrated daily baseline targets: 2000 kcal, 140g protein. Patient shows positive metabolic adaptation.',
                meetingLink: 'https://meet.google.com/nutri-ai-session'
            },
            {
                id: 'hist-past-2',
                title: 'Hydration & Electrolyte Protocol Review',
                sessionType: 'Clinical Consultation',
                appointmentTime: new Date(now - 12 * 86400 * 1000).toISOString(), // 12 days ago (past)
                status: 'Completed',
                dietitianName: dName,
                dietitianEmail: dEmail,
                dietitianCredentials: dCred,
                notes: 'Increased daily hydration target to 3.0 L with scheduled electrolyte replenishment.',
                meetingLink: 'https://meet.google.com/nutri-ai-session'
            },
            {
                id: 'hist-past-3',
                title: 'Biomarker Lipid Profile Follow-up',
                sessionType: 'Follow-up Check-in',
                appointmentTime: new Date(now - 19 * 86400 * 1000).toISOString(), // 19 days ago (past)
                status: 'Cancelled',
                dietitianName: dName,
                dietitianEmail: dEmail,
                dietitianCredentials: dCred,
                notes: 'Consultation cancelled due to patient business travel. Rescheduled for later date.',
                meetingLink: 'https://meet.google.com/nutri-ai-session'
            }
        ];
    };

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const authToken = token || localStorage.getItem('token');
            const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

            let backendData = [];
            try {
                const res = await fetch(`${API_BASE_URL}/appointments/me`, { headers });
                if (res.ok) {
                    backendData = await res.json();
                }
            } catch (err) {
                console.warn('Backend fetch failed, utilizing local appointments cache:', err);
            }

            let deletedIds = new Set();
            try {
                const storedDeleted = JSON.parse(localStorage.getItem('nutrimunch_deleted_appointment_ids') || '[]');
                deletedIds = new Set(storedDeleted.map(String));
            } catch (e) {}

            let storedLocal = [];
            try {
                const rawLocal = localStorage.getItem('nutrimunch_user_appointments');
                if (rawLocal) {
                    storedLocal = JSON.parse(rawLocal);
                }
            } catch (e) {}

            let merged = [];
            if (backendData.length === 0 && storedLocal.length === 0) {
                const defaults = getDefaultHistoricalAppointments();
                merged = defaults;
                localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(defaults));
            } else {
                const map = new Map();
                storedLocal.forEach(item => map.set(String(item.id), item));
                backendData.forEach(item => map.set(String(item.id), item));
                merged = Array.from(map.values());
            }

            const activeAppointments = merged.filter(item => !deletedIds.has(String(item.id)));
            activeAppointments.sort((a, b) => new Date(b.appointmentTime) - new Date(a.appointmentTime));
            setAppointments(activeAppointments);
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

    // Deletion rule:
    // 1. Any past appointment (appointmentTime <= now) can be deleted.
    // 2. Future appointments can be deleted IF cancelled by user or rejected by nutritionist.
    // 3. Active/ongoing/scheduled/confirmed/pending future appointments CANNOT be deleted until their date passes.
    const canDeleteAppointment = (item) => {
        if (!item) return false;
        if (isDatePassed(item.appointmentTime)) {
            return true;
        }
        const upper = (item.status || '').toUpperCase();
        if (upper === 'CANCELLED' || upper === 'REJECTED') {
            return true;
        }
        return false;
    };

    const handleBookSubmit = async (e) => {
        e.preventDefault();
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            if (bookingForm.date < todayStr) {
                showToast('Cannot book appointments for past dates. Please select today or a future date.');
                return;
            }

            const appointmentTime = `${bookingForm.date}T${bookingForm.time}:00`;
            const payload = {
                dietitianId: bookingForm.dietitianId ? Number(bookingForm.dietitianId) : null,
                title: bookingForm.title,
                sessionType: bookingForm.sessionType,
                appointmentTime: appointmentTime,
                notes: bookingForm.notes,
                status: 'Requested'
            };

            let newApt = null;
            try {
                const res = await fetch(`${API_BASE_URL}/appointments/book`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    newApt = await res.json();
                }
            } catch (err) {}

            if (!newApt) {
                newApt = {
                    id: Date.now(),
                    dietitianId: payload.dietitianId,
                    dietitianName: dietitians.find(d => d.id === payload.dietitianId)?.name || primaryDietitian.name,
                    title: payload.title,
                    sessionType: payload.sessionType,
                    appointmentTime: payload.appointmentTime,
                    notes: payload.notes,
                    status: 'Requested',
                    meetingLink: 'https://meet.google.com/nutri-ai-session'
                };
            }

            const updatedList = [newApt, ...appointments];
            setAppointments(updatedList);
            try {
                localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(updatedList));
            } catch (e) {}

            setIsBookingModalOpen(false);
            setBookingForm({
                dietitianId: dietitians.length > 0 ? dietitians[0].id : '',
                title: 'Metabolic Baseline Review',
                sessionType: 'Clinical Consultation',
                date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
                time: '14:00',
                notes: ''
            });
            showToast('Consultation requested with nutritionist! Status: Requested.');
        } catch (err) {
            console.error('Error booking appointment:', err);
            showToast('Error booking appointment.');
        }
    };

    // Marks an upcoming session as cancelled (retains it in Consultation History with Cancelled status)
    const handleCancelAppointment = async (id) => {
        const stringId = String(id);
        const updated = appointments.map(a => String(a.id) === stringId ? { ...a, status: 'CANCELLED' } : a);
        setAppointments(updated);
        try {
            localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(updated));
        } catch (e) {}

        if (selectedAppointment && String(selectedAppointment.id) === stringId) {
            setSelectedAppointment(prev => prev ? { ...prev, status: 'CANCELLED' } : null);
        }

        if (token && (typeof id === 'number' || !isNaN(Number(id)))) {
            fetch(`${API_BASE_URL}/appointments/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'CANCELLED' })
            }).catch(() => {});
        }

        showToast('Consultation session marked as Cancelled. Retained in your Consultation History.');
    };

    // Delete record (Allowed for past dates OR future sessions cancelled/rejected)
    const handleDeleteHistoryItem = async (e, item) => {
        if (e && e.stopPropagation) e.stopPropagation();

        if (!canDeleteAppointment(item)) {
            showToast('Active future or ongoing consultations cannot be deleted until the scheduled date has passed, or the session is cancelled/rejected.');
            return;
        }

        const stringId = String(item.id);
        const updated = appointments.filter(a => String(a.id) !== stringId);
        setAppointments(updated);

        if (selectedAppointment && String(selectedAppointment.id) === stringId) {
            setSelectedAppointment(null);
        }

        try {
            const storedDeleted = JSON.parse(localStorage.getItem('nutrimunch_deleted_appointment_ids') || '[]');
            if (!storedDeleted.includes(stringId)) {
                localStorage.setItem('nutrimunch_deleted_appointment_ids', JSON.stringify([...storedDeleted, stringId]));
            }
            localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(updated));
        } catch (err) {}

        if (token && (typeof item.id === 'number' || !isNaN(Number(item.id)))) {
            fetch(`${API_BASE_URL}/appointments/${item.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => {});
        }

        showToast('Consultation record deleted from history.');
    };

    // Clear all past history records and cancelled/rejected sessions (Strictly preserves active upcoming & ongoing sessions)
    const handleClearAllPastHistory = async () => {
        const deletableItems = appointments.filter(a => canDeleteAppointment(a));
        if (deletableItems.length === 0) {
            showToast('No past or cancelled/rejected consultation history to clear. Active upcoming & ongoing sessions cannot be deleted.');
            return;
        }

        const deletableIds = deletableItems.map(a => String(a.id));
        const remaining = appointments.filter(a => !canDeleteAppointment(a));
        setAppointments(remaining);

        if (selectedAppointment && deletableIds.includes(String(selectedAppointment.id))) {
            setSelectedAppointment(null);
        }

        try {
            const storedDeleted = JSON.parse(localStorage.getItem('nutrimunch_deleted_appointment_ids') || '[]');
            const combinedDeleted = Array.from(new Set([...storedDeleted, ...deletableIds]));
            localStorage.setItem('nutrimunch_deleted_appointment_ids', JSON.stringify(combinedDeleted));
            localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(remaining));
        } catch (err) {}

        if (token) {
            deletableItems.forEach(item => {
                if (typeof item.id === 'number' || !isNaN(Number(item.id))) {
                    fetch(`${API_BASE_URL}/appointments/${item.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(() => {});
                }
            });
        }

        showToast(`Cleared ${deletableItems.length} consultation record(s). Active upcoming and ongoing sessions are safely preserved.`);
    };

    const showToast = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3800);
    };

    if (!user) {
        return <FeatureGate />;
    }

    const upcomingAppointments = appointments.filter(a => {
        const isPassed = isDatePassed(a.appointmentTime);
        const upper = (a.status || '').toUpperCase();
        return !isPassed && upper !== 'CANCELLED' && upper !== 'COMPLETED' && upper !== 'REJECTED';
    });
    const featuredUpcoming = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

    const deletableAppointmentsCount = appointments.filter(a => canDeleteAppointment(a)).length;
    const upcomingOrOngoingCount = appointments.filter(a => !isDatePassed(a.appointmentTime) && (a.status || '').toUpperCase() !== 'CANCELLED' && (a.status || '').toUpperCase() !== 'REJECTED').length;
    const completedCount = appointments.filter(a => (a.status || '').toUpperCase() === 'COMPLETED').length;
    const cancelledCount = appointments.filter(a => {
        const upper = (a.status || '').toUpperCase();
        return upper === 'CANCELLED' || upper === 'REJECTED';
    }).length;

    const filteredAppointments = appointments.filter(item => {
        const isPassed = isDatePassed(item.appointmentTime);
        const upper = (item.status || '').toUpperCase();
        if (historyFilter === 'UPCOMING') return !isPassed && upper !== 'CANCELLED' && upper !== 'REJECTED';
        if (historyFilter === 'COMPLETED') return upper === 'COMPLETED';
        if (historyFilter === 'CANCELLED') return upper === 'CANCELLED' || upper === 'REJECTED';
        return true;
    });

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
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                        (featuredUpcoming.status || '').toUpperCase() === 'CONFIRMED' || (featuredUpcoming.status || '').toUpperCase() === 'SCHEDULED' || (featuredUpcoming.status || '').toUpperCase() === 'APPROVED' 
                                            ? 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30' 
                                            : (featuredUpcoming.status || '').toUpperCase() === 'REQUESTED' || (featuredUpcoming.status || '').toUpperCase().includes('PENDING')
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                                            : 'bg-white/10 text-white/80 border border-white/20'
                                    }`}>
                                        {((featuredUpcoming.status || '').toUpperCase() === 'REQUESTED' || (featuredUpcoming.status || '').toUpperCase().includes('PENDING')) ? 'Requested' : (featuredUpcoming.status || 'Requested')}
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
                    <div className="mt-10 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold font-hero-display text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#a5d391]">history</span>
                                    <span>Consultation History ({appointments.length})</span>
                                </h2>
                                <p className="text-white/40 text-xs">
                                    Review complete consultation records across all statuses. Past sessions can be purged, while upcoming and ongoing sessions are protected.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                {deletableAppointmentsCount > 0 ? (
                                    <button
                                        onClick={handleClearAllPastHistory}
                                        className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-red-500/40"
                                        title="Clears past, cancelled, and rejected consultation history. Active upcoming sessions are safely preserved."
                                    >
                                        <span className="material-symbols-outlined text-sm">delete_sweep</span>
                                        <span>Clear Past & Cancelled ({deletableAppointmentsCount})</span>
                                    </button>
                                ) : (
                                    <span 
                                        className="text-[11px] font-semibold text-white/40 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1 cursor-default"
                                        title="No past or cancelled history to clear. Active ongoing and future sessions are protected."
                                    >
                                        <span className="material-symbols-outlined text-xs text-[#a5d391]">verified</span>
                                        <span>History Clean</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Status Filter Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                            <button
                                onClick={() => setHistoryFilter('ALL')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                                    historyFilter === 'ALL'
                                        ? 'bg-[#a5d391] text-black shadow-md'
                                        : 'bg-white/5 text-white/60 hover:text-white border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                All ({appointments.length})
                            </button>
                            <button
                                onClick={() => setHistoryFilter('UPCOMING')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                    historyFilter === 'UPCOMING'
                                        ? 'bg-[#a5d391] text-black shadow-md'
                                        : 'bg-white/5 text-white/60 hover:text-white border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                                Upcoming & Ongoing ({upcomingOrOngoingCount})
                            </button>
                            <button
                                onClick={() => setHistoryFilter('COMPLETED')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                    historyFilter === 'COMPLETED'
                                        ? 'bg-[#a5d391] text-black shadow-md'
                                        : 'bg-white/5 text-white/60 hover:text-white border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                Completed ({completedCount})
                            </button>
                            <button
                                onClick={() => setHistoryFilter('CANCELLED')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                    historyFilter === 'CANCELLED'
                                        ? 'bg-[#a5d391] text-black shadow-md'
                                        : 'bg-white/5 text-white/60 hover:text-white border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                Cancelled ({cancelledCount})
                            </button>
                        </div>

                        {/* List */}
                        {filteredAppointments.length === 0 ? (
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 text-center text-white/40 text-xs space-y-2">
                                <span className="material-symbols-outlined text-2xl text-white/20">event_busy</span>
                                <p>No consultations found matching "{historyFilter}".</p>
                            </div>
                        ) : (
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-xl divide-y divide-white/10">
                                {filteredAppointments.map((item) => {
                                    const dt = formatDate(item.appointmentTime);
                                    const passed = isDatePassed(item.appointmentTime);
                                    const upper = (item.status || '').toUpperCase();
                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => setSelectedAppointment(item)}
                                            className="p-5 sm:p-6 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-11 h-11 rounded-2xl bg-[#080b12] border border-white/10 flex flex-col items-center justify-center shrink-0 shadow-inner">
                                                    <span className="text-[10px] text-[#a5d391] font-bold uppercase tracking-wider">{dt.month}</span>
                                                    <span className="text-xs font-bold text-white">{dt.day}</span>
                                                </div>
                                                <div className="min-w-0 space-y-0.5">
                                                    <div className="font-bold text-white font-hero-display truncate group-hover:text-[#a5d391] transition-colors text-sm">
                                                        {item.title || 'Clinical Consultation'}
                                                    </div>
                                                    <div className="text-xs text-white/50 truncate flex items-center gap-1.5 flex-wrap">
                                                        <span>{dt.fullDate} at {dt.time}</span>
                                                        <span>•</span>
                                                        <span className="text-white/70">{item.dietitianName || primaryDietitian.name}</span>
                                                        <span>•</span>
                                                        <span className="text-white/40">{item.sessionType || 'Consultation'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                {/* Status Pill */}
                                                {upper === 'COMPLETED' ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs">task_alt</span>
                                                        Completed
                                                    </span>
                                                ) : upper === 'CANCELLED' ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs">cancel</span>
                                                        Cancelled
                                                    </span>
                                                ) : upper === 'REJECTED' ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs">do_not_disturb</span>
                                                        Rejected
                                                    </span>
                                                ) : upper === 'ONGOING' || (!passed && upper === 'CONFIRMED') ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 animate-pulse">
                                                        <span className="material-symbols-outlined text-xs">timer</span>
                                                        {upper === 'ONGOING' ? 'Ongoing' : 'Upcoming'}
                                                    </span>
                                                ) : upper === 'REQUESTED' || upper.includes('PENDING') ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs">pending_actions</span>
                                                        Requested
                                                    </span>
                                                ) : upper === 'SCHEDULED' ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs">event_available</span>
                                                        Scheduled
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs">hourglass_top</span>
                                                        {item.status || 'Requested'}
                                                    </span>
                                                )}

                                                {/* Individual Action: Delete Past/Cancelled/Rejected OR Lock Active Ongoing/Future */}
                                                {canDeleteAppointment(item) ? (
                                                    <button
                                                        onClick={(e) => handleDeleteHistoryItem(e, item)}
                                                        title="Delete Record"
                                                        className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 cursor-pointer flex items-center justify-center group/del"
                                                    >
                                                        <span className="material-symbols-outlined text-base group-hover/del:scale-110 transition-transform">delete</span>
                                                    </button>
                                                ) : (
                                                    <div
                                                        title="Active future or ongoing consultations cannot be deleted until the date passes or the session is cancelled/rejected"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            showToast('Active future or ongoing consultations cannot be deleted until the scheduled date has passed, or the session is cancelled/rejected.');
                                                        }}
                                                        className="p-1.5 text-white/25 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all cursor-not-allowed flex items-center justify-center"
                                                    >
                                                        <span className="material-symbols-outlined text-base">lock</span>
                                                    </div>
                                                )}

                                                <span className="material-symbols-outlined text-white/30 group-hover:text-white transition-colors text-base hidden sm:inline">chevron_right</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
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
                                        className="bg-black/50 border border-white/10 hover:border-[#a5d391]/40 rounded-2xl p-4 space-y-3 transition-all shadow-md"
                                    >
                                        <div className="flex items-start gap-3">
                                            {Boolean(d.isApproved === true || d.approvalStatus === 'APPROVED' || d.approvalStatus === 'VERIFIED') ? (
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#a5d391] to-emerald-400 text-[#080b12] font-black text-base flex items-center justify-center shadow-md shrink-0">
                                                    {d.name ? d.name.split(' ').map(n => n[0]).join('') : 'DR'}
                                                </div>
                                            ) : (
                                                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/40 p-1.5 flex items-center justify-center shadow-md shrink-0 overflow-hidden">
                                                    <img src="/pending_avatar.png" alt="Pending Approval" className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-white text-sm truncate">{d.name}</span>
                                                    {Boolean(d.isApproved === true || d.approvalStatus === 'APPROVED' || d.approvalStatus === 'VERIFIED') ? (
                                                        <span className="material-symbols-outlined text-sm text-[#a5d391]" title="Verified Practitioner License">verified</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0" title="License Pending Admin Verification">
                                                            <span className="material-symbols-outlined text-[10px]">hourglass_empty</span> Pending Approval
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[#a5d391] text-[11px] font-bold truncate">{d.credentials || 'Certified Clinical Dietitian'}</div>
                                                <div className="text-white/60 text-[10px] truncate">{d.specialization || 'Clinical Nutrition Specialist'}</div>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px] text-white/70">
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="text-white/40 uppercase font-bold">Experience</span>
                                                <span className="text-white font-bold">{d.yearsOfExperience || '7+ Years Exp.'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="text-white/40 uppercase font-bold">Rate</span>
                                                <span className="text-[#a5d391] font-bold">{d.consultationFee || '₹1,500 / Session'}</span>
                                            </div>
                                        </div>

                                        {d.bio && (
                                            <p className="text-[11px] text-white/50 line-clamp-2 italic leading-relaxed">
                                                "{d.bio}"
                                            </p>
                                        )}

                                        <button 
                                            onClick={() => openBookingForDietitian(d.id)}
                                            className="w-full bg-[#a5d391]/10 border border-[#a5d391]/30 text-[#a5d391] hover:bg-[#a5d391] hover:text-black transition-all py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-sm"
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
                                                    {Boolean(d.isApproved === true || d.approvalStatus === 'APPROVED' || d.approvalStatus === 'VERIFIED') ? (
                                                        <div className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${bookingForm.dietitianId == d.id ? 'bg-[#a5d391] text-black' : 'bg-white/10 text-white'}`}>
                                                            {d.name ? d.name.split(' ').map(n => n[0]).join('') : 'DR'}
                                                        </div>
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/40 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                                                            <img src="/pending_avatar.png" alt="Pending Approval" className="w-full h-full object-contain filter drop-shadow-[0_0_5px_rgba(245,158,11,0.6)]" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-bold text-xs text-white truncate">{d.name}</span>
                                                            {Boolean(d.isApproved === true || d.approvalStatus === 'APPROVED' || d.approvalStatus === 'VERIFIED') ? (
                                                                <span className="material-symbols-outlined text-xs text-[#a5d391]">verified</span>
                                                            ) : (
                                                                <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">Pending Approval</span>
                                                            )}
                                                        </div>
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
                                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1 flex items-center justify-between">
                                        <span>Consultation Date</span>
                                        <span className="text-[10px] text-[#a5d391] font-normal lowercase">(today onwards)</span>
                                    </label>
                                    <input 
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={bookingForm.date}
                                        onClick={(e) => {
                                            try { e.target.showPicker?.(); } catch (err) {}
                                        }}
                                        onFocus={(e) => {
                                            try { e.target.showPicker?.(); } catch (err) {}
                                        }}
                                        onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391] cursor-pointer"
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
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                    (selectedAppointment.status || '').toUpperCase() === 'CONFIRMED' || (selectedAppointment.status || '').toUpperCase() === 'SCHEDULED' || (selectedAppointment.status || '').toUpperCase() === 'APPROVED' 
                                        ? 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30' 
                                        : (selectedAppointment.status || '').toUpperCase() === 'CANCELLED'
                                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                        : (selectedAppointment.status || '').toUpperCase() === 'REJECTED'
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : (selectedAppointment.status || '').toUpperCase() === 'COMPLETED'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                    {((selectedAppointment.status || '').toUpperCase() === 'REQUESTED' || (selectedAppointment.status || '').toUpperCase().includes('PENDING')) ? 'Requested' : (selectedAppointment.status || 'Requested')}
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
                            {canDeleteAppointment(selectedAppointment) ? (
                                <button 
                                    onClick={() => handleDeleteHistoryItem(null, selectedAppointment)}
                                    className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                    <span>Delete Record</span>
                                </button>
                            ) : (
                                (selectedAppointment.status || '').toUpperCase() !== 'CANCELLED' && (selectedAppointment.status || '').toUpperCase() !== 'REJECTED' ? (
                                    <button 
                                        onClick={() => handleCancelAppointment(selectedAppointment.id)}
                                        className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-sm">event_busy</span>
                                        <span>Cancel Consultation</span>
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-xs text-white/40 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                                        <span className="material-symbols-outlined text-sm text-amber-400">lock</span>
                                        <span>Active session protected</span>
                                    </div>
                                )
                            )}

                            <div className="flex gap-2">
                                {!isDatePassed(selectedAppointment.appointmentTime) && (selectedAppointment.status || '').toUpperCase() !== 'CANCELLED' && (
                                    <a 
                                        href={selectedAppointment.meetingLink || "https://meet.google.com/nutri-ai-session"}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="px-5 py-2.5 rounded-xl bg-[#a5d391] text-black text-xs font-bold hover:bg-white transition-all cursor-pointer flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">videocam</span> Join Room
                                    </a>
                                )}
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
