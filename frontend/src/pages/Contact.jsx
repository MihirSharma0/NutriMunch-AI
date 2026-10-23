import React, { useState } from 'react';
import Starfield from '../components/Starfield';
import LocationMap from './ContactSections/LocationMap';
import OfficeHours from './ContactSections/OfficeHours';
import SocialLinks from './ContactSections/SocialLinks';
import FAQLink from './ContactSections/FAQLink';
import EmergencyContact from './ContactSections/EmergencyContact';

const Contact = () => {
    const [formStatus, setFormStatus] = useState('idle'); // idle, submitting, success

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormStatus('submitting');
        setTimeout(() => setFormStatus('success'), 1500);
    };

    return (
        <div className="relative pt-32 pb-24 flex flex-col w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-16 lg:gap-24">

                    {/* Info Section */}
                    <div>
                        <div className="inline-flex items-center gap-3 mb-6">
                            <span className="w-8 h-px bg-primary"></span>
                            <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-widest">Establish Link</span>
                        </div>
                        <h1 className="font-hero-display text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-8">
                            Initialize a <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#38bdf8] italic">connection</span>.
                        </h1>
                        <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-8 sm:mb-12">
                            Whether you're a potential enterprise partner, a researcher seeking API access, or an early adopter with feedback on the protocol, our neural routing systems will direct your inquiry to the appropriate node.
                        </p>

                        <div className="space-y-8">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-primary">
                                    <span className="material-symbols-outlined">location_on</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg mb-1">Aether Headquarters</h4>
                                    <p className="text-white/60">One Biometric Plaza, Suite 404<br/>San Francisco, CA 94107</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[#38bdf8]">
                                    <span className="material-symbols-outlined">mail</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg mb-1">Direct Transmission</h4>
                                    <p className="text-white/60">node-alpha@aetherconvergence.ai</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-10 lg:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        {/* Glow effect behind form */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
                        
                        {formStatus === 'success' ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-20 relative z-10">
                                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-primary text-4xl">check</span>
                                </div>
                                <h3 className="text-3xl font-bold mb-4">Transmission Received</h3>
                                <p className="text-white/60">Our routing systems have successfully logged your message. A representative node will initiate contact shortly.</p>
                                <button 
                                    onClick={() => setFormStatus('idle')}
                                    className="mt-8 text-primary font-bold uppercase tracking-widest text-sm hover:text-white transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">refresh</span> Send Another
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-6">
                                <h3 className="text-2xl font-bold mb-2">Secure Channel</h3>
                                
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-white/40">Identifier</label>
                                    <input required type="text" className="bg-[#080b12]/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors" placeholder="Full Name" />
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-white/40">Return Vector (Email)</label>
                                    <input required type="email" className="bg-[#080b12]/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors" placeholder="name@domain.com" />
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-white/40">Data Payload</label>
                                    <textarea required rows="4" className="bg-[#080b12]/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors resize-none" placeholder="Enter your message..."></textarea>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={formStatus === 'submitting'}
                                    className="mt-4 bg-white text-black font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    {formStatus === 'submitting' ? (
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                    ) : (
                                        <>
                                            Transmit <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">send</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>

                </div>
                
                {/* Appended New Sections */}
                <div className="mt-16 sm:mt-24">
                    <LocationMap />
                    <OfficeHours />
                    <SocialLinks />
                    <FAQLink />
                    <EmergencyContact />
                </div>
            </div>
        </div>
    );
};

export default Contact;
