/**
 * Real-time Consultation Chat Modal
 * Telehealth chat interface supporting direct SSE streaming, historical pagination,
 * optimistic message updates, and consultation thread management.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { API_BASE_URL } from '../api/axios';

const PAGE_SIZE = 40;
const MAX_MESSAGE_LENGTH = 4000;

/**
 * Normalizes a user role string by stripping ROLE_ prefix and uppercasing.
 * 
 * @param {Object} user - User object
 * @returns {string} Clean role string
 */
const roleOf = (user) => String(user?.role || '').replace(/^ROLE_/i, '').toUpperCase();

/**
 * ConsultationChatModal Component
 * Live chat dialog between patients and certified nutritionists with real-time SSE updates.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Modal close callback
 * @param {Object} props.currentUser - Authenticated user context
 * @param {Object} [props.targetPatient] - Remote participant details
 * @param {number} [props.appointmentId] - Associated consultation appointment ID
 * @param {number} [props.conversationId] - Active conversation thread ID
 * @param {boolean} [props.embedded=false] - Whether embedded inline without dialog frame
 */
const ConsultationChatModal = ({ isOpen, onClose, currentUser, targetPatient, appointmentId, conversationId, embedded = false }) => {
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [sending, setSending] = useState(false);
    const [ending, setEnding] = useState(false);
    const [reopening, setReopening] = useState(false);
    const [error, setError] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('CONNECTING');
    const [connectionError, setConnectionError] = useState('');
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [streamRetryCount, setStreamRetryCount] = useState(0);
    const endRef = useRef(null);
    const pendingRef = useRef(new Map());

    const resolvedAppointmentId = appointmentId || targetPatient?.appointmentId;
    const participantId = targetPatient?.userId || targetPatient?.id || null;
    const currentUserRole = roleOf(currentUser);
    // Which chat states the server says this viewer may act on.
    const chatExpired = conversation?.status === 'EXPIRED';
    const chatClosed = conversation?.status === 'CLOSED';
    const chatUsable = Boolean(conversation?.canSend);

    const expiryLabel = useMemo(() => {
        if (!conversation?.expiresAt) return null;
        const when = new Date(conversation.expiresAt);
        if (Number.isNaN(when.getTime())) return null;
        return when.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    }, [conversation?.expiresAt]);

    // Opening the thread clears the badge and the aggregated chat notification.
    useEffect(() => {
        if (!isOpen || !conversation?.id || messages.length === 0) return;
        if (typeof conversation.id !== 'number') return;
        api.put(`/conversations/${conversation.id}/read`)
            .then(() => window.dispatchEvent(new Event('nutrimunch_notification')))
            .catch(() => {});
    }, [isOpen, conversation?.id, messages.length]);

    const partnerName = useMemo(() => {
        if (currentUserRole === 'NUTRITIONIST') {
            return targetPatient?.name || targetPatient?.email || null;
        }
        return targetPatient?.nutritionistName || null;
    }, [currentUserRole, targetPatient]);

    const mergeMessage = useCallback((message) => {
        setMessages((previous) => {
            const existingIndex = previous.findIndex((item) =>
                item.id === message.id ||
                (item.clientMessageId && item.clientMessageId === message.clientMessageId)
            );
            if (existingIndex < 0) return [...previous, message].sort((a, b) => a.id - b.id);
            const next = [...previous];
            next[existingIndex] = { ...next[existingIndex], ...message, pending: false };
            return next.sort((a, b) => a.id - b.id);
        });
        if (message.clientMessageId) pendingRef.current.delete(message.clientMessageId);
    }, []);

    const loadHistory = useCallback(async (conversationId, before = null, older = false) => {
        setError('');
        if (older) setLoadingOlder(true);
        else setLoading(true);
        try {
            const params = { limit: PAGE_SIZE };
            if (before) params.before = before;
            const response = await api.get(`/conversations/${conversationId}/messages`, { params });
            const history = response.data;
            setHistoryLoaded(true);
            setMessages((previous) => {
                const byId = new Map(previous.map((message) => [message.id, message]));
                (history.messages || []).forEach((message) => byId.set(message.id, message));
                return [...byId.values()].sort((a, b) => a.id - b.id);
            });
            setCursor(history.nextCursor || null);
            setHasMore(Boolean(history.nextCursor));
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to load consultation messages.');
        } finally {
            setLoading(false);
            setLoadingOlder(false);
        }
    }, []);

    const syncRecentHistory = useCallback(async (conversationId) => {
        const response = await api.get(`/conversations/${conversationId}/messages`, {
            params: { limit: PAGE_SIZE },
        });
        const history = response.data;
        setHistoryLoaded(true);
        setMessages((previous) => {
            const byId = new Map(previous.map((message) => [message.id, message]));
            (history.messages || []).forEach((message) => byId.set(message.id, message));
            return [...byId.values()].sort((a, b) => a.id - b.id);
        });
        setCursor(history.nextCursor || null);
        setHasMore(Boolean(history.nextCursor));
    }, []);

    useEffect(() => {
        if (!isOpen) return undefined;
        let cancelled = false;
        setConversation(null);
        setMessages([]);
        setHistoryLoaded(false);
        setCursor(null);
        setHasMore(false);
        setError('');
        setLoading(true);
        if (!conversationId && !resolvedAppointmentId && !(['NUTRITIONIST', 'ADMIN'].includes(currentUserRole) && participantId)) {
            setError('Open a consultation or choose a recipient to start messaging.');
            setLoading(false);
            return undefined;
        }
        const conversationRequest = conversationId
            ? api.get(`/conversations/${conversationId}`)
            : api.post('/conversations', {
                appointmentId: resolvedAppointmentId || null,
                participantId,
            });
        conversationRequest
            .then(async (response) => {
                if (cancelled) return;
                setConversation(response.data);
                await loadHistory(response.data.id);
            })
            .catch((requestError) => {
                if (!cancelled) {
                    setError(requestError.response?.data?.message || 'Unable to open this consultation.');
                    setLoading(false);
                }
            });
        return () => { cancelled = true; };
    }, [isOpen, resolvedAppointmentId, participantId, currentUserRole, conversationId, retryCount, loadHistory]);

    useEffect(() => {
        if (!conversation?.id) return undefined;
        const controller = new AbortController();
        const token = localStorage.getItem('token');
        let retryDelay = 1000;
        setConnectionStatus('CONNECTING');
        setConnectionError('');

        const connect = async () => {
            while (!controller.signal.aborted) {
                try {
                    const response = await fetch(`${API_BASE_URL}/conversations/${conversation.id}/events`, {
                        headers: {
                            Accept: 'text/event-stream',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        cache: 'no-cache',
                        signal: controller.signal,
                    });
                    if (!response.ok) {
                        if ([401, 403, 404].includes(response.status)) {
                            setConnectionStatus('ERROR');
                            setConnectionError(
                                response.status === 401
                                    ? 'Your session expired. Sign in again to receive live chat messages.'
                                    : 'You no longer have access to this chat stream.'
                            );
                            return;
                        }
                        throw new Error(`Chat event stream request failed (${response.status})`);
                    }
                    if (!response.body) throw new Error('This browser does not support chat event streams.');

                    setConnectionStatus('CONNECTED');
                    setConnectionError('');
                    retryDelay = 1000;
                    try {
                        await syncRecentHistory(conversation.id);
                    } catch (historyError) {
                        console.error('Unable to sync messages after reconnecting', historyError);
                    }
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    while (!controller.signal.aborted) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n');
                        const frames = buffer.split('\n\n');
                        buffer = frames.pop() || '';
                        for (const frame of frames) {
                            let eventName = 'message';
                            const data = [];
                            for (const line of frame.split('\n')) {
                                if (line.startsWith('event:')) eventName = line.slice(6).trim();
                                if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
                            }
                            if (data.length === 0) continue;
                            try {
                                const eventData = JSON.parse(data.join('\n'));
                                if (eventName === 'message') mergeMessage(eventData);
                                if (eventName === 'status' && eventData.status) {
                                    setConversation((current) => current ? { ...current, status: eventData.status } : current);
                                }
                            } catch (parseError) {
                                console.error('Invalid chat event stream payload', parseError);
                            }
                        }
                    }
                    if (!controller.signal.aborted) throw new Error('The chat event stream ended unexpectedly.');
                } catch (streamError) {
                    if (controller.signal.aborted) return;
                    console.warn('Chat event stream disconnected', streamError);
                    setConnectionStatus('RECONNECTING');
                    setConnectionError(`${streamError.message || 'Live chat disconnected.'} Reconnecting...`);
                    await new Promise((resolve) => setTimeout(resolve, retryDelay));
                    retryDelay = Math.min(retryDelay * 2, 15000);
                }
            }
        };

        connect();
        return () => controller.abort();
    }, [conversation?.id, mergeMessage, streamRetryCount, syncRecentHistory]);

    useEffect(() => {
        if (conversation?.id) {
            api.put(`/conversations/${conversation.id}/read`).catch(() => {});
        }
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation?.id, messages.length]);

    const sendMessage = async (event) => {
        event?.preventDefault();
        const content = input.trim();
        if (!conversation?.id || !content || content.length > MAX_MESSAGE_LENGTH || sending) return;
        const clientMessageId = crypto.randomUUID();
        const optimistic = {
            id: `pending-${clientMessageId}`,
            senderId: currentUser?.id,
            content,
            clientMessageId,
            createdAt: new Date().toISOString(),
            pending: true,
        };
        pendingRef.current.set(clientMessageId, optimistic);
        setMessages((previous) => [...previous, optimistic]);
        setInput('');
        setSending(true);
        try {
            const response = await api.post(`/conversations/${conversation.id}/messages`, {
                content,
                clientMessageId,
            });
            mergeMessage(response.data);
        } catch (requestError) {
            pendingRef.current.delete(clientMessageId);
            setMessages((previous) => previous.filter((message) => message.clientMessageId !== clientMessageId));
            setInput(content);
            if (requestError.response?.status === 410) {
                setError('This consultation chat has expired. The nutritionist can reopen it, or book a new consultation.');
                setRetryCount((count) => count + 1);
            } else if (requestError.response?.status === 409) {
                setError(requestError.response?.data?.message || 'This consultation chat has ended.');
                setRetryCount((count) => count + 1);
            } else {
                setError(requestError.response?.data?.message || 'Message failed to send. Please retry.');
            }
        } finally {
            setSending(false);
        }
    };

    const endChat = async () => {
        if (!conversation?.id || ending) return;
        setEnding(true);
        setError('');
        try {
            const response = await api.put(`/conversations/${conversation.id}/end`);
            setConversation(response.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to end this consultation.');
        } finally {
            setEnding(false);
        }
    };

    const reopenChat = async () => {
        if (!conversation?.id || reopening) return;
        setReopening(true);
        setError('');
        try {
            const response = await api.put(`/conversations/${conversation.id}/reopen`);
            setConversation(response.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to reopen this consultation.');
        } finally {
            setReopening(false);
        }
    };

    const reconnectChat = () => {
        setConnectionStatus('CONNECTING');
        setConnectionError('');
        setStreamRetryCount((count) => count + 1);
    };

    if (!isOpen) return null;
    return (
        <div
            className={embedded
                ? 'flex h-full min-h-0 min-w-0 flex-1'
                : 'fixed inset-0 z-[99999] flex items-center justify-center bg-[#0b141a]/70 p-0 backdrop-blur-sm sm:p-4'}
            onClick={(event) => !embedded && event.target === event.currentTarget && onClose?.()}
        >
            <section className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#efeae2] shadow-2xl ${embedded ? '' : 'animate-fadeIn sm:h-[min(90vh,900px)] sm:max-w-5xl sm:rounded-xl'}`}>
                <header className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-[#d1d7db] bg-[#f0f2f5] px-3 py-2.5 sm:px-5 sm:py-3">
                    <div className="flex min-w-0 items-center gap-3">
                        {embedded && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#54656f] transition hover:bg-[#e9edef] sm:hidden"
                                aria-label="Back to chats"
                            >
                                <span className="material-symbols-outlined">arrow_back</span>
                            </button>
                        )}
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dfe8df] font-bold text-[#075e54]">
                            {(partnerName || 'C').slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                        {loading ? (
                            <>
                                <div className="h-4 w-48 rounded-full bg-white/10 animate-pulse" />
                                <div className="h-3 w-32 rounded-full bg-white/5 mt-2 animate-pulse" />
                            </>
                        ) : (
                            <>
                                <h2 className="truncate font-semibold text-[#111b21]">{partnerName || 'Consultation'}</h2>
                                <p className="text-xs text-[#667781]">
                                    {chatExpired
                                        ? 'Chat expired'
                                        : chatClosed
                                            ? 'Chat ended'
                                            : connectionStatus === 'CONNECTED'
                                                ? (expiryLabel ? `Secure consultation · open until ${expiryLabel}` : 'Secure consultation')
                                                : 'Connecting...'}
                                </p>
                            </>
                        )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {currentUserRole === 'NUTRITIONIST' && conversation?.status === 'ACTIVE' && (
                            <button
                                type="button"
                                onClick={endChat}
                                disabled={ending}
                                className="rounded-full border border-[#d1d7db] px-3 py-2 text-xs font-semibold text-[#54656f] transition hover:bg-[#e9edef] disabled:opacity-50"
                            >
                                {ending ? 'Ending...' : 'End chat'}
                            </button>
                        )}
                        {currentUserRole === 'NUTRITIONIST' && conversation?.canReopen && (
                            <button
                                type="button"
                                onClick={reopenChat}
                                disabled={reopening}
                                className="rounded-full bg-[#00a884] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#008f72] disabled:opacity-50"
                            >
                                {reopening ? 'Reopening...' : 'Reopen chat'}
                            </button>
                        )}
                        {!embedded && (
                            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-[#54656f] transition hover:bg-[#e9edef] hover:text-[#111b21]" aria-label="Close chat">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        )}
                    </div>
                </header>
                {error && <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">{error}</div>}
                {connectionStatus !== 'CONNECTED' && (
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                        <span>{connectionError || (connectionStatus === 'CONNECTING' ? 'Connecting to live chat...' : 'Reconnecting to live chat...')}</span>
                        {(connectionStatus === 'ERROR' || connectionStatus === 'RECONNECTING') && (
                            <button
                                type="button"
                                onClick={reconnectChat}
                                className="shrink-0 rounded-md border border-amber-700/20 px-2.5 py-1 text-xs font-bold hover:bg-amber-100"
                            >
                                Retry connection
                            </button>
                        )}
                    </div>
                )}
                {(chatExpired || chatClosed) && (
                    <div className="shrink-0 border-b border-[#e9edef] bg-[#f0f2f5] px-4 py-3 text-sm text-[#54656f]">
                        {chatExpired
                            ? (currentUserRole === 'NUTRITIONIST'
                                ? `This chat expired${expiryLabel ? ` on ${expiryLabel}` : ''}. Reopen it to continue (${conversation?.reopenCount ?? 0}/3 reopens used).`
                                : `This consultation chat expired${expiryLabel ? ` on ${expiryLabel}` : ''}. Your nutritionist can reopen it, or you can book a new consultation.`)
                            : (currentUserRole === 'NUTRITIONIST'
                                ? 'This chat has ended. Reopen it to continue the conversation.'
                                : 'The nutritionist has ended this chat. You can view previous messages, but sending is disabled.')}
                    </div>
                )}
                {error && !loading && (
                    <button
                        type="button"
                        onClick={() => conversation ? loadHistory(conversation.id) : setRetryCount((count) => count + 1)}
                        className="shrink-0 px-4 py-2 text-left text-xs font-semibold text-[#008069] hover:text-[#075e54]"
                    >
                        Retry
                    </button>
                )}
                <div className="chat-scroll min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[#efeae2] p-3 sm:p-6 [background-image:radial-gradient(rgba(84,101,111,0.10)_0.7px,transparent_0.7px)] [background-size:18px_18px]">
                    {loading && messages.length === 0 ? (
                        <div className="h-full min-h-[300px] flex flex-col items-center justify-center gap-6">
                            <div className="relative h-20 w-20">
                                <div className="absolute inset-0 rounded-full border border-[#008069]/20 animate-ping" />
                                <div className="absolute inset-2 rounded-full border-2 border-[#d1d7db] border-t-[#008069] animate-spin" />
                                <div className="absolute inset-5 flex items-center justify-center rounded-full bg-[#008069]/10">
                                    <span className="material-symbols-outlined text-2xl text-[#008069]">forum</span>
                                </div>
                            </div>
                            <div className="w-full max-w-sm space-y-4">
                                <p className="animate-pulse text-center text-sm font-medium text-[#54656f]">Opening your secure consultation</p>
                                <div className="space-y-3">
                                    <div className="h-10 w-2/3 animate-pulse rounded-2xl rounded-tl-sm bg-white" />
                                    <div className="ml-auto h-10 w-3/5 animate-pulse rounded-2xl rounded-tr-sm bg-[#d9fdd3]" />
                                    <div className="h-10 w-1/2 animate-pulse rounded-2xl rounded-tl-sm bg-white" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {hasMore && <button type="button" onClick={() => loadHistory(conversation.id, cursor, true)} disabled={loadingOlder} className="w-full text-xs font-medium text-[#008069]">{loadingOlder ? 'Loading...' : 'Load older messages'}</button>}
                            {historyLoaded && messages.length === 0 && <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center"><span className="material-symbols-outlined mb-2 text-3xl text-[#8696a0]">forum</span><p className="text-sm text-[#54656f]">No messages yet</p><p className="mt-1 text-xs text-[#8696a0]">Start the consultation with a message.</p></div>}
                            {messages.map((message) => {
                                const fromCurrentUser = String(message.senderId) === String(currentUser?.id);
                                return (
                                    <div
                                        key={message.id}
                                        className={`max-w-[88%] px-3 py-2 text-sm text-[#111b21] shadow-[0_1px_1px_rgba(11,20,26,0.13)] sm:max-w-[75%] ${
                                            fromCurrentUser
                                                ? 'ml-auto rounded-2xl rounded-tr-sm bg-[#d9fdd3]'
                                                : 'rounded-2xl rounded-tl-sm bg-white'
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                        <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#667781]">
                                            {message.pending
                                                ? 'Sending...'
                                                : new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {fromCurrentUser && (
                                                <span className="material-symbols-outlined text-[14px] text-[#53bdeb]" aria-label={message.pending ? 'Sending' : 'Sent'}>
                                                    {message.pending ? 'schedule' : 'done_all'}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                            <div ref={endRef} />
                        </>
                    )}
                </div>
                <form onSubmit={sendMessage} className="flex shrink-0 items-end gap-2 bg-[#f0f2f5] px-3 py-2.5 sm:gap-3 sm:px-5">
                    <textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={MAX_MESSAGE_LENGTH} rows={1} placeholder={chatExpired ? 'This chat has expired' : chatClosed ? 'This chat has ended' : 'Type a message'} className="min-h-12 max-h-32 flex-1 resize-y rounded-3xl border border-transparent bg-white px-4 py-3.5 text-[#111b21] outline-none placeholder:text-[#667781] focus:border-[#d1d7db]" disabled={!conversation || loading || !chatUsable} />
                    <button type="submit" aria-label="Send message" disabled={!input.trim() || sending || !conversation || !chatUsable} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#008f72] disabled:opacity-40">
                        <span className="material-symbols-outlined text-xl">{sending ? 'hourglass_top' : 'send'}</span>
                    </button>
                </form>
            </section>
        </div>
    );
};

export default ConsultationChatModal;
