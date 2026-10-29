/**
 * Clinical Health Reports & Biometrics Exporter
 * Generates interactive macro/calorie/hydration compliance trends and compiles
 * exportable, print-ready clinical health report summaries.
 */
import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { AuthContext } from '../../../context/AuthContext';
import FeatureGate from '../../../components/FeatureGate';
import api from '../../../api/axios';
import DarkCalendarPicker from '../../../components/DarkCalendarPicker';
import { searchFoodDatabase } from '../../../data/foodDatabase';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const DEFAULT_TARGETS = {
    calories: 2000,
    protein: 140,
    carbs: 200,
    fats: 65,
    water: 2.5
};

const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const INTERVAL_PRESETS = [
    { id: '1D', label: '1 Day', days: 1 },
    { id: '1W', label: '1 Week', days: 7 },
    { id: '2W', label: '2 Weeks', days: 14 },
    { id: '3W', label: '3 Weeks', days: 21 },
    { id: '1M', label: '1 Month', days: 30 },
    { id: '3M', label: '3 Months', days: 90 },
    { id: '6M', label: '6 Months', days: 180 },
    { id: '1Y', label: '1 Year', days: 365 },
    { id: 'CUSTOM', label: 'Custom Date', days: 1 }
];

/**
 * Custom Year Selector supporting any year with steppers, direct number input, and styling
 */
const YearSelector = ({ value, onChange, label }) => {
    const numericYear = parseInt(value, 10) || new Date().getFullYear();
    const currentYear = new Date().getFullYear();

    return (
        <div className="flex items-center gap-1.5 bg-[#080b12] border border-white/15 focus-within:border-[#a5d391]/60 px-2.5 py-1.5 rounded-xl text-xs transition-colors">
            {label && <span className="text-[10px] text-white/40 uppercase font-bold mr-1">{label}</span>}
            <button
                type="button"
                onClick={() => onChange(String(numericYear - 1))}
                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Previous Year"
            >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <input
                type="number"
                min="1900"
                max="2100"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-16 bg-transparent text-center text-white font-mono font-bold text-xs outline-none focus:text-[#a5d391] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Year"
            />
            <button
                type="button"
                onClick={() => onChange(String(numericYear + 1))}
                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Next Year"
            >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
            {numericYear !== currentYear && (
                <button
                    type="button"
                    onClick={() => onChange(String(currentYear))}
                    className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#a5d391] hover:text-black text-white/60 font-bold transition-all cursor-pointer"
                    title={`Jump to current year (${currentYear})`}
                >
                    {currentYear}
                </button>
            )}
        </div>
    );
};

/**
 * Dynamic nice-scale tick calculator matching Chart.js automatic Y-axis bounding
 */
const calculateNiceYScale = (allValues, targetTicks = 8) => {
    const valid = allValues.map(Number).filter((v) => !isNaN(v));
    if (valid.length === 0) {
        return { minY: 0, maxY: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] };
    }

    let minVal = Math.min(...valid);
    let maxVal = Math.max(...valid);

    // If all values are identical
    if (minVal === maxVal) {
        const pad = minVal === 0 ? 10 : Math.max(5, Math.round(minVal * 0.1));
        minVal = Math.max(0, minVal - pad);
        maxVal = maxVal + pad;
    }

    const span = maxVal - minVal;
    const rawStep = Math.max(1, span / targetTicks);
    const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const fraction = rawStep / power;

    let niceMultiplier = 1;
    if (fraction <= 1.25) niceMultiplier = 1;
    else if (fraction <= 2.5) niceMultiplier = 2;
    else if (fraction <= 5.5) niceMultiplier = 5;
    else niceMultiplier = 10;

    let step = Math.round(niceMultiplier * power);
    if (step < 1) step = 1;

    let minY = Math.floor(minVal / step) * step;
    let maxY = Math.ceil(maxVal / step) * step;

    // If minVal is within 1.5 steps of 0, start at 0
    if (minVal >= 0 && minVal < step * 1.5) {
        minY = 0;
    }

    // Ensure ceiling gives room for max peak if maxVal lands exactly on maxY
    if (maxY === maxVal) {
        maxY += step;
    }

    if (minY < 0 && minVal >= 0) {
        minY = 0;
    }

    const ticks = [];
    const count = Math.min(25, Math.round((maxY - minY) / step));
    for (let i = 0; i <= count; i++) {
        ticks.push(Math.round(minY + i * step));
    }

    return { minY, maxY, step, ticks };
};

/**
 * Generates smooth cubic Bezier spline path ('C' commands) with tension matching Chart.js (0.35)
 */
const getSmoothCurvePath = (pts, tension = 0.35) => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    if (pts.length === 2) {
        return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
    }

    let path = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

        const cp1x = p1.x + ((p2.x - p0.x) * tension) / 2;
        const cp1y = p1.y + ((p2.y - p0.y) * tension) / 2;
        const cp2x = p2.x - ((p3.x - p1.x) * tension) / 2;
        const cp2y = p2.y - ((p3.y - p1.y) * tension) / 2;

        path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return path;
};

/**
 * Generates smooth cubic Bezier filled area path closing to bottom baseline
 */
const getSmoothAreaPath = (pts, baselineY, tension = 0.35) => {
    if (!pts || pts.length === 0) return '';
    const firstX = pts[0].x.toFixed(1);
    const lastX = pts[pts.length - 1].x.toFixed(1);
    const curve = getSmoothCurvePath(pts, tension);
    const curveCommands = curve.replace(/^M\s*[\d.]+,[\d.]+/, '');
    return `M ${firstX},${baselineY} L ${firstX},${pts[0].y.toFixed(1)} ${curveCommands} L ${lastX},${baselineY} Z`;
};

/**
 * Render crisp, vector SVG line charts for printing in PDF reports
 * Matches the website Chart.js visual depth, tension, dynamic intervals, and dark telemetry aesthetic
 */
const generateSvgLineChart = ({
    title,
    unit,
    actualLabel = 'Consumed Water',
    targetLabel = 'Water Target',
    labels,
    actualData,
    targetData,
    actualColor = '#38bdf8',
    targetColor = '#a5d391'
}) => {
    const width = 680;
    const height = 210;
    const padLeft = 55;
    const padRight = 20;
    const padTop = 22;
    const padBottom = 32;

    const allValues = [
        ...actualData.map((v) => Number(v) || 0),
        ...targetData.map((v) => Number(v) || 0)
    ];

    const { minY, maxY, ticks } = calculateNiceYScale(allValues, 8);

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const yRange = maxY - minY || 1;

    const getX = (idx) => padLeft + (labels.length > 1 ? (idx / (labels.length - 1)) * plotW : plotW / 2);
    const getY = (val) => padTop + plotH - ((Number(val) - minY) / yRange) * plotH;
    const baselineY = (padTop + plotH).toFixed(1);

    // Subtle horizontal gridlines matching website Chart.js dark theme
    const gridLines = ticks.map((val) => {
        const y = getY(val);
        return `
            <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" stroke-dasharray="2,3" />
            <text x="${padLeft - 10}" y="${y + 3.5}" font-size="9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="#94a3b8" text-anchor="end">${val.toLocaleString()}</text>
        `;
    });

    // Points with coordinates
    const actualPoints = actualData.map((val, idx) => ({ x: getX(idx), y: getY(val) }));
    const pathD = getSmoothCurvePath(actualPoints, 0.35);
    const areaD = getSmoothAreaPath(actualPoints, baselineY, 0.35);

    // Target line (dashed, tension: 0)
    const targetPoints = targetData.map((val, idx) => ({ x: getX(idx), y: getY(val) }));
    const targetD = targetPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    // X Labels
    const labelStep = Math.max(1, Math.ceil(labels.length / 10));
    const xLabels = labels.map((lbl, idx) => {
        if (idx % labelStep !== 0 && idx !== labels.length - 1) return '';
        const x = getX(idx);
        return `<text x="${x.toFixed(1)}" y="${height - 10}" font-size="9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="#94a3b8" text-anchor="middle">${lbl}</text>`;
    }).join('');

    // Dots matching website Chart.js pointBackgroundColor & pointBorderColor
    const dots = actualPoints.map((p) => {
        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#080b12" stroke="${actualColor}" stroke-width="2" />`;
    }).join('');

    const gradId = `grad_${actualColor.replace(/[^a-zA-Z0-9]/g, '')}_${Math.random().toString(36).substring(2, 7)}`;

    return `
        <div class="chart-card" style="background: #080b12; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; padding: 14px 18px; margin-bottom: 18px; page-break-inside: avoid; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35); -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 8px;">
                <div style="font-weight: 700; font-size: 11pt; color: #ffffff; display: flex; align-items: center; gap: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${actualColor}; box-shadow: 0 0 8px ${actualColor};"></span>
                    ${title}
                </div>
                <div style="font-size: 8.5pt; color: #e2e8f0; display: flex; align-items: center; gap: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 16px; height: 9px; border: 2px solid ${actualColor}; background: ${actualColor}25; border-radius: 2px;"></span>
                        <span style="font-weight: 600; color: #f8fafc;">${actualLabel} (${unit})</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 16px; height: 0px; border-top: 2px dashed ${targetColor};"></span>
                        <span style="font-weight: 600; color: #f8fafc;">${targetLabel} (${unit})</span>
                    </div>
                </div>
            </div>
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible; display: block;">
                <defs>
                    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${actualColor}" stop-opacity="0.32"/>
                        <stop offset="60%" stop-color="${actualColor}" stop-opacity="0.10"/>
                        <stop offset="100%" stop-color="${actualColor}" stop-opacity="0.0"/>
                    </linearGradient>
                </defs>
                ${gridLines.join('')}
                ${areaD ? `<path d="${areaD}" fill="url(#${gradId})" />` : ''}
                ${targetD ? `<path d="${targetD}" fill="none" stroke="${targetColor}" stroke-width="2" stroke-dasharray="5,5" />` : ''}
                ${pathD ? `<path d="${pathD}" fill="none" stroke="${actualColor}" stroke-width="2.5" />` : ''}
                ${dots}
                ${xLabels}
            </svg>
        </div>
    `;
};

/**
 * Render grouped bar chart SVG for printing in PDF reports
 * Matches the website Chart.js theme, palette, and proportions
 */
const generateSvgBarChart = ({ title, labels, proteinData, carbsData, fatsData }) => {
    const width = 680;
    const height = 210;
    const padLeft = 50;
    const padRight = 20;
    const padTop = 22;
    const padBottom = 32;

    const maxVal = Math.max(
        ...proteinData.map((v) => Number(v) || 0),
        ...carbsData.map((v) => Number(v) || 0),
        ...fatsData.map((v) => Number(v) || 0),
        10
    );

    // Compute nice scale starting at 0 for bar chart
    const rawStep = Math.max(5, (maxVal * 1.15) / 5);
    const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const fraction = rawStep / power;
    let niceMultiplier = 1;
    if (fraction <= 1.25) niceMultiplier = 1;
    else if (fraction <= 2.5) niceMultiplier = 2;
    else if (fraction <= 5.5) niceMultiplier = 5;
    else niceMultiplier = 10;
    const step = Math.round(niceMultiplier * power) || 5;
    const maxY = Math.ceil((maxVal * 1.12) / step) * step;

    const ticks = [];
    for (let t = 0; t <= maxY; t += step) {
        ticks.push(t);
    }

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const groupW = plotW / Math.max(labels.length, 1);
    const barW = Math.max(2.5, Math.min(12, (groupW - 6) / 3));

    const gridLines = ticks.map((val) => {
        const y = padTop + plotH - (val / (maxY || 1)) * plotH;
        return `
            <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" stroke-dasharray="2,3" />
            <text x="${padLeft - 8}" y="${y + 3.5}" font-size="9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="#94a3b8" text-anchor="end">${val}g</text>
        `;
    });

    let barsSvg = '';
    const labelStep = Math.max(1, Math.ceil(labels.length / 12));

    labels.forEach((lbl, idx) => {
        const groupCenterX = padLeft + idx * groupW + groupW / 2;
        const pVal = Number(proteinData[idx]) || 0;
        const cVal = Number(carbsData[idx]) || 0;
        const fVal = Number(fatsData[idx]) || 0;

        const pH = Math.max(1, (pVal / (maxY || 1)) * plotH);
        const cH = Math.max(1, (cVal / (maxY || 1)) * plotH);
        const fH = Math.max(1, (fVal / (maxY || 1)) * plotH);

        const pX = groupCenterX - barW * 1.5;
        const cX = groupCenterX - barW * 0.5;
        const fX = groupCenterX + barW * 0.5;

        const pY = padTop + plotH - pH;
        const cY = padTop + plotH - cH;
        const fY = padTop + plotH - fH;

        barsSvg += `
            <rect x="${pX}" y="${pY}" width="${barW - 0.5}" height="${pH}" fill="#a5d391" rx="2" />
            <rect x="${cX}" y="${cY}" width="${barW - 0.5}" height="${cH}" fill="#38bdf8" rx="2" />
            <rect x="${fX}" y="${fY}" width="${barW - 0.5}" height="${fH}" fill="#facc15" rx="2" />
        `;

        if (idx % labelStep === 0 || idx === labels.length - 1) {
            barsSvg += `<text x="${groupCenterX}" y="${height - 10}" font-size="9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="#94a3b8" text-anchor="middle">${lbl}</text>`;
        }
    });

    return `
        <div class="chart-card" style="background: #080b12; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; padding: 14px 18px; margin-bottom: 18px; page-break-inside: avoid; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35); -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 8px;">
                <div style="font-weight: 700; font-size: 11pt; color: #ffffff; display: flex; align-items: center; gap: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: #a5d391;"></span>
                    ${title}
                </div>
                <div style="font-size: 8.5pt; color: #e2e8f0; display: flex; align-items: center; gap: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 10px; height: 10px; background: #a5d391; border-radius: 2px;"></span>
                        <span style="font-weight: 600; color: #f8fafc;">Protein (g)</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 10px; height: 10px; background: #38bdf8; border-radius: 2px;"></span>
                        <span style="font-weight: 600; color: #f8fafc;">Carbs (g)</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 10px; height: 10px; background: #facc15; border-radius: 2px;"></span>
                        <span style="font-weight: 600; color: #f8fafc;">Fats (g)</span>
                    </div>
                </div>
            </div>
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible; display: block;">
                ${gridLines.join('')}
                ${barsSvg}
            </svg>
        </div>
    `;
};

/**
 * Reports Component
 * Analytical health reporting dashboard with preset timeframes and printable document export.
 */
