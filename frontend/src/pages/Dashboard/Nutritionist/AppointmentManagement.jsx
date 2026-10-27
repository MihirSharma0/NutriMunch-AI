import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../../api/axios';
import { getConsultationOutcome, isHistoryOutcome, OUTCOME_BADGES, describePayment } from '../../../utils/consultationHistory';

const AppointmentManagement = () => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('All Months');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
    const [notification, setNotification] = useState(null);
    
    const [eventsList, setEventsList] = useState([]);
    const [clientsList, setClientsList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Consultation Chat Modal
    // Consultation History (finished sessions)
    const [historyFilter, setHistoryFilter] = useState('ALL');
    const [historySearch, setHistorySearch] = useState('');
    const location = useLocation();
    useEffect(() => {
        if (location.hash !== '#consultation-history' || loading) return;
        const el = document.getElementById('consultation-history');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [location.hash, loading]);

    const handleOpenChatFromAppointment = () => {
        const appointmentId = selectedEvent?.id;
        if (appointmentId) navigate(`/consultation-chat?appointmentId=${encodeURIComponent(appointmentId)}`);
    };

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

        const handleAppointmentUpdated = (e) => {
            if (!e?.detail) return;
            const eventData = e.detail;
            if (eventData.action === 'DELETED') {
                const delId = String(eventData.appointmentId);
                setEventsList(prev => prev.filter(ev => String(ev.id) !== delId));
                if (selectedEvent && String(selectedEvent.id) === delId) {
                    setSelectedEvent(null);
                }
                return;
            }
            if (eventData.appointment) {
                const updatedApt = eventData.appointment;
                setEventsList(prev => {
                    const exists = prev.some(ev => String(ev.id) === String(updatedApt.id));
                    if (exists) {
                        return prev.map(ev => String(ev.id) === String(updatedApt.id) ? { ...ev, ...updatedApt } : ev);
                    }
                    return [updatedApt, ...prev];
                });
                if (selectedEvent && String(selectedEvent.id) === String(updatedApt.id)) {
                    setSelectedEvent(prev => ({ ...prev, ...updatedApt }));
                }
            }
        };

        window.addEventListener('appointment_updated', handleAppointmentUpdated);
        return () => {
            window.removeEventListener('appointment_updated', handleAppointmentUpdated);
        };
    }, [token, selectedEvent]);

    useEffect(() => {
        if (isAvailabilityModalOpen || selectedEvent) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isAvailabilityModalOpen, selectedEvent]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/appointments/me`, {
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
            const res = await fetch(`${API_BASE_URL}/admin/all-user-profiles`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
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
        if (viewMode === 'All Months') setViewMode('Month');
    };

    const handleNext = () => {
        const d = new Date(currentDate);
        if (viewMode === 'Day') d.setDate(d.getDate() + 1);
        else if (viewMode === 'Week') d.setDate(d.getDate() + 7);
        else d.setMonth(d.getMonth() + 1);
        setCurrentDate(d);
        if (viewMode === 'All Months') setViewMode('Month');
    };

    const handleConfirmEvent = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            let updated = null;
            try {
                const res = await fetch(`${API_BASE_URL}/appointments/${id}/status`, {
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
                    updated = await res.json();
                }
            } catch (err) {}

            setEventsList(prev => prev.map(ev => String(ev.id) === String(id) ? (updated || { ...ev, status: 'Confirmed' }) : ev));

            try {
                const localApts = JSON.parse(localStorage.getItem('nutrimunch_user_appointments') || '[]');
                const updatedLocal = localApts.map(a => String(a.id) === String(id) ? { ...a, status: 'Confirmed' } : a);
                localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(updatedLocal));
            } catch (e) {}

            if (selectedEvent && String(selectedEvent.id) === String(id)) setSelectedEvent(null);
            showToast('Appointment approved and confirmed!');
        } catch (err) {
            console.error('Failed to confirm appointment:', err);
            showToast('Error confirming appointment.');
        }
    };

    const handleDenyEvent = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            let updated = null;
            try {
                const res = await fetch(`${API_BASE_URL}/appointments/${id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        status: 'REJECTED',
                        notes: 'Consultation request denied by nutritionist.'
                    })
                });

                if (res.ok) {
                    updated = await res.json();
                }
            } catch (err) {}

            setEventsList(prev => prev.map(ev => String(ev.id) === String(id) ? (updated || { ...ev, status: 'REJECTED' }) : ev));

            try {
                const localApts = JSON.parse(localStorage.getItem('nutrimunch_user_appointments') || '[]');
                const updatedLocal = localApts.map(a => String(a.id) === String(id) ? { ...a, status: 'REJECTED' } : a);
                localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(updatedLocal));
            } catch (e) {}

            if (selectedEvent && String(selectedEvent.id) === String(id)) setSelectedEvent(null);
            showToast('Consultation request denied.');
        } catch (err) {
            console.error('Failed to deny appointment:', err);
            showToast('Error denying appointment.');
        }
    };

    const handleApproveCancellation = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            const res = await fetch(`${API_BASE_URL}/appointments/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'APPROVE_CANCELLATION_NO_REFUND',
                    notes: 'Cancellation approved by nutritionist. The session fee remains in the nutritionist wallet.'
                })
            });
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            const updated = await res.json();

            setEventsList(prev => prev.map(ev => String(ev.id) === String(id) ? updated : ev));

            try {
                const localApts = JSON.parse(localStorage.getItem('nutrimunch_user_appointments') || '[]');
                const updatedLocal = localApts.map(a => String(a.id) === String(id) ? updated : a);
                localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(updatedLocal));
            } catch (e) {}

            if (selectedEvent && String(selectedEvent.id) === String(id)) setSelectedEvent(null);
            showToast('Cancellation approved. The session fee remains in your wallet.');
        } catch (err) {
            console.error('Failed to approve cancellation:', err);
            showToast(err.message || 'Error approving cancellation.');
        }
    };

    const handleDeclineCancellation = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            const res = await fetch(`${API_BASE_URL}/appointments/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'DECLINE_CANCELLATION',
                    notes: 'Cancellation request declined by nutritionist; session remains confirmed.'
                })
            });
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            const updated = await res.json();

            setEventsList(prev => prev.map(ev => String(ev.id) === String(id) ? updated : ev));

            try {
                const localApts = JSON.parse(localStorage.getItem('nutrimunch_user_appointments') || '[]');
                const updatedLocal = localApts.map(a => String(a.id) === String(id) ? updated : a);
                localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(updatedLocal));
            } catch (e) {}

            if (selectedEvent && String(selectedEvent.id) === String(id)) setSelectedEvent(null);
            showToast('Cancellation request declined. Session remains confirmed.');
        } catch (err) {
            console.error('Failed to decline cancellation:', err);
            showToast(err.message || 'Error declining cancellation.');
        }
    };

    const handleCancelEvent = async (id, e) => {
        if (e) e.stopPropagation();
        const appointment = eventsList.find(event => String(event.id) === String(id));
        if (!appointment) {
            showToast('Appointment not found in the current schedule.');
            return;
        }
        const status = String(appointment.status || '').toUpperCase();
        if (!['CONFIRMED', 'ACCEPTED', 'APPROVED', 'SCHEDULED', 'CANCELLATION_REQUESTED'].includes(status)) {
            showToast('Only confirmed appointments can be cancelled here.');
            return;
        }
        if (!window.confirm('Cancel this confirmed session? The consultation fee will be refunded to the client.')) return;

        try {
            const res = await fetch(`${API_BASE_URL}/appointments/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'CANCELLED_BY_NUTRITIONIST',
                    notes: 'Cancelled by nutritionist after confirmation. The consultation fee was refunded.'
                })
            });
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            const updated = await res.json();
            setEventsList(current => current.map(event => String(event.id) === String(id) ? updated : event));
            try {
                const cachedAppointments = JSON.parse(localStorage.getItem('nutrimunch_user_appointments') || '[]');
                localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(
                    cachedAppointments.map(event => String(event.id) === String(id) ? updated : event)
                ));
            } catch (storageError) {
                console.warn('Unable to update cached appointment history', storageError);
            }
            if (selectedEvent && String(selectedEvent.id) === String(id)) setSelectedEvent(null);
            showToast('Session cancelled. The consultation fee was refunded to the client.');
        } catch (err) {
            console.error('Failed to cancel appointment:', err);
            showToast(err.message || 'Error cancelling appointment.');
        }
    };

    const handleDeleteCancelledAppointment = async (id, e) => {
        e?.stopPropagation();
        const appointment = eventsList.find(event => String(event.id) === String(id));
        if (!['CANCELLED', 'CANCELLED_BY_NUTRITIONIST'].includes(String(appointment?.status || '').toUpperCase())) {
            showToast('Only cancelled bookings can be deleted.');
            return;
        }
        if (!window.confirm('Delete this cancelled booking from the schedule and history?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok && response.status !== 204) {
                throw new Error(`Request failed (${response.status})`);
            }

            setEventsList(current => current.filter(event => String(event.id) !== String(id)));
            if (selectedEvent && String(selectedEvent.id) === String(id)) setSelectedEvent(null);
            try {
                const cachedAppointments = JSON.parse(localStorage.getItem('nutrimunch_user_appointments') || '[]');
                localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(
                    cachedAppointments.filter(event => String(event.id) !== String(id))
                ));
            } catch (storageError) {
                console.warn('Unable to update cached appointment history', storageError);
            }
            showToast('Cancelled booking deleted.');
        } catch (error) {
            console.error('Failed to delete cancelled booking:', error);
            showToast(error.message || 'Unable to delete the cancelled booking.');
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

            const res = await fetch(`${API_BASE_URL}/appointments/book`, {
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
        if (isNaN(d.getTime())) return timeStr;
        return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Calculate Counts across all months
    const pendingCount = eventsList.filter(ev => {
        const s = String(ev.status || '').toUpperCase();
        return s.includes('PENDING') || s.includes('REQUEST');
    }).length;
    const confirmedCount = eventsList.filter(ev => {
        const st = String(ev.status || '').toUpperCase();
        return st.includes('CONFIRM') || st.includes('APPROVED') || st.includes('SCHEDULED');
    }).length;
    const cancelledCount = eventsList.filter(ev => String(ev.status || '').toUpperCase().includes('CANCEL')).length;

    // Filter Events by ViewMode and StatusFilter
    const filteredEvents = eventsList.filter(event => {
        const st = String(event.status || '').toUpperCase();
        if (statusFilter === 'PENDING' && !st.includes('PENDING') && !st.includes('REQUEST')) return false;
        if (statusFilter === 'CONFIRMED' && !st.includes('CONFIRM') && !st.includes('APPROVED') && !st.includes('SCHEDULED')) return false;
        if (statusFilter === 'CANCELLED' && !st.includes('CANCEL')) return false;

        if (viewMode === 'All Months') return true;

        if (!event.appointmentTime) return true;
        const apptDate = new Date(event.appointmentTime);
        if (isNaN(apptDate.getTime())) return true;

        if (viewMode === 'Month') {
            return apptDate.getMonth() === currentDate.getMonth() && apptDate.getFullYear() === currentDate.getFullYear();
        }
        if (viewMode === 'Day') {
            return apptDate.toDateString() === currentDate.toDateString();
        }
        if (viewMode === 'Week') {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            return apptDate >= startOfWeek && apptDate <= endOfWeek;
        }
        return true;
    });

    const historyItems = eventsList
        .map(ev => ({ ev, outcome: getConsultationOutcome(ev) }))
        .filter(({ outcome }) => isHistoryOutcome(outcome))
        .sort((a, b) => new Date(b.ev.appointmentTime) - new Date(a.ev.appointmentTime));
    const historyCount = (key) => key === 'ALL'
        ? historyItems.length
        : historyItems.filter(h => h.outcome === key || (key === 'CANCELLED' && h.outcome === 'NUTRITIONIST_CANCELLED')).length;
    const visibleHistory = historyItems.filter(({ ev, outcome }) => {
        if (historyFilter !== 'ALL' && outcome !== historyFilter
                && !(historyFilter === 'CANCELLED' && outcome === 'NUTRITIONIST_CANCELLED')) return false;
        const q = historySearch.trim().toLowerCase();
        return !q || String(ev.userName || '').toLowerCase().includes(q) || String(ev.title || '').toLowerCase().includes(q);
    });

    const openChatWithPatient = (ev) => {
        if (ev?.id) navigate(`/consultation-chat?appointmentId=${encodeURIComponent(ev.id)}`);
    };

    return (
        <div className="w-full relative space-y-6">

            {/* Toast Notification */}
            {notification && (
                <div className="fixed top-24 right-8 z-50 bg-[#a5d391] text-[#080b12] px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl flex items-center gap-2 animate-bounce">
                    <span className="material-symbols-outlined">event_available</span>
                    {notification}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white mb-1">Clinical Schedule & Bookings</h1>
                    <p className="text-white/50 text-xs sm:text-sm">Manage consultation slots, client bookings, and clinical calendar hours across all months.</p>
                </div>
                <button 
                    onClick={() => setIsAvailabilityModalOpen(true)}
                    className="bg-[#a5d391] text-black font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer shrink-0 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    Add Booking Slot
                </button>
            </div>

            {/* Pending Requests Alert Banner */}
            {pendingCount > 0 && statusFilter !== 'PENDING' && (
                <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                            <span className="material-symbols-outlined text-lg animate-pulse">pending_actions</span>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-amber-300">Action Required: {pendingCount} Pending Patient Booking Request{pendingCount > 1 ? 's' : ''}</div>
                            <p className="text-[11px] text-white/70">Patients have submitted consultation requests across months awaiting your clinical approval.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => { setStatusFilter('PENDING'); setViewMode('All Months'); }}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-[#080b12] text-xs font-bold hover:bg-white transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-md"
                    >
                        Review Pending ({pendingCount})
                    </button>
                </div>
            )}

            {/* Calendar & Schedule Container */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                
                {/* Navigation & Controls Header */}
                <div className="p-6 border-b border-white/10 flex flex-wrap justify-between items-center gap-4 bg-[#080b12]/80">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handlePrev}
                            title="Previous Period"
                            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-white cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <div>
                            <h2 className="text-xl font-bold font-hero-display text-white whitespace-nowrap">
                                {viewMode === 'All Months' ? 'All Months Schedule & Requests' : monthYearString}
                            </h2>
                            <div className="text-[10px] text-[#a5d391] font-semibold">
                                {viewMode === 'All Months' ? `Showing all ${eventsList.length} total consultation records` : `Viewing ${viewMode} view mode`}
                            </div>
                        </div>
                        <button 
                            onClick={handleNext}
                            title="Next Period"
                            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-white cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>

                    {/* View Mode Switcher */}
                    <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10 flex-wrap">
                        {['All Months', 'Month', 'Week', 'Day'].map(mode => (
                            <button 
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === mode ? 'bg-[#a5d391] text-black shadow-md' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Status Filter Tabs */}
                <div className="px-6 py-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-2 overflow-x-auto">
                    <button
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${statusFilter === 'ALL' ? 'bg-white/20 text-white border border-white/30' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        <span>All Bookings</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10">{eventsList.length}</span>
                    </button>

                    <button
                        onClick={() => setStatusFilter('PENDING')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${statusFilter === 'PENDING' ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'}`}
                    >
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        <span>Pending Review</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-black">{pendingCount}</span>
                    </button>

                    <button
                        onClick={() => setStatusFilter('CONFIRMED')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${statusFilter === 'CONFIRMED' ? 'bg-[#a5d391]/30 text-[#a5d391] border border-[#a5d391]/40' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        <span>Confirmed & Scheduled</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#a5d391]/20 text-[#a5d391] font-bold">{confirmedCount}</span>
                    </button>

                    <button
                        onClick={() => setStatusFilter('CANCELLED')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${statusFilter === 'CANCELLED' ? 'bg-red-500/30 text-red-300 border border-red-500/40' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        <span>Cancelled</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-300">{cancelledCount}</span>
                    </button>
                </div>

                {/* Active Appointments List View */}
                <div className="p-6 sm:p-8 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-bold uppercase tracking-widest text-[#a5d391] flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">event</span>
                            {viewMode === 'All Months' ? 'All Scheduled Sessions & Patient Requests' : `Sessions for ${monthYearString}`} ({filteredEvents.length})
                        </div>
                        {viewMode !== 'All Months' && (
                            <button 
                                onClick={() => setViewMode('All Months')}
                                className="text-xs font-bold text-white/50 hover:text-[#a5d391] underline transition-colors cursor-pointer"
                            >
                                View All Months
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="py-12 text-center text-white/50 text-sm">Loading clinical schedule...</div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="py-12 text-center text-white/40 text-xs bg-black/20 rounded-2xl border border-white/5 space-y-2">
                            <span className="material-symbols-outlined text-3xl text-white/20 block mx-auto">calendar_today</span>
                            <p>No consultation sessions found for this filter or month.</p>
                            <button 
                                onClick={() => { setViewMode('All Months'); setStatusFilter('ALL'); }}
                                className="mt-2 px-4 py-1.5 rounded-full bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-all inline-block"
                            >
                                Show All Months & Bookings
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredEvents.map(event => {
                                const st = String(event.status || '').toUpperCase();
                                const isCancelRequested = st === 'CANCELLATION_REQUESTED';
                                const isPending = !isCancelRequested && (st.includes('REQUEST') || st.includes('PENDING') || event.status === 'Pending Review');
                                const isCancelled = st === 'CANCELLED' || st === 'CANCELLED_BY_NUTRITIONIST';
                                const isRejected = st === 'REJECTED';

                                return (
                                    <div 
                                        key={event.id}
                                        onClick={() => setSelectedEvent(event)}
                                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                                            isCancelRequested
                                                ? 'bg-amber-500/15 border-amber-500/50 hover:border-amber-400 shadow-lg'
                                                : isPending 
                                                ? 'bg-amber-500/10 border-amber-500/40 hover:border-amber-500/70 shadow-lg' 
                                                : isCancelled || isRejected
                                                ? 'bg-red-500/10 border-red-500/20' 
                                                : 'bg-white/5 border-white/10 hover:border-[#a5d391]/40'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                                        isCancelRequested
                                                            ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 animate-pulse'
                                                            : isPending 
                                                            ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 animate-pulse' 
                                                            : isCancelled 
                                                            ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                                                            : isRejected
                                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                            : 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30'
                                                    }`}>
                                                        {isCancelRequested ? 'Cancel Requested' : st === 'CANCELLED_BY_NUTRITIONIST' ? 'Cancelled by Nutritionist · Refunded' : isPending ? 'Requested' : (event.status || 'Scheduled')}
                                                    </span>
                                                </div>
                                                <h3 className="text-base font-bold text-white mt-2 group-hover:text-[#a5d391] transition-colors">{event.title || 'Clinical Consultation'}</h3>
                                                <div className="text-xs text-white/60 font-semibold">{event.userName || 'Patient'} • {event.sessionType || 'Consultation'}</div>
                                            </div>
                                            <span className="material-symbols-outlined text-white/30 group-hover:text-white transition-colors">info</span>
                                        </div>

                                        <div className="space-y-3 pt-3 border-t border-white/5">
                                            <div className="flex justify-between items-center text-xs text-white/50">
                                                <div className="flex items-center gap-1.5 text-white/90 font-bold">
                                                    <span className="material-symbols-outlined text-base text-[#a5d391]">event</span>
                                                    {formatApptTime(event.appointmentTime)}
                                                </div>
                                            </div>

                                            {/* Action Buttons: If Requested/Pending, show Approve and Deny directly */}
                                            {isPending ? (
                                                <div className="flex items-center gap-2 pt-1">
                                                    <button 
                                                        onClick={(e) => handleConfirmEvent(event.id, e)}
                                                        className="flex-1 py-2 rounded-xl bg-[#a5d391] text-[#080b12] font-bold text-xs hover:bg-white transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                                        Approve
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleDenyEvent(event.id, e)}
                                                        className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">cancel</span>
                                                        Deny
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-right text-[#a5d391] font-bold text-[11px] group-hover:underline">
                                                        View Details & Notes →
                                                    </span>
                                                    {isCancelled && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDeleteCancelledAppointment(event.id, e)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-bold text-red-300 transition hover:bg-red-500 hover:text-white"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">delete</span>
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Consultation History: finished sessions with outcome, payment and quick actions */}
            <div id="consultation-history" className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl scroll-mt-28">
                <div className="p-6 border-b border-white/10 bg-[#080b12]/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold font-hero-display text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#a5d391]">history</span>
                            Consultation History ({historyItems.length})
                        </h2>
                        <p className="text-white/50 text-xs mt-1">Completed, cancelled, declined and expired sessions with your patients.</p>
                    </div>
                    <div className="relative lg:w-64">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg">search</span>
                        <input
                            type="text"
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            placeholder="Search patient or topic"
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder:text-white/40 outline-none focus:border-[#a5d391]/50"
                        />
                    </div>
                </div>

                <div className="px-6 py-3 border-b border-white/5 flex items-center gap-2 overflow-x-auto">
                    {[
                        { key: 'ALL', label: 'All' },
                        { key: 'COMPLETED', label: 'Completed' },
                        { key: 'CANCELLED', label: 'Cancelled' },
                        { key: 'DECLINED', label: 'Declined' },
                        { key: 'EXPIRED', label: 'Expired Requests' }
                    ].map(f => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setHistoryFilter(f.key)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${historyFilter === f.key ? 'bg-[#a5d391] text-black shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                            {f.label}
                            <span className={`px-1.5 rounded-full text-[10px] ${historyFilter === f.key ? 'bg-black/15' : 'bg-white/10'}`}>{historyCount(f.key)}</span>
                        </button>
                    ))}
                </div>

                {visibleHistory.length === 0 ? (
                    <div className="py-12 text-center text-white/40 text-xs space-y-2">
                        <span className="material-symbols-outlined text-3xl text-white/20 block">history</span>
                        <p>{historyItems.length === 0 ? 'No past consultations yet. Finished sessions will appear here.' : 'No consultations match this filter.'}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {visibleHistory.map(({ ev, outcome }) => {
                            const badge = OUTCOME_BADGES[outcome];
                            const payment = describePayment(ev);
                            return (
                                <div key={ev.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-[#a5d391]/15 text-[#a5d391] flex items-center justify-center font-bold text-xs shrink-0">
                                            {String(ev.userName || 'P').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{ev.userName || 'Patient'} <span className="text-white/40 font-normal">· {ev.title || 'Clinical Consultation'}</span></div>
                                            <div className="text-xs text-white/50 flex items-center gap-1.5 flex-wrap">
                                                <span>{formatApptTime(ev.appointmentTime)}</span>
                                                <span>•</span>
                                                <span>{ev.sessionType || 'Consultation'}</span>
                                                {payment && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-white/70">₹{payment.amount.toFixed(2)}{payment.state ? ` ${payment.state}` : ''}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${badge.style}`}>
                                            <span className="material-symbols-outlined text-xs">{badge.icon}</span>
                                            {badge.label}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedEvent(ev)}
                                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-bold cursor-pointer"
                                        >
                                            Details
                                        </button>
                                        {ev.userId && (
                                            <button
                                                type="button"
                                                onClick={() => openChatWithPatient(ev)}
                                                className="px-3 py-1.5 rounded-xl bg-[#a5d391]/15 hover:bg-[#a5d391]/25 border border-[#a5d391]/30 text-[#a5d391] text-xs font-bold cursor-pointer flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-sm">chat</span>
                                                Message
                                            </button>
                                        )}
                                        {(outcome === 'CANCELLED' || outcome === 'NUTRITIONIST_CANCELLED') && (
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteCancelledAppointment(ev.id, e)}
                                                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-300 hover:text-white text-xs font-bold cursor-pointer flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal: Event Session Details & Complete Patient Profile Dossier */}
            {selectedEvent && (() => {
                const patient = clientsList.find(c => 
                    (selectedEvent.userId && String(c.userId || c.id) === String(selectedEvent.userId)) ||
                    (selectedEvent.userEmail && c.email?.toLowerCase() === selectedEvent.userEmail?.toLowerCase())
                ) || {};

                return (
                    <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-8 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                        <div className="bg-[#080b12] border border-white/20 rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full relative shadow-2xl space-y-6 max-h-[88vh] overflow-y-auto my-auto">
                            
                            {/* Modal Header */}
                            <div className="flex justify-between items-start border-b border-white/10 pb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedEvent.status === 'Pending Review' || selectedEvent.status === 'PENDING' || String(selectedEvent.status || '').toUpperCase().includes('REQUEST') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : String(selectedEvent.status || '').toUpperCase() === 'CANCELLED_BY_NUTRITIONIST' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : String(selectedEvent.status || '').toUpperCase() === 'CANCELLED' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30'}`}>
                                            {String(selectedEvent.status || '').toUpperCase() === 'CANCELLED_BY_NUTRITIONIST' ? 'Cancelled by Nutritionist · Refunded' : String(selectedEvent.status || '').toUpperCase().includes('REQUEST') ? 'Requested' : (selectedEvent.status || 'Scheduled')}
                                        </span>
                                        <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">ID: #{selectedEvent.id}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold font-hero-display text-white">{selectedEvent.title || 'Clinical Consultation'}</h3>
                                    <p className="text-xs text-[#a5d391] font-bold mt-1 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm">person</span>
                                        {patient.firstName ? `${patient.firstName} ${patient.lastName || ''}` : selectedEvent.userName} 
                                        <span className="text-white/40 font-normal">({selectedEvent.userEmail || patient.email})</span>
                                    </p>
                                </div>
                                <button onClick={() => setSelectedEvent(null)} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Session Timing */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                                <span className="material-symbols-outlined text-2xl text-[#a5d391]">event_available</span>
                                <div>
                                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Scheduled Date & Time</div>
                                    <div className="text-sm font-bold text-white">{formatApptTime(selectedEvent.appointmentTime)}</div>
                                </div>
                            </div>

                            {/* Patient Profile Information Filled by User */}
                            <div className="space-y-4 pt-2 border-t border-white/10">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-[#a5d391] uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-base">clinical_notes</span>
                                        Patient Profile Dossier (Filled by User)
                                    </h4>
                                    <span className="text-[10px] text-white/40 font-semibold">Synced from User Account</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Biometrics */}
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                                        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs text-[#a5d391]">monitor_weight</span>
                                            Biometrics & Physical Markers
                                        </div>
                                        <div className="space-y-1 text-xs text-white">
                                            <div className="flex justify-between"><span className="text-white/50">Age & Gender:</span> <span className="font-bold">{patient.age ? `${patient.age} yrs` : '28 yrs'} • {patient.gender || 'Not Specified'}</span></div>
                                            <div className="flex justify-between"><span className="text-white/50">Height / Weight:</span> <span className="font-bold">{patient.heightCm ? `${patient.heightCm} cm` : 'Not Logged'} • {patient.weightKg ? `${patient.weightKg} kg` : 'Not Logged'}</span></div>
                                            <div className="flex justify-between"><span className="text-white/50">Target Weight:</span> <span className="font-bold text-[#a5d391]">{patient.targetWeightKg ? `${patient.targetWeightKg} kg` : 'Maintain Baseline'}</span></div>
                                            <div className="flex justify-between"><span className="text-white/50">BMR / TDEE:</span> <span className="font-bold">{patient.bmr ? `${Math.round(patient.bmr)} kcal` : 'Calibrated'} / {patient.tdee ? `${Math.round(patient.tdee)} kcal` : 'Active'}</span></div>
                                        </div>
                                    </div>

                                    {/* Goals & Diet Protocol */}
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                                        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs text-[#a5d391]">flag</span>
                                            Health Goals & Diet Protocol
                                        </div>
                                        <div className="space-y-1 text-xs text-white">
                                            <div className="flex justify-between"><span className="text-white/50">Primary Goal:</span> <span className="font-bold text-right truncate max-w-[140px]">{patient.goal || 'General Health & Nutrition'}</span></div>
                                            <div className="flex justify-between"><span className="text-white/50">Diet Protocol:</span> <span className="font-bold">{patient.dietType || patient.dietaryPreferences || 'Standard Balanced'}</span></div>
                                            <div className="flex justify-between"><span className="text-white/50">Activity Level:</span> <span className="font-bold">{patient.activityLevel || 'Moderate Active'}</span></div>
                                            <div className="flex justify-between"><span className="text-white/50">Meal Budget:</span> <span className="font-bold">{patient.mealBudget || 'Affordable Tier'}</span></div>
                                        </div>
                                    </div>

                                    {/* Allergies & Preferences */}
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                                        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs text-amber-400">warning</span>
                                            Allergies & Preferences
                                        </div>
                                        <div className="space-y-1 text-xs text-white">
                                            <div><span className="text-white/50">Allergies:</span> <span className="font-bold text-amber-300">{patient.allergies || 'None Logged'}</span></div>
                                            <div><span className="text-white/50">Favorite Foods:</span> <span className="font-semibold text-white/80">{patient.favoriteFoods || 'Standard preference'}</span></div>
                                            <div><span className="text-white/50">Disliked Foods:</span> <span className="font-semibold text-white/80">{patient.dislikedFoods || 'None specified'}</span></div>
                                        </div>
                                    </div>

                                    {/* Calorie & Macro Targets */}
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                                        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs text-[#a5d391]">pie_chart</span>
                                            Calorie & Macro Distribution
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs text-white">
                                            <div className="bg-black/40 rounded-xl p-2"><div className="text-[9px] text-white/40">CALORIES</div><div className="font-bold text-[#a5d391]">{patient.dailyCaloriesTarget ? `${patient.dailyCaloriesTarget} kcal` : '2,000 kcal'}</div></div>
                                            <div className="bg-black/40 rounded-xl p-2"><div className="text-[9px] text-white/40">PROTEIN</div><div className="font-bold">{patient.proteinTarget ? `${patient.proteinTarget}g` : '140g'}</div></div>
                                            <div className="bg-black/40 rounded-xl p-2"><div className="text-[9px] text-white/40">CARBS</div><div className="font-bold">{patient.carbsTarget ? `${patient.carbsTarget}g` : '180g'}</div></div>
                                            <div className="bg-black/40 rounded-xl p-2"><div className="text-[9px] text-white/40">HYDRATION</div><div className="font-bold text-cyan-300">{patient.dailyWaterTargetLiters ? `${patient.dailyWaterTargetLiters} L` : '3.0 L'}</div></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Clinical Context & Notes */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs text-[#a5d391]">notes</span>
                                        Consultation Notes & Goal
                                    </div>
                                    <p className="text-xs text-white/90 leading-relaxed italic">
                                        {selectedEvent.notes ? `"${selectedEvent.notes}"` : 'No custom consultation notes provided.'}
                                    </p>
                                </div>

                                {/* Consultation Chat Box */}
                                <div className="bg-[#a5d391]/10 border border-[#a5d391]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="space-y-0.5">
                                        <div className="text-xs font-bold text-[#a5d391] flex items-center gap-1.5 uppercase tracking-widest">
                                            <span className="material-symbols-outlined text-base">forum</span>
                                            <span>Clinical Consultation Chat</span>
                                        </div>
                                        <p className="text-[11px] text-white/60">Initiate live two-way consultation messaging directly with this patient.</p>
                                    </div>

                                    <button 
                                        type="button"
                                        onClick={handleOpenChatFromAppointment}
                                        className="px-4 py-2.5 rounded-xl bg-[#a5d391] hover:bg-white text-black font-bold text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5 shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-sm">chat</span>
                                        <span>Open Consultation Chat</span>
                                    </button>
                                </div>
                            </div>

                            {/* Modal Footer Buttons */}
                            <div className="flex flex-col gap-3 pt-3 border-t border-white/10 w-full">
                                {String(selectedEvent.status || '').toUpperCase() === 'CANCELLATION_REQUESTED' ? (
                                    <div className="w-full space-y-3">
                                        <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-4 flex items-start gap-3 shadow-md">
                                            <span className="material-symbols-outlined text-amber-400 text-2xl mt-0.5">report_problem</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                                                    Patient Cancellation Request
                                                </div>
                                                <p className="text-xs text-white/80 mt-1">
                                                    The patient has requested to cancel this confirmed consultation session.
                                                </p>
                                                <div className="mt-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-200 font-semibold flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-amber-400 text-base">info</span>
                                                    <span>If approved, the session ends and the fee remains in your wallet. If declined, the session remains confirmed. The request itself does not move funds.</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap justify-between items-center gap-3">
                                            <button 
                                                onClick={(e) => handleApproveCancellation(selectedEvent.id, e)}
                                                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                                                title="Cancel the session while leaving the fee in your wallet"
                                            >
                                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                                Approve Cancellation
                                            </button>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={(e) => handleDeclineCancellation(selectedEvent.id, e)}
                                                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                    Decline Request
                                                </button>
                                                <button 
                                                    onClick={() => setSelectedEvent(null)}
                                                    className="px-5 py-2.5 rounded-xl bg-white/5 text-white/60 hover:text-white text-xs font-bold transition-all cursor-pointer"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (String(selectedEvent.status || '').toUpperCase() === 'REQUESTED' || (String(selectedEvent.status || '').toUpperCase().includes('REQUEST') && String(selectedEvent.status || '').toUpperCase() !== 'CANCELLATION_REQUESTED') || String(selectedEvent.status || '').toUpperCase().includes('PENDING') || selectedEvent.status === 'Pending Review') ? (
                                    <div className="flex flex-wrap justify-between items-center gap-3 w-full">
                                        <button 
                                            onClick={(e) => handleDenyEvent(selectedEvent.id, e)}
                                            className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-sm">cancel</span>
                                            Deny
                                        </button>

                                        <div className="flex gap-2">
                                            <button 
                                                onClick={(e) => handleConfirmEvent(selectedEvent.id, e)}
                                                className="px-5 py-2.5 rounded-xl bg-[#a5d391] text-black text-xs font-bold hover:bg-white transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                                            >
                                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                                Approve
                                            </button>
                                            <button 
                                                onClick={() => setSelectedEvent(null)}
                                                className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all cursor-pointer"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                ) : ['CANCELLED', 'CANCELLED_BY_NUTRITIONIST'].includes(String(selectedEvent.status || '').toUpperCase()) ? (
                                    <div className="flex flex-wrap justify-between items-center gap-3 w-full">
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteCancelledAppointment(selectedEvent.id, e)}
                                            className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-bold hover:bg-red-500 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                            Delete Cancelled Booking
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedEvent(null)}
                                            className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all cursor-pointer"
                                        >
                                            Close
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap justify-between items-center gap-3 w-full">
                                        <button 
                                            onClick={(e) => handleCancelEvent(selectedEvent.id, e)}
                                            className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                                        >
                                            Cancel Session
                                        </button>

                                        <div className="flex gap-2">
                                            {(selectedEvent.status === 'SCHEDULED' || (selectedEvent.status || '').toUpperCase() === 'CONFIRMED') && (
                                                <Link 
                                                    to="/virtual-room"
                                                    className="px-5 py-2.5 rounded-xl bg-[#a5d391] text-black text-xs font-bold hover:bg-white transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                                                >
                                                    <span className="material-symbols-outlined text-sm">videocam</span>
                                                    Join Session
                                                </Link>
                                            )}
                                            <button 
                                                onClick={() => setSelectedEvent(null)}
                                                className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all cursor-pointer"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal: Add Booking Slot */}
            {isAvailabilityModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-8 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    <div className="bg-[#080b12] border border-white/20 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full relative shadow-2xl space-y-6 max-h-[80vh] overflow-y-auto my-auto">
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
