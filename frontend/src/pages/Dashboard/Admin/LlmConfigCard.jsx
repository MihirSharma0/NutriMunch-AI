import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';

const LlmConfigCard = () => {
    const [config, setConfig] = useState({
        provider: 'OPENROUTER',
        model: 'google/gemini-2.5-flash',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: '',
        hasApiKey: false,
        maskedApiKey: '',
        defaultModel: 'google/gemini-2.5-flash'
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [testResult, setTestResult] = useState(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get('/admin/llm-config');
                if (res.data) {
                    setConfig(prev => ({
                        ...prev,
                        ...res.data,
                        apiKey: '' // Keep input empty so current key is masked
                    }));
                }
            } catch (err) {
                console.error("Failed to load LLM config:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        setStatusMessage(null);
        setErrorMessage(null);
        try {
            const payload = {
                provider: 'OPENROUTER',
                model: config.model,
                baseUrl: config.baseUrl
            };
            if (config.apiKey && config.apiKey.trim().length > 0) {
                payload.apiKey = config.apiKey.trim();
            }

            const res = await api.put('/admin/llm-config', payload);
            if (res.data) {
                setConfig(prev => ({
                    ...prev,
                    ...res.data,
                    apiKey: ''
                }));
            }
            setStatusMessage("LLM configuration saved successfully!");
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (err) {
            setErrorMessage(err.response?.data?.message || "Failed to save LLM configuration.");
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        setErrorMessage(null);
        try {
            const payload = {
                model: config.model,
                baseUrl: config.baseUrl
            };
            if (config.apiKey && config.apiKey.trim().length > 0) {
                payload.apiKey = config.apiKey.trim();
            }

            const res = await api.post('/admin/llm-config/test', payload);
            setTestResult(res.data);
        } catch (err) {
            setTestResult({
                success: false,
                message: err.response?.data?.message || err.message || "Failed to reach backend test endpoint"
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="bg-white/5 backdrop-blur-2xl p-6 sm:p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-2xl">key</span>
                    <h2 className="text-xl sm:text-2xl font-bold font-hero-display text-white tracking-wide">
                        LLM CONFIGURATION
                    </h2>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono px-3 py-1 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                    ACTIVE PROVIDER: OPENROUTER
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center text-white/50 font-mono">
                    <span className="material-symbols-outlined animate-spin text-2xl text-blue-400 mb-2 block">progress_activity</span>
                    Loading LLM configuration...
                </div>
            ) : (
                <form onSubmit={handleSave} className="space-y-6 relative z-10">
                    {/* Status Alerts */}
                    {statusMessage && (
                        <div className="p-3.5 bg-[#a5d391]/15 border border-[#a5d391]/30 rounded-xl text-[#a5d391] text-xs font-mono flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            {statusMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs font-mono flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">error</span>
                            {errorMessage}
                        </div>
                    )}
                    {testResult && (
                        <div className={`p-3.5 rounded-xl text-xs font-mono flex items-center gap-2 border ${
                            testResult.success
                                ? 'bg-[#a5d391]/15 border-[#a5d391]/30 text-[#a5d391]'
                                : 'bg-red-500/10 border-red-500/30 text-red-300'
                        }`}>
                            <span className="material-symbols-outlined text-sm">
                                {testResult.success ? 'verified' : 'cancel'}
                            </span>
                            <span>{testResult.message}</span>
                        </div>
                    )}

                    {/* Provider Selection */}
                    <div>
                        <label className="block text-xs font-bold text-white/70 tracking-wider uppercase mb-2">
                            PROVIDER
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            <button
                                type="button"
                                className="py-3 px-4 bg-blue-600 border-2 border-blue-400 text-white font-bold text-sm rounded-xl tracking-wider uppercase shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2 cursor-default"
                            >
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                OPENROUTER
                            </button>
                        </div>
                        <p className="text-[11px] font-mono text-white/50 mt-2">
                            SELECTED: OpenRouter (Unified OpenAI-compatible Gateway)
                        </p>
                    </div>

                    {/* Model Input */}
                    <div>
                        <label className="block text-xs font-bold text-white/70 tracking-wider uppercase mb-2">
                            MODEL
                        </label>
                        <input
                            type="text"
                            required
                            value={config.model || ''}
                            onChange={(e) => setConfig({ ...config, model: e.target.value })}
                            placeholder="google/gemini-2.5-flash"
                            className="w-full bg-black/40 border border-white/20 hover:border-white/30 focus:border-blue-400 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none transition-colors"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-[11px] text-white/50 font-mono">
                            <span>DEFAULT: {config.defaultModel || 'google/gemini-2.5-flash'}</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfig({ ...config, model: 'google/gemini-2.5-flash' })}
                                    className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
                                >
                                    gemini-2.5-flash
                                </button>
                                <span>•</span>
                                <button
                                    type="button"
                                    onClick={() => setConfig({ ...config, model: 'google/gemini-2.0-flash-001' })}
                                    className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
                                >
                                    gemini-2.0-flash
                                </button>
                                <span>•</span>
                                <button
                                    type="button"
                                    onClick={() => setConfig({ ...config, model: 'meta-llama/llama-3.3-70b-instruct' })}
                                    className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
                                >
                                    llama-3.3-70b
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* API Key Input */}
                    <div>
                        <label className="block text-xs font-bold text-white/70 tracking-wider uppercase mb-2">
                            API KEY
                        </label>
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={config.apiKey}
                            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                            placeholder={config.hasApiKey ? (config.maskedApiKey || 'Key configured in server') : 'sk-or-v1-...'}
                            className="w-full bg-black/40 border border-white/20 hover:border-white/30 focus:border-blue-400 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none transition-colors"
                        />
                        <p className="text-[11px] font-mono text-white/50 mt-1.5">
                            {config.hasApiKey
                                ? `Current Key: ${config.maskedApiKey} (LEAVE BLANK TO KEEP EXISTING KEY)`
                                : 'LEAVE BLANK TO KEEP EXISTING KEY'}
                        </p>
                    </div>

                    {/* Base URL (Optional) */}
                    <div>
                        <label className="block text-xs font-bold text-white/70 tracking-wider uppercase mb-2">
                            BASE URL (OPTIONAL)
                        </label>
                        <input
                            type="text"
                            value={config.baseUrl || ''}
                            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                            placeholder="https://openrouter.ai/api/v1"
                            className="w-full bg-black/40 border border-white/20 hover:border-white/30 focus:border-blue-400 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none transition-colors"
                        />
                        <p className="text-[11px] text-white/50 font-mono mt-1.5">
                            Override the API base URL to use a proxy/aggregator endpoint. Leave blank to use provider default.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full sm:flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-base">save</span>
                            {saving ? "SAVING..." : "SAVE"}
                        </button>

                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={testing}
                            className="w-full sm:flex-1 py-3 px-6 bg-white/10 hover:bg-white/20 border border-white/20 disabled:opacity-50 text-white font-bold text-sm tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-base">vital_signs</span>
                            {testing ? "TESTING..." : "TEST CONNECTION"}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default LlmConfigCard;

