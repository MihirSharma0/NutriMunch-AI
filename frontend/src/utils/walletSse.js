/**
 * Real-time Wallet Server-Sent Events (SSE) Client
 * Maintains a live streaming connection with the Spring Boot backend
 * for instant balance updates, escrow state transitions, and ledger refreshes.
 */
import api, { API_BASE_URL } from '../api/axios';

/**
 * Shared singleton manager for real-time Server-Sent Events (SSE).
 * Prevents duplicate HTTP/1.1 connections in Chrome and ensures all open
 * tabs and components receive instant, reactive wallet & ledger balance pushes.
 */

let activeEventSource = null;
let activeUserKey = null;
let reconnectTimer = null;
const updateCallbacks = new Set();
const ledgerCallbacks = new Set();

// The single canonical wallet balance for this browser session. It is fetched
// ONCE from the server when the session starts, then kept current by SSE pushes.
// Nothing is written to localStorage: the DB is the only source of truth.
let canonicalBalance = null;
let balanceResyncedForSession = false;
let resyncInFlight = null;
let lastFocusResyncAt = 0;

/** Returns the authoritative balance for the current session (or null before the first fetch). */
export const getCanonicalBalance = () => canonicalBalance;

/**
 * Fetch the balance once from /wallet/me. `force` is used after a reconnect or a
 * tab regains focus, because SSE events can be lost while the stream is down
 * (the emitter registry is process-local on the server).
 */
export const resyncWalletBalance = async (force = false) => {
    if (!force && balanceResyncedForSession) return canonicalBalance;
    if (resyncInFlight) return resyncInFlight;
    resyncInFlight = (async () => {
        try {
            const res = await api.get('/wallet/me');
            const bal = Number(res?.data?.balance);
            if (!isNaN(bal)) {
                canonicalBalance = bal;
                balanceResyncedForSession = true;
                try {
                    window.dispatchEvent(new CustomEvent('wallet_balance_resynced', { detail: { balance: bal } }));
                } catch (e) { }
            }
        } catch (err) {
            console.warn('[Wallet SSE] balance resync failed:', err);
        } finally {
            resyncInFlight = null;
        }
        return canonicalBalance;
    })();
    return resyncInFlight;
};

let broadcastChannel = null;
try {
    broadcastChannel = new BroadcastChannel('nutrimunch_clinical_channel');
    broadcastChannel.onmessage = (event) => {
        if (!event?.data) return;
        if (event.data.type === 'WALLET_CREDITED' || event.data.type === 'WALLET_UPDATED' || event.data.eventType === 'ADMIN_CREDIT') {
            // Balance is authoritative only from the server SSE stream. Every tab
            // has its own stream, so a client-computed cross-tab value is ignored.
        } else if (event.data.type === 'LEDGER_UPDATED') {
            for (const cb of ledgerCallbacks) {
                try { cb(event.data); } catch (e) { }
            }
        }
    };
} catch (e) {
    // BroadcastChannel unsupported or restricted in environment
}

/**
 * Processes an incoming wallet payload, reconciles local caches,
 * triggers registered callbacks, and broadcasts changes across browser tabs.
 * 
 * @param {Object} data - Parsed wallet and transaction balance payload
 * @param {boolean} [shouldBroadcast=true] - Whether to replicate via BroadcastChannel
 */
