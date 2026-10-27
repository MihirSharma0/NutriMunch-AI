// Shared consultation-history rules for the patient (Appointments) and nutritionist (Schedule) pages.
// The backend never marks sessions "Completed", so the outcome is derived from status + date.

const CONFIRMED_STATES = ['CONFIRMED', 'ACCEPTED', 'SCHEDULED', 'APPROVED', 'ONGOING', 'DECLINE_CANCELLATION', 'REJECT_CANCELLATION'];

export const isPastAppointment = (apt) => {
    const t = new Date(apt?.appointmentTime || '').getTime();
    return !isNaN(t) && t <= Date.now();
};

// UPCOMING | PENDING | CANCEL_REQUESTED | COMPLETED | CANCELLED | NUTRITIONIST_CANCELLED | DECLINED | EXPIRED
export const getConsultationOutcome = (apt) => {
    const status = String(apt?.status || '').toUpperCase();
    const past = isPastAppointment(apt);

    if (status === 'COMPLETED') return 'COMPLETED';
    if (status === 'CANCELLED_BY_NUTRITIONIST') return 'NUTRITIONIST_CANCELLED';
    if (status === 'CANCELLED') return 'CANCELLED';
    if (status === 'REJECTED' || status === 'DENIED') return 'DECLINED';
    if (status === 'CANCELLATION_REQUESTED') return 'CANCEL_REQUESTED';
    if (status.includes('REQUEST') || status.includes('PENDING')) return past ? 'EXPIRED' : 'PENDING';
    if (CONFIRMED_STATES.includes(status)) return past ? 'COMPLETED' : 'UPCOMING';
    return past ? 'COMPLETED' : 'UPCOMING';
};

// Finished consultations: anything that can no longer change
export const isHistoryOutcome = (outcome) => ['COMPLETED', 'CANCELLED', 'NUTRITIONIST_CANCELLED', 'DECLINED', 'EXPIRED'].includes(outcome);

export const OUTCOME_BADGES = {
    COMPLETED: { label: 'Completed', icon: 'task_alt', style: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    CANCELLED: { label: 'Cancelled', icon: 'cancel', style: 'bg-red-500/20 text-red-400 border-red-500/30' },
    NUTRITIONIST_CANCELLED: { label: 'Cancelled by nutritionist · Refunded', icon: 'currency_exchange', style: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
    DECLINED: { label: 'Declined', icon: 'do_not_disturb', style: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    EXPIRED: { label: 'Expired Request', icon: 'history_toggle_off', style: 'bg-white/10 text-white/60 border-white/20' },
    UPCOMING: { label: 'Upcoming', icon: 'timer', style: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
    PENDING: { label: 'Requested', icon: 'pending_actions', style: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    CANCEL_REQUESTED: { label: 'Cancel Pending', icon: 'hourglass_top', style: 'bg-amber-500/20 text-amber-300 border-amber-500/40' }
};

// Paid amount and what happened to it, for history rows
export const describePayment = (apt) => {
    const amount = Number(apt?.escrowAmount ?? apt?.sessionFee ?? 0);
    if (!amount) return null;
    const escrow = String(apt?.escrowStatus || '').toUpperCase();
    const state = escrow === 'REFUNDED' ? 'Refunded' : escrow === 'CAPTURED' ? 'Paid' : escrow === 'HELD' ? 'Held' : '';
    return { amount, state };
};
