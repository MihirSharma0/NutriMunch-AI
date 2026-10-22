import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api/axios';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';

const UserManagement = () => {
    const { user } = useContext(AuthContext);

    if (!user) {
        return <FeatureGate />;
    }
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterRole, setFilterRole] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'VERIFIED' | 'PENDING_OTP'
    const [searchQuery, setSearchQuery] = useState('');

    // Password reset modal state
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetMessage, setResetMessage] = useState(null);
    const [resetError, setResetError] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/all-users');
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users", error);
        } finally {
            setLoading(false);
        }
    };

    const deleteUser = async (id) => {
        const targetUser = users.find(u => u.id === id);
        if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            try {
                await api.delete(`/admin/users/${id}`);
                setUsers(users.filter(u => u.id !== id));

                // If user/nutritionist is deleted, purge all their associated diet plans & local caches
                if (targetUser) {
                    const uEmail = (targetUser.email || '').toLowerCase().trim();
                    const uIdStr = String(id);

                    try {
                        const rawHistory = localStorage.getItem('nutrimunch_diet_plans_history');
                        if (rawHistory) {
                            const parsed = JSON.parse(rawHistory);
                            const cleaned = parsed.filter(p => {
                                const pTarget = String(p.targetUserId || '');
                                const pNutritionistId = String(p.nutritionistId || '');
                                const pAuthor = (p.author || p.nutritionistName || '').toLowerCase().trim();
                                const pEmail = (p.nutritionistEmail || '').toLowerCase().trim();
                                return pTarget !== uIdStr && pNutritionistId !== uIdStr && pEmail !== uEmail && !pAuthor.includes(uEmail);
                            });
                            localStorage.setItem('nutrimunch_diet_plans_history', JSON.stringify(cleaned));
                        }
                    } catch (e) {}

                    try {
                        const rawExclusive = localStorage.getItem('nutrimunch_exclusive_diet_plans');
                        if (rawExclusive) {
                            const parsed = JSON.parse(rawExclusive);
                            delete parsed[uIdStr];
                            if (uEmail) delete parsed[uEmail];
                            localStorage.setItem('nutrimunch_exclusive_diet_plans', JSON.stringify(parsed));
                        }
                    } catch (e) {}

                    try {
                        const rawGen = localStorage.getItem('nutrimunch_general_diet_plan');
                        if (rawGen) {
                            const gen = JSON.parse(rawGen);
                            const gEmail = (gen.nutritionistEmail || '').toLowerCase().trim();
                            const gAuthor = (gen.author || gen.nutritionistName || '').toLowerCase().trim();
                            if (gEmail === uEmail || gAuthor.includes(uEmail)) {
                                localStorage.removeItem('nutrimunch_general_diet_plan');
                            }
                        }
                    } catch (e) {}

                    window.dispatchEvent(new Event('nutrimunch_diet_history_updated'));
                    window.dispatchEvent(new Event('nutrimunch_diet_plan_updated'));
                    window.dispatchEvent(new Event('nutrimunch_role_updated'));
                    window.dispatchEvent(new Event('storage'));
                }
            } catch (error) {
                console.error("Error deleting user", error);
            }
        }
    };

    const changeRole = async (id, newRole) => {
        try {
            await api.put(`/admin/users/${id}/role`, { role: newRole });

            // 1. Instantly update local table state
            setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));

            // 2. If the current logged-in user in localStorage had their role changed, update it so all navigation/permissions reflect immediately
            try {
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                const targetUser = users.find(u => u.id === id);
                if (storedUser && (String(storedUser.id) === String(id) || (targetUser && storedUser.email?.toLowerCase() === targetUser.email?.toLowerCase()))) {
                    storedUser.role = newRole;
                    localStorage.setItem('user', JSON.stringify(storedUser));
                    window.dispatchEvent(new Event('nutrimunch_profile_updated'));
                }
            } catch (e) {}

            // 3. Dispatch global events so NutritionistManagement, Navbar, Sidebar, etc. immediately re-fetch or update
            window.dispatchEvent(new Event('nutrimunch_role_updated'));
            window.dispatchEvent(new Event('storage'));

            fetchUsers();
        } catch (error) {
            console.error("Error updating role", error);
        }
    };

    const handleOpenResetModal = (user) => {
        setSelectedUser(user);
        setNewPassword('');
        setResetMessage(null);
        setResetError(null);
    };

    const handleCloseResetModal = () => {
        setSelectedUser(null);
        setNewPassword('');
        setResetMessage(null);
        setResetError(null);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword.trim() || newPassword.length < 6) {
            setResetError("Password must be at least 6 characters long.");
            return;
        }

        setResetLoading(true);
        setResetError(null);
        setResetMessage(null);

        try {
            const response = await api.post(`/admin/users/${selectedUser.id}/reset-password`, {
                newPassword: newPassword
            });
            setResetMessage(response.data.message || "Password reset successfully!");
            setTimeout(() => {
                handleCloseResetModal();
            }, 1800);
        } catch (err) {
            setResetError(err.response?.data?.message || "Failed to reset password.");
        } finally {
            setResetLoading(false);
        }
    };

    // Filter Logic: Search by name/email + Role filter + Verification status filter
    const filteredUsers = users.filter(u => {
        // Role filter
        if (filterRole !== 'ALL' && u.role !== filterRole) {
            return false;
        }

        // Verification status filter
        const isVerified = Boolean(u.verified || u.otpVerified || u.enabled);
        if (filterStatus === 'VERIFIED' && !isVerified) {
            return false;
        }
        if (filterStatus === 'PENDING_OTP' && isVerified) {
            return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
            const email = (u.email || '').toLowerCase();
            return fullName.includes(query) || email.includes(query);
        }

        return true;
    });

    const verifiedCount = users.filter(u => Boolean(u.verified || u.otpVerified || u.enabled)).length;
    const pendingCount = users.length - verifiedCount;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <div className="text-[#a5d391] text-[10px] font-black tracking-[0.2em] uppercase flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 bg-[#a5d391] rounded-full animate-pulse"></span>
                        Admin Control Suite
                    </div>
                    <h1 className="text-4xl font-bold font-hero-display text-white">User Management</h1>
                    <p className="text-white/60 text-sm mt-1 font-light">
                        View all registered users, filter by role or OTP status, search by name/email, and verify nutritionist credentials.
                    </p>
                </div>

                {/* Sub-Menu Navigation Tabs */}
                <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 shrink-0">
                    <Link
                        to="/dashboard/admin/users"
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#a5d391] text-[#080b12] shadow-md shadow-[#a5d391]/20 flex items-center gap-2 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">manage_accounts</span>
                        User Directory
                    </Link>
                    <Link
                        to="/dashboard/admin/nutritionists"
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">badge</span>
                        Nutritionist Verification
                    </Link>
                </div>
            </div>

            {/* Filter Controls & Search Bar Row */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">

                    {/* Search Bar */}
                    <div className="relative flex-1 min-w-[280px]">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Search users by name or email address..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-10 py-3 text-xs text-white placeholder:text-white/40 outline-none focus:border-[#a5d391] transition-all font-mono"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        )}
                    </div>

                    {/* Filters Container */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Role Filter Tabs */}
                        <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/10 text-xs font-bold">
                            <span className="text-[10px] text-white/40 uppercase font-mono px-2 hidden sm:inline">Role:</span>
                            {['ALL', 'USER', 'NUTRITIONIST', 'ADMIN'].map((role) => (
                                <button
                                    key={role}
                                    onClick={() => setFilterRole(role)}
                                    className={`px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${filterRole === role ? 'bg-[#a5d391] text-black shadow-[0_0_15px_rgba(165,211,145,0.3)]' : 'text-white/60 hover:text-white'}`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>

                        {/* Verification Status Filter Tabs */}
                        <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/10 text-xs font-bold">
                            <span className="text-[10px] text-white/40 uppercase font-mono px-2 hidden sm:inline">Status:</span>
                            {[
                                { id: 'ALL', label: 'ALL' },
                                { id: 'VERIFIED', label: 'VERIFIED' },
                                { id: 'PENDING_OTP', label: 'PENDING OTP' }
                            ].map((statusItem) => (
                                <button
                                    key={statusItem.id}
                                    onClick={() => setFilterStatus(statusItem.id)}
                                    className={`px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${filterStatus === statusItem.id ? 'bg-[#a5d391] text-black shadow-[0_0_15px_rgba(165,211,145,0.3)]' : 'text-white/60 hover:text-white'}`}
                                >
                                    {statusItem.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary Count Badges */}
                <div className="flex flex-wrap items-center justify-between text-xs text-white/50 pt-2 border-t border-white/5 gap-2">
                    <div>
                        Showing <strong className="text-white">{filteredUsers.length}</strong> of <strong className="text-white">{users.length}</strong> registered accounts
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#a5d391]/15 text-[#a5d391] border border-[#a5d391]/30 font-bold text-[10px]">
                            {verifiedCount} Verified
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold text-[10px]">
                            {pendingCount} Pending OTP
                        </span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-white/60 font-mono bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10">
                    <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-[#a5d391] block">progress_activity</span>
                    Loading user accounts...
                </div>
            ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl p-2">
                    <table className="w-full min-w-[820px] text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5 text-white/60 text-xs uppercase tracking-wider font-mono">
                                <th className="p-5 rounded-tl-2xl whitespace-nowrap">ID</th>
                                <th className="p-5 whitespace-nowrap">User Name</th>
                                <th className="p-5 whitespace-nowrap">Email</th>
                                <th className="p-5 whitespace-nowrap">Account Verification Status</th>
                                <th className="p-5 whitespace-nowrap">Role</th>
                                <th className="p-5 text-right rounded-tr-2xl whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-white/40 font-light">
                                        No users found matching current filters or search query.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => {
                                    const isUserVerified = Boolean(user.verified || user.otpVerified || user.enabled);
                                    return (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-5 font-mono text-white/40">{user.id}</td>
                                            <td className="p-5 font-bold text-white">
                                                {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'User'}
                                            </td>
                                            <td className="p-5 font-mono text-white/80">{user.email}</td>
                                            <td className="p-5">
                                                {isUserVerified ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#a5d391]/15 text-[#a5d391] border border-[#a5d391]/30">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#a5d391]"></span> Verified
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Pending OTP
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-5">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => changeRole(user.id, e.target.value)}
                                                    className="bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#a5d391] font-mono cursor-pointer"
                                                >
                                                    <option value="USER">USER</option>
                                                    <option value="NUTRITIONIST">NUTRITIONIST</option>
                                                    <option value="ADMIN">ADMIN</option>
                                                </select>
                                            </td>
                                            <td className="p-5 text-right whitespace-nowrap space-x-3">
                                                <button
                                                    onClick={() => handleOpenResetModal(user)}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-sm">lock_reset</span>
                                                    Reset Password
                                                </button>
                                                <button
                                                    onClick={() => deleteUser(user.id)}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Reset Password Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-8 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    <div className="bg-[#080b12] border border-white/15 rounded-[2.5rem] w-full max-w-md p-5 sm:p-8 space-y-6 relative shadow-2xl max-h-[80vh] overflow-y-auto my-auto">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <h3 className="text-2xl font-bold font-hero-display text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-400">lock_reset</span>
                                Reset Account Password
                            </h3>
                            <button onClick={handleCloseResetModal} className="text-white/40 hover:text-white cursor-pointer">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-xs space-y-1 font-mono">
                            <div className="text-white/50">Target User:</div>
                            <div className="text-white font-bold text-base">{selectedUser.firstName} {selectedUser.lastName}</div>
                            <div className="text-[#a5d391]">{selectedUser.email}</div>
                        </div>

                        {resetError && (
                            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs font-mono">
                                {resetError}
                            </div>
                        )}

                        {resetMessage && (
                            <div className="p-3.5 bg-[#a5d391]/15 border border-[#a5d391]/30 rounded-xl text-[#a5d391] text-xs font-mono">
                                {resetMessage}
                            </div>
                        )}

                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-white/70 uppercase mb-2">New Password</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Enter new password (min 6 chars)"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#a5d391]"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseResetModal}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 text-sm rounded-2xl font-bold transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={resetLoading}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-sm rounded-2xl transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                >
                                    {resetLoading ? "Updating..." : "Confirm Password Reset"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
