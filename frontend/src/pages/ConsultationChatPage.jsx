import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import ConsultationChatModal from '../components/ConsultationChatModal';
import { AuthContext } from '../context/AuthContext';

const roleOf = (user) => String(user?.role || '').replace(/^ROLE_/i, '').toUpperCase();

const ConsultationChatPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const requestedAppointmentId = searchParams.get('appointmentId');
    const requestedParticipantId = searchParams.get('participantId');
    const requestedConversationId = searchParams.get('conversationId');
    const role = roleOf(user);
    const [recipients, setRecipients] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
    const [hasMoreConversations, setHasMoreConversations] = useState(false);
    const [requestedConversation, setRequestedConversation] = useState(null);
    const [loadingRecipients, setLoadingRecipients] = useState(false);
    const [recipientsLoaded, setRecipientsLoaded] = useState(false);
    const [error, setError] = useState('');
    const [recipientsError, setRecipientsError] = useState('');
    const [search, setSearch] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [newChatMode, setNewChatMode] = useState(false);
    const conversationPageRef = useRef(0);
    const loadingMoreRef = useRef(false);

    const errorMessage = (requestError) =>
        requestError.response?.data?.message ||
        `Request failed${requestError.response?.status ? ` (${requestError.response.status})` : ''}.`;

    useEffect(() => {
        let cancelled = false;
        const loadChatChoices = async () => {
            setLoading(true);
            setError('');
            try {
                if (role === 'NUTRITIONIST') {
                    conversationPageRef.current = 0;
                    setConversations([]);
                    setHasMoreConversations(false);
                    const conversationsResult = await api.get('/conversations/page', {
                        params: { page: 0, size: 30 },
                    });
                    if (!cancelled) {
                        const page = conversationsResult.data;
                        setConversations(Array.isArray(page.conversations) ? page.conversations : []);
                        setHasMoreConversations(Boolean(page.hasMore));
                        conversationPageRef.current = Number(page.nextPage) || 1;
                    }
                } else if (role === 'USER') {
                    const [appointmentsResult, conversationsResult] = await Promise.allSettled([
                        api.get('/appointments/me'),
                        api.get('/conversations'),
                    ]);
                    if (!cancelled) {
                        if (appointmentsResult.status === 'fulfilled') {
                            setAppointments(Array.isArray(appointmentsResult.value.data) ? appointmentsResult.value.data : []);
                        } else {
                            setError(`Booked consultations could not be loaded: ${errorMessage(appointmentsResult.reason)}`);
                        }
                        if (conversationsResult.status === 'fulfilled') {
                            setConversations(Array.isArray(conversationsResult.value.data) ? conversationsResult.value.data : []);
                        } else {
                            setError(`Existing chats could not be loaded: ${errorMessage(conversationsResult.reason)}`);
                        }
                    }
                } else {
                    setError('Consultation chat is available to users and nutritionists.');
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(role === 'NUTRITIONIST'
                        ? `Existing chats could not be loaded: ${errorMessage(requestError)}`
                        : `Unable to load consultation chats: ${errorMessage(requestError)}`);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadChatChoices();
        return () => {
            cancelled = true;
        };
    }, [role, reloadKey]);

    const loadMoreConversations = async () => {
        if (role !== 'NUTRITIONIST' || !hasMoreConversations || loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMoreConversations(true);
        try {
            const response = await api.get('/conversations/page', {
                params: { page: conversationPageRef.current, size: 30 },
            });
            const page = response.data;
            const nextConversations = Array.isArray(page.conversations) ? page.conversations : [];
            setConversations((current) => {
                const byId = new Map(current.map((item) => [item.id, item]));
                nextConversations.forEach((item) => byId.set(item.id, item));
                return [...byId.values()];
            });
            setHasMoreConversations(Boolean(page.hasMore));
            conversationPageRef.current = Number(page.nextPage) || conversationPageRef.current + 1;
        } catch (requestError) {
            setError(`Older chats could not be loaded: ${errorMessage(requestError)}`);
        } finally {
            loadingMoreRef.current = false;
            setLoadingMoreConversations(false);
        }
    };

    useEffect(() => {
        if (role !== 'NUTRITIONIST' || (!newChatMode && !requestedParticipantId) || recipientsLoaded) return undefined;
        let cancelled = false;
        setLoadingRecipients(true);
        setRecipientsError('');
        api.get('/conversations/recipients')
            .then((response) => {
                if (!cancelled) {
                    setRecipients(Array.isArray(response.data) ? response.data : []);
                    setRecipientsLoaded(true);
                }
            })
            .catch((requestError) => {
                if (!cancelled) {
                    setRecipientsError(`Unable to load users: ${errorMessage(requestError)}`);
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingRecipients(false);
            });
        return () => {
            cancelled = true;
        };
    }, [role, newChatMode, requestedParticipantId, recipientsLoaded, reloadKey]);

    useEffect(() => {
        if (role !== 'NUTRITIONIST' || !requestedAppointmentId) return undefined;
        let cancelled = false;
        api.get('/appointments/me')
            .then((response) => {
                if (!cancelled) setAppointments(Array.isArray(response.data) ? response.data : []);
            })
            .catch((requestError) => {
                if (!cancelled) setError(`Consultation could not be loaded: ${errorMessage(requestError)}`);
            });
        return () => {
            cancelled = true;
        };
    }, [role, requestedAppointmentId]);

    const selectedConversation = useMemo(
        () => conversations.find((item) => String(item.id) === requestedConversationId) || requestedConversation,
        [conversations, requestedConversationId, requestedConversation],
    );
    const selectedAppointment = useMemo(
        () => appointments.find((item) => String(item.id) === requestedAppointmentId) || null,
        [appointments, requestedAppointmentId],
    );
    const selectedRecipient = useMemo(
        () => recipients.find((item) => String(item.id) === requestedParticipantId) || null,
        [recipients, requestedParticipantId],
    );
    const activeConversationAppointmentIds = useMemo(
        () => new Set(conversations.filter((item) => item.appointmentId != null).map((item) => String(item.appointmentId))),
        [conversations],
    );
    // A chat only exists for an accepted consultation, so only those can be picked here.
    const acceptedAppointmentStatuses = ['CONFIRMED', 'ACCEPTED', 'APPROVED', 'SCHEDULED'];
    const bookedAppointments = appointments.filter((appointment) =>
        acceptedAppointmentStatuses.includes(String(appointment.status || '').toUpperCase()));
    const eligibleAppointments = bookedAppointments.filter(
        (appointment) => !activeConversationAppointmentIds.has(String(appointment.id)),
    );
    const uniqueRecipients = useMemo(() => {
        const seenUsers = new Set();
        return recipients.filter((recipient) => {
            const identity = String(recipient.id ?? recipient.email ?? '').trim().toLowerCase();
            if (!identity || seenUsers.has(identity)) return false;
            seenUsers.add(identity);
            return true;
        });
    }, [recipients]);
    const visibleRecipients = uniqueRecipients.filter((recipient) =>
        `${recipient.name} ${recipient.email} ${recipient.id}`.toLowerCase().includes(search.toLowerCase()),
    );
    const uniqueConversations = useMemo(() => {
        if (role !== 'NUTRITIONIST') return conversations;
        const latestByPatient = new Map();
        [...conversations]
            .sort((a, b) => {
                const updatedDifference = new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
                return updatedDifference || Number(b.id) - Number(a.id);
            })
            .forEach((item) => {
                const patientKey = String(item.patientId);
                if (!latestByPatient.has(patientKey)) latestByPatient.set(patientKey, item);
            });
        return [...latestByPatient.values()];
    }, [conversations, role]);

    let targetPatient = null;
    let conversationId = null;
    let appointmentId = null;
    if (selectedConversation) {
        conversationId = selectedConversation.id;
        targetPatient = role === 'NUTRITIONIST'
            ? { id: selectedConversation.patientId, userId: selectedConversation.patientId, name: selectedConversation.patientName }
            : { id: selectedConversation.nutritionistId, nutritionistName: selectedConversation.nutritionistName };
    } else if (selectedAppointment) {
        appointmentId = selectedAppointment.id;
        targetPatient = role === 'NUTRITIONIST'
            ? { id: selectedAppointment.userId, userId: selectedAppointment.userId, name: selectedAppointment.userName, appointmentId: selectedAppointment.id }
            : { nutritionistName: selectedAppointment.nutritionistName, appointmentId: selectedAppointment.id };
    } else if (selectedRecipient) {
        appointmentId = selectedRecipient.appointmentId || null;
        targetPatient = {
            id: selectedRecipient.id,
            userId: selectedRecipient.id,
            name: selectedRecipient.name,
            email: selectedRecipient.email,
            role: selectedRecipient.role,
            appointmentId: selectedRecipient.appointmentId || undefined,
        };
    }

    const openConversation = (id) => navigate(`/consultation-chat?conversationId=${encodeURIComponent(id)}`);
    const openAppointment = (id) => navigate(`/consultation-chat?appointmentId=${encodeURIComponent(id)}`);
    const openRecipient = (recipient) => {
        const activeConversation = conversations.find((item) =>
            String(item.patientId) === String(recipient.id) && item.status === 'ACTIVE');
        if (activeConversation) {
            openConversation(activeConversation.id);
            return;
        }
        // The chat always hangs off the accepted consultation, never off a bare user id.
        if (recipient.appointmentId) {
            openAppointment(recipient.appointmentId);
            return;
        }
        if (recipient.conversationId) {
            openConversation(recipient.conversationId);
            return;
        }
        setError('This patient has no accepted consultation yet, so no chat can be opened.');
    };
    const closeChat = () => {
        setNewChatMode(false);
        setSearch('');
        navigate('/consultation-chat');
    };
    const isSelectionRequested = Boolean(requestedAppointmentId || requestedParticipantId || requestedConversationId);

    useEffect(() => {
        if (!requestedConversationId) {
            setRequestedConversation(null);
            return undefined;
        }
        if (conversations.some((item) => String(item.id) === requestedConversationId)) {
            setRequestedConversation(null);
            return undefined;
        }
        let cancelled = false;
        api.get(`/conversations/${requestedConversationId}`)
            .then((response) => {
                if (!cancelled) setRequestedConversation(response.data);
            })
            .catch(() => {
                if (!cancelled) setRequestedConversation(null);
            });
        return () => {
            cancelled = true;
        };
    }, [requestedConversationId, conversations, role]);

    if (loading && !['USER', 'NUTRITIONIST'].includes(role)) {
        return (
            <main className="min-h-[70vh] flex items-center justify-center bg-[#080b12] text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-2 border-white/10 border-t-[#a5d391] animate-spin" />
                    <p className="text-sm text-white/60 animate-pulse">Loading your secure chats...</p>
                </div>
            </main>
        );
    }

    if (['USER', 'NUTRITIONIST'].includes(role)) {
        const selected = Boolean(isSelectionRequested && (conversationId || appointmentId || selectedRecipient));
        const visibleConversations = uniqueConversations.filter((item) =>
            `${item.patientName || ''} ${item.patientEmail || ''} ${item.patientRole || ''} ${item.nutritionistName || ''} ${item.nutritionistEmail || ''} ${item.nutritionistRole || ''} ${item.status || ''}`
                .toLowerCase()
                .includes(search.toLowerCase()),
        );
        const visibleAppointments = eligibleAppointments.filter((appointment) =>
            `${appointment.nutritionistName || ''} ${appointment.title || ''} ${appointment.sessionType || ''} ${appointment.status || ''}`
                .toLowerCase()
                .includes(search.toLowerCase()),
        );
        const sidebarRecipients = role === 'NUTRITIONIST' ? visibleRecipients.filter((recipient) =>
            !conversations.some((item) =>
                String(item.patientId) === String(recipient.id) && item.status === 'ACTIVE'),
        ) : [];

        return (
            <main className="flex h-full min-h-0 items-center justify-center bg-transparent px-3 text-[#111b21] sm:px-0">
                <section className="mx-auto flex h-[min(76vh,700px)] min-h-[min(480px,calc(100dvh-10rem))] w-full overflow-hidden rounded-xl border border-white/10 bg-[#edf2f0] shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:w-[90%] lg:w-[80%] lg:max-w-[1500px]">
                    <aside className={`${selected ? 'hidden sm:flex' : 'flex'} w-full shrink-0 flex-col border-r border-[#d9e2df] bg-[#f7f9f8] sm:w-[340px] lg:w-[390px]`}>
                        <div className="flex items-center justify-between bg-[#eaf0ee] px-4 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9fdd3] font-bold text-[#075e54]">
                                    {(user?.name || user?.email || 'N').slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-sm font-semibold">Consultation chats</h1>
                                    <p className="text-xs text-[#667781]">
                                        {role === 'USER' ? 'Your consultations' : 'Nutritionist workspace'}
                                    </p>
                                </div>
                            </div>
                            {['USER', 'NUTRITIONIST'].includes(role) && <button
                                type="button"
                                onClick={() => {
                                    setNewChatMode((open) => !open);
                                    setSearch('');
                                }}
                                className={`flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#e9edef] ${newChatMode ? 'text-[#008069]' : 'text-[#54656f]'}`}
                                aria-label={newChatMode ? 'Show chats' : role === 'USER' ? 'Choose an appointment' : 'Start a new chat'}
                                title={newChatMode ? 'Show chats' : role === 'USER' ? 'Choose an appointment' : 'Start a new chat'}
                            >
                                <span className="material-symbols-outlined">
                                    {newChatMode ? 'chat' : role === 'USER' ? 'calendar_add_on' : 'add_comment'}
                                </span>
                            </button>}
                        </div>
                        <div className="border-b border-[#e9edef] px-3 py-2.5">
                            <label className="flex items-center gap-3 rounded-lg bg-[#f0f2f5] px-3 py-2">
                                <span className="material-symbols-outlined text-xl text-[#667781]">search</span>
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder={newChatMode
                                        ? role === 'USER'
                                            ? 'Search appointments'
                                            : 'Search patients to chat'
                                        : 'Search conversations'}
                                    className="min-w-0 flex-1 bg-transparent text-sm text-[#111b21] outline-none placeholder:text-[#667781]"
                                    aria-label={newChatMode
                                        ? role === 'USER'
                                            ? 'Search appointments'
                                            : 'Search patients to chat'
                                        : 'Search conversations'}
                                />
                            </label>
                        </div>
                        {(error || recipientsError) && (
                            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                                <p>{recipientsError || error}</p>
                                <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-1 font-semibold text-[#008069]">
                                    Retry
                                </button>
                            </div>
                        )}
                        <div
                            className="chat-scroll min-h-0 flex-1 overflow-y-auto bg-[#f7f9f8]"
                            onScroll={(event) => {
                                const list = event.currentTarget;
                                if (!newChatMode && list.scrollHeight - list.scrollTop - list.clientHeight < 160) {
                                    void loadMoreConversations();
                                }
                            }}
                        >
                            {role === 'USER' && newChatMode ? (
                                loading ? (
                                    <div className="space-y-0 animate-pulse">
                                        {[0, 1, 2, 3].map((item) => (
                                            <div key={item} className="flex items-center gap-3 border-b border-[#e4eae8] px-4 py-3">
                                                <div className="h-12 w-12 shrink-0 rounded-full bg-[#e1e9e6]" />
                                                <div className="min-w-0 flex-1 space-y-2">
                                                    <div className="h-3 w-2/3 rounded bg-[#e1e9e6]" />
                                                    <div className="h-3 w-1/2 rounded bg-[#e1e9e6]" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : visibleAppointments.length === 0 ? (
                                    <div className="px-6 py-10 text-center text-sm text-[#667781]">
                                        {eligibleAppointments.length
                                            ? 'No appointments match your search.'
                                            : 'No booked consultations are available to start a chat.'}
                                        <Link to="/appointments" className="mt-3 block font-semibold text-[#008069]">
                                            Browse consultations
                                        </Link>
                                    </div>
                                ) : visibleAppointments.map((appointment) => (
                                    <button
                                        key={appointment.id}
                                        type="button"
                                        onClick={() => openAppointment(appointment.id)}
                                        className="flex w-full items-center gap-3 border-b border-[#e4eae8] px-4 py-3 text-left transition hover:bg-[#edf3f1]"
                                    >
                                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#d9fdd3] font-semibold text-[#075e54]">
                                            {(appointment.nutritionistName || 'N').slice(0, 1).toUpperCase()}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium">{appointment.nutritionistName || 'Nutritionist'}</span>
                                            <span className="mt-1 block truncate text-xs text-[#667781]">
                                                {appointment.title || appointment.sessionType || 'Consultation'} · {appointment.status}
                                            </span>
                                        </span>
                                        <span className="material-symbols-outlined text-xl text-[#008069]">chat</span>
                                    </button>
                                ))
                            ) : role === 'NUTRITIONIST' && newChatMode ? (
                                loadingRecipients ? (
                                    <div className="flex flex-col items-center gap-3 px-6 py-10 text-sm text-[#667781]">
                                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#d1d7db] border-t-[#008069]" />
                                        Loading your patients...
                                    </div>
                                ) : sidebarRecipients.length === 0 ? (
                                    <div className="px-6 py-10 text-center text-sm text-[#667781]">
                                        {recipientsError
                                            ? 'Recipients could not be loaded. Use Retry above to try again.'
                                            : recipients.length
                                                ? 'No users match your search, or everyone already has a chat.'
                                                : 'No eligible accounts are available.'}
                                    </div>
                                ) : sidebarRecipients.map((recipient) => (
                                    <button
                                        key={recipient.id}
                                        type="button"
                                        onClick={() => openRecipient(recipient)}
                                        className="flex w-full items-center gap-3 border-b border-[#e4eae8] px-4 py-3 text-left transition hover:bg-[#edf3f1]"
                                    >
                                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dfe8df] font-semibold text-[#075e54]">
                                            {(recipient.name || recipient.email || 'U').slice(0, 1).toUpperCase()}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium">{recipient.name || recipient.email}</span>
                                            <span className="mt-1 block truncate text-xs text-[#667781]">
                                                {recipient.email}
                                            </span>
                                        </span>
                                    </button>
                                ))
                            ) : loading && visibleConversations.length === 0 ? (
                                <div className="space-y-0 animate-pulse">
                                    {[0, 1, 2, 3, 4].map((item) => (
                                        <div key={item} className="flex items-center gap-3 border-b border-[#e4eae8] px-4 py-3">
                                            <div className="h-12 w-12 shrink-0 rounded-full bg-[#e1e9e6]" />
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <div className="h-3 w-2/3 rounded bg-[#e1e9e6]" />
                                                <div className="h-3 w-1/2 rounded bg-[#e1e9e6]" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : visibleConversations.length === 0 ? (
                                <div className="px-6 py-10 text-center text-sm text-[#667781]">
                                    {conversations.length
                                        ? 'No conversations match your search.'
                                        : role === 'USER'
                                            ? 'No chats yet. Choose an accepted consultation to start one.'
                                            : 'No chats yet. Chats open once you accept a consultation.'}
                                    {!conversations.length && role === 'USER' && (
                                        <button type="button" onClick={() => setNewChatMode(true)} className="mt-3 block w-full font-semibold text-[#008069]">
                                            Choose an appointment
                                        </button>
                                    )}
                                    {!conversations.length && role === 'NUTRITIONIST' && (
                                        <button type="button" onClick={() => setNewChatMode(true)} className="mt-3 block w-full font-semibold text-[#008069]">
                                            Start a new chat
                                        </button>
                                    )}
                                </div>
                            ) : visibleConversations.map((item) => {
                                const peer = null;
                                const peerRole = peer?.role || (role === 'USER'
                                    ? item.nutritionistRole || 'NUTRITIONIST'
                                    : item.patientRole || 'USER');
                                const peerName = peer?.name || (role === 'USER' ? item.nutritionistName : item.patientName);
                                const peerEmail = peer?.email || (role === 'USER' ? item.nutritionistEmail : item.patientEmail);
                                const roleLabel = peerRole.toLowerCase();

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => openConversation(item.id)}
                                        className={`flex w-full items-center gap-3 border-b border-[#e4eae8] px-4 py-3 text-left transition hover:bg-[#edf3f1] ${String(item.id) === requestedConversationId ? 'bg-[#e6efec]' : ''}`}
                                    >
                                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dfe8df] font-semibold text-[#075e54]">
                                            {(peerName || (peerRole === 'NUTRITIONIST' ? 'N' : 'U')).slice(0, 1).toUpperCase()}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="truncate text-sm font-medium">
                                                    {peerName || 'Private conversation'}
                                                </span>
                                                <span className="shrink-0 text-[10px] text-[#667781]">
                                                    {item.status === 'ACTIVE' ? 'Active' : 'Ended'}
                                                </span>
                                            </span>
                                            <span className="mt-1 flex min-w-0 items-center gap-2">
                                                <span className="shrink-0 rounded-full bg-[#e6efec] px-2 py-0.5 text-[10px] font-semibold text-[#075e54]">
                                                    {roleLabel}
                                                </span>
                                                <span className="truncate text-xs text-[#667781]">
                                                    {peerEmail || (item.appointmentId ? 'Booked consultation' : 'Private consultation')}
                                                </span>
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                            {!newChatMode && loadingMoreConversations && (
                                <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#667781]">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d1d7db] border-t-[#008069]" />
                                    Loading older chats...
                                </div>
                            )}
                        </div>
                    </aside>
                    <div className={`${selected ? 'flex' : 'hidden sm:flex'} min-h-0 min-w-0 flex-1`}>
                        {selected ? (
                            <ConsultationChatModal
                                isOpen
                                embedded
                                onClose={closeChat}
                                currentUser={user}
                                targetPatient={targetPatient}
                                appointmentId={appointmentId}
                                conversationId={conversationId}
                            />
                        ) : (
                            <div className="hidden h-full flex-1 flex-col items-center justify-center border-b-4 border-[#00a884] bg-gradient-to-br from-[#eef3f1] to-[#e6eeeb] px-6 text-center sm:flex">
                                <div className="mb-6 flex h-44 w-44 items-center justify-center rounded-full bg-[#e2ebe7]">
                                    <span className="material-symbols-outlined text-[76px] text-[#aebfba]">forum</span>
                                </div>
                                <h2 className="text-3xl font-light text-[#41525d]">Your chats</h2>
                                <p className="mt-3 max-w-md text-sm leading-6 text-[#667781]">
                                    {role === 'USER'
                                        ? 'Select a conversation to continue chatting with your nutritionist, or choose an accepted consultation to start a chat.'
                                        : 'Select a conversation from the left to continue messaging a patient.'}
                                </p>
                                {role === 'USER' ? (
                                    <button type="button" onClick={() => setNewChatMode(true)} className="mt-6 rounded-full bg-[#008069] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#006f5b]">
                                        Choose an appointment
                                    </button>
                                ) : role === 'NUTRITIONIST' && (
                                    <button type="button" onClick={() => setNewChatMode(true)} className="mt-6 rounded-full bg-[#008069] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#006f5b]">
                                        Start a new chat
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="flex min-h-[70vh] items-center justify-center px-6 text-center text-sm text-white/60">
            Consultation chat is available to users and nutritionists.
        </main>
    );
};

export default ConsultationChatPage;
