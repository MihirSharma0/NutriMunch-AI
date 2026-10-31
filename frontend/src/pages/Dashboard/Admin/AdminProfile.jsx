/**
 * Administrator Profile Settings
 * Manages administrator credentials, secure account information, and master security preferences.
 */
import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { Shield, Key, Mail, CheckCircle } from 'lucide-react';
import { getEmailError } from '../../../utils/emailValidation';

/**
 * AdminProfile Component
 * Administration settings interface for updating system credentials and contact email.
 */
const AdminProfile = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const emailError = getEmailError(email);

    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchCredentials();
    }, []);

    const fetchCredentials = async () => {
        try {
            const response = await api.get('/admin/credentials');
            const data = response.data;
            setFirstName(data.firstName || '');
            setLastName(data.lastName || '');
            setEmail(data.email || '');
            setPassword(''); // Don't pre-fill password for security
        } catch (error) {
            console.error("Error fetching admin credentials:", error);
            setMessage({ text: 'Failed to load admin credentials.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (emailError) return;
        setSaving(true);
        setMessage({ text: '', type: '' });
        
        try {
            await api.put('/admin/credentials', {
                firstName,
                lastName,
                email,
                password
            });
            setMessage({ text: 'Admin credentials updated successfully!', type: 'success' });
            setPassword(''); // Clear password field after save
        } catch (error) {
            console.error("Error updating credentials:", error);
            setMessage({ text: 'Failed to update credentials.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a5d391]"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 max-w-4xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 font-hero-display flex items-center gap-3">
                    <Shield className="w-8 h-8 text-[#a5d391]" />
                    Admin Settings
                </h1>
                <p className="text-slate-400 text-sm">Manage your core system credentials.</p>
            </div>
            
            {message.text && (
                <div className={`p-4 rounded-xl mb-6 text-sm flex items-center gap-2 ${
                    message.type === 'success' 
                        ? 'bg-[#a5d391]/10 border border-[#a5d391]/30 text-[#a5d391]' 
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : null}
                    {message.text}
                </div>
            )}

            <div className="bg-[#090d16]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 lg:p-8 shadow-2xl">
                <form onSubmit={handleSave} className="space-y-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5" />
                                First Name
                            </label>
                            <input 
                                type="text" 
                                value={firstName} 
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:border-[#a5d391]/60 focus:ring-1 focus:ring-[#a5d391]/20 focus:outline-none transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5" />
                                Last Name
                            </label>
                            <input 
                                type="text" 
                                value={lastName} 
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:border-[#a5d391]/60 focus:ring-1 focus:ring-[#a5d391]/20 focus:outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5" />
                            Admin Email
                        </label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)}
                            aria-invalid={!!emailError}
                            aria-describedby={emailError ? 'admin-email-error' : undefined}
                            className={`w-full bg-[#0d121c] border rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:outline-none transition-all ${emailError ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20' : 'border-white/10 focus:border-[#a5d391]/60 focus:ring-[#a5d391]/20'}`}
                            required
                        />
                        {emailError && <p id="admin-email-error" className="text-xs text-red-400">{emailError}</p>}
                        <p className="text-[10px] text-slate-500 mt-1">This email acts as your root login identifier.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-2">
                            <Key className="w-3.5 h-3.5" />
                            New Password
                        </label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave blank to keep current password"
                            className="w-full bg-[#0d121c] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:border-[#a5d391]/60 focus:ring-1 focus:ring-[#a5d391]/20 focus:outline-none transition-all"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Only fill this if you want to change your password.</p>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={saving}
                            className="px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest text-black bg-[#a5d391] hover:bg-white active:bg-slate-200 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(165,211,145,0.2)]"
                        >
                            {saving ? 'Saving...' : 'Save Credentials'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminProfile;