function handleParsedWalletPayload(data, shouldBroadcast = true) {
    if (!data) return;

    const newBal = data.newBalance !== undefined && data.newBalance !== null
        ? Number(data.newBalance)
        : (data.balance !== undefined && data.balance !== null ? Number(data.balance) : null);

    if (newBal === null || isNaN(newBal)) return;

    // The DB is the source of truth: keep the single in-memory balance current.
    // No localStorage balance keys are written (DP-03 / DP-04).
    canonicalBalance = newBal;
    balanceResyncedForSession = true;

    const eventDetail = {
        ...data,
        newBalance: newBal,
        balance: newBal
    };

    // Dispatch DOM CustomEvents for reactive component tree
    try {
        window.dispatchEvent(new CustomEvent('wallet_update', { detail: eventDetail }));
        window.dispatchEvent(new CustomEvent('wallet_updated', { detail: eventDetail }));
    } catch (e) { }

    // Multi-tab cross-broadcast
    if (shouldBroadcast && broadcastChannel) {
        try {
            broadcastChannel.postMessage({
                type: 'WALLET_UPDATED',
                ...eventDetail
            });
        } catch (e) { }
    }

    // Direct callback triggers
    for (const cb of updateCallbacks) {
        try {
            cb(newBal, eventDetail);
        } catch (err) {
            console.warn('[Wallet SSE] Callback execution error:', err);
        }
    }
}

/**
 * Establishes and manages the Server-Sent Events (SSE) stream for wallet updates,
 * configuring heartbeat monitors, error retry backoff, and event listeners.
 * 
 * @param {Object} user - Current authenticated user context
 * @returns {EventSource|null} Active EventSource instance or null
 */
function initEventSource(user) {
    if (!user) return;

    const userId = user.id || user.userId || '';
    const email = user.email || user.username || '';
    const role = user.role || '';
    const token = localStorage.getItem('token') || '';

    if (!userId && !email) return;

    const userKey = `${userId}_${email}_${token}`;
    if (activeEventSource && activeUserKey === userKey && activeEventSource.readyState !== EventSource.CLOSED) {
        return; // Connection already active
    }

    if (activeEventSource) {
        try { activeEventSource.close(); } catch (e) { }
        activeEventSource = null;
    }

    activeUserKey = userKey;

    // Only the token identifies the caller; the server derives everything else from it.
    const params = new URLSearchParams();
    if (token) params.append('token', token);

    const sseUrl = `${API_BASE_URL}/wallet/stream?${params.toString()}`;

    try {
        activeEventSource = new EventSource(sseUrl);

        // Session start: exactly one balance GET. Subsequent changes arrive by SSE push.
        resyncWalletBalance(false);

        const onWalletMessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const myId = String(userId);
                const myEmail = (email || '').toLowerCase();
                const targetId = String(data.recipientId || data.userId || '');
                const targetEmail = (data.recipientEmail || data.email || '').toLowerCase();

                const isForMe = (targetId && myId && targetId === myId) ||
                    (targetEmail && myEmail && targetEmail === myEmail) ||
                    (!targetId && !targetEmail);

                if (!isForMe) return;

                handleParsedWalletPayload(data, true);
            } catch (err) {
                console.warn('[Wallet SSE] Message parse error:', err);
            }
        };

        const onLedgerMessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                window.dispatchEvent(new CustomEvent('ledger_updated', { detail: data }));
                for (const cb of ledgerCallbacks) {
                    try { cb(data); } catch (e) { }
                }
            } catch (e) { }
        };

        const onAppointmentMessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                window.dispatchEvent(new CustomEvent('appointment_updated', { detail: data }));
            } catch (e) { }
        };

        // Chat + notification events ride the same authenticated stream so the browser keeps
        // a single EventSource per tab (HTTP/1.1 allows only a handful per origin).
        const onChatMessage = (event) => {
            try {
                window.dispatchEvent(new CustomEvent('nutrimunch_chat_message', { detail: JSON.parse(event.data) }));
            } catch (e) { }
        };

        const onConversationStatus = (event) => {
            try {
                window.dispatchEvent(new CustomEvent('nutrimunch_conversation_status', { detail: JSON.parse(event.data) }));
            } catch (e) { }
        };

        const onNotificationEvent = (event) => {
            try {
                window.dispatchEvent(new CustomEvent('nutrimunch_notification', { detail: JSON.parse(event.data) }));
            } catch (e) { }
        };

        activeEventSource.addEventListener('chat_message', onChatMessage);
        activeEventSource.addEventListener('conversation_status', onConversationStatus);
        activeEventSource.addEventListener('notification', onNotificationEvent);

        activeEventSource.onmessage = onWalletMessage;
        activeEventSource.addEventListener('wallet_update', onWalletMessage);
        activeEventSource.addEventListener('WALLET_UPDATED', onWalletMessage);
        activeEventSource.addEventListener('ledger_updated', onLedgerMessage);
        activeEventSource.addEventListener('LEDGER_UPDATED', onLedgerMessage);
        activeEventSource.addEventListener('appointment_updated', onAppointmentMessage);
        activeEventSource.addEventListener('APPOINTMENT_UPDATED', onAppointmentMessage);

        activeEventSource.onerror = () => {
            if (activeEventSource && activeEventSource.readyState === EventSource.CLOSED) {
                if (reconnectTimer) clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(() => {
                    initEventSource(user);
                    resyncWalletBalance(true);
                }, 3000);
            }
        };
    } catch (e) {
        console.warn('[Wallet SSE] Connection initialization error:', e);
    }
}

