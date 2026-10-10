import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api/axios';

const DietitianManagement = () => {
    const [dietitians, setDietitians] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDietitians();
    }, []);

    const fetchDietitians = async () => {
        try {
            const response = await api.get('/admin/dietitians');
            setDietitians(response.data);
        } catch (error) {
            console.error("Error fetching dietitians", error);
        } finally {
            setLoading(false);
        }
    };

    const verifyDietitian = async (id) => {
        try {
            await api.put(`/admin/dietitians/${id}/verify`);
            fetchDietitians();
        } catch (error) {
            console.error("Error verifying dietitian", error);
        }
    };

    const deleteDietitian = async (id) => {
        if(window.confirm("Are you sure you want to delete this nutritionist?")) {
            try {
                await api.delete(`/admin/users/${id}`);
                setDietitians(dietitians.filter(d => d.id !== id));
            } catch (error) {
                console.error("Error deleting nutritionist", error);
            }
        }
    };

    return (
        <div className="space-y-8">
            {/* Unified User Management Header & Section Switcher */}
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
                        Dietitian Verification
                    </Link>
                </div>
            </div>
            {loading ? (
                <p>Loading nutritionists...</p>
            ) : (
                <div className="overflow-x-auto bg-white/5 rounded-xl border border-white/10 p-4">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10 text-white/60">
                                <th className="p-3 whitespace-nowrap">ID</th>
                                <th className="p-3 whitespace-nowrap">Name</th>
                                <th className="p-3 whitespace-nowrap">Email</th>
                                <th className="p-3 whitespace-nowrap">Status</th>
                                <th className="p-3 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dietitians.map(dietitian => (
                                <tr key={dietitian.id} className="border-b border-white/5">
                                    <td className="p-3 whitespace-nowrap">{dietitian.id}</td>
                                    <td className="p-3 whitespace-nowrap">{dietitian.firstName} {dietitian.lastName}</td>
                                    <td className="p-3 whitespace-nowrap">{dietitian.email}</td>
                                    <td className="p-3 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded text-sm ${dietitian.verified ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                            {dietitian.verified ? 'Verified' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right whitespace-nowrap">
                                        {!dietitian.verified && (
                                            <button onClick={() => verifyDietitian(dietitian.id)} className="text-accent-blue hover:text-blue-300 mr-4">
                                                Verify
                                            </button>
                                        )}
                                        <button onClick={() => deleteDietitian(dietitian.id)} className="text-red-400 hover:text-red-300">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {dietitians.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-4 text-center text-white/50">No nutritionists found.</td>
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
