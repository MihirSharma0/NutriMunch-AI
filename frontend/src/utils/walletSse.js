import { API_BASE_URL } from '../api/axios';

/**
 * Creates and manages a persistent Server-Sent Events (SSE) connection
 * for real-time live wallet balance updates.
 *
 * @param {Object} user Current authenticated user from AuthContext
 * @param {Function} onUpdate Callback when a wallet update is pushed from server
 * @param {Function} onLedgerUpdate Optional callback for admin real-time ledger updates
 * @returns {Function} Unsubscribe / close function to call on unmount
 */
export const subscribeWalletSse = (user, onUpdate, onLedgerUpdate) => {
    if (!user) return () => {};

    const userId = user.id || user.userId || '';
    const email = user.email || user.username || '';
    const role = user.role || '';
    const token = localStorage.getItem('token') || '';

    if (!userId && !email) return () => {};

    let eventSource = null;
    let reconnectTimeout = null;
    let isClosed = false;

    const connect = () => {
        if (isClosed) return;

        const params = new URLSearchParams();
        if (userId) params.append('userId', String(userId));
        if (email) params.append('email', String(email));
        if (role) params.append('role', String(role));
        if (token) params.append('token', token);

        const sseUrl = `${API_BASE_URL}/wallet/stream?${params.toString()}`;

        try {
            eventSource = new EventSource(sseUrl);

            eventSource.addEventListener('CONNECTED', (event) => {
                // Initial handshake confirmed
                console.debug('[Wallet SSE] Connected to server stream for', email || userId);
            });

            eventSource.addEventListener('WALLET_UPDATED', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const myId = String(userId);
                    const myEmail = (email || '').toLowerCase();
                    const targetId = String(data.recipientId || data.userId || '');
                    const targetEmail = (data.recipientEmail || data.email || '').toLowerCase();

                    // Account isolation check
                    const isForMe = (targetId && myId && targetId === myId) ||
                                    (targetEmail && myEmail && targetEmail === myEmail) ||
                                    (!targetId && !targetEmail);

                    if (!isForMe) return;

                    const newBal = data.newBalance !== undefined && data.newBalance !== null
                        ? Number(data.newBalance)
                        : (data.balance !== undefined && data.balance !== null ? Number(data.balance) : null);

                    if (newBal !== null && !isNaN(newBal)) {
                        // Persist to local storage
                        if (myId) {
                            localStorage.setItem(`nutrimunch_wallet_balance_id_${myId}`, String(newBal));
                            localStorage.setItem(`nutrimunch_wallet_balance_${myId}`, String(newBal));
                        }
                        if (myEmail) {
                            localStorage.setItem(`nutrimunch_wallet_balance_email_${myEmail}`, String(newBal));
                            localStorage.setItem(`nutrimunch_wallet_balance_${myEmail}`, String(newBal));
                        }

                        // Dispatch local event across components
                        window.dispatchEvent(new CustomEvent('wallet_updated', {
                            detail: { recipientId: myId, recipientEmail: myEmail, newBalance: newBal, balance: newBal }
                        }));

                        if (typeof onUpdate === 'function') {
                            onUpdate(newBal, data);
                        }
                    }
                } catch (err) {
                    console.warn('[Wallet SSE] Parse error:', err);
                }
            });

            eventSource.addEventListener('LEDGER_UPDATED', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    window.dispatchEvent(new CustomEvent('ledger_updated', { detail: data }));
                    if (typeof onLedgerUpdate === 'function') {
                        onLedgerUpdate(data);
                    }
                } catch (e) {}
            });

            eventSource.addEventListener('APPOINTMENT_UPDATED', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    window.dispatchEvent(new CustomEvent('appointment_updated', { detail: data }));
                } catch (e) {
                    console.warn('[Wallet SSE] Appointment update parse error:', e);
                }
            });

            eventSource.onerror = (err) => {
                // EventSource will automatically attempt reconnection
                console.debug('[Wallet SSE] Connection interrupted, auto-reconnecting...', err);
                if (eventSource.readyState === EventSource.CLOSED && !isClosed) {
                    reconnectTimeout = setTimeout(connect, 3000);
                }
            };
        } catch (e) {
            console.warn('[Wallet SSE] Initialization failed:', e);
            if (!isClosed) reconnectTimeout = setTimeout(connect, 5000);
        }
    };

    connect();

    return () => {
        isClosed = true;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    };
};
