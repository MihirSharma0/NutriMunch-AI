import React, { useState, useEffect, useRef } from 'react';
import api, { API_BASE_URL } from '../api/axios';

const DEFAULT_PATIENTS = [
    { id: "442", userId: "442", name: "David Miller", email: "david.m@example.com", goal: "Diabetes Management" },
    { id: "8472", userId: "8472", name: "Marcus Chen", email: "marcus.c@example.com", goal: "Lipid Oxidation & Endurance" },
    { id: "102", userId: "102", name: "Elena Rodriguez", email: "elena.r@example.com", goal: "Hormonal Balance & PCOS" },
    { id: "553", userId: "553", name: "James Wilson", email: "james.w@example.com", goal: "Cardiovascular Health" }
];

const ConsultationChatModal = ({ isOpen, onClose, currentUser, targetPatient }) => {
    // Bulletproof User resolution (prop -> localStorage fallback)
    const activeUser = currentUser || (() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch (e) {
            return {};
        }
    })();

    // Robust Role Detection (handles Spring Security ROLE_ prefix, single/multiple roles, and token authorities)
    const rawRole = String(
        activeUser?.role || 
        activeUser?.roles?.[0] || 
        (Array.isArray(activeUser?.authorities) ? activeUser.authorities[0]?.authority : '') ||
        activeUser?.authority ||
        activeUser?.userType || 
        ''
    ).toUpperCase().replace('ROLE_', '').trim();
    
    const isNutritionist = rawRole.includes('NUTRITIONIST') || rawRole.includes('DIETITIAN') || rawRole.includes('ADMIN');

    // Patient roster for Nutritionist view
    const [patientList, setPatientList] = useState(DEFAULT_PATIENTS);
    const [selectedPatient, setSelectedPatient] = useState(targetPatient || DEFAULT_PATIENTS[0]);

    // Update selected patient if prop changes
    useEffect(() => {
        if (targetPatient) {
            setSelectedPatient(targetPatient);
        }
    }, [targetPatient]);

    // Fetch real platform users for Nutritionist
    useEffect(() => {
        if (isNutritionist && isOpen) {
            api.get('/admin/all-user-profiles')
                .then(res => {
                    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                        const fetched = res.data.map(p => ({
                            id: String(p.userId || p.id),
                            userId: String(p.userId || p.id),
                            name: p.firstName || p.lastName ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : (p.email ? p.email.split('@')[0] : 'Patient User'),
                            email: p.email || 'patient@nutrimunch.com',
                            goal: p.goal || 'General Health & Nutrition'
                        }));
                        setPatientList(fetched);
                        if (!targetPatient && fetched.length > 0) {
                            setSelectedPatient(fetched[0]);
                        }
                    }
                })
                .catch(() => {});
        }
    }, [isNutritionist, isOpen, targetPatient]);

    // Determine active patient ID and names
    const patientId = isNutritionist
        ? String(selectedPatient?.userId || selectedPatient?.id || '442')
        : String(activeUser?.userId || activeUser?.id || 'me');

    const patientName = isNutritionist
        ? (selectedPatient?.name || selectedPatient?.firstName || 'Patient')
        : (activeUser?.firstName ? `${activeUser.firstName} ${activeUser.lastName || ''}`.trim() : (activeUser?.name || 'Patient'));

    const dietitianName = isNutritionist
        ? (activeUser?.firstName ? `${activeUser.firstName} ${activeUser.lastName || ''}`.trim() : (activeUser?.name || 'Dietitian Mihir Sharma'))
        : (selectedPatient?.dietitianName || targetPatient?.dietitianName || 'Dietitian Mihir Sharma');

    const [messages, setMessages] = useState([]);
    const [sessionStatus, setSessionStatus] = useState('NOT_STARTED'); // 'NOT_STARTED', 'ACTIVE', 'ENDED'
    const [inputText, setInputText] = useState('');
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [requestPingSent, setRequestPingSent] = useState(false);
    const messagesEndRef = useRef(null);
    const activeKeyRef = useRef(null);

    // Load Chat Session with unified resolution
    const loadChatSession = () => {
        try {
            const allChats = JSON.parse(localStorage.getItem('nutrimunch_consultation_chats') || '{}');
            let currentSession = null;
            let resolvedKey = null;

            if (isNutritionist) {
                const targetId = String(selectedPatient?.userId || selectedPatient?.id || patientId);
                const targetEmail = selectedPatient?.email?.toLowerCase();
                
                if (allChats[targetId]) {
                    currentSession = allChats[targetId];
                    resolvedKey = targetId;
                } else if (targetEmail && allChats[targetEmail]) {
                    currentSession = allChats[targetEmail];
                    resolvedKey = targetEmail;
                } else if (allChats['nutrimunch_active_consultation']) {
                    currentSession = allChats['nutrimunch_active_consultation'];
                    resolvedKey = 'nutrimunch_active_consultation';
                }
            } else {
                // Patient session resolution:
                const myId = String(activeUser?.userId || activeUser?.id || '');
                const myEmail = activeUser?.email?.toLowerCase();
                const myName = (activeUser?.firstName ? `${activeUser.firstName} ${activeUser.lastName || ''}`.trim() : (activeUser?.name || '')).toLowerCase();

                // 1. Direct key matches
                if (myId && allChats[myId]) {
                    currentSession = allChats[myId];
                    resolvedKey = myId;
                } else if (myEmail && allChats[myEmail]) {
                    currentSession = allChats[myEmail];
                    resolvedKey = myEmail;
                } else if (allChats['nutrimunch_active_consultation']) {
                    currentSession = allChats['nutrimunch_active_consultation'];
                    resolvedKey = 'nutrimunch_active_consultation';
                } else if (allChats['me']) {
                    currentSession = allChats['me'];
                    resolvedKey = 'me';
                }

                // 2. Scan all sessions for email, id, or name
                if (!currentSession) {
                    const sessionEntries = Object.entries(allChats);
                    for (const [k, s] of sessionEntries) {
                        if (!s) continue;
                        if (myId && String(s.patientId) === myId) {
                            currentSession = s;
                            resolvedKey = k;
                            break;
                        }
                        if (myEmail && s.patientEmail?.toLowerCase() === myEmail) {
                            currentSession = s;
                            resolvedKey = k;
                            break;
                        }
                        if (myName && s.patientName?.toLowerCase() === myName) {
                            currentSession = s;
                            resolvedKey = k;
                            break;
                        }
                    }
                }

                // 3. Fallback to global active consultation or last session
                if (!currentSession) {
                    const sessionList = Object.values(allChats);
                    if (sessionList.length > 0) {
                        currentSession = sessionList[sessionList.length - 1];
                        resolvedKey = 'nutrimunch_active_consultation';
                    }
                }
            }

            activeKeyRef.current = resolvedKey;

            if (currentSession) {
                setSessionStatus(currentSession.sessionStatus || 'NOT_STARTED');
                setMessages(currentSession.messages || []);
            } else {
                setSessionStatus('NOT_STARTED');
                setMessages([]);
            }
        } catch (e) {
            console.error('Error loading consultation chat:', e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadChatSession();
        }
    }, [isOpen, patientId, isNutritionist, selectedPatient]);

    // Real-time synchronization via BroadcastChannel, storage events, custom events, and fast interval
    useEffect(() => {
        if (!isOpen) return;

        let bc;
        try {
            bc = new BroadcastChannel('nutrimunch_consultation_chat_channel');
            bc.onmessage = () => {
                loadChatSession();
            };
        } catch (e) {}

        const handleUpdate = () => loadChatSession();
        window.addEventListener('nutrimunch_chat_updated', handleUpdate);
        window.addEventListener('storage', handleUpdate);

        // Active polling every 1.5 seconds for instant multi-tab sync
        const pollInterval = setInterval(() => {
            loadChatSession();
        }, 1500);

        return () => {
            if (bc) bc.close();
            clearInterval(pollInterval);
            window.removeEventListener('nutrimunch_chat_updated', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, [isOpen, patientId, isNutritionist, selectedPatient]);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sessionStatus]);

    // Universal Save helper ensuring bidirectional sync across all keys
    const saveSession = (status, updatedMessages) => {
        try {
            const allChats = JSON.parse(localStorage.getItem('nutrimunch_consultation_chats') || '{}');
            const targetPatientId = isNutritionist
                ? String(selectedPatient?.userId || selectedPatient?.id || patientId)
                : String(activeUser?.userId || activeUser?.id || patientId || 'me');

            const targetEmail = isNutritionist
                ? (selectedPatient?.email || '')
                : (activeUser?.email || '');

            const sessionData = {
                patientId: targetPatientId,
                patientEmail: targetEmail,
                patientName: patientName,
                dietitianName: dietitianName,
                sessionStatus: status,
                updatedAt: new Date().toISOString(),
                messages: updatedMessages
            };

            // Write to all relevant keys so both sides always locate the exact same session
            allChats[targetPatientId] = sessionData;
            if (targetEmail) {
                allChats[targetEmail.toLowerCase()] = sessionData;
            }
            if (activeKeyRef.current) {
                allChats[activeKeyRef.current] = sessionData;
            }
            allChats['nutrimunch_active_consultation'] = sessionData;
            allChats['me'] = sessionData;

            localStorage.setItem('nutrimunch_consultation_chats', JSON.stringify(allChats));
            localStorage.setItem('nutrimunch_active_consultation_status', status);

            // Broadcast real-time update
            try {
                const bc = new BroadcastChannel('nutrimunch_consultation_chat_channel');
                bc.postMessage({ type: 'CHAT_STATE_CHANGED', patientId: targetPatientId, status: status, timestamp: Date.now() });
                bc.close();
            } catch (err) {}

            window.dispatchEvent(new Event('nutrimunch_chat_updated'));
            window.dispatchEvent(new Event('storage'));
        } catch (e) {
            console.error('Error saving chat session:', e);
        }
    };

    // Nutritionist Initiates Chat
    const handleInitiateChat = () => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const initMessage = {
            id: `sys_${Date.now()}`,
            sender: 'system',
            text: `Consultation chat session initiated by Dietitian ${dietitianName}. Real-time communication channel is now active.`,
            time: timestamp
        };

        const updated = messages.length > 0 ? [...messages, initMessage] : [
            {
                id: `msg_welcome_${Date.now()}`,
                sender: 'nutritionist',
                senderName: dietitianName,
                text: `Hello ${patientName}, I've initiated your live clinical consultation chat. How are you progressing with your nutrition and daily macro targets?`,
                time: timestamp
            }
        ];

        setSessionStatus('ACTIVE');
        setMessages(updated);
        saveSession('ACTIVE', updated);

        // Notify user via platform notification toast
        try {
            const chatNotification = {
                id: `chat_notif_${Date.now()}`,
                title: `Live Consultation Chat Initiated`,
                message: `Dietitian ${dietitianName} has opened an active consultation chat with you.`,
                time: 'Just now',
                icon: 'forum',
                type: 'CONSULTATION_CHAT',
                targetUserId: patientId,
                read: false
            };
            const existingNotifs = JSON.parse(localStorage.getItem('nutrimunch_user_notifications') || '[]');
            localStorage.setItem('nutrimunch_user_notifications', JSON.stringify([chatNotification, ...existingNotifs]));
            window.dispatchEvent(new Event('nutrimunch_notification_added'));
        } catch (e) {}
    };

    // Patient sends consultation request to nutritionist
    const handleSendPatientRequest = () => {
        setRequestPingSent(true);
        try {
            const notif = {
                id: `req_notif_${Date.now()}`,
                title: `Consultation Chat Requested`,
                message: `Patient ${patientName} has requested you to initiate a live consultation chat session.`,
                time: 'Just now',
                icon: 'forum',
                type: 'CONSULTATION_REQUEST',
                read: false
            };
            const existingNotifs = JSON.parse(localStorage.getItem('nutrimunch_user_notifications') || '[]');
            localStorage.setItem('nutrimunch_user_notifications', JSON.stringify([notif, ...existingNotifs]));
            window.dispatchEvent(new Event('nutrimunch_notification_added'));
            window.dispatchEvent(new Event('storage'));
        } catch (e) {}
        setTimeout(() => setRequestPingSent(false), 5000);
    };

    // Nutritionist Ends Chat
    const handleEndChat = () => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endMessage = {
            id: `sys_end_${Date.now()}`,
            sender: 'system',
            text: `Consultation session concluded by Dietitian ${dietitianName} at ${timestamp}. The session history is archived.`,
            time: timestamp
        };

        const updated = [...messages, endMessage];
        setSessionStatus('ENDED');
        setMessages(updated);
        setShowEndConfirm(false);
        saveSession('ENDED', updated);
    };

    // Send Message
    const handleSendMessage = (e) => {
        e?.preventDefault();
        if (!inputText.trim()) return;
        if (sessionStatus !== 'ACTIVE') return;

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newMessage = {
            id: `msg_${Date.now()}`,
            sender: isNutritionist ? 'nutritionist' : 'user',
            senderName: isNutritionist ? dietitianName : patientName,
            text: inputText.trim(),
            time: timestamp
        };

        const updated = [...messages, newMessage];
        setMessages(updated);
        setInputText('');
        saveSession('ACTIVE', updated);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-start pt-24 sm:pt-28 pb-6 px-3 sm:px-4 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
            <div className="relative w-full max-w-2xl bg-[#080b12] border border-[#a5d391]/40 rounded-[2.5rem] shadow-[0_0_80px_rgba(165,211,145,0.25)] flex flex-col h-[76vh] max-h-[calc(100vh-8.5rem)] overflow-hidden shrink-0 my-auto sm:my-0">
                
                {/* Header */}
                <div className="px-5 sm:px-6 py-4 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-[#a5d391]/20 border border-[#a5d391]/40 flex items-center justify-center text-[#a5d391] shadow-inner shrink-0">
                            <span className="material-symbols-outlined text-2xl">forum</span>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm sm:text-base font-bold text-white font-hero-display truncate">
                                    {isNutritionist ? `Consultation with ${patientName}` : `Clinical Consultation with ${dietitianName}`}
                                </h3>
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                    sessionStatus === 'ACTIVE'
                                        ? 'bg-[#a5d391]/20 text-[#a5d391] border-[#a5d391]/40 animate-pulse'
                                        : sessionStatus === 'ENDED'
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        : 'bg-white/10 text-white/50 border-white/10'
                                }`}>
                                    {sessionStatus === 'ACTIVE' ? 'Live Session' : sessionStatus === 'ENDED' ? 'Concluded' : 'Pending Start'}
                                </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-white/50 truncate">
                                {isNutritionist 
                                    ? `Patient ID: #${patientId} • Goal: ${selectedPatient?.goal || 'Metabolic Optimization'}` 
                                    : `Certified Nutritionist • Real-time clinical guidance`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {/* Nutritionist Actions */}
                        {isNutritionist && (
                            <>
                                {sessionStatus === 'ACTIVE' ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowEndConfirm(true)}
                                        className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                                        title="End consultation chat session"
                                    >
                                        <span className="material-symbols-outlined text-sm">cancel</span>
                                        <span>End Chat</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleInitiateChat}
                                        className="bg-[#a5d391] hover:bg-white text-black font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_20px_rgba(165,211,145,0.4)]"
                                    >
                                        <span className="material-symbols-outlined text-sm">play_arrow</span>
                                        <span>{sessionStatus === 'ENDED' ? 'Re-open Chat' : 'Initiate Chat'}</span>
                                    </button>
                                )}
                            </>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>

                {/* Patient Selector Bar for Nutritionist */}
                {isNutritionist && patientList.length > 1 && (
                    <div className="px-5 sm:px-6 py-2 bg-black/60 border-b border-white/10 flex items-center gap-2 overflow-x-auto shrink-0 custom-scrollbar">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 whitespace-nowrap">Select Patient:</span>
                        {patientList.map((p) => {
                            const isSelected = String(p.userId || p.id) === String(patientId);
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setSelectedPatient(p)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                        isSelected
                                            ? 'bg-[#a5d391] text-black shadow-md'
                                            : 'bg-white/5 hover:bg-white/15 text-white/70 border border-white/10'
                                    }`}
                                >
                                    <span>{p.name}</span>
                                    <span className="text-[9px] opacity-70">#{p.id}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Session Status Notice Banner */}
                {sessionStatus === 'ACTIVE' && (
                    <div className="bg-[#a5d391]/10 border-b border-[#a5d391]/20 px-6 py-2 flex items-center justify-between text-xs text-[#a5d391]">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#a5d391] animate-ping"></span>
                            <span className="font-semibold">Consultation in session. Both parties can exchange real-time messages.</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#a5d391]/70">Active</span>
                    </div>
                )}

                {sessionStatus === 'ENDED' && (
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-300">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-amber-400">lock</span>
                            <span className="font-semibold">
                                {isNutritionist 
                                    ? 'Session concluded. Click "Re-open Chat" above anytime to resume two-way communication.' 
                                    : 'Consultation concluded by Dietitian. History is archived. Only your Dietitian can initiate a new session.'}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 px-2 py-0.5 rounded-full">Archived</span>
                    </div>
                )}

                {sessionStatus === 'NOT_STARTED' && (
                    <div className="bg-white/5 border-b border-white/10 px-6 py-2.5 flex items-center justify-between text-xs text-white/60">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-[#a5d391]">info</span>
                            <span>
                                {isNutritionist 
                                    ? `Chat not yet initiated with ${patientName}. Click "Initiate Chat" to start.` 
                                    : 'Awaiting your Dietitian to initiate a consultation chat session.'}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                            {isNutritionist ? 'Action Required' : 'Read-Only'}
                        </span>
                    </div>
                )}

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent via-[#0d131f]/40 to-[#080b12]">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 my-auto">
                            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-[#a5d391]">
                                <span className="material-symbols-outlined text-3xl">chat_bubble_outline</span>
                            </div>
                            <h4 className="text-lg font-bold text-white font-hero-display">
                                {sessionStatus === 'NOT_STARTED' && isNutritionist
                                    ? `Initiate Chat with ${patientName}`
                                    : 'No Messages Yet'}
                            </h4>
                            <p className="text-xs text-white/50 max-w-md">
                                {isNutritionist
                                    ? `As the certified nutritionist, only you can initiate this consultation chat. Click below to open live messaging with ${patientName}.`
                                    : 'Your certified dietitian will initiate a chat session when review or follow-up is scheduled. You can also ping your dietitian below.'}
                            </p>
                            {isNutritionist && sessionStatus === 'NOT_STARTED' && (
                                <button
                                    type="button"
                                    onClick={handleInitiateChat}
                                    className="mt-2 bg-[#a5d391] hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider px-6 py-3 rounded-full transition-all shadow-[0_0_25px_rgba(165,211,145,0.4)] cursor-pointer flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm font-bold">play_arrow</span>
                                    <span>Initiate Consultation Chat Now</span>
                                </button>
                            )}
                            {!isNutritionist && sessionStatus === 'NOT_STARTED' && (
                                <button
                                    type="button"
                                    onClick={handleSendPatientRequest}
                                    disabled={requestPingSent}
                                    className="mt-2 bg-[#a5d391]/20 hover:bg-[#a5d391]/30 text-[#a5d391] border border-[#a5d391]/40 font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-full transition-all cursor-pointer flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm font-bold">notifications_active</span>
                                    <span>{requestPingSent ? 'Notification Dispatched to Dietitian' : 'Notify Dietitian to Open Live Chat'}</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        messages.map((msg) => {
                            if (msg.sender === 'system') {
                                return (
                                    <div key={msg.id} className="text-center my-3">
                                        <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/50 font-medium">
                                            {msg.text}
                                        </span>
                                    </div>
                                );
                            }

                            const isMe = isNutritionist ? msg.sender === 'nutritionist' : msg.sender === 'user';
                            const isDietitianMsg = msg.sender === 'nutritionist';

                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-1.5 mb-1 px-1">
                                        <span className="text-[11px] font-bold text-white/70">{msg.senderName}</span>
                                        {isDietitianMsg && (
                                            <span className="text-[9px] font-black uppercase tracking-wider text-[#a5d391] bg-[#a5d391]/15 px-1.5 py-0.2 rounded border border-[#a5d391]/30">
                                                Dietitian
                                            </span>
                                        )}
                                        <span className="text-[10px] text-white/40">{msg.time}</span>
                                    </div>
                                    <div className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                                        isMe 
                                            ? 'bg-[#a5d391] text-black font-medium rounded-tr-none shadow-lg' 
                                            : isDietitianMsg 
                                                ? 'bg-[#0d131f] border border-[#a5d391]/40 text-white rounded-tl-none shadow-md' 
                                                : 'bg-white/10 border border-white/10 text-white rounded-tl-none shadow-md'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Action Chips for Nutritionist */}
                {isNutritionist && sessionStatus === 'ACTIVE' && (
                    <div className="px-6 py-2 bg-black/40 border-t border-white/5 flex items-center gap-2 overflow-x-auto shrink-0 custom-scrollbar">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 whitespace-nowrap">Quick Notes:</span>
                        {[
                            'Reviewed your weekly adherence. Keep hydration high!',
                            'I updated your Daily Macro Requirements. Please link them.',
                            'Please log your water intake consistently.',
                            'Schedule our upcoming bi-weekly consultation.'
                        ].map((chip, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setInputText(chip)}
                                className="whitespace-nowrap px-3 py-1 rounded-full bg-white/5 hover:bg-[#a5d391]/20 hover:text-[#a5d391] border border-white/10 text-[11px] text-white/70 transition-all cursor-pointer"
                            >
                                {chip}
                            </button>
                        ))}
                    </div>
                )}

                {/* Footer Input Area */}
                <div className="p-4 sm:p-5 border-t border-white/10 bg-white/5 shrink-0">
                    {sessionStatus === 'ACTIVE' ? (
                        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={isNutritionist ? `Message ${patientName}...` : "Type your message to dietitian..."}
                                className="flex-1 bg-[#080b12] border border-white/15 focus:border-[#a5d391] text-white text-xs sm:text-sm px-4 py-3 rounded-2xl outline-none transition-all placeholder:text-white/40"
                            />
                            <button
                                type="submit"
                                disabled={!inputText.trim()}
                                className="bg-[#a5d391] hover:bg-white text-black font-bold text-xs uppercase tracking-widest px-5 py-3 rounded-2xl transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                                <span>Send</span>
                                <span className="material-symbols-outlined text-sm">send</span>
                            </button>
                        </form>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-[#080b12]/60 border border-white/5 rounded-2xl">
                            <div className="text-xs text-white/50 text-center sm:text-left flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-amber-400">
                                    {isNutritionist ? 'lock_open' : 'block'}
                                </span>
                                <span>
                                    {isNutritionist
                                        ? sessionStatus === 'ENDED'
                                            ? `Consultation with ${patientName} is ended. Click "Re-open Chat" to resume.`
                                            : `Chat not started. Click "Initiate Chat" to begin consultation with ${patientName}.`
                                        : sessionStatus === 'ENDED'
                                        ? 'This session has ended. Only your Dietitian can start a new session.'
                                        : 'Awaiting your Dietitian to initiate the chat session.'}
                                </span>
                            </div>
                            {isNutritionist && (
                                <button
                                    type="button"
                                    onClick={handleInitiateChat}
                                    className="bg-[#a5d391] hover:bg-white text-black font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer whitespace-nowrap"
                                >
                                    {sessionStatus === 'ENDED' ? 'Re-open Consultation' : 'Initiate Chat'}
                                </button>
                            )}
                            {!isNutritionist && sessionStatus === 'NOT_STARTED' && (
                                <button
                                    type="button"
                                    onClick={handleSendPatientRequest}
                                    disabled={requestPingSent}
                                    className="bg-[#a5d391]/20 hover:bg-[#a5d391]/30 text-[#a5d391] border border-[#a5d391]/40 font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                                >
                                    <span className="material-symbols-outlined text-sm">notifications_active</span>
                                    <span>{requestPingSent ? 'Dietitian Pinged' : 'Ping Dietitian to Open Chat'}</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Confirmation Modal for Ending Chat */}
                {showEndConfirm && (
                    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
                        <div className="bg-[#080b12] border border-red-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-center">
                            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center mx-auto">
                                <span className="material-symbols-outlined text-3xl">cancel</span>
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-white font-hero-display">End Consultation Session?</h4>
                                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                                    Concluded sessions prevent the patient from sending additional messages until you initiate a new session. The chat history will remain accessible as an archive.
                                </p>
                            </div>
                            <div className="flex items-center justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEndConfirm(false)}
                                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer"
                                >
                                    Continue Chat
                                </button>
                                <button
                                    type="button"
                                    onClick={handleEndChat}
                                    className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer"
                                >
                                    Yes, End Consultation
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConsultationChatModal;
