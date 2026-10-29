/**
 * Shared Transaction History Ledger
 * Displays chronological wallet transactions, escrow releases, appointment payouts,
 * and refunds for both patients and nutritionists.
 */
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import api from '../../../api/axios';
import { subscribeWalletSse } from '../../../utils/walletSse';

/**
 * Merges and deduplicates transactions across multiple sources and local caches.
 * 
 * @param {...Array<Object>} lists - Transaction lists to merge
 * @returns {Array<Object>} Deduplicated transaction list
 */
const mergeTransactions = (...lists) => {
    const transactionsByKey = new Map();
    lists.flat().forEach(transaction => {
        if (!transaction) return;
        const key = transaction.transactionReference
            ? `ref:${transaction.transactionReference}`
            : transaction.id != null
                ? `id:${transaction.id}`
                : null;
        if (!key) return;
        const existing = transactionsByKey.get(key);
        transactionsByKey.set(key, existing ? { ...existing, ...transaction } : transaction);
    });
    return [...transactionsByKey.values()].sort((a, b) => (
        new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0)
    ));
};

/**
 * TransactionHistory Component
 * Shared financial audit table with type filters, search, and live balance sync.
 */
const TransactionHistory = () => {
    const { user } = useContext(AuthContext);

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedTx, setSelectedTx] = useState(null);
    const [liveEventBanner, setLiveEventBanner] = useState(null);

    const rawRole = user?.role ? String(user.role).toUpperCase().replace('ROLE_', '') : 'USER';
    const isAdmin = rawRole === 'ADMIN';
    const isNutritionist = rawRole === 'NUTRITIONIST';

    // 1. Fetch live balance & transaction ledger
    const loadData = async () => {
        try {
            setLoading(true);
            const myId = user?.id || user?.userId;
            const myEmail = user?.email?.toLowerCase();

            // Fetch balance
            const balRes = await api.get('/wallet/me', {
                params: { userId: myId || '', email: myEmail || '' }
            }).catch(() => null);

            if (balRes?.data && balRes.data.balance !== undefined) {
                setBalance(Number(balRes.data.balance));
            } else {
                const cached = localStorage.getItem(`nutrimunch_wallet_balance_${myId}`) ||
                               localStorage.getItem(`nutrimunch_wallet_balance_${myEmail}`);
                if (cached) setBalance(Number(cached));
            }

            // Fetch transactions (Try /api/transactions then fallback to /api/wallet/transactions)
            let txList = [];
            try {
                const txRes = await api.get('/transactions');
                if (Array.isArray(txRes.data)) txList = txRes.data;
            } catch (err) {
                const fallbackRes = await api.get('/wallet/transactions', {
                    params: { userId: myId, email: myEmail }
                }).catch(() => null);
                if (Array.isArray(fallbackRes?.data)) txList = fallbackRes.data;
            }

            // If admin, merge with admin ledger if empty
            if (isAdmin && txList.length === 0) {
                const adminLedger = await api.get('/wallet/admin/ledger').catch(() => null);
                if (Array.isArray(adminLedger?.data)) txList = adminLedger.data;
            }

            setTransactions(current => mergeTransactions(txList, current));
        } catch (err) {
            console.error('Failed to load transaction history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // 2. Real-time SSE integration
        const handleLiveUpdate = (e) => {
            const detail = e.detail;
            if (!detail) return;

            // Update balance immediately
            const newBal = detail.newBalance !== undefined ? detail.newBalance : detail.balance;
            if (newBal !== undefined && newBal !== null) {
                setBalance(Number(newBal));
            }

            // Prepend transaction if present in payload
            if (detail.transaction) {
                setTransactions(prev => mergeTransactions(
                    [{ ...detail.transaction, isLive: true }],
                    prev
                ));
            } else if (detail.transactionId || detail.transactionReference) {
                const syntheticTx = {
                    id: detail.transactionId || Date.now(),
                    transactionReference: detail.transactionReference || `TXN-LIVE-${Date.now()}`,
                    transactionType: detail.type || detail.eventType || 'WALLET_UPDATED',
                    amount: detail.amount ? Math.abs(Number(detail.amount)) : 0,
                    status: detail.status || 'SUCCESS',
                    notes: detail.description || detail.message || 'Real-time wallet balance update',
                    createdAt: detail.timestamp || new Date().toISOString(),
                    receiverBalanceAfter: newBal,
                    isLive: true
                };
                setTransactions(prev => mergeTransactions([syntheticTx], prev));
            }

            // Show banner notification
            if (detail.description || detail.message || detail.amount) {
                const amt = detail.amount !== undefined ? Number(detail.amount) : null;
                const sign = amt && amt > 0 ? '+' : '';
                const bannerText = `${detail.description || detail.message || 'Wallet updated'}${amt !== null ? ` (${sign}₹${Math.abs(amt).toFixed(2)})` : ''}`;
                setLiveEventBanner(bannerText);
                setTimeout(() => setLiveEventBanner(null), 5000);
            }
        };

        window.addEventListener('wallet_update', handleLiveUpdate);
        window.addEventListener('wallet_updated', handleLiveUpdate);
        window.addEventListener('ledger_updated', handleLiveUpdate);

        const unsubscribeSse = subscribeWalletSse(user, (b) => setBalance(Number(b)));

        return () => {
            window.removeEventListener('wallet_update', handleLiveUpdate);
            window.removeEventListener('wallet_updated', handleLiveUpdate);
            window.removeEventListener('ledger_updated', handleLiveUpdate);
            unsubscribeSse();
        };
    }, [user]);

    // Financial Metrics Calculation
    const myId = String(user?.id || user?.userId || '');
    const myEmail = (user?.email || '').toLowerCase();

    const belongsToCurrentUser = (person) => (
        (person?.id != null && String(person.id) === myId)
        || (person?.email && person.email.toLowerCase() === myEmail)
    );

    const isCreditForMe = (tx) => {
        const type = String(tx.transactionType || tx.type || '').toUpperCase();
        if (type.includes('ALLOC') || type.includes('TOPUP') || type.includes('BONUS')) return true;
        if (type.includes('REFUND')) return belongsToCurrentUser(tx.recipient);
        if ((type === 'TRANSFER' || type === 'ESCROW_RELEASE') && isNutritionist) return true;
        if (belongsToCurrentUser(tx.recipient)) return true;
        return false;
    };

    const isDebitForMe = (tx) => {
        const type = String(tx.transactionType || tx.type || '').toUpperCase();
        if (type.includes('REFUND')) return belongsToCurrentUser(tx.initiator);
        if (type.includes('DEDUCTION')) return true;
        if (belongsToCurrentUser(tx.initiator)) return true;
        if (!isNutritionist && (type === 'ESCROW_LOCK' || type === 'ESCROW_HOLD' || type === 'SERVICE_PAYMENT')) return true;
        return false;
    };

    // 1. Identify all transactions where escrow was transferred forward (ESCROW_RELEASE) or back (ESCROW_REFUND)
    const settledAppointmentIds = new Set();
    const settledReferences = new Set();
    let totalEscrowHeld = 0;
    let totalEscrowSettled = 0;

    transactions.forEach(tx => {
        const amt = Number(tx.amount || 0);
        const status = String(tx.status || '').toUpperCase();
        const type = String(tx.transactionType || tx.type || '').toUpperCase();
        const aptId = tx.appointmentId ? String(tx.appointmentId) : null;
        const ref = String(tx.transactionReference || '');
        const notes = String(tx.notes || '');

        const isRelease = type.includes('ESCROW_RELEASE') || (type === 'TRANSFER' && aptId);
        const isRefund = type.includes('ESCROW_REFUND') || type === 'REFUND' || status === 'REFUNDED';
        const isSettlement = isRelease || isRefund || status === 'RELEASED' || status === 'CAPTURED';

        if (aptId && isSettlement) {
            settledAppointmentIds.add(aptId);
        }
        if (ref && isSettlement) {
            settledReferences.add(ref);
        }
        const aptMatch = notes.match(/appointment\s*#?(\d+)/i);
        if (aptMatch && isSettlement) {
            settledAppointmentIds.add(aptMatch[1]);
        }

        if (type.includes('ESCROW_HOLD') || type.includes('ESCROW_LOCK')) {
            if (status !== 'LOW_BALANCE' && status !== 'FAILED') {
                totalEscrowHeld += amt;
            }
        }

        if (isRelease || isRefund) {
            totalEscrowSettled += amt;
        }
    });

    let totalInflow = 0;
    let totalOutflow = 0;
    let escrowLocked = 0;

    transactions.forEach(tx => {
        const amt = Number(tx.amount || 0);
        const status = String(tx.status || '').toUpperCase();
        const type = String(tx.transactionType || tx.type || '').toUpperCase();
        const aptId = tx.appointmentId ? String(tx.appointmentId) : null;
        const notes = String(tx.notes || '');
        const aptMatch = notes.match(/appointment\s*#?(\d+)/i);
        const parsedAptId = aptId || (aptMatch ? aptMatch[1] : null);

        const isHold = type.includes('ESCROW_HOLD') || type.includes('ESCROW_LOCK');
        const isSettled = (parsedAptId && settledAppointmentIds.has(parsedAptId)) ||
                          status === 'RELEASED' ||
                          status === 'CAPTURED' ||
                          status === 'REFUNDED' ||
                          status === 'CANCELLED' ||
                          status === 'LOW_BALANCE' ||
                          status === 'FAILED';

        const isMyEscrow = !isNutritionist ||
                           (tx.recipient?.id && String(tx.recipient.id) === myId) ||
                           (tx.recipient?.email && tx.recipient.email.toLowerCase() === myEmail);

        // Escrow is locked ONLY if still HELD and NOT yet released or refunded
        if (isHold && status === 'HELD' && !isSettled && isMyEscrow) {
            escrowLocked += amt;
        } else if (isCreditForMe(tx) && (status === 'SUCCESS' || status === 'COMPLETED' || status === 'REFUNDED')) {
            totalInflow += amt;
        } else if (isDebitForMe(tx) && (status === 'SUCCESS' || status === 'COMPLETED')) {
            if (!isHold) {
                totalOutflow += amt;
            }
        }
    });

    // Net Escrow Check: Escrow locked cannot exceed net held minus settled (forward or backward)
    const netEscrow = Math.max(0, totalEscrowHeld - totalEscrowSettled);
    if (escrowLocked > netEscrow) {
        escrowLocked = netEscrow;
    }

    // Filtering logic
    const filteredTransactions = transactions.filter(tx => {
        const type = String(tx.transactionType || tx.type || '').toUpperCase();
        const status = String(tx.status || '').toUpperCase();
        const ref = String(tx.transactionReference || '').toLowerCase();
        const notes = String(tx.notes || '').toLowerCase();
        const initiatorName = String(tx.initiator?.name || '').toLowerCase();
        const recipientName = String(tx.recipient?.name || '').toLowerCase();
        const search = searchTerm.toLowerCase();

        // Search match
        const matchesSearch = !search || ref.includes(search) || notes.includes(search) || initiatorName.includes(search) || recipientName.includes(search);

        // Type match
        let matchesType = true;
        if (typeFilter === 'CREDIT') {
            matchesType = isCreditForMe(tx);
        } else if (typeFilter === 'DEBIT') {
            matchesType = isDebitForMe(tx);
        } else if (typeFilter === 'ALLOCATION') {
            matchesType = type.includes('ALLOC') || type.includes('TOPUP') || type.includes('BONUS');
        } else if (typeFilter === 'ESCROW_LOCK') {
            matchesType = type.includes('ESCROW_LOCK') || type.includes('ESCROW_HOLD');
        } else if (typeFilter === 'TRANSFER') {
            matchesType = type === 'TRANSFER' || type.includes('ESCROW_RELEASE') || type.includes('SERVICE_PAYMENT');
        } else if (typeFilter === 'REFUND') {
            matchesType = type.includes('REFUND');
        }

        // Status match
        let matchesStatus = true;
        if (statusFilter !== 'ALL') {
            matchesStatus = status === statusFilter || (statusFilter === 'COMPLETED' && status === 'SUCCESS');
        }

        return matchesSearch && matchesType && matchesStatus;
    });

    const getTypeBadge = (tx) => {
        const type = String(tx.transactionType || tx.type || '').toUpperCase();
        const isCredit = isCreditForMe(tx);
        const isDebit = isDebitForMe(tx);

        if (type.includes('ALLOC') || type.includes('TOPUP') || type.includes('BONUS')) {
            return {
                label: 'Credit (Admin Allocation)',
                icon: 'add_circle',
                style: 'bg-[#a5d391]/15 text-[#a5d391] border-[#a5d391]/30'
            };
        }
        if (type.includes('ESCROW_LOCK') || type.includes('ESCROW_HOLD')) {
            return {
                label: isNutritionist ? 'Credit (Pending Escrow)' : 'Debit (Escrow Hold)',
                icon: 'lock',
                style: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            };
        }
        if (type === 'TRANSFER' || type.includes('ESCROW_RELEASE') || type.includes('SERVICE_PAYMENT')) {
            return {
                label: isCredit ? 'Credit (Session Earning)' : 'Debit (Consultation Fee)',
                icon: isCredit ? 'arrow_downward' : 'arrow_upward',
                style: isCredit
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            };
        }
        if (type.includes('REFUND')) {
            return {
                label: isCredit ? 'Credit (Escrow Refund)' : 'Debit (Escrow Refund)',
                icon: isCredit ? 'replay' : 'undo',
                style: isCredit
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            };
        }
        if (type.includes('DEDUCTION')) {
            return {
                label: 'Debit (Platform Deduction)',
                icon: 'remove_circle',
                style: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            };
        }
        return {
            label: isCredit ? `Credit (${type})` : isDebit ? `Debit (${type})` : type,
            icon: isCredit ? 'add_circle' : 'remove_circle',
            style: isCredit ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-white/10 text-white/80 border-white/20'
        };
    };

    const getStatusBadge = (status) => {
        const s = String(status || '').toUpperCase();
        if (s === 'SUCCESS' || s === 'COMPLETED') {
            return { text: 'COMPLETED', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
        }
        if (s === 'HELD' || s === 'PENDING') {
            return { text: 'ESCROW HELD', style: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
        }
        if (s === 'RELEASED' || s === 'CAPTURED') {
            return { text: 'ESCROW RELEASED', style: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' };
        }
        if (s === 'REFUNDED') {
            return { text: 'REFUNDED', style: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
        }
        if (s === 'CANCELLED') {
            return { text: 'CANCELLED', style: 'bg-gray-500/10 text-gray-400 border-gray-500/30' };
        }
        return { text: 'FAILED', style: 'bg-red-500/10 text-red-400 border-red-500/30' };
    };

    return (
        <div className="min-h-screen bg-[#080b12] text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Real-time Push Notification Banner */}
                {liveEventBanner && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#a5d391]/20 via-[#a5d391]/10 to-transparent border border-[#a5d391]/40 flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-[#a5d391] animate-ping"></span>
                            <span className="material-symbols-outlined text-[#a5d391]">bolt</span>
                            <span className="text-xs sm:text-sm font-bold tracking-wide">{liveEventBanner}</span>
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-[#a5d391] bg-[#a5d391]/20 px-2.5 py-1 rounded-full border border-[#a5d391]/30">
                            Live Push
                        </span>
                    </div>
                )}

                {/* Header & Back Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
                            <Link to={isAdmin ? "/dashboard/admin" : isNutritionist ? "/dashboard/nutritionist" : "/dashboard/user"} className="hover:text-[#a5d391] transition-colors">
                                Dashboard
                            </Link>
                            <span>/</span>
                            <span className="text-[#a5d391] font-semibold">Ledger & Transaction History</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3 font-hero-display">
                            <span className="material-symbols-outlined text-[#a5d391] text-3xl">account_balance_wallet</span>
                            Wallet & Transaction Ledger
                        </h1>
                        <p className="text-xs sm:text-sm text-white/60 mt-1">
                            Audited real-time ledger records for all allocations, escrow locks, consultation transfers, and refunds.
                        </p>
                    </div>

                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                        <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>sync</span>
                        Refresh Ledger
                    </button>
                </div>

                {/* Summary Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Live Wallet Balance */}
                    <div className="p-5 rounded-3xl bg-[#0c121e]/80 border border-[#a5d391]/30 shadow-xl backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#a5d391]/10 rounded-full blur-2xl group-hover:bg-[#a5d391]/20 transition-all"></div>
                        <div className="flex items-center justify-between text-white/60 text-xs font-semibold">
                            <span>Available Balance</span>
                            <span className="w-2 h-2 rounded-full bg-[#a5d391] shadow-[0_0_8px_rgba(165,211,145,0.8)] animate-pulse"></span>
                        </div>
                        <div className="text-3xl font-black text-white font-mono mt-2 tracking-tight">
                            ₹{balance.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-[#a5d391] font-bold mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">verified</span>
                            Synced in Real-time via SSE
                        </div>
                    </div>

                    {/* Total Credits / Inflow */}
                    <div className="p-5 rounded-3xl bg-[#0c121e]/80 border border-white/10 shadow-xl backdrop-blur-xl">
                        <div className="text-white/60 text-xs font-semibold">Total Credits / Inflow</div>
                        <div className="text-2xl font-black text-emerald-400 font-mono mt-2 tracking-tight">
                            +₹{totalInflow.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-white/40 mt-2">
                            {isNutritionist ? 'Direct session credits & allocations' : 'Allocations & consultation refunds'}
                        </div>
                    </div>

                    {/* Total Debits / Outflow */}
                    <div className="p-5 rounded-3xl bg-[#0c121e]/80 border border-white/10 shadow-xl backdrop-blur-xl">
                        <div className="text-white/60 text-xs font-semibold">Total Debits / Outflow</div>
                        <div className="text-2xl font-black text-rose-400 font-mono mt-2 tracking-tight">
                            -₹{totalOutflow.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-white/40 mt-2">
                            {isNutritionist ? 'Platform fee adjustments & refunds' : 'Completed consultation fees'}
                        </div>
                    </div>

                    {/* Escrow Locked */}
                    <div className="p-5 rounded-3xl bg-[#0c121e]/80 border border-amber-500/20 shadow-xl backdrop-blur-xl">
                        <div className="text-white/60 text-xs font-semibold">
                            {isNutritionist ? 'Pending Session Escrow' : 'Locked in Escrow'}
                        </div>
                        <div className="text-2xl font-black text-amber-300 font-mono mt-2 tracking-tight">
                            ₹{escrowLocked.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-amber-400/80 mt-2">
                            {isNutritionist ? 'Credited upon consultation completion' : 'Pending booking confirmation'}
                        </div>
                    </div>
                </div>

                {/* Filters & Search Bar */}
                <div className="p-4 rounded-3xl bg-[#0c121e]/60 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Search Input */}
                    <div className="relative flex-grow max-w-md">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-lg">search</span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by reference, memo, or party..."
                            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#a5d391]/50 transition-colors"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Type Filters */}
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto">
                            {[
                                { key: 'ALL', label: 'All' },
                                { key: 'CREDIT', label: 'Credit (+)' },
                                { key: 'DEBIT', label: 'Debit (-)' },
                                { key: 'ALLOCATION', label: 'Allocations' },
                                { key: 'ESCROW_LOCK', label: 'Escrow' },
                                { key: 'REFUND', label: 'Refunds' }
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setTypeFilter(f.key)}
                                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${typeFilter === f.key ? 'bg-[#a5d391] text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-[#a5d391]/50 cursor-pointer"
                        >
                            <option value="ALL" className="bg-[#0c121e] text-white">All Statuses</option>
                            <option value="COMPLETED" className="bg-[#0c121e] text-white">Completed / Success</option>
                            <option value="HELD" className="bg-[#0c121e] text-white">Escrow Held</option>
                            <option value="REFUNDED" className="bg-[#0c121e] text-white">Refunded</option>
                            <option value="FAILED" className="bg-[#0c121e] text-white">Failed / Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* Ledger Transactions Table */}
                <div className="rounded-3xl bg-[#0c121e]/80 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5 text-white/50 uppercase text-[10px] tracking-wider font-mono">
                                    <th className="py-3.5 px-4">Reference & Date</th>
                                    <th className="py-3.5 px-4">Transaction Type</th>
                                    <th className="py-3.5 px-4">Counterparty</th>
                                    <th className="py-3.5 px-4 text-rose-400 font-bold">Debit (-)</th>
                                    <th className="py-3.5 px-4 text-emerald-400 font-bold">Credit (+)</th>
                                    <th className="py-3.5 px-4">Status</th>
                                    <th className="py-3.5 px-4">Balance Audit</th>
                                    <th className="py-3.5 px-4 text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="py-12 text-center text-white/40">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined animate-spin text-lg text-[#a5d391]">progress_activity</span>
                                                <span>Loading audited ledger history...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="py-12 text-center text-white/40">
                                            No transaction records found matching your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map((tx) => {
                                        const type = String(tx.transactionType || tx.type || '').toUpperCase();
                                        const typeBadge = getTypeBadge(tx);
                                        const statusBadge = getStatusBadge(tx.status);
                                        const isCredit = isCreditForMe(tx);
                                        const isDebit = isDebitForMe(tx);
                                        const amtNum = Number(tx.amount || 0);
                                        const auditBalance = isDebit
                                            ? tx.senderBalanceAfter ?? tx.receiverBalanceAfter
                                            : tx.receiverBalanceAfter ?? tx.senderBalanceAfter;

                                        return (
                                            <tr
                                                key={tx.id || tx.transactionReference}
                                                className={`hover:bg-white/5 transition-colors cursor-pointer group ${tx.isLive ? 'bg-[#a5d391]/10' : ''}`}
                                                onClick={() => setSelectedTx(tx)}
                                            >
                                                {/* Reference & Date */}
                                                <td className="py-3 px-4 font-mono">
                                                    <div className="flex items-center gap-2 font-bold text-white group-hover:text-[#a5d391] transition-colors">
                                                        <span>{tx.transactionReference || `TXN-${tx.id}`}</span>
                                                        {tx.isLive && (
                                                             <span className="text-[9px] bg-[#a5d391] text-black px-1.5 py-0.2 rounded-full font-black animate-pulse">
                                                                LIVE
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-white/40 mt-0.5">
                                                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-IN', {
                                                            month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                        }) : 'Just now'}
                                                    </div>
                                                </td>

                                                {/* Type */}
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${typeBadge.style}`}>
                                                        <span className="material-symbols-outlined text-xs">{typeBadge.icon}</span>
                                                        {typeBadge.label}
                                                    </span>
                                                </td>

                                                {/* Counterparty */}
                                                <td className="py-3 px-4">
                                                    <div className="text-white font-semibold">
                                                        {type.includes('REFUND')
                                                            ? (isCredit
                                                                ? (tx.initiator?.name || tx.recipient?.name || 'Consultation Refund')
                                                                : (tx.recipient?.name || tx.initiator?.name || 'Consultation Refund'))
                                                            : (tx.recipient?.name || tx.initiator?.name || (isCredit ? 'NutriMunch Platform' : 'Consultation Escrow'))}
                                                    </div>
                                                    <div className="text-[10px] text-white/40">
                                                        {type.includes('REFUND')
                                                            ? (isCredit
                                                                ? (tx.initiator?.email || tx.recipient?.email || 'Refund to wallet')
                                                                : (tx.recipient?.email || tx.initiator?.email || 'Refund to wallet'))
                                                            : (tx.recipient?.email || tx.initiator?.email || (isCredit ? 'System Administrator' : 'Nutritionist Consultation'))}
                                                    </div>
                                                </td>

                                                {/* Debit (-) */}
                                                <td className="py-3 px-4 font-mono font-bold text-sm">
                                                    {isDebit ? (
                                                        <span className="text-rose-400">-₹{amtNum.toFixed(2)}</span>
                                                    ) : (typeBadge.label.includes('Debit (Escrow Hold)') || (!isNutritionist && String(tx.transactionType || tx.type || '').toUpperCase().includes('ESCROW') && tx.status === 'HELD')) ? (
                                                        <span className="text-amber-300 font-semibold text-xs">₹{amtNum.toFixed(2)} (Held)</span>
                                                    ) : (
                                                        <span className="text-white/20 font-normal">—</span>
                                                    )}
                                                </td>

                                                {/* Credit (+) */}
                                                <td className="py-3 px-4 font-mono font-bold text-sm">
                                                    {isCredit ? (
                                                        <span className="text-emerald-400">+₹{amtNum.toFixed(2)}</span>
                                                    ) : (typeBadge.label.includes('Credit (Pending Escrow)') || (isNutritionist && String(tx.transactionType || tx.type || '').toUpperCase().includes('ESCROW') && tx.status === 'HELD')) ? (
                                                        <span className="text-amber-300 font-semibold text-xs">₹{amtNum.toFixed(2)} (Pending)</span>
                                                    ) : (
                                                        <span className="text-white/20 font-normal">—</span>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.style}`}>
                                                        {statusBadge.text}
                                                    </span>
                                                </td>

                                                {/* Balance Audit */}
                                                <td className="py-3 px-4 font-mono text-[11px] text-white/60">
                                                    {auditBalance !== undefined && auditBalance !== null ? (
                                                        <span>₹{Number(auditBalance).toFixed(2)}</span>
                                                    ) : (
                                                        <span className="text-white/30">—</span>
                                                    )}
                                                </td>

                                                {/* Action */}
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTx(tx);
                                                        }}
                                                        className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-[11px] font-bold transition-all cursor-pointer"
                                                    >
                                                        Audit Memo
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Audit Modal for Selected Transaction */}
                {selectedTx && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                        <div className="w-full max-w-lg bg-[#0c121e] border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#a5d391]">policy</span>
                                    <h3 className="text-base font-bold text-white font-hero-display">Transaction Audit Record</h3>
                                </div>
                                <button
                                    onClick={() => setSelectedTx(null)}
                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="flex justify-between py-1.5 border-b border-white/5">
                                    <span className="text-white/50">Reference ID:</span>
                                    <span className="font-mono font-bold text-white">{selectedTx.transactionReference}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-white/5">
                                    <span className="text-white/50">Transaction Type:</span>
                                    <span className="font-bold text-[#a5d391] uppercase">{selectedTx.transactionType || selectedTx.type}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-white/5">
                                    <span className="text-white/50">Amount:</span>
                                    <span className="font-mono font-black text-white text-sm">₹{Number(selectedTx.amount || 0).toFixed(2)} {selectedTx.currency || 'INR'}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-white/5">
                                    <span className="text-white/50">Ledger Status:</span>
                                    <span className="font-bold uppercase text-emerald-400">{selectedTx.status}</span>
                                </div>
                                {selectedTx.appointmentId && (
                                    <div className="flex justify-between py-1.5 border-b border-white/5">
                                        <span className="text-white/50">Related Booking / Appointment:</span>
                                        <span className="font-bold text-white">Appointment #{selectedTx.appointmentId}</span>
                                    </div>
                                )}
                                <div className="flex justify-between py-1.5 border-b border-white/5">
                                    <span className="text-white/50">Timestamp:</span>
                                    <span className="text-white/80">{selectedTx.createdAt ? new Date(selectedTx.createdAt).toLocaleString() : 'N/A'}</span>
                                </div>
                                <div className="py-2">
                                    <span className="text-white/50 block mb-1">Audit Memo / Notes:</span>
                                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/80 font-mono text-[11px] leading-relaxed">
                                        {selectedTx.notes || 'Automated ACID ledger transaction entry'}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <button
                                    onClick={() => setSelectedTx(null)}
                                    className="px-4 py-2 rounded-xl bg-[#a5d391] text-black font-bold text-xs hover:bg-white transition-colors cursor-pointer"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default TransactionHistory;
