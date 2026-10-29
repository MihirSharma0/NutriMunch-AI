/**
 * Administrator Appointment Refund Management
 * Audit console for inspecting disputed consultations, reviewing escrow status,
 * and executing authorized refunds back to user wallets.
 */
import React, { useCallback, useEffect, useState } from 'react';
import api from '../../../api/axios';

/**
 * AppointmentRefundManagement Component
 * Admin tool for reviewing consultation dispute cases and executing financial refunds.
 */
const AppointmentRefundManagement = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const fetchAppointments = useCallback(async () => {
        setError('');
        try {
            const response = await api.get('/appointments/me');
            setAppointments(Array.isArray(response.data) ? response.data : []);
        } catch (requestError) {
            console.error('Failed to load appointments for refund review:', requestError);
            setError(requestError.response?.data?.message || 'Unable to load appointments.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    const handleIssueRefund = async (appointment) => {
        if (!window.confirm(`Issue a ₹${Number(appointment.escrowAmount || appointment.sessionFee || 0).toFixed(2)} refund to ${appointment.userName || 'the client'}? This will debit the nutritionist's wallet.`)) {
            return;
        }

        setProcessingId(appointment.id);
        setError('');
        setNotice('');
        try {
            const response = await api.put(`/appointments/${appointment.id}/status`, {
                status: 'APPROVE_CANCELLATION_REFUND',
                notes: 'Admin issued a refund after appointment confirmation.'
            });
            setAppointments(current => current.map(item => (
                String(item.id) === String(appointment.id) ? response.data : item
            )));
            setNotice(`Refund issued for appointment #${appointment.id}.`);
        } catch (requestError) {
            console.error('Failed to issue appointment refund:', requestError);
            setError(requestError.response?.data?.message || 'Unable to issue the refund.');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <section className="space-y-6">
            <header>
                <p className="text-[#a5d391] text-xs font-bold uppercase tracking-[0.2em]">Admin Controls</p>
                <h1 className="mt-2 text-3xl font-bold text-white font-hero-display">Appointment Refunds</h1>
                <p className="mt-2 max-w-3xl text-sm text-white/60">
                    Confirmed appointment fees are paid to the nutritionist. Use this admin-only action to refund a captured fee; the amount is debited from the nutritionist and credited to the client.
                </p>
            </header>

            {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
            {notice && <div role="status" className="rounded-xl border border-[#a5d391]/30 bg-[#a5d391]/10 px-4 py-3 text-sm text-[#d9f3cb]">{notice}</div>}

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                {loading ? (
                    <p className="p-8 text-center text-sm text-white/60">Loading appointments…</p>
                ) : appointments.length === 0 ? (
                    <p className="p-8 text-center text-sm text-white/60">No appointments found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] text-left text-sm">
                            <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/50">
                                <tr>
                                    <th className="px-5 py-4">Appointment</th>
                                    <th className="px-5 py-4">Client</th>
                                    <th className="px-5 py-4">Nutritionist</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4">Escrow</th>
                                    <th className="px-5 py-4 text-right">Admin action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {appointments.map(appointment => {
                                    const status = String(appointment.status || '').toUpperCase();
                                    const canRefund = String(appointment.escrowStatus || '').toUpperCase() === 'CAPTURED';

                                    return (
                                        <tr key={appointment.id} className="text-white/80">
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-white">{appointment.title || 'Consultation'}</div>
                                                <div className="mt-1 text-xs text-white/50">
                                                    {appointment.appointmentTime ? new Date(appointment.appointmentTime).toLocaleString() : `#${appointment.id}`}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div>{appointment.userName || 'Client'}</div>
                                                <div className="mt-1 text-xs text-white/50">{appointment.userEmail || ''}</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div>{appointment.nutritionistName || 'Nutritionist'}</div>
                                                <div className="mt-1 text-xs text-white/50">{appointment.nutritionistEmail || ''}</div>
                                            </td>
                                            <td className="px-5 py-4">{appointment.status || 'Unknown'}</td>
                                            <td className="px-5 py-4">
                                                <div>{appointment.escrowStatus || 'None'}</div>
                                                <div className="mt-1 text-xs text-white/50">
                                                    ₹{Number(appointment.escrowAmount || appointment.sessionFee || 0).toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {canRefund ? (
                                                    <button
                                                        type="button"
                                                        disabled={processingId === appointment.id}
                                                        onClick={() => handleIssueRefund(appointment)}
                                                        className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {processingId === appointment.id ? 'Processing…' : 'Issue refund'}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-white/40">
                                                        {status === 'CANCELLED' || status === 'REJECTED' ? 'Already closed' : 'Not captured'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
};

export default AppointmentRefundManagement;
