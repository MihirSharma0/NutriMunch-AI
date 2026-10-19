import React from 'react';
import { Line } from 'react-chartjs-2';

// Reusing ChartJS registration from ProgressTracking
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const NutritionistReports = () => {
    const data = {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
        datasets: [
            {
                label: 'Avg Cohort Adherence (%)',
                data: [72, 78, 85, 84, 88, 88],
                borderColor: '#a5d391',
                backgroundColor: 'rgba(165, 211, 145, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#080b12',
                pointBorderColor: '#a5d391',
                pointBorderWidth: 2,
                pointRadius: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(8, 11, 18, 0.9)',
                titleColor: '#fff',
                bodyColor: '#a5d391',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: 'rgba(255,255,255,0.5)' },
                min: 60,
                max: 100
            },
            x: {
                grid: { display: false },
                ticks: { color: 'rgba(255,255,255,0.5)' }
            }
        }
    };

    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold font-hero-display mb-8 tracking-tight text-white">Clinical Analytics</h1>
            
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 mb-8 shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h2 className="text-xl font-bold mb-1 font-hero-display">Roster Adherence Trends</h2>
                        <p className="text-white/50 text-sm">Aggregate protocol compliance across your 42 active users.</p>
                    </div>
                    <button className="bg-[#a5d391]/20 text-[#a5d391] px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border border-[#a5d391]/30 hover:bg-[#a5d391] hover:text-black transition-all cursor-pointer shadow-[0_0_15px_rgba(165,211,145,0.2)]">
                        Export CSV
                    </button>
                </div>
                
                <div className="h-[220px] sm:h-[260px] lg:h-[300px] w-full">
                    <Line data={data} options={options} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-xl">
                    <h3 className="font-bold mb-6 text-[#a5d391] font-hero-display text-lg">Generate Cohort Report</h3>
                    <form className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-[#a5d391] mb-2 block">User Subset</label>
                            <select className="w-full bg-[#080b12]/80 border border-white/10 px-4 py-3 rounded-xl text-sm outline-none focus:border-[#a5d391]/50 text-white transition-colors">
                                <option>All Active Users</option>
                                <option>Diabetes Management Cohort</option>
                                <option>Hypertrophy Cohort</option>
                                <option>Critical Status Users</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-[#a5d391] mb-2 block">Metrics to Include</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 cursor-pointer bg-[#080b12]/80 p-3 rounded-xl border border-white/10 hover:border-[#a5d391]/30 transition-colors">
                                    <input type="checkbox" defaultChecked className="accent-[#a5d391]" />
                                    <span className="text-xs font-bold text-white/80">Avg Adherence</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-[#080b12]/80 p-3 rounded-xl border border-white/10 hover:border-[#a5d391]/30 transition-colors">
                                    <input type="checkbox" defaultChecked className="accent-[#a5d391]" />
                                    <span className="text-xs font-bold text-white/80">Macro Shifts</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-[#080b12]/80 p-3 rounded-xl border border-white/10 hover:border-[#a5d391]/30 transition-colors">
                                    <input type="checkbox" defaultChecked className="accent-[#a5d391]" />
                                    <span className="text-xs font-bold text-white/80">CGM Spikes</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-[#080b12]/80 p-3 rounded-xl border border-white/10 hover:border-[#a5d391]/30 transition-colors">
                                    <input type="checkbox" className="accent-[#a5d391]" />
                                    <span className="text-xs font-bold text-white/80">HRV Trends</span>
                                </label>
                            </div>
                        </div>
                        <button type="button" className="w-full bg-[#a5d391] text-black font-bold py-4 rounded-2xl mt-4 hover:bg-white transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(165,211,145,0.3)] cursor-pointer">
                            <span className="material-symbols-outlined text-xl">assessment</span>
                            Compile Report
                        </button>
                    </form>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-xl">
                    <h3 className="font-bold mb-6 text-[#a5d391] font-hero-display text-lg">System Insights</h3>
                    <div className="space-y-6">
                        <div className="border-l-2 border-[#a5d391] pl-4">
                            <h4 className="font-bold text-sm mb-1 text-white">Algorithmic Efficiency</h4>
                            <p className="text-xs text-white/50 leading-relaxed">
                                The generative AI successfully managed 92% of user diet permutations this week without requiring human clinical override.
                            </p>
                        </div>
                        <div className="border-l-2 border-red-500 pl-4">
                            <h4 className="font-bold text-sm mb-1 text-white">Anomaly Detection Rate</h4>
                            <p className="text-xs text-white/50 leading-relaxed">
                                Continuous Glucose Monitors flagged 14 severe spikes across the cohort. 12 were auto-corrected by lowering carb ratios; 2 require your review.
                            </p>
                        </div>
                        <div className="border-l-2 border-[#a5d391] pl-4">
                            <h4 className="font-bold text-sm mb-1 text-white">Adherence Improvements</h4>
                            <p className="text-xs text-white/50 leading-relaxed">
                                Users assigned to the "Cognitive Boost" protocol showed a 5% increase in plan adherence compared to last month.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NutritionistReports;