/**
 * Creates and manages a persistent Server-Sent Events (SSE) connection
 * for real-time live wallet balance updates.
 *
 * @param {Object} user Current authenticated user from AuthContext
 * @param {Function} onUpdate Callback when a wallet update is pushed from server
 * @param {Function} onLedgerUpdate Optional callback for admin real-time ledger updates
 * @returns {Function} Unsubscribe / close function to call on unmount
 */
/**
 * Closes the shared stream and forgets its callbacks. This is what actually tells the server to
 * end the SSE request: without it the connection stays open until the server's own timeout, even
 * though the user has signed out and the token is gone.
 */
const closeConnection = () => {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    if (activeEventSource) {
        try { activeEventSource.close(); } catch (e) { }
        activeEventSource = null;
    }
    activeUserKey = null;
};

/**
 * Global logout signal. Any code path that ends the session - the manual button, the 401
 * interceptor, or a future client-side redirect - can fire this and the stream is released
 * immediately, without waiting for the page to unload or for the server timeout.
 */
try {
    window.addEventListener('nutrimunch_logout', () => {
        updateCallbacks.clear();
        ledgerCallbacks.clear();
        canonicalBalance = null;
        balanceResyncedForSession = false;
        closeConnection();
    });
} catch (e) { }

/** Call on logout so no stream outlives the session. */
/**
 * Closes the active Server-Sent Events connection and resets internal retry counters.
 */
try {
    window.addEventListener('focus', () => {
        const now = Date.now();
        if (now - lastFocusResyncAt < 30000) return;
        lastFocusResyncAt = now;
        resyncWalletBalance(true);
    });
} catch (e) { }

export const closeWalletSse = () => {
    updateCallbacks.clear();
    ledgerCallbacks.clear();
    closeConnection();
};

/**
 * Subscribes a consumer component to wallet balance changes and transaction updates.
 * 
 * @param {Object} user - User authentication context
 * @param {Function} [onUpdate] - Callback receiving balance updates
 * @param {Function} [onLedgerUpdate] - Callback receiving full transaction ledger updates
 * @returns {Function} Unsubscribe teardown function
 */
export const subscribeWalletSse = (user, onUpdate, onLedgerUpdate) => {
    if (!user) return () => { };

    if (typeof onUpdate === 'function') {
        updateCallbacks.add(onUpdate);
    }
    if (typeof onLedgerUpdate === 'function') {
        ledgerCallbacks.add(onLedgerUpdate);
    }

    initEventSource(user);

    return () => {
        if (typeof onUpdate === 'function') {
            updateCallbacks.delete(onUpdate);
        }
        if (typeof onLedgerUpdate === 'function') {
            ledgerCallbacks.delete(onLedgerUpdate);
        }
        // Nobody is listening any more (logout, or the last subscribed page unmounted):
        // release the stream instead of leaving it open on the server.
        if (updateCallbacks.size === 0 && ledgerCallbacks.size === 0) {
            closeConnection();
        }
    };
};
