import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';

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

    // Load Chat Session with unified resolution (localStorage + backend database bridge)
    const loadChatSession = async () => {
        try {
            const allChats = JSON.parse(localStorage.getItem('nutrimunch_consultation_chats') || '{}');
            let currentSession = null;
            let resolvedKey = null;

            const targetId = isNutritionist
                ? String(selectedPatient?.userId || selectedPatient?.id || patientId)
                : String(activeUser?.userId || activeUser?.id || '');
            const targetEmail = isNutritionist
                ? selectedPatient?.email?.toLowerCase()
                : activeUser?.email?.toLowerCase();
            const myName = (!isNutritionist && activeUser)
                ? (activeUser?.firstName ? `${activeUser.firstName} ${activeUser.lastName || ''}`.trim() : (activeUser?.name || '')).toLowerCase()
                : '';

            if (isNutritionist) {
                if (targetId && allChats[targetId]) {
                    currentSession = allChats[targetId];
                    resolvedKey = targetId;
                } else if (targetEmail && allChats[targetEmail]) {
                    currentSession = allChats[targetEmail];
                    resolvedKey = targetEmail;
                } else if (allChats['nutrimunch_active_consultation'] && String(allChats['nutrimunch_active_consultation']?.patientId) === targetId) {
                    currentSession = allChats['nutrimunch_active_consultation'];
                    resolvedKey = 'nutrimunch_active_consultation';
                }
            } else {
                // Patient session resolution:
                if (targetId && allChats[targetId]) {
                    currentSession = allChats[targetId];
                    resolvedKey = targetId;
                } else if (targetEmail && allChats[targetEmail]) {
                    currentSession = allChats[targetEmail];
                    resolvedKey = targetEmail;
                }

                if (!currentSession) {
                    for (const [k, s] of Object.entries(allChats)) {
                        if (!s) continue;
                        if (targetId && String(s.patientId) === targetId) {
                            currentSession = s;
                            resolvedKey = k;
                            break;
                        }
                        if (targetEmail && s.patientEmail?.toLowerCase() === targetEmail) {
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

                // Fallback to active consultation
                if (!currentSession || (!currentSession.messages?.length && currentSession.sessionStatus !== 'ACTIVE')) {
                    if (allChats['nutrimunch_active_consultation'] && (allChats['nutrimunch_active_consultation'].sessionStatus === 'ACTIVE' || allChats['nutrimunch_active_consultation'].messages?.length > 0)) {
                        currentSession = allChats['nutrimunch_active_consultation'];
                        resolvedKey = 'nutrimunch_active_consultation';
                    } else if (allChats['me'] && (allChats['me'].sessionStatus === 'ACTIVE' || allChats['me'].messages?.length > 0)) {
                        currentSession = allChats['me'];
                        resolvedKey = 'me';
                    }
                }
            }

            activeKeyRef.current = resolvedKey;

            if (currentSession) {
                setSessionStatus(currentSession.sessionStatus || 'ACTIVE');
                setMessages(currentSession.messages || []);
                const resolvedNutritionist = currentSession.nutritionistName ||
                    currentSession.messages?.slice().reverse().find(m => m.sender === 'nutritionist')?.senderName;
                if (resolvedNutritionist) {
                    setCurrentNutritionistName(resolvedNutritionist.toLowerCase().startsWith('nutritionist') ? resolvedNutritionist : `Nutritionist ${resolvedNutritionist}`);
                }
            }

            // Sync with backend notifications database (bridges across incognito / multi-browser / multi-window)
            try {
                const res = await api.get('/notifications/me');
                if (res.data && Array.isArray(res.data)) {
                    // Check for incoming consultation requests for Nutritionist
                    if (isNutritionist) {
                        const reqNotifs = res.data.filter(n => n.type === 'CONSULTATION_REQUEST' && n.message);
                        if (reqNotifs.length > 0) {
                            try {
                                const reqData = JSON.parse(reqNotifs[0].message);
                                if (reqData && String(reqData.patientId) !== String(targetId)) {
                                    setIncomingRequest(reqData);
                                } else {
                                    setIncomingRequest(null);
                                }
                            } catch (e) {}
                        }
                    }

                    // Check for consultation chat state updates
                    const chatNotifs = res.data.filter(n => n.type === 'CONSULTATION_MSG' && n.message);
                    if (chatNotifs.length > 0) {
                        for (const n of chatNotifs) {
                            try {
                                const backendSession = JSON.parse(n.message);
                                if (!backendSession || !Array.isArray(backendSession.messages)) continue;

                                const matches = isNutritionist
                                    ? String(backendSession.patientId) === String(targetId) || (targetEmail && backendSession.patientEmail?.toLowerCase() === targetEmail)
                                    : String(backendSession.patientId) === String(targetId) ||
                                      (targetEmail && backendSession.patientEmail?.toLowerCase() === targetEmail) ||
                                      (myName && backendSession.patientName?.toLowerCase() === myName) ||
                                      (backendSession.sessionStatus === 'ACTIVE') ||
                                      (!targetId && backendSession.messages.length > 0);

                                if (matches) {
                                    const currCount = currentSession?.messages?.length || 0;
                                    if (backendSession.messages.length >= currCount || backendSession.sessionStatus !== sessionStatus) {
                                        setMessages(backendSession.messages);
                                        setSessionStatus(backendSession.sessionStatus || 'ACTIVE');
                                        const resolvedNutritionist = backendSession.nutritionistName ||
                                            backendSession.messages.slice().reverse().find(m => m.sender === 'nutritionist')?.senderName;
                                        if (resolvedNutritionist) {
                                            setCurrentNutritionistName(resolvedNutritionist.toLowerCase().startsWith('nutritionist') ? resolvedNutritionist : `Nutritionist ${resolvedNutritionist}`);
                                        }

                                        // Update local caches
                                        if (targetId) allChats[targetId] = backendSession;
                                        if (targetEmail) allChats[targetEmail] = backendSession;
                                        allChats['nutrimunch_active_consultation'] = backendSession;
                                        allChats['me'] = backendSession;
                                        localStorage.setItem('nutrimunch_consultation_chats', JSON.stringify(allChats));
                                    }
                                    break;
                                }
                            } catch (e) {}
                        }
                    }
                }
            } catch (err) {}
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

            const sessionData = {
                patientId: targetPatientId,
                patientEmail: targetEmail,
                patientName: patientName,
                nutritionistName: nutritionistName,
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
            id: `msg_${Date.now()}`,
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

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-start pt-20 sm:pt-24 pb-6 px-3 sm:px-4 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn pointer-events-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose?.();
                }
            }}
        >
            <div
                className="relative w-full max-w-2xl bg-[#080b12] border border-[#a5d391]/40 rounded-[2.5rem] shadow-[0_0_80px_rgba(165,211,145,0.25)] flex flex-col h-[78vh] max-h-[calc(100vh-7.5rem)] overflow-hidden shrink-0 my-auto sm:my-0 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="px-5 sm:px-6 py-4 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-[#a5d391]/20 border border-[#a5d391]/40 flex items-center justify-center text-[#a5d391] shadow-inner shrink-0">
                            <span className="material-symbols-outlined text-2xl">forum</span>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm sm:text-base font-bold text-white font-hero-display truncate">
                                    {isNutritionist ? `Consultation with ${patientName}` : `Clinical Consultation with ${nutritionistName}`}
                                </h3>
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                    sessionStatus === 'ACTIVE'
                                        ? 'bg-[#a5d391]/20 text-[#a5d391] border-[#a5d391]/40 animate-pulse'
                                        : sessionStatus === 'ENDED'
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        : 'bg-[#a5d391]/15 text-[#a5d391] border-[#a5d391]/30'
                                }`}>
                                    {sessionStatus === 'ACTIVE' ? 'Live Session' : sessionStatus === 'ENDED' ? 'Concluded' : 'Ready to Chat'}
                                </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-white/50 truncate">
                                {isNutritionist
                                    ? `Patient ID: #${patientId} • Goal: ${selectedPatient?.goal || 'General Health & Nutrition'}`
                                    : `Certified Nutritionist • Real-time clinical guidance • Patient: ${patientName}`}
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
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose?.();
                            }}
                            aria-label="Close consultation modal"
                            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer pointer-events-auto shadow-sm"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>

                {/* Incoming Patient Consultation Request Alert for Nutritionist */}
                {isNutritionist && incomingRequest && (
                    <div className="px-5 sm:px-6 py-2.5 bg-[#a5d391]/15 border-b border-[#a5d391]/30 flex items-center justify-between gap-3 text-xs text-[#a5d391] shrink-0 animate-in fade-in">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="material-symbols-outlined text-base animate-bounce shrink-0">notifications_active</span>
                            <span className="truncate"><strong>{incomingRequest.patientName}</strong> (#{incomingRequest.patientId}) has requested a live consultation chat!</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleAcceptRequest(incomingRequest)}
                            className="bg-[#a5d391] hover:bg-white text-black font-extrabold text-[11px] px-3.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap shadow-md shrink-0"
                        >
                            Open & Initiate
                        </button>
                    </div>
                )}

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
                                    : 'Consultation concluded by Nutritionist. History is archived. You can send a follow-up message below to resume.'}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 px-2 py-0.5 rounded-full">Archived</span>
                    </div>
                )}

                {sessionStatus === 'NOT_STARTED' && (
                    <div className="bg-[#a5d391]/10 border-b border-[#a5d391]/20 px-6 py-2.5 flex items-center justify-between text-xs text-[#a5d391]">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-[#a5d391]">forum</span>
                            <span>
                                {isNutritionist
                                    ? `Direct channel ready with ${patientName}. Type below or click "Initiate Chat".`
                                    : `Direct channel ready with ${nutritionistName}. Type your message below to start chatting.`}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#a5d391]/80">Two-Way Live</span>
                    </div>
                )}

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent via-[#0d131f]/40 to-[#080b12]">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 my-auto">
                            <div className="w-16 h-16 rounded-3xl bg-[#a5d391]/10 border border-[#a5d391]/30 flex items-center justify-center text-[#a5d391] shadow-[0_0_30px_rgba(165,211,145,0.2)]">
                                <span className="material-symbols-outlined text-3xl">chat_bubble_outline</span>
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-white font-hero-display">
                                    {isNutritionist
                                        ? `Start Consultation with ${patientName}`
                                        : `Consultation with ${nutritionistName}`}
                                </h4>
                                <p className="text-xs text-white/50 max-w-md mt-1">
                                    {isNutritionist
                                        ? `Send clinical guidance, macro updates, or review nutritional adherence with ${patientName}.`
                                        : `Ask your nutritionist questions about macro targets, diet adherence, or meal adjustments anytime.`}
                                </p>
                            </div>

                            {/* Quick Starter Prompts for Patient */}
                            {!isNutritionist && (
                                <div className="w-full max-w-md space-y-2 mt-2">
                                    <p className="text-[11px] font-bold text-white/60 uppercase tracking-wider text-left">Quick Starters:</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                                        {[
                                            'How do I hit my daily protein target?',
                                            'Can you review my meal logs this week?',
                                            'I updated my weight and progress measurements.',
                                            'Please check my hydration and nutrient intake.'
                                        ].map((promptText, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSendMessage(null, promptText)}
                                                className="p-2.5 rounded-xl bg-white/5 hover:bg-[#a5d391]/20 hover:border-[#a5d391]/40 border border-white/10 text-white/80 hover:text-white text-xs transition-all cursor-pointer flex items-center justify-between group"
                                            >
                                                <span className="truncate pr-1">{promptText}</span>
                                                <span className="material-symbols-outlined text-xs text-[#a5d391] opacity-0 group-hover:opacity-100 transition-opacity">send</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={handleSendPatientRequest}
                                            disabled={requestPingSent}
                                            className="text-[11px] text-[#a5d391]/80 hover:text-[#a5d391] flex items-center gap-1.5 mx-auto transition-colors cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm">notifications_active</span>
                                            <span>{requestPingSent ? 'Notification Sent to Nutritionist' : 'Send Alert Ping to Nutritionist'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isNutritionist && (
                                <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={handleInitiateChat}
                                        className="bg-[#a5d391] hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider px-6 py-3 rounded-full transition-all shadow-[0_0_25px_rgba(165,211,145,0.4)] cursor-pointer flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm font-bold">play_arrow</span>
                                        <span>Initiate Consultation Now</span>
                                    </button>
                                </div>
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
                            const isNutritionistMsg = msg.sender === 'nutritionist';

                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-1.5 mb-1 px-1">
                                        <span className="text-[11px] font-bold text-white/70">{msg.senderName}</span>
                                        {isNutritionistMsg && (
                                            <span className="text-[9px] font-black uppercase tracking-wider text-[#a5d391] bg-[#a5d391]/15 px-1.5 py-0.2 rounded border border-[#a5d391]/30">
                                                Nutritionist
                                            </span>
                                        )}
                                        <span className="text-[10px] text-white/40">{msg.time}</span>
                                    </div>
                                    <div className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                                        isMe
                                            ? 'bg-[#a5d391] text-black font-medium rounded-tr-none shadow-lg'
                                            : isNutritionistMsg
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
                {isNutritionist && (
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

                {/* Quick Action Chips for Patient */}
                {!isNutritionist && messages.length > 0 && (
                    <div className="px-6 py-2 bg-black/40 border-t border-white/5 flex items-center gap-2 overflow-x-auto shrink-0 custom-scrollbar">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 whitespace-nowrap">Quick Inquiries:</span>
                        {[
                            'Can you review my latest meal logs?',
                            'How can I optimize my protein intake?',
                            'I have updated my daily activity stats.'
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

                {/* Footer Input Area - ALWAYS ACTIVE AND USABLE FOR BOTH ROLES */}
                <div className="p-4 sm:p-5 border-t border-white/10 bg-white/5 shrink-0">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={isNutritionist ? `Message ${patientName}...` : `Message ${nutritionistName}...`}
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
                                    Concluded sessions mark the consultation as archived. Either party can resume communication at any time by sending a message or clicking Re-open.
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

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default ConsultationChatModal;
