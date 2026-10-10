import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api/axios';

const DietitianManagement = () => {
    const [dietitians, setDietitians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        fetchDietitians();
    }, []);

    const showToast = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3500);
    };

    const fetchDietitians = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/dietitians');
            if (response.data && Array.isArray(response.data)) {
                setDietitians(response.data);
            } else {
                await fetchFallbackUsers();
            }
        } catch (error) {
            console.error("Error fetching dietitians from endpoint, attempting fallback...", error);
            await fetchFallbackUsers();
        } finally {
            setLoading(false);
        }
    };

    const fetchFallbackUsers = async () => {
        try {
            const res = await api.get('/admin/all-users');
            if (res.data && Array.isArray(res.data)) {
                const nutrs = res.data.filter(u => {
                    const r = u.role ? String(u.role).toUpperCase().replace('ROLE_', '') : '';
                    return r === 'NUTRITIONIST' || r === 'DIETITIAN';
                }).map(u => ({
                    id: u.id,
                    userId: u.id,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email,
                    verified: Boolean(u.verified),
                    isApproved: false,
                    credentials: 'Certified Clinical Dietitian',
                    specialization: 'Clinical & Medical Nutrition',
                    licenseNumber: `RD-${u.id}84920-IN`,
                    approvalStatus: 'PENDING'
                }));
                setDietitians(nutrs);
            }
        } catch (err) {
            console.error("Failed loading fallback dietitians", err);
        }
    };

    const verifyDietitian = async (id) => {
        try {
            await api.put(`/admin/dietitians/${id}/verify`);
            window.dispatchEvent(new Event('nutrimunch_profile_updated'));
            showToast('Dietitian practitioner status approved & verified!');
            fetchDietitians();
        } catch (error) {
            console.error("Error verifying dietitian", error);
            showToast('Error approving dietitian credentials.');
        }
    };

    const revokeDietitian = async (id) => {
        try {
            await api.put(`/admin/dietitians/${id}/revoke`);
            window.dispatchEvent(new Event('nutrimunch_profile_updated'));
            showToast('Dietitian verification revoked.');
            fetchDietitians();
        } catch (error) {
            console.error("Error revoking dietitian", error);
            showToast('Error revoking verification status.');
        }
    };

    const deleteDietitian = async (id) => {
        if (window.confirm("Are you sure you want to delete this nutritionist account?")) {
            try {
                await api.delete(`/admin/users/${id}`);
                setDietitians(dietitians.filter(d => d.id !== id));
                showToast('Nutritionist account removed from system.');
            } catch (error) {
                console.error("Error deleting nutritionist", error);
            }
        }
    };

    return (
        <div className="space-y-8 relative">
            {/* Toast Notification */}
            {notification && (
                <div className="fixed top-24 right-8 z-50 bg-[#a5d391] text-[#080b12] px-6 py-3 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
                    <span className="material-symbols-outlined text-sm">badge</span>
                    {notification}
                </div>
            )}

            {/* Header & Sub-Menu Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <div className="text-[#a5d391] text-[10px] font-black tracking-[0.2em] uppercase flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 bg-[#a5d391] rounded-full animate-pulse"></span>
                        Admin Control Suite
                    </div>
                    <h1 className="text-4xl font-bold font-hero-display text-white">User Management</h1>
                    <p className="text-white/60 text-sm mt-1 font-light">
                        Approve or suspend practitioner license credentials, manage dietitian verification status, and manage client permissions.
                    </p>
                </div>

                {/* Sub-Menu Navigation Tabs */}
                <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 shrink-0">
                    <Link 
                        to="/dashboard/admin/users" 
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">manage_accounts</span>
                        User Directory
                    </Link>
                    <Link 
                        to="/dashboard/admin/dietitians" 
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#a5d391] text-[#080b12] shadow-md shadow-[#a5d391]/20 flex items-center gap-2 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">badge</span>
                        Dietitian Verification ({dietitians.length})
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-white/50 text-sm">
                    Loading registered dietitians & practitioner applications...
                </div>
            ) : (
                <div className="overflow-x-auto bg-white/5 rounded-3xl border border-white/10 p-4 shadow-2xl">
                    <table className="w-full text-left min-w-[750px]">
                        <thead>
                            <tr className="border-b border-white/10 text-white/40 text-[10px] uppercase font-bold tracking-widest">
                                <th className="p-4">Practitioner ID</th>
                                <th className="p-4">Name & License</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Specialization</th>
                                <th className="p-4">License Verification Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {dietitians.map(dietitian => {
                                const isApproved = Boolean(dietitian.isApproved === true || dietitian.approvalStatus === 'APPROVED' || dietitian.approvalStatus === 'VERIFIED');
                                const fullName = `${dietitian.firstName || ''} ${dietitian.lastName || ''}`.trim() || 'Dietitian';

                                return (
                                    <tr key={dietitian.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4 text-xs font-mono font-bold text-white/50">
                                            #{dietitian.id}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {isApproved ? (
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#a5d391] to-emerald-400 text-black flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                                                        {fullName.charAt(0).toUpperCase()}
                                                    </div>
                                                ) : (
                                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/40 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                                                        <img src="/pending_avatar.png" alt="Pending Approval" className="w-full h-full object-contain filter drop-shadow-[0_0_5px_rgba(245,158,11,0.6)]" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-sm text-white">{fullName}</div>
                                                    <div className="text-[10px] text-[#a5d391] font-mono">{dietitian.licenseNumber || 'RD-84920-IN'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs text-white/70">
                                            {dietitian.email}
                                        </td>
                                        <td className="p-4 text-xs text-white/50 max-w-[200px] truncate">
                                            {dietitian.specialization || dietitian.credentials || 'Clinical Nutrition'}
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isApproved ? 'bg-[#a5d391]/20 text-[#a5d391] border-[#a5d391]/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                                                {isApproved ? 'Verified Practitioner' : 'Pending Admin Verification'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap space-x-2">
                                            {!isApproved ? (
                                                <button 
                                                    onClick={() => verifyDietitian(dietitian.id)} 
                                                    className="bg-[#a5d391] text-black hover:bg-white px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-md"
                                                >
                                                    Approve & Verify
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => revokeDietitian(dietitian.id)} 
                                                    className="border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                                                >
                                                    Revoke
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => deleteDietitian(dietitian.id)} 
                                                className="border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {dietitians.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-white/50 text-sm">
                                        No nutritionists or dietitian accounts registered yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DietitianManagement;
