import React, { useState, useEffect, useContext } from 'react';
import api, { API_BASE_URL } from '../../../api/axios';
import { AuthContext } from '../../../context/AuthContext';
import { ALLERGEN_OPTIONS, DIET_OPTIONS, parseAllergies } from '../../../utils/dietFilters';

const ClientManagement = () => {
    const { user, token } = useContext(AuthContext);
    const nutritionistName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.name || user?.username || 'Certified Nutritionist');
    const initialClients = [
        { id: "442", name: "David Miller", email: "david.m@example.com", role: "USER", roleBadge: "User", age: 45, goal: "Diabetes Management", adherence: 82, status: "Critical", lastSync: "10m ago", weight: "88 kg", glucose: "142 mg/dL", calories: "1,950 kcal", protein: "140g", carbs: "160g", fats: "55g", notes: "Monitored insulin spike post-lunch. Adjusted carb threshold." },
        { id: "8472", name: "Marcus Chen", email: "marcus.c@example.com", role: "USER", roleBadge: "User", age: 32, goal: "Lipid Oxidation & Endurance", adherence: 94, status: "Optimal", lastSync: "5m ago", weight: "76 kg", glucose: "92 mg/dL", calories: "2,650 kcal", protein: "175g", carbs: "310g", fats: "65g", notes: "VO2 max training phase. Excellent carbohydrate timing." },
        { id: "102", name: "Elena Rodriguez", email: "elena.r@example.com", role: "USER", roleBadge: "User", age: 38, goal: "Hormonal Balance & PCOS", adherence: 91, status: "Optimal", lastSync: "1d ago", weight: "61 kg", glucose: "95 mg/dL", calories: "1,850 kcal", protein: "130g", carbs: "170g", fats: "58g", notes: "Consistent REM sleep. Micronutrient balance optimal." },
        { id: "553", name: "James Wilson", email: "james.w@example.com", role: "USER", roleBadge: "User", age: 51, goal: "Cardiovascular Health", adherence: 88, status: "Good", lastSync: "4h ago", weight: "82 kg", glucose: "110 mg/dL", calories: "2,100 kcal", protein: "150g", carbs: "200g", fats: "60g", notes: "Sodium intake reduced by 15%. Blood pressure stable." },
    ];

    const [clientsList, setClientsList] = useState(initialClients);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [allergyFilter, setAllergyFilter] = useState('ALL'); // 'ALL' | 'NONE' | allergen id
    const [dietFilter, setDietFilter] = useState('ALL');
    const [selectedClient, setSelectedClient] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        fetchRealUsers();

        const handleProfileUpdate = () => {
            fetchRealUsers();
        };
        window.addEventListener('nutrimunch_profile_updated', handleProfileUpdate);
        return () => window.removeEventListener('nutrimunch_profile_updated', handleProfileUpdate);
    }, []);

    const fetchRealUsers = async () => {
        try {
            setLoading(true);
            // Fetch live user profiles with updated biometrics, goals, and macro targets
            const response = await api.get('/admin/all-user-profiles');
            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                const fetchedClients = response.data.map(p => {
                    const name = p.firstName || p.lastName ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : (p.email ? p.email.split('@')[0] : 'Patient User');
                    const weightStr = p.weightKg != null && p.weightKg > 0 ? `${p.weightKg} kg` : 'Not Logged';
                    const caloriesStr = p.dailyCaloriesTarget != null && p.dailyCaloriesTarget > 0 ? `${p.dailyCaloriesTarget.toLocaleString()} kcal` : 'Not Set';
                    const proteinStr = p.proteinTarget != null && p.proteinTarget > 0 ? `${p.proteinTarget}g` : 'Not Set';
                    const carbsStr = p.carbsTarget != null && p.carbsTarget > 0 ? `${p.carbsTarget}g` : 'Not Set';
                    const fatsStr = p.fatsTarget != null && p.fatsTarget > 0 ? `${p.fatsTarget}g` : 'Not Set';
                    const lastSyncStr = p.updatedAt ? `${new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${new Date(p.updatedAt).toLocaleDateString()})` : 'Recently Synced';

                    const notesText = (p.allergies || p.dietType || p.mealBudget)
                        ? `Diet Protocol: ${p.dietType || 'Standard'} | Budget Tier: ${p.mealBudget || 'Affordable'} | Allergies: ${p.allergies || 'None'}`
                        : 'User account registered. No custom dietary restrictions logged.';

                    return {
                        id: String(p.userId || p.id),
                        name: name,
                        email: p.email || 'patient@nutrimunch.com',
                        role: 'USER',
                        roleBadge: 'User',
                        age: p.age || 25,
                        goal: p.goal || 'General Health & Nutrition',
                        adherence: p.adherence || 90,
                        status: p.status || 'Optimal',
                        lastSync: lastSyncStr,
                        weight: weightStr,
                        glucose: '95 mg/dL',
                        calories: caloriesStr,
                        protein: proteinStr,
                        carbs: carbsStr,
                        fats: fatsStr,
                        allergies: parseAllergies(p.allergies),
                        dietType: p.dietType || '',
                        notes: notesText
                    };
                });
                
                setClientsList(fetchedClients);
            }
        } catch (error) {
            console.error("Falling back to /admin/all-users endpoint", error);
            try {
                const fallbackResponse = await api.get('/admin/all-users');
                if (fallbackResponse.data && Array.isArray(fallbackResponse.data)) {
                    const patientOnlyUsers = fallbackResponse.data.filter(u => {
                        const r = u.role ? String(u.role).toUpperCase().replace('ROLE_', '') : 'USER';
                        return r === 'USER';
                    });
                    const fallbackClients = patientOnlyUsers.map(u => ({
                        id: String(u.id),
                        name: u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : (u.email ? u.email.split('@')[0] : 'User'),
                        email: u.email || 'patient@nutrimunch.com',
                        role: 'USER',
                        roleBadge: 'User',
                        age: 28,
                        goal: 'General Health & AI Calibrated Diet',
                        adherence: 88,
                        status: u.verified || u.enabled ? 'Optimal' : 'Good',
                        lastSync: u.verified || u.enabled ? 'Verified Account' : 'Pending OTP',
                        weight: 'Not Logged',
                        glucose: '95 mg/dL',
                        calories: 'Not Set',
                        protein: 'Not Set',
                        carbs: 'Not Set',
                        fats: 'Not Set',
                        notes: 'Registered platform user.'
                    }));
                    setClientsList(fallbackClients);
                }
            } catch (err) {
                console.error("Failed loading fallback users", err);
            }
        } finally {
            setLoading(false);
        }
    };

    // New Patient Form State
    const [newClient, setNewClient] = useState({
        name: '',
        email: '',
        age: '',
        goal: '',
        status: 'Optimal',
        adherence: 90,
        weight: '70 kg',
        glucose: '95 mg/dL',
        calories: '2,000 kcal'
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Critical': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'Warning': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'Optimal': return 'text-[#a5d391] bg-[#a5d391]/10 border-[#a5d391]/20';
            case 'Good': return 'text-sky-400 bg-sky-400/10 border-sky-400/20';
            default: return 'text-white/70 bg-white/5 border-white/10';
        }
    };

    const filteredClients = clientsList.filter(client => {
        // Enforce exclusion of Admin and other Nutritionist accounts from nutritionist patient roster
        const r = client.role ? String(client.role).toUpperCase().replace('ROLE_', '') : 'USER';
        if (r !== 'USER') return false;

        const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              client.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                              client.goal.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || client.status === statusFilter;

        const clientAllergies = client.allergies || [];
        const matchesAllergy = allergyFilter === 'ALL'
            || (allergyFilter === 'NONE' ? clientAllergies.length === 0
                : clientAllergies.some(a => a.toLowerCase().includes(allergyFilter.toLowerCase())));
        const matchesDiet = dietFilter === 'ALL'
            || String(client.dietType || '').toLowerCase() === dietFilter.toLowerCase();

        return matchesSearch && matchesStatus && matchesAllergy && matchesDiet;
    });

    const handleAddClientSubmit = (e) => {
        e.preventDefault();
        if (!newClient.name.trim() || !newClient.goal.trim()) return;

        const created = {
            ...newClient,
            id: String(Math.floor(1000 + Math.random() * 9000)),
            role: 'USER',
            roleBadge: 'User',
            lastSync: 'Just now',
            notes: 'Initial clinical assessment assigned.'
        };

        setClientsList([created, ...clientsList]);
        setIsAddModalOpen(false);
        setNewClient({ name: '', email: '', age: '', goal: '', status: 'Optimal', adherence: 90, weight: '70 kg', glucose: '95 mg/dL', calories: '2,000 kcal' });
        
        setNotification('Patient successfully added to clinical roster.');
        setTimeout(() => setNotification(null), 3500);
    };

    const [directiveText, setDirectiveText] = useState('');

    const handleDirectiveSubmit = async (e) => {
        e.preventDefault();
        if (!directiveText.trim() || !selectedClient) return;

        const targetId = selectedClient.userId || selectedClient.id;
        const directiveTitle = `Clinical Directive from Nutritionist ${nutritionistName}`;
        const payload = {
            userId: targetId ? Number(targetId) : null,
            userEmail: selectedClient.email || '',
            title: directiveTitle,
            message: directiveText.trim(),
            type: 'CLINICAL_DIRECTIVE',
            icon: 'health_and_safety',
            path: '/progress'
        };

        try {
            await fetch(`${API_BASE_URL}/notifications/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error("Failed sending live directive notification to backend", err);
        }

        const newNotification = {
            senderId: String(user?.id || user?.userId || ''),
            id: `directive_${Date.now()}`,
            title: directiveTitle,
            message: directiveText.trim(),
            time: 'Just now',
            icon: 'health_and_safety',
            path: '/progress',
            targetEmail: selectedClient.email || '',
            targetUserId: targetId || '',
            targetName: selectedClient.name || '',
            read: false
        };

        try {
            const existingNotifs = JSON.parse(localStorage.getItem('nutrimunch_user_notifications') || '[]');
            localStorage.setItem('nutrimunch_user_notifications', JSON.stringify([newNotification, ...existingNotifs]));

            const existingDirectives = JSON.parse(localStorage.getItem('nutrimunch_clinical_directives') || '[]');
            localStorage.setItem('nutrimunch_clinical_directives', JSON.stringify([newNotification, ...existingDirectives]));

            window.dispatchEvent(new Event('nutrimunch_notification_added'));
            window.dispatchEvent(new Event('storage'));

            try {
                const bc = new BroadcastChannel('nutrimunch_clinical_channel');
                bc.postMessage({ type: 'CLINICAL_DIRECTIVE_SENT', payload: newNotification });
                bc.close();
            } catch (e) {}
        } catch (err) {
            console.error("Failed saving directive notification", err);
        }

        setNotification(`Clinical directive sent to ${selectedClient.name}!`);
        setDirectiveText('');
        setSelectedClient(null);
        setTimeout(() => setNotification(null), 3500);
    };

    return (
        <div className="w-full relative">

            {/* Notification Banner */}
            {notification && (
                <div className="fixed top-24 right-8 z-50 bg-[#a5d391] text-[#080b12] px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl flex items-center gap-2 animate-bounce">
                    <span className="material-symbols-outlined">check_circle</span>
                    {notification}
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white mb-1">User & Patient Roster</h1>
                    <p className="text-white/50 text-xs sm:text-sm">Manage active client biometrics, real user roles, adherence rates, and clinical protocols.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Search */}
                    <div className="relative flex-grow lg:flex-grow-0 lg:w-64">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-[20px]">search</span>
                        <input 
                            type="text" 
                            placeholder="Search client by name, role or ID..." 
                            className="w-full bg-[#080b12]/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#a5d391]/50 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Add Patient Button */}
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-[#a5d391] text-black font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-white transition-all shadow-[0_0_15px_rgba(165,211,145,0.3)] cursor-pointer flex items-center gap-2 shrink-0"
                    >
                        <span className="material-symbols-outlined text-sm">person_add</span>
                        Add Patient
                    </button>
                </div>
            </div>

            {/* Health Status Filter Tabs */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
                <span className="text-[10px] font-mono uppercase text-white/40 font-bold mr-1 shrink-0">Health Status:</span>
                {['ALL', 'Critical', 'Warning', 'Optimal', 'Good'].map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${statusFilter === status ? 'bg-[#a5d391] text-black shadow-md' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'}`}
                    >
                        {status === 'ALL' ? 'All Patients' : status} ({status === 'ALL' ? clientsList.length : clientsList.filter(c => c.status === status).length})
                    </button>
                ))}
            </div>

            {/* Allergies / Diet Filter */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-white/40 font-bold">Allergy:</span>
                    <select
                        value={allergyFilter}
                        onChange={(e) => setAllergyFilter(e.target.value)}
                        className="bg-[#080b12]/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer focus:border-[#a5d391]/50"
                    >
                        <option value="ALL">All Patients</option>
                        <option value="NONE">No Allergies</option>
                        {ALLERGEN_OPTIONS.map(a => <option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-white/40 font-bold">Diet:</span>
                    <select
                        value={dietFilter}
                        onChange={(e) => setDietFilter(e.target.value)}
                        className="bg-[#080b12]/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer focus:border-[#a5d391]/50"
                    >
                        <option value="ALL">All Diets</option>
                        {DIET_OPTIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                </div>
                {(allergyFilter !== 'ALL' || dietFilter !== 'ALL') && (
                    <button
                        type="button"
                        onClick={() => { setAllergyFilter('ALL'); setDietFilter('ALL'); }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10 transition-all cursor-pointer"
                    >
                        Clear
                    </button>
                )}
            </div>
            
            {/* Table Container */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                {loading ? (
                    <div className="p-12 text-center text-white/60 font-mono">
                        <span className="material-symbols-outlined animate-spin text-3xl text-[#a5d391] mb-2 block">progress_activity</span>
                        Fetching real patient roster...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[850px]">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.02]">
                                    <th className="p-5 font-bold text-white/40 uppercase tracking-widest text-[10px]">Patient Name & ID</th>
                                    <th className="p-5 font-bold text-white/40 uppercase tracking-widest text-[10px]">Protocol / Goal</th>
                                    <th className="p-5 font-bold text-white/40 uppercase tracking-widest text-[10px]">Adherence Rate</th>
                                    <th className="p-5 font-bold text-white/40 uppercase tracking-widest text-[10px]">AI Status</th>
                                    <th className="p-5 font-bold text-white/40 uppercase tracking-widest text-[10px]">Sync Status</th>
                                    <th className="p-5 font-bold text-white/40 uppercase tracking-widest text-[10px] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredClients.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-12 text-center text-white/40 text-sm">
                                            No users or patients match your search or filter criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredClients.map((client) => (
                                        <tr key={client.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-[#a5d391]/20 text-[#a5d391] flex items-center justify-center font-bold text-sm border border-[#a5d391]/30 shrink-0">
                                                        {client.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-white">{client.name}</div>
                                                        <div className="text-[10px] text-white/40 uppercase tracking-widest">ID: #{client.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                        <td className="p-5">
                                            <div className="text-sm font-medium text-white">{client.goal}</div>
                                            <div className="text-[11px] text-white/40">{client.email}</div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${client.adherence >= 85 ? 'bg-[#a5d391]' : client.adherence >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`} 
                                                        style={{ width: `${client.adherence}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-bold text-white/80">{client.adherence}%</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(client.status)}`}>
                                                {client.status}
                                            </span>
                                        </td>
                                        <td className="p-5 text-sm text-white/50">
                                            {client.lastSync}
                                        </td>
                                        <td className="p-5 text-right">
                                            <button 
                                                onClick={() => setSelectedClient(client)}
                                                className="text-[#a5d391] hover:text-black hover:bg-[#a5d391] transition-all text-xs font-bold uppercase tracking-widest border border-[#a5d391]/30 px-4 py-2 rounded-xl cursor-pointer"
                                            >
                                                View Data
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
                
                <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-white/40 font-bold uppercase tracking-widest">
                    <span>Showing {filteredClients.length} of {clientsList.length} Clients</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 rounded bg-white/5 text-white/60 hover:text-white transition-colors cursor-pointer">Prev</button>
                        <button className="px-3 py-1 rounded bg-white/5 text-[#a5d391] hover:text-white transition-colors cursor-pointer">Next</button>
                    </div>
                </div>
            </div>

            {/* Modal: Client Biometric Details */}
            {selectedClient && (
                <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-8 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    <div className="bg-[#080b12] border border-white/20 rounded-3xl p-5 sm:p-6 max-w-lg w-full relative shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] space-y-4 my-auto">
                        {/* Header inside modal */}
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#a5d391]/20 text-[#a5d391] flex items-center justify-center font-bold text-base border border-[#a5d391]/40 shrink-0">
                                    {selectedClient.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-lg font-bold text-white">{selectedClient.name}</h3>
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border text-[#a5d391] bg-[#a5d391]/15 border-[#a5d391]/30">
                                            Patient
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${getStatusColor(selectedClient.status)}`}>
                                            {selectedClient.status}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-white/50">ID: #{selectedClient.id} • {selectedClient.age} yrs • {selectedClient.email}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedClient(null)} 
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer shrink-0"
                            >
                                <span className="material-symbols-outlined text-base">close</span>
                            </button>
                        </div>

                        {/* Biometric Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                                <div className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Weight</div>
                                <div className="text-sm font-bold text-white">{selectedClient.weight}</div>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                                <div className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Glucose</div>
                                <div className="text-sm font-bold text-[#a5d391]">{selectedClient.glucose}</div>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                                <div className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Calories</div>
                                <div className="text-sm font-bold text-sky-400">{selectedClient.calories}</div>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                                <div className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Adherence</div>
                                <div className="text-sm font-bold text-amber-400">{selectedClient.adherence}%</div>
                            </div>
                        </div>

                        {/* Macros breakdown */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold uppercase tracking-widest text-[#a5d391] text-[10px]">Macro Protocol</span>
                                <span className="text-[10px] text-white/50">{selectedClient.goal}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-black/40 border border-white/10 p-2 rounded-lg text-center">
                                    <div className="text-[10px] text-white/60">Protein</div>
                                    <div className="text-xs font-bold text-white">{selectedClient.protein}</div>
                                </div>
                                <div className="bg-black/40 border border-white/10 p-2 rounded-lg text-center">
                                    <div className="text-[10px] text-white/60">Carbs</div>
                                    <div className="text-xs font-bold text-white">{selectedClient.carbs}</div>
                                </div>
                                <div className="bg-black/40 border border-white/10 p-2 rounded-lg text-center">
                                    <div className="text-[10px] text-white/60">Fats</div>
                                    <div className="text-xs font-bold text-white">{selectedClient.fats}</div>
                                </div>
                            </div>
                        </div>

                        {/* Nutritionist Assessment */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Assessment Notes</div>
                            <p className="text-xs text-white/80 italic leading-snug">"{selectedClient.notes}"</p>
                        </div>

                        {/* Send Patient Directive */}
                        <form onSubmit={handleDirectiveSubmit} className="space-y-2.5 pt-1 border-t border-white/10">
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-white">Send Clinical Directive</label>
                            <textarea 
                                rows="2"
                                value={directiveText}
                                onChange={(e) => setDirectiveText(e.target.value)}
                                placeholder="Directive note or adjustment for patient..."
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                required
                            ></textarea>
                            <div className="flex justify-end gap-2 pt-1">
                                <button 
                                    type="button" 
                                    onClick={() => setSelectedClient(null)} 
                                    className="px-4 py-2 rounded-xl border border-white/10 text-white/70 hover:text-white text-xs font-bold cursor-pointer"
                                >
                                    Close
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-5 py-2 rounded-xl bg-[#a5d391] text-[#080b12] font-bold text-xs hover:bg-white transition-all cursor-pointer shadow-md"
                                >
                                    Send Directive
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Patient */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-8 bg-black/85 backdrop-blur-xl overflow-y-auto animate-fadeIn">
                    <div className="bg-[#080b12] border border-white/20 rounded-3xl p-5 sm:p-6 max-w-md w-full relative shadow-2xl space-y-4 my-auto">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#a5d391] text-lg">person_add</span>
                                Enroll Patient to Clinical Roster
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-white/50 hover:text-white cursor-pointer">
                                <span className="material-symbols-outlined text-base">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleAddClientSubmit} className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    value={newClient.name} 
                                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#a5d391]" 
                                    placeholder="e.g. Alex Morgan"
                                    required 
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Email Address</label>
                                <input 
                                    type="email" 
                                    value={newClient.email} 
                                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#a5d391]" 
                                    placeholder="alex.m@example.com"
                                    required 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Age</label>
                                    <input 
                                        type="number" 
                                        value={newClient.age} 
                                        onChange={(e) => setNewClient({ ...newClient, age: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#a5d391]" 
                                        placeholder="34"
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Status</label>
                                    <select
                                        value={newClient.status}
                                        onChange={(e) => setNewClient({ ...newClient, status: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    >
                                        <option value="Optimal">Optimal</option>
                                        <option value="Good">Good</option>
                                        <option value="Warning">Warning</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Primary Goal / Protocol</label>
                                <input 
                                    type="text" 
                                    value={newClient.goal} 
                                    onChange={(e) => setNewClient({ ...newClient, goal: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#a5d391]" 
                                    placeholder="e.g. Metabolic Conditioning"
                                    required 
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setIsAddModalOpen(false)} 
                                    className="px-4 py-2 rounded-xl border border-white/10 text-white/70 hover:text-white text-xs font-bold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-5 py-2 rounded-xl bg-[#a5d391] text-black text-xs font-bold hover:bg-white transition-all cursor-pointer"
                                >
                                    Enroll Patient
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientManagement;
