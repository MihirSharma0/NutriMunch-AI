import React from 'react';
import Starfield from '../components/Starfield';
import DetailedServices from './ServicesSections/DetailedServices';

const Services = () => {
    return (
        <div className="relative pt-32 pb-24 flex flex-col w-full overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full relative z-10">

                {/* Header */}
                <div className="text-center mb-16 sm:mb-24">
                    <div className="inline-flex items-center gap-3 mb-6">
                        <span className="w-8 h-px bg-primary"></span>
                        <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-widest">Core Capabilities</span>
                        <span className="w-8 h-px bg-primary"></span>
                    </div>
                    <h1 className="font-hero-display text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-8">
                        The Architecture of <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#a3e635] italic">Optimization</span>.
                    </h1>
                </div>

                {/* Service 1 */}
                <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 md:gap-16 mb-16 sm:mb-24 md:mb-32 group">
                    <div className="md:w-1/2 order-2 md:order-1">
                        <div className="inline-flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-[#38bdf8]">network_node</span>
                            <span className="text-[#38bdf8] font-bold tracking-widest text-sm uppercase">Service 01</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight leading-tight">Continuous Biometric Telemetry</h2>
                        <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-8">
                            Our proprietary engine securely interfaces with over 40+ wearable ecosystems. It parses your heart rate variability, sleep architecture, and blood glucose in real-time, forming a living baseline of your metabolic state.
                        </p>
                        <button className="flex items-center gap-2 text-white font-bold group-hover:text-[#38bdf8] transition-colors">
                            Explore Integration <span className="material-symbols-outlined transition-transform group-hover:translate-x-2">arrow_forward</span>
                        </button>
                    </div>
                    <div className="md:w-1/2 order-1 md:order-2 w-full">
                        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-4 relative overflow-hidden h-[260px] sm:h-[320px] md:h-[400px]">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#38bdf8]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUQW1ayK2QptnJC4qRpFZJQfK25SrdzXBlBBKDdfgFsY3fbK5Q9MBP4F2v2a6cli_nEXhYxZdynfefZ9y6wd9ardu7fb6hI4n4NzwrwE4B--Y4wqSMdeuOKZZfTXGlE55PD6O95ZslKGxZFe9jEyC5O4jQKnL_jnYppX1ixe10PJAE_5uvWDiX9c_vA5cz5JtDILmRAtwTwIPmdRfsDOx7e2W8rsEiFw4gzv8YSmBzQ-2grz1UCn8l" alt="Telemetry" className="w-full h-full object-cover rounded-[2.5rem] mix-blend-screen opacity-60 group-hover:scale-105 transition-transform duration-1000" />
                        </div>
                    </div>
                </div>

                {/* Service 2 */}
                <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 md:gap-16 mb-16 sm:mb-24 md:mb-32 group">
                    <div className="md:w-1/2 w-full">
                        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-4 relative overflow-hidden h-[260px] sm:h-[320px] md:h-[400px]">
                            <div className="absolute inset-0 bg-gradient-to-bl from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            {/* Abstract decorative element for generative cuisine */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-36 h-36 sm:w-52 sm:h-52 md:w-64 md:h-64 border border-primary/30 rounded-full animate-[spin_30s_linear_infinite] flex items-center justify-center">
                                    <div className="w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 border border-primary/20 rounded-full animate-[spin_20s_linear_infinite_reverse] flex items-center justify-center">
                                        <div className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="md:w-1/2">
                        <div className="inline-flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary">auto_awesome</span>
                            <span className="text-primary font-bold tracking-widest text-sm uppercase">Service 02</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight leading-tight">Generative Culinary Synthesis</h2>
                        <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-8">
                            Forget static meal plans. NutriMunch AI generates dynamic, chef-grade recipes based on the exact macronutrients your body requires at this exact moment, factoring in your pantry inventory and flavor profiles.
                        </p>
                        <button className="flex items-center gap-2 text-white font-bold group-hover:text-primary transition-colors">
                            View Sample Output <span className="material-symbols-outlined transition-transform group-hover:translate-x-2">arrow_forward</span>
                        </button>
                    </div>
                </div>

                {/* Service 3 */}
                <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 md:gap-16 group">
                    <div className="md:w-1/2 order-2 md:order-1">
                        <div className="inline-flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-[#a3e635]">monitoring</span>
                            <span className="text-[#a3e635] font-bold tracking-widest text-sm uppercase">Service 03</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight leading-tight">Predictive Trajectory Modeling</h2>
                        <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-8">
                            Using advanced deep learning, we don't just track your past; we simulate your future. Visualize the precise impact of dietary shifts 3, 6, and 12 months down the line with stunning accuracy.
                        </p>
                        <button className="flex items-center gap-2 text-white font-bold group-hover:text-[#a3e635] transition-colors">
                            Run Simulation <span className="material-symbols-outlined transition-transform group-hover:translate-x-2">arrow_forward</span>
                        </button>
                    </div>
                    <div className="md:w-1/2 order-1 md:order-2 w-full">
                        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-4 relative overflow-hidden h-[260px] sm:h-[320px] md:h-[400px]">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#a3e635]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuARlPSdCdeTilSSltYT8o_EWLoUdxgGM0pAxy7iNyezkvglxmJgPkLDfM6iFjppOiWOTvuZffrRBlNIZRw_fPbClMvFOLDeFwKeig8RqDPRxWVakb4ayBFsLsMMfVo4NvlFhOVebtozAg1DOtjS8rIzQTR7-xYHiOYg86AqGzQBZs5eZOeNLSuXqfBjsgoZxyR_UQ7c65Ncv2dRR9KYLlv6R4aosenNkNLMkWUg3E7hFA0KTuNBg3Sb" alt="Trajectory" className="w-full h-full object-cover rounded-[2.5rem] mix-blend-screen opacity-50 group-hover:scale-105 transition-transform duration-1000" />
                        </div>
                    </div>
                </div>

                {/* Appended New Sections */}
                <DetailedServices />
            </div>
        </div>
    );
};

export default Services;
