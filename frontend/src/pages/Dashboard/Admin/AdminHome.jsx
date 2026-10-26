import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api/axios';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';

const AdminHome = () => {
    const { user } = useContext(AuthContext);

    if (!user) {
        return <FeatureGate />;
    }

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [credentials, setCredentials] = useState({
        email: import.meta.env.VITE_ADMIN_EMAIL || 'admin@nutrimunch.com',
        password: import.meta.env.VITE_ADMIN_PASSWORD || 'AdminPass123!'
    });
    const [copied, setCopied] = useState(false);

    // Edit Modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [updateLoading, setUpdateLoading] = useState(false);
    const [updateMessage, setUpdateMessage] = useState(null);
    const [updateError, setUpdateError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, credsRes] = await Promise.all([
                    api.get('/admin/analytics'),
                    api.get('/admin/credentials')
                ]);
                setStats(statsRes.data);
                if (credsRes.data && credsRes.data.email) {
                    setCredentials({
                        email: credsRes.data.email,
                        password: credsRes.data.password || credentials.password
                    });
                }
            } catch (error) {
                console.error("Error fetching admin telemetry", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenEditModal = () => {
        setEditEmail(credentials.email);
        setEditPassword(credentials.password);
        setUpdateMessage(null);
        setUpdateError(null);
        setIsEditModalOpen(true);
    };

    const handleSaveCredentials = async (e) => {
        e.preventDefault();
        setUpdateLoading(true);
        setUpdateMessage(null);
        setUpdateError(null);

        try {
            const response = await api.put('/admin/credentials', {
                email: editEmail,
                password: editPassword
            });

            setCredentials({
                email: response.data.email || editEmail,
                password: response.data.password || editPassword
            });

            setUpdateMessage("Admin credentials updated in database!");
            setTimeout(() => {
                setIsEditModalOpen(false);
            }, 1500);
        } catch (err) {
            setUpdateError(err.response?.data?.message || "Failed to update credentials.");
        } finally {
            setUpdateLoading(false);
        }
    };

    return (
        <div className="space-y-10">
            {/* Top Header */}
            <div>
                <div className="text-[#a5d391] text-[10px] font-black tracking-[0.2em] uppercase flex items-center gap-2 mb-2 drop-shadow-[0_0_4px_rgba(165,211,145,0.3)]">
                    <span className="w-1.5 h-1.5 bg-[#a5d391] rounded-full animate-pulse"></span>
                    System Control Center
                </div>
                <h1 className="text-4xl md:text-5xl font-bold font-hero-display text-white tracking-tight">System Core Overview</h1>
                <p className="text-white/60 text-base mt-2 max-w-2xl font-light">
                    Real-time precision health telemetry and master administrator override controls.
                </p>
            </div>

            {/* Admin Credentials Banner */}
            <div className="bg-white/5 backdrop-blur-2xl p-5 sm:p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden shadow-2xl shadow-[#a5d391]/5">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#a5d391]/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#a5d391]/15 text-[#a5d391] rounded-full text-xs font-mono font-bold border border-[#a5d391]/30 shadow-[0_0_12px_rgba(165,211,145,0.2)]">
                            <span className="w-2 h-2 rounded-full bg-[#a5d391] animate-pulse"></span>
                            ENVIRONMENT SEEDED CREDENTIALS
                        </div>
                        <h2 className="text-2xl font-bold text-white font-hero-display">Master Credentials Node</h2>
                        <p className="text-white/70 text-sm max-w-xl font-light leading-relaxed">
                            These credentials are synced directly with your backend environment setup. You can copy or edit them dynamically below.
                        </p>
                    </div>

                    <div className="bg-black/40 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-3 font-mono text-xs w-full md:min-w-[320px] shadow-lg">
                        <div className="flex flex-wrap justify-between items-center gap-2 text-white/50 pb-2 border-b border-white/10">
                            <span className="tracking-wider">MASTER ACCESS</span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleOpenEditModal}
                                    className="text-amber-400 hover:text-amber-300 font-sans text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                    Edit
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className="text-[#a5d391] hover:text-white font-sans text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-between gap-x-2 text-white py-0.5">
                            <span className="text-white/60">Email:</span>
                            <span className="font-bold text-[#a5d391] break-all">{credentials.email}</span>
                        </div>
                        <div className="flex flex-wrap justify-between gap-x-2 text-white py-0.5">
                            <span className="text-white/60">Password:</span>
                            <span className="font-bold text-amber-300 break-all">{credentials.password}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <Link to="/dashboard/admin/diet-plans" className="p-6 bg-white/5 backdrop-blur-xl hover:bg-white/10 border border-white/10 hover:border-[#a5d391]/40 rounded-[2rem] transition-all duration-300 group flex flex-col justify-between shadow-xl hover:-translate-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-[#a5d391]/15 text-[#a5d391] flex items-center justify-center border border-[#a5d391]/30 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(165,211,145,0.2)] mb-4">
                        <span className="material-symbols-outlined text-2xl">menu_book</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base group-hover:text-[#a5d391] transition-colors">Diet Plans Management</h3>
                        <p className="text-xs text-white/50 font-light mt-1">Manage, inspect, promote, and purge diet plans.</p>
                    </div>
                </Link>

                <Link to="/dashboard/admin/users" className="p-6 bg-white/5 backdrop-blur-xl hover:bg-white/10 border border-white/10 hover:border-[#a5d391]/40 rounded-[2rem] transition-all duration-300 group flex flex-col justify-between shadow-xl hover:-translate-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-[#a5d391]/15 text-[#a5d391] flex items-center justify-center border border-[#a5d391]/30 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(165,211,145,0.2)] mb-4">
                        <span className="material-symbols-outlined text-2xl">manage_accounts</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base group-hover:text-[#a5d391] transition-colors">User Management</h3>
                        <p className="text-xs text-white/50 font-light mt-1">View user accounts and manage credentials.</p>
                    </div>
                </Link>

                <Link to="/dashboard/admin/payments" className="p-6 bg-white/5 backdrop-blur-xl hover:bg-white/10 border border-white/10 hover:border-[#a5d391]/40 rounded-[2rem] transition-all duration-300 group flex flex-col justify-between shadow-xl hover:-translate-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-[#a5d391]/15 text-[#a5d391] flex items-center justify-center border border-[#a5d391]/30 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(165,211,145,0.2)] mb-4">
                        <span className="material-symbols-outlined text-2xl">payments</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base group-hover:text-[#a5d391] transition-colors">Payments &amp; Ledger</h3>
                        <p className="text-xs text-white/50 font-light mt-1">Razorpay test credits, wallet balances &amp; audit ledger.</p>
                    </div>
                </Link>

                <Link to="/dashboard/admin/sql" className="p-6 bg-white/5 backdrop-blur-xl hover:bg-white/10 border border-white/10 hover:border-[#a5d391]/40 rounded-[2rem] transition-all duration-300 group flex flex-col justify-between shadow-xl hover:-translate-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-[#a5d391]/15 text-[#a5d391] flex items-center justify-center border border-[#a5d391]/30 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(165,211,145,0.2)] mb-4">
                        <span className="material-symbols-outlined text-2xl">terminal</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base group-hover:text-[#a5d391] transition-colors">SQL Query Console</h3>
                        <p className="text-xs text-white/50 font-light mt-1">Execute raw SQL queries against database tables.</p>
                    </div>
                </Link>
            </div>

            {/* Core Stats */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold font-hero-display text-white">Live System Metrics</h2>
                {loading ? (
                    <div className="p-12 text-center text-white/50 font-mono bg-white/5 rounded-[2rem] border border-white/10">
                        <span className="material-symbols-outlined animate-spin text-3xl text-[#a5d391] mb-2 block">progress_activity</span>
                        Fetching system telemetry...
                    </div>
                ) : stats ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="p-7 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 hover:border-[#a5d391]/40 transition-all duration-300 shadow-xl">
                            <h3 className="text-sm text-white/60 font-medium">Total Registered Users</h3>
                            <p className="text-4xl font-bold text-[#a5d391] font-hero-display mt-3">{stats.totalUsers}</p>
                        </div>
                        <div className="p-7 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 hover:border-sky-400/40 transition-all duration-300 shadow-xl">
                            <h3 className="text-sm text-white/60 font-medium">Active Nutritionists</h3>
                            <p className="text-4xl font-bold text-sky-400 font-hero-display mt-3">{stats.totalNutritionists || stats.totalNutritionists || 0}</p>
                        </div>
                        <div className="p-7 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 hover:border-amber-400/40 transition-all duration-300 shadow-xl">
                            <h3 className="text-sm text-white/60 font-medium">Total Appointments</h3>
                            <p className="text-4xl font-bold text-amber-400 font-hero-display mt-3">{stats.totalAppointments}</p>
                        </div>
                        <div className="p-7 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 hover:border-purple-400/40 transition-all duration-300 shadow-xl">
                            <h3 className="text-sm text-white/60 font-medium">Total Platform Revenue</h3>
                            <p className="text-4xl font-bold text-purple-400 font-hero-display mt-3">₹{stats.totalRevenue}</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-red-400 font-mono p-6 bg-red-500/10 border border-red-500/20 rounded-2xl">Failed to load system metrics.</p>
                )}
            </div>

            {/* Edit Credentials Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-8 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    <div className="bg-[#080b12] border border-white/15 rounded-[2.5rem] w-full max-w-md p-6 sm:p-8 space-y-6 relative shadow-2xl max-h-[80vh] overflow-y-auto my-auto">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <h3 className="text-2xl font-bold font-hero-display text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#a5d391]">edit_square</span>
                                Update Master Credentials
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-white/40 hover:text-white cursor-pointer">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {updateError && (
                            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs font-mono">
                                {updateError}
                            </div>
                        )}

                        {updateMessage && (
                            <div className="p-3.5 bg-[#a5d391]/15 border border-[#a5d391]/30 rounded-xl text-[#a5d391] text-xs font-mono">
                                {updateMessage}
                            </div>
                        )}

                        <form onSubmit={handleSaveCredentials} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-white/70 uppercase mb-2">Admin Email</label>
                                <input
                                    type="email"
                                    required
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#a5d391]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/70 uppercase mb-2">Admin Password</label>
                                <input
                                    type="text"
                                    required
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#a5d391] font-mono"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 text-sm rounded-2xl font-bold transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateLoading}
                                    className="px-6 py-2.5 bg-[#a5d391] hover:bg-white disabled:opacity-50 text-black font-bold text-sm rounded-2xl transition-all cursor-pointer shadow-[0_0_20px_rgba(165,211,145,0.4)]"
                                >
                                    {updateLoading ? "Saving..." : "Save Credentials"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminHome;
