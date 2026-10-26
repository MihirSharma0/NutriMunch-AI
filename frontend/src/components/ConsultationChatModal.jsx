import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';

const DEFAULT_PATIENTS = [
    { id: "442", userId: "442", name: "David Miller", email: "david.m@example.com", goal: "Diabetes Management" },
    { id: "8472", userId: "8472", name: "Marcus Chen", email: "marcus.c@example.com", goal: "Lipid Oxidation & Endurance" },
    { id: "102", userId: "102", name: "Elena Rodriguez", email: "elena.r@example.com", goal: "Hormonal Balance & PCOS" },
    { id: "553", userId: "553", name: "James Wilson", email: "james.w@example.com", goal: "Cardiovascular Health" }
];

// Message ids embed Date.now(); use it to keep a stable chronological order after merging
const messageTimestamp = (m) => {
    const match = String(m?.id || '').match(/(\d{12,})/);
    return match ? Number(match[1]) : 0;
};

// Union of message lists by id. Copies of a session are never replaced wholesale, so a stale
// copy (e.g. one fetched before our own send finished uploading) can never remove a message.
const mergeMessages = (...lists) => {
    const byId = new Map();
    lists.forEach(list => (list || []).forEach(m => {
        if (m && m.id && !byId.has(m.id)) byId.set(m.id, m);
    }));
    return Array.from(byId.values())
        .map((m, i) => ({ m, i }))
        .sort((a, b) => (messageTimestamp(a.m) - messageTimestamp(b.m)) || (a.i - b.i))
        .map(x => x.m);
};

const sameMessageIds = (a, b) =>
    a.length === b.length && a.every((m, i) => m.id === b[i].id);

