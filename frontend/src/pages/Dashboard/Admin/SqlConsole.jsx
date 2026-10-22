import React, { useState, useContext } from 'react';
import api from '../../../api/axios';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';

const SqlConsole = () => {
    const { user } = useContext(AuthContext);

    if (!user) {
        return <FeatureGate />;
    }
    const [query, setQuery] = useState('SELECT * FROM users LIMIT 10;');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const presetQueries = [
        { label: 'All Users', sql: 'SELECT id, email, first_name, last_name, role, is_verified, created_at FROM users;' },
        { label: 'Show Tables', sql: 'SHOW TABLES;' },
        { label: 'Nutritionists', sql: 'SELECT * FROM nutritionist_profiles;' },
        { label: 'System Settings', sql: 'SELECT * FROM system_settings;' },
        { label: 'Unverified Users', sql: 'SELECT id, email, first_name, is_verified FROM users WHERE is_verified = false;' }
    ];

    const handleExecute = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await api.post('/admin/query', { query });
            if (response.data.success) {
                setResult(response.data);
            } else {
                setError(response.data.error || 'Failed to execute query.');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Error executing query.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="text-[#a5d391] text-[10px] font-black tracking-[0.2em] uppercase flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 bg-[#a5d391] rounded-full animate-pulse"></span>
                        SQL Terminal Engine
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-hero-display text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#a5d391] text-2xl sm:text-3xl">terminal</span>
                        Database SQL Console
                    </h1>
                    <p className="text-white/60 text-sm mt-1 font-light">
                        Execute dynamic SQL queries directly against the production database to retrieve fields and records.
                    </p>
                </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="bg-white/5 backdrop-blur-xl p-4 sm:p-6 rounded-[2rem] border border-white/10 space-y-4">
                <span className="text-xs font-bold text-white/50 uppercase tracking-wider block font-mono">Quick Query Snippets:</span>
                <div className="flex flex-wrap gap-2.5">
                    {presetQueries.map((preset, idx) => (
                        <button
                            key={idx}
                            onClick={() => setQuery(preset.sql)}
                            className="px-4 py-2 bg-black/40 hover:bg-[#a5d391]/20 hover:text-[#a5d391] border border-white/10 hover:border-[#a5d391]/40 rounded-xl text-xs font-mono transition-all duration-300 text-white/80 cursor-pointer"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* SQL Editor Area */}
            <div className="bg-white/5 backdrop-blur-xl p-4 sm:p-6 rounded-[2.5rem] border border-white/10 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-mono text-[#a5d391]">SQL Engine // MySQL 8.4</span>
                    <button 
                        onClick={() => setQuery('')}
                        className="text-xs text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                    >
                        Clear Editor
                    </button>
                </div>
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={5}
                    placeholder="ENTER SQL QUERY HERE (e.g. SELECT * FROM users;)"
                    className="w-full bg-black/50 border border-white/15 rounded-2xl p-3 sm:p-5 font-mono text-sm text-[#a5d391] focus:outline-none focus:border-[#a5d391] resize-y"
                />
                
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <button
                        onClick={handleExecute}
                        disabled={loading || !query.trim()}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3 bg-[#a5d391] hover:bg-white disabled:opacity-50 text-black font-bold rounded-2xl text-sm transition-all duration-300 shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                                Executing...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-lg">play_arrow</span>
                                Execute Query
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 font-mono text-sm flex items-start gap-3">
                    <span className="material-symbols-outlined text-red-400 mt-0.5">error</span>
                    <div>
                        <strong className="block text-red-400 font-bold mb-1">SQL Execution Error:</strong>
                        {error}
                    </div>
                </div>
            )}

            {/* Query Results */}
            {result && (
                <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl p-2">
                    <div className="p-5 bg-white/5 border-b border-white/10 flex items-center justify-between rounded-t-3xl">
                        <span className="text-xs font-mono text-white/70">
                            Query returned <strong className="text-[#a5d391]">{result.rowCount}</strong> row(s)
                        </span>
                    </div>

                    {result.columns && result.columns.length > 0 ? (
                        <div className="overflow-x-auto max-h-[500px]">
                            <table className="w-full text-left border-collapse font-mono text-xs">
                                <thead className="sticky top-0 bg-[#080b12] text-[#a5d391] border-b border-white/15">
                                    <tr>
                                        {result.columns.map((col, i) => (
                                            <th key={i} className="p-4 whitespace-nowrap border-r border-white/10 uppercase tracking-wider">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.rows.map((row, idx) => (
                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            {result.columns.map((col, i) => (
                                                <td key={i} className="p-4 whitespace-nowrap border-r border-white/5 text-white/90">
                                                    {row[col] === null ? (
                                                        <span className="text-white/30 italic">NULL</span>
                                                    ) : typeof row[col] === 'boolean' ? (
                                                        <span className={row[col] ? "text-[#a5d391] font-bold" : "text-red-400"}>
                                                            {String(row[col])}
                                                        </span>
                                                    ) : (
                                                        String(row[col])
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-white/50 font-mono text-sm">
                            Query executed successfully. No rows returned.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SqlConsole;
