import React, { useState, useEffect, useRef } from 'react';
import api from '../../../api/axios';
import { Html5Qrcode } from 'html5-qrcode';

const AiImageAnalyzer = () => {
    const [inputType, setInputType] = useState('FOOD_IMAGE'); // FOOD_IMAGE, BARCODE
    const [imageUrl, setImageUrl] = useState('');
    const [previewImage, setPreviewImage] = useState(null);
    const [barcode, setBarcode] = useState('');
    const [customAllergies, setCustomAllergies] = useState('');
    const [allergyTags, setAllergyTags] = useState([]);
    const [userProfileAllergies, setUserProfileAllergies] = useState('');
    
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Camera Scanner States
    const [isCameraScanning, setIsCameraScanning] = useState(false);
    const scannerRef = useRef(null);

    useEffect(() => {
        // Fetch user profile to pre-fill allergies
        const fetchProfile = async () => {
            try {
                const res = await api.get('/profiles/me');
                if (res.data && res.data.allergies) {
                    setUserProfileAllergies(res.data.allergies);
                    const tags = res.data.allergies.split(/[,;]/).map(s => s.trim()).filter(Boolean);
                    setAllergyTags(tags);
                }
            } catch (err) {
                console.log("Could not load user profile allergies for analyzer pre-fill", err);
            }
        };
        fetchProfile();
    }, []);

    // Handle Camera Scanner Lifecycle
    useEffect(() => {
        let html5QrcodeScanner = null;

        if (isCameraScanning) {
            html5QrcodeScanner = new Html5Qrcode("barcode-camera-viewport");
            html5QrcodeScanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 160 }
                },
                (decodedText) => {
                    setBarcode(decodedText);
                    stopCameraScanner(html5QrcodeScanner);
                },
                (errorMessage) => {
                    // scanning...
                }
            ).catch(err => {
                console.error("Camera access error:", err);
                setErrorMsg("Could not access camera. Please verify camera permissions in your browser.");
                setIsCameraScanning(false);
            });
            scannerRef.current = html5QrcodeScanner;
        }

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [isCameraScanning]);

    const stopCameraScanner = (scannerInstance) => {
        const scanner = scannerInstance || scannerRef.current;
        if (scanner && scanner.isScanning) {
            scanner.stop().then(() => {
                setIsCameraScanning(false);
            }).catch(err => {
                console.error("Error stopping scanner:", err);
                setIsCameraScanning(false);
            });
        } else {
            setIsCameraScanning(false);
        }
    };

    const handleAddAllergy = (e) => {
        if (e.key === 'Enter' && customAllergies.trim()) {
            e.preventDefault();
            const newTag = customAllergies.trim();
            if (!allergyTags.includes(newTag)) {
                setAllergyTags([...allergyTags, newTag]);
            }
            setCustomAllergies('');
        }
    };

    const removeAllergyTag = (tagToRemove) => {
        setAllergyTags(allergyTags.filter(tag => tag !== tagToRemove));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
                setImageUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const analyzeFood = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setAnalysis(null);

        try {
            const payload = {
                inputType,
                imageUrl: previewImage || imageUrl,
                barcode: barcode,
                customAllergies: allergyTags.join(', ')
            };
            const response = await api.post('/ai/analyze-food', payload);
            setAnalysis(response.data);
        } catch (error) {
            console.error("Error analyzing food input", error);
            setErrorMsg("Failed to analyze food. Please ensure input data or image is valid and try again.");
        } finally {
            setLoading(false);
        }
    };

    // Helper presets for testing barcode & image quickly
    const applyPresetBarcode = (code) => {
        setInputType('BARCODE');
        setBarcode(code);
    };

    const applySamplePhoto = (url) => {
        setInputType('FOOD_IMAGE');
        setImageUrl(url);
        setPreviewImage(url);
    };

    return (
        <div className="w-full max-w-6xl mx-auto pb-16 space-y-8">
            {/* Header Title */}
            <div>
                <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
                    <div className="flex items-center gap-3">
                        <span className="p-2.5 rounded-2xl bg-[#a5d391]/10 text-[#a5d391] border border-[#a5d391]/20 backdrop-blur-md">
                            <span className="material-symbols-outlined text-2xl">center_focus_strong</span>
                        </span>
                        <h1 className="text-3xl font-bold font-hero-display tracking-tight text-white">
                            AI Food & Label Analyzer
                        </h1>
                    </div>

                    {/* Gemma AI Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 via-[#a5d391]/20 to-blue-500/20 border border-[#a5d391]/30 text-white text-xs font-bold shadow-lg">
                        <span className="material-symbols-outlined text-purple-300 text-base">auto_awesome</span>
                        <span>Gemma AI Vision & OCR Engine</span>
                    </div>
                </div>
                <p className="text-white/60 text-sm font-body-md max-w-3xl">
                    Powered by Google Gemma AI vision model. Scan food dishes or use live camera barcode scanning for instant allergen matching, additive safety, and health verdicts.
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
                                    <span className="text-xs text-white/40">Gemma AI analyzes food photo</span>
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
                        </div>
                    )}

                    {/* Mode 4: Live Camera Barcode Scanner */}
                    {inputType === 'BARCODE' && (
                        <div className="space-y-6">
                            {/* Live Camera Scanner Box */}
                            {isCameraScanning ? (
                                <div className="flex flex-col items-center justify-center p-6 bg-[#080b12]/90 rounded-3xl border-2 border-[#a5d391]/40 space-y-4 shadow-2xl">
                                    <div className="flex items-center justify-between w-full max-w-md">
                                        <div className="flex items-center gap-2 text-[#a5d391] font-bold text-sm">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#a5d391] animate-ping"></span>
                                            <span>Live Camera Scanning Active</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => stopCameraScanner()}
                                            className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 text-xs font-bold hover:bg-red-500/30 cursor-pointer"
                                        >
                                            Close Camera
                                        </button>
                                    </div>
                                    <div id="barcode-camera-viewport" className="w-full max-w-md aspect-square sm:aspect-video rounded-2xl overflow-hidden border border-white/20 bg-black"></div>
                                    <p className="text-xs text-white/60">Position product barcode inside the scanning frame.</p>
                                </div>
                            ) : (
                                <div className="p-6 bg-[#080b12]/60 rounded-3xl border border-white/10 flex flex-col items-center justify-center text-center space-y-4">
                                    <span className="material-symbols-outlined text-4xl text-[#a5d391]">linked_camera</span>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Live Camera Barcode Reader</h3>
                                        <p className="text-xs text-white/50 max-w-md mt-1">Use your device camera to scan physical product barcodes (EAN-13, UPC, QR codes).</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsCameraScanning(true)}
                                        className="px-6 py-3 bg-[#a5d391]/20 hover:bg-[#a5d391] text-[#a5d391] hover:text-black border border-[#a5d391]/40 font-bold text-sm rounded-2xl transition-all shadow-lg cursor-pointer flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">videocam</span>
                                        <span>Start Camera Barcode Scan</span>
                                    </button>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-[#a5d391] uppercase tracking-wider mb-2">
                                    Or Enter Barcode Number (EAN/UPC) Manually
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40">barcode_scanner</span>
                                    <input
                                        type="text"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        placeholder="e.g. 8901030700012 or 012000800001"
                                        className="w-full bg-[#080b12]/80 border border-white/10 rounded-2xl p-4 pl-12 text-white text-sm placeholder:text-white/40 outline-none focus:border-[#a5d391]/50 transition-colors font-mono"
                                    />
                                </div>
                            </div>

                            {/* Sample Barcode Buttons */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-white/50 font-bold">Try Sample Barcodes:</span>
                                <button type="button" onClick={() => applyPresetBarcode('8901030700012')} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#a5d391]/20 hover:text-[#a5d391] border border-white/10 text-white/70 transition-all cursor-pointer font-mono">
                                    8901030700012 (Oat & Honey Bar)
                                </button>
                                <button type="button" onClick={() => applyPresetBarcode('012000800001')} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 border border-white/10 text-white/70 transition-all cursor-pointer font-mono">
                                    012000800001 (Diet Citrus Soda)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Personal Allergy Cross-Match Configurator */}
                    <div className="p-4 bg-[#080b12]/80 rounded-2xl border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-400 text-sm">shield_with_heart</span>
                                Your Active Allergy Profile Filters
                            </span>
                            {userProfileAllergies && (
                                <span className="text-[10px] text-[#a5d391] uppercase tracking-widest font-black">Synced with Profile</span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2 items-center">
                            {allergyTags.map((tag, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                    {tag}
                                    <button type="button" onClick={() => removeAllergyTag(tag)} className="hover:text-white cursor-pointer">
                                        <span className="material-symbols-outlined text-xs">close</span>
                                    </button>
                                </span>
                            ))}

                            <input
                                type="text"
                                value={customAllergies}
                                onChange={(e) => setCustomAllergies(e.target.value)}
                                onKeyDown={handleAddAllergy}
                                placeholder="+ Add allergy (Press Enter)"
                                className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-white placeholder:text-white/40 outline-none focus:border-[#a5d391]/40"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || (inputType === 'BARCODE' ? !barcode : (!previewImage && !imageUrl))}
                        className="w-full py-4 bg-[#a5d391] hover:bg-white disabled:opacity-40 text-black font-bold text-base rounded-2xl transition-all shadow-[0_0_25px_rgba(165,211,145,0.3)] cursor-pointer flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <>
                                <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                                <span>Running Gemma AI Vision & OCR Analysis...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">auto_awesome</span>
                                <span>Analyze Food & Generate Verdict</span>
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Error Banner */}
            {errorMsg && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl">error</span>
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Analysis Output Section */}
            {analysis && (
                <div className="space-y-8 animate-fadeIn">
                    {/* Verdict Banner Card */}
                    <div className={`p-6 sm:p-8 rounded-[2.5rem] border backdrop-blur-2xl shadow-2xl relative overflow-hidden transition-all ${
                        analysis.verdict === 'SAFE' 
                            ? 'bg-emerald-950/40 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)]' 
                            : analysis.verdict === 'CAUTION' 
                            ? 'bg-amber-950/40 border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)]' 
                            : 'bg-red-950/40 border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)]'
                    }`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-white/10">
                            <div>
                                <div className="text-xs uppercase tracking-widest font-black text-white/50 mb-1">
                                    {analysis.category || 'Product Analysis'} • {analysis.servingSize || 'Per Serving'}
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold font-hero-display text-white">
                                    {analysis.productName}
                                </h2>
                            </div>

                            {/* Verdict Badge */}
                            <div className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider border shadow-lg ${
                                analysis.verdict === 'SAFE' 
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20' 
                                    : analysis.verdict === 'CAUTION' 
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/20' 
                                    : 'bg-red-500/20 text-red-400 border-red-500/40 shadow-red-500/20'
                            }`}>
                                <span className="material-symbols-outlined text-2xl">
                                    {analysis.verdict === 'SAFE' ? 'verified' : analysis.verdict === 'CAUTION' ? 'warning' : 'cancel'}
                                </span>
                                <span>VERDICT: {analysis.verdict}</span>
                            </div>
                        </div>

                        {/* Plain Language Explanation */}
                        <div className="mt-6 p-4 sm:p-6 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                            <div className="text-xs font-bold uppercase tracking-wider text-[#a5d391] flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">info</span>
                                Clinical Rationale & Explanation
                            </div>
                            <p className="text-white/90 text-sm sm:text-base leading-relaxed font-body-md">
                                {analysis.verdictExplanation}
                            </p>
                        </div>
                    </div>

                    {/* Matched Allergens Alert (If Any) */}
                    {analysis.matchedAllergens && analysis.matchedAllergens.length > 0 && (
                        <div className="p-6 rounded-[2rem] bg-red-500/10 border border-red-500/30 space-y-4 shadow-xl">
                            <div className="flex items-center gap-3 text-red-400 font-bold text-lg">
                                <span className="material-symbols-outlined text-2xl">error_med</span>
                                Explicit Allergen Warning Detected ({analysis.matchedAllergens.length})
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {analysis.matchedAllergens.map((alg, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-red-950/60 border border-red-500/20 text-white space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-red-300 text-sm uppercase tracking-wider">{alg.allergen}</span>
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-500/30 text-red-200">{alg.severity} Severity</span>
                                        </div>
                                        <p className="text-xs text-white/80">{alg.reason}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Additives & Diet Suitability Matrix */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Additives Panel */}
                        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-hero-display">
                                <span className="material-symbols-outlined text-[#a5d391]">biotech</span>
                                Detected Food Additives & Preservatives
                            </h3>

                            {analysis.additives && analysis.additives.length > 0 ? (
                                <div className="space-y-3">
                                    {analysis.additives.map((add, idx) => (
                                        <div key={idx} className="p-3.5 rounded-xl bg-[#080b12]/80 border border-white/10 flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                                    <span>{add.name}</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-semibold">{add.category}</span>
                                                </div>
                                                <p className="text-xs text-white/60 mt-1">{add.description}</p>
                                            </div>
                                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                                                add.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            }`}>
                                                {add.riskLevel} Risk
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-white/50 italic p-4 rounded-xl bg-[#080b12]/60 border border-white/5">
                                    No synthetic preservatives, artificial sweeteners, or high-risk colors detected.
                                </p>
                            )}
                        </div>

                        {/* Diet Suitability Grid */}
                        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 space-y-4">
                            <h3 className="text-lg font-bold text-[#a5d391] flex items-center gap-2 font-hero-display">
                                <span className="material-symbols-outlined">checklist</span>
                                Dietary Compatibility Check
                            </h3>

                            {analysis.dietSuitability && (
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(analysis.dietSuitability).map(([diet, suitable], i) => (
                                        <div key={i} className={`p-3 rounded-xl border flex items-center justify-between ${
                                            suitable ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-white/5 border-white/10 text-white/40'
                                        }`}>
                                            <span className="text-xs font-bold">{diet}</span>
                                            <span className="material-symbols-outlined text-sm">
                                                {suitable ? 'check_circle' : 'cancel'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Nutrition Macro & Micronutrient Breakdown */}
                    {analysis.nutrition && (
                        <div className="bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-white/10 space-y-6">
                            <h3 className="text-xl font-bold text-white font-hero-display flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#a5d391]">equalizer</span>
                                Nutritional Fact Breakdown
                            </h3>

                            {/* Macro Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                <div className="p-4 rounded-2xl bg-[#080b12]/80 border border-white/10 text-center">
                                    <div className="text-[10px] font-black uppercase text-white/50">Calories</div>
                                    <div className="text-2xl font-bold text-[#a5d391] font-hero-display mt-1">{analysis.nutrition.calories}</div>
                                    <div className="text-[10px] text-white/40">kcal</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-[#080b12]/80 border border-white/10 text-center">
                                    <div className="text-[10px] font-black uppercase text-white/50">Protein</div>
                                    <div className="text-xl font-bold text-sky-400 font-hero-display mt-1">{analysis.nutrition.proteinG}g</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-[#080b12]/80 border border-white/10 text-center">
                                    <div className="text-[10px] font-black uppercase text-white/50">Carbs</div>
                                    <div className="text-xl font-bold text-amber-400 font-hero-display mt-1">{analysis.nutrition.carbsG}g</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-[#080b12]/80 border border-white/10 text-center">
                                    <div className="text-[10px] font-black uppercase text-white/50">Fat</div>
                                    <div className="text-xl font-bold text-rose-400 font-hero-display mt-1">{analysis.nutrition.fatG}g</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-[#080b12]/80 border border-white/10 text-center">
                                    <div className="text-[10px] font-black uppercase text-white/50">Fiber</div>
                                    <div className="text-xl font-bold text-emerald-400 font-hero-display mt-1">{analysis.nutrition.fiberG || 0}g</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-[#080b12]/80 border border-white/10 text-center">
                                    <div className="text-[10px] font-black uppercase text-white/50">Sugar</div>
                                    <div className={`text-xl font-bold font-hero-display mt-1 ${analysis.nutrition.sugarG > 15 ? 'text-red-400' : 'text-white'}`}>{analysis.nutrition.sugarG || 0}g</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-[#080b12]/80 border border-white/10 text-center">
                                    <div className="text-[10px] font-black uppercase text-white/50">Sodium</div>
                                    <div className={`text-xl font-bold font-hero-display mt-1 ${analysis.nutrition.sodiumMg > 500 ? 'text-red-400' : 'text-white'}`}>{analysis.nutrition.sodiumMg || 0}mg</div>
                                </div>
                            </div>

                            {/* Micronutrients */}
                            {analysis.nutrition.micronutrients && Object.keys(analysis.nutrition.micronutrients).length > 0 && (
                                <div className="p-4 rounded-2xl bg-[#080b12]/60 border border-white/5 space-y-2">
                                    <div className="text-xs font-bold text-white/60 uppercase tracking-wider">Extracted Micronutrients</div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(analysis.nutrition.micronutrients).map(([micro, val], idx) => (
                                            <span key={idx} className="px-3 py-1 rounded-full text-xs font-bold bg-[#a5d391]/10 text-[#a5d391] border border-[#a5d391]/20">
                                                {micro}: {val}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Better Alternatives Recommendation (On Caution/Avoid) */}
                    {analysis.betterAlternatives && analysis.betterAlternatives.length > 0 && (
                        <div className="bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-[#a5d391]/20 shadow-2xl space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-white font-hero-display flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#a5d391]">recommend</span>
                                        Recommended Better Alternatives
                                    </h3>
                                    <p className="text-xs text-white/60 mt-1">Healthier database alternatives matching your diet without flagged allergens.</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-black bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30 uppercase tracking-wider">
                                    Smart Switch
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {analysis.betterAlternatives.map((alt, idx) => (
                                    <div key={idx} className="p-5 rounded-2xl bg-[#080b12]/90 border border-white/10 hover:border-[#a5d391]/50 transition-all flex flex-col justify-between space-y-4 group">
                                        <div className="space-y-3">
                                            {alt.imageUrl && (
                                                <img src={alt.imageUrl} alt={alt.title} className="w-full h-40 object-cover rounded-xl border border-white/10 group-hover:scale-[1.01] transition-transform" onError={(e) => e.target.style.display = 'none'} />
                                            )}
                                            <h4 className="text-lg font-bold text-white group-hover:text-[#a5d391] transition-colors">{alt.title}</h4>
                                            <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">{alt.description}</p>
                                        </div>

                                        <div className="space-y-3 pt-3 border-t border-white/10">
                                            <div className="flex items-center justify-between text-xs text-white/60 font-bold">
                                                <span>Calories: <strong className="text-white">{alt.calories} kcal</strong></span>
                                                <span>Protein: <strong className="text-[#a5d391]">{alt.proteinG}g</strong></span>
                                            </div>
                                            <div className="p-3 rounded-xl bg-[#a5d391]/10 border border-[#a5d391]/20 text-xs text-[#a5d391] leading-relaxed">
                                                <strong>Why it's better:</strong> {alt.whyBetter}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AiImageAnalyzer;
