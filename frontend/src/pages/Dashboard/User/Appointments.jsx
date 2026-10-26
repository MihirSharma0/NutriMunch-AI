import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';
import api, { API_BASE_URL } from '../../../api/axios';
import { subscribeWalletSse } from '../../../utils/walletSse';
import { getConsultationOutcome, describePayment } from '../../../utils/consultationHistory';

const Appointments = () => {
    const navigate = useNavigate();
    const { user, token } = useContext(AuthContext);
    const [appointments, setAppointments] = useState([]);
    const [nutritionists, setNutritionists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [notification, setNotification] = useState(null);
    const [historyFilter, setHistoryFilter] = useState('ALL');

    // App Wallet & "Low Balance" Guard State - Strictly Isolated by Account ID & Email
    const resolveInitialWalletBalance = () => {
        try {
            const userKeyId = user?.id || user?.userId;
            const userKeyEmail = user?.email?.toLowerCase();
            if (!userKeyId && !userKeyEmail) return 0;

            const keysToCheck = [
                userKeyId ? `nutrimunch_wallet_balance_id_${userKeyId}` : null,
                userKeyId ? `nutrimunch_wallet_balance_${userKeyId}` : null,
                userKeyEmail ? `nutrimunch_wallet_balance_email_${userKeyEmail}` : null,
                userKeyEmail ? `nutrimunch_wallet_balance_${userKeyEmail}` : null
            ].filter(Boolean);

            let maxBal = 0;
            for (const k of keysToCheck) {
                const val = localStorage.getItem(k);
                if (val !== null && !isNaN(Number(val))) {
                    maxBal = Math.max(maxBal, Number(val));
                }
            }
            return maxBal;
        } catch (e) {
            return 0;
        }
    };

    const [wallet, setWallet] = useState(() => ({ balance: resolveInitialWalletBalance(), currency: 'INR' }));
    const [walletLoading, setWalletLoading] = useState(false);
    const [sessionFee, setSessionFee] = useState(500);
    const [isPayingWithWallet, setIsPayingWithWallet] = useState(false);
    const [guardBlockedModal, setGuardBlockedModal] = useState(null);
    const [cancelPromptModal, setCancelPromptModal] = useState({ open: false, appointmentId: null });
    const [selectedCardId, setSelectedCardId] = useState(null);

    const [bookingForm, setBookingForm] = useState({
        nutritionistId: '',
        title: 'Metabolic Baseline Review',
        sessionType: 'Clinical Consultation',
        date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days from now
        time: '14:00',
        notes: ''
    });

    const fetchWallet = async () => {
        try {
            setWalletLoading(true);
            const userKeyId = user?.id || user?.userId;
            const userKeyEmail = user?.email?.toLowerCase();

            if (!userKeyId && !userKeyEmail) {
                setWallet({ balance: 0, currency: 'INR' });
                return;
            }

            const res = await api.get('/wallet/me', {
                params: {
                    userId: userKeyId || '',
                    email: userKeyEmail || ''
                }
            });

            const cachedBal = resolveInitialWalletBalance();

            if (res.data && typeof res.data.balance !== 'undefined' && res.data.balance !== null) {
                const sBal = Number(res.data.balance);
                setWallet({ ...res.data, balance: sBal });
                if (userKeyId) {
                    localStorage.setItem(`nutrimunch_wallet_balance_id_${userKeyId}`, String(sBal));
                    localStorage.setItem(`nutrimunch_wallet_balance_${userKeyId}`, String(sBal));
                }
                if (userKeyEmail) {
                    localStorage.setItem(`nutrimunch_wallet_balance_email_${userKeyEmail}`, String(sBal));
                    localStorage.setItem(`nutrimunch_wallet_balance_${userKeyEmail}`, String(sBal));
                }
                return;
            }
        } catch (err) {
            console.warn('Failed to fetch wallet info, using cached balance:', err);
        } finally {
            const fallbackBal = resolveInitialWalletBalance();
            setWallet(prev => ({
                ...(prev || {}),
                balance: (prev?.balance !== undefined) ? prev.balance : fallbackBal,
                currency: 'INR'
            }));
            setWalletLoading(false);
        }
    };

    // Deep link: /appointments#consultation-history scrolls straight to the history section
    const location = useLocation();
    useEffect(() => {
        if (location.hash !== '#consultation-history' || loading) return;
        const el = document.getElementById('consultation-history');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [location.hash, loading]);

    useEffect(() => {
        fetchAppointments();
        fetchNutritionists();
        fetchWallet();

        const handleWalletUpdated = (e) => {
            const myId = String(user?.id || user?.userId || '');
            const myEmail = (user?.email || user?.username || '').toLowerCase();

            if (e?.type === 'storage' && e?.key) {
                const key = e.key;
                if (!key.startsWith('nutrimunch_wallet_balance')) return;
                const matchesMe = (myId && key.includes(myId)) || (myEmail && key.includes(myEmail));
                if (!matchesMe) return;
                const val = localStorage.getItem(key);
                if (val !== null && !isNaN(Number(val))) {
                    setWallet(prev => ({ ...(prev || {}), balance: Number(val), currency: 'INR' }));
                    return;
                }
            }

            if (e?.detail) {
                const targetId = String(e.detail.recipientId || '');
                const targetEmail = (e.detail.recipientEmail || '').toLowerCase();
                const isForMe = (targetId && myId && targetId === myId) ||
                                (targetEmail && myEmail && targetEmail === myEmail) ||
                                (!targetId && !targetEmail);
                if (!isForMe) return;

                const pushedVal = e.detail.newBalance !== undefined && e.detail.newBalance !== null
                    ? e.detail.newBalance
                    : e.detail.balance;

                if (pushedVal !== undefined && pushedVal !== null) {
                    const newBal = Number(pushedVal);
                    setWallet(prev => ({ ...(prev || {}), balance: newBal, currency: 'INR' }));
                    if (myId) localStorage.setItem(`nutrimunch_wallet_balance_${myId}`, String(newBal));
                    if (myEmail) localStorage.setItem(`nutrimunch_wallet_balance_${myEmail}`, String(newBal));
                    return;
                }
            }
        };

        const handleAppointmentUpdated = (e) => {
            if (!e?.detail) return;
            const eventData = e.detail;
            if (eventData.action === 'DELETED') {
                const delId = String(eventData.appointmentId);
                setAppointments(prev => prev.filter(a => String(a.id) !== delId));
                if (selectedAppointment && String(selectedAppointment.id) === delId) {
                    setSelectedAppointment(null);
                }
                return;
            }
            if (eventData.appointment) {
                const updatedApt = normalizeAppointment(eventData.appointment);
                setAppointments(prev => {
                    const exists = prev.some(a => String(a.id) === String(updatedApt.id));
                    let next;
                    if (exists) {
                        next = prev.map(a => String(a.id) === String(updatedApt.id) ? { ...a, ...updatedApt } : a);
                    } else {
                        next = [updatedApt, ...prev];
                    }
                    try { localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(next)); } catch (e) {}
                    return next;
                });
                if (selectedAppointment && String(selectedAppointment.id) === String(updatedApt.id)) {
                    setSelectedAppointment(prev => ({ ...prev, ...updatedApt }));
                }
            }
        };

        window.addEventListener('wallet_update', handleWalletUpdated);
        window.addEventListener('wallet_updated', handleWalletUpdated);
        window.addEventListener('storage', handleWalletUpdated);
        window.addEventListener('appointment_updated', handleAppointmentUpdated);

        // Connect persistent SSE stream for live real-time wallet push
        const unsubscribeSse = subscribeWalletSse(user, (newBal, data) => {
            const numBal = Number(newBal);
            if (!isNaN(numBal)) {
                setWallet(prev => ({ ...(prev || {}), balance: numBal, currency: 'INR' }));
            }
        });

        let bc;
        try {
            bc = new BroadcastChannel('nutrimunch_clinical_channel');
            bc.onmessage = (event) => {
                if (event.data?.type === 'WALLET_CREDITED' || event.data?.type === 'WALLET_UPDATED') {
                    const targetId = String(event.data.recipientId || '');
                    const targetEmail = (event.data.recipientEmail || '').toLowerCase();
                    const myId = String(user?.id || user?.userId || '');
                    const myEmail = (user?.email || user?.username || '').toLowerCase();
                    const isForMe = (targetId && myId && targetId === myId) ||
                                    (targetEmail && myEmail && targetEmail === myEmail) ||
                                    (!targetId && !targetEmail);
                    if (!isForMe) return;

                    // Direct Push: Apply pushed balance immediately with zero server load
                    const pushedVal = event.data.newBalance !== undefined && event.data.newBalance !== null
                        ? event.data.newBalance
                        : event.data.balance;

                    if (pushedVal !== undefined && pushedVal !== null) {
                        const newBal = Number(pushedVal);
                        setWallet(prev => ({ ...(prev || {}), balance: newBal, currency: 'INR' }));
                        if (myId) localStorage.setItem(`nutrimunch_wallet_balance_${myId}`, String(newBal));
                        if (myEmail) localStorage.setItem(`nutrimunch_wallet_balance_${myEmail}`, String(newBal));
                    }
                }
            };
        } catch (e) {}

        return () => {
            if (unsubscribeSse) unsubscribeSse();
            window.removeEventListener('wallet_update', handleWalletUpdated);
            window.removeEventListener('wallet_updated', handleWalletUpdated);
            window.removeEventListener('storage', handleWalletUpdated);
            window.removeEventListener('appointment_updated', handleAppointmentUpdated);
            if (bc) bc.close();
        };
    }, [user, token, selectedAppointment]);

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


    // Helper to check if appointment status is confirmed/active
    const isConfirmedOrApproved = (st) => {
        const s = String(st || '').toUpperCase();
        return s === 'CONFIRMED' || s === 'ACCEPTED' || s === 'SCHEDULED' || s === 'APPROVED' || s === 'DECLINE_CANCELLATION';
    };

    // Helper to normalize any declined cancellations back to confirmed status with disclaimer notes
    const normalizeAppointment = (apt) => {
        if (!apt) return apt;
        const st = String(apt.status || '').toUpperCase();
        if (st === 'DECLINE_CANCELLATION' || st === 'REJECT_CANCELLATION') {
            return {
                ...apt,
                status: 'Confirmed',
                notes: apt.notes || 'Cancellation was declined by nutritionist; session remains confirmed.'
            };
        }
        return apt;
    };

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

    const primaryNutritionist = nutritionists.length > 0 ? nutritionists[0] : {
        name: 'Dr. Elena Rostova',
        email: 'elena.rostova@nutrimunch.ai',
        credentials: 'Certified Clinical Nutritionist',
        specialization: 'Algorithmic Biology & Metabolism'
    };

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const authToken = token || localStorage.getItem('token');
            const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

            let backendData = [];
            let backendOk = false;
            try {
                const res = await fetch(`${API_BASE_URL}/appointments/me`, { headers });
                if (res.ok) {
                    backendData = await res.json();
                    backendOk = Array.isArray(backendData);
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

            // The server is the source of truth for consultation history. The browser cache (per user)
            // is only used when the server can't be reached; old sample records are never shown.
            const cacheKey = `nutrimunch_user_appointments_${user?.id || user?.userId || user?.email || 'me'}`;
            let merged = [];
            if (backendOk) {
                merged = backendData;
                try { localStorage.setItem(cacheKey, JSON.stringify(backendData)); } catch (e) {}
            } else {
                try {
                    const cachedForUser = JSON.parse(localStorage.getItem(cacheKey) || '[]');
                    merged = Array.isArray(cachedForUser) ? cachedForUser : [];
                } catch (e) {}
            }
            merged = merged.filter(item => !String(item.id).startsWith('hist-'));
            if (storedLocal.some(item => String(item.id).startsWith('hist-'))) {
                try {
                    localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(storedLocal.filter(item => !String(item.id).startsWith('hist-'))));
                } catch (e) {}
            }

            const activeAppointments = merged
                .filter(item => !deletedIds.has(String(item.id)))
                .map(normalizeAppointment);
            activeAppointments.sort((a, b) => new Date(b.appointmentTime) - new Date(a.appointmentTime));
            setAppointments(activeAppointments);
        } catch (err) {
            console.error('Failed to fetch user appointments:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchNutritionists = async () => {
        try {
            const authToken = token || localStorage.getItem('token');
            const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
            const res = await fetch(`${API_BASE_URL}/appointments/nutritionists`, { headers });
            if (res.ok) {
                const data = await res.json();
                setNutritionists(data);
                if (data.length > 0) {
                    setBookingForm(prev => ({ ...prev, nutritionistId: data[0].id }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch nutritionists:', err);
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

            const chosenPrice = Number(sessionFee || 500);
            const chosenNutritionistId = bookingForm.nutritionistId ? Number(bookingForm.nutritionistId) : (nutritionists.length > 0 ? nutritionists[0].id : null);

            if (!chosenNutritionistId) {
                showToast('Please select a registered nutritionist.');
                return;
            }

            setIsPayingWithWallet(true);

            const appointmentTime = `${bookingForm.date}T${bookingForm.time}:00`;
            const payload = {
                nutritionistId: chosenNutritionistId,
                title: bookingForm.title,
                sessionType: bookingForm.sessionType,
                appointmentTime: appointmentTime,
                notes: bookingForm.notes,
                sessionFee: chosenPrice,
                status: 'Requested'
            };

            let newApt = null;
            try {
                const res = await api.post('/appointments/book', payload);
                newApt = res.data;
            } catch (err) {
                const status = err.response?.data?.status;
                const errData = err.response?.data;
                if (status === 'LOW_BALANCE' || err.response?.status === 400) {
                    setGuardBlockedModal({
                        status: 'LOW_BALANCE',
                        currentBalance: errData?.currentBalance !== undefined ? errData.currentBalance : wallet.balance,
                        requiredAmount: errData?.requiredAmount !== undefined ? errData.requiredAmount : chosenPrice,
                        deficit: errData?.deficit !== undefined ? errData.deficit : (chosenPrice - wallet.balance),
                        serviceName: `${bookingForm.sessionType}: ${bookingForm.title}`,
                        transactionReference: errData?.transactionReference || 'TXN-BLOCKED-GUARD'
                    });
                    if (errData?.currentBalance !== undefined) {
                        setWallet(prev => ({ ...(prev || {}), balance: Number(errData.currentBalance) }));
                    }
                    setIsPayingWithWallet(false);
                    return;
                }
                showToast(err.response?.data?.message || err.message || 'Appointment booking failed.');
                setIsPayingWithWallet(false);
                return;
            }

            // Booking and Escrow Hold succeeded!
            const newBal = Math.max(0, Number(wallet.balance || 0) - chosenPrice);
            setWallet(prev => ({
                ...prev,
                balance: newBal
            }));

            const updatedList = [newApt, ...appointments.filter(a => String(a.id) !== String(newApt.id))];
            setAppointments(updatedList);
            try {
                localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(updatedList));
            } catch (e) {}

            setIsBookingModalOpen(false);
            setBookingForm({
                nutritionistId: nutritionists.length > 0 ? nutritionists[0].id : '',
                title: 'Metabolic Baseline Review',
                sessionType: 'Clinical Consultation',
                date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
                time: '14:00',
                notes: ''
            });

            showToast(`₹${chosenPrice.toFixed(2)} placed in Escrow! Ref: ${newApt.escrowTransactionRef || 'ESCROW-HOLD'}`);
        } catch (err) {
            console.error('Error booking appointment:', err);
            showToast('Error booking appointment.');
        } finally {
            setIsPayingWithWallet(false);
        }
    };

    // Cancels an unconfirmed session or opens confirmation for an approved one.
    const handleCancelAppointment = async (id) => {
        const stringId = String(id);
        const appt = appointments.find(a => String(a.id) === stringId);
        const statusUpper = (appt?.status || '').toUpperCase();

        if (isConfirmedOrApproved(statusUpper)) {
            setCancelPromptModal({ open: true, appointmentId: id });
            return;
        }

        if (token && (typeof id === 'number' || !isNaN(Number(id)))) {
            try {
                const response = await api.put(`/appointments/${id}/status`, { status: 'CANCELLED' });
                if (response.data) {
                    setAppointments(prev => {
                        const updated = prev.map(a => String(a.id) === stringId ? { ...a, ...response.data } : a);
                        try { localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(updated)); } catch (e) {}
                        return updated;
                    });
                    if (selectedAppointment && String(selectedAppointment.id) === stringId) {
                        setSelectedAppointment(prev => prev ? { ...prev, ...response.data } : null);
                    }
                    if (String(response.data.status || '').toUpperCase() === 'CANCELLATION_REQUESTED') {
                        showToast('Your cancellation is pending nutritionist review.');
                        return;
                    }
                }
            } catch (error) {
                showToast(error.response?.data?.message || 'Unable to cancel this session. Please try again.');
                return;
            }
        } else {
            const updated = appointments.map(a => String(a.id) === stringId ? { ...a, status: 'CANCELLED' } : a);
            setAppointments(updated);
            try {
                localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(updated));
            } catch (e) {}
            if (selectedAppointment && String(selectedAppointment.id) === stringId) {
                setSelectedAppointment(prev => prev ? { ...prev, status: 'CANCELLED' } : null);
            }
        }

        showToast('Consultation session cancelled.');
    };

    // Confirmed sessions are sent to the nutritionist for cancellation review.
    const confirmCancelSession = async (id) => {
        const stringId = String(id);
        if (!token || (typeof id !== 'number' && isNaN(Number(id)))) {
            showToast('Unable to cancel this session. Please try again.');
            return;
        }

        try {
            const response = await api.post(`/appointments/${id}/request-cancel`, {
                reason: 'Client requested session cancellation.',
            });
            if (response.data) {
                setAppointments(prev => {
                    const updated = prev.map(a => String(a.id) === stringId ? { ...a, ...response.data } : a);
                    try { localStorage.setItem('nutrimunch_user_appointments', JSON.stringify(updated)); } catch (e) {}
                    return updated;
                });
                if (selectedAppointment && String(selectedAppointment.id) === stringId) {
                    setSelectedAppointment(prev => prev ? { ...prev, ...response.data } : null);
                }
            }
            setCancelPromptModal({ open: false, appointmentId: null });
            showToast('Your cancellation is pending nutritionist review.');
        } catch (error) {
            showToast(error.response?.data?.message || 'Unable to cancel this session. Please try again.');
        }
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

    const activeDisplayedAppointment = (selectedCardId ? appointments.find(a => String(a.id) === String(selectedCardId)) : null)
        || featuredUpcoming
        || (appointments.length > 0 ? appointments[0] : null);

    const deletableAppointmentsCount = appointments.filter(a => canDeleteAppointment(a)).length;
    const upcomingOrOngoingCount = appointments.filter(a => !isDatePassed(a.appointmentTime) && (a.status || '').toUpperCase() !== 'CANCELLED' && (a.status || '').toUpperCase() !== 'REJECTED').length;
    const completedCount = appointments.filter(a => getConsultationOutcome(a) === 'COMPLETED').length;
    const cancelledCount = appointments.filter(a => {
        const upper = (a.status || '').toUpperCase();
        return upper === 'CANCELLED' || upper === 'REJECTED';
    }).length;

    const filteredAppointments = appointments.filter(item => {
        const isPassed = isDatePassed(item.appointmentTime);
        const upper = (item.status || '').toUpperCase();
        if (historyFilter === 'UPCOMING') return !isPassed && upper !== 'CANCELLED' && upper !== 'REJECTED';
        if (historyFilter === 'COMPLETED') return getConsultationOutcome(item) === 'COMPLETED';
        if (historyFilter === 'CANCELLED') return upper === 'CANCELLED' || upper === 'REJECTED';
        return true;
    });

    const openBookingForNutritionist = (nutritionistId) => {
        setBookingForm(prev => ({ ...prev, nutritionistId }));
        const found = nutritionists.find(d => String(d.id) === String(nutritionistId));
        if (found && found.consultationFee) {
            const parsed = parseFloat(String(found.consultationFee).replace(/[^0-9.]/g, ''));
            if (!isNaN(parsed) && parsed > 0) {
                setSessionFee(parsed);
            }
        }
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
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Live Wallet Card with direct link to Transaction History */}
                    <Link
                        to="/transactions"
                        title="App Wallet Balance — Click to view Transaction History & Ledger"
                        className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#a5d391]/50 rounded-2xl px-4 py-2 flex items-center gap-3 backdrop-blur-md transition-all cursor-pointer group shadow-sm hover:shadow-[0_0_15px_rgba(165,211,145,0.15)]"
                    >
                        <div className="w-8 h-8 rounded-xl bg-[#a5d391]/20 group-hover:bg-[#a5d391]/30 flex items-center justify-center text-[#a5d391] transition-colors">
                            <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                        </div>
                        <div>
                            <div className="text-[10px] text-white/50 group-hover:text-white uppercase font-bold tracking-wider flex items-center gap-1 transition-colors">
                                App Wallet
                                <span className="material-symbols-outlined text-[12px] text-[#a5d391]">receipt_long</span>
                            </div>
                            <div className="text-sm font-bold font-mono text-[#a5d391]">
                                {walletLoading ? '...' : `₹${Number(wallet.balance || 0).toFixed(2)}`}
                            </div>
                        </div>
                    </Link>

                    <button
                        onClick={() => setIsBookingModalOpen(true)}
                        className="bg-[#a5d391] text-black font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">calendar_add_on</span>
                        Initialize Booking
                    </button>
                </div>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Left Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold font-hero-display text-white/70 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#a5d391]">stars</span>
                            {selectedCardId ? 'Selected Consultation Details' : 'Upcoming Consultation'}
                        </h2>
                        {selectedCardId && featuredUpcoming && String(selectedCardId) !== String(featuredUpcoming.id) && (
                            <button
                                type="button"
                                onClick={() => setSelectedCardId(featuredUpcoming.id)}
                                className="text-xs text-[#a5d391] hover:text-white font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">replay</span>
                                Show Next Upcoming
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-center text-white/50">
                            Loading consultation schedule...
                        </div>
                    ) : activeDisplayedAppointment ? (
                        <div className="bg-gradient-to-r from-[#a5d391]/10 via-white/5 to-[#080b12] backdrop-blur-xl border border-[#a5d391]/30 rounded-[2.5rem] p-6 lg:p-8 flex flex-col md:flex-row gap-6 items-center shadow-xl relative overflow-hidden">
                            <div className="bg-[#080b12]/90 border border-white/10 rounded-2xl p-4 text-center min-w-[110px] shrink-0 shadow-lg">
                                <div className="text-[#a5d391] font-bold text-xs uppercase tracking-widest mb-1">
                                    {formatDate(activeDisplayedAppointment.appointmentTime).month}
                                </div>
                                <div className="text-3xl font-bold font-hero-display text-white">
                                    {formatDate(activeDisplayedAppointment.appointmentTime).day}
                                </div>
                                <div className="text-white/40 text-xs mt-1">
                                    {formatDate(activeDisplayedAppointment.appointmentTime).time}
                                </div>
                            </div>

                            <div className="flex-grow text-center md:text-left">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                        (activeDisplayedAppointment.status || '').toUpperCase() === 'CANCELLED'
                                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            : (activeDisplayedAppointment.status || '').toUpperCase() === 'REJECTED'
                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                            : (activeDisplayedAppointment.status || '').toUpperCase() === 'COMPLETED'
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : (activeDisplayedAppointment.status || '').toUpperCase() === 'CANCELLATION_REQUESTED'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                            : isConfirmedOrApproved(activeDisplayedAppointment.status)
                                            ? 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30'
                                            : (activeDisplayedAppointment.status || '').toUpperCase() === 'REQUESTED' || (activeDisplayedAppointment.status || '').toUpperCase().includes('PENDING')
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                                            : 'bg-white/10 text-white/80 border border-white/20'
                                    }`}>
                                        {(activeDisplayedAppointment.status || '').toUpperCase() === 'CANCELLED'
                                            ? 'Cancelled'
                                            : (activeDisplayedAppointment.status || '').toUpperCase() === 'REJECTED'
                                            ? 'Rejected'
                                            : (activeDisplayedAppointment.status || '').toUpperCase() === 'COMPLETED'
                                            ? 'Completed'
                                            : (activeDisplayedAppointment.status || '').toUpperCase() === 'CANCELLATION_REQUESTED'
                                            ? 'Cancellation Pending'
                                            : isConfirmedOrApproved(activeDisplayedAppointment.status)
                                            ? 'Confirmed'
                                            : ((activeDisplayedAppointment.status || '').toUpperCase() === 'REQUESTED' || (activeDisplayedAppointment.status || '').toUpperCase().includes('PENDING')) ? 'Requested' : (activeDisplayedAppointment.status || 'Requested')}
                                    </span>
                                    <span className="text-xs text-white/40 font-semibold">• {activeDisplayedAppointment.sessionType || 'Clinical Consultation'}</span>
                                </div>

                                <h3 className="font-bold text-xl mb-1 font-hero-display text-white">{activeDisplayedAppointment.title || 'Metabolic Baseline Review'}</h3>
                                <p className="text-white/60 text-sm mb-2">
                                    Nutritionist: <span className="text-white font-semibold">{activeDisplayedAppointment.nutritionistName || primaryNutritionist.name}</span>
                                    {activeDisplayedAppointment.notes ? ` — "${activeDisplayedAppointment.notes}"` : ''}
                                </p>

                                {((activeDisplayedAppointment.status || '').toUpperCase() === 'DECLINE_CANCELLATION' || (activeDisplayedAppointment.notes || '').toLowerCase().includes('declined by nutritionist')) && (
                                    <div className="mb-4 bg-amber-500/15 border border-amber-500/35 rounded-xl px-3.5 py-2 text-xs text-amber-200 flex items-center gap-2 font-medium">
                                        <span className="material-symbols-outlined text-amber-400 text-base shrink-0">info</span>
                                        <span>Cancellation was declined by the nutritionist. The consultation remains scheduled and confirmed.</span>
                                    </div>
                                )}

                                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                    {(activeDisplayedAppointment.status || '').toUpperCase() === 'CANCELLED' ? (
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="bg-red-500/15 text-red-300 border border-red-500/30 px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                                <span className="material-symbols-outlined text-sm">cancel</span>
                                                <span>Session Cancelled</span>
                                            </div>
                                            {canDeleteAppointment(activeDisplayedAppointment) && (
                                                <button
                                                    onClick={() => handleDeleteHistoryItem(null, activeDisplayedAppointment)}
                                                    className="border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                    Delete Record
                                                </button>
                                            )}
                                        </div>
                                    ) : (activeDisplayedAppointment.status || '').toUpperCase() === 'COMPLETED' ? (
                                        <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            <span>Session Completed</span>
                                        </div>
                                    ) : (activeDisplayedAppointment.status || '').toUpperCase() === 'REJECTED' ? (
                                        <div className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-sm">do_not_disturb</span>
                                            <span>Session Rejected by Nutritionist</span>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/consultation-chat?appointmentId=${encodeURIComponent(activeDisplayedAppointment.id)}`)}
                                                className="bg-[#a5d391]/20 hover:bg-[#a5d391]/30 text-[#a5d391] border border-[#a5d391]/40 px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(165,211,145,0.2)] cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined text-sm">forum</span> Chat with Nutritionist
                                            </button>
                                            <Link
                                                to="/virtual-room"
                                                className="bg-[#a5d391] text-black px-5 py-2.5 rounded-full text-xs font-bold hover:bg-white transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(165,211,145,0.3)] cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined text-sm">videocam</span> Join Virtual Room
                                            </Link>
                                            {(activeDisplayedAppointment.status || '').toUpperCase() === 'CANCELLATION_REQUESTED' ? (
                                                <div className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                                    <span className="material-symbols-outlined text-sm animate-pulse">hourglass_top</span>
                                                    <span>Cancellation Pending (Awaiting Nutritionist)</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleCancelAppointment(activeDisplayedAppointment.id)}
                                                    className="border border-red-500/30 text-red-300 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer"
                                                >
                                                    Cancel Session
                                                </button>
                                            )}
                                        </>
                                    )}
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
                    <div id="consultation-history" className="mt-10 space-y-4 scroll-mt-28">
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
                                    // Confirmed sessions whose time has passed are shown as Completed
                                    const upper = getConsultationOutcome(item) === 'COMPLETED' ? 'COMPLETED' : (item.status || '').toUpperCase();
                                    const payment = describePayment(item);
                                    const isSelected = String(item.id) === String(activeDisplayedAppointment?.id);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => setSelectedCardId(item.id)}
                                            className={`p-5 sm:p-6 flex items-center justify-between gap-4 transition-all cursor-pointer group ${
                                                isSelected
                                                    ? 'bg-white/10 border-l-4 border-l-[#a5d391] shadow-lg'
                                                    : 'hover:bg-white/5 border-l-4 border-l-transparent'
                                            }`}
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
                                                        <span className="text-white/70">{item.nutritionistName || primaryNutritionist.name}</span>
                                                        <span>•</span>
                                                        <span className="text-white/40">{item.sessionType || 'Consultation'}</span>
                                                        {payment && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-white/60">₹{payment.amount.toFixed(2)}{payment.state ? ` ${payment.state}` : ''}</span>
                                                            </>
                                                        )}
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
                                                ) : upper === 'CANCELLATION_REQUESTED' ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm">
                                                        <span className="material-symbols-outlined text-xs animate-pulse">hourglass_top</span>
                                                        Cancel Pending
                                                    </span>
                                                ) : upper === 'ONGOING' || (!passed && (upper === 'CONFIRMED' || upper === 'SCHEDULED' || upper === 'APPROVED' || upper === 'DECLINE_CANCELLATION')) ? (
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

                                                {isSelected && (
                                                    <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30">
                                                        Active View
                                                    </span>
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
                                Platform Nutritionists
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30">
                                {nutritionists.length} Registered
                            </span>
                        </div>

                        <p className="text-xs text-white/50">
                            Certified nutritionists available for 1-on-1 virtual consultation bookings:
                        </p>

                        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                            {nutritionists.length === 0 ? (
                                <div className="text-xs text-white/40 text-center py-4">No nutritionist profiles available yet.</div>
                            ) : (
                                nutritionists.map((d) => (
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
                                                <div className="text-[#a5d391] text-[11px] font-bold truncate">{d.credentials || 'Certified Clinical Nutritionist'}</div>
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
                                            onClick={() => openBookingForNutritionist(d.id)}
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
                            {/* Rich Nutritionist Selection Cards */}
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                                    Select Registered Nutritionist ({nutritionists.length} Available)
                                </label>

                                {nutritionists.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {nutritionists.map((d) => (
                                            <div
                                                key={d.id}
                                                onClick={() => setBookingForm({ ...bookingForm, nutritionistId: d.id })}
                                                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${bookingForm.nutritionistId == d.id ? 'bg-[#a5d391]/20 border-[#a5d391] text-white' : 'bg-black/40 border-white/10 text-white/70 hover:border-white/30'}`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {Boolean(d.isApproved === true || d.approvalStatus === 'APPROVED' || d.approvalStatus === 'VERIFIED') ? (
                                                        <div className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${bookingForm.nutritionistId == d.id ? 'bg-[#a5d391] text-black' : 'bg-white/10 text-white'}`}>
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
                                                        <div className="text-[10px] text-[#a5d391] truncate">{d.credentials || 'Certified Clinical Nutritionist'} • {d.specialization || 'Clinical Health'}</div>
                                                        <div className="text-[10px] text-white/40 truncate">{d.email}</div>
                                                    </div>
                                                </div>

                                                {bookingForm.nutritionistId == d.id && (
                                                    <span className="material-symbols-outlined text-[#a5d391] shrink-0">check_circle</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <select
                                        value={bookingForm.nutritionistId}
                                        onChange={(e) => setBookingForm({ ...bookingForm, nutritionistId: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    >
                                        <option value="">Dr. Elena Rostova (Lead Clinical Nutritionist)</option>
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
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Notes / Questions for Nutritionist</label>
                                <textarea
                                    rows="2"
                                    value={bookingForm.notes}
                                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    placeholder="Describe your current dietary goal or recent changes..."
                                ></textarea>
                            </div>

                            {/* Service Fee & Checkout Balance Validation ("Low Balance" Guard) */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[#a5d391] text-base">payments</span>
                                        Wallet Payment &amp; Pricing
                                    </label>
                                    <div className="flex items-center gap-1 text-[11px] font-mono">
                                        <span className="text-white/50">Available:</span>
                                        <span className="text-[#a5d391] font-bold">₹{Number(wallet.balance || 0).toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Preset Price Pills */}
                                <div className="space-y-1.5">
                                    <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Select Consultation Tier / Price</div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {[
                                            { label: '₹10 Test', val: 10 },
                                            { label: '₹150 Follow-up', val: 150 },
                                            { label: '₹500 Session', val: 500 },
                                            { label: '₹1500 Full', val: 1500 }
                                        ].map(tier => (
                                            <button
                                                key={tier.val}
                                                type="button"
                                                onClick={() => setSessionFee(tier.val)}
                                                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                                                    Number(sessionFee) === tier.val
                                                        ? 'bg-[#a5d391] text-black border-[#a5d391] shadow-[0_0_10px_rgba(165,211,145,0.4)]'
                                                        : 'bg-black/40 border-white/10 text-white/70 hover:border-white/30'
                                                }`}
                                            >
                                                {tier.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 pt-1">
                                        <span className="text-[11px] text-white/50">Custom Amount:</span>
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs font-mono">₹</span>
                                            <input
                                                type="number"
                                                min="1"
                                                step="any"
                                                value={sessionFee}
                                                onChange={(e) => setSessionFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                className="w-full bg-black/60 border border-white/10 rounded-xl pl-7 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#a5d391]"
                                                placeholder="Custom Price"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Condition Check / Low Balance Guard Display */}
                                {(() => {
                                    const currentBal = Number(wallet.balance || 0);
                                    const reqFee = Number(sessionFee || 0);
                                    const isLow = currentBal < reqFee;
                                    const deficit = reqFee - currentBal;

                                    if (isLow) {
                                        return (
                                            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-rose-400">
                                                        <span className="material-symbols-outlined text-sm">gpp_bad</span>
                                                        LOW_BALANCE Guard
                                                    </span>
                                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black bg-rose-500/30 text-rose-200 border border-rose-500/40">
                                                        BLOCKED
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-white/80 leading-snug">
                                                    Current Balance: <strong className="font-mono text-white">₹{currentBal.toFixed(2)}</strong> &lt; Required Fee: <strong className="font-mono text-white">₹{reqFee.toFixed(2)}</strong>.
                                                </p>
                                                <div className="text-[11px] text-rose-300 font-semibold flex items-center justify-between pt-0.5">
                                                    <span>Balance Deficit:</span>
                                                    <span className="font-mono font-bold text-rose-400">₹{deficit.toFixed(2)}</span>
                                                </div>
                                                <div className="text-[10px] text-white/50 italic pt-0.5">
                                                    Submitting will trigger instant transaction block &amp; audit logging.
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="p-3 rounded-xl bg-[#a5d391]/15 border border-[#a5d391]/40 text-[#a5d391] space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-[#a5d391]">
                                                    <span className="material-symbols-outlined text-sm">verified_user</span>
                                                    Balance Verified
                                                </span>
                                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black bg-[#a5d391]/30 text-black border border-[#a5d391]">
                                                    READY
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-white/80 leading-snug">
                                                Available: <strong className="font-mono text-white">₹{currentBal.toFixed(2)}</strong> → Deduction: <strong className="font-mono text-[#a5d391]">-₹{reqFee.toFixed(2)}</strong>
                                            </p>
                                            <div className="text-[11px] text-white/70 flex items-center justify-between pt-0.5">
                                                <span>Updated Balance After Booking:</span>
                                                <span className="font-mono font-bold text-[#a5d391]">₹{(currentBal - reqFee).toFixed(2)}</span>
                                            </div>
                                            <div className="text-[10px] text-white/50 italic pt-0.5">
                                                Atomic transfer: ₹{reqFee.toFixed(2)} credited directly to nutritionist wallet upon confirmation.
                                            </div>
                                        </div>
                                    );
                                })()}
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
                                    disabled={isPayingWithWallet}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg flex items-center gap-2 ${
                                        Number(wallet.balance || 0) < Number(sessionFee || 0)
                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white'
                                            : 'bg-[#a5d391] text-black hover:bg-white'
                                    }`}
                                >
                                    {isPayingWithWallet ? (
                                        <>
                                            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                            Authorizing...
                                        </>
                                    ) : Number(wallet.balance || 0) < Number(sessionFee || 0) ? (
                                        <>
                                            <span className="material-symbols-outlined text-sm">lock</span>
                                            Pay ₹{Number(sessionFee || 0).toFixed(2)} (Test Low Balance Block)
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            Authorize ₹{Number(sessionFee || 0).toFixed(2)} &amp; Book Session
                                        </>
                                    )}
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
                                    isConfirmedOrApproved(selectedAppointment.status)
                                        ? 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30'
                                        : (selectedAppointment.status || '').toUpperCase() === 'CANCELLED'
                                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                        : (selectedAppointment.status || '').toUpperCase() === 'REJECTED'
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : (selectedAppointment.status || '').toUpperCase() === 'COMPLETED'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                    {isConfirmedOrApproved(selectedAppointment.status) ? 'Confirmed' : ((selectedAppointment.status || '').toUpperCase() === 'REQUESTED' || (selectedAppointment.status || '').toUpperCase().includes('PENDING')) ? 'Requested' : (selectedAppointment.status || 'Requested')}
                                </span>
                                <h3 className="text-xl font-bold text-white mt-2 font-hero-display">{selectedAppointment.title || 'Consultation Session'}</h3>
                                <p className="text-xs text-[#a5d391] font-semibold">{selectedAppointment.sessionType || 'Clinical Consultation'}</p>
                            </div>
                            <button onClick={() => setSelectedAppointment(null)} className="text-white/50 hover:text-white cursor-pointer">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {((selectedAppointment.status || '').toUpperCase() === 'DECLINE_CANCELLATION' || (selectedAppointment.notes || '').toLowerCase().includes('declined by nutritionist')) && (
                                <div className="bg-amber-500/15 border border-amber-500/35 rounded-2xl p-3.5 text-xs text-amber-200 flex items-center gap-2 font-medium">
                                    <span className="material-symbols-outlined text-amber-400 text-base shrink-0">info</span>
                                    <span>Cancellation was declined by the nutritionist. The session remains confirmed.</span>
                                </div>
                            )}

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
                                <div className="text-sm font-bold text-white">{selectedAppointment.nutritionistName || primaryNutritionist.name}</div>
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
                                (selectedAppointment.status || '').toUpperCase() === 'CANCELLATION_REQUESTED' ? (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 px-4 py-2.5 rounded-xl border border-amber-500/30 font-bold">
                                        <span className="material-symbols-outlined text-sm animate-pulse">hourglass_top</span>
                                        <span>Cancellation Pending (Awaiting Nutritionist)</span>
                                    </div>
                                ) : (selectedAppointment.status || '').toUpperCase() !== 'CANCELLED' && (selectedAppointment.status || '').toUpperCase() !== 'REJECTED' ? (
                                    <button
                                        onClick={() => handleCancelAppointment(selectedAppointment.id)}
                                        className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-sm">event_busy</span>
                                        <span>Cancel Session</span>
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
                                    <Link
                                        to="/virtual-room"
                                        className="px-5 py-2.5 rounded-xl bg-[#a5d391] text-black text-xs font-bold hover:bg-white transition-all cursor-pointer flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">videocam</span> Join Room
                                    </Link>
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

            {/* Modal: LOW_BALANCE Guard Blocked Dialog */}
            {guardBlockedModal && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
                    <div className="bg-[#0e0708] border-2 border-rose-500/60 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full relative shadow-[0_0_50px_rgba(244,63,94,0.35)] space-y-5">
                        <div className="flex items-center gap-3 border-b border-rose-500/20 pb-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                                <span className="material-symbols-outlined text-3xl">gpp_bad</span>
                            </div>
                            <div>
                                <div className="text-xs font-black uppercase tracking-widest text-rose-400">Transaction Blocked</div>
                                <h3 className="text-lg font-bold text-white font-hero-display">Low Balance Guard Active</h3>
                            </div>
                        </div>

                        <div className="space-y-3 bg-black/40 border border-rose-500/20 rounded-2xl p-4 text-xs">
                            <div className="flex justify-between items-center text-white/70">
                                <span>Status Error:</span>
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold">
                                    LOW_BALANCE
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-white/70">
                                <span>Available Balance:</span>
                                <span className="font-mono text-white font-bold">₹{Number(guardBlockedModal.currentBalance).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-white/70">
                                <span>Required Service Price:</span>
                                <span className="font-mono text-white font-bold">₹{Number(guardBlockedModal.requiredAmount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-rose-300 pt-2 border-t border-white/10 font-bold">
                                <span>Funding Deficit:</span>
                                <span className="font-mono text-rose-400 text-sm">₹{Number(guardBlockedModal.deficit).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-white/50 text-[10px] pt-1">
                                <span>Audit Transaction Ref:</span>
                                <span className="font-mono text-white/70 truncate max-w-[170px]">{guardBlockedModal.transactionReference}</span>
                            </div>
                        </div>

                        <p className="text-xs text-white/70 leading-relaxed">
                            The requested nutritionist appointment was blocked because your app wallet balance is less than the required consultation fee. No funds have been deducted. A security audit record has been logged to the ledger.
                        </p>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setGuardBlockedModal(null)}
                                className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                            >
                                Acknowledge &amp; Return
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Request Cancellation Confirmation Pop-up */}
            {cancelPromptModal.open && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
                    <div className="bg-[#121612] border-2 border-amber-500/60 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full relative shadow-[0_0_50px_rgba(245,158,11,0.3)] space-y-5">
                        <div className="flex items-center gap-3 border-b border-amber-500/20 pb-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                                <span className="material-symbols-outlined text-3xl">warning</span>
                            </div>
                            <div>
                                <div className="text-xs font-black uppercase tracking-widest text-amber-400">Confirm Action</div>
                                <h3 className="text-lg font-bold text-white font-hero-display">Cancel Session</h3>
                            </div>
                        </div>

                        <div className="space-y-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs">
                            <div className="flex items-start gap-2.5">
                                <span className="material-symbols-outlined text-amber-400 text-lg shrink-0 mt-0.5">info</span>
                                <p className="text-amber-200/90 font-medium leading-relaxed">
                                    Are you sure you want to cancel this consultation?
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-white/70 leading-relaxed">
                            Your nutritionist will be notified and can review the cancellation.
                        </p>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setCancelPromptModal({ open: false, appointmentId: null })}
                                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                            >
                                Keep Session
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const targetId = cancelPromptModal.appointmentId;
                                    setCancelPromptModal({ open: false, appointmentId: null });
                                    if (targetId) confirmCancelSession(targetId);
                                }}
                                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-sm">event_busy</span>
                                Confirm Cancellation
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Appointments;
