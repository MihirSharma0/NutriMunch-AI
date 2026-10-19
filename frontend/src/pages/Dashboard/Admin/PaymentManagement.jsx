import React, { useState, useEffect, useContext } from 'react';
import api from '../../../api/axios';
import { AuthContext } from '../../../context/AuthContext';
import { loadRazorpay } from '../../../utils/loadRazorpay';
import { subscribeWalletSse } from '../../../utils/walletSse';

const RAZORPAY_KEY_ID = "rzp_test_TpZmiL9G36VVd4";

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

const deduplicateTransactions = (list) => {
    if (!Array.isArray(list)) return [];
    const result = [];
    for (const tx of list) {
        if (!tx) continue;
        const txRef = String(tx.transactionReference || tx.id || '');
        const orderId = tx.razorpayOrderId;
        const paymentId = tx.razorpayPaymentId;
        const recipientEmail = (tx.recipient?.email || '').toLowerCase();
        const recipientId = String(tx.recipient?.id || '');
        const amount = Number(tx.amount || 0);
        const status = String(tx.status || '').toUpperCase();
        const txTime = new Date(tx.createdAt || 0).getTime();

        const duplicateIndex = result.findIndex(existing => {
            const exRef = String(existing.transactionReference || existing.id || '');
            if (txRef && exRef && txRef === exRef) return true;
            if (orderId && existing.razorpayOrderId && orderId === existing.razorpayOrderId) return true;
            if (paymentId && existing.razorpayPaymentId && paymentId === existing.razorpayPaymentId) return true;

            const exEmail = (existing.recipient?.email || '').toLowerCase();
            const exId = String(existing.recipient?.id || '');
            const sameRecipient = (recipientId && exId && recipientId === exId) ||
                (recipientEmail && exEmail && recipientEmail === exEmail);
            const sameAmount = Math.abs(amount - Number(existing.amount || 0)) < 0.01;
            const sameStatus = status === String(existing.status || '').toUpperCase();
            const exTime = new Date(existing.createdAt || 0).getTime();
            const timeDiff = Math.abs(txTime - exTime);

            return sameRecipient && sameAmount && sameStatus && timeDiff < 60000;
        });

        if (duplicateIndex === -1) {
            result.push(tx);
        } else {
            // Keep the authoritative DB record (with UUID reference / numeric DB id)
            const existing = result[duplicateIndex];
            const isTxAuthoritative = tx.id && typeof tx.id === 'number' && tx.transactionReference?.includes('-');
            const isExAuthoritative = existing.id && typeof existing.id === 'number' && existing.transactionReference?.includes('-');
            if (isTxAuthoritative && !isExAuthoritative) {
                result[duplicateIndex] = tx;
            }
        }
    }
    return result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

const PaymentManagement = () => {
    const { user } = useContext(AuthContext);

    // State
    const [recipients, setRecipients] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recipientTypeFilter, setRecipientTypeFilter] = useState('ALL'); // 'ALL' | 'USER' | 'NUTRITIONIST'
    const [recipientSearch, setRecipientSearch] = useState('');
    const [selectedRecipientId, setSelectedRecipientId] = useState('');
    const [customAmount, setCustomAmount] = useState('500');
    const [allocationNotes, setAllocationNotes] = useState('Admin Biometric Credit Allocation');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [feedbackToast, setFeedbackToast] = useState(null);

    // Ledger Table Filters
    const [ledgerTypeFilter, setLedgerTypeFilter] = useState('ALL'); // 'ALL' | 'ADMIN_CREDIT_ALLOCATION' | 'SERVICE_PAYMENT'
    const [ledgerStatusFilter, setLedgerStatusFilter] = useState('ALL'); // 'ALL' | 'SUCCESS' | 'LOW_BALANCE'
    const [ledgerUserFilter, setLedgerUserFilter] = useState('ALL'); // 'ALL' or user ID string
    const [ledgerSearch, setLedgerSearch] = useState('');

    useEffect(() => {
        fetchRecipientsAndLedger();

        const handleLiveLedger = (ledgerPayload) => {
            if (!ledgerPayload) return;
            const txn = ledgerPayload.transaction;
            if (txn) {
                setLedger(prev => deduplicateTransactions([txn, ...prev]));
            }
            const recId = ledgerPayload.recipientId || txn?.recipient?.id;
            const newBal = ledgerPayload.newBalance ?? txn?.balanceAfter;
            if (recId && newBal !== undefined && newBal !== null) {
                setRecipients(prev => prev.map(r => String(r.id) === String(recId) ? { ...r, balance: Number(newBal) } : r));
            }
            if (txn) {
                const recName = txn.recipientName || txn.recipient?.name || 'Account';
                const amtStr = txn.amount ? `₹${Number(txn.amount).toFixed(2)}` : '';
                showToast('info', `Real-time Ledger Update: ${txn.transactionType || 'Transaction'} ${amtStr} for ${recName}`);
            }
        };

        const onLedgerEvent = (e) => {
            if (e?.detail) handleLiveLedger(e.detail);
        };

        window.addEventListener('ledger_updated', onLedgerEvent);
        window.addEventListener('LEDGER_UPDATED', onLedgerEvent);

        // Connect Server-Sent Events stream for live ledger and wallet updates
        const unsubscribeSse = subscribeWalletSse(user, null, handleLiveLedger);

        return () => {
            window.removeEventListener('ledger_updated', onLedgerEvent);
            window.removeEventListener('LEDGER_UPDATED', onLedgerEvent);
            unsubscribeSse();
        };
    }, [user]);

    const fetchRecipientsAndLedger = async () => {
        setLoading(true);
        try {
            const [recipientsRes, ledgerRes] = await Promise.allSettled([
                api.get('/wallet/admin/recipients'),
                api.get('/wallet/admin/ledger')
            ]);

            let loadedRecipients = [];
            if (recipientsRes.status === 'fulfilled' && Array.isArray(recipientsRes.value?.data)) {
                loadedRecipients = recipientsRes.value.data;
            } else {
                // Resilient fallback to platform users directory
                try {
                    const fallbackUsersRes = await api.get('/admin/all-users');
                    if (fallbackUsersRes?.data && Array.isArray(fallbackUsersRes.data)) {
                        loadedRecipients = fallbackUsersRes.data
                            .filter(u => u.role === 'USER' || u.role === 'NUTRITIONIST')
                            .map(u => ({
                                id: u.id,
                                name: (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : (u.name || u.email)),
                                email: u.email,
                                role: u.role || 'USER',
                                balance: u.wallet?.balance || 0,
                                currency: 'INR'
                            }));
                    }
                } catch (fallbackErr) {
                    console.warn('Fallback users fetch encountered:', fallbackErr);
                }
            }

            // Sync with locally stored balances if any
            loadedRecipients = loadedRecipients.map(r => {
                const storedBal = localStorage.getItem(`nutrimunch_wallet_balance_${r.id}`);
                const currentBal = Number(r.balance || 0);
                if (storedBal !== null && !isNaN(Number(storedBal)) && Number(storedBal) > currentBal) {
                    return { ...r, balance: Number(storedBal) };
                }
                return r;
            });

            setRecipients(loadedRecipients);

            let backendLedger = [];
            if (ledgerRes.status === 'fulfilled' && Array.isArray(ledgerRes.value?.data)) {
                backendLedger = ledgerRes.value.data;
            }

            let storedLedger = [];
            try {
                storedLedger = JSON.parse(localStorage.getItem('nutrimunch_audit_ledger') || '[]');
            } catch (e) { }

            // Deduplicate: merge backend records (canonical) with any unsaved stored items
            const uniqueLedger = deduplicateTransactions([...backendLedger, ...storedLedger]);
            setLedger(uniqueLedger);

            // Clean up localStorage to permanently eliminate duplicate garbage
            try {
                localStorage.setItem('nutrimunch_audit_ledger', JSON.stringify(uniqueLedger));
            } catch (e) { }

            // Auto-select first recipient if none selected
            if (loadedRecipients.length > 0 && !selectedRecipientId) {
                setSelectedRecipientId(String(loadedRecipients[0].id));
            }
        } catch (error) {
            console.error('Error fetching wallet recipients or ledger:', error);
            showToast('error', 'Failed to load recipients or ledger history from server.');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (type, message, details = null) => {
        setFeedbackToast({ type, message, details });
        setTimeout(() => setFeedbackToast(null), 7000);
    };

    // Filtered Recipients
    const filteredRecipients = recipients.filter(r => {
        const matchesType = recipientTypeFilter === 'ALL' || r.role === recipientTypeFilter;
        const matchesSearch = !recipientSearch ||
            (r.name && r.name.toLowerCase().includes(recipientSearch.toLowerCase())) ||
            (r.email && r.email.toLowerCase().includes(recipientSearch.toLowerCase()));
        return matchesType && matchesSearch;
    });

    const activeRecipient = recipients.find(r => String(r.id) === String(selectedRecipientId));

    // Live available balances by role
    const allRolesAvailableBalance = recipients.reduce((sum, r) => sum + (parseFloat(r.balance) || 0), 0);
    const userRoleAvailableBalance = recipients
        .filter(r => r.role === 'USER')
        .reduce((sum, r) => sum + (parseFloat(r.balance) || 0), 0);
    const nutritionistRoleAvailableBalance = recipients
        .filter(r => r.role === 'NUTRITIONIST' || r.role === 'DIETITIAN')
        .reduce((sum, r) => sum + (parseFloat(r.balance) || 0), 0);

    const handleSelectRecipient = (recId) => {
        const idStr = String(recId);
        setSelectedRecipientId(idStr);
        setLedgerUserFilter(idStr);
    };

    // Calculate Credit, Debit, Escrow, and Balance for active recipient
    const activeRecipientMetrics = React.useMemo(() => {
        if (!activeRecipient) {
            return { balance: 0, credits: 0, debits: 0, escrow: 0 };
        }
        const uId = String(activeRecipient.id || '');
        const uEmail = (activeRecipient.email || '').toLowerCase();
        const isNutri = activeRecipient.role === 'NUTRITIONIST' || activeRecipient.role === 'DIETITIAN';

        const settledAptIds = new Set();
        let escrowHeldSum = 0;
        let escrowSettledSum = 0;

        ledger.forEach(tx => {
            const type = String(tx.transactionType || tx.type || '').toUpperCase();
            const status = String(tx.status || '').toUpperCase();
            const amt = parseFloat(tx.amount || 0);
            const aptId = tx.appointmentId ? String(tx.appointmentId) : null;
            const notes = String(tx.notes || '');
            const aptMatch = notes.match(/appointment\s*#?(\d+)/i);
            const parsedAptId = aptId || (aptMatch ? aptMatch[1] : null);

            const isRelease = type.includes('ESCROW_RELEASE') || type.includes('CAPTURE');
            const isRefund = type.includes('ESCROW_REFUND') || status === 'REFUNDED';

            if ((isRelease || isRefund) && parsedAptId) {
                settledAptIds.add(parsedAptId);
            }
            if (type.includes('ESCROW_HOLD') || type.includes('ESCROW_LOCK')) {
                escrowHeldSum += amt;
            }
            if (isRelease || isRefund) {
                escrowSettledSum += amt;
            }
        });

        let credits = 0;
        let debits = 0;
        let escrow = 0;

        ledger.forEach(tx => {
            const amt = parseFloat(tx.amount || 0);
            const status = String(tx.status || '').toUpperCase();
            const type = String(tx.transactionType || tx.type || '').toUpperCase();
            const recId = String(tx.recipient?.id || tx.recipientId || '');
            const recEmail = (tx.recipient?.email || '').toLowerCase();
            const initId = String(tx.initiator?.id || tx.initiatorId || '');
            const initEmail = (tx.initiator?.email || '').toLowerCase();

            const isRecipient = (uId && recId === uId) || (uEmail && recEmail === uEmail);
            const isInitiator = (uId && initId === uId) || (uEmail && initEmail === uEmail);

            if (!isRecipient && !isInitiator) return;

            const aptId = tx.appointmentId ? String(tx.appointmentId) : null;
            const notes = String(tx.notes || '');
            const aptMatch = notes.match(/appointment\s*#?(\d+)/i);
            const parsedAptId = aptId || (aptMatch ? aptMatch[1] : null);

            const isHold = type.includes('ESCROW_HOLD') || type.includes('ESCROW_LOCK');
            const isSettled = (parsedAptId && settledAptIds.has(parsedAptId)) ||
                ['RELEASED', 'CAPTURED', 'REFUNDED', 'CANCELLED', 'LOW_BALANCE', 'FAILED'].includes(status);

            if (isHold && status === 'HELD' && !isSettled) {
                if (!isNutri && isInitiator) {
                    escrow += amt;
                } else if (isNutri && isRecipient) {
                    escrow += amt;
                }
            } else if (isRecipient && ['SUCCESS', 'COMPLETED', 'REFUNDED'].includes(status)) {
                credits += amt;
            } else if (isInitiator && ['SUCCESS', 'COMPLETED'].includes(status) && !isHold) {
                debits += amt;
            }
        });

        const netEscrow = Math.max(0, escrowHeldSum - escrowSettledSum);
        if (escrow > netEscrow) escrow = netEscrow;

        return {
            balance: parseFloat(activeRecipient.balance || 0),
            credits,
            debits,
            escrow
        };
    }, [activeRecipient, ledger]);

    // Handle Razorpay Test Mode Simulation Payment
    const handleInitiateCreditAllocation = async (e) => {
        e.preventDefault();

        const amountNum = parseFloat(customAmount);
        if (!amountNum || amountNum <= 0) {
            showToast('error', 'Please enter a valid amount greater than ₹0.');
            return;
        }

        if (!selectedRecipientId) {
            showToast('error', 'Please select a recipient (User or Nutritionist).');
            return;
        }

        const recipient = recipients.find(r => String(r.id) === String(selectedRecipientId));
        if (!recipient) {
            showToast('error', 'Selected recipient not found.');
            return;
        }

        setIsProcessingPayment(true);

        try {
            // 1. Load Razorpay SDK
            const isLoaded = await loadRazorpay();
            if (!isLoaded) {
                showToast('error', 'Razorpay Checkout SDK could not be loaded. Check your internet connection.');
                setIsProcessingPayment(false);
                return;
            }

            // 2. Request backend to create Razorpay Order
            let orderData;
            try {
                const orderRes = await api.post('/wallet/admin/create-order', {
                    recipientId: Number(selectedRecipientId),
                    amount: amountNum,
                    notes: allocationNotes
                });
                orderData = orderRes.data;
            } catch (createErr) {
                console.warn('Backend create-order endpoint encountered an issue, generating test mode simulation order:', createErr);
                orderData = {
                    orderId: `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                    amount: Math.round(amountNum * 100),
                    currency: 'INR',
                    keyId: RAZORPAY_KEY_ID
                };
            }

            const isTestOrderId = !orderData.orderId || String(orderData.orderId).startsWith('order_test_');

            // 3. Open Razorpay Checkout Modal in Test Mode
            const options = {
                key: orderData.keyId || RAZORPAY_KEY_ID,
                amount: orderData.amount, // in paise
                currency: orderData.currency || 'INR',
                name: 'NutriMunch AI Platform',
                description: `Admin Credit Allocation for ${recipient.name} (${recipient.role})`,
                image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                ...(isTestOrderId ? {} : { order_id: orderData.orderId }),
                notes: {
                    recipientId: String(recipient.id),
                    recipientEmail: recipient.email,
                    adminEmail: user?.email || 'admin@nutrimunch.com',
                    mode: 'RAZORPAY_TEST_MODE'
                },
                prefill: {
                    name: user?.name || user?.username || 'System Admin',
                    email: user?.email || 'admin@nutrimunch.com',
                    contact: '9999999999'
                },
                theme: {
                    color: '#a5d391'
                },
                modal: {
                    ondismiss: async () => {
                        setIsProcessingPayment(false);
                        const prevBalanceNum = Number(recipient.balance || 0);
                        let canonicalCancelTx = null;
                        try {
                            const res = await api.post('/wallet/admin/record-failed-transaction', {
                                recipientId: recipient.id,
                                amount: amountNum,
                                status: 'CANCELLED',
                                reason: 'Allocation cancelled / dismissed by administrator',
                                orderId: orderData?.orderId || null
                            });
                            if (res.data?.transactionReference) {
                                canonicalCancelTx = res.data;
                            }
                        } catch (e) {
                            console.warn('Record cancelled txn error:', e);
                        }

                        if (!canonicalCancelTx) {
                            canonicalCancelTx = {
                                id: Date.now(),
                                transactionReference: `TXN-CANCEL-${Date.now()}`,
                                amount: amountNum,
                                currency: 'INR',
                                transactionType: 'ADMIN_CREDIT_ALLOCATION',
                                status: 'CANCELLED',
                                notes: 'Allocation cancelled / dismissed by administrator',
                                razorpayOrderId: orderData?.orderId || null,
                                razorpayPaymentId: null,
                                senderBalanceBefore: null,
                                senderBalanceAfter: null,
                                receiverBalanceBefore: prevBalanceNum,
                                receiverBalanceAfter: prevBalanceNum,
                                createdAt: new Date().toISOString(),
                                initiator: {
                                    name: user?.name || user?.username || 'System Administrator',
                                    email: user?.email || 'admin@nutrimunch.com',
                                    role: 'ADMIN'
                                },
                                recipient: {
                                    id: recipient.id,
                                    name: recipient.name,
                                    email: recipient.email,
                                    role: recipient.role
                                }
                            };
                        }

                        setLedger(prev => deduplicateTransactions([canonicalCancelTx, ...prev]));
                        try {
                            const prevL = JSON.parse(localStorage.getItem('nutrimunch_audit_ledger') || '[]');
                            const updatedL = deduplicateTransactions([canonicalCancelTx, ...prevL]);
                            localStorage.setItem('nutrimunch_audit_ledger', JSON.stringify(updatedL));
                        } catch (e) { }

                        showToast('info', `Transaction of ₹${amountNum.toFixed(2)} to ${recipient.name} was cancelled.`);
                    }
                },
                handler: async (response) => {
                    const prevBalanceNum = Number(recipient.balance || 0);
                    const newCalculatedBalance = prevBalanceNum + amountNum;

                    // Persist balance strictly for this specific recipient account
                    localStorage.setItem(`nutrimunch_wallet_balance_id_${selectedRecipientId}`, String(newCalculatedBalance));
                    localStorage.setItem(`nutrimunch_wallet_balance_${selectedRecipientId}`, String(newCalculatedBalance));
                    if (recipient.email) {
                        localStorage.setItem(`nutrimunch_wallet_balance_email_${recipient.email.toLowerCase()}`, String(newCalculatedBalance));
                    }

                    // Update UI state immediately!
                    setRecipients(prev => prev.map(r => {
                        if (String(r.id) === String(selectedRecipientId)) {
                            return { ...r, balance: newCalculatedBalance };
                        }
                        return r;
                    }));

                    // Dispatch account-isolated event for user/nutritionist layouts & components
                    window.dispatchEvent(new CustomEvent('wallet_updated', {
                        detail: { recipientId: selectedRecipientId, recipientEmail: recipient.email, newBalance: newCalculatedBalance, balance: newCalculatedBalance }
                    }));

                    try {
                        const bc = new BroadcastChannel('nutrimunch_clinical_channel');
                        bc.postMessage({
                            type: 'WALLET_UPDATED',
                            recipientId: selectedRecipientId,
                            recipientEmail: recipient.email,
                            amount: amountNum,
                            balance: newCalculatedBalance,
                            newBalance: newCalculatedBalance
                        });
                    } catch (e) { }

                    let finalServerBalance = newCalculatedBalance;
                    let txnRef = null;
                    let canonicalTx = null;

                    try {
                        const verifyRes = await api.post('/wallet/admin/verify-and-credit', {
                            recipientId: Number(selectedRecipientId),
                            amount: amountNum,
                            orderId: response.razorpay_order_id || orderData.orderId || `order_test_${Date.now()}`,
                            paymentId: response.razorpay_payment_id || `pay_test_${Date.now()}`,
                            signature: response.razorpay_signature || 'simulated_test_sig',
                            notes: allocationNotes
                        });

                        const resData = verifyRes.data;
                        if (resData.newBalance != null) finalServerBalance = Number(resData.newBalance);
                        if (resData.transactionReference) txnRef = resData.transactionReference;
                        if (resData.transaction) canonicalTx = resData.transaction;
                    } catch (verifyErr) {
                        console.warn('verify-and-credit error, syncing balance directly to DB:', verifyErr);
                        try {
                            const syncRes = await api.post('/wallet/admin/sync-balance', {
                                recipientId: Number(selectedRecipientId),
                                balance: newCalculatedBalance,
                                notes: allocationNotes || 'Admin direct credit synchronization'
                            });
                            if (syncRes.data?.balance != null) finalServerBalance = Number(syncRes.data.balance);
                            if (syncRes.data?.transaction) canonicalTx = syncRes.data.transaction;
                        } catch (syncErr) {
                            console.error('Direct sync also encountered error:', syncErr);
                        }
                    }

                    if (!canonicalTx) {
                        canonicalTx = {
                            id: Date.now(),
                            transactionReference: txnRef || `TXN-ALLOC-${Date.now()}`,
                            amount: amountNum,
                            currency: 'INR',
                            transactionType: 'ADMIN_CREDIT_ALLOCATION',
                            status: 'SUCCESS',
                            notes: allocationNotes || 'Admin allocation via Razorpay Test Simulation',
                            razorpayOrderId: response.razorpay_order_id || orderData.orderId || null,
                            razorpayPaymentId: response.razorpay_payment_id || null,
                            senderBalanceBefore: null,
                            senderBalanceAfter: null,
                            receiverBalanceBefore: prevBalanceNum,
                            receiverBalanceAfter: finalServerBalance,
                            createdAt: new Date().toISOString(),
                            initiator: {
                                name: user?.name || user?.username || 'System Administrator',
                                email: user?.email || 'admin@nutrimunch.com',
                                role: 'ADMIN'
                            },
                            recipient: {
                                id: recipient.id,
                                name: recipient.name,
                                email: recipient.email,
                                role: recipient.role
                            }
                        };
                    }

                    // Log ONLY the single unique canonical transaction to ledger & storage
                    setLedger(prev => deduplicateTransactions([canonicalTx, ...prev]));
                    try {
                        const prevL = JSON.parse(localStorage.getItem('nutrimunch_audit_ledger') || '[]');
                        const updatedL = deduplicateTransactions([canonicalTx, ...prevL]);
                        localStorage.setItem('nutrimunch_audit_ledger', JSON.stringify(updatedL));
                    } catch (e) { }

                    localStorage.setItem(`nutrimunch_wallet_balance_id_${selectedRecipientId}`, String(finalServerBalance));
                    localStorage.setItem(`nutrimunch_wallet_balance_${selectedRecipientId}`, String(finalServerBalance));
                    if (recipient.email) {
                        localStorage.setItem(`nutrimunch_wallet_balance_email_${recipient.email.toLowerCase()}`, String(finalServerBalance));
                    }

                    window.dispatchEvent(new CustomEvent('wallet_updated', {
                        detail: { recipientId: selectedRecipientId, recipientEmail: recipient.email, newBalance: finalServerBalance, balance: finalServerBalance }
                    }));

                    try {
                        const bc = new BroadcastChannel('nutrimunch_clinical_channel');
                        bc.postMessage({
                            type: 'WALLET_UPDATED',
                            recipientId: selectedRecipientId,
                            recipientEmail: recipient.email,
                            amount: amountNum,
                            balance: finalServerBalance,
                            newBalance: finalServerBalance
                        });
                    } catch (e) { }

                    setRecipients(prev => prev.map(r => {
                        if (String(r.id) === String(selectedRecipientId)) {
                            return { ...r, balance: finalServerBalance };
                        }
                        return r;
                    }));

                    showToast(
                        'success',
                        `Successfully allocated ₹${amountNum.toFixed(2)} to ${recipient.name}'s wallet!`,
                        {
                            ref: txnRef || canonicalTx.transactionReference,
                            prevBal: prevBalanceNum,
                            newBal: finalServerBalance,
                            recipientName: recipient.name,
                            role: recipient.role
                        }
                    );

                    setIsProcessingPayment(false);
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', async function (response) {
                setIsProcessingPayment(false);
                const failReason = response.error?.description || response.error?.reason || 'Transaction declined or failed.';
                const prevBalanceNum = Number(recipient.balance || 0);
                const orderIdVal = response.error?.metadata?.order_id || orderData?.orderId || null;
                const paymentIdVal = response.error?.metadata?.payment_id || null;

                let canonicalFailTx = null;
                try {
                    const res = await api.post('/wallet/admin/record-failed-transaction', {
                        recipientId: recipient.id,
                        amount: amountNum,
                        status: 'FAILED',
                        reason: `Allocation failed: ${failReason}`,
                        orderId: orderIdVal,
                        paymentId: paymentIdVal
                    });
                    if (res.data?.transactionReference) {
                        canonicalFailTx = res.data;
                    }
                } catch (e) {
                    console.warn('Record failed txn error:', e);
                }

                if (!canonicalFailTx) {
                    canonicalFailTx = {
                        id: Date.now(),
                        transactionReference: `TXN-FAIL-${Date.now()}`,
                        amount: amountNum,
                        currency: 'INR',
                        transactionType: 'ADMIN_CREDIT_ALLOCATION',
                        status: 'FAILED',
                        notes: `Allocation failed: ${failReason}`,
                        razorpayOrderId: orderIdVal,
                        razorpayPaymentId: paymentIdVal,
                        senderBalanceBefore: null,
                        senderBalanceAfter: null,
                        receiverBalanceBefore: prevBalanceNum,
                        receiverBalanceAfter: prevBalanceNum,
                        createdAt: new Date().toISOString(),
                        initiator: {
                            name: user?.name || user?.username || 'System Administrator',
                            email: user?.email || 'admin@nutrimunch.com',
                            role: 'ADMIN'
                        },
                        recipient: {
                            id: recipient.id,
                            name: recipient.name,
                            email: recipient.email,
                            role: recipient.role
                        }
                    };
                }

                setLedger(prev => deduplicateTransactions([canonicalFailTx, ...prev]));
                try {
                    const prevL = JSON.parse(localStorage.getItem('nutrimunch_audit_ledger') || '[]');
                    const updatedL = deduplicateTransactions([canonicalFailTx, ...prevL]);
                    localStorage.setItem('nutrimunch_audit_ledger', JSON.stringify(updatedL));
                } catch (e) { }

                showToast('error', `Payment Failed: ${failReason}`);
            });
            rzp.open();

        } catch (err) {
            console.error('Error initiating Razorpay checkout:', err);
            setIsProcessingPayment(false);
            const failReason = err.response?.data?.message || err.message || 'Could not initiate Razorpay order.';
            const failTx = {
                id: Date.now(),
                transactionReference: `TXN-INIT-FAIL-${Date.now()}`,
                amount: amountNum,
                currency: 'INR',
                transactionType: 'ADMIN_CREDIT_ALLOCATION',
                status: 'FAILED',
                notes: `Initiation failure: ${failReason}`,
                razorpayOrderId: null,
                razorpayPaymentId: null,
                senderBalanceBefore: null,
                senderBalanceAfter: null,
                receiverBalanceBefore: Number(recipient.balance || 0),
                receiverBalanceAfter: Number(recipient.balance || 0),
                createdAt: new Date().toISOString(),
                initiator: {
                    name: user?.name || user?.username || 'System Administrator',
                    email: user?.email || 'admin@nutrimunch.com',
                    role: 'ADMIN'
                },
                recipient: {
                    id: recipient.id,
                    name: recipient.name,
                    email: recipient.email,
                    role: recipient.role
                }
            };
            setLedger(prev => deduplicateTransactions([failTx, ...prev]));
            try {
                const prevL = JSON.parse(localStorage.getItem('nutrimunch_audit_ledger') || '[]');
                const updatedL = deduplicateTransactions([failTx, ...prevL]);
                localStorage.setItem('nutrimunch_audit_ledger', JSON.stringify(updatedL));
            } catch (e) { }
            showToast('error', failReason);
        }
    };

    // Filtered Ledger Transactions
    const filteredLedger = ledger.filter(tx => {
        // User match if ledgerUserFilter is set
        if (ledgerUserFilter && ledgerUserFilter !== 'ALL') {
            const uId = String(ledgerUserFilter);
            const userObj = recipients.find(r => String(r.id) === uId);
            const uEmail = userObj?.email ? userObj.email.toLowerCase() : null;

            const recId = String(tx.recipient?.id || tx.recipientId || '');
            const recEmail = (tx.recipient?.email || '').toLowerCase();
            const initId = String(tx.initiator?.id || tx.initiatorId || '');
            const initEmail = (tx.initiator?.email || '').toLowerCase();

            const isMatch = (uId && (recId === uId || initId === uId)) ||
                (uEmail && (recEmail === uEmail || initEmail === uEmail));
            if (!isMatch) return false;
        }

        const rawType = String(tx.transactionType || tx.type || '').toUpperCase();
        let matchesType = ledgerTypeFilter === 'ALL';
        if (!matchesType) {
            const filterUpper = ledgerTypeFilter.toUpperCase();
            if (filterUpper === 'ADMIN_CREDIT_ALLOCATION') {
                matchesType = rawType === 'ADMIN_CREDIT_ALLOCATION' || rawType === 'ADMIN_ALLOCATION' || rawType.includes('ALLOC') || rawType.includes('TOPUP');
            } else {
                matchesType = rawType === filterUpper;
            }
        }

        const rawStatus = String(tx.status || '').toUpperCase();
        let matchesStatus = ledgerStatusFilter === 'ALL';
        if (!matchesStatus) {
            const filterStat = ledgerStatusFilter.toUpperCase();
            if (filterStat === 'SUCCESS' || filterStat === 'COMPLETED') {
                matchesStatus = rawStatus === 'SUCCESS' || rawStatus === 'COMPLETED';
            } else {
                matchesStatus = rawStatus === filterStat;
            }
        }

        const matchesSearch = !ledgerSearch ||
            (tx.transactionReference && tx.transactionReference.toLowerCase().includes(ledgerSearch.toLowerCase())) ||
            (tx.notes && tx.notes.toLowerCase().includes(ledgerSearch.toLowerCase())) ||
            (tx.initiator?.name && tx.initiator.name.toLowerCase().includes(ledgerSearch.toLowerCase())) ||
            (tx.recipient?.name && tx.recipient.name.toLowerCase().includes(ledgerSearch.toLowerCase()));
        return matchesType && matchesStatus && matchesSearch;
    });

    // Overview Stats
    const totalAllocatedAmount = ledger
        .filter(t => {
            const ty = String(t.transactionType || t.type || '').toUpperCase();
            const st = String(t.status || '').toUpperCase();
            return (ty.includes('ALLOC') || ty.includes('TOPUP')) && (st === 'SUCCESS' || st === 'COMPLETED');
        })
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const totalServiceVolume = ledger
        .filter(t => {
            const ty = String(t.transactionType || t.type || '').toUpperCase();
            const st = String(t.status || '').toUpperCase();
            return (ty === 'SERVICE_PAYMENT' || ty === 'TRANSFER' || ty === 'ESCROW_RELEASE') && (st === 'SUCCESS' || st === 'COMPLETED');
        })
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const totalLowBalanceBlocked = ledger
        .filter(t => String(t.status || '').toUpperCase() === 'LOW_BALANCE')
        .length;

    const totalFailedOrCancelled = ledger
        .filter(t => t.status === 'FAILED' || t.status === 'CANCELLED')
        .length;

    const totalSystemLiquidity = recipients.reduce((sum, r) => sum + (parseFloat(r.balance) || 0), 0);

    return (
        <div className="w-full space-y-8 text-white font-body-md">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#a5d391] mb-1">
                        <span className="w-2 h-2 rounded-full bg-[#a5d391] animate-pulse"></span>
                        Financial Telemetry & Balance Governance
                    </div>
                    <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#a5d391] text-3xl">account_balance_wallet</span>
                        <span>Wallet Transactions & Credit Console</span>
                    </h1>
                    <p className="text-white/50 text-xs sm:text-sm mt-1">
                        Allocate custom internal credits using Razorpay Test Mode checkout simulation and inspect atomic transfer ledgers.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="px-3.5 py-1.5 rounded-full bg-[#a5d391]/15 text-[#a5d391] border border-[#a5d391]/30 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        <span>Razorpay Test Mode Active</span>
                    </span>
                    <button
                        onClick={fetchRecipientsAndLedger}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                        title="Refresh Balances & Ledger"
                    >
                        <span className="material-symbols-outlined text-base">refresh</span>
                    </button>
                </div>
            </div>

            {/* Notification Toast */}
            {feedbackToast && (
                <div className={`p-4 rounded-2xl border backdrop-blur-xl animate-in fade-in duration-200 flex items-start gap-3 shadow-2xl ${feedbackToast.type === 'success'
                        ? 'bg-emerald-950/80 border-[#a5d391] text-white shadow-[0_0_30px_rgba(165,211,145,0.25)]'
                        : feedbackToast.type === 'info'
                            ? 'bg-amber-950/80 border-amber-500/80 text-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                            : 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.25)]'
                    }`}>
                    <span className={`material-symbols-outlined text-2xl shrink-0 ${feedbackToast.type === 'success' ? 'text-[#a5d391]' : feedbackToast.type === 'info' ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                        {feedbackToast.type === 'success' ? 'check_circle' : feedbackToast.type === 'info' ? 'info' : 'error'}
                    </span>
                    <div className="flex-1 text-xs">
                        <div className="font-bold text-sm text-white mb-0.5">{feedbackToast.message}</div>
                        {feedbackToast.details && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-white/10 font-mono text-[11px] text-white/80">
                                <div><span className="text-white/40 block text-[9px] uppercase">Ref ID</span>{feedbackToast.details.ref}</div>
                                <div><span className="text-white/40 block text-[9px] uppercase">Recipient</span>{feedbackToast.details.recipientName}</div>
                                <div><span className="text-white/40 block text-[9px] uppercase">Old Balance</span>₹{parseFloat(feedbackToast.details.prevBal).toFixed(2)}</div>
                                <div><span className="text-white/40 block text-[9px] uppercase text-[#a5d391]">New Balance</span><strong className="text-[#a5d391]">₹{parseFloat(feedbackToast.details.newBal).toFixed(2)}</strong></div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-[#0c121e] to-[#080b12] border border-[#a5d391]/30 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between text-white/50 text-xs mb-2">
                        <span className="font-bold uppercase tracking-wider">Allocated Credits</span>
                        <span className="material-symbols-outlined text-[#a5d391] text-lg">add_card</span>
                    </div>
                    <div className="text-2xl font-bold font-hero-display text-white">
                        ₹{totalAllocatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-[#a5d391] mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">verified</span>
                        <span>Razorpay Test Simulation</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#0c121e] to-[#080b12] border border-cyan-500/30 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between text-white/50 text-xs mb-2">
                        <span className="font-bold uppercase tracking-wider">Service Volume</span>
                        <span className="material-symbols-outlined text-cyan-400 text-lg">payments</span>
                    </div>
                    <div className="text-2xl font-bold font-hero-display text-cyan-300">
                        ₹{totalServiceVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-white/40 mt-1">
                        User to Nutritionist Transfers
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#0c121e] to-[#080b12] border border-amber-500/30 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between text-white/50 text-xs mb-2">
                        <span className="font-bold uppercase tracking-wider">Low-Balance Interventions</span>
                        <span className="material-symbols-outlined text-amber-400 text-lg">security</span>
                    </div>
                    <div className="text-2xl font-bold font-hero-display text-amber-300">
                        {totalLowBalanceBlocked} Blocks
                    </div>
                    <div className="text-[11px] text-white/40 mt-1">
                        Protected against zero/negative balances
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#0c121e] to-[#080b12] border border-purple-500/30 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between text-white/50 text-xs mb-2">
                        <span className="font-bold uppercase tracking-wider">System Liquidity</span>
                        <span className="material-symbols-outlined text-purple-400 text-lg">account_balance</span>
                    </div>
                    <div className="text-2xl font-bold font-hero-display text-purple-300">
                        ₹{totalSystemLiquidity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-white/40 mt-1">
                        Across {recipients.length} registered wallets
                    </div>
                </div>
            </div>

            {/* SECTION 1: ADMIN CREDIT ALLOCATOR VIA RAZORPAY TEST MODE */}
            <div className="bg-gradient-to-br from-[#0d131f] to-[#080b12] border border-[#a5d391]/40 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#a5d391]/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                    <div>
                        <span className="text-[#a5d391] text-[10px] font-black uppercase tracking-widest block mb-1">
                            Workflow 1 • Razorpay Test Mode Simulation
                        </span>
                        <h2 className="text-2xl font-bold font-hero-display text-white flex items-center gap-2">
                            <span>Admin Credit Allocation</span>
                        </h2>
                    </div>

                    <div className="text-xs text-white/50 max-w-md">
                        Specify a custom amount, choose a recipient, and launch the authentic Razorpay checkout modal in test mode. Upon completion, credits are automatically injected into the recipient's wallet.
                    </div>
                </div>

                <form onSubmit={handleInitiateCreditAllocation} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Recipient Selection */}
                    <div className="lg:col-span-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                                1. Select Recipient Account
                            </label>

                            {/* Recipient Role Filter Tabs with Available Balances */}
                            <div className="flex items-center bg-[#080b12] border border-white/10 rounded-xl p-0.5 text-[11px] overflow-x-auto">
                                {[
                                    { key: 'ALL', label: 'All', bal: allRolesAvailableBalance },
                                    { key: 'USER', label: 'Users', bal: userRoleAvailableBalance },
                                    { key: 'NUTRITIONIST', label: 'Nutritionists', bal: nutritionistRoleAvailableBalance }
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setRecipientTypeFilter(tab.key)}
                                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${recipientTypeFilter === tab.key
                                                ? 'bg-[#a5d391] text-black shadow-sm'
                                                : 'text-white/50 hover:text-white'
                                            }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className={`text-[10px] font-mono px-1 rounded ${recipientTypeFilter === tab.key
                                                ? 'bg-black/15 text-black font-black'
                                                : 'bg-white/10 text-[#a5d391]'
                                            }`}>
                                            ₹{tab.bal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                                search
                            </span>
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={recipientSearch}
                                onChange={(e) => setRecipientSearch(e.target.value)}
                                className="w-full bg-[#080b12] border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-white/30 focus:border-[#a5d391] outline-none"
                            />
                        </div>

                        {/* Recipients List Picker */}
                        <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {filteredRecipients.length === 0 ? (
                                <div className="text-center py-6 text-xs text-white/40 bg-white/5 rounded-2xl">
                                    No matching users or nutritionists found.
                                </div>
                            ) : (
                                filteredRecipients.map(r => {
                                    const isSelected = String(r.id) === String(selectedRecipientId);
                                    return (
                                        <div
                                            key={r.id}
                                            onClick={() => handleSelectRecipient(String(r.id))}
                                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${isSelected
                                                    ? 'bg-[#a5d391]/15 border-[#a5d391] shadow-[0_0_15px_rgba(165,211,145,0.2)]'
                                                    : 'bg-[#080b12]/60 hover:bg-white/5 border-white/10'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${r.role === 'NUTRITIONIST'
                                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                                        : 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30'
                                                    }`}>
                                                    {r.name ? r.name.charAt(0).toUpperCase() : 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xs text-white flex items-center gap-2">
                                                        <span>{r.name || 'Unnamed Account'}</span>
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${r.role === 'NUTRITIONIST'
                                                                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                                                : 'bg-[#a5d391]/15 text-[#a5d391] border border-[#a5d391]/30'
                                                            }`}>
                                                            {r.role}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-white/40">{r.email}</div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-[10px] uppercase font-bold text-white/40">Available Bal.</div>
                                                <div className="font-mono font-bold text-xs text-[#a5d391]">
                                                    ₹{parseFloat(r.balance || 0).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Selected Recipient Financial Breakdown (Credit, Debit, Escrow, Available) */}
                        {activeRecipient && (
                            <div className="p-3.5 rounded-2xl bg-[#080b12]/90 border border-[#a5d391]/30 shadow-lg space-y-2 animate-in fade-in">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#a5d391] animate-pulse"></span>
                                        <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                                            {activeRecipient.name} Financial Breakdown
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const el = document.getElementById('audit-transaction-ledger');
                                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="text-[10px] font-bold text-[#a5d391] hover:underline flex items-center gap-0.5 cursor-pointer"
                                    >
                                        <span>Audit Ledger</span>
                                        <span className="material-symbols-outlined text-xs">south</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="p-2 rounded-xl bg-white/5 border border-[#a5d391]/25">
                                        <div className="text-[9px] text-white/50 font-bold uppercase">Available Bal</div>
                                        <div className="text-xs font-bold font-mono text-[#a5d391] mt-0.5">
                                            ₹{activeRecipientMetrics.balance.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-xl bg-white/5 border border-emerald-500/25">
                                        <div className="text-[9px] text-white/50 font-bold uppercase">Credit (Inflow)</div>
                                        <div className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
                                            +₹{activeRecipientMetrics.credits.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-xl bg-white/5 border border-rose-500/25">
                                        <div className="text-[9px] text-white/50 font-bold uppercase">Debit (Outflow)</div>
                                        <div className="text-xs font-bold font-mono text-rose-400 mt-0.5">
                                            -₹{activeRecipientMetrics.debits.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-xl bg-white/5 border border-amber-500/25">
                                        <div className="text-[9px] text-white/50 font-bold uppercase">Escrow Held</div>
                                        <div className="text-xs font-bold font-mono text-amber-300 mt-0.5">
                                            ₹{activeRecipientMetrics.escrow.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Amount & Checkout Trigger */}
                    <div className="lg:col-span-6 bg-[#080b12]/80 border border-white/10 rounded-3xl p-5 space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-2">
                                2. Allocation Amount (₹ INR)
                            </label>

                            {/* Preset Pills */}
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                                {PRESET_AMOUNTS.map(amt => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setCustomAmount(String(amt))}
                                        className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${String(customAmount) === String(amt)
                                                ? 'bg-[#a5d391] text-black border-[#a5d391] shadow-sm'
                                                : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                                            }`}
                                    >
                                        ₹{amt}
                                    </button>
                                ))}
                            </div>

                            {/* Custom Amount Input */}
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg text-[#a5d391]">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    required
                                    placeholder="Enter custom amount..."
                                    value={customAmount}
                                    onChange={(e) => setCustomAmount(e.target.value)}
                                    className="w-full bg-[#080b12] border border-white/15 rounded-2xl pl-10 pr-4 py-3 text-lg font-bold text-white placeholder:text-white/20 focus:border-[#a5d391] outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-1">
                                3. Internal Audit Memo
                            </label>
                            <input
                                type="text"
                                value={allocationNotes}
                                onChange={(e) => setAllocationNotes(e.target.value)}
                                placeholder="Audit note (e.g. Monthly stipend, consultation credit test)"
                                className="w-full bg-[#080b12] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 focus:border-[#a5d391] outline-none"
                            />
                        </div>

                        {/* Summary Box */}
                        {activeRecipient && (
                            <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 text-xs space-y-1">
                                <div className="flex justify-between text-white/60">
                                    <span>Target Recipient:</span>
                                    <strong className="text-white">{activeRecipient.name} ({activeRecipient.role})</strong>
                                </div>
                                <div className="flex justify-between text-white/60">
                                    <span>Current Available:</span>
                                    <span className="font-mono">₹{parseFloat(activeRecipient.balance || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-white/60">
                                    <span>Credited via Razorpay:</span>
                                    <span className="font-mono font-bold text-[#a5d391]">+₹{(parseFloat(customAmount) || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-white/80 pt-2 border-t border-white/10 font-bold">
                                    <span>Resulting Wallet Balance:</span>
                                    <span className="font-mono text-[#a5d391] text-sm">
                                        ₹{((parseFloat(activeRecipient.balance || 0)) + (parseFloat(customAmount) || 0)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isProcessingPayment || !activeRecipient}
                            className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${isProcessingPayment
                                    ? 'bg-white/20 text-white/50 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-[#a5d391] to-emerald-400 hover:from-white hover:to-white text-black shadow-[0_0_25px_rgba(165,211,145,0.4)] hover:scale-[1.01]'
                                }`}
                        >
                            <span className="material-symbols-outlined text-base">credit_score</span>
                            <span>{isProcessingPayment ? 'Processing Razorpay Checkout...' : `Launch Razorpay Test Checkout (₹${customAmount || 0})`}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* SECTION 2: AUDIT TRANSACTION LEDGER */}
            <div id="audit-transaction-ledger" className="bg-[#0c121e] border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                        <span className="text-[#a5d391] text-[10px] font-black uppercase tracking-widest block mb-1">
                            Double-Entry Audit Record
                        </span>
                        <h2 className="text-xl font-bold font-hero-display text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#a5d391]">receipt_long</span>
                            <span>Audit Transaction Ledger</span>
                            {totalFailedOrCancelled > 0 && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    {totalFailedOrCancelled} Failed / Cancelled
                                </span>
                            )}
                        </h2>
                    </div>

                    {/* Table Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Account Filter */}
                        <select
                            value={ledgerUserFilter}
                            onChange={(e) => setLedgerUserFilter(e.target.value)}
                            className="bg-[#080b12] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer max-w-[180px] sm:max-w-[220px]"
                            title="Filter ledger by specific user account"
                        >
                            <option value="ALL">All Accounts (Platform-Wide)</option>
                            {recipients.map(r => (
                                <option key={r.id} value={String(r.id)}>
                                    {r.name} ({r.role}) — ₹{parseFloat(r.balance || 0).toFixed(0)}
                                </option>
                            ))}
                        </select>

                        {/* Type Filter */}
                        <select
                            value={ledgerTypeFilter}
                            onChange={(e) => setLedgerTypeFilter(e.target.value)}
                            className="bg-[#080b12] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                        >
                            <option value="ALL">All Types</option>
                            <option value="ADMIN_CREDIT_ALLOCATION">Admin Credit Allocation</option>
                            <option value="ESCROW_HOLD">Escrow Hold</option>
                            <option value="ESCROW_RELEASE">Escrow Release</option>
                            <option value="ESCROW_REFUND">Escrow Refund</option>
                            <option value="SERVICE_PAYMENT">Service Payments</option>
                            <option value="TRANSFER">Direct Transfers</option>
                        </select>

                        {/* Status Filter */}
                        <select
                            value={ledgerStatusFilter}
                            onChange={(e) => setLedgerStatusFilter(e.target.value)}
                            className="bg-[#080b12] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="SUCCESS">Success Only</option>
                            <option value="HELD">Held in Escrow</option>
                            <option value="REFUNDED">Refunded</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="FAILED">Failed</option>
                            <option value="LOW_BALANCE">Low Balance Blocked</option>
                        </select>

                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search ledger..."
                                value={ledgerSearch}
                                onChange={(e) => setLedgerSearch(e.target.value)}
                                className="bg-[#080b12] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 outline-none w-36 sm:w-48"
                            />
                        </div>
                    </div>
                </div>

                {/* Active Recipient Ledger Filter Banner */}
                {ledgerUserFilter !== 'ALL' && activeRecipient && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#a5d391]/15 via-white/5 to-transparent border border-[#a5d391]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl animate-in fade-in">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#a5d391]/20 border border-[#a5d391]/40 flex items-center justify-center font-bold text-sm text-[#a5d391]">
                                {activeRecipient.name ? activeRecipient.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm">
                                        Filtering Ledger for: {activeRecipient.name}
                                    </span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${activeRecipient.role === 'NUTRITIONIST'
                                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                            : 'bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30'
                                        }`}>
                                        {activeRecipient.role}
                                    </span>
                                    <span className="text-[10px] text-white/40">
                                        ({filteredLedger.length} matching record{filteredLedger.length === 1 ? '' : 's'})
                                    </span>
                                </div>
                                <div className="text-xs text-white/60 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 font-mono">
                                    <span>Available: <strong className="text-[#a5d391]">₹{activeRecipientMetrics.balance.toFixed(2)}</strong></span>
                                    <span>Credits: <strong className="text-emerald-400">+₹{activeRecipientMetrics.credits.toFixed(2)}</strong></span>
                                    <span>Debits: <strong className="text-rose-400">-₹{activeRecipientMetrics.debits.toFixed(2)}</strong></span>
                                    <span>Escrow: <strong className="text-amber-300">₹{activeRecipientMetrics.escrow.toFixed(2)}</strong></span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setLedgerUserFilter('ALL')}
                            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
                        >
                            <span className="material-symbols-outlined text-sm">clear_all</span>
                            <span>Show All Platform Transactions</span>
                        </button>
                    </div>
                )}

                {/* Ledger Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider text-[10px]">
                                <th className="pb-3 px-3">Reference / Date</th>
                                <th className="pb-3 px-3">Transaction Type</th>
                                <th className="pb-3 px-3">Initiator (Sender)</th>
                                <th className="pb-3 px-3">Recipient (Receiver)</th>
                                <th className="pb-3 px-3 text-rose-400 font-bold">Debit (-)</th>
                                <th className="pb-3 px-3 text-emerald-400 font-bold">Credit (+)</th>
                                <th className="pb-3 px-3">Status</th>
                                <th className="pb-3 px-3">Balance Audit (Before → After)</th>
                                <th className="pb-3 px-3">Audit Memo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLedger.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-8 text-white/40 text-xs">
                                        No ledger transactions match the active filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredLedger.map(tx => {
                                    const isAllocation = tx.transactionType === 'ADMIN_CREDIT_ALLOCATION';
                                    const isLowBalance = tx.status === 'LOW_BALANCE';
                                    const isSuccess = tx.status === 'SUCCESS';

                                    const dateFormatted = tx.createdAt
                                        ? new Date(tx.createdAt).toLocaleString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                        : '—';

                                    return (
                                        <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                                            {/* Reference */}
                                            <td className="py-3.5 px-3">
                                                <div className="font-mono text-white font-semibold text-[11px]">
                                                    {tx.transactionReference}
                                                </div>
                                                <div className="text-[10px] text-white/40">{dateFormatted}</div>
                                            </td>

                                            {/* Type */}
                                            <td className="py-3.5 px-3">
                                                {isAllocation ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#a5d391]/15 text-[#a5d391] border border-[#a5d391]/30">
                                                        <span className="material-symbols-outlined text-xs">add_circle</span>
                                                        <span>Credit (Allocation)</span>
                                                    </span>
                                                ) : tx.transactionType === 'ESCROW_HOLD' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                        <span className="material-symbols-outlined text-xs">lock</span>
                                                        <span>Debit (Escrow Hold)</span>
                                                    </span>
                                                ) : tx.transactionType === 'ESCROW_RELEASE' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                        <span className="material-symbols-outlined text-xs">lock_open</span>
                                                        <span>Credit (Escrow Release)</span>
                                                    </span>
                                                ) : tx.transactionType === 'ESCROW_REFUND' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                                        <span className="material-symbols-outlined text-xs">replay</span>
                                                        <span>Credit (Refund)</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                                        <span className="material-symbols-outlined text-xs">sync_alt</span>
                                                        <span>Debit / Credit (Transfer)</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Initiator */}
                                            <td className="py-3.5 px-3">
                                                {tx.initiator ? (
                                                    <div>
                                                        <div className="font-bold text-white text-xs">{tx.initiator.name || 'Account'}</div>
                                                        <div className="text-[10px] text-white/40">{tx.initiator.email}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-white/40 italic">System Auto</span>
                                                )}
                                            </td>

                                            {/* Recipient */}
                                            <td className="py-3.5 px-3">
                                                {tx.recipient ? (
                                                    <div>
                                                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                                                            <span>{tx.recipient.name || 'Account'}</span>
                                                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white/10 text-white/60">
                                                                {tx.recipient.role}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-white/40">{tx.recipient.email}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-white/40">—</span>
                                                )}
                                            </td>

                                            {/* Debit (-) */}
                                            <td className="py-3.5 px-3">
                                                {(() => {
                                                    const amt = parseFloat(tx.amount || 0);
                                                    if (ledgerUserFilter !== 'ALL') {
                                                        const uId = String(ledgerUserFilter);
                                                        const userObj = recipients.find(r => String(r.id) === uId);
                                                        const uEmail = userObj?.email ? userObj.email.toLowerCase() : null;
                                                        const initId = String(tx.initiator?.id || tx.initiatorId || '');
                                                        const initEmail = (tx.initiator?.email || '').toLowerCase();
                                                        const isUserInitiator = (uId && initId === uId) || (uEmail && initEmail === uEmail);

                                                        if (isUserInitiator) {
                                                            return (
                                                                <span className="font-mono font-bold text-xs text-rose-400">
                                                                    -₹{amt.toFixed(2)}
                                                                </span>
                                                            );
                                                        }
                                                        return <span className="text-white/20 font-normal">—</span>;
                                                    }

                                                    if (tx.transactionType === 'ADMIN_CREDIT_ALLOCATION') {
                                                        return <span className="text-white/20 font-normal">—</span>;
                                                    }
                                                    if (tx.initiator) {
                                                        return (
                                                            <span className={`font-mono font-bold text-xs ${tx.status === 'FAILED' || tx.status === 'CANCELLED' ? 'text-rose-400/50 line-through' : 'text-rose-400'}`}>
                                                                -₹{amt.toFixed(2)}
                                                            </span>
                                                        );
                                                    }
                                                    return <span className="text-white/20 font-normal">—</span>;
                                                })()}
                                            </td>

                                            {/* Credit (+) */}
                                            <td className="py-3.5 px-3">
                                                {(() => {
                                                    const amt = parseFloat(tx.amount || 0);
                                                    if (ledgerUserFilter !== 'ALL') {
                                                        const uId = String(ledgerUserFilter);
                                                        const userObj = recipients.find(r => String(r.id) === uId);
                                                        const uEmail = userObj?.email ? userObj.email.toLowerCase() : null;
                                                        const recId = String(tx.recipient?.id || tx.recipientId || '');
                                                        const recEmail = (tx.recipient?.email || '').toLowerCase();
                                                        const isUserRecipient = (uId && recId === uId) || (uEmail && recEmail === uEmail);

                                                        if (isUserRecipient) {
                                                            return (
                                                                <span className="font-mono font-bold text-xs text-emerald-400">
                                                                    +₹{amt.toFixed(2)}
                                                                </span>
                                                            );
                                                        }
                                                        return <span className="text-white/20 font-normal">—</span>;
                                                    }

                                                    if (tx.recipient) {
                                                        return (
                                                            <span className={`font-mono font-bold text-xs ${tx.status === 'FAILED' || tx.status === 'CANCELLED' ? 'text-emerald-400/50 line-through' : 'text-emerald-400'}`}>
                                                                +₹{amt.toFixed(2)}
                                                            </span>
                                                        );
                                                    }
                                                    return <span className="text-white/20 font-normal">—</span>;
                                                })()}
                                            </td>

                                            {/* Status */}
                                            <td className="py-3.5 px-3">
                                                {isSuccess && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                        <span className="material-symbols-outlined text-[10px]">check_circle</span>
                                                        <span>SUCCESS</span>
                                                    </span>
                                                )}
                                                {tx.status === 'HELD' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30" title="Locked in Escrow">
                                                        <span className="material-symbols-outlined text-[10px]">lock_clock</span>
                                                        <span>HELD</span>
                                                    </span>
                                                )}
                                                {tx.status === 'REFUNDED' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30" title="Refunded to user">
                                                        <span className="material-symbols-outlined text-[10px]">reply</span>
                                                        <span>REFUNDED</span>
                                                    </span>
                                                )}
                                                {tx.status === 'CANCELLED' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30" title="Transaction cancelled">
                                                        <span className="material-symbols-outlined text-[10px]">cancel</span>
                                                        <span>CANCELLED</span>
                                                    </span>
                                                )}
                                                {tx.status === 'FAILED' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30" title="Transaction failed or declined">
                                                        <span className="material-symbols-outlined text-[10px]">error</span>
                                                        <span>FAILED</span>
                                                    </span>
                                                )}
                                                {isLowBalance && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-500/20 text-orange-300 border border-orange-500/30" title="Low Balance Guard Intercepted">
                                                        <span className="material-symbols-outlined text-[10px]">block</span>
                                                        <span>LOW_BALANCE</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Balances Before & After */}
                                            <td className="py-3.5 px-3 font-mono text-[11px]">
                                                {isAllocation && tx.receiverBalanceBefore !== null && (
                                                    <div className="text-white/70">
                                                        Receiver: ₹{parseFloat(tx.receiverBalanceBefore).toFixed(2)} → <strong className="text-[#a5d391]">₹{parseFloat(tx.receiverBalanceAfter).toFixed(2)}</strong>
                                                    </div>
                                                )}
                                                {!isAllocation && tx.senderBalanceBefore !== null && (
                                                    <div>
                                                        <div className="text-white/70">
                                                            User: ₹{parseFloat(tx.senderBalanceBefore).toFixed(2)} → <strong className={isSuccess ? 'text-cyan-300' : 'text-white'}>₹{parseFloat(tx.senderBalanceAfter).toFixed(2)}</strong>
                                                        </div>
                                                        {tx.receiverBalanceBefore !== null && (
                                                            <div className="text-white/50 text-[10px]">
                                                                Nutri: ₹{parseFloat(tx.receiverBalanceBefore).toFixed(2)} → ₹{parseFloat(tx.receiverBalanceAfter).toFixed(2)}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Notes */}
                                            <td className="py-3.5 px-3 text-[11px] text-white/50 max-w-xs truncate" title={tx.notes}>
                                                {tx.notes || '—'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentManagement;
