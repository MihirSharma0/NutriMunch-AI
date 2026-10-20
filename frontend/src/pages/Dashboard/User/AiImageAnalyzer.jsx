import React, { useState } from 'react';
import api from '../../../api/axios';

const AiImageAnalyzer = () => {
<<<<<<< Updated upstream
=======
    const [inputType, setInputType] = useState('FOOD_IMAGE'); // FOOD_IMAGE, BARCODE
>>>>>>> Stashed changes
    const [imageUrl, setImageUrl] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [loading, setLoading] = useState(false);

    const analyzeImage = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAnalysis('');

        try {
            const response = await api.post('/ai/analyze-image', { imageUrl });
            setAnalysis(response.data.analysis);
        } catch (error) {
            console.error("Error analyzing image", error);
            setAnalysis("Failed to analyze image. Please check the URL and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold font-hero-display mb-8 tracking-tight text-white">AI Food Scan</h1>
            
            <div className="bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 mb-8 shadow-xl">
                <form onSubmit={analyzeImage} className="space-y-6">
                    <div>
                        <label className="block text-[#a5d391] text-xs font-bold uppercase tracking-widest mb-2">Provide an image URL of your food:</label>
                        <input 
                            type="url" 
                            value={imageUrl} 
                            onChange={e => setImageUrl(e.target.value)}
                            placeholder="https://example.com/my-salad.jpg"
                            required
                            className="w-full bg-[#080b12]/80 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/40 outline-none focus:border-[#a5d391]/50 transition-colors"
                        />
                    </div>
<<<<<<< Updated upstream
                    {imageUrl && (
                        <div className="mt-4 flex justify-center">
                            <img src={imageUrl} alt="Food preview" className="max-h-48 w-full sm:w-auto rounded-2xl object-cover border border-[#a5d391]/30 shadow-lg" onError={(e) => e.target.style.display='none'}/>
=======

                    {/* Gemma AI Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 via-[#a5d391]/20 to-blue-500/20 border border-[#a5d391]/30 text-white text-xs font-bold shadow-lg">
                        <span className="material-symbols-outlined text-purple-300 text-base">auto_awesome</span>
                        <span>Gemma AI Vision & OCR Engine</span>
                    </div>
                </div>
                <p className="text-white/60 text-sm font-body-md max-w-3xl">
                    Powered by Google Gemma AI vision model. Scan food dishes, nutrition panels, or use live camera barcode scanning for instant allergen matching, additive safety, and health verdicts.
                </p>
            </div>

            {/* Input Selection Card */}
            <div className="bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-2xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#a5d391]/5 blur-[120px] rounded-full pointer-events-none"></div>

                {/* Input Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 bg-[#080b12]/80 rounded-2xl border border-white/10">
                    <button
                        type="button"
                        onClick={() => { setInputType('FOOD_IMAGE'); setErrorMsg(''); setIsCameraScanning(false); }}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${inputType === 'FOOD_IMAGE' ? 'bg-[#a5d391] text-black shadow-lg shadow-[#a5d391]/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        <span className="material-symbols-outlined text-lg">photo_camera</span>
                        <span>Food Photo</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setInputType('BARCODE'); setErrorMsg(''); }}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${inputType === 'BARCODE' ? 'bg-[#a5d391] text-black shadow-lg shadow-[#a5d391]/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        <span className="material-symbols-outlined text-lg">barcode_scanner</span>
                        <span>Barcode Scanner</span>
                    </button>
                </div>

                <form onSubmit={analyzeFood} className="space-y-6">
                    {/* Food photo image upload */}
                    {inputType === 'FOOD_IMAGE' && (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <label className="flex-grow w-full cursor-pointer flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/20 hover:border-[#a5d391]/60 bg-[#080b12]/60 rounded-2xl transition-all group">
                                    <span className="material-symbols-outlined text-4xl text-[#a5d391] group-hover:scale-110 transition-transform mb-2">cloud_upload</span>
                                    <span className="text-sm font-bold text-white mb-1">Click or drag image file here</span>
                                    <span className="text-xs text-white/40">Gemma AI analyzes food photo or label OCR scan</span>
                                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                                </label>

                                <div className="text-white/40 text-xs font-bold uppercase tracking-widest hidden sm:block">OR</div>

                                <div className="w-full sm:w-1/2 space-y-2">
                                    <label className="block text-xs font-bold text-[#a5d391] uppercase tracking-wider">Paste Image URL</label>
                                    <input
                                        type="url"
                                        value={imageUrl}
                                        onChange={(e) => {
                                            setImageUrl(e.target.value);
                                            setPreviewImage(e.target.value);
                                        }}
                                        placeholder="https://example.com/salad.jpg"
                                        className="w-full bg-[#080b12]/80 border border-white/10 rounded-2xl p-4 text-white text-sm placeholder:text-white/40 outline-none focus:border-[#a5d391]/50 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Sample presets */}
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                <span className="text-xs text-white/50 font-bold">Quick Presets:</span>
                                <button type="button" onClick={() => applySamplePhoto('https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80')} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#a5d391]/20 hover:text-[#a5d391] border border-white/10 text-white/70 transition-all cursor-pointer">
                                    🥗 Fresh Salad Bowl
                                </button>
                                <button type="button" onClick={() => applySamplePhoto('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80')} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-300 border border-white/10 text-white/70 transition-all cursor-pointer">
                                    🍔 Fast Food Burger
                                </button>
                            </div>

                            {/* Preview */}
                            {previewImage && (
                                <div className="mt-4 flex flex-col items-center justify-center p-3 bg-[#080b12]/90 rounded-2xl border border-white/10">
                                    <span className="text-xs font-bold text-[#a5d391] mb-2 uppercase tracking-wider">Image Preview Ready</span>
                                    <img src={previewImage} alt="Preview" className="max-h-56 rounded-xl object-contain border border-[#a5d391]/30 shadow-lg" onError={(e) => e.target.style.display = 'none'} />
                                </div>
                            )}
>>>>>>> Stashed changes
                        </div>
                    )}
                    <button type="submit" disabled={loading || !imageUrl} className="px-8 py-4 bg-[#a5d391] hover:bg-white disabled:opacity-50 text-black font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer">
                        {loading ? 'Analyzing...' : 'Analyze Food'}
                    </button>
                </form>
            </div>

            {analysis && (
                <div className="bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-xl">
                    <h2 className="text-xl font-bold mb-4 text-[#a5d391] font-hero-display">Analysis Results</h2>
                    <div className="whitespace-pre-wrap text-white/80 leading-relaxed font-body-md">
                        {analysis}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiImageAnalyzer;