const Reports = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Current date string
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    // Active Aggregated View Mode: 'today' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    const [viewMode, setViewMode] = useState('today');

    // Statement Pickers State (Account Statement Style)
    const [selectedDayDate, setSelectedDayDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedWeekDate, setSelectedWeekDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedMonthStr, setSelectedMonthStr] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedQuarter, setSelectedQuarter] = useState(() => {
        const m = new Date().getMonth();
        return m < 3 ? 'Q1' : (m < 6 ? 'Q2' : (m < 9 ? 'Q3' : 'Q4'));
    });
    const [selectedQuarterYear, setSelectedQuarterYear] = useState(() => new Date().getFullYear().toString());
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());

    // Interactive chart viewing interval state (independent of statement export)
    const [selectedInterval, setSelectedInterval] = useState('STATEMENT');
    const [customSingleDate, setCustomSingleDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    });

    // Daily Nutrition Logging Modal State (Strictly single-day resolution)
    const [isLogNutritionModalOpen, setIsLogNutritionModalOpen] = useState(false);
    const [logNutritionTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [nutritionLogVersion, setNutritionLogVersion] = useState(0);

    // Daily Water Logging Modal State (Strictly single-day resolution)
    const [isLogWaterModalOpen, setIsLogWaterModalOpen] = useState(false);
    const [logWaterTargetDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Date Range Formatting Helpers (Clicked date is strictly the starting date of the 7-day week)
    const getWeekRange = (dateStr) => {
        const baseStr = dateStr || todayStr;
        const parts = baseStr.split('-').map(Number);
        const start = new Date(parts[0], parts[1] - 1, parts[2]);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const pad = (n) => String(n).padStart(2, '0');
        const startIso = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
        const endIso = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
        return {
            startDate: startIso,
            endDate: endIso,
            formatted: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
            shortLabel: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        };
    };

    const yesterdayStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }, []);

    const currentWeekStart = useMemo(() => todayStr, [todayStr]);
    const lastWeekStart = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }, []);

    const isSelectedThisWeek = useMemo(() => {
        return selectedWeekDate === currentWeekStart;
    }, [selectedWeekDate, currentWeekStart]);

    const isSelectedLastWeek = useMemo(() => {
        return selectedWeekDate === lastWeekStart;
    }, [selectedWeekDate, lastWeekStart]);

    const currentMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);
    const lastMonthStr = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    const isSelectedThisMonth = selectedMonthStr === currentMonthStr;
    const isSelectedLastMonth = selectedMonthStr === lastMonthStr;

    const getMonthLabel = (monthStr) => {
        if (!monthStr) return 'This Month';
        const [year, month] = monthStr.split('-');
        const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const getQuarterLabel = (quarter, year) => {
        const map = {
            Q1: 'Jan 1 – Mar 31',
            Q2: 'Apr 1 – Jun 30',
            Q3: 'Jul 1 – Sep 30',
            Q4: 'Oct 1 – Dec 31'
        };
        return `${quarter} ${year} (${map[quarter] || 'Full Quarter'})`;
    };

    // Graph Display Metric: 'hydration' | 'nutrition' | 'macros'
    const [activeGraphMetric, setActiveGraphMetric] = useState('hydration');

    // Targets State
    const [targets, setTargets] = useState(DEFAULT_TARGETS);
    const [userProfile, setUserProfile] = useState(null);
    const targetWaterMl = Math.round(targets.water * 1000);
    const targetCalories = targets.calories;
    const targetProtein = targets.protein;
    const targetCarbs = targets.carbs;
    const targetFats = targets.fats;

    // Backend Progress Logs State (for historical synchronization)
    const [backendProgressLogs, setBackendProgressLogs] = useState({});

    // Today's Live Hydration State (100% Real, defaults to 0 if not logged)
    const [waterConsumedMl, setWaterConsumedMl] = useState(() => {
        const today = new Date().toISOString().split('T')[0];
        const saved = localStorage.getItem(`nutrimunch_water_consumed_${today}`) || localStorage.getItem('nutrimunch_water_consumed');
        return saved ? parseInt(saved, 10) : 0;
    });

    // Today's Live Food Intake State (100% Real, defaults to 0 if not logged)
    const [todayNutrition, setTodayNutrition] = useState(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        try {
            const saved = localStorage.getItem(`nutrimunch_logged_foods_${todayStr}`);
            if (saved) {
                const foods = JSON.parse(saved);
                return foods.reduce((acc, f) => ({
                    calories: acc.calories + (f.calories || 0),
                    protein: acc.protein + (f.protein || 0),
                    carbs: acc.carbs + (f.carbs || 0),
                    fats: acc.fats + (f.fats || 0)
                }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
            }
        } catch (e) {}
        return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    });

    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [downloadSuccessToast, setDownloadSuccessToast] = useState(null);

    // Load targets, user profile, and real progress logs from backend
    useEffect(() => {
        api.get('/profiles/me').then(res => {
            if (res.data) {
                setUserProfile(res.data);
                const loaded = {
                    calories: res.data.dailyCaloriesTarget || DEFAULT_TARGETS.calories,
                    protein: res.data.proteinTarget || DEFAULT_TARGETS.protein,
                    carbs: res.data.carbsTarget || DEFAULT_TARGETS.carbs,
                    fats: res.data.fatsTarget || DEFAULT_TARGETS.fats,
                    water: parseFloat(res.data.dailyWaterTargetLiters) || DEFAULT_TARGETS.water
                };
                setTargets(loaded);
            }
        }).catch(() => {
            const savedLiters = localStorage.getItem('nutrimunch_water_target_liters');
            if (savedLiters) {
                setTargets(prev => ({ ...prev, water: parseFloat(savedLiters) || 2.5 }));
            }
        });

        // Sync with backend progress logs
        api.get('/progress/me').then(res => {
            if (Array.isArray(res.data)) {
                const map = {};
                res.data.forEach(item => {
                    if (item.logDate) {
                        map[item.logDate] = item;
                    }
                });
                setBackendProgressLogs(map);
            }
        }).catch(() => {});
    }, []);

    // Refresh live metrics on storage or local events
    useEffect(() => {
        const refreshMetrics = () => {
            const todayStr = new Date().toISOString().split('T')[0];
            const savedWater = localStorage.getItem(`nutrimunch_water_consumed_${todayStr}`) || localStorage.getItem('nutrimunch_water_consumed');
            setWaterConsumedMl(savedWater ? parseInt(savedWater, 10) : 0);

            try {
                const savedFoods = localStorage.getItem(`nutrimunch_logged_foods_${todayStr}`);
                if (savedFoods) {
                    const foods = JSON.parse(savedFoods);
                    const totals = foods.reduce((acc, f) => ({
                        calories: acc.calories + (f.calories || 0),
                        protein: acc.protein + (f.protein || 0),
                        carbs: acc.carbs + (f.carbs || 0),
                        fats: acc.fats + (f.fats || 0)
                    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
                    setTodayNutrition(totals);
                } else {
                    setTodayNutrition({ calories: 0, protein: 0, carbs: 0, fats: 0 });
                }
            } catch (e) {
                setTodayNutrition({ calories: 0, protein: 0, carbs: 0, fats: 0 });
            }
        };

        window.addEventListener('storage', refreshMetrics);
        window.addEventListener('nutrimunch_profile_updated', refreshMetrics);
        return () => {
            window.removeEventListener('storage', refreshMetrics);
            window.removeEventListener('nutrimunch_profile_updated', refreshMetrics);
        };
    }, []);

    // Helper: Retrieve real tracked data for any specific date string (YYYY-MM-DD)
    const getRealDayMetrics = useCallback((dateStr) => {
        let cals = 0;
        let prot = 0;
        let carbs = 0;
        let fats = 0;
        let hasFood = false;

        try {
            const saved = localStorage.getItem(`nutrimunch_logged_foods_${dateStr}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    parsed.forEach(f => {
                        cals += Number(f.calories) || 0;
                        prot += Number(f.protein) || 0;
                        carbs += Number(f.carbs) || 0;
                        fats += Number(f.fats) || 0;
                    });
                    hasFood = true;
                }
            }
        } catch (e) {}

        // Fallback to backend progress log if food wasn't found in localStorage
        if (!hasFood && backendProgressLogs[dateStr]) {
            const p = backendProgressLogs[dateStr];
            if (p.caloriesConsumed && p.caloriesConsumed > 0) {
                cals = p.caloriesConsumed;
                hasFood = true;
                prot = Math.round((cals * 0.25) / 4);
                carbs = Math.round((cals * 0.50) / 4);
                fats = Math.round((cals * 0.25) / 9);
            }
        }

        let waterMl = 0;
        let hasWater = false;
        try {
            const savedWater = localStorage.getItem(`nutrimunch_water_consumed_${dateStr}`);
            if (savedWater !== null && savedWater !== undefined && savedWater !== '') {
                waterMl = parseInt(savedWater, 10) || 0;
                hasWater = true;
            } else if (dateStr === todayStr) {
                const todaySaved = localStorage.getItem('nutrimunch_water_consumed');
                if (todaySaved !== null && todaySaved !== undefined && todaySaved !== '') {
                    waterMl = parseInt(todaySaved, 10) || 0;
                    hasWater = true;
                }
            }
        } catch (e) {}

        return {
            calories: Math.round(cals),
            protein: Math.round(prot),
            carbs: Math.round(carbs),
            fats: Math.round(fats),
            waterMl: Math.round(waterMl),
            hasLog: hasFood || hasWater,
            hasFood,
            hasWater
        };
    }, [backendProgressLogs, todayStr]);

    if (!user) {
        return <FeatureGate />;
    }

    // Active evaluated metrics according to statement mode (100% Real Synchronized Data)
    const activeStatementData = useMemo(() => {
        const weekRange = getWeekRange(selectedWeekDate);
        const monthLabel = getMonthLabel(selectedMonthStr);
        const quarterLabel = getQuarterLabel(selectedQuarter, selectedQuarterYear);

        if (viewMode === 'today') {
            const realToday = getRealDayMetrics(todayStr);
            const wConsumed = waterConsumedMl || realToday.waterMl;
            const cConsumed = todayNutrition.calories || realToday.calories;
            const pConsumed = todayNutrition.protein || realToday.protein;
            const cbConsumed = todayNutrition.carbs || realToday.carbs;
            const fConsumed = todayNutrition.fats || realToday.fats;

            const wDeficit = Math.max(targetWaterMl - wConsumed, 0);
            const wPct = targetWaterMl > 0 ? Math.min(Math.round((wConsumed / targetWaterMl) * 100), 100) : 0;
            const cPct = targetCalories > 0 ? Math.min(Math.round((cConsumed / targetCalories) * 100), 100) : 0;
            const cRemaining = Math.max(targetCalories - cConsumed, 0);
            const wLit = (wConsumed / 1000).toFixed(2);

            return {
                mode: 'today',
                scopeName: "Today's Live Clinical Statement",
                dateLabel: `Today, ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`,
                shortDate: 'Today',
                daysCount: 1,
                isLive: true,
                waterConsumed: wConsumed,
                waterTarget: targetWaterMl,
                cumulativeWaterConsumed: wLit,
                cumulativeWaterTarget: targets.water,
                waterPercent: wPct,
                waterDeficit: wDeficit,
                calories: cConsumed,
                calorieTarget: targetCalories,
                cumulativeCalories: cConsumed,
                cumulativeCalorieTarget: targetCalories,
                caloriePercent: cPct,
                calorieRemaining: cRemaining,
                protein: pConsumed,
                cumulativeProtein: pConsumed,
                proteinPercent: targetProtein > 0 ? Math.min(Math.round((pConsumed / targetProtein) * 100), 100) : 0,
                carbs: cbConsumed,
                cumulativeCarbs: cbConsumed,
                carbsPercent: targetCarbs > 0 ? Math.min(Math.round((cbConsumed / targetCarbs) * 100), 100) : 0,
                fats: fConsumed,
                cumulativeFats: fConsumed,
                fatsPercent: targetFats > 0 ? Math.min(Math.round((fConsumed / targetFats) * 100), 100) : 0,
                totalWaterLiters: wLit,
                avgWaterLiters: wLit,
                totalCalories: cConsumed.toLocaleString(),
                avgCalories: cConsumed,
                adherenceRate: `${wPct}%`,
                hydrationAdherence: `${wPct}%`,
                nutritionScore: `${cPct}%`,
                nutritionAdherence: `${cPct}%`,
                avgProtein: pConsumed,
                avgCarbs: cbConsumed,
                avgFats: fConsumed,
                title: "Today's Performance & Intake Audit",
                subtitle: "Real-time 24-hour log and live nutritional breakdown",
                loggedVisits: (wConsumed > 0 || cConsumed > 0) ? 'Active Today (1 Logged Day)' : '0 Logged Days (No entries recorded today)',
                demographicSummary: {
                    status: wPct >= 100 && cPct >= 90 ? 'Target Met (Optimal)' : ((wConsumed > 0 || cConsumed > 0) ? 'In Progress (Active Monitoring)' : 'No Intake Logged Today'),
                    keyTakeaway: (wConsumed > 0 || cConsumed > 0) ? 'Live 24-hour intake telemetry actively synchronized with your clinical metabolic targets.' : 'No intake has been logged for today yet. Use the log buttons above to record your nutrition and water.',
                    hydrationVerdict: `Consumed ${wLit} L of ${targets.water} L daily target (${wPct}% completed, ${wDeficit > 0 ? `${wDeficit} ml remaining` : 'Optimal hydration met'}).`,
                    calorieVerdict: `Logged ${cConsumed} kcal of ${targetCalories} kcal daily target (${cPct}% met, ${cRemaining > 0 ? `${cRemaining} kcal remaining` : 'Target energy reached'}).`,
                    macroVerdict: `Macronutrients: Protein ${pConsumed}g/${targetProtein}g, Carbs ${cbConsumed}g/${targetCarbs}g, Fats ${fConsumed}g/${targetFats}g.`
                }
            };
        }

        if (viewMode === 'daily') {
            const isToday = selectedDayDate === todayStr;
            const dayMetrics = getRealDayMetrics(selectedDayDate);
            const dayWater = isToday && waterConsumedMl > 0 ? waterConsumedMl : dayMetrics.waterMl;
            const dayNutr = isToday && todayNutrition.calories > 0 ? todayNutrition : dayMetrics;

            const dWaterPct = targetWaterMl > 0 ? Math.min(Math.round((dayWater / targetWaterMl) * 100), 100) : 0;
            const dCalPct = targetCalories > 0 ? Math.min(Math.round((dayNutr.calories / targetCalories) * 100), 100) : 0;
            const dDateFormatted = new Date(selectedDayDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const dLit = (dayWater / 1000).toFixed(2);

            return {
                mode: 'daily',
                scopeName: `Daily Statement (${dDateFormatted})`,
                dateLabel: dDateFormatted,
                shortDate: selectedDayDate,
                daysCount: 1,
                isLive: isToday,
                waterConsumed: dayWater,
                waterTarget: targetWaterMl,
                cumulativeWaterConsumed: dLit,
                cumulativeWaterTarget: targets.water,
                waterPercent: dWaterPct,
                waterDeficit: Math.max(targetWaterMl - dayWater, 0),
                calories: dayNutr.calories,
                calorieTarget: targetCalories,
                cumulativeCalories: dayNutr.calories,
                cumulativeCalorieTarget: targetCalories,
                caloriePercent: dCalPct,
                calorieRemaining: Math.max(targetCalories - dayNutr.calories, 0),
                protein: dayNutr.protein,
                cumulativeProtein: dayNutr.protein,
                proteinPercent: targetProtein > 0 ? Math.min(Math.round((dayNutr.protein / targetProtein) * 100), 100) : 0,
                carbs: dayNutr.carbs,
                cumulativeCarbs: dayNutr.carbs,
                carbsPercent: targetCarbs > 0 ? Math.min(Math.round((dayNutr.carbs / targetCarbs) * 100), 100) : 0,
                fats: dayNutr.fats,
                cumulativeFats: dayNutr.fats,
                fatsPercent: targetFats > 0 ? Math.min(Math.round((dayNutr.fats / targetFats) * 100), 100) : 0,
                totalWaterLiters: dLit,
                avgWaterLiters: dLit,
                totalCalories: dayNutr.calories.toLocaleString(),
                avgCalories: dayNutr.calories,
                adherenceRate: `${dWaterPct}%`,
                hydrationAdherence: `${dWaterPct}%`,
                nutritionScore: `${dCalPct}%`,
                nutritionAdherence: `${dCalPct}%`,
                avgProtein: dayNutr.protein,
                avgCarbs: dayNutr.carbs,
                avgFats: dayNutr.fats,
                title: `Daily Clinical Statement (${dDateFormatted})`,
                subtitle: "Single-day verified intake and biometric audit",
                loggedVisits: (dayNutr.calories > 0 || dayWater > 0) ? (isToday ? 'Active Today' : '1 Logged Day') : '0 Logged Days (No entries recorded)',
                demographicSummary: {
                    status: dWaterPct >= 100 && dCalPct >= 90 ? 'Target Met (Optimal)' : ((dayNutr.calories > 0 || dayWater > 0) ? 'Daily Statement Verified' : 'No Data Logged for This Day'),
                    keyTakeaway: (dayNutr.calories > 0 || dayWater > 0) ? `Verified single-day intake and clinical biometric compliance for ${dDateFormatted}.` : `No intake data recorded for ${dDateFormatted}.`,
                    hydrationVerdict: `Consumed ${dLit} L of ${targets.water} L daily target (${dWaterPct}% completed).`,
                    calorieVerdict: `Caloric energy: ${dayNutr.calories} kcal of ${targetCalories} kcal target (${dCalPct}% met).`,
                    macroVerdict: `Protein ${dayNutr.protein}g/${targetProtein}g, Carbs ${dayNutr.carbs}g/${targetCarbs}g, Fats ${dayNutr.fats}g/${targetFats}g.`
                }
            };
        }

        if (viewMode === 'weekly') {
            const [y, m, dNum] = weekRange.startDate.split('-').map(Number);
            const startD = new Date(y, m - 1, dNum);
            const pad = (n) => String(n).padStart(2, '0');
            let totW = 0, totCal = 0, totProt = 0, totCarb = 0, totFat = 0, loggedDays = 0;
            for (let i = 0; i < 7; i++) {
                const cur = new Date(startD);
                cur.setDate(cur.getDate() + i);
                const dStr = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
                const m = getRealDayMetrics(dStr);
                totW += m.waterMl;
                totCal += m.calories;
                totProt += m.protein;
                totCarb += m.carbs;
                totFat += m.fats;
                if (m.hasLog) loggedDays++;
            }

            const totTargetW = Math.round(targets.water * 7 * 10) / 10;
            const totWLiter = (totW / 1000).toFixed(2);
            const avgWLiter = (totW / 7 / 1000).toFixed(2);
            const totTargetCal = targetCalories * 7;
            const avgCal = Math.round(totCal / 7);
            const avgProt = Math.round(totProt / 7);
            const avgCarb = Math.round(totCarb / 7);
            const avgFat = Math.round(totFat / 7);
            const wPct = totTargetW > 0 ? Math.min(Math.round(((totW / 1000) / totTargetW) * 100), 100) : 0;
            const cPct = totTargetCal > 0 ? Math.min(Math.round((totCal / totTargetCal) * 100), 100) : 0;
            const pPct = (targetProtein * 7) > 0 ? Math.min(Math.round((totProt / (targetProtein * 7)) * 100), 100) : 0;
            const carbPct = (targetCarbs * 7) > 0 ? Math.min(Math.round((totCarb / (targetCarbs * 7)) * 100), 100) : 0;
            const fatPct = (targetFats * 7) > 0 ? Math.min(Math.round((totFat / (targetFats * 7)) * 100), 100) : 0;

            return {
                mode: 'weekly',
                scopeName: `Weekly Statement (${weekRange.formatted})`,
                dateLabel: weekRange.formatted,
                shortDate: weekRange.shortLabel,
                daysCount: 7,
                isLive: false,
                waterConsumed: Math.round(totW / 7),
                waterTarget: targetWaterMl,
                cumulativeWaterConsumed: totWLiter,
                cumulativeWaterTarget: totTargetW,
                waterPercent: wPct,
                waterDeficit: Math.max(Math.round(totTargetW * 1000) - totW, 0),
                calories: avgCal,
                calorieTarget: targetCalories,
                cumulativeCalories: totCal,
                cumulativeCalorieTarget: totTargetCal,
                caloriePercent: cPct,
                calorieRemaining: Math.max(totTargetCal - totCal, 0),
                protein: avgProt,
                cumulativeProtein: totProt,
                proteinPercent: pPct,
                carbs: avgCarb,
                cumulativeCarbs: totCarb,
                carbsPercent: carbPct,
                fats: avgFat,
                cumulativeFats: totFat,
                fatsPercent: fatPct,
                totalWaterLiters: totWLiter,
                avgWaterLiters: avgWLiter,
                totalCalories: totCal.toLocaleString(),
                avgCalories: avgCal,
                adherenceRate: `${wPct}%`,
                hydrationAdherence: `${wPct}%`,
                nutritionScore: `${cPct}%`,
                nutritionAdherence: `${cPct}%`,
                avgProtein: avgProt,
                avgCarbs: avgCarb,
                avgFats: avgFat,
                title: `Weekly Clinical Statement (${weekRange.formatted})`,
                subtitle: 'Aggregated 7-day rolling nutritional adherence & fluid audit',
                loggedVisits: `${loggedDays} / 7 Days Tracked`,
                demographicSummary: {
                    status: loggedDays > 0 ? `Compliance ${cPct}% (${loggedDays}/7 Days Logged)` : 'No Logs for this Week',
                    keyTakeaway: `This 7-day weekly statement captures your aggregated fluid and nutritional demographics for ${weekRange.formatted}.`,
                    hydrationVerdict: `You consumed ${totWLiter} L out of your ${totTargetW} L weekly target (${wPct}% compliance), maintaining a daily average of ${Math.round(totW / 7)} ml/day against your ${targetWaterMl} ml/day target.`,
                    calorieVerdict: `Total weekly energy reached ${totCal.toLocaleString()} kcal out of ${totTargetCal.toLocaleString()} kcal cumulative target, averaging ${avgCal} kcal/day.`,
                    macroVerdict: `Macronutrient delivery: Protein ${totProt}g total (${avgProt}g/day, ${pPct}%), Carbs ${totCarb}g total (${avgCarb}g/day, ${carbPct}%), Fats ${totFat}g total (${avgFat}g/day, ${fatPct}%).`
                }
            };
        }

        if (viewMode === 'monthly') {
            const [yStr, mStr] = selectedMonthStr.split('-');
            const y = parseInt(yStr, 10) || new Date().getFullYear();
            const m = parseInt(mStr, 10) || (new Date().getMonth() + 1);
            const daysInMonth = new Date(y, m, 0).getDate();

            let totW = 0, totCal = 0, totProt = 0, totCarb = 0, totFat = 0, loggedDays = 0;
            for (let day = 1; day <= daysInMonth; day++) {
                const dStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const metrics = getRealDayMetrics(dStr);
                totW += metrics.waterMl;
                totCal += metrics.calories;
                totProt += metrics.protein;
                totCarb += metrics.carbs;
                totFat += metrics.fats;
                if (metrics.hasLog) loggedDays++;
            }

            const totTargetW = Math.round(targets.water * daysInMonth * 10) / 10;
            const totWLiter = (totW / 1000).toFixed(2);
            const avgWLiter = (totW / daysInMonth / 1000).toFixed(2);
            const totTargetCal = targetCalories * daysInMonth;
            const avgCal = Math.round(totCal / daysInMonth);
            const avgProt = Math.round(totProt / daysInMonth);
            const avgCarb = Math.round(totCarb / daysInMonth);
            const avgFat = Math.round(totFat / daysInMonth);
            const wPct = totTargetW > 0 ? Math.min(Math.round(((totW / 1000) / totTargetW) * 100), 100) : 0;
            const cPct = totTargetCal > 0 ? Math.min(Math.round((totCal / totTargetCal) * 100), 100) : 0;
            const pPct = (targetProtein * daysInMonth) > 0 ? Math.min(Math.round((totProt / (targetProtein * daysInMonth)) * 100), 100) : 0;
            const carbPct = (targetCarbs * daysInMonth) > 0 ? Math.min(Math.round((totCarb / (targetCarbs * daysInMonth)) * 100), 100) : 0;
            const fatPct = (targetFats * daysInMonth) > 0 ? Math.min(Math.round((totFat / (targetFats * daysInMonth)) * 100), 100) : 0;

            return {
                mode: 'monthly',
                scopeName: `Monthly Statement (${monthLabel})`,
                dateLabel: monthLabel,
                shortDate: selectedMonthStr,
                daysCount: daysInMonth,
                isLive: false,
                waterConsumed: Math.round(totW / daysInMonth),
                waterTarget: targetWaterMl,
                cumulativeWaterConsumed: totWLiter,
                cumulativeWaterTarget: totTargetW,
                waterPercent: wPct,
                waterDeficit: Math.max(Math.round(totTargetW * 1000) - totW, 0),
                calories: avgCal,
                calorieTarget: targetCalories,
                cumulativeCalories: totCal,
                cumulativeCalorieTarget: totTargetCal,
                caloriePercent: cPct,
                calorieRemaining: Math.max(totTargetCal - totCal, 0),
                protein: avgProt,
                cumulativeProtein: totProt,
                proteinPercent: pPct,
                carbs: avgCarb,
                cumulativeCarbs: totCarb,
                carbsPercent: carbPct,
                fats: avgFat,
                cumulativeFats: totFat,
                fatsPercent: fatPct,
                totalWaterLiters: totWLiter,
                avgWaterLiters: avgWLiter,
                totalCalories: totCal.toLocaleString(),
                avgCalories: avgCal,
                adherenceRate: `${wPct}%`,
                hydrationAdherence: `${wPct}%`,
                nutritionScore: `${cPct}%`,
                nutritionAdherence: `${cPct}%`,
                avgProtein: avgProt,
                avgCarbs: avgCarb,
                avgFats: avgFat,
                title: `Monthly Clinical Audit (${monthLabel})`,
                subtitle: `Aggregated view over active ${daysInMonth}-day monitoring window`,
                loggedVisits: `${loggedDays} / ${daysInMonth} Days Tracked`,
                demographicSummary: {
                    status: loggedDays > 0 ? `Compliance ${cPct}% (${loggedDays}/${daysInMonth} Days Logged)` : 'No Logs for this Month',
                    keyTakeaway: `Aggregated monthly statement summarizing metabolic intake for ${monthLabel}.`,
                    hydrationVerdict: `Monthly fluid intake reached ${totWLiter} L of ${totTargetW} L target (${wPct}% compliance, avg ${Math.round(totW / daysInMonth)} ml/day).`,
                    calorieVerdict: `Total energy consumed: ${totCal.toLocaleString()} kcal out of ${totTargetCal.toLocaleString()} kcal monthly allowance (avg ${avgCal} kcal/day).`,
                    macroVerdict: `Macronutrient compliance: Protein ${totProt}g total (${pPct}%), Carbs ${totCarb}g total (${carbPct}%), Fats ${totFat}g total (${fatPct}%).`
                }
            };
        }

        if (viewMode === 'quarterly') {
            const qYear = parseInt(selectedQuarterYear, 10) || new Date().getFullYear();
            const startMonth = selectedQuarter === 'Q1' ? 1 : selectedQuarter === 'Q2' ? 4 : selectedQuarter === 'Q3' ? 7 : 10;
            const endMonth = startMonth + 2;

            let totW = 0, totCal = 0, totProt = 0, totCarb = 0, totFat = 0, loggedDays = 0, totalDaysInQuarter = 0;
            for (let m = startMonth; m <= endMonth; m++) {
                const daysInM = new Date(qYear, m, 0).getDate();
                totalDaysInQuarter += daysInM;
                for (let d = 1; d <= daysInM; d++) {
                    const dStr = `${qYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const metrics = getRealDayMetrics(dStr);
                    totW += metrics.waterMl;
                    totCal += metrics.calories;
                    totProt += metrics.protein;
                    totCarb += metrics.carbs;
                    totFat += metrics.fats;
                    if (metrics.hasLog) loggedDays++;
                }
            }

            const totTargetW = Math.round(targets.water * totalDaysInQuarter * 10) / 10;
            const totWLiter = (totW / 1000).toFixed(2);
            const avgWLiter = (totW / totalDaysInQuarter / 1000).toFixed(2);
            const totTargetCal = targetCalories * totalDaysInQuarter;
            const avgCal = Math.round(totCal / totalDaysInQuarter);
            const avgProt = Math.round(totProt / totalDaysInQuarter);
            const avgCarb = Math.round(totCarb / totalDaysInQuarter);
            const avgFat = Math.round(totFat / totalDaysInQuarter);
            const wPct = totTargetW > 0 ? Math.min(Math.round(((totW / 1000) / totTargetW) * 100), 100) : 0;
            const cPct = totTargetCal > 0 ? Math.min(Math.round((totCal / totTargetCal) * 100), 100) : 0;
            const pPct = (targetProtein * totalDaysInQuarter) > 0 ? Math.min(Math.round((totProt / (targetProtein * totalDaysInQuarter)) * 100), 100) : 0;
            const carbPct = (targetCarbs * totalDaysInQuarter) > 0 ? Math.min(Math.round((totCarb / (targetCarbs * totalDaysInQuarter)) * 100), 100) : 0;
            const fatPct = (targetFats * totalDaysInQuarter) > 0 ? Math.min(Math.round((totFat / (targetFats * totalDaysInQuarter)) * 100), 100) : 0;

            return {
                mode: 'quarterly',
                scopeName: `Quarterly Statement (${quarterLabel})`,
                dateLabel: quarterLabel,
                shortDate: `${selectedQuarter} ${selectedQuarterYear}`,
                daysCount: totalDaysInQuarter,
                isLive: false,
                waterConsumed: Math.round(totW / totalDaysInQuarter),
                waterTarget: targetWaterMl,
                cumulativeWaterConsumed: totWLiter,
                cumulativeWaterTarget: totTargetW,
                waterPercent: wPct,
                waterDeficit: Math.max(Math.round(totTargetW * 1000) - totW, 0),
                calories: avgCal,
                calorieTarget: targetCalories,
                cumulativeCalories: totCal,
                cumulativeCalorieTarget: totTargetCal,
                caloriePercent: cPct,
                calorieRemaining: Math.max(totTargetCal - totCal, 0),
                protein: avgProt,
                cumulativeProtein: totProt,
                proteinPercent: pPct,
                carbs: avgCarb,
                cumulativeCarbs: totCarb,
                carbsPercent: carbPct,
                fats: avgFat,
                cumulativeFats: totFat,
                fatsPercent: fatPct,
                totalWaterLiters: totWLiter,
                avgWaterLiters: avgWLiter,
                totalCalories: totCal.toLocaleString(),
                avgCalories: avgCal,
                adherenceRate: `${wPct}%`,
                hydrationAdherence: `${wPct}%`,
                nutritionScore: `${cPct}%`,
                nutritionAdherence: `${cPct}%`,
                avgProtein: avgProt,
                avgCarbs: avgCarb,
                avgFats: avgFat,
                title: `Quarterly Metabolic Audit (${quarterLabel})`,
                subtitle: `Aggregated view over ${totalDaysInQuarter}-day comprehensive protocol`,
                loggedVisits: `${loggedDays} / ${totalDaysInQuarter} Days Tracked`,
                demographicSummary: {
                    status: loggedDays > 0 ? `Quarterly Compliance ${cPct}%` : 'No Quarterly Logs',
                    keyTakeaway: `${totalDaysInQuarter}-day comprehensive metabolic audit over ${quarterLabel}.`,
                    hydrationVerdict: `Total quarterly water volume: ${totWLiter} L of ${totTargetW} L target (${wPct}% adherence).`,
                    calorieVerdict: `Total energy consumed: ${totCal.toLocaleString()} kcal of ${totTargetCal.toLocaleString()} kcal target (avg ${avgCal} kcal/day).`,
                    macroVerdict: `Macronutrient compliance: Protein ${totProt}g (${pPct}%), Carbs ${totCarb}g (${carbPct}%), Fats ${totFat}g (${fatPct}%).`
                }
            };
        }

        // Default / Yearly
        const yNum = parseInt(selectedYear, 10) || new Date().getFullYear();
        let totW = 0, totCal = 0, totProt = 0, totCarb = 0, totFat = 0, loggedDays = 0, totalDaysInYear = 0;
        for (let m = 1; m <= 12; m++) {
            const daysInM = new Date(yNum, m, 0).getDate();
            totalDaysInYear += daysInM;
            for (let d = 1; d <= daysInM; d++) {
                const dStr = `${yNum}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const metrics = getRealDayMetrics(dStr);
                totW += metrics.waterMl;
                totCal += metrics.calories;
                totProt += metrics.protein;
                totCarb += metrics.carbs;
                totFat += metrics.fats;
                if (metrics.hasLog) loggedDays++;
            }
        }

        const totTargetW = Math.round(targets.water * totalDaysInYear * 10) / 10;
        const totWLiter = (totW / 1000).toFixed(2);
        const avgWLiter = (totW / totalDaysInYear / 1000).toFixed(2);
        const totTargetCal = targetCalories * totalDaysInYear;
        const avgCal = Math.round(totCal / totalDaysInYear);
        const avgProt = Math.round(totProt / totalDaysInYear);
        const avgCarb = Math.round(totCarb / totalDaysInYear);
        const avgFat = Math.round(totFat / totalDaysInYear);
        const wPct = totTargetW > 0 ? Math.min(Math.round(((totW / 1000) / totTargetW) * 100), 100) : 0;
        const cPct = totTargetCal > 0 ? Math.min(Math.round((totCal / totTargetCal) * 100), 100) : 0;
        const pPct = (targetProtein * totalDaysInYear) > 0 ? Math.min(Math.round((totProt / (targetProtein * totalDaysInYear)) * 100), 100) : 0;
        const carbPct = (targetCarbs * totalDaysInYear) > 0 ? Math.min(Math.round((totCarb / (targetCarbs * totalDaysInYear)) * 100), 100) : 0;
        const fatPct = (targetFats * totalDaysInYear) > 0 ? Math.min(Math.round((totFat / (targetFats * totalDaysInYear)) * 100), 100) : 0;

        return {
            mode: 'yearly',
            scopeName: `Annual Statement (Year ${selectedYear})`,
            dateLabel: `Calendar Year ${selectedYear}`,
            shortDate: selectedYear,
            daysCount: totalDaysInYear,
            isLive: false,
            waterConsumed: Math.round(totW / totalDaysInYear),
            waterTarget: targetWaterMl,
            cumulativeWaterConsumed: totWLiter,
            cumulativeWaterTarget: totTargetW,
            waterPercent: wPct,
            waterDeficit: Math.max(Math.round(totTargetW * 1000) - totW, 0),
            calories: avgCal,
            calorieTarget: targetCalories,
            cumulativeCalories: totCal,
            cumulativeCalorieTarget: totTargetCal,
            caloriePercent: cPct,
            calorieRemaining: Math.max(totTargetCal - totCal, 0),
            protein: avgProt,
            cumulativeProtein: totProt,
            proteinPercent: pPct,
            carbs: avgCarb,
            cumulativeCarbs: totCarb,
            carbsPercent: carbPct,
            fats: avgFat,
            cumulativeFats: totFat,
            fatsPercent: fatPct,
            totalWaterLiters: totWLiter,
            avgWaterLiters: avgWLiter,
            totalCalories: totCal.toLocaleString(),
            avgCalories: avgCal,
            adherenceRate: `${wPct}%`,
            hydrationAdherence: `${wPct}%`,
            nutritionScore: `${cPct}%`,
            nutritionAdherence: `${cPct}%`,
            avgProtein: avgProt,
            avgCarbs: avgCarb,
            avgFats: avgFat,
            title: `Annual Statement (Year ${selectedYear})`,
            subtitle: `${totalDaysInYear}-day longitudinal record for calendar year ${selectedYear}`,
            loggedVisits: `${loggedDays} / ${totalDaysInYear} Days Tracked`,
            demographicSummary: {
                status: loggedDays > 0 ? `Annual Compliance ${cPct}%` : 'No Annual Logs',
                keyTakeaway: `${totalDaysInYear}-day comprehensive annual clinical record for calendar year ${selectedYear}.`,
                hydrationVerdict: `Annual water intake totaled ${totWLiter} L of ${totTargetW} L target (${wPct}% compliance).`,
                calorieVerdict: `Total annual calories consumed: ${totCal.toLocaleString()} kcal of ${totTargetCal.toLocaleString()} kcal target (avg ${avgCal} kcal/day).`,
                macroVerdict: `Macronutrient compliance: Protein ${totProt}g (${pPct}%), Carbs ${totCarb}g (${carbPct}%), Fats ${totFat}g (${fatPct}%).`
            }
        };
    }, [
        viewMode, selectedDayDate, selectedWeekDate, selectedMonthStr, selectedQuarter, selectedQuarterYear, selectedYear,
        todayStr, waterConsumedMl, targetWaterMl, todayNutrition, targetCalories, targetProtein, targetCarbs, targetFats,
        nutritionLogVersion, getRealDayMetrics, targets.water
    ]);

    // Backwards-compatible alias for existing components
    const aggregatedMetrics = activeStatementData;

    // PDF Statement Export Charts: Strictly synchronized with Real Tracked Data
    const pdfStatementChartData = useMemo(() => {
        const labels = [];
        const hydrationActual = [];
        const hydrationTargetLine = [];
        const caloriesActual = [];
        const caloriesTargetLine = [];
        const proteinData = [];
        const carbsData = [];
        const fatsData = [];

        if (viewMode === 'today' || viewMode === 'daily') {
            // Same totals as the statement tables (activeStatementData), so tables and charts always agree
            const times = ['Morning (8 AM)', 'Midday (12 PM)', 'Afternoon (4 PM)', 'Night (8 PM)'];
            const totalCals = Number(activeStatementData.calories) || 0;
            const totalWater = Number(activeStatementData.waterConsumed) || 0;
            const totalProt = Number(activeStatementData.protein) || 0;
            const totalCarb = Number(activeStatementData.carbs) || 0;
            const totalFat = Number(activeStatementData.fats) || 0;

            times.forEach((t, idx) => {
                labels.push(t);
                hydrationTargetLine.push(targetWaterMl);
                caloriesTargetLine.push(targetCalories);

                if (totalCals === 0 && totalWater === 0) {
                    hydrationActual.push(0);
                    caloriesActual.push(0);
                    proteinData.push(0);
                    carbsData.push(0);
                    fatsData.push(0);
                } else {
                    const factor = (idx + 1) / times.length;
                    hydrationActual.push(Math.round(totalWater * factor));
                    caloriesActual.push(Math.round(totalCals * factor));
                    proteinData.push(Math.round(totalProt * factor));
                    carbsData.push(Math.round(totalCarb * factor));
                    fatsData.push(Math.round(totalFat * factor));
                }
            });
        } else if (viewMode === 'weekly') {
            const wk = getWeekRange(selectedWeekDate);
            const [y, m, dNum] = wk.startDate.split('-').map(Number);
            const start = new Date(y, m - 1, dNum);
            const pad = (n) => String(n).padStart(2, '0');

            for (let i = 0; i < 7; i++) {
                const cur = new Date(start);
                cur.setDate(cur.getDate() + i);
                const dStr = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
                const labelStr = cur.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                labels.push(labelStr);

                const m = getRealDayMetrics(dStr);
                hydrationActual.push(m.waterMl);
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(m.calories);
                caloriesTargetLine.push(targetCalories);
                proteinData.push(m.protein);
                carbsData.push(m.carbs);
                fatsData.push(m.fats);
            }
        } else if (viewMode === 'monthly') {
            const [yStr, mStr] = selectedMonthStr.split('-');
            const y = parseInt(yStr, 10) || new Date().getFullYear();
            const m = parseInt(mStr, 10) || (new Date().getMonth() + 1);
            const daysInMonth = new Date(y, m, 0).getDate();

            for (let day = 1; day <= daysInMonth; day++) {
                const dStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const metrics = getRealDayMetrics(dStr);
                labels.push(`${SHORT_MONTH_NAMES[m - 1]} ${day}`);
                hydrationActual.push(metrics.waterMl);
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(metrics.calories);
                caloriesTargetLine.push(targetCalories);
                proteinData.push(metrics.protein);
                carbsData.push(metrics.carbs);
                fatsData.push(metrics.fats);
            }
        } else if (viewMode === 'quarterly') {
            const qYear = parseInt(selectedQuarterYear, 10) || new Date().getFullYear();
            const startMonth = selectedQuarter === 'Q1' ? 1 : selectedQuarter === 'Q2' ? 4 : selectedQuarter === 'Q3' ? 7 : 10;
            const pad = (n) => String(n).padStart(2, '0');
            const quarterDays = [];
            for (let m = startMonth; m <= startMonth + 2; m++) {
                const daysInM = new Date(qYear, m, 0).getDate();
                for (let d = 1; d <= daysInM; d++) quarterDays.push(`${qYear}-${pad(m)}-${pad(d)}`);
            }

            for (let i = 0, w = 1; i < quarterDays.length; i += 7, w++) {
                const bucket = quarterDays.slice(i, i + 7);
                labels.push(`Wk ${w}`);
                let wWater = 0, wCal = 0, wProt = 0, wCarbs = 0, wFats = 0;
                bucket.forEach(dStr => {
                    const metrics = getRealDayMetrics(dStr);
                    wWater += metrics.waterMl;
                    wCal += metrics.calories;
                    wProt += metrics.protein;
                    wCarbs += metrics.carbs;
                    wFats += metrics.fats;
                });
                const n = bucket.length;
                hydrationActual.push(Math.round(wWater / n));
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(Math.round(wCal / n));
                caloriesTargetLine.push(targetCalories);
                proteinData.push(Math.round(wProt / n));
                carbsData.push(Math.round(wCarbs / n));
                fatsData.push(Math.round(wFats / n));
            }
        } else {
            // Yearly
            const yNum = parseInt(selectedYear, 10) || new Date().getFullYear();
            SHORT_MONTH_NAMES.forEach((mName, idx) => {
                labels.push(mName);
                const m = idx + 1;
                const daysInM = new Date(yNum, m, 0).getDate();
                let mWater = 0, mCal = 0, mProt = 0, mCarbs = 0, mFats = 0;
                for (let d = 1; d <= daysInM; d++) {
                    const dStr = `${yNum}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const metrics = getRealDayMetrics(dStr);
                    mWater += metrics.waterMl;
                    mCal += metrics.calories;
                    mProt += metrics.protein;
                    mCarbs += metrics.carbs;
                    mFats += metrics.fats;
                }
                hydrationActual.push(Math.round(mWater / daysInM));
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(Math.round(mCal / daysInM));
                caloriesTargetLine.push(targetCalories);
                proteinData.push(Math.round(mProt / daysInM));
                carbsData.push(Math.round(mCarbs / daysInM));
                fatsData.push(Math.round(mFats / daysInM));
            });
        }

        return {
            labels,
            hydrationActual,
            hydrationTargetLine,
            caloriesActual,
            caloriesTargetLine,
            proteinData,
            carbsData,
            fatsData
        };
    }, [
        viewMode, selectedWeekDate, selectedMonthStr, selectedQuarter, selectedQuarterYear, selectedYear,
        selectedDayDate, todayStr, targetWaterMl, targetCalories, getRealDayMetrics, activeStatementData
    ]);

    // On-Screen Interactive Chart Data: Synchronized with Real Tracked Data
    const chartData = useMemo(() => {
        if (selectedInterval === 'STATEMENT') {
            return pdfStatementChartData;
        }

        const labels = [];
        const hydrationActual = [];
        const hydrationTargetLine = [];
        const caloriesActual = [];
        const caloriesTargetLine = [];
        const proteinData = [];
        const carbsData = [];
        const fatsData = [];

        if (selectedInterval === '1D') {
            const times = ['Morning (8 AM)', 'Midday (12 PM)', 'Afternoon (4 PM)', 'Night (8 PM)'];
            const dayMetrics = getRealDayMetrics(todayStr);
            times.forEach((t, idx) => {
                labels.push(t);
                hydrationTargetLine.push(targetWaterMl);
                caloriesTargetLine.push(targetCalories);
                if (dayMetrics.calories === 0 && dayMetrics.waterMl === 0) {
                    hydrationActual.push(0);
                    caloriesActual.push(0);
                    proteinData.push(0);
                    carbsData.push(0);
                    fatsData.push(0);
                } else {
                    const factor = (idx + 1) / times.length;
                    hydrationActual.push(Math.round(dayMetrics.waterMl * factor));
                    caloriesActual.push(Math.round(dayMetrics.calories * factor));
                    proteinData.push(Math.round(dayMetrics.protein * factor));
                    carbsData.push(Math.round(dayMetrics.carbs * factor));
                    fatsData.push(Math.round(dayMetrics.fats * factor));
                }
            });
        } else if (selectedInterval === '1W') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split('T')[0];
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));

                const m = getRealDayMetrics(dStr);
                hydrationActual.push(m.waterMl);
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(m.calories);
                caloriesTargetLine.push(targetCalories);
                proteinData.push(m.protein);
                carbsData.push(m.carbs);
                fatsData.push(m.fats);
            }
        } else if (selectedInterval === '2W') {
            for (let i = 13; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split('T')[0];
                labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

                const m = getRealDayMetrics(dStr);
                hydrationActual.push(m.waterMl);
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(m.calories);
                caloriesTargetLine.push(targetCalories);
                proteinData.push(m.protein);
                carbsData.push(m.carbs);
                fatsData.push(m.fats);
            }
        } else if (selectedInterval === '3W') {
            for (let i = 20; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split('T')[0];
                labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

                const m = getRealDayMetrics(dStr);
                hydrationActual.push(m.waterMl);
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(m.calories);
                caloriesTargetLine.push(targetCalories);
                proteinData.push(m.protein);
                carbsData.push(m.carbs);
                fatsData.push(m.fats);
            }
        } else if (selectedInterval === '1M') {
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split('T')[0];
                labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

                const m = getRealDayMetrics(dStr);
                hydrationActual.push(m.waterMl);
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(m.calories);
                caloriesTargetLine.push(targetCalories);
                proteinData.push(m.protein);
                carbsData.push(m.carbs);
                fatsData.push(m.fats);
            }
        } else if (selectedInterval === '3M') {
            for (let w = 11; w >= 0; w--) {
                labels.push(`Wk -${w}`);
                let wWater = 0, wCal = 0, wProt = 0, wCarbs = 0, wFats = 0;
                for (let day = 0; day < 7; day++) {
                    const d = new Date();
                    d.setDate(d.getDate() - (w * 7 + day));
                    const dStr = d.toISOString().split('T')[0];
                    const m = getRealDayMetrics(dStr);
                    wWater += m.waterMl;
                    wCal += m.calories;
                    wProt += m.protein;
                    wCarbs += m.carbs;
                    wFats += m.fats;
                }
                hydrationActual.push(Math.round(wWater / 7));
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(Math.round(wCal / 7));
                caloriesTargetLine.push(targetCalories);
                proteinData.push(Math.round(wProt / 7));
                carbsData.push(Math.round(wCarbs / 7));
                fatsData.push(Math.round(wFats / 7));
            }
        } else if (selectedInterval === '6M') {
            for (let m = 5; m >= 0; m--) {
                const d = new Date();
                d.setMonth(d.getMonth() - m);
                labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
                const y = d.getFullYear();
                const month = d.getMonth() + 1;
                const daysInM = new Date(y, month, 0).getDate();

                let mWater = 0, mCal = 0, mProt = 0, mCarbs = 0, mFats = 0;
                for (let day = 1; day <= daysInM; day++) {
                    const dStr = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const metrics = getRealDayMetrics(dStr);
                    mWater += metrics.waterMl;
                    mCal += metrics.calories;
                    mProt += metrics.protein;
                    mCarbs += metrics.carbs;
                    mFats += metrics.fats;
                }
                hydrationActual.push(Math.round(mWater / daysInM));
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(Math.round(mCal / daysInM));
                caloriesTargetLine.push(targetCalories);
                proteinData.push(Math.round(mProt / daysInM));
                carbsData.push(Math.round(mCarbs / daysInM));
                fatsData.push(Math.round(mFats / daysInM));
            }
        } else if (selectedInterval === '1Y') {
            for (let m = 11; m >= 0; m--) {
                const d = new Date();
                d.setMonth(d.getMonth() - m);
                labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
                const y = d.getFullYear();
                const month = d.getMonth() + 1;
                const daysInM = new Date(y, month, 0).getDate();

                let mWater = 0, mCal = 0, mProt = 0, mCarbs = 0, mFats = 0;
                for (let day = 1; day <= daysInM; day++) {
                    const dStr = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const metrics = getRealDayMetrics(dStr);
                    mWater += metrics.waterMl;
                    mCal += metrics.calories;
                    mProt += metrics.protein;
                    mCarbs += metrics.carbs;
                    mFats += metrics.fats;
                }
                hydrationActual.push(Math.round(mWater / daysInM));
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(Math.round(mCal / daysInM));
                caloriesTargetLine.push(targetCalories);
                proteinData.push(Math.round(mProt / daysInM));
                carbsData.push(Math.round(mCarbs / daysInM));
                fatsData.push(Math.round(mFats / daysInM));
            }
        } else {
            // CUSTOM: Single Selected Date Progression
            const targetDate = customSingleDate || todayStr;
            const times = ['Morning (8 AM)', 'Midday (12 PM)', 'Afternoon (4 PM)', 'Night (8 PM)'];
            const dayMetrics = getRealDayMetrics(targetDate);
            times.forEach((t, idx) => {
                labels.push(t);
                hydrationTargetLine.push(targetWaterMl);
                caloriesTargetLine.push(targetCalories);
                if (dayMetrics.calories === 0 && dayMetrics.waterMl === 0) {
                    hydrationActual.push(0);
                    caloriesActual.push(0);
                    proteinData.push(0);
                    carbsData.push(0);
                    fatsData.push(0);
                } else {
                    const factor = (idx + 1) / times.length;
                    hydrationActual.push(Math.round(dayMetrics.waterMl * factor));
                    caloriesActual.push(Math.round(dayMetrics.calories * factor));
                    proteinData.push(Math.round(dayMetrics.protein * factor));
                    carbsData.push(Math.round(dayMetrics.carbs * factor));
                    fatsData.push(Math.round(dayMetrics.fats * factor));
                }
            });
        }

        return {
            labels,
            hydrationActual,
            hydrationTargetLine,
            caloriesActual,
            caloriesTargetLine,
            proteinData,
            carbsData,
            fatsData
        };
    }, [
        selectedInterval, customSingleDate, pdfStatementChartData,
        targetWaterMl, targetCalories, getRealDayMetrics, todayStr
    ]);

    // Chart Configuration: Hydration
    const hydrationChartConfig = {
        labels: chartData.labels,
        datasets: [
            {
                label: 'Consumed Water (ml)',
                data: chartData.hydrationActual,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#080b12',
                pointBorderColor: '#38bdf8',
                pointBorderWidth: 2,
                pointRadius: 4
            },
            {
                label: 'Water Target (ml)',
                data: chartData.hydrationTargetLine,
                borderColor: '#a5d391',
                borderDash: [5, 5],
                borderWidth: 2,
                fill: false,
                tension: 0,
                pointRadius: 0
            }
        ]
    };

    // Chart Configuration: Nutrition & Calories
    const nutritionChartConfig = {
        labels: chartData.labels,
        datasets: [
            {
                label: 'Calories Consumed (kcal)',
                data: chartData.caloriesActual,
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.12)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#080b12',
                pointBorderColor: '#fbbf24',
                pointBorderWidth: 2,
                pointRadius: 4
            },
            {
                label: 'Calorie Target (kcal)',
                data: chartData.caloriesTargetLine,
                borderColor: '#ef4444',
                borderDash: [5, 5],
                borderWidth: 2,
                fill: false,
                tension: 0,
                pointRadius: 0
            }
        ]
    };

    // Chart Configuration: Macronutrient Split
    const macrosChartConfig = {
        labels: chartData.labels,
        datasets: [
            {
                label: 'Protein (g)',
                data: chartData.proteinData,
                backgroundColor: '#a5d391',
                borderRadius: 6
            },
            {
                label: 'Carbs (g)',
                data: chartData.carbsData,
                backgroundColor: '#38bdf8',
                borderRadius: 6
            },
            {
                label: 'Fats (g)',
                data: chartData.fatsData,
                backgroundColor: '#facc15',
                borderRadius: 6
            }
        ]
    };

    const commonChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: { size: 11, weight: 'bold' }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(8, 11, 18, 0.95)',
                titleColor: '#fff',
                bodyColor: '#a5d391',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                borderWidth: 1,
                padding: 10
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: 'rgba(255, 255, 255, 0.5)' }
            },
            x: {
                grid: { display: false },
                ticks: { color: 'rgba(255, 255, 255, 0.5)' }
            }
        }
    };

    // Professional Medical PDF Document Generator & Downloader
    const handleDownloadReportPdf = (scope = 'Active') => {
        setIsDownloadingPdf(true);

        const targetScope = scope === 'Active' ? viewMode : scope.toLowerCase();
        const fullName = [user?.firstName || userProfile?.firstName, user?.lastName || userProfile?.lastName].filter(Boolean).join(' ').trim();
        const patientName = fullName || user?.name || user?.username || user?.email || 'Patient';
        const patientEmail = user?.email || 'N/A';
        const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const reportId = `STATEMENT-NMR-${Date.now().toString(36).toUpperCase()}`;

        // Scope wording comes from the same statement object the screen renders (real day counts)
        const scopeTitle = activeStatementData.scopeName;
        const dateRangeLabel = activeStatementData.dateLabel;
        const evalSubtitle = activeStatementData.daysCount === 1
            ? 'Single-Day Statement'
            : `${activeStatementData.daysCount}-Day Aggregated Statement`;

        // Real profile values only - never invented defaults
        const ageText = userProfile?.age ? `${userProfile.age} Yrs` : 'Age not set';
        const genderText = userProfile?.gender || 'Gender not set';
        const heightText = userProfile?.heightCm ? `${userProfile.heightCm} cm` : 'Height not set';
        const weightText = userProfile?.weightKg ? `${userProfile.weightKg} kg` : 'Weight not set';
        const bmiText = userProfile?.heightCm && userProfile?.weightKg
            ? ` (${(userProfile.weightKg / Math.pow(userProfile.heightCm / 100, 2)).toFixed(1)} BMI)`
            : '';
        const progressRemark = (pct) => pct >= 100 ? 'Target met' : pct >= 75 ? 'Close to target' : pct > 0 ? 'Below target' : 'No intake logged';

        // Charts in the PDF are exactly the charts shown on screen (same interval & data)
        const isStatementInterval = selectedInterval === 'STATEMENT';
        const pdfChartData = chartData;
        const chartRangeLabel = isStatementInterval
            ? activeStatementData.dateLabel
            : (INTERVAL_PRESETS.find(pr => pr.id === selectedInterval)?.label || selectedInterval);

        // Determine precise date / duration mentioned for document naming
        let durationMentioned = '';
        if (targetScope === 'today') {
            const parts = todayStr.split('-').map(Number);
            const d = new Date(parts[0], parts[1] - 1, parts[2]);
            durationMentioned = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } else if (targetScope === 'daily') {
            const parts = selectedDayDate.split('-').map(Number);
            const d = new Date(parts[0], parts[1] - 1, parts[2]);
            durationMentioned = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } else if (targetScope === 'weekly') {
            const wk = getWeekRange(selectedWeekDate);
            const sParts = wk.startDate.split('-').map(Number);
            const eParts = wk.endDate.split('-').map(Number);
            const sDate = new Date(sParts[0], sParts[1] - 1, sParts[2]);
            const eDate = new Date(eParts[0], eParts[1] - 1, eParts[2]);
            const sStr = sDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const eStr = eDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            durationMentioned = `${sStr} to ${eStr}`;
        } else if (targetScope === 'monthly') {
            const [y, m] = selectedMonthStr.split('-').map(Number);
            const mDate = new Date(y, m - 1, 1);
            durationMentioned = mDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } else if (targetScope === 'quarterly') {
            durationMentioned = `${selectedQuarter} ${selectedQuarterYear}`;
        } else if (targetScope === 'yearly') {
            durationMentioned = `Year ${selectedYear}`;
        } else {
            durationMentioned = 'Lifetime';
        }

        const reportDocumentTitle = `Health Report ${durationMentioned}`;
        const safeFileName = reportDocumentTitle.replace(/[\/\\:*?"<>|]/g, '-');

        // Generate Vector SVG charts matching the active statement timeframe
        const svgHydration = generateSvgLineChart({
            title: 'Hydration Curve (Fluid Volume vs Daily Target)',
            unit: 'ml',
            actualLabel: 'Consumed Water',
            targetLabel: 'Water Target',
            labels: pdfChartData.labels,
            actualData: pdfChartData.hydrationActual,
            targetData: pdfChartData.hydrationTargetLine,
            actualColor: '#38bdf8',
            targetColor: '#a5d391'
        });

        const svgCalories = generateSvgLineChart({
            title: 'Calories Curve (Caloric Expenditure vs Threshold)',
            unit: 'kcal',
            actualLabel: 'Calories Consumed',
            targetLabel: 'Calorie Target',
            labels: pdfChartData.labels,
            actualData: pdfChartData.caloriesActual,
            targetData: pdfChartData.caloriesTargetLine,
            actualColor: '#fbbf24',
            targetColor: '#ef4444'
        });

        const svgMacros = generateSvgBarChart({
            title: 'Macros Split (Macronutrient Distribution: Protein, Carbs, Fats)',
            labels: pdfChartData.labels,
            proteinData: pdfChartData.proteinData,
            carbsData: pdfChartData.carbsData,
            fatsData: pdfChartData.fatsData
        });

        // Format clean, printable medical document HTML
        const reportContentHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${reportDocumentTitle}</title>
                <style>
                    @page { size: A4; margin: 18mm 15mm 18mm 15mm; }
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; line-height: 1.45; font-size: 11pt; margin: 0; padding: 20px; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
                    .brand { font-size: 20pt; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
                    .brand span { color: #16a34a; font-style: italic; }
                    .badge { background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 999px; font-size: 8.5pt; font-weight: bold; text-transform: uppercase; }
                    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 20px; font-size: 9.5pt; }
                    .meta-item strong { display: block; font-size: 8pt; color: #64748b; text-transform: uppercase; }
                    h2 { font-size: 13pt; color: #0f172a; border-left: 4px solid #16a34a; padding-left: 8px; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 10pt; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
                    th { background: #f1f5f9; color: #0f172a; font-weight: bold; }
                    .status-pill { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 8pt; font-weight: bold; background: #e2e8f0; }
                    .status-pass { background: #dcfce7; color: #166534; }
                    .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
                    .footer { margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 8.5pt; color: #64748b; display: flex; justify-content: space-between; }
                    .signoff { display: flex; justify-content: space-between; margin-top: 25px; padding-top: 15px; }
                    .sign-box { border-top: 1px dashed #94a3b8; width: 220px; text-align: center; font-size: 9pt; padding-top: 6px; }
                    .chart-card { page-break-inside: avoid; }
                    @media print {
                        body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        button { display: none; }
                        .chart-card { page-break-inside: avoid; }
                        table { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="brand">NutriMunch <span>Clinical Statement</span></div>
                        <div style="font-size: 9pt; color: #64748b; margin-top: 2px;">Official Nutritional & Hydration Metabolic Statement • ${evalSubtitle}</div>
                    </div>
                    <div style="text-align: right;">
                        <span class="badge">Verified Statement</span>
                        <div style="font-size: 8.5pt; color: #64748b; margin-top: 4px;">Doc ID: ${reportId}</div>
                    </div>
                </div>

                <div class="meta-grid">
                    <div class="meta-item"><strong>Patient Name</strong> ${patientName}</div>
                    <div class="meta-item"><strong>Patient Email</strong> ${patientEmail}</div>
                    <div class="meta-item"><strong>Demographics</strong> ${ageText} • ${genderText}</div>
                    <div class="meta-item"><strong>Biometrics</strong> ${heightText} • ${weightText}${bmiText}</div>
                    <div class="meta-item"><strong>Primary Goal</strong> ${userProfile?.goal || 'Not set'}</div>
                    <div class="meta-item"><strong>Daily Targets</strong> ${targetCalories} kcal • ${targets.water} L</div>
                    <div class="meta-item"><strong>Statement Scope</strong> ${scopeTitle}</div>
                    <div class="meta-item"><strong>Evaluated Period</strong> ${dateRangeLabel}</div>
                </div>

                <div class="summary-box">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <strong style="color: #166534; font-size: 11pt;">Clinical Biometric Adherence Summary & What This Statement Tells You:</strong>
                        <span class="badge" style="background: #166534; color: #fff;">${activeStatementData.demographicSummary?.status || 'Verified'}</span>
                    </div>
                    <p style="margin: 0 0 8px 0; font-size: 9.5pt; color: #1e293b; line-height: 1.45;">
                        ${activeStatementData.demographicSummary?.keyTakeaway || `Patient demonstrated an overall ${activeStatementData.hydrationAdherence} hydration velocity adherence and a ${activeStatementData.nutritionAdherence} macronutrient compliance score over the evaluated monitoring interval (${activeStatementData.dateLabel}).`}
                    </p>
                    <div style="font-size: 9pt; color: #334155; border-top: 1px dashed #bbf7d0; padding-top: 6px; display: grid; grid-template-columns: 1fr; gap: 4px;">
                        <div>• <strong>Hydration:</strong> ${activeStatementData.demographicSummary?.hydrationVerdict}</div>
                        <div>• <strong>Calories & Energy:</strong> ${activeStatementData.demographicSummary?.calorieVerdict}</div>
                        <div>• <strong>Macronutrients:</strong> ${activeStatementData.demographicSummary?.macroVerdict}</div>
                    </div>
                </div>

                <h2>1. Fluid & Hydration Tracking (${activeStatementData.shortDate})</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Parameter</th>
                            <th>Daily Target</th>
                            <th>Total Consumed</th>
                            <th>Completion %</th>
                            <th>Status / Variance</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Water Intake (Fluid Volume)</strong></td>
                            <td>${targets.water} L (${targetWaterMl} ml)</td>
                            <td>${(activeStatementData.waterConsumed / 1000).toFixed(2)} L (${activeStatementData.waterConsumed} ml)</td>
                            <td><strong>${activeStatementData.waterPercent}%</strong></td>
                            <td><span class="status-pill status-pass">${activeStatementData.waterPercent >= 100 ? 'Target Achieved' : (activeStatementData.waterDeficit > 0 ? `Needs +${activeStatementData.waterDeficit} ml` : 'Optimal')}</span></td>
                        </tr>
                        <tr>
                            <td><strong>Aggregated Interval Volume (${activeStatementData.mode.toUpperCase()})</strong></td>
                            <td>${(targets.water * activeStatementData.daysCount).toFixed(0)} L</td>
                            <td>${activeStatementData.totalWaterLiters} L</td>
                            <td><strong>${activeStatementData.hydrationAdherence}</strong></td>
                            <td><span class="status-pill">${progressRemark(parseInt(activeStatementData.hydrationAdherence, 10) || 0)}</span></td>
                        </tr>
                    </tbody>
                </table>

                <h2>2. Macronutrient & Calorie Nutrition Count</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Nutritional Metric</th>
                            <th>Clinical Target</th>
                            <th>Total Consumed</th>
                            <th>% Target Completed</th>
                            <th>Clinical Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Caloric Energy</strong></td>
                            <td>${targetCalories} kcal</td>
                            <td>${activeStatementData.calories} kcal</td>
                            <td><strong>${activeStatementData.caloriePercent}%</strong></td>
                            <td>${activeStatementData.calorieRemaining > 0 ? `${activeStatementData.calorieRemaining} kcal remaining deficit` : 'Target energy threshold met'}</td>
                        </tr>
                        <tr>
                            <td><strong>Dietary Protein</strong></td>
                            <td>${targetProtein} g</td>
                            <td>${activeStatementData.protein} g</td>
                            <td><strong>${activeStatementData.proteinPercent}%</strong></td>
                            <td>${progressRemark(activeStatementData.proteinPercent)}</td>
                        </tr>
                        <tr>
                            <td><strong>Carbohydrates</strong></td>
                            <td>${targetCarbs} g</td>
                            <td>${activeStatementData.carbs} g</td>
                            <td><strong>${activeStatementData.carbsPercent}%</strong></td>
                            <td>${progressRemark(activeStatementData.carbsPercent)}</td>
                        </tr>
                        <tr>
                            <td><strong>Fats & Essential Lipids</strong></td>
                            <td>${targetFats} g</td>
                            <td>${activeStatementData.fats} g</td>
                            <td><strong>${activeStatementData.fatsPercent}%</strong></td>
                            <td>${progressRemark(activeStatementData.fatsPercent)}</td>
                        </tr>
                    </tbody>
                </table>

                <h2>3. Longitudinal Performance Curves (${activeStatementData.scopeName})</h2>
                <div style="font-size: 8.5pt; color: #64748b; margin-top: -6px; margin-bottom: 12px;">
                    Charts cover: <strong>${chartRangeLabel}</strong>${isStatementInterval ? '' : ' (chart range selected on screen)'}
                </div>
                ${svgHydration}
                ${svgCalories}
                ${svgMacros}

                <h2>4. Longitudinal Statement Trends (${activeStatementData.mode.toUpperCase()})</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Timeframe Scope</th>
                            <th>Avg Daily Calories</th>
                            <th>Avg Daily Water</th>
                            <th>Logged Engagement</th>
                            <th>Metabolic Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>${activeStatementData.title}</strong></td>
                            <td>${activeStatementData.avgCalories} kcal / day</td>
                            <td>${activeStatementData.avgWaterLiters} L / day</td>
                            <td>${activeStatementData.loggedVisits}</td>
                            <td><strong>${activeStatementData.nutritionAdherence} of calorie target</strong></td>
                        </tr>
                    </tbody>
                </table>

                <div class="signoff">
                    <div class="sign-box">
                        <strong>Clinical Nutrition Oversight</strong>
                        <div>NutriMunch Algorithmic Engine</div>
                    </div>
                    <div class="sign-box">
                        <strong>Verified Patient Signature</strong>
                        <div>${patientName} (${reportDate})</div>
                    </div>
                </div>

                <div class="footer">
                    <div>NutriMunch Minor Project AI Platform • Official Clinical Health Document</div>
                    <div>Generated: ${reportDate} • Confidential</div>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;

        // Open print window / save to PDF dialog
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(reportContentHtml);
            printWindow.document.close();
            setDownloadSuccessToast(`Successfully prepared ${reportDocumentTitle} PDF!`);
        } else {
            // Fallback: create downloadable HTML/Blob
            const blob = new Blob([reportContentHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeFileName}.html`;
            a.click();
            URL.revokeObjectURL(url);
            setDownloadSuccessToast(`Downloaded ${reportDocumentTitle}!`);
        }

        setIsDownloadingPdf(false);
        setTimeout(() => setDownloadSuccessToast(null), 5000);
    };

    return (
        <div className="w-full text-white space-y-8 font-body-md">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#a5d391] mb-1">
                        <span className="w-2 h-2 rounded-full bg-[#a5d391] animate-pulse"></span>
                        Clinical Biometric & Compliance Intelligence
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold font-hero-display tracking-tight text-white">
                        Health & Nutrition Reports
                    </h1>
                    <p className="text-white/50 text-sm mt-1 max-w-2xl">
                        Comprehensive daily hydration velocity, automated macronutrient counts, interval trend charts, and downloadable clinical PDF reports.
                    </p>
                </div>

                {/* PDF Generation Direct Action: Downloads selected period */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => handleDownloadReportPdf('Active')}
                        disabled={isDownloadingPdf}
                        className="bg-[#a5d391] hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl transition-all shadow-[0_0_25px_rgba(165,211,145,0.35)] hover:scale-105 cursor-pointer flex items-center gap-2"
                        title="Download Health Report for current selected period"
                    >
                        <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                        <span>{isDownloadingPdf ? 'Generating...' : 'Download Health Report'}</span>
                    </button>
                </div>
            </div>

            {/* Notification Toast */}
            {downloadSuccessToast && (
                <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        <span>{downloadSuccessToast}</span>
                    </div>
                    <button onClick={() => setDownloadSuccessToast(null)} className="text-white/40 hover:text-white text-xs">
                        Dismiss
                    </button>
                </div>
            )}

            {/* TIMEFRAME AGGREGATION TABS */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto scrollbar-none">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest mr-2 shrink-0">
                    Aggregation View:
                </span>
                {[
                    { id: 'today', label: 'Today', icon: 'today' },
                    { id: 'daily', label: 'Daily Visits', icon: 'event' },
                    { id: 'weekly', label: 'Weekly Visits', icon: 'date_range' },
                    { id: 'monthly', label: 'Monthly Visits', icon: 'calendar_month' },
                    { id: 'quarterly', label: 'Quarterly Visits', icon: 'view_timeline' },
                    { id: 'yearly', label: 'Yearly Visits', icon: 'event_repeat' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setViewMode(tab.id)}
                        className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                            viewMode === tab.id
                                ? 'bg-[#a5d391] text-black shadow-[0_0_15px_rgba(165,211,145,0.3)] font-black'
                                : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5'
                        }`}
                    >
                        <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* STATEMENT PERIOD CONTROLLER (Like an Account Statement Download Filter) */}
            <div className="bg-gradient-to-r from-[#0c121e] via-[#080b12] to-[#0c121e] border border-white/10 rounded-2xl p-4 lg:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#a5d391]/15 border border-[#a5d391]/30 flex items-center justify-center text-[#a5d391] shrink-0">
                        <span className="material-symbols-outlined text-xl">tune</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-white/40">Statement Window:</span>
                            <span className="text-xs font-extrabold text-[#a5d391] bg-[#a5d391]/10 px-2.5 py-0.5 rounded-full border border-[#a5d391]/20">
                                {activeStatementData.dateLabel}
                            </span>
                        </div>
                        <p className="text-[11px] text-white/50 mt-0.5">
                            Filter biometrics by custom day, week, month, quarter, or annual statement cycle.
                        </p>
                    </div>
                </div>

                {/* Specific Date / Period Inputs */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* TODAY */}
                    {viewMode === 'today' && (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-[#080b12] border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                <span className="font-bold text-emerald-300">Live Real-Time Intake Feed</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    navigate(`/dashboard/user/progress?section=nutrition&date=${todayStr}#nutrition-section`);
                                }}
                                className="px-3 py-2 rounded-xl text-xs font-bold bg-[#a5d391]/15 hover:bg-[#a5d391]/25 text-[#a5d391] border border-[#a5d391]/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                title="Log today's daily nutrition count on Progress page"
                            >
                                <span className="material-symbols-outlined text-xs">edit_calendar</span>
                                <span>Log Today</span>
                            </button>
                        </div>
                    )}

                    {/* DAILY VISITS: Custom Dark Calendar Picker */}
                    {viewMode === 'daily' && (
                        <div className="flex items-center gap-2">
                            <DarkCalendarPicker
                                value={selectedDayDate}
                                onChange={(val) => setSelectedDayDate(val)}
                                maxDate={todayStr}
                                mode="day"
                            />
                            <button
                                onClick={() => setSelectedDayDate(todayStr)}
                                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    selectedDayDate === todayStr ? 'bg-[#a5d391] text-black border-[#a5d391]' : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                                }`}
                            >
                                Today
                            </button>
                            <button
                                onClick={() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() - 1);
                                    setSelectedDayDate(d.toISOString().split('T')[0]);
                                }}
                                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    selectedDayDate === yesterdayStr ? 'bg-[#a5d391] text-black border-[#a5d391]' : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                                }`}
                            >
                                Yesterday
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    navigate(`/dashboard/user/progress?section=nutrition&date=${selectedDayDate}#nutrition-section`);
                                }}
                                className="px-3 py-2 rounded-xl text-xs font-bold bg-[#a5d391]/15 hover:bg-[#a5d391]/25 text-[#a5d391] border border-[#a5d391]/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                title="Log or adjust nutrition count for selected day on Progress page"
                            >
                                <span className="material-symbols-outlined text-xs">edit_calendar</span>
                                <span>Log Day</span>
                            </button>
                        </div>
                    )}

                    {/* WEEKLY VISITS: Custom Dark Calendar Picker (Week Mode) */}
                    {viewMode === 'weekly' && (
                        <div className="flex items-center gap-2">
                            <DarkCalendarPicker
                                value={selectedWeekDate}
                                onChange={(val) => setSelectedWeekDate(val)}
                                maxDate={todayStr}
                                mode="week"
                            />
                            <button
                                onClick={() => setSelectedWeekDate(todayStr)}
                                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    isSelectedThisWeek ? 'bg-[#a5d391] text-black border-[#a5d391]' : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                                }`}
                            >
                                This Week
                            </button>
                            <button
                                onClick={() => setSelectedWeekDate(lastWeekStart)}
                                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    isSelectedLastWeek ? 'bg-[#a5d391] text-black border-[#a5d391]' : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                                }`}
                            >
                                Last Week
                            </button>
                        </div>
                    )}

                    {/* MONTHLY VISITS: Custom Dark Calendar Picker (Month Mode) */}
                    {viewMode === 'monthly' && (
                        <div className="flex items-center gap-2">
                            <DarkCalendarPicker
                                value={selectedMonthStr}
                                onChange={(val) => setSelectedMonthStr(val)}
                                maxDate={todayStr.slice(0, 7)}
                                mode="month"
                            />
                            <button
                                onClick={() => {
                                    const d = new Date();
                                    setSelectedMonthStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                                }}
                                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    isSelectedThisMonth ? 'bg-[#a5d391] text-black border-[#a5d391]' : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                                }`}
                            >
                                This Month
                            </button>
                            <button
                                onClick={() => {
                                    const d = new Date();
                                    d.setMonth(d.getMonth() - 1);
                                    setSelectedMonthStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                                }}
                                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    isSelectedLastMonth ? 'bg-[#a5d391] text-black border-[#a5d391]' : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                                }`}
                            >
                                Last Month
                            </button>
                        </div>
                    )}

                    {/* QUARTERLY VISITS: Quarter & Any Year Selector */}
                    {viewMode === 'quarterly' && (
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex bg-[#080b12] border border-white/15 p-1 rounded-xl gap-1">
                                {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                                    <button
                                        key={q}
                                        type="button"
                                        onClick={() => setSelectedQuarter(q)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                            selectedQuarter === q
                                                ? 'bg-[#a5d391] text-black font-extrabold shadow-sm'
                                                : 'text-white/60 hover:text-white'
                                        }`}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                            <YearSelector
                                value={selectedQuarterYear}
                                onChange={setSelectedQuarterYear}
                                label="Year:"
                            />
                        </div>
                    )}

                    {/* YEARLY VISITS: Any Year Selector */}
                    {viewMode === 'yearly' && (
                        <div className="flex items-center gap-2">
                            <YearSelector
                                value={selectedYear}
                                onChange={setSelectedYear}
                                label="Statement Year:"
                            />
                        </div>
                    )}

                    {/* Direct Statement PDF Action */}
                    <button
                        onClick={() => handleDownloadReportPdf('Active')}
                        disabled={isDownloadingPdf}
                        className="bg-white/10 hover:bg-[#a5d391] text-white hover:text-black font-bold text-xs px-3.5 py-1.5 rounded-xl border border-white/15 hover:border-[#a5d391] transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                        title="Download Health Report for current selected period"
                    >
                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                        <span>{isDownloadingPdf ? 'Generating...' : 'Download Health Report'}</span>
                    </button>
                </div>
            </div>

            {/* 1. CORE SECTION: DAILY HYDRATION & DAILY NUTRITION METRICS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hydration Count & Progress Card */}
                <div className="bg-gradient-to-br from-[#0c121e] to-[#080b12] border border-[#38bdf8]/30 rounded-[2.5rem] p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#38bdf8]/5 rounded-full blur-3xl pointer-events-none"></div>

                    <div>
                        <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                            <div>
                                <span className="text-[#38bdf8] text-[10px] font-bold uppercase tracking-widest block mb-1">
                                    {activeStatementData.scopeName}
                                </span>
                                <h3 className="text-xl font-bold font-hero-display text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#38bdf8]">water_drop</span>
                                    {viewMode === 'today' ? 'Daily Hydration Count' : (viewMode === 'daily' ? 'Daily Hydration Count' : `${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Hydration Count`)}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                                    activeStatementData.waterPercent >= 100 
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                        : 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30'
                                }`}>
                                    {activeStatementData.waterPercent >= 100 ? 'Target Completed' : 'In Progress'}
                                </span>
                                {(viewMode === 'today' || viewMode === 'daily') ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const targetD = viewMode === 'today' ? todayStr : selectedDayDate;
                                            navigate(`/dashboard/user/progress?section=water&date=${targetD}#water-section`);
                                        }}
                                        className="px-3 py-1 rounded-full bg-gradient-to-r from-[#38bdf8]/20 to-cyan-500/20 hover:from-[#38bdf8]/30 hover:to-cyan-500/30 text-[#38bdf8] hover:text-white border border-[#38bdf8]/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                                        title="Navigate to Smart Hydration Tracker on Progress Page"
                                    >
                                        <span className="material-symbols-outlined text-sm">water_drop</span>
                                        <span>+ Log Water Count</span>
                                    </button>
                                ) : (
                                    <span 
                                        className="text-[10px] font-semibold text-white/40 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 flex items-center gap-1"
                                        title="Hydration logging is restricted to single-day entry only. Switch to Daily or Today view to log water."
                                    >
                                        <span className="material-symbols-outlined text-xs text-amber-400/80">lock</span>
                                        <span>Daily Log Only</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Hydration Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 my-6 text-center">
                            <div className="bg-[#080b12]/80 p-4 rounded-2xl border border-white/5">
                                <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                                    {activeStatementData.daysCount > 1 ? `${activeStatementData.daysCount}-Day Target` : 'Total Target'}
                                </span>
                                <strong className="text-xl font-bold text-white">
                                    {activeStatementData.daysCount > 1 ? `${activeStatementData.cumulativeWaterTarget} L` : `${targets.water} L`}
                                </strong>
                                <span className="text-[10px] text-white/40 block mt-0.5">
                                    {activeStatementData.daysCount > 1 ? `(${targets.water} L/day baseline)` : `${targetWaterMl} ml`}
                                </span>
                            </div>

                            <div className="bg-[#080b12]/80 p-4 rounded-2xl border border-[#38bdf8]/30">
                                <span className="text-[10px] uppercase font-bold text-[#38bdf8]/70 block mb-1">
                                    {activeStatementData.daysCount === 1 ? 'Water Taken' : 'Avg Taken / Day'}
                                </span>
                                <strong className="text-xl font-bold text-[#38bdf8]">
                                    {(activeStatementData.waterConsumed / 1000).toFixed(2)} L
                                </strong>
                                <span className="text-[10px] text-[#38bdf8]/60 block mt-0.5">
                                    {activeStatementData.waterConsumed} ml/day
                                </span>
                            </div>

                            <div className="bg-[#080b12]/80 p-4 rounded-2xl border border-white/5">
                                <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">% Completed</span>
                                <strong className="text-xl font-bold text-[#a5d391]">{activeStatementData.waterPercent}%</strong>
                                <span className="text-[10px] text-white/40 block mt-0.5">
                                    {activeStatementData.daysCount > 1 
                                        ? `${activeStatementData.cumulativeWaterConsumed} L of ${activeStatementData.cumulativeWaterTarget} L` 
                                        : (activeStatementData.waterDeficit > 0 ? `${activeStatementData.waterDeficit} ml left` : 'Completed')}
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-white/50">
                                <span>Hydration Completion Progress</span>
                                <span className="font-bold text-white">{activeStatementData.waterPercent}%</span>
                            </div>
                            <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden p-0.5">
                                <div 
                                    className="h-full bg-gradient-to-r from-[#38bdf8] to-[#a5d391] rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                                    style={{ width: `${Math.min(activeStatementData.waterPercent, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
                        <span>Total Fluid Intake: <strong className="text-white">{activeStatementData.daysCount > 1 ? `${activeStatementData.cumulativeWaterConsumed} L` : `${activeStatementData.totalWaterLiters} L`}</strong></span>
                        <span>Adherence Velocity: <strong className="text-[#a5d391]">{activeStatementData.adherenceRate}</strong></span>
                    </div>
                </div>

                {/* Daily Nutrition Count & Progress Card */}
                <div className="bg-gradient-to-br from-[#0c121e] to-[#080b12] border border-[#a5d391]/30 rounded-[2.5rem] p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#a5d391]/5 rounded-full blur-3xl pointer-events-none"></div>

                    <div>
                        <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                            <div>
                                <span className="text-[#a5d391] text-[10px] font-bold uppercase tracking-widest block mb-1">
                                    {activeStatementData.scopeName}
                                </span>
                                <h3 className="text-xl font-bold font-hero-display text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#a5d391]">restaurant</span>
                                    {viewMode === 'today' ? 'Daily Nutrition Count' : (viewMode === 'daily' ? 'Daily Nutrition Count' : `${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Nutrition Count`)}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-[#a5d391]/15 text-[#a5d391] border border-[#a5d391]/30">
                                    {activeStatementData.caloriePercent}% Calorie Target Met
                                </span>
                                {(viewMode === 'today' || viewMode === 'daily') ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const targetD = viewMode === 'today' ? todayStr : selectedDayDate;
                                            navigate(`/dashboard/user/progress?section=nutrition&date=${targetD}#nutrition-section`);
                                        }}
                                        className="px-3 py-1 rounded-full bg-gradient-to-r from-[#a5d391]/20 to-emerald-500/20 hover:from-[#a5d391]/30 hover:to-emerald-500/30 text-[#a5d391] hover:text-white border border-[#a5d391]/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                                        title="Navigate to Daily Nutrition Count on Progress Page"
                                    >
                                        <span className="material-symbols-outlined text-sm">edit_calendar</span>
                                        <span>+ Log Daily Count</span>
                                    </button>
                                ) : (
                                    <span 
                                        className="text-[10px] font-semibold text-white/40 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 flex items-center gap-1"
                                        title="Nutrition logging is restricted to single-day entry only. Switch to Daily or Today view to log nutrition."
                                    >
                                        <span className="material-symbols-outlined text-xs text-amber-400/80">lock</span>
                                        <span>Daily Log Only</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Calories Progress Meter */}
                        <div className="bg-[#080b12]/80 p-4 rounded-2xl border border-white/5 mb-4">
                            <div className="flex justify-between items-baseline mb-2">
                                <div className="text-xs text-white/50">
                                    {activeStatementData.daysCount > 1 
                                        ? `Cumulative Target: ${activeStatementData.cumulativeCalorieTarget.toLocaleString()} kcal (${activeStatementData.daysCount} Days)`
                                        : `Daily Calorie Target: ${targetCalories} kcal`}
                                </div>
                                <div className="text-base font-extrabold text-[#a5d391]">
                                    {activeStatementData.daysCount > 1 
                                        ? `${activeStatementData.cumulativeCalories.toLocaleString()} kcal` 
                                        : `${activeStatementData.calories} kcal`} 
                                    <span className="text-xs font-normal text-white/50"> ({activeStatementData.caloriePercent}%)</span>
                                </div>
                            </div>
                            <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-700 ${
                                        activeStatementData.calories > targetCalories ? 'bg-amber-400' : 'bg-[#a5d391]'
                                    }`}
                                    style={{ width: `${Math.min(activeStatementData.caloriePercent, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-white/40 mt-1.5">
                                <span>
                                    {activeStatementData.daysCount > 1 
                                        ? `Daily Average: ${activeStatementData.avgCalories} kcal/day (Baseline: ${targetCalories} kcal)`
                                        : (activeStatementData.calorieRemaining > 0 ? `${activeStatementData.calorieRemaining} kcal remaining` : 'Target met')}
                                </span>
                                <span>
                                    {activeStatementData.avgCalories > targetCalories 
                                        ? `+${activeStatementData.avgCalories - targetCalories} kcal surplus` 
                                        : `${targetCalories - activeStatementData.avgCalories} kcal deficit (On track)`}
                                </span>
                            </div>
                        </div>

                        {/* Macronutrient Tri-Split */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                            {/* Protein */}
                            <div className="bg-[#080b12]/60 p-3 rounded-2xl border border-[#a5d391]/20">
                                <span className="text-[9px] uppercase font-bold text-[#a5d391]/70 block mb-1">Protein</span>
                                <strong className="text-base font-bold text-[#a5d391]">{activeStatementData.protein}g</strong>
                                <span className="text-[10px] text-white/40 block">/ {targetProtein}g/day</span>
                                <span className="text-[10px] font-bold text-white/80 block mt-1">
                                    {activeStatementData.daysCount > 1 ? `${activeStatementData.cumulativeProtein}g total (${activeStatementData.proteinPercent}%)` : `${activeStatementData.proteinPercent}%`}
                                </span>
                            </div>

                            {/* Carbs */}
                            <div className="bg-[#080b12]/60 p-3 rounded-2xl border border-[#38bdf8]/20">
                                <span className="text-[9px] uppercase font-bold text-[#38bdf8]/70 block mb-1">Carbohydrates</span>
                                <strong className="text-base font-bold text-[#38bdf8]">{activeStatementData.carbs}g</strong>
                                <span className="text-[10px] text-white/40 block">/ {targetCarbs}g/day</span>
                                <span className="text-[10px] font-bold text-white/80 block mt-1">
                                    {activeStatementData.daysCount > 1 ? `${activeStatementData.cumulativeCarbs}g total (${activeStatementData.carbsPercent}%)` : `${activeStatementData.carbsPercent}%`}
                                </span>
                            </div>

                            {/* Fats */}
                            <div className="bg-[#080b12]/60 p-3 rounded-2xl border border-yellow-400/20">
                                <span className="text-[9px] uppercase font-bold text-yellow-400/70 block mb-1">Fats</span>
                                <strong className="text-base font-bold text-yellow-400">{activeStatementData.fats}g</strong>
                                <span className="text-[10px] text-white/40 block">/ {targetFats}g/day</span>
                                <span className="text-[10px] font-bold text-white/80 block mt-1">
                                    {activeStatementData.daysCount > 1 ? `${activeStatementData.cumulativeFats}g total (${activeStatementData.fatsPercent}%)` : `${activeStatementData.fatsPercent}%`}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
                        <span>Period Average: <strong className="text-white">{activeStatementData.avgCalories} kcal/day</strong></span>
                        <span>Macro Compliance: <strong className="text-[#a5d391]">{activeStatementData.nutritionScore}</strong></span>
                    </div>
                </div>
            </div>

            {/* 2. AGGREGATED VISITS REPORT SUMMARY BLOCK */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#a5d391]">analytics</span>
                            <h3 className="text-xl font-bold font-hero-display text-white">{aggregatedMetrics.title}</h3>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5">{aggregatedMetrics.subtitle}</p>
                    </div>

                    <span className="text-xs font-mono font-bold text-[#a5d391] bg-[#a5d391]/10 px-3.5 py-1.5 rounded-full border border-[#a5d391]/30">
                        Visits Logged: {aggregatedMetrics.loggedVisits}
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
                    <div className="bg-[#080b12]/80 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-1">Total Fluid Intake</span>
                        <div className="text-xl font-bold text-[#38bdf8]">{aggregatedMetrics.totalWaterLiters} L</div>
                        <span className="text-[10px] text-white/40 block mt-0.5">Avg {aggregatedMetrics.avgWaterLiters} L/day</span>
                    </div>

                    <div className="bg-[#080b12]/80 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-1">Fluid Compliance</span>
                        <div className="text-xl font-bold text-[#a5d391]">{aggregatedMetrics.hydrationAdherence}</div>
                        <span className="text-[10px] text-emerald-400 block mt-0.5">Optimal Range</span>
                    </div>

                    <div className="bg-[#080b12]/80 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-1">Average Daily Cal</span>
                        <div className="text-xl font-bold text-amber-400">{aggregatedMetrics.avgCalories}</div>
                        <span className="text-[10px] text-white/40 block mt-0.5">Target: {targetCalories} kcal</span>
                    </div>

                    <div className="bg-[#080b12]/80 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-1">Avg Protein Intake</span>
                        <div className="text-xl font-bold text-[#a5d391]">{aggregatedMetrics.avgProtein}g</div>
                        <span className="text-[10px] text-white/40 block mt-0.5">Daily average</span>
                    </div>

                    <div className="bg-[#080b12]/80 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-1">Avg Carbohydrates</span>
                        <div className="text-xl font-bold text-[#38bdf8]">{aggregatedMetrics.avgCarbs}g</div>
                        <span className="text-[10px] text-white/40 block mt-0.5">Daily average</span>
                    </div>

                    <div className="bg-[#080b12]/80 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-1">Nutrition Score</span>
                        <div className="text-xl font-bold text-white">{aggregatedMetrics.nutritionAdherence}</div>
                        <span className="text-[10px] text-[#a5d391] block mt-0.5">Clinical Grade</span>
                    </div>
                </div>
            </div>

            {/* 3. INTERACTIVE GRAPHS & CUSTOM INTERVAL INPUT SECTION */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-xl space-y-6">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#a5d391]">show_chart</span>
                            <h2 className="text-xl font-bold font-hero-display text-white">Longitudinal Performance Curves</h2>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5">
                            {selectedInterval === 'STATEMENT'
                                ? `Displaying telemetry curve for the duration selected in the Statement Controller above (${activeStatementData.scopeName} • ${activeStatementData.dateLabel}).`
                                : `Displaying telemetry curve for ${INTERVAL_PRESETS.find(p => p.id === selectedInterval)?.label || selectedInterval}. (Click 'Statement Duration' to match the Statement Controller above).`}
                        </p>
                    </div>

                    {/* Graph Mode Buttons: Hydration vs Nutrition vs Macros */}
                    <div className="flex items-center gap-2 bg-[#080b12]/80 p-1.5 rounded-2xl border border-white/10 self-stretch sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setActiveGraphMetric('hydration')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                activeGraphMetric === 'hydration'
                                    ? 'bg-[#38bdf8] text-black font-black shadow-sm'
                                    : 'text-white/60 hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">water_drop</span>
                            <span>Hydration Curve</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveGraphMetric('nutrition')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                activeGraphMetric === 'nutrition'
                                    ? 'bg-[#fbbf24] text-black font-black shadow-sm'
                                    : 'text-white/60 hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">local_fire_department</span>
                            <span>Calories Curve</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveGraphMetric('macros')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                activeGraphMetric === 'macros'
                                    ? 'bg-[#a5d391] text-black font-black shadow-sm'
                                    : 'text-white/60 hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">bar_chart</span>
                            <span>Macros Split</span>
                        </button>
                    </div>
                </div>

                {/* One-line clarification notice */}
                <div className="flex items-center gap-2 bg-[#080b12]/80 border border-white/10 px-4 py-2.5 rounded-xl text-xs text-white/70">
                    <span className="material-symbols-outlined text-[#38bdf8] text-sm shrink-0">info</span>
                    <span className="truncate">Click <strong>Statement Duration</strong> to see the graph of the duration selected in the Statement Controller above, or choose any preset below for viewing. (Exported PDF always captures the Statement Controller duration).</span>
                </div>

                {/* Interval Presets & Custom Input Bar */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Interval Presets (Statement Duration + 1 Day to 1 Year) */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mr-1">Interval:</span>

                        {/* Direct Option to see the graph of the duration selected in the Statement Controller above */}
                        <button
                            type="button"
                            onClick={() => setSelectedInterval('STATEMENT')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                selectedInterval === 'STATEMENT'
                                    ? 'bg-[#a5d391] text-black font-extrabold shadow-sm ring-1 ring-[#a5d391]'
                                    : 'bg-[#a5d391]/10 hover:bg-[#a5d391]/20 text-[#a5d391] border border-[#a5d391]/30'
                            }`}
                            title={`Show graph for the duration selected in the Statement Controller above (${activeStatementData.scopeName})`}
                        >
                            <span className="material-symbols-outlined text-xs">sync</span>
                            <span>Statement Duration ({activeStatementData.shortDate})</span>
                        </button>

                        {INTERVAL_PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => setSelectedInterval(preset.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    selectedInterval === preset.id
                                        ? 'bg-[#a5d391] text-black font-extrabold shadow-sm'
                                        : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom Date Selector (When CUSTOM is active - Restricted strictly to ONE date) */}
                    {selectedInterval === 'CUSTOM' && (
                        <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
                            <span className="text-xs font-bold text-white/50 uppercase tracking-wide">Select Date:</span>
                            <DarkCalendarPicker
                                value={customSingleDate}
                                onChange={(val) => setCustomSingleDate(val)}
                                maxDate={todayStr}
                                mode="day"
                            />
                            <button
                                type="button"
                                onClick={() => setCustomSingleDate(todayStr)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    customSingleDate === todayStr ? 'bg-[#a5d391] text-black border-[#a5d391]' : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                                }`}
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => setCustomSingleDate(yesterdayStr)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    customSingleDate === yesterdayStr ? 'bg-[#a5d391] text-black border-[#a5d391]' : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                                }`}
                            >
                                Yesterday
                            </button>
                        </div>
                    )}
                </div>

                {/* Graph Visualization Canvas */}
                <div className="h-[280px] sm:h-[320px] lg:h-[360px] w-full pt-4">
                    {activeGraphMetric === 'hydration' && (
                        <Line data={hydrationChartConfig} options={commonChartOptions} />
                    )}
                    {activeGraphMetric === 'nutrition' && (
                        <Line data={nutritionChartConfig} options={commonChartOptions} />
                    )}
                    {activeGraphMetric === 'macros' && (
                        <Bar data={macrosChartConfig} options={commonChartOptions} />
                    )}
                </div>
            </div>



            {/* DAILY NUTRITION LOGGING MODAL: Strictly single-day logging */}
            <LogDailyNutritionModal
                isOpen={isLogNutritionModalOpen}
                onClose={() => setIsLogNutritionModalOpen(false)}
                initialDate={logNutritionTargetDate}
                todayStr={todayStr}
                yesterdayStr={yesterdayStr}
                targets={targets}
                onLogUpdated={(dateLogged, foods, msg) => {
                    setNutritionLogVersion(v => v + 1);
                    if (dateLogged === todayStr) {
                        const totals = foods.reduce((acc, f) => ({
                            calories: acc.calories + (f.calories || 0),
                            protein: acc.protein + (f.protein || 0),
                            carbs: acc.carbs + (f.carbs || 0),
                            fats: acc.fats + (f.fats || 0)
                        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
                        setTodayNutrition(totals);
                    }
                    setDownloadSuccessToast(msg || `Daily nutrition count for ${dateLogged} saved successfully.`);
                    setTimeout(() => setDownloadSuccessToast(null), 4000);
                }}
            />

            {/* DAILY WATER LOGGING MODAL: Strictly single-day logging */}
            <LogDailyWaterModal
                isOpen={isLogWaterModalOpen}
                onClose={() => setIsLogWaterModalOpen(false)}
                initialDate={logWaterTargetDate}
                todayStr={todayStr}
                yesterdayStr={yesterdayStr}
                targetWaterMl={targetWaterMl}
                targets={targets}
                onWaterUpdated={(dateLogged, totalMl, msg) => {
                    setNutritionLogVersion(v => v + 1);
                    if (dateLogged === todayStr) {
                        setWaterConsumedMl(totalMl);
                    }
                    setDownloadSuccessToast(msg || `Fluid intake for ${dateLogged} saved successfully.`);
                    setTimeout(() => setDownloadSuccessToast(null), 4000);
                }}
            />
        </div>
    );
};

/**
 * LogDailyNutritionModal Component
 * Allows users to log or adjust previous days' daily nutrition count (or today).
 * Strictly enforced to single-day resolution (no weekly/multi-day batch entry).
 */
const LogDailyNutritionModal = ({
    isOpen,
    onClose,
    initialDate,
    todayStr,
    yesterdayStr,
    targets,
    onLogUpdated
}) => {
    const [selectedDate, setSelectedDate] = useState(initialDate || todayStr);
    const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'database'

    // Direct Nutrition Totals State
    const [directCalories, setDirectCalories] = useState('');
    const [directProtein, setDirectProtein] = useState('');
    const [directCarbs, setDirectCarbs] = useState('');
    const [directFats, setDirectFats] = useState('');
    const [directLabel, setDirectLabel] = useState('Daily Nutrition Count');

    // Food Database Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedFood, setSelectedFood] = useState(null);
    const [servingMultiplier, setServingMultiplier] = useState(1);
    const [selectedMeal, setSelectedMeal] = useState('Breakfast');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Current Logged Foods State for the active date
    const [dayLoggedFoods, setDayLoggedFoods] = useState([]);
    const [feedbackMsg, setFeedbackMsg] = useState(null);

    const searchRef = useRef(null);

    // Sync selectedDate with initialDate prop when modal opens
    useEffect(() => {
        if (initialDate) setSelectedDate(initialDate);
    }, [initialDate, isOpen]);

    // Load logged foods whenever selectedDate or isOpen changes
    useEffect(() => {
        if (!isOpen) return;
        try {
            const saved = localStorage.getItem(`nutrimunch_logged_foods_${selectedDate}`);
            if (saved) {
                setDayLoggedFoods(JSON.parse(saved));
            } else {
                setDayLoggedFoods([]);
            }
        } catch (e) {
            setDayLoggedFoods([]);
        }
        setFeedbackMsg(null);
    }, [selectedDate, isOpen]);

    // Handle outside clicks to close autocomplete dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Current day calculated totals
    const dayTotals = useMemo(() => {
        return dayLoggedFoods.reduce((acc, f) => ({
            calories: acc.calories + (f.calories || 0),
            protein: acc.protein + (f.protein || 0),
            carbs: acc.carbs + (f.carbs || 0),
            fats: acc.fats + (f.fats || 0)
        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
    }, [dayLoggedFoods]);

    if (!isOpen) return null;

    // Helper: Persist updated array to localStorage and notify parent
    const persistLoggedFoods = (updatedFoods, successMessage) => {
        try {
            localStorage.setItem(`nutrimunch_logged_foods_${selectedDate}`, JSON.stringify(updatedFoods));
            setDayLoggedFoods(updatedFoods);
            window.dispatchEvent(new Event('storage'));
            if (onLogUpdated) {
                onLogUpdated(selectedDate, updatedFoods, successMessage);
            }
            setFeedbackMsg(successMessage || 'Updated successfully');
            setTimeout(() => setFeedbackMsg(null), 3500);
        } catch (e) {
            console.error('Failed to save nutrition log:', e);
        }
    };

    // Handler: Search Food Database
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.trim().length > 0) {
            const results = searchFoodDatabase(query, 10);
            setSearchResults(results);
            setIsDropdownOpen(true);
        } else {
            setSearchResults([]);
            setIsDropdownOpen(false);
        }
    };

    // Handler: Select item from autocomplete
    const handleSelectFood = (food) => {
        setSelectedFood(food);
        setServingMultiplier(1);
        setIsDropdownOpen(false);
        setSearchQuery(food.name);
    };

    // Handler: Save Direct Daily Count
    const handleSaveDirect = (e) => {
        e.preventDefault();
        const cal = parseInt(directCalories, 10);
        if (isNaN(cal) || cal <= 0) {
            setFeedbackMsg('Please enter a valid calorie count (e.g. 1850).');
            return;
        }

        const newEntry = {
            id: `log_direct_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: directLabel.trim() || 'Daily Nutrition Total',
            category: 'Daily Direct Log',
            mealType: 'Daily Total',
            servingSize: '1 Day',
            multiplier: 1,
            calories: cal,
            protein: parseFloat(directProtein) || 0,
            carbs: parseFloat(directCarbs) || 0,
            fats: parseFloat(directFats) || 0,
            loggedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };

        const updated = [...dayLoggedFoods, newEntry];
        persistLoggedFoods(updated, `Logged ${cal} kcal for ${selectedDate}`);
        setDirectCalories('');
        setDirectProtein('');
        setDirectCarbs('');
        setDirectFats('');
    };

    // Handler: Add from Database
    const handleAddFromDatabase = (e) => {
        e.preventDefault();
        if (!selectedFood) {
            setFeedbackMsg('Please select a food item from the search results.');
            return;
        }

        const mult = Math.max(0.1, parseFloat(servingMultiplier) || 1);
        const newEntry = {
            id: `log_db_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            foodId: selectedFood.id,
            name: selectedFood.name,
            category: selectedFood.category,
            mealType: selectedMeal,
            servingSize: selectedFood.servingSize,
            multiplier: mult,
            calories: Math.round(selectedFood.calories * mult),
            protein: parseFloat((selectedFood.protein * mult).toFixed(1)),
            carbs: parseFloat((selectedFood.carbs * mult).toFixed(1)),
            fats: parseFloat((selectedFood.fats * mult).toFixed(1)),
            loggedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };

        const updated = [...dayLoggedFoods, newEntry];
        persistLoggedFoods(updated, `Added ${selectedFood.name} (${newEntry.calories} kcal)`);
        setSelectedFood(null);
        setSearchQuery('');
        setServingMultiplier(1);
    };

    // Handler: Delete single item
    const handleDeleteItem = (id) => {
        const updated = dayLoggedFoods.filter(f => f.id !== id);
        persistLoggedFoods(updated, 'Entry removed');
    };

    // Handler: Clear all for this date
    const handleClearDay = () => {
        if (window.confirm(`Clear all ${dayLoggedFoods.length} logged entries for ${selectedDate}?`)) {
            persistLoggedFoods([], `Cleared all entries for ${selectedDate}`);
        }
    };

    const formattedSelectedDate = new Date(selectedDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#0c121e] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
                
                {/* Modal Header */}
                <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#0c121e] via-[#080b12] to-[#0c121e]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#a5d391]/15 border border-[#a5d391]/30 flex items-center justify-center text-[#a5d391] shrink-0">
                            <span className="material-symbols-outlined text-xl">edit_calendar</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span>Log Daily Nutrition Count</span>
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#a5d391]/15 text-[#a5d391] border border-[#a5d391]/30">
                                    Daily Only
                                </span>
                            </h3>
                            <p className="text-xs text-white/50">
                                Log verified nutrition metrics for previous calendar days or today.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin scrollbar-thumb-white/10">
                    
                    {/* Clinical Single-Day Constraint Alert */}
                    <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/25 flex items-start gap-2.5 text-xs text-amber-300">
                        <span className="material-symbols-outlined text-amber-400 text-base shrink-0 mt-0.5">verified_user</span>
                        <div>
                            <strong className="font-bold">Daily-Wise Logging Policy: </strong>
                            Nutrition count can only be added for a specific single day. Multi-day or weekly bulk batch logging is disabled to maintain clinical telemetry integrity.
                        </div>
                    </div>

                    {/* Single Date Selector Bar */}
                    <div className="bg-[#080b12] p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase text-white/50 tracking-wider">Date to Log:</span>
                            <DarkCalendarPicker
                                value={selectedDate}
                                onChange={(val) => setSelectedDate(val)}
                                maxDate={todayStr}
                                mode="day"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setSelectedDate(todayStr)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    selectedDate === todayStr ? 'bg-[#a5d391] text-black border-[#a5d391]' : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                                }`}
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(yesterdayStr)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    selectedDate === yesterdayStr ? 'bg-[#a5d391] text-black border-[#a5d391]' : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                                }`}
                            >
                                Yesterday
                            </button>
                        </div>
                    </div>

                    {/* Day Calculated Totals Banner */}
                    <div className="bg-gradient-to-br from-[#0c121e] to-[#080b12] border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3 text-xs">
                            <span className="text-white/60 font-medium">
                                Total Logged for <strong className="text-white font-bold">{formattedSelectedDate}</strong>:
                            </span>
                            <span className="text-[#a5d391] font-bold">
                                {dayTotals.calories} / {targets.calories} kcal ({targets.calories > 0 ? Math.round((dayTotals.calories / targets.calories) * 100) : 0}%)
                            </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                            <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                <span className="text-[10px] uppercase text-white/40 block font-bold">Calories</span>
                                <strong className="text-sm font-bold text-[#a5d391]">{dayTotals.calories}</strong>
                                <span className="text-[10px] text-white/40 block">kcal</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                <span className="text-[10px] uppercase text-white/40 block font-bold">Protein</span>
                                <strong className="text-sm font-bold text-[#a5d391]">{dayTotals.protein}</strong>
                                <span className="text-[10px] text-white/40 block">g / {targets.protein}g</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                <span className="text-[10px] uppercase text-white/40 block font-bold">Carbs</span>
                                <strong className="text-sm font-bold text-[#38bdf8]">{dayTotals.carbs}</strong>
                                <span className="text-[10px] text-white/40 block">g / {targets.carbs}g</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                <span className="text-[10px] uppercase text-white/40 block font-bold">Fats</span>
                                <strong className="text-sm font-bold text-amber-400">{dayTotals.fats}</strong>
                                <span className="text-[10px] text-white/40 block">g / {targets.fats}g</span>
                            </div>
                        </div>
                    </div>

                    {/* Feedback Toast Banner */}
                    {feedbackMsg && (
                        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between animate-in fade-in duration-150">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                <span>{feedbackMsg}</span>
                            </div>
                            <button type="button" onClick={() => setFeedbackMsg(null)} className="text-white/40 hover:text-white">✕</button>
                        </div>
                    )}

                    {/* Input Mode Selector Tabs */}
                    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('direct')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                activeTab === 'direct'
                                    ? 'bg-[#a5d391] text-black font-extrabold shadow-sm'
                                    : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">speed</span>
                            <span>Quick Daily Macro Count</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('database')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                activeTab === 'database'
                                    ? 'bg-[#a5d391] text-black font-extrabold shadow-sm'
                                    : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">search</span>
                            <span>Food Database Item</span>
                        </button>
                    </div>

                    {/* MODE 1: Direct Daily Totals Entry Form */}
                    {activeTab === 'direct' && (
                        <form onSubmit={handleSaveDirect} className="space-y-4 bg-[#080b12] p-4 rounded-2xl border border-white/10">
                            <div className="text-xs text-white/60 mb-2">
                                Enter the daily nutritional totals for <strong className="text-white">{formattedSelectedDate}</strong>:
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                                        Calories (kcal) *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10000"
                                        required
                                        placeholder="e.g. 1850"
                                        value={directCalories}
                                        onChange={(e) => setDirectCalories(e.target.value)}
                                        className="w-full bg-white/5 border border-white/15 focus:border-[#a5d391] rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[#a5d391]/80 uppercase block mb-1">
                                        Protein (g)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="500"
                                        step="0.5"
                                        placeholder="e.g. 120"
                                        value={directProtein}
                                        onChange={(e) => setDirectProtein(e.target.value)}
                                        className="w-full bg-white/5 border border-white/15 focus:border-[#a5d391] rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[#38bdf8]/80 uppercase block mb-1">
                                        Carbs (g)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="1000"
                                        step="0.5"
                                        placeholder="e.g. 190"
                                        value={directCarbs}
                                        onChange={(e) => setDirectCarbs(e.target.value)}
                                        className="w-full bg-white/5 border border-white/15 focus:border-[#38bdf8] rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-amber-400/80 uppercase block mb-1">
                                        Fats (g)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="300"
                                        step="0.5"
                                        placeholder="e.g. 55"
                                        value={directFats}
                                        onChange={(e) => setDirectFats(e.target.value)}
                                        className="w-full bg-white/5 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
                                <input
                                    type="text"
                                    placeholder="Optional note / label (e.g. Whole Day Total, Home Cooked)"
                                    value={directLabel}
                                    onChange={(e) => setDirectLabel(e.target.value)}
                                    className="w-full sm:w-2/3 bg-white/5 border border-white/15 focus:border-[#a5d391] rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                                <button
                                    type="submit"
                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#a5d391] hover:bg-[#b2e29e] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0"
                                >
                                    <span className="material-symbols-outlined text-sm font-bold">add_task</span>
                                    <span>Save Daily Count</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* MODE 2: Food Database Item Logger */}
                    {activeTab === 'database' && (
                        <form onSubmit={handleAddFromDatabase} className="space-y-4 bg-[#080b12] p-4 rounded-2xl border border-white/10">
                            <div className="text-xs text-white/60 mb-2">
                                Search and add food items to <strong className="text-white">{formattedSelectedDate}</strong>:
                            </div>

                            {/* Search Autocomplete */}
                            <div ref={searchRef} className="relative">
                                <div className="flex items-center gap-2 bg-white/5 border border-white/15 focus-within:border-[#a5d391] rounded-xl px-3 py-2">
                                    <span className="material-symbols-outlined text-white/40 text-sm">search</span>
                                    <input
                                        type="text"
                                        placeholder="Search food database (e.g. Oatmeal, Chicken, Salmon, Roti)..."
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                        onFocus={() => searchQuery.trim() && setIsDropdownOpen(true)}
                                        className="w-full bg-transparent text-xs text-white outline-none"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => { setSearchQuery(''); setSelectedFood(null); }}
                                            className="text-white/40 hover:text-white text-xs"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Autocomplete Dropdown */}
                                {isDropdownOpen && searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0c121e] border border-white/20 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-20 scrollbar-thin">
                                        {searchResults.map((food) => (
                                            <div
                                                key={food.id}
                                                onClick={() => handleSelectFood(food)}
                                                className="p-2.5 hover:bg-white/10 transition-colors cursor-pointer border-b border-white/5 last:border-0 flex items-center justify-between text-xs"
                                            >
                                                <div>
                                                    <span className="font-bold text-white block">{food.name}</span>
                                                    <span className="text-[10px] text-white/40">{food.category} • {food.servingSize}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-mono font-bold text-[#a5d391] block">{food.calories} kcal</span>
                                                    <span className="text-[10px] text-white/40">P: {food.protein}g • C: {food.carbs}g • F: {food.fats}g</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected Food Modifier Form */}
                            {selectedFood && (
                                <div className="p-3 rounded-xl bg-white/5 border border-[#a5d391]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-[#a5d391] block">Selected Item:</span>
                                        <strong className="text-sm text-white font-bold">{selectedFood.name}</strong>
                                        <span className="text-white/40 block text-[11px]">
                                            Base: {selectedFood.calories} kcal • P: {selectedFood.protein}g • C: {selectedFood.carbs}g • F: {selectedFood.fats}g ({selectedFood.servingSize})
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">Meal</label>
                                            <select
                                                value={selectedMeal}
                                                onChange={(e) => setSelectedMeal(e.target.value)}
                                                className="bg-[#080b12] border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                                            >
                                                <option value="Breakfast">Breakfast</option>
                                                <option value="Lunch">Lunch</option>
                                                <option value="Dinner">Dinner</option>
                                                <option value="Snack">Snack</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">Servings</label>
                                            <input
                                                type="number"
                                                min="0.1"
                                                max="10"
                                                step="0.25"
                                                value={servingMultiplier}
                                                onChange={(e) => setServingMultiplier(e.target.value)}
                                                className="w-16 bg-[#080b12] border border-white/15 rounded-xl px-2 py-1.5 text-xs text-white font-mono font-bold text-center outline-none"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            className="px-4 py-2 mt-4 rounded-xl bg-[#a5d391] hover:bg-[#b2e29e] text-black font-extrabold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md"
                                        >
                                            <span className="material-symbols-outlined text-sm font-bold">add</span>
                                            <span>Add Item</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    )}

                    {/* Logged Foods List for this day */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase text-white/50 tracking-wider">
                                Logged Entries ({dayLoggedFoods.length})
                            </span>
                            {dayLoggedFoods.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleClearDay}
                                    className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-xs">delete_sweep</span>
                                    <span>Clear All for This Day</span>
                                </button>
                            )}
                        </div>

                        {dayLoggedFoods.length === 0 ? (
                            <div className="p-6 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center text-xs text-white/40">
                                <span className="material-symbols-outlined text-2xl text-white/20 block mb-1">restaurant_menu</span>
                                No nutrition entries logged yet for {formattedSelectedDate}.<br />
                                Enter daily totals above or add items from the food database.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                                {dayLoggedFoods.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-between text-xs transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#a5d391] shrink-0 font-bold text-xs">
                                                {item.mealType ? item.mealType.charAt(0) : 'D'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white">{item.name}</span>
                                                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-white/10 text-white/60">
                                                        {item.mealType || 'Daily Total'}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-white/40 block">
                                                    {item.servingSize} {item.multiplier && item.multiplier !== 1 ? `(${item.multiplier}x)` : ''} • P: {item.protein || 0}g • C: {item.carbs || 0}g • F: {item.fats || 0}g
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <strong className="font-mono text-sm font-bold text-[#a5d391]">
                                                {item.calories} kcal
                                            </strong>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                                                title="Delete entry"
                                            >
                                                <span className="material-symbols-outlined text-xs">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:p-5 border-t border-white/10 bg-[#080b12] flex items-center justify-between text-xs text-white/50">
                    <span>
                        Selected Day: <strong className="text-white font-bold">{selectedDate}</strong>
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * LogDailyWaterModal Component
 * Allows users to log or adjust fluid intake for any backdated calendar day (or today).
 * Strictly single-day resolution.
 */
const LogDailyWaterModal = ({
    isOpen,
    onClose,
    initialDate,
    todayStr,
    yesterdayStr,
    targetWaterMl,
    targets,
    onWaterUpdated
}) => {
    const [selectedDate, setSelectedDate] = useState(initialDate || todayStr);
    const [waterMl, setWaterMl] = useState(0);
    const [customAddMl, setCustomAddMl] = useState('');
    const [feedbackMsg, setFeedbackMsg] = useState(null);

    // Sync selectedDate when initialDate changes
    useEffect(() => {
        if (initialDate) setSelectedDate(initialDate);
    }, [initialDate, isOpen]);

    // Load water consumption for selected date
    useEffect(() => {
        if (!isOpen) return;
        try {
            const saved = localStorage.getItem(`nutrimunch_water_consumed_${selectedDate}`);
            if (saved !== null) {
                setWaterMl(parseInt(saved, 10));
            } else if (selectedDate === todayStr) {
                const todaySaved = localStorage.getItem('nutrimunch_water_consumed');
                setWaterMl(todaySaved ? parseInt(todaySaved, 10) : 0);
            } else {
                setWaterMl(0);
            }
        } catch (e) {
            setWaterMl(0);
        }
        setFeedbackMsg(null);
    }, [selectedDate, isOpen, todayStr]);

    if (!isOpen) return null;

    const persistWater = (amount, msg) => {
        try {
            localStorage.setItem(`nutrimunch_water_consumed_${selectedDate}`, amount.toString());
            if (selectedDate === todayStr) {
                localStorage.setItem('nutrimunch_water_consumed', amount.toString());
            }
            setWaterMl(amount);
            window.dispatchEvent(new Event('storage'));
            if (onWaterUpdated) {
                onWaterUpdated(selectedDate, amount, msg);
            }
            setFeedbackMsg(msg);
            setTimeout(() => setFeedbackMsg(null), 3000);
        } catch (e) {
            console.error('Failed to save water log:', e);
        }
    };

    const handleAdd = (delta) => {
        const next = Math.max(0, waterMl + delta);
        persistWater(next, `Added +${delta} ml for ${selectedDate} (Total: ${next} ml)`);
    };

    const handleSetTotal = (e) => {
        e.preventDefault();
        const val = parseInt(customAddMl, 10);
        if (isNaN(val) || val < 0) {
            setFeedbackMsg('Please enter a valid fluid amount in ml.');
            return;
        }
        persistWater(val, `Set daily fluid total to ${val} ml for ${selectedDate}`);
        setCustomAddMl('');
    };

    const handleReset = () => {
        if (window.confirm(`Reset fluid intake for ${selectedDate}?`)) {
            persistWater(0, `Reset fluid intake for ${selectedDate}`);
        }
    };

    const percent = targetWaterMl > 0 ? Math.min(Math.round((waterMl / targetWaterMl) * 100), 100) : 0;
    const remaining = Math.max(targetWaterMl - waterMl, 0);

    const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#0c121e] border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl relative">
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#0c121e] via-[#080b12] to-[#0c121e]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#38bdf8]/15 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8] shrink-0">
                            <span className="material-symbols-outlined text-xl">water_drop</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span>Log Daily Water Intake</span>
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                                    Daily Only
                                </span>
                            </h3>
                            <p className="text-xs text-white/50">Record or backdate daily fluid consumption.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                    {/* Date Selector */}
                    <div className="bg-[#080b12] p-3.5 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase text-white/50 tracking-wider">Date:</span>
                            <DarkCalendarPicker
                                value={selectedDate}
                                onChange={(val) => setSelectedDate(val)}
                                maxDate={todayStr}
                                mode="day"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setSelectedDate(todayStr)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    selectedDate === todayStr ? 'bg-[#38bdf8] text-black border-[#38bdf8]' : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                                }`}
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(yesterdayStr)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    selectedDate === yesterdayStr ? 'bg-[#38bdf8] text-black border-[#38bdf8]' : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                                }`}
                            >
                                Yesterday
                            </button>
                        </div>
                    </div>

                    {/* Feedback Toast */}
                    {feedbackMsg && (
                        <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center justify-between animate-in fade-in duration-150">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                <span>{feedbackMsg}</span>
                            </div>
                            <button type="button" onClick={() => setFeedbackMsg(null)} className="text-white/40 hover:text-white">✕</button>
                        </div>
                    )}

                    {/* Fluid Progress Display */}
                    <div className="bg-gradient-to-br from-[#0c121e] to-[#080b12] border border-[#38bdf8]/30 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-baseline text-xs">
                            <span className="text-white/60">
                                Fluid for <strong className="text-white">{formattedDate}</strong>:
                            </span>
                            <span className="text-lg font-extrabold text-[#38bdf8]">
                                {waterMl.toLocaleString()} <span className="text-xs text-white/50">/ {targetWaterMl.toLocaleString()} ml ({percent}%)</span>
                            </span>
                        </div>
                        <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden p-0.5">
                            <div
                                className="h-full bg-gradient-to-r from-[#38bdf8] to-[#a5d391] rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                        <div className="text-[11px] text-white/50 flex justify-between">
                            <span>{(waterMl / 1000).toFixed(2)} L of {targets.water} L daily target</span>
                            <span>{remaining > 0 ? `${remaining.toLocaleString()} ml remaining` : '🎉 Goal achieved'}</span>
                        </div>
                    </div>

                    {/* Quick Add Increment Buttons */}
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Quick Add Fluid</span>
                        <div className="grid grid-cols-4 gap-2">
                            {[250, 500, 750, 1000].map((amt) => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => handleAdd(amt)}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-[#38bdf8]/20 border border-white/10 hover:border-[#38bdf8]/40 text-white hover:text-[#38bdf8] text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-sm">water_drop</span>
                                    <span>+{amt} ml</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Direct Set Custom Daily Total */}
                    <form onSubmit={handleSetTotal} className="flex items-center gap-2 pt-1">
                        <input
                            type="number"
                            min="0"
                            max="20000"
                            placeholder="Set exact daily total (e.g. 2400 ml)..."
                            value={customAddMl}
                            onChange={(e) => setCustomAddMl(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/15 focus:border-[#38bdf8] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-[#38bdf8] hover:bg-[#60cdff] text-black font-extrabold text-xs transition-colors cursor-pointer shrink-0"
                        >
                            Set Total
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-[#080b12] flex items-center justify-between text-xs">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">restart_alt</span>
                        <span>Reset Day's Fluid</span>
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Reports;
