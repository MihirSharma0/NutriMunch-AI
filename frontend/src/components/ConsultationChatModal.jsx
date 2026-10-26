import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import api, { API_BASE_URL } from '../api/axios';

const PAGE_SIZE = 40;
const MAX_MESSAGE_LENGTH = 4000;

const roleOf = (user) => String(user?.role || '').replace(/^ROLE_/i, '').toUpperCase();

const ConsultationChatModal = ({ isOpen, onClose, currentUser, targetPatient, appointmentId }) => {
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState(null);
    const endRef = useRef(null);
    const stompRef = useRef(null);
    const pendingRef = useRef(new Map());

    const resolvedAppointmentId = appointmentId || targetPatient?.appointmentId;
    const partnerName = useMemo(() => {
        if (roleOf(currentUser) === 'NUTRITIONIST') {
            return targetPatient?.name || targetPatient?.email || 'Patient';
        }
        return targetPatient?.nutritionistName || 'Nutritionist';
    }, [currentUser, targetPatient]);

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
        if (older) setLoadingOlder(true);
        else setLoading(true);
        try {
            const params = { limit: PAGE_SIZE };
            if (before) params.before = before;
            const response = await api.get(`/conversations/${conversationId}/messages`, { params });
            const history = response.data;
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

    useEffect(() => {
        if (!isOpen) return undefined;
        let cancelled = false;
        setConversation(null);
        setMessages([]);
        setCursor(null);
        setHasMore(false);
        setError('');
        setLoading(true);
        api.post('/conversations', {
            appointmentId: resolvedAppointmentId || null,
            participantId: targetPatient?.userId || targetPatient?.id || null,
        })
            .then((response) => {
                if (!cancelled) setConversation(response.data);
            })
            .catch((requestError) => {
                if (!cancelled) setError(requestError.response?.data?.message || 'Unable to open this consultation.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [isOpen, resolvedAppointmentId]);

    useEffect(() => {
        if (!conversation?.id) return undefined;
        loadHistory(conversation.id);
        const token = localStorage.getItem('token');
        const wsBase = API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
        const client = new Client({
            brokerURL: `${wsBase}/ws`,
            connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
            reconnectDelay: 3000,
            onConnect: () => {
                client.subscribe(`/topic/conversations/${conversation.id}`, (frame) => {
                    try { mergeMessage(JSON.parse(frame.body)); } catch (parseError) {
                        console.error('Invalid consultation message event', parseError);
                    }
                });
            },
            onStompError: () => setError('Live chat connection failed. Messages can still be retried.'),
            onWebSocketClose: () => setError('Live chat disconnected. Reconnecting...'),
        });
        client.activate();
        stompRef.current = client;
        return () => {
            client.deactivate();
            stompRef.current = null;
        };
    }, [conversation?.id, loadHistory, mergeMessage]);

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
            setError(requestError.response?.data?.message || 'Message failed to send. Please retry.');
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
            <section className="w-full max-w-2xl h-[80vh] bg-[#0b141a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <header className="flex items-center justify-between p-4 border-b border-white/10">
                    <div>
                        <h2 className="text-white font-bold">Consultation with {partnerName}</h2>
                        <p className="text-xs text-white/50">Secure consultation messaging</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-white/60 hover:text-white text-xl" aria-label="Close chat">×</button>
                </header>
                {error && <div className="px-4 py-2 text-sm text-amber-300 bg-amber-500/10 border-b border-amber-500/20">{error}</div>}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {hasMore && <button type="button" onClick={() => loadHistory(conversation.id, cursor, true)} disabled={loadingOlder} className="w-full text-xs text-[#a5d391]">{loadingOlder ? 'Loading...' : 'Load older messages'}</button>}
                    {loading && messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <div className="relative h-16 w-16">
                                <div className="absolute inset-0 rounded-full border-2 border-[#a5d391]/20" />
                                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#a5d391] animate-spin" />
                                <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-[#a5d391]">forum</span>
                                <div className="absolute -inset-2 rounded-full border border-cyan-400/20 animate-ping" />
                            </div>
                            <p className="text-sm text-white/60 animate-pulse">Connecting your consultation…</p>
                        </div>
                    )}
                    {!loading && messages.length === 0 && <p className="text-center text-white/50">No messages yet. Start the consultation.</p>}
                    {messages.map((message) => (
                        <div key={message.id} className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${String(message.senderId) === String(currentUser?.id) ? 'ml-auto bg-[#a5d391] text-black' : 'bg-white/10 text-white'}`}>
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            <span className="block text-[10px] opacity-60 mt-1">{message.pending ? 'Sending...' : new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    ))}
                    <div ref={endRef} />
                </div>
                <form onSubmit={sendMessage} className="p-3 border-t border-white/10 flex gap-2">
                    <textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={MAX_MESSAGE_LENGTH} rows={2} placeholder="Write a message..." className="flex-1 resize-none rounded-xl bg-white/10 text-white p-3 outline-none" disabled={!conversation || loading} />
                    <button type="submit" disabled={!input.trim() || sending || !conversation} className="self-end rounded-xl bg-[#a5d391] text-black font-bold px-4 py-3 disabled:opacity-40">{sending ? '...' : 'Send'}</button>
                </form>
            </section>
        </div>
    );
};

export default ConsultationChatModal;
