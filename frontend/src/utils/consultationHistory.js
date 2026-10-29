/**
 * Consultation History Utility
 * Shared consultation-history rules for the patient (Appointments) and nutritionist (Schedule) pages.
 * Derives completed/expired outcomes based on appointment timestamps and status transitions.
 */

/** List of appointment statuses representing confirmed/active appointments. */
const CONFIRMED_STATES = ['CONFIRMED', 'ACCEPTED', 'SCHEDULED', 'APPROVED', 'ONGOING', 'DECLINE_CANCELLATION', 'REJECT_CANCELLATION'];

/**
 * Evaluates whether an appointment is scheduled in the past.
 * 
 * @param {Object} apt - Appointment record containing appointmentTime
 * @returns {boolean} True if appointment time has passed
 */
const isPastAppointment = (apt) => {
    const t = new Date(apt?.appointmentTime || '').getTime();
    return !isNaN(t) && t <= Date.now();
};

/**
 * Resolves the display outcome status for an appointment based on its current status and time.
 * Outcomes: UPCOMING | PENDING | CANCEL_REQUESTED | COMPLETED | CANCELLED | NUTRITIONIST_CANCELLED | DECLINED | EXPIRED
 * 
 * @param {Object} apt - Appointment object
 * @returns {string} Normalized outcome category
 */
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

/**
 * Determines whether a consultation outcome belongs in terminal history.
 * 
 * @param {string} outcome - Outcome state string
 * @returns {boolean} True if consultation is finalized and cannot change
 */
export const isHistoryOutcome = (outcome) => ['COMPLETED', 'CANCELLED', 'NUTRITIONIST_CANCELLED', 'DECLINED', 'EXPIRED'].includes(outcome);

/** UI badge configuration mappings (label, icon, CSS classes) for consultation outcomes. */
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

/**
 * Extracts and formats the paid amount and escrow state for an appointment history row.
 * 
 * @param {Object} apt - Appointment record with escrow/fee fields
 * @returns {Object|null} Object containing amount and state description, or null if no fee
 */
export const describePayment = (apt) => {
    const amount = Number(apt?.escrowAmount ?? apt?.sessionFee ?? 0);
    if (!amount) return null;
    const escrow = String(apt?.escrowStatus || '').toUpperCase();
    const state = escrow === 'REFUNDED' ? 'Refunded' : escrow === 'CAPTURED' ? 'Paid' : escrow === 'HELD' ? 'Held' : '';
    return { amount, state };
};