const sessionTime = (session) => Date.parse(session?.updatedAt || '') || 0;

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

    const isNutritionist = rawRole.includes('NUTRITIONIST') || rawRole.includes('ADMIN');

    // Patient roster for Nutritionist view
    const [patientList, setPatientList] = useState(DEFAULT_PATIENTS);
    const [selectedPatient, setSelectedPatient] = useState(targetPatient || DEFAULT_PATIENTS[0]);
    const [platformNutritionistName, setPlatformNutritionistName] = useState('Nutritionist Niraj Shaw');
    const [currentNutritionistName, setCurrentNutritionistName] = useState('');
    const [incomingRequest, setIncomingRequest] = useState(null);

    // Fetch verified platform nutritionists
    useEffect(() => {
        api.get('/admin/nutritionists')
            .then(res => {
                if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                    // Look for active nutritionist or take first
                    const activeD = res.data.find(d => {
                        const fullName = `${d.firstName || ''} ${d.lastName || ''}`.toLowerCase();
                        return fullName.includes('niraj') || fullName.includes('nutritionist');
                    }) || res.data[0];

                    const name = (activeD.firstName || activeD.lastName)
                        ? `${activeD.firstName || ''} ${activeD.lastName || ''}`.trim()
                        : (activeD.name || activeD.email?.split('@')[0]);

                    if (name) {
                        setPlatformNutritionistName(name.toLowerCase().startsWith('nutritionist') ? name : `Nutritionist ${name}`);
                    }
                }
            })
            .catch(() => {});
    }, []);

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
        : String(activeUser?.userId || activeUser?.id || activeUser?.email?.split('@')[0] || 'me');

    const patientName = isNutritionist
        ? (selectedPatient?.name || selectedPatient?.firstName || 'Patient')
        : (activeUser?.firstName ? `${activeUser.firstName} ${activeUser.lastName || ''}`.trim() : (activeUser?.name || 'Patient'));

    const nutritionistName = isNutritionist
        ? (activeUser?.firstName ? `Nutritionist ${activeUser.firstName} ${activeUser.lastName || ''}`.trim() : (activeUser?.name || 'Nutritionist Niraj Shaw'))
        : (currentNutritionistName || platformNutritionistName || 'Nutritionist Niraj Shaw');

    const [messages, setMessages] = useState([]);
    const [sessionStatus, setSessionStatus] = useState('NOT_STARTED'); // 'NOT_STARTED', 'ACTIVE', 'ENDED'
    const [inputText, setInputText] = useState('');
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [requestPingSent, setRequestPingSent] = useState(false);
    const messagesEndRef = useRef(null);
    const activeKeyRef = useRef(null);
    const conversationIdRef = useRef(patientId);
    const statusUpdatedAtRef = useRef(0);

    // Switching conversation: start clean so messages from the previous chat never merge in
    useEffect(() => {
        conversationIdRef.current = patientId;
        statusUpdatedAtRef.current = 0;
        setMessages([]);
        setSessionStatus('NOT_STARTED');
    }, [patientId]);

    // Merge incoming messages into state and adopt the session status only if it is newer than ours
    const applySession = (session, incomingMessages) => {
        setMessages(prev => {
            const merged = mergeMessages(prev, incomingMessages);
            return sameMessageIds(prev, merged) ? prev : merged;
        });
        const t = sessionTime(session);
        if (session?.sessionStatus && t >= statusUpdatedAtRef.current) {
            statusUpdatedAtRef.current = t;
            setSessionStatus(session.sessionStatus);
        }
        const resolvedNutritionist = session?.nutritionistName ||
            (incomingMessages || []).slice().reverse().find(m => m.sender === 'nutritionist')?.senderName;
        if (resolvedNutritionist) {
            setCurrentNutritionistName(resolvedNutritionist.toLowerCase().startsWith('nutritionist') ? resolvedNutritionist : `Nutritionist ${resolvedNutritionist}`);
        }
    };

    // Load Chat Session: merge the locally cached copy and every server copy of THIS conversation
    const loadChatSession = async () => {
        const conversationId = patientId;
        try {
            const allChats = JSON.parse(localStorage.getItem('nutrimunch_consultation_chats') || '{}');

            const targetId = isNutritionist
                ? String(selectedPatient?.userId || selectedPatient?.id || patientId)
                : String(activeUser?.userId || activeUser?.id || patientId || '');
            const targetEmail = isNutritionist
                ? selectedPatient?.email?.toLowerCase()
                : activeUser?.email?.toLowerCase();

            // A session belongs to this conversation only if it is for this exact patient
            const belongsHere = (session) => Boolean(session) && (
                (targetId && String(session.patientId) === targetId) ||
                (targetEmail && session.patientEmail?.toLowerCase() === targetEmail)
            );

            let localSession = null;
            if (targetId && belongsHere(allChats[targetId])) {
                localSession = allChats[targetId];
                activeKeyRef.current = targetId;
            } else if (targetEmail && belongsHere(allChats[targetEmail])) {
                localSession = allChats[targetEmail];
                activeKeyRef.current = targetEmail;
            } else {
                activeKeyRef.current = null;
            }

            if (localSession) {
                applySession(localSession, localSession.messages || []);
            }

            const res = await api.get('/notifications/me');
            if (conversationIdRef.current !== conversationId) return; // user switched chats meanwhile
            if (!res.data || !Array.isArray(res.data)) return;

            // Incoming consultation requests for the nutritionist
            if (isNutritionist) {
                const reqNotifs = res.data.filter(n => n.type === 'CONSULTATION_REQUEST' && n.message);
                if (reqNotifs.length > 0) {
                    try {
                        const reqData = JSON.parse(reqNotifs[0].message);
                        setIncomingRequest(reqData && String(reqData.patientId) !== String(targetId) ? reqData : null);
                    } catch (e) {}
                }
            }

            const serverSessions = res.data
                .filter(n => n.type === 'CONSULTATION_MSG' && n.message)
                .map(n => { try { return JSON.parse(n.message); } catch (e) { return null; } })
                .filter(session => session && Array.isArray(session.messages) && belongsHere(session));

            if (serverSessions.length === 0) return;

            const newest = serverSessions.reduce((a, b) => (sessionTime(b) > sessionTime(a) ? b : a));
            const mergedMessages = mergeMessages(localSession?.messages, ...serverSessions.map(x => x.messages));
            applySession(newest, mergedMessages);

            // Refresh the local cache with the merged conversation
            const latest = sessionTime(localSession) > sessionTime(newest) ? localSession : newest;
            const cached = { ...latest, messages: mergedMessages };
            if (targetId) allChats[targetId] = cached;
            if (targetEmail) allChats[targetEmail] = cached;
            localStorage.setItem('nutrimunch_consultation_chats', JSON.stringify(allChats));
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

        // Active polling every 1 second for instant multi-window / multi-tab / incognito sync
        const pollInterval = setInterval(() => {
            loadChatSession();
        }, 1000);

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

    // Handle Escape key to close modal and body scroll lock
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Universal Save helper ensuring bidirectional sync across all keys and backend database
    const saveSession = (status, updatedMessages) => {
        try {
            const allChats = JSON.parse(localStorage.getItem('nutrimunch_consultation_chats') || '{}');
            const targetPatientId = isNutritionist
                ? String(selectedPatient?.userId || selectedPatient?.id || patientId)
                : String(activeUser?.userId || activeUser?.id || patientId || 'me');

            const targetEmail = isNutritionist
                ? (selectedPatient?.email || '')
                : (activeUser?.email || '');

            const cachedSession = allChats[targetPatientId] || (targetEmail ? allChats[targetEmail.toLowerCase()] : null);
            const cachedMessages = cachedSession && String(cachedSession.patientId) === targetPatientId ? cachedSession.messages : [];
            const updatedAt = new Date().toISOString();
            statusUpdatedAtRef.current = Date.parse(updatedAt);

            const sessionData = {
                patientId: targetPatientId,
                patientEmail: targetEmail,
                patientName: patientName,
                nutritionistName: nutritionistName,
                sessionStatus: status,
                updatedAt,
                messages: mergeMessages(cachedMessages, updatedMessages)
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
                bc.postMessage({ type: 'CHAT_STATE_CHANGED', session: sessionData });
                bc.close();
            } catch (err) {}

            window.dispatchEvent(new Event('nutrimunch_chat_updated'));
            window.dispatchEvent(new Event('storage'));

            // Sync to backend notifications API so Incognito / cross-browser tabs sync instantly
            try {
                const numId = parseInt(targetPatientId, 10);
                api.post('/notifications/send', {
                    userId: isNaN(numId) ? null : numId,
                    userEmail: targetEmail || null,
                    type: 'CONSULTATION_MSG',
                    title: `CONSULTATION_${targetPatientId}`,
                    message: JSON.stringify(sessionData),
                    path: String(targetPatientId)
                }).catch(() => {});
            } catch (err) {}
        } catch (e) {
            console.error('Error saving chat session:', e);
        }
    };

    // Explicit Initiate Chat
    const handleInitiateChat = () => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const initMessage = {
            id: `sys_${Date.now()}`,
            sender: 'system',
            text: isNutritionist
                ? `Consultation chat session initiated by ${nutritionistName}. Real-time communication channel is now active.`
                : `Consultation session opened with ${nutritionistName}. You can now send live clinical guidance messages.`,
            time: timestamp
        };

        const updated = messages.length > 0 ? [...messages, initMessage] : [
            {
                id: `msg_welcome_${Date.now()}`,
                sender: isNutritionist ? 'nutritionist' : 'user',
                senderName: isNutritionist ? nutritionistName : patientName,
                text: isNutritionist
                    ? `Hello ${patientName}, I've initiated your live clinical consultation chat. How are you progressing with your nutrition and daily macro targets?`
                    : `Hello ${nutritionistName}, I've opened this consultation chat to discuss my nutrition targets and meal plans.`,
                time: timestamp
            }
        ];

        setSessionStatus('ACTIVE');
        setMessages(updated);
        saveSession('ACTIVE', updated);

        // Toast notification
        try {
            const chatNotification = {
                senderId: String(activeUser?.id || activeUser?.userId || ''),
                id: `chat_notif_${Date.now()}`,
                title: `Live Consultation Chat Initiated`,
                message: isNutritionist
                    ? `Nutritionist ${nutritionistName} has opened an active consultation chat with you.`
                    : `Patient ${patientName} has initiated a live consultation session with you.`,
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

    // Patient sends consultation request / ping to nutritionist
    const handleSendPatientRequest = () => {
        setRequestPingSent(true);
        const reqData = {
            id: `req_${Date.now()}`,
            patientId: patientId,
            patientName: patientName,
            patientEmail: activeUser?.email || '',
            time: 'Just now'
        };

        try {
            const notif = {
                senderId: String(activeUser?.id || activeUser?.userId || ''),
                id: `req_notif_${Date.now()}`,
                title: `Consultation Chat Requested`,
                message: `Patient ${patientName} (#${patientId}) has requested you to initiate a live consultation chat session.`,
                time: 'Just now',
                icon: 'forum',
                type: 'CONSULTATION_REQUEST',
                read: false
            };
            const existingNotifs = JSON.parse(localStorage.getItem('nutrimunch_user_notifications') || '[]');
            localStorage.setItem('nutrimunch_user_notifications', JSON.stringify([notif, ...existingNotifs]));
            window.dispatchEvent(new Event('nutrimunch_notification_added'));
            window.dispatchEvent(new Event('storage'));

            api.post('/notifications/send', {
                type: 'CONSULTATION_REQUEST',
                title: `Consultation Chat Requested by ${patientName}`,
                message: JSON.stringify(reqData),
                path: String(patientId)
            }).catch(() => {});
        } catch (e) {}
        setTimeout(() => setRequestPingSent(false), 5000);
    };

    // Nutritionist accepts incoming patient request
    const handleAcceptRequest = (req) => {
        const found = patientList.find(p => String(p.userId || p.id) === String(req.patientId));
        if (found) {
            setSelectedPatient(found);
        } else {
            const newP = {
                id: String(req.patientId),
                userId: String(req.patientId),
                name: req.patientName || 'Patient User',
                email: req.patientEmail || 'patient@nutrimunch.com',
                goal: 'Clinical Guidance & Review'
            };
            setPatientList(prev => [newP, ...prev]);
            setSelectedPatient(newP);
        }
        setIncomingRequest(null);
        handleInitiateChat();
    };

    // Nutritionist Ends Chat
    const handleEndChat = () => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endMessage = {
            id: `sys_end_${Date.now()}`,
            sender: 'system',
            text: `Consultation session concluded by ${nutritionistName} at ${timestamp}. The session history is archived.`,
            time: timestamp
        };

        const updated = [...messages, endMessage];
        setSessionStatus('ENDED');
        setMessages(updated);
        setShowEndConfirm(false);
        saveSession('ENDED', updated);
    };

    // Send Message - Seamlessly starts chat for both roles if not already active!
    const handleSendMessage = (e, customText = null) => {
        e?.preventDefault();
        const textToSend = (typeof customText === 'string' ? customText : inputText).trim();
        if (!textToSend) return;

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            sender: isNutritionist ? 'nutritionist' : 'user',
            senderName: isNutritionist ? nutritionistName : patientName,
            text: textToSend,
            time: timestamp
        };

        const updated = [...messages, newMessage];
        setMessages(updated);
        setSessionStatus('ACTIVE');
        if (!customText) setInputText('');
        saveSession('ACTIVE', updated);

        // Notify Receiver in real-time with direct deep-link to chat
        try {
            const notifTitle = isNutritionist
                ? `New Message from ${nutritionistName}`
                : `New Message from ${patientName} (#${patientId})`;
            const notifMessage = textToSend;
            const notifPayload = {
                senderId: String(activeUser?.id || activeUser?.userId || ''),
                id: `chat_notif_${Date.now()}`,
                title: notifTitle,
                message: notifMessage,
                time: 'Just now',
                icon: 'forum',
                type: 'CONSULTATION_CHAT',
                path: 'chat',
                targetUserId: isNutritionist ? String(patientId) : null,
                targetUserEmail: isNutritionist ? selectedPatient?.email : null,
                targetPatientId: !isNutritionist ? String(patientId) : null,
                targetPatientName: !isNutritionist ? patientName : null,
                read: false
            };

            // 1. Local storage & window events
            const existingNotifs = JSON.parse(localStorage.getItem('nutrimunch_user_notifications') || '[]');
            localStorage.setItem('nutrimunch_user_notifications', JSON.stringify([notifPayload, ...existingNotifs]));
            window.dispatchEvent(new Event('nutrimunch_notification_added'));
            window.dispatchEvent(new Event('storage'));

            // 2. Real-time floating Toast broadcast
            try {
                const cbc = new BroadcastChannel('nutrimunch_clinical_channel');
                cbc.postMessage({ payload: notifPayload });
                setTimeout(() => { try { cbc.close(); } catch (e) {} }, 500);
            } catch (e) {}

            // 3. Database persistence for cross-browser / multi-window sync
            const numPatientId = parseInt(patientId, 10);
            api.post('/notifications/send', {
                userId: isNutritionist && !isNaN(numPatientId) ? numPatientId : null,
                userEmail: isNutritionist ? (selectedPatient?.email || null) : null,
                title: notifTitle,
                message: notifMessage,
                type: 'CONSULTATION_CHAT',
                icon: 'forum',
                path: 'chat'
            }).catch(() => {});
        } catch (e) {
            console.error('Error sending chat notification:', e);
        }
    };

    // WhatsApp-style UI state
    const [mobileShowList, setMobileShowList] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [chatSearch, setChatSearch] = useState('');

    if (!isOpen) return null;

    const initialsOf = (name) => {
        const parts = String(name || '').replace(/^(Nutritionist|Dr\.?)\s+/i, '').trim().split(/\s+/).filter(Boolean);
        return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
    };

    const chatPartnerName = isNutritionist ? patientName : nutritionistName;
    const statusLine = sessionStatus === 'ACTIVE'
        ? 'Active session'
        : sessionStatus === 'ENDED'
            ? 'Session ended · send a message to resume'
            : isNutritionist
                ? (selectedPatient?.goal || 'Tap Start to begin the consultation')
                : 'Certified Nutritionist';

    const quickReplies = isNutritionist
        ? [
            'Reviewed your weekly adherence. Keep hydration high!',
            'I updated your Daily Macro Requirements. Please link them.',
            'Please log your water intake consistently.',
            'Schedule our upcoming bi-weekly consultation.'
        ]
        : [
            'How do I hit my daily protein target?',
            'Can you review my meal logs this week?',
            'I updated my weight and progress measurements.',
            'Please check my hydration and nutrient intake.'
        ];

    const showChatList = isNutritionist && patientList.length > 1;
    const filteredPatients = patientList.filter(p =>
        !chatSearch.trim() || String(p.name || '').toLowerCase().includes(chatSearch.trim().toLowerCase())
    );

    const handleComposerKeyDown = (e) => {
        // Enter sends, Shift+Enter adds a new line (like WhatsApp Web)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn pointer-events-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose?.();
                }
            }}
        >
            <div
                className={`relative w-full h-full sm:h-[85vh] sm:max-h-[760px] ${showChatList ? 'sm:max-w-5xl' : 'sm:max-w-2xl'} bg-[#0b141a] sm:rounded-2xl sm:border sm:border-white/10 shadow-2xl flex overflow-hidden pointer-events-auto`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Chat list (nutritionist) */}
                {showChatList && (
                    <aside className={`${mobileShowList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 shrink-0 bg-[#111b21] border-r border-white/10`}>
                        <div className="h-16 px-4 flex items-center justify-between bg-[#202c33] shrink-0">
                            <span className="text-white font-bold text-base">Chats</span>
                            <button
                                type="button"
                                onClick={() => onClose?.()}
                                aria-label="Close chat"
                                className="md:hidden w-9 h-9 rounded-full hover:bg-white/10 text-white/70 flex items-center justify-center cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        <div className="px-3 py-2 shrink-0">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg">search</span>
                                <input
                                    type="text"
                                    value={chatSearch}
                                    onChange={(e) => setChatSearch(e.target.value)}
                                    placeholder="Search patients"
                                    className="w-full bg-[#202c33] rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-white/40 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {filteredPatients.map((p) => {
                                const isSelected = String(p.userId || p.id) === String(patientId);
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => { setSelectedPatient(p); setMobileShowList(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors cursor-pointer border-b border-white/5 ${isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}
                                    >
                                        <div className="w-11 h-11 rounded-full bg-[#a5d391]/20 text-[#a5d391] flex items-center justify-center font-bold text-sm shrink-0">
                                            {initialsOf(p.name)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-white text-sm font-semibold truncate">{p.name}</div>
                                            <div className="text-white/50 text-xs truncate">{p.goal || p.email || 'Patient'}</div>
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredPatients.length === 0 && (
                                <div className="text-center text-white/40 text-xs py-8">No patients found</div>
                            )}
                        </div>
                    </aside>
                )}

                {/* Conversation */}
                <section className={`${showChatList && mobileShowList ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0`}>
                    {/* Header */}
                    <header className="h-16 px-2 sm:px-4 flex items-center gap-3 bg-[#202c33] shrink-0">
                        {showChatList && (
                            <button
                                type="button"
                                onClick={() => setMobileShowList(true)}
                                aria-label="Back to chats"
                                className="md:hidden w-9 h-9 rounded-full hover:bg-white/10 text-white/80 flex items-center justify-center cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xl">arrow_back</span>
                            </button>
                        )}
                        <div className="w-10 h-10 rounded-full bg-[#a5d391]/20 text-[#a5d391] flex items-center justify-center font-bold text-sm shrink-0 ml-1 sm:ml-0">
                            {initialsOf(chatPartnerName)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-white font-semibold text-[15px] truncate">{chatPartnerName}</div>
                            <div className={`text-xs truncate ${sessionStatus === 'ACTIVE' ? 'text-[#a5d391]' : 'text-white/50'}`}>{statusLine}</div>
                        </div>

                        {isNutritionist && (
                            sessionStatus === 'ACTIVE' ? (
                                <button
                                    type="button"
                                    onClick={() => setShowEndConfirm(true)}
                                    title="End consultation"
                                    className="h-9 px-3 rounded-full hover:bg-red-500/15 text-red-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-lg">call_end</span>
                                    <span className="hidden sm:inline">End</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleInitiateChat}
                                    title={sessionStatus === 'ENDED' ? 'Re-open consultation' : 'Start consultation'}
                                    className="h-9 px-3 rounded-full hover:bg-[#a5d391]/15 text-[#a5d391] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-lg">play_circle</span>
                                    <span className="hidden sm:inline">{sessionStatus === 'ENDED' ? 'Re-open' : 'Start'}</span>
                                </button>
                            )
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose?.();
                            }}
                            aria-label="Close chat"
                            className="w-9 h-9 rounded-full hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </header>

                    {/* Incoming chat request (nutritionist) */}
                    {isNutritionist && incomingRequest && (
                        <div className="px-4 py-2 bg-[#182229] border-b border-white/5 flex items-center justify-between gap-3 text-xs text-white/80 shrink-0">
                            <span className="truncate">
                                <span className="material-symbols-outlined text-sm text-[#a5d391] align-middle mr-1">notifications_active</span>
                                <strong className="text-white">{incomingRequest.patientName}</strong> wants to chat
                            </span>
                            <button
                                type="button"
                                onClick={() => handleAcceptRequest(incomingRequest)}
                                className="bg-[#a5d391] hover:bg-white text-black font-bold text-[11px] px-3 py-1 rounded-full cursor-pointer shrink-0"
                            >
                                Open
                            </button>
                        </div>
                    )}

                    {/* Messages */}
                    <div
                        className="flex-1 overflow-y-auto px-3 sm:px-[6%] py-4 custom-scrollbar"
                        style={{
                            backgroundColor: '#0b141a',
                            backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
                            backgroundSize: '18px 18px'
                        }}
                    >
                        <div className="flex justify-center mb-4">
                            <span className="max-w-md text-center px-3 py-1.5 rounded-lg bg-[#182229] text-[11px] text-[#e9c46a]/90 leading-snug">
                                <span className="material-symbols-outlined text-[12px] align-middle mr-1">lock</span>
                                Messages are between you and {isNutritionist ? 'your patient' : 'your nutritionist'} for nutrition guidance only. For emergencies call 112.
                            </span>
                        </div>

                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center text-center mt-8 gap-4">
                                <div className="w-20 h-20 rounded-full bg-[#a5d391]/15 text-[#a5d391] flex items-center justify-center text-2xl font-bold">
                                    {initialsOf(chatPartnerName)}
                                </div>
                                <div>
                                    <div className="text-white font-semibold">{chatPartnerName}</div>
                                    <div className="text-white/50 text-xs mt-1">
                                        {isNutritionist ? 'No messages yet. Say hello or start the consultation.' : 'No messages yet. Ask anything about your diet and targets.'}
                                    </div>
                                </div>
                                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                                    {quickReplies.map((text) => (
                                        <button
                                            key={text}
                                            type="button"
                                            onClick={() => isNutritionist ? setInputText(text) : handleSendMessage(null, text)}
                                            className="px-3 py-1.5 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-white/80 text-xs border border-white/10 cursor-pointer transition-colors"
                                        >
                                            {text}
                                        </button>
                                    ))}
                                </div>
                                {!isNutritionist && (
                                    <button
                                        type="button"
                                        onClick={handleSendPatientRequest}
                                        disabled={requestPingSent}
                                        className="text-xs text-[#a5d391] hover:underline disabled:no-underline disabled:opacity-60 flex items-center gap-1 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-sm">notifications_active</span>
                                        {requestPingSent ? 'Nutritionist notified' : 'Notify nutritionist that you want to chat'}
                                    </button>
                                )}
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                if (msg.sender === 'system') {
                                    return (
                                        <div key={msg.id} className="flex justify-center my-3">
                                            <span className="max-w-[85%] text-center px-3 py-1 rounded-lg bg-[#182229] text-[11px] text-white/60">
                                                {msg.text}
                                            </span>
                                        </div>
                                    );
                                }

                                const isMe = isNutritionist ? msg.sender === 'nutritionist' : msg.sender === 'user';
                                const prev = messages[idx - 1];
                                const firstOfGroup = !prev || prev.sender !== msg.sender;

                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${firstOfGroup ? 'mt-3' : 'mt-0.5'}`}>
                                        <div
                                            className={`relative max-w-[85%] sm:max-w-[65%] px-2.5 pt-1.5 pb-1 rounded-lg shadow text-sm text-[#e9edef] ${
                                                isMe ? 'bg-[#005c4b]' : 'bg-[#202c33]'
                                            } ${firstOfGroup ? (isMe ? 'rounded-tr-none' : 'rounded-tl-none') : ''}`}
                                        >
                                            {firstOfGroup && (
                                                <span
                                                    aria-hidden="true"
                                                    className={`absolute top-0 w-0 h-0 border-t-[8px] ${
                                                        isMe
                                                            ? '-right-2 border-l-[8px] border-t-[#005c4b] border-l-transparent'
                                                            : '-left-2 border-r-[8px] border-t-[#202c33] border-r-transparent'
                                                    }`}
                                                />
                                            )}
                                            <span className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</span>
                                            <span className="float-right ml-3 mt-1.5 -mb-0.5 flex items-center gap-0.5 text-[10px] text-white/50 select-none">
                                                {msg.time}
                                                {isMe && <span className="material-symbols-outlined text-[14px] text-white/50">done</span>}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick replies tray */}
                    {showQuickReplies && (
                        <div className="px-3 py-2 bg-[#111b21] border-t border-white/5 flex gap-2 overflow-x-auto custom-scrollbar shrink-0">
                            {quickReplies.map((text) => (
                                <button
                                    key={text}
                                    type="button"
                                    onClick={() => { setInputText(text); setShowQuickReplies(false); }}
                                    className="whitespace-nowrap px-3 py-1.5 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-white/80 text-xs cursor-pointer transition-colors"
                                >
                                    {text}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Composer */}
                    <form onSubmit={handleSendMessage} className="px-2 sm:px-3 py-2 bg-[#202c33] flex items-end gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowQuickReplies(v => !v)}
                            title="Quick replies"
                            aria-label="Quick replies"
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors ${showQuickReplies ? 'text-[#a5d391] bg-white/10' : 'text-white/60 hover:text-white'}`}
                        >
                            <span className="material-symbols-outlined text-[22px]">bolt</span>
                        </button>
                        <textarea
                            rows={1}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleComposerKeyDown}
                            placeholder="Type a message"
                            className="flex-1 resize-none max-h-32 bg-[#2a3942] text-[#e9edef] text-sm px-4 py-2.5 rounded-3xl outline-none placeholder:text-white/40 custom-scrollbar"
                            style={{ fieldSizing: 'content' }}
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            aria-label="Send message"
                            className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#06cf9c] text-[#0b141a] flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[20px]">send</span>
                        </button>
                    </form>
                </section>

                {/* End consultation confirmation */}
                {showEndConfirm && (
                    <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center p-6 animate-fadeIn">
                        <div className="bg-[#202c33] rounded-xl p-5 max-w-sm w-full shadow-2xl">
                            <h4 className="text-white font-semibold text-base">End this consultation?</h4>
                            <p className="text-white/60 text-sm mt-2 leading-relaxed">
                                The chat will be marked as ended. Either of you can resume it later by sending a message.
                            </p>
                            <div className="flex justify-end gap-2 mt-5">
                                <button
                                    type="button"
                                    onClick={() => setShowEndConfirm(false)}
                                    className="px-4 py-2 rounded-full text-[#00a884] hover:bg-white/5 text-sm font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleEndChat}
                                    className="px-4 py-2 rounded-full bg-red-500 hover:bg-red-400 text-white text-sm font-semibold cursor-pointer"
                                >
                                    End chat
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default ConsultationChatModal;
