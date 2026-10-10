import React, { useState } from 'react';

const ClientManagement = () => {
    const initialClients = [
        { id: "442", name: "David Miller", email: "david.m@example.com", age: 45, goal: "Diabetes Management", adherence: 82, status: "Critical", lastSync: "10m ago", weight: "88 kg", glucose: "142 mg/dL", calories: "1,950 kcal", protein: "140g", carbs: "160g", fats: "55g", notes: "Monitored insulin spike post-lunch. Adjusted carb threshold." },
        { id: "891", name: "Sarah Jenkins", email: "sarah.j@example.com", age: 29, goal: "Hypertrophy & Macro Scaling", adherence: 68, status: "Warning", lastSync: "2h ago", weight: "64 kg", glucose: "98 mg/dL", calories: "2,300 kcal", protein: "165g", carbs: "240g", fats: "60g", notes: "Missed evening macro log. Hydration target under 2.5L." },
        { id: "8472", name: "Marcus Chen", email: "marcus.c@example.com", age: 32, goal: "Lipid Oxidation & Endurance", adherence: 94, status: "Optimal", lastSync: "5m ago", weight: "76 kg", glucose: "92 mg/dL", calories: "2,650 kcal", protein: "175g", carbs: "310g", fats: "65g", notes: "VO2 max training phase. Excellent carbohydrate timing." },
        { id: "102", name: "Elena Rodriguez", email: "elena.r@example.com", age: 38, goal: "Hormonal Balance & PCOS", adherence: 91, status: "Optimal", lastSync: "1d ago", weight: "61 kg", glucose: "95 mg/dL", calories: "1,850 kcal", protein: "130g", carbs: "170g", fats: "58g", notes: "Consistent REM sleep. Micronutrient balance optimal." },
        { id: "553", name: "James Wilson", email: "james.w@example.com", age: 51, goal: "Cardiovascular Health", adherence: 88, status: "Good", lastSync: "4h ago", weight: "82 kg", glucose: "110 mg/dL", calories: "2,100 kcal", protein: "150g", carbs: "200g", fats: "60g", notes: "Sodium intake reduced by 15%. Blood pressure stable." },
    ];

    const [clientsList, setClientsList] = useState(initialClients);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedClient, setSelectedClient] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [notification, setNotification] = useState(null);

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
        const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              client.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              client.goal.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || client.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleAddClientSubmit = (e) => {
        e.preventDefault();
        if (!newClient.name.trim() || !newClient.goal.trim()) return;

        const created = {
            ...newClient,
            id: String(Math.floor(1000 + Math.random() * 9000)),
            lastSync: 'Just now',
            notes: 'Initial clinical assessment assigned.'
        };

        setClientsList([created, ...clientsList]);
        setIsAddModalOpen(false);
        setNewClient({ name: '', email: '', age: '', goal: '', status: 'Optimal', adherence: 90, weight: '70 kg', glucose: '95 mg/dL', calories: '2,000 kcal' });
        
        setNotification('Patient successfully added to clinical roster.');
        setTimeout(() => setNotification(null), 3500);
    };

    const handleDirectiveSubmit = (e) => {
        e.preventDefault();
        setNotification(`Clinical directive sent to ${selectedClient.name}!`);
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
                    <p className="text-white/50 text-xs sm:text-sm">Manage active client biometrics, adherence rates, and clinical protocols.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Search */}
                    <div className="relative flex-grow lg:flex-grow-0 lg:w-64">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-[20px]">search</span>
                        <input 
                            type="text" 
                            placeholder="Search client by name or ID..." 
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

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                {['ALL', 'Critical', 'Warning', 'Optimal', 'Good'].map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${statusFilter === status ? 'bg-[#a5d391] text-black shadow-md' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'}`}
                    >
                        {status === 'ALL' ? 'All Clients' : status} ({status === 'ALL' ? clientsList.length : clientsList.filter(c => c.status === status).length})
                    </button>
                ))}
            </div>
            
            {/* Table Container */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.02]">
                                <th className="p-5 font-bold text-white/40 uppercase tracking-widest text-[10px]">User & ID</th>
                                <th className="p-5 font-bold text-white/40 uppercase tracking-widest text-[10px]">Protocol / Goal</th>
                                <th className="p-5 font-bold text-white/40 uppercase tracking-widest text-[10px]">Adherence Rate</th>
                                <th className="p-5 font-bold text-white/40 uppercase tracking-widest text-[10px]">AI Status</th>
                                <th className="p-5 font-bold text-white/40 uppercase tracking-widest text-[10px]">Biometric Sync</th>
                                <th className="p-5 font-bold text-white/40 uppercase tracking-widest text-[10px] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-white/40 text-sm">
                                        No patients match your search or filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-[#a5d391]/20 text-[#a5d391] flex items-center justify-center font-bold text-sm border border-[#a5d391]/30 shrink-0">
                                                    {client.name.charAt(0)}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-[#080b12] border border-white/20 rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full relative shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-[#a5d391]/20 text-[#a5d391] flex items-center justify-center font-bold text-lg border border-[#a5d391]/40">
                                    {selectedClient.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{selectedClient.name}</h3>
                                    <p className="text-xs text-white/50">ID: #{selectedClient.id} • {selectedClient.age} yrs • {selectedClient.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedClient(null)} className="text-white/50 hover:text-white cursor-pointer">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Biometric Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
                                <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Weight</div>
                                <div className="text-base font-bold text-white">{selectedClient.weight}</div>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
                                <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Blood Glucose</div>
                                <div className="text-base font-bold text-[#a5d391]">{selectedClient.glucose}</div>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
                                <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Calorie Goal</div>
                                <div className="text-base font-bold text-white">{selectedClient.calories}</div>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
                                <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Adherence Rate</div>
                                <div className="text-base font-bold text-amber-400">{selectedClient.adherence}%</div>
                            </div>
                        </div>

                        {/* Macros breakdown */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                            <div className="text-xs font-bold uppercase tracking-widest text-[#a5d391]">Active Macro Protocol</div>
                            <div className="flex justify-between text-xs text-white/80 pt-1">
                                <span>Protein: <strong>{selectedClient.protein}</strong></span>
                                <span>Carbohydrates: <strong>{selectedClient.carbs}</strong></span>
                                <span>Fats: <strong>{selectedClient.fats}</strong></span>
                            </div>
                        </div>

                        {/* Clinical Notes */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <div className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">Dietitian Notes</div>
                            <p className="text-xs text-white/80 leading-relaxed italic">"{selectedClient.notes}"</p>
                        </div>

                        {/* Send Clinical Directive */}
                        <form onSubmit={handleDirectiveSubmit} className="space-y-3 pt-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-white">Send Direct Clinical Note to Patient</label>
                            <textarea 
                                rows="3"
                                placeholder="e.g., Maintain 180g protein threshold for upcoming training block..."
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                required
                            ></textarea>
                            <div className="flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setSelectedClient(null)} 
                                    className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white text-xs font-bold cursor-pointer"
                                >
                                    Close
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-5 py-2.5 rounded-xl bg-[#a5d391] text-black text-xs font-bold hover:bg-white transition-all cursor-pointer"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-[#080b12] border border-white/20 rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full relative shadow-2xl space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#a5d391]">person_add</span>
                                Enroll Patient to Clinical Roster
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-white/50 hover:text-white cursor-pointer">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleAddClientSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    value={newClient.name} 
                                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]" 
                                    placeholder="e.g. Alex Morgan"
                                    required 
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Email Address</label>
                                <input 
                                    type="email" 
                                    value={newClient.email} 
                                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]" 
                                    placeholder="alex.m@example.com"
                                    required 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Age</label>
                                    <input 
                                        type="number" 
                                        value={newClient.age} 
                                        onChange={(e) => setNewClient({ ...newClient, age: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]" 
                                        placeholder="34"
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Status</label>
                                    <select
                                        value={newClient.status}
                                        onChange={(e) => setNewClient({ ...newClient, status: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]"
                                    >
                                        <option value="Optimal">Optimal</option>
                                        <option value="Good">Good</option>
                                        <option value="Warning">Warning</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Primary Goal / Protocol</label>
                                <input 
                                    type="text" 
                                    value={newClient.goal} 
                                    onChange={(e) => setNewClient({ ...newClient, goal: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#a5d391]" 
                                    placeholder="e.g. Metabolic Conditioning"
                                    required 
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setIsAddModalOpen(false)} 
                                    className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white text-xs font-bold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-2.5 rounded-xl bg-[#a5d391] text-black text-xs font-bold hover:bg-white transition-all cursor-pointer"
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
