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
import { fetchProgressDays, saveDayMetrics, readOfflineDay, EMPTY_DAY } from '../../../utils/progressLog';
import { escapeHtml, rawHtml, reportHtml } from '../../../utils/reportHtml';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const DEFAULT_TARGETS = {
    calories: 2000,
    protein: 140,
    carbs: 200,
    fats: 65,
    water: 2.5
};

const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Local calendar date (YYYY-MM-DD). `toISOString()` is UTC and is one day
 *  behind local time before 05:30 IST, so it must not be used for log dates. */
const toLocalDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * C6 stores PER-DAY targets only. A period statement therefore has two valid
 * denominators and must never mix them:
 *   - periodTarget  = daily x N (all calendar days)      -> "% of period target"
 *   - trackedTarget = daily x L (only days actually logged) -> "% on tracked days"
 * Both are reported explicitly, together with L/N coverage.
 */
const METRIC_KEYS = ['waterMl', 'calories', 'protein', 'carbs', 'fats'];
const buildPeriodSummary = (totals, days, loggedDays, targets) => {
    const N = Math.max(1, Math.round(days));
    const L = Math.max(0, Math.min(N, Math.round(loggedDays)));
    const daily = {
        waterMl: Math.round(Number(targets.water) * 1000),
        calories: Number(targets.calories) || 0,
        protein: Number(targets.protein) || 0,
        carbs: Number(targets.carbs) || 0,
        fats: Number(targets.fats) || 0
    };
    const cleanTotals = {}, periodTargets = {}, trackedTargets = {},
          avgPerLoggedDay = {}, periodPct = {}, trackedPct = {},
          periodDeficit = {}, trackedDeficit = {};
    METRIC_KEYS.forEach((k) => {
        const total = Math.max(0, Number(totals[k]) || 0);
        cleanTotals[k] = Math.round(total);
        periodTargets[k] = Math.round(daily[k] * N);
        trackedTargets[k] = Math.round(daily[k] * L);
        const divisor = Math.max(1, L);
        avgPerLoggedDay[k] = Math.round(total / divisor);
        periodPct[k] = periodTargets[k] > 0 ? Math.round((total / periodTargets[k]) * 100) : 0;
        trackedPct[k] = trackedTargets[k] > 0 ? Math.round((total / trackedTargets[k]) * 100) : 0;
        periodDeficit[k] = periodTargets[k] - Math.round(total);
        trackedDeficit[k] = trackedTargets[k] - Math.round(total);
    });
    return {
        days: N, loggedDays: L, coveragePct: Math.round((L / N) * 100),
        daily, totals: cleanTotals, periodTargets, trackedTargets,
        avgPerLoggedDay, periodPct, trackedPct, periodDeficit, trackedDeficit
    };
};

/** Verdict prose that always names its denominator. */
const buildStatementNarrative = (period, label) => {
    const L = period.loggedDays, N = period.days;
    const coverage = `${L} of ${N} days logged (${period.coveragePct}% coverage)`;
    const litre = (ml) => (ml / 1000).toFixed(2);
    const num = (v) => Math.round(v).toLocaleString();
    if (N === 1) {
        return {
            status: L === 0 ? 'No Intake Logged'
                : (period.trackedPct.calories > 100 || period.trackedPct.waterMl > 100
                    ? 'Above Target (Review)' : 'Daily Statement Verified'),
            keyTakeaway: L === 0
                ? `No intake was recorded for ${label}; all values are shown as 0.`
                : `Single-day intake and clinical biometric compliance for ${label}.`,
            hydrationVerdict: `Consumed ${litre(period.totals.waterMl)} L of ${litre(period.daily.waterMl)} L daily target (${period.periodPct.waterMl}% of daily target).`,
            calorieVerdict: `Logged ${num(period.totals.calories)} kcal of ${num(period.daily.calories)} kcal daily target (${period.periodPct.calories}% of daily target).`,
            macroVerdict: `Protein ${num(period.totals.protein)}g/${num(period.daily.protein)}g, Carbs ${num(period.totals.carbs)}g/${num(period.daily.carbs)}g, Fats ${num(period.totals.fats)}g/${num(period.daily.fats)}g (daily targets).`
        };
    }
    return {
        status: L === 0 ? 'No Data Logged'
            : (period.trackedPct.calories > 100 ? 'Above Target (Review)' : `${period.coveragePct}% Days Logged`),
        keyTakeaway: `Period totals are compared with the ${N}-day target; daily averages are compared with the daily target. ${coverage}.`,
        hydrationVerdict: `Period total ${litre(period.totals.waterMl)} L of ${litre(period.periodTargets.waterMl)} L ${N}-day target (${period.periodPct.waterMl}% of period target). On logged days: ${num(period.avgPerLoggedDay.waterMl)} ml/day vs ${num(period.daily.waterMl)} ml/day (${period.trackedPct.waterMl}% on tracked days).`,
        calorieVerdict: `Period total ${num(period.totals.calories)} kcal of ${num(period.periodTargets.calories)} kcal ${N}-day target (${period.periodPct.calories}% of period target). On logged days: ${num(period.avgPerLoggedDay.calories)} kcal/day vs ${num(period.daily.calories)} kcal/day (${period.trackedPct.calories}% on tracked days).`,
        macroVerdict: `Protein ${num(period.totals.protein)}g/${num(period.periodTargets.protein)}g, Carbs ${num(period.totals.carbs)}g/${num(period.periodTargets.carbs)}g, Fats ${num(period.totals.fats)}g/${num(period.periodTargets.fats)}g (period targets). ${coverage}.`
    };
};

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

/** Deliberate chart range for the exported document (defaults to statement period). */
const ExportRangeSelect = ({ value, onChange }) => (
    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
        <span>Charts in report:</span>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-[#080b12] border border-white/15 text-white text-xs rounded-lg px-2 py-1.5 cursor-pointer"
            title="Choose which period the exported report's charts cover"
        >
            <option value="STATEMENT">Statement period (default)</option>
            {INTERVAL_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
        </select>
    </label>
);

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
    const valid = allValues.map(Number).filter((v) => !isNaN(v) && v >= 0);
    // Intake values are never negative. Always start the axis at zero: a
    // 1800-2200 kcal range must not be zoomed to look like a huge swing.
    const maxVal = Math.max(...valid, 1);
    const rawStep = Math.max(1, maxVal / targetTicks);
    const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const fraction = rawStep / power;
    let niceMultiplier = 1;
    if (fraction <= 1.25) niceMultiplier = 1;
    else if (fraction <= 2.5) niceMultiplier = 2;
    else if (fraction <= 5.5) niceMultiplier = 5;
    else niceMultiplier = 10;
    const step = Math.max(1, Math.round(niceMultiplier * power));
    let maxY = Math.ceil((maxVal * 1.05) / step) * step;
    if (maxY <= 0) maxY = step;

    const tickCount = Math.min(10, Math.max(4, Math.ceil(maxY / step)));
    const ticks = [];
    for (let i = 0; i <= tickCount; i++) {
        ticks.push(Math.round((maxY * i) / tickCount));
    }
    return { minY: 0, maxY, step, ticks };
};

/**
 * Generates smooth cubic Bezier spline path ('C' commands) with tension matching Chart.js (0.35)
 */
const getSmoothCurvePath = (pts, tension = 0.35) => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    // tension 0 => straight segments between real samples, never a smoothed
    // Bezier that implies values which were never logged.
    if (tension === 0) {
        return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
            + pts.slice(1).map((pt) => ` L ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join('');
    }
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
            <text x="${padLeft - 10}" y="${y + 3.5}" font-size="9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="#94a3b8" text-anchor="end">${escapeHtml(val.toLocaleString())}</text>
        `;
    });

    // Points with coordinates
    const actualPoints = actualData.map((val, idx) => ({ x: getX(idx), y: getY(val) }));
    const pathD = getSmoothCurvePath(actualPoints, 0);
    const areaD = getSmoothAreaPath(actualPoints, baselineY, 0);

    // Target line (dashed, tension: 0)
    const targetPoints = targetData.map((val, idx) => ({ x: getX(idx), y: getY(val) }));
    const targetD = targetPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    // X Labels
    const labelStep = Math.max(1, Math.ceil(labels.length / 10));
    const xLabels = labels.map((lbl, idx) => {
        if (idx % labelStep !== 0 && idx !== labels.length - 1) return '';
        const x = getX(idx);
        return `<text x="${x.toFixed(1)}" y="${height - 10}" font-size="9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="#94a3b8" text-anchor="middle">${escapeHtml(lbl)}</text>`;
    }).join('');

    // Dots matching website Chart.js pointBackgroundColor & pointBorderColor
    const dots = actualPoints.map((p) => {
        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#080b12" stroke="${actualColor}" stroke-width="2" />`;
    }).join('');

    const allZero = actualData.every((v) => (Number(v) || 0) <= 0);
    const zeroBadge = allZero
        ? `<text x="${width - padRight}" y="${padTop + 10}" font-size="9" fill="#94a3b8" text-anchor="end">No intake logged — shown as 0</text>`
        : '';

    const gradId = `grad_${actualColor.replace(/[^a-zA-Z0-9]/g, '')}_${Math.random().toString(36).substring(2, 7)}`;

    return `
        <div class="chart-card" style="background: #080b12; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; padding: 14px 18px; margin-bottom: 18px; page-break-inside: avoid; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35); -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 8px;">
                <div style="font-weight: 700; font-size: 11pt; color: #ffffff; display: flex; align-items: center; gap: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${actualColor}; box-shadow: 0 0 8px ${actualColor};"></span>
                    ${escapeHtml(title)}
                </div>
                <div style="font-size: 8.5pt; color: #e2e8f0; display: flex; align-items: center; gap: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 16px; height: 9px; border: 2px solid ${actualColor}; background: ${actualColor}25; border-radius: 2px;"></span>
                        <span style="font-weight: 600; color: #f8fafc;">${escapeHtml(actualLabel)} (${escapeHtml(unit)})</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 16px; height: 0px; border-top: 2px dashed ${targetColor};"></span>
                        <span style="font-weight: 600; color: #f8fafc;">${escapeHtml(targetLabel)} (${escapeHtml(unit)})</span>
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
                ${zeroBadge}
            </svg>
        </div>
    `;
};

/**
 * Honest single-day chart: one "daily total" bar next to the daily target bar.
 * C6 stores only per-day totals, so there is no intra-day series to draw.
 */
const generateSvgDailyComparison = ({ title, unit, actualLabel, targetLabel, value, target,
                                      actualColor = '#38bdf8', targetColor = '#a5d391' }) => {
    const width = 680, height = 210, padLeft = 55, padRight = 20, padTop = 22, padBottom = 40;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const consumed = Math.max(0, Number(value) || 0);
    const goal = Math.max(0, Number(target) || 0);
    const maxVal = Math.max(consumed, goal, 1);
    const step = Math.pow(10, Math.floor(Math.log10(maxVal / 4))) || 1;
    const maxY = Math.ceil((maxVal * 1.1) / step) * step;
    const zeroY = padTop + plotH;
    const getY = (v) => padTop + plotH - (v / maxY) * plotH;
    const barW = 108;
    const consumedX = padLeft + plotW * 0.30 - barW / 2;
    const targetX = padLeft + plotW * 0.70 - barW / 2;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f));
    const gridLines = ticks.map((t) => `
        <line x1="${padLeft}" y1="${getY(t)}" x2="${width - padRight}" y2="${getY(t)}" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="2,3" />
        <text x="${padLeft - 10}" y="${getY(t) + 3.5}" font-size="9" fill="#94a3b8" text-anchor="end">${escapeHtml(t.toLocaleString())}</text>
    `).join('');
    const bar = (x, v, color) => {
        if (v <= 0) {
            // Show the recorded zero instead of an empty slot.
            return `<line x1="${x}" y1="${zeroY}" x2="${x + barW}" y2="${zeroY}" stroke="${color}" stroke-width="2" />`
                + `<text x="${x + barW / 2}" y="${zeroY - 6}" font-size="10" font-weight="700" fill="#f8fafc" text-anchor="middle">0</text>`;
        }
        const y = getY(v);
        return `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(0, zeroY - y)}" fill="${color}" opacity="0.85" rx="4" />
                <text x="${x + barW / 2}" y="${y - 6}" font-size="10" font-weight="700" fill="#f8fafc" text-anchor="middle">${escapeHtml(v.toLocaleString())}</text>`;
    };
    return `
        <div class="chart-card" style="background: #080b12; border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 14px 18px; margin-bottom: 18px; page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <div style="font-weight: 700; font-size: 11pt; color: #ffffff; margin-bottom: 4px;">${escapeHtml(title)}</div>
            <div style="font-size: 8.5pt; color: #94a3b8; margin-bottom: 12px;">Daily total vs profile daily target (${escapeHtml(unit)}). No intra-day timestamps are recorded.</div>
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible; display: block;">
                ${gridLines}
                ${bar(consumedX, consumed, actualColor)}
                ${bar(targetX, goal, targetColor)}
                <text x="${consumedX + barW / 2}" y="${height - 12}" font-size="9" fill="#94a3b8" text-anchor="middle">${escapeHtml(actualLabel)}</text>
                <text x="${targetX + barW / 2}" y="${height - 12}" font-size="9" fill="#94a3b8" text-anchor="middle">${escapeHtml(targetLabel)}</text>
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
            <text x="${padLeft - 8}" y="${y + 3.5}" font-size="9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="#94a3b8" text-anchor="end">${escapeHtml(val)}g</text>
        `;
    });

    let barsSvg = '';
    const labelStep = Math.max(1, Math.ceil(labels.length / 12));

    labels.forEach((lbl, idx) => {
        const groupCenterX = padLeft + idx * groupW + groupW / 2;
        const pVal = Number(proteinData[idx]) || 0;
        const cVal = Number(carbsData[idx]) || 0;
        const fVal = Number(fatsData[idx]) || 0;

        // Zero intake must draw no bar at all (previously a 1 px stub appeared,
        // making an empty period look like it had recorded data).
        const pH = pVal > 0 ? (pVal / (maxY || 1)) * plotH : 0;
        const cH = cVal > 0 ? (cVal / (maxY || 1)) * plotH : 0;
        const fH = fVal > 0 ? (fVal / (maxY || 1)) * plotH : 0;

        const pX = groupCenterX - barW * 1.5;
        const cX = groupCenterX - barW * 0.5;
        const fX = groupCenterX + barW * 0.5;

        const pY = padTop + plotH - pH;
        const cY = padTop + plotH - cH;
        const fY = padTop + plotH - fH;

        if (pH > 0) barsSvg += `<rect x="${pX}" y="${pY}" width="${barW - 0.5}" height="${pH}" fill="#a5d391" rx="2" />`;
        if (cH > 0) barsSvg += `<rect x="${cX}" y="${cY}" width="${barW - 0.5}" height="${cH}" fill="#38bdf8" rx="2" />`;
        if (fH > 0) barsSvg += `<rect x="${fX}" y="${fY}" width="${barW - 0.5}" height="${fH}" fill="#facc15" rx="2" />`;
        if (pH === 0 && cH === 0 && fH === 0) {
            barsSvg += `<text x="${groupCenterX}" y="${padTop + plotH - 4}" font-size="9" fill="#94a3b8" text-anchor="middle">0</text>`;
        }

        if (idx % labelStep === 0 || idx === labels.length - 1) {
            barsSvg += `<text x="${groupCenterX}" y="${height - 10}" font-size="9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="#94a3b8" text-anchor="middle">${escapeHtml(lbl)}</text>`;
        }
    });

    return `
        <div class="chart-card" style="background: #080b12; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; padding: 14px 18px; margin-bottom: 18px; page-break-inside: avoid; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35); -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 8px;">
                <div style="font-weight: 700; font-size: 11pt; color: #ffffff; display: flex; align-items: center; gap: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: #a5d391;"></span>
                    ${escapeHtml(title)}
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
    const todayStr = useMemo(() => toLocalDateStr(new Date()), []);

    // Active Aggregated View Mode: 'today' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    const [viewMode, setViewMode] = useState('today');

    // Statement Pickers State (Account Statement Style)
    const [selectedDayDate, setSelectedDayDate] = useState(() => toLocalDateStr(new Date()));
    const [selectedWeekDate, setSelectedWeekDate] = useState(() => toLocalDateStr(new Date()));
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

    // Charts in the exported document use this deliberately chosen range.
    // Changing the on-screen chart interval never changes the PDF.
    const [exportRange, setExportRange] = useState('STATEMENT');
    const [customSingleDate, setCustomSingleDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return toLocalDateStr(d);
    });

    // Daily Nutrition Logging Modal State (Strictly single-day resolution)
    const [isLogNutritionModalOpen, setIsLogNutritionModalOpen] = useState(false);
    const [logNutritionTargetDate] = useState(() => toLocalDateStr(new Date()));
    const [nutritionLogVersion, setNutritionLogVersion] = useState(0);

    // Daily Water Logging Modal State (Strictly single-day resolution)
    const [isLogWaterModalOpen, setIsLogWaterModalOpen] = useState(false);
    const [logWaterTargetDate] = useState(() => toLocalDateStr(new Date()));

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
    // These two states are populated from the backend progress_logs row. The
    // browser cache is read only when the server cannot be reached.
    const [waterConsumedMl, setWaterConsumedMl] = useState(0);
    const [todayNutrition, setTodayNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });

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

        // Load the authoritative daily rows from the database.
        const loadDays = () => fetchProgressDays()
            .then(days => {
                setBackendProgressLogs(days);
                const today = days[todayStr];
                if (today) {
                    setWaterConsumedMl(today.waterMl);
                    setTodayNutrition({
                        calories: today.calories, protein: today.protein,
                        carbs: today.carbs, fats: today.fats
                    });
                } else {
                    setWaterConsumedMl(0);
                    setTodayNutrition({ calories: 0, protein: 0, carbs: 0, fats: 0 });
                }
                setNutritionLogVersion(v => v + 1);
            })
            .catch(err => {
                console.error('Failed to load persisted progress logs:', err);
                setWaterConsumedMl(0);
                setTodayNutrition({ calories: 0, protein: 0, carbs: 0, fats: 0 });
                setNutritionLogVersion(v => v + 1);
            });
        loadDays();
        window.addEventListener('nutrimunch_progress_updated', loadDays);
        return () => window.removeEventListener('nutrimunch_progress_updated', loadDays);
    }, [todayStr]);

    // Re-read the authoritative rows whenever another component writes a day.
    useEffect(() => {
        const refreshMetrics = () => {
            fetchProgressDays()
                .then(days => {
                    setBackendProgressLogs(days);
                    const today = days[todayStr] || EMPTY_DAY;
                    setWaterConsumedMl(today.waterMl);
                    setTodayNutrition({
                        calories: today.calories, protein: today.protein,
                        carbs: today.carbs, fats: today.fats
                    });
                    setNutritionLogVersion(v => v + 1);
                })
                .catch(err => console.error('Failed to refresh progress logs:', err));
        };
        window.addEventListener('storage', refreshMetrics);
        window.addEventListener('nutrimunch_profile_updated', refreshMetrics);
        window.addEventListener('nutrimunch_progress_updated', refreshMetrics);
        return () => {
            window.removeEventListener('storage', refreshMetrics);
            window.removeEventListener('nutrimunch_profile_updated', refreshMetrics);
            window.removeEventListener('nutrimunch_progress_updated', refreshMetrics);
        };
    }, [todayStr]);

    // Helper: Retrieve real tracked data for any specific date string (YYYY-MM-DD)
    // The server is the ONLY source of truth for a clinical report. A date with
    // no server row is "not logged"; browser-only caches are read solely by the
    // logging modals, never silently merged into the statement.
    const getRealDayMetrics = useCallback((dateStr) => {
        const day = backendProgressLogs[dateStr] || EMPTY_DAY;
        const cals = Number(day.calories) || 0;
        const prot = Number(day.protein) || 0;
        const carbs = Number(day.carbs) || 0;
        const fats = Number(day.fats) || 0;
        const waterMl = Number(day.waterMl) || 0;

        return {
            calories: Math.round(cals),
            protein: Math.round(prot),
            carbs: Math.round(carbs),
            fats: Math.round(fats),
            waterMl: Math.round(waterMl),
            hasLog: cals > 0 || prot > 0 || carbs > 0 || fats > 0 || waterMl > 0,
            hasFood: cals > 0 || prot > 0 || carbs > 0 || fats > 0,
            hasWater: waterMl > 0
        };
    }, [backendProgressLogs]);

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

            const wDeficit = targetWaterMl - wConsumed;
            const wPct = targetWaterMl > 0 ? Math.round((wConsumed / targetWaterMl) * 100) : 0;
            const cPct = targetCalories > 0 ? Math.round((cConsumed / targetCalories) * 100) : 0;
            const cRemaining = targetCalories - cConsumed;
            const wLit = (wConsumed / 1000).toFixed(2);

            return {
                mode: 'today',
                scopeName: "Today's Live Clinical Statement",
                dateLabel: `Today, ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`,
                shortDate: 'Today',
                daysCount: 1,
                periodTotals: { waterMl: wConsumed, calories: cConsumed, protein: pConsumed, carbs: cbConsumed, fats: fConsumed },
                periodLoggedDays: (wConsumed > 0 || cConsumed > 0 || pConsumed > 0 || cbConsumed > 0 || fConsumed > 0) ? 1 : 0,
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
                proteinPercent: targetProtein > 0 ? Math.round((pConsumed / targetProtein) * 100) : 0,
                carbs: cbConsumed,
                cumulativeCarbs: cbConsumed,
                carbsPercent: targetCarbs > 0 ? Math.round((cbConsumed / targetCarbs) * 100) : 0,
                fats: fConsumed,
                cumulativeFats: fConsumed,
                fatsPercent: targetFats > 0 ? Math.round((fConsumed / targetFats) * 100) : 0,
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
                    status: (wConsumed > 0 || cConsumed > 0)
                        ? (wPct > 100 || cPct > 100 ? 'Above Target (Review)'
                            : (wPct >= 100 && cPct >= 90 ? 'Target Met' : 'In Progress (Active Monitoring)'))
                        : 'No Intake Logged Today',
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

            const dWaterPct = targetWaterMl > 0 ? Math.round((dayWater / targetWaterMl) * 100) : 0;
            const dCalPct = targetCalories > 0 ? Math.round((dayNutr.calories / targetCalories) * 100) : 0;
            const dDateFormatted = new Date(selectedDayDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const dLit = (dayWater / 1000).toFixed(2);

            return {
                mode: 'daily',
                scopeName: `Daily Statement (${dDateFormatted})`,
                dateLabel: dDateFormatted,
                shortDate: selectedDayDate,
                daysCount: 1,
                periodTotals: { waterMl: dayWater, calories: dayNutr.calories, protein: dayNutr.protein, carbs: dayNutr.carbs, fats: dayNutr.fats },
                periodLoggedDays: (dayWater > 0 || dayNutr.calories > 0 || dayNutr.protein > 0 || dayNutr.carbs > 0 || dayNutr.fats > 0) ? 1 : 0,
                isLive: isToday,
                waterConsumed: dayWater,
                waterTarget: targetWaterMl,
                cumulativeWaterConsumed: dLit,
                cumulativeWaterTarget: targets.water,
                waterPercent: dWaterPct,
                waterDeficit: targetWaterMl - dayWater,
                calories: dayNutr.calories,
                calorieTarget: targetCalories,
                cumulativeCalories: dayNutr.calories,
                cumulativeCalorieTarget: targetCalories,
                caloriePercent: dCalPct,
                calorieRemaining: targetCalories - dayNutr.calories,
                protein: dayNutr.protein,
                cumulativeProtein: dayNutr.protein,
                proteinPercent: targetProtein > 0 ? Math.round((dayNutr.protein / targetProtein) * 100) : 0,
                carbs: dayNutr.carbs,
                cumulativeCarbs: dayNutr.carbs,
                carbsPercent: targetCarbs > 0 ? Math.round((dayNutr.carbs / targetCarbs) * 100) : 0,
                fats: dayNutr.fats,
                cumulativeFats: dayNutr.fats,
                fatsPercent: targetFats > 0 ? Math.round((dayNutr.fats / targetFats) * 100) : 0,
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
                    status: (dayNutr.calories > 0 || dayWater > 0)
                        ? (dWaterPct > 100 || dCalPct > 100 ? 'Above Target (Review)'
                            : (dWaterPct >= 100 && dCalPct >= 90 ? 'Target Met' : 'Daily Statement Verified'))
                        : 'No Data Logged for This Day',
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

            const divisor = Math.max(loggedDays, 1);
            const trackedTargetW = Math.round(targets.water * divisor * 10) / 10;
            const trackedTargetCal = targetCalories * divisor;
            const totTargetW = Math.round(targets.water * 7 * 10) / 10;
            const totWLiter = (totW / 1000).toFixed(2);
            const avgWLiter = (totW / divisor / 1000).toFixed(2);
            const totTargetCal = targetCalories * 7;
            const avgCal = Math.round(totCal / divisor);
            const avgProt = Math.round(totProt / divisor);
            const avgCarb = Math.round(totCarb / divisor);
            const avgFat = Math.round(totFat / divisor);
            const wPct = trackedTargetW > 0 ? Math.round(((totW / 1000) / trackedTargetW) * 100) : 0;
            const cPct = trackedTargetCal > 0 ? Math.round((totCal / trackedTargetCal) * 100) : 0;
            const pPct = (targetProtein * divisor) > 0 ? Math.round((totProt / (targetProtein * divisor)) * 100) : 0;
            const carbPct = (targetCarbs * divisor) > 0 ? Math.round((totCarb / (targetCarbs * divisor)) * 100) : 0;
            const fatPct = (targetFats * divisor) > 0 ? Math.round((totFat / (targetFats * divisor)) * 100) : 0;

            return {
                mode: 'weekly',
                scopeName: `Weekly Statement (${weekRange.formatted})`,
                dateLabel: weekRange.formatted,
                shortDate: weekRange.shortLabel,
                daysCount: 7,
                periodTotals: { waterMl: totW, calories: totCal, protein: totProt, carbs: totCarb, fats: totFat },
                periodLoggedDays: loggedDays,
                isLive: false,
                waterConsumed: Math.round(totW / divisor),
                waterTarget: targetWaterMl,
                cumulativeWaterConsumed: totWLiter,
                cumulativeWaterTarget: totTargetW,
                waterPercent: wPct,
                waterDeficit: Math.round(trackedTargetW * 1000) - totW,
                calories: avgCal,
                calorieTarget: targetCalories,
                cumulativeCalories: totCal,
                cumulativeCalorieTarget: totTargetCal,
                caloriePercent: cPct,
                calorieRemaining: trackedTargetCal - totCal,
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
                    hydrationVerdict: `You consumed ${totWLiter} L out of your ${totTargetW} L weekly target (${wPct}% compliance), maintaining a daily average of ${Math.round(totW / divisor)} ml/day against your ${targetWaterMl} ml/day target.`,
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

            const divisor = Math.max(loggedDays, 1);
            const trackedTargetW = Math.round(targets.water * divisor * 10) / 10;
            const trackedTargetCal = targetCalories * divisor;
            const totTargetW = Math.round(targets.water * daysInMonth * 10) / 10;
            const totWLiter = (totW / 1000).toFixed(2);
            const avgWLiter = (totW / divisor / 1000).toFixed(2);
            const totTargetCal = targetCalories * daysInMonth;
            const avgCal = Math.round(totCal / divisor);
            const avgProt = Math.round(totProt / divisor);
            const avgCarb = Math.round(totCarb / divisor);
            const avgFat = Math.round(totFat / divisor);
            const wPct = trackedTargetW > 0 ? Math.round(((totW / 1000) / trackedTargetW) * 100) : 0;
            const cPct = trackedTargetCal > 0 ? Math.round((totCal / trackedTargetCal) * 100) : 0;
            const pPct = (targetProtein * divisor) > 0 ? Math.round((totProt / (targetProtein * divisor)) * 100) : 0;
            const carbPct = (targetCarbs * divisor) > 0 ? Math.round((totCarb / (targetCarbs * divisor)) * 100) : 0;
            const fatPct = (targetFats * divisor) > 0 ? Math.round((totFat / (targetFats * divisor)) * 100) : 0;

            return {
                mode: 'monthly',
                scopeName: `Monthly Statement (${monthLabel})`,
                dateLabel: monthLabel,
                shortDate: selectedMonthStr,
                daysCount: daysInMonth,
                periodTotals: { waterMl: totW, calories: totCal, protein: totProt, carbs: totCarb, fats: totFat },
                periodLoggedDays: loggedDays,
                isLive: false,
                waterConsumed: Math.round(totW / divisor),
                waterTarget: targetWaterMl,
                cumulativeWaterConsumed: totWLiter,
                cumulativeWaterTarget: totTargetW,
                waterPercent: wPct,
                waterDeficit: Math.round(trackedTargetW * 1000) - totW,
                calories: avgCal,
                calorieTarget: targetCalories,
                cumulativeCalories: totCal,
                cumulativeCalorieTarget: totTargetCal,
                caloriePercent: cPct,
                calorieRemaining: trackedTargetCal - totCal,
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
                    hydrationVerdict: `Monthly fluid intake reached ${totWLiter} L of ${totTargetW} L target (${wPct}% compliance, avg ${Math.round(totW / divisor)} ml/day).`,
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

            const divisor = Math.max(loggedDays, 1);
            const trackedTargetW = Math.round(targets.water * divisor * 10) / 10;
            const trackedTargetCal = targetCalories * divisor;
            const totTargetW = Math.round(targets.water * totalDaysInQuarter * 10) / 10;
            const totWLiter = (totW / 1000).toFixed(2);
            const avgWLiter = (totW / divisor / 1000).toFixed(2);
            const totTargetCal = targetCalories * totalDaysInQuarter;
            const avgCal = Math.round(totCal / divisor);
            const avgProt = Math.round(totProt / divisor);
            const avgCarb = Math.round(totCarb / divisor);
            const avgFat = Math.round(totFat / divisor);
            const wPct = trackedTargetW > 0 ? Math.round(((totW / 1000) / trackedTargetW) * 100) : 0;
            const cPct = trackedTargetCal > 0 ? Math.round((totCal / trackedTargetCal) * 100) : 0;
            const pPct = (targetProtein * divisor) > 0 ? Math.round((totProt / (targetProtein * divisor)) * 100) : 0;
            const carbPct = (targetCarbs * divisor) > 0 ? Math.round((totCarb / (targetCarbs * divisor)) * 100) : 0;
            const fatPct = (targetFats * divisor) > 0 ? Math.round((totFat / (targetFats * divisor)) * 100) : 0;

            return {
                mode: 'quarterly',
                scopeName: `Quarterly Statement (${quarterLabel})`,
                dateLabel: quarterLabel,
                shortDate: `${selectedQuarter} ${selectedQuarterYear}`,
                daysCount: totalDaysInQuarter,
                periodTotals: { waterMl: totW, calories: totCal, protein: totProt, carbs: totCarb, fats: totFat },
                periodLoggedDays: loggedDays,
                isLive: false,
                waterConsumed: Math.round(totW / divisor),
                waterTarget: targetWaterMl,
                cumulativeWaterConsumed: totWLiter,
                cumulativeWaterTarget: totTargetW,
                waterPercent: wPct,
                waterDeficit: Math.round(trackedTargetW * 1000) - totW,
                calories: avgCal,
                calorieTarget: targetCalories,
                cumulativeCalories: totCal,
                cumulativeCalorieTarget: totTargetCal,
                caloriePercent: cPct,
                calorieRemaining: trackedTargetCal - totCal,
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

        const divisor = Math.max(loggedDays, 1);
        const trackedTargetW = Math.round(targets.water * divisor * 10) / 10;
        const trackedTargetCal = targetCalories * divisor;
        const totTargetW = Math.round(targets.water * totalDaysInYear * 10) / 10;
        const totWLiter = (totW / 1000).toFixed(2);
        const avgWLiter = (totW / divisor / 1000).toFixed(2);
        const totTargetCal = targetCalories * totalDaysInYear;
        const avgCal = Math.round(totCal / divisor);
        const avgProt = Math.round(totProt / divisor);
        const avgCarb = Math.round(totCarb / divisor);
        const avgFat = Math.round(totFat / divisor);
        const wPct = trackedTargetW > 0 ? Math.round(((totW / 1000) / trackedTargetW) * 100) : 0;
        const cPct = trackedTargetCal > 0 ? Math.round((totCal / trackedTargetCal) * 100) : 0;
        const pPct = (targetProtein * divisor) > 0 ? Math.round((totProt / (targetProtein * divisor)) * 100) : 0;
        const carbPct = (targetCarbs * divisor) > 0 ? Math.round((totCarb / (targetCarbs * divisor)) * 100) : 0;
        const fatPct = (targetFats * divisor) > 0 ? Math.round((totFat / (targetFats * divisor)) * 100) : 0;

        return {
            mode: 'yearly',
            scopeName: `Annual Statement (Year ${selectedYear})`,
            dateLabel: `Calendar Year ${selectedYear}`,
            shortDate: selectedYear,
            daysCount: totalDaysInYear,
            periodTotals: { waterMl: totW, calories: totCal, protein: totProt, carbs: totCarb, fats: totFat },
            periodLoggedDays: loggedDays,
            isLive: false,
            waterConsumed: Math.round(totW / divisor),
            waterTarget: targetWaterMl,
            cumulativeWaterConsumed: totWLiter,
            cumulativeWaterTarget: totTargetW,
            waterPercent: wPct,
            waterDeficit: Math.round(trackedTargetW * 1000) - totW,
            calories: avgCal,
            calorieTarget: targetCalories,
            cumulativeCalories: totCal,
            cumulativeCalorieTarget: totTargetCal,
            caloriePercent: cPct,
            calorieRemaining: trackedTargetCal - totCal,
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

    // Single source of truth for period-aware targets / verdicts.
    const period = buildPeriodSummary(
        activeStatementData.periodTotals,
        activeStatementData.daysCount,
        activeStatementData.periodLoggedDays,
        targets);
    const statementNarrative = buildStatementNarrative(period, activeStatementData.dateLabel);

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
            // C6 stores ONE row per day. There are no intra-day timestamps, so a
            // 4-point "Morning/Midday/Afternoon/Night" curve would be fabricated.
            // Emit a single real daily total per metric instead.
            labels.push(viewMode === 'today' ? 'Today (daily total)' : 'Selected day (daily total)');
            hydrationActual.push(Math.round(Number(activeStatementData.waterConsumed) || 0));
            hydrationTargetLine.push(targetWaterMl);
            caloriesActual.push(Math.round(Number(activeStatementData.calories) || 0));
            caloriesTargetLine.push(targetCalories);
            proteinData.push(Math.round(Number(activeStatementData.protein) || 0));
            carbsData.push(Math.round(Number(activeStatementData.carbs) || 0));
            fatsData.push(Math.round(Number(activeStatementData.fats) || 0));
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
                let wWater = 0, wCal = 0, wProt = 0, wCarbs = 0, wFats = 0, logged = 0;
                bucket.forEach(dStr => {
                    const metrics = getRealDayMetrics(dStr);
                    if (metrics.hasLog) logged++;
                    wWater += metrics.waterMl;
                    wCal += metrics.calories;
                    wProt += metrics.protein;
                    wCarbs += metrics.carbs;
                    wFats += metrics.fats;
                });
                const n = Math.max(logged, 1);
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
                let mWater = 0, mCal = 0, mProt = 0, mCarbs = 0, mFats = 0, logged = 0;
                for (let d = 1; d <= daysInM; d++) {
                    const dStr = `${yNum}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const metrics = getRealDayMetrics(dStr);
                    if (metrics.hasLog) logged++;
                    mWater += metrics.waterMl;
                    mCal += metrics.calories;
                    mProt += metrics.protein;
                    mCarbs += metrics.carbs;
                    mFats += metrics.fats;
                }
                hydrationActual.push(Math.round(mWater / Math.max(logged, 1)));
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(Math.round(mCal / Math.max(logged, 1)));
                caloriesTargetLine.push(targetCalories);
                proteinData.push(Math.round(mProt / Math.max(logged, 1)));
                carbsData.push(Math.round(mCarbs / Math.max(logged, 1)));
                fatsData.push(Math.round(mFats / Math.max(logged, 1)));
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

    // Single series builder shared by the on-screen chart and the exported
    // report, so the two can never silently disagree about the period.
    const buildChartData = (interval) => {
        if (interval === 'STATEMENT') {
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

        if (interval === '1D') {
            const dayMetrics = getRealDayMetrics(todayStr);
            labels.push('Today (daily total)');
            hydrationActual.push(dayMetrics.waterMl);
            hydrationTargetLine.push(targetWaterMl);
            caloriesActual.push(dayMetrics.calories);
            caloriesTargetLine.push(targetCalories);
            proteinData.push(dayMetrics.protein);
            carbsData.push(dayMetrics.carbs);
            fatsData.push(dayMetrics.fats);
        } else if (interval === '1W') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = toLocalDateStr(d);
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
        } else if (interval === '2W') {
            for (let i = 13; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = toLocalDateStr(d);
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
        } else if (interval === '3W') {
            for (let i = 20; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = toLocalDateStr(d);
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
        } else if (interval === '1M') {
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = toLocalDateStr(d);
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
        } else if (interval === '3M') {
            for (let w = 11; w >= 0; w--) {
                labels.push(`Wk -${w}`);
                let wWater = 0, wCal = 0, wProt = 0, wCarbs = 0, wFats = 0, logged = 0;
                for (let day = 0; day < 7; day++) {
                    const d = new Date();
                    d.setDate(d.getDate() - (w * 7 + day));
                    const dStr = toLocalDateStr(d);
                    const m = getRealDayMetrics(dStr);
                    if (m.hasLog) logged++;
                    wWater += m.waterMl;
                    wCal += m.calories;
                    wProt += m.protein;
                    wCarbs += m.carbs;
                    wFats += m.fats;
                }
                hydrationActual.push(Math.round(wWater / Math.max(logged, 1)));
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(Math.round(wCal / Math.max(logged, 1)));
                caloriesTargetLine.push(targetCalories);
                proteinData.push(Math.round(wProt / Math.max(logged, 1)));
                carbsData.push(Math.round(wCarbs / Math.max(logged, 1)));
                fatsData.push(Math.round(wFats / Math.max(logged, 1)));
            }
        } else if (interval === '6M') {
            for (let m = 5; m >= 0; m--) {
                const d = new Date();
                d.setMonth(d.getMonth() - m);
                labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
                const y = d.getFullYear();
                const month = d.getMonth() + 1;
                const daysInM = new Date(y, month, 0).getDate();

                let mWater = 0, mCal = 0, mProt = 0, mCarbs = 0, mFats = 0, logged = 0;
                for (let day = 1; day <= daysInM; day++) {
                    const dStr = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const metrics = getRealDayMetrics(dStr);
                    if (metrics.hasLog) logged++;
                    mWater += metrics.waterMl;
                    mCal += metrics.calories;
                    mProt += metrics.protein;
                    mCarbs += metrics.carbs;
                    mFats += metrics.fats;
                }
                hydrationActual.push(Math.round(mWater / Math.max(logged, 1)));
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(Math.round(mCal / Math.max(logged, 1)));
                caloriesTargetLine.push(targetCalories);
                proteinData.push(Math.round(mProt / Math.max(logged, 1)));
                carbsData.push(Math.round(mCarbs / Math.max(logged, 1)));
                fatsData.push(Math.round(mFats / Math.max(logged, 1)));
            }
        } else if (interval === '1Y') {
            for (let m = 11; m >= 0; m--) {
                const d = new Date();
                d.setMonth(d.getMonth() - m);
                labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
                const y = d.getFullYear();
                const month = d.getMonth() + 1;
                const daysInM = new Date(y, month, 0).getDate();

                let mWater = 0, mCal = 0, mProt = 0, mCarbs = 0, mFats = 0, logged = 0;
                for (let day = 1; day <= daysInM; day++) {
                    const dStr = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const metrics = getRealDayMetrics(dStr);
                    if (metrics.hasLog) logged++;
                    mWater += metrics.waterMl;
                    mCal += metrics.calories;
                    mProt += metrics.protein;
                    mCarbs += metrics.carbs;
                    mFats += metrics.fats;
                }
                hydrationActual.push(Math.round(mWater / Math.max(logged, 1)));
                hydrationTargetLine.push(targetWaterMl);
                caloriesActual.push(Math.round(mCal / Math.max(logged, 1)));
                caloriesTargetLine.push(targetCalories);
                proteinData.push(Math.round(mProt / Math.max(logged, 1)));
                carbsData.push(Math.round(mCarbs / Math.max(logged, 1)));
                fatsData.push(Math.round(mFats / Math.max(logged, 1)));
            }
        } else {
            // CUSTOM: one selected date, one real daily total per metric.
            const targetDate = customSingleDate || todayStr;
            const dayMetrics = getRealDayMetrics(targetDate);
            labels.push(`${targetDate} (daily total)`);
            hydrationActual.push(dayMetrics.waterMl);
            hydrationTargetLine.push(targetWaterMl);
            caloriesActual.push(dayMetrics.calories);
            caloriesTargetLine.push(targetCalories);
            proteinData.push(dayMetrics.protein);
            carbsData.push(dayMetrics.carbs);
            fatsData.push(dayMetrics.fats);
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
    };

    const chartData = buildChartData(selectedInterval);


    // A single-day series has one real sample: render a two-bar comparison on
    // screen instead of a one-point line, and never draw an empty chart frame.
    const chartHasIntake = [
        ...chartData.hydrationActual, ...chartData.caloriesActual,
        ...chartData.proteinData, ...chartData.carbsData, ...chartData.fatsData
    ].some(v => Number(v) > 0);
    const isSingleDaySeries = chartData.labels.length === 1;
    const fluidComplianceLabel = Number(activeStatementData.waterPercent) > 100 ? 'Above target'
        : Number(activeStatementData.waterPercent) >= 100 ? 'Target met' : 'Below target';
    const nutritionComplianceLabel = Number(activeStatementData.caloriePercent) > 100 ? 'Above target'
        : Number(activeStatementData.caloriePercent) >= 90 ? 'On track' : 'Below target';
    const hydrationComparisonConfig = {
        labels: ['Daily total'],
        datasets: [
            { label: 'Consumed (ml)', data: [chartData.hydrationActual[0] || 0], backgroundColor: '#38bdf8', borderRadius: 6 },
            { label: 'Daily target (ml)', data: [chartData.hydrationTargetLine[0] || 0], backgroundColor: '#a5d391', borderRadius: 6 }
        ]
    };
    const nutritionComparisonConfig = {
        labels: ['Daily total'],
        datasets: [
            { label: 'Consumed (kcal)', data: [chartData.caloriesActual[0] || 0], backgroundColor: '#fbbf24', borderRadius: 6 },
            { label: 'Daily target (kcal)', data: [chartData.caloriesTargetLine[0] || 0], backgroundColor: '#ef4444', borderRadius: 6 }
        ]
    };

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
                label: 'Daily target (ml/day)',
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
                label: 'Daily target (kcal/day)',
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
        const progressRemark = (pct) => pct > 100 ? 'Above target' : pct >= 100 ? 'Target met' : pct >= 75 ? 'Close to target' : pct > 0 ? 'Below target' : 'No intake logged';

        // The exported document uses the deliberately chosen export range, not
        // whatever interval happens to be selected on screen.
        const pdfChartData = exportRange === 'STATEMENT'
            ? pdfStatementChartData
            : buildChartData(exportRange);
        const chartRangeLabel = exportRange === 'STATEMENT'
            ? activeStatementData.dateLabel
            : (exportRange === 'CUSTOM'
                ? (customSingleDate || activeStatementData.dateLabel)
                : (INTERVAL_PRESETS.find(pr => pr.id === exportRange)?.label || exportRange));
        const exportHasIntake = [
            ...pdfChartData.hydrationActual, ...pdfChartData.caloriesActual,
            ...pdfChartData.proteinData, ...pdfChartData.carbsData, ...pdfChartData.fatsData
        ].some(v => Number(v) > 0);
        const singlePoint = pdfChartData.labels.length === 1;
        const scopePhrase = period.days === 1 ? 'a single day' : `${period.days}-day period`;
        const hasReportData = Number(activeStatementData.waterConsumed) > 0
            || Number(activeStatementData.calories) > 0
            || Number(activeStatementData.protein) > 0
            || Number(activeStatementData.carbs) > 0
            || Number(activeStatementData.fats) > 0;

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

        // Single-day statements have no intra-day samples: show one real total
        // vs its target instead of a fabricated four-point curve.
        const svgHydration = singlePoint
            ? generateSvgDailyComparison({
                title: 'Fluid Intake (Daily Total vs Target)', unit: 'ml',
                actualLabel: 'Consumed', targetLabel: 'Daily target',
                value: pdfChartData.hydrationActual[0], target: pdfChartData.hydrationTargetLine[0],
                actualColor: '#38bdf8', targetColor: '#a5d391'
            })
            : generateSvgLineChart({
                title: 'Hydration Trend (Fluid Volume vs Daily Target)',
                unit: 'ml',
                actualLabel: 'Consumed Water',
                targetLabel: 'Daily target (ml/day)',
                labels: pdfChartData.labels,
                actualData: pdfChartData.hydrationActual,
                targetData: pdfChartData.hydrationTargetLine,
                actualColor: '#38bdf8',
                targetColor: '#a5d391'
            });

        const svgCalories = singlePoint
            ? generateSvgDailyComparison({
                title: 'Calories Consumed (Daily Total vs Target)', unit: 'kcal',
                actualLabel: 'Consumed', targetLabel: 'Daily target',
                value: pdfChartData.caloriesActual[0], target: pdfChartData.caloriesTargetLine[0],
                actualColor: '#fbbf24', targetColor: '#ef4444'
            })
            : generateSvgLineChart({
                title: 'Calories Consumed vs Daily Target',
                unit: 'kcal',
                actualLabel: 'Calories Consumed',
                targetLabel: 'Daily target (kcal/day)',
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

        // An unlogged day is a recorded zero: keep the charts visible with a
        // flat zero series, but say clearly that nothing was logged so a zero is
        // never mistaken for measured intake.
        const zeroNote = exportHasIntake ? ''
            : `<div class="zero-note">No intake was logged for ${escapeHtml(chartRangeLabel)}. All values are shown as 0, not estimated.</div>`;
        const chartsBlock = `${zeroNote}${svgHydration}${svgCalories}${svgMacros}`;

        // Format clean, printable medical document HTML
        // SEC-11: reportHtml escapes every interpolation by construction.
        const reportContentHtml = reportHtml`
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
                    .zero-note { background: #f8fafc; border: 1px solid #cbd5e1; color: #475569; padding: 9px 14px; border-radius: 8px; font-size: 9pt; margin-bottom: 14px; }
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
                        <span class="badge">${hasReportData ? 'Generated Statement' : 'No Data Logged'}</span>
                        <div style="font-size: 8.5pt; color: #64748b; margin-top: 4px;">Doc ID: ${reportId}</div>
                    </div>
                </div>

                <div class="meta-grid">
                    <div class="meta-item"><strong>Patient Name</strong> ${patientName}</div>
                    <div class="meta-item"><strong>Patient Email</strong> ${patientEmail}</div>
                    <div class="meta-item"><strong>Demographics</strong> ${ageText} • ${genderText}</div>
                    <div class="meta-item"><strong>Biometrics</strong> ${heightText} • ${weightText}${bmiText}</div>
                    <div class="meta-item"><strong>Primary Goal</strong> ${userProfile?.goal || 'Not set'}</div>
                    <div class="meta-item"><strong>Profile Daily Targets (reference)</strong> ${period.daily.calories} kcal • ${(period.daily.waterMl / 1000).toFixed(2)} L</div>
                    <div class="meta-item"><strong>Period Target</strong> ${period.periodTargets.calories.toLocaleString()} kcal • ${(period.periodTargets.waterMl / 1000).toFixed(1)} L (${period.days} days)</div>
                    <div class="meta-item"><strong>Statement Scope</strong> ${scopeTitle}</div>
                    <div class="meta-item"><strong>Evaluated Period</strong> ${dateRangeLabel}</div>
                    <div class="meta-item"><strong>Record Coverage</strong> ${period.loggedDays} / ${period.days} days (${period.coveragePct}%)</div>
                </div>

                <div class="summary-box">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <strong style="color: #166534; font-size: 11pt;">Clinical Biometric Adherence Summary & What This Statement Tells You:</strong>
                        <span class="badge" style="background: #166534; color: #fff;">${statementNarrative.status}</span>
                    </div>
                    <p style="margin: 0 0 8px 0; font-size: 9.5pt; color: #1e293b; line-height: 1.45;">
                        ${statementNarrative.keyTakeaway}
                    </p>
                    <div style="font-size: 9pt; color: #334155; border-top: 1px dashed #bbf7d0; padding-top: 6px; display: grid; grid-template-columns: 1fr; gap: 4px;">
                        <div>• <strong>Hydration:</strong> ${statementNarrative.hydrationVerdict}</div>
                        <div>• <strong>Calories & Energy:</strong> ${statementNarrative.calorieVerdict}</div>
                        <div>• <strong>Macronutrients:</strong> ${statementNarrative.macroVerdict}</div>
                    </div>
                </div>

                <h2>1. Fluid & Hydration Tracking (${activeStatementData.shortDate})</h2>
                <div style="font-size: 8.5pt; color: #64748b; margin-bottom: 8px;">
                    Record coverage: <strong>${period.loggedDays} of ${period.days} days logged (${period.coveragePct}%)</strong>.
                    The period target is the profile daily target multiplied by ${period.days}; the tracked-day comparison uses only the ${period.loggedDays} days with a record.
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Comparison basis</th>
                            <th>Target</th>
                            <th>Consumed</th>
                            <th>% of target</th>
                            <th>Status / Variance</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Period total (${scopePhrase})</strong></td>
                            <td>${(period.periodTargets.waterMl / 1000).toFixed(2)} L (${period.periodTargets.waterMl} ml)</td>
                            <td>${(period.totals.waterMl / 1000).toFixed(2)} L (${period.totals.waterMl} ml)</td>
                            <td><strong>${period.periodPct.waterMl}% of period target</strong></td>
                            <td>${period.periodDeficit.waterMl < 0 ? `Over period target by ${Math.abs(period.periodDeficit.waterMl)} ml` : (period.periodDeficit.waterMl > 0 ? `${period.periodDeficit.waterMl} ml of period target remaining` : 'Period target met')}</td>
                        </tr>
                        <tr>
                            <td><strong>Avg on logged days (${period.loggedDays}/${period.days})</strong></td>
                            <td>${period.daily.waterMl} ml/day</td>
                            <td>${period.avgPerLoggedDay.waterMl} ml/day</td>
                            <td><strong>${period.trackedPct.waterMl}% on tracked days</strong></td>
                            <td>${progressRemark(period.trackedPct.waterMl)}</td>
                        </tr>
                    </tbody>
                </table>

                <h2>2. Macronutrient & Calorie Nutrition Count — Period Totals (${scopePhrase})</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Nutritional Metric</th>
                            <th>Period Target (daily x ${period.days})</th>
                            <th>Total Consumed</th>
                            <th>% of Period Target</th>
                            <th>Clinical Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Caloric Energy</strong></td>
                            <td>${period.periodTargets.calories} kcal</td>
                            <td>${period.totals.calories} kcal</td>
                            <td><strong>${period.periodPct.calories}%</strong></td>
                            <td>${period.periodDeficit.calories < 0 ? `Over by ${Math.abs(period.periodDeficit.calories)} kcal` : (period.periodDeficit.calories > 0 ? `${period.periodDeficit.calories} kcal of period target remaining` : 'Period target met')}</td>
                        </tr>
                        <tr>
                            <td><strong>Dietary Protein</strong></td>
                            <td>${period.periodTargets.protein} g</td>
                            <td>${period.totals.protein} g</td>
                            <td><strong>${period.periodPct.protein}%</strong></td>
                            <td>${progressRemark(period.periodPct.protein)}</td>
                        </tr>
                        <tr>
                            <td><strong>Carbohydrates</strong></td>
                            <td>${period.periodTargets.carbs} g</td>
                            <td>${period.totals.carbs} g</td>
                            <td><strong>${period.periodPct.carbs}%</strong></td>
                            <td>${progressRemark(period.periodPct.carbs)}</td>
                        </tr>
                        <tr>
                            <td><strong>Fats & Essential Lipids</strong></td>
                            <td>${period.periodTargets.fats} g</td>
                            <td>${period.totals.fats} g</td>
                            <td><strong>${period.periodPct.fats}%</strong></td>
                            <td>${progressRemark(period.periodPct.fats)}</td>
                        </tr>
                    </tbody>
                </table>

                <h2>2b. Daily Adherence on Logged Days (${period.loggedDays}/${period.days} days)</h2>
                <div style="font-size: 8.5pt; color: #64748b; margin-bottom: 8px;">
                    This table answers "on days I tracked, did I hit my daily target?" It uses the profile daily target, not the period target.
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Nutritional Metric</th>
                            <th>Daily Target (profile)</th>
                            <th>Avg per Logged Day</th>
                            <th>% on Tracked Days</th>
                            <th>Clinical Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Caloric Energy</strong></td>
                            <td>${period.daily.calories} kcal/day</td>
                            <td>${period.avgPerLoggedDay.calories} kcal/day</td>
                            <td><strong>${period.trackedPct.calories}%</strong></td>
                            <td>${progressRemark(period.trackedPct.calories)}</td>
                        </tr>
                        <tr>
                            <td><strong>Dietary Protein</strong></td>
                            <td>${period.daily.protein} g/day</td>
                            <td>${period.avgPerLoggedDay.protein} g/day</td>
                            <td><strong>${period.trackedPct.protein}%</strong></td>
                            <td>${progressRemark(period.trackedPct.protein)}</td>
                        </tr>
                        <tr>
                            <td><strong>Carbohydrates</strong></td>
                            <td>${period.daily.carbs} g/day</td>
                            <td>${period.avgPerLoggedDay.carbs} g/day</td>
                            <td><strong>${period.trackedPct.carbs}%</strong></td>
                            <td>${progressRemark(period.trackedPct.carbs)}</td>
                        </tr>
                        <tr>
                            <td><strong>Fats & Essential Lipids</strong></td>
                            <td>${period.daily.fats} g/day</td>
                            <td>${period.avgPerLoggedDay.fats} g/day</td>
                            <td><strong>${period.trackedPct.fats}%</strong></td>
                            <td>${progressRemark(period.trackedPct.fats)}</td>
                        </tr>
                    </tbody>
                </table>

                <h2>${singlePoint ? '3. Intake Comparison (Daily Totals)' : '3. Longitudinal Performance Curves'} (${activeStatementData.scopeName})</h2>
                <div style="font-size: 8.5pt; color: #64748b; margin-top: -6px; margin-bottom: 12px;">
                    Charts cover: <strong>${chartRangeLabel}</strong> (selected export range)${singlePoint ? ' — daily totals only; no intra-day timestamps are recorded' : ` — each point is one day (or a daily average); the dashed/second series is the profile DAILY target per day. Period totals and ${period.days}-day targets are in the tables above.`}
                </div>
                ${rawHtml(chartsBlock)}

                <h2>4. Longitudinal Statement Trends (${activeStatementData.mode.toUpperCase()})</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Timeframe Scope</th>
                            <th>Avg / Logged Day (kcal)</th>
                            <th>Avg / Logged Day (L)</th>
                            <th>Record Coverage</th>
                            <th>Adherence on Tracked Days</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>${activeStatementData.title}</strong></td>
                            <td>${period.avgPerLoggedDay.calories} kcal / day</td>
                            <td>${(period.avgPerLoggedDay.waterMl / 1000).toFixed(2)} L / day</td>
                            <td>${period.loggedDays} / ${period.days} days (${period.coveragePct}%)</td>
                            <td><strong>${period.trackedPct.calories}% of daily calorie target</strong> (${period.periodPct.calories}% of period target)</td>
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

                <!-- SEC-19: no inline script in the generated document, so an
                     enforced CSP can be adopted later without breaking printing. -->
            </body>
            </html>
        `;

        // Open print window / save to PDF dialog
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(reportContentHtml);
            printWindow.document.close();
            // The print dialog is triggered from this (trusted) window rather than
            // by an inline <script> in the generated document.
            let printRequested = false;
            const requestPrint = () => {
                if (printRequested) return;
                printRequested = true;
                try {
                    printWindow.focus();
                    printWindow.print();
                } catch (err) {
                    console.error('Could not open the print dialog:', err);
                }
            };
            printWindow.onload = requestPrint;
            setTimeout(requestPrint, 350);
            setDownloadSuccessToast(`Successfully prepared ${reportDocumentTitle} PDF!`);
        } else {
            // Fallback: create downloadable HTML/Blob. The downloaded file keeps its
            // own print trigger, so popup-blocked users see the same behaviour.
            const fallbackHtml = reportContentHtml.replace('</body>',
                '<script>window.onload=function(){window.print();};</script></body>');
            const blob = new Blob([fallbackHtml], { type: 'text/html' });
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
                    <ExportRangeSelect value={exportRange} onChange={setExportRange} />
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
                                    setSelectedDayDate(toLocalDateStr(d));
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
                    <ExportRangeSelect value={exportRange} onChange={setExportRange} />
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
                                <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">% on Tracked Days</span>
                                <strong className="text-xl font-bold text-[#a5d391]">{period.trackedPct.waterMl}%</strong>
                                <span className="text-[10px] text-white/40 block mt-0.5">
                                    {activeStatementData.daysCount > 1 
                                        ? `${activeStatementData.cumulativeWaterConsumed} L of ${activeStatementData.cumulativeWaterTarget} L` 
                                        : (activeStatementData.waterDeficit < 0 ? `${Math.abs(activeStatementData.waterDeficit)} ml above target` : (activeStatementData.waterDeficit > 0 ? `${activeStatementData.waterDeficit} ml left` : 'Completed'))}
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-white/50">
                                <span>Adherence on tracked days ({period.loggedDays}/{period.days} logged)</span>
                                <span className="font-bold text-white">{period.trackedPct.waterMl}%</span>
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
                        <span>On tracked days: <strong className="text-[#a5d391]">{period.trackedPct.waterMl}% of daily target</strong></span>
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
                                        : (activeStatementData.calorieRemaining < 0 ? `${Math.abs(activeStatementData.calorieRemaining)} kcal above target` : (activeStatementData.calorieRemaining > 0 ? `${activeStatementData.calorieRemaining} kcal remaining` : 'Target met'))}
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
                        <span>Avg / logged day: <strong className="text-white">{period.avgPerLoggedDay.calories} kcal/day</strong></span>
                        <span>On tracked days: <strong className="text-[#a5d391]">{period.trackedPct.calories}% of daily target</strong></span>
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
                        Coverage: {period.loggedDays} / {period.days} days ({period.coveragePct}%)
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
                    <div className="bg-[#080b12]/80 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-1">Total Fluid Intake</span>
                        <div className="text-xl font-bold text-[#38bdf8]">{aggregatedMetrics.totalWaterLiters} L</div>
                        <span className="text-[10px] text-white/40 block mt-0.5">Avg {aggregatedMetrics.avgWaterLiters} L/day</span>
                    </div>

                    <div className="bg-[#080b12]/80 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-1">% on Tracked Days (fluid)</span>
                        <div className="text-xl font-bold text-[#a5d391]">{period.trackedPct.waterMl}%</div>
                        <span className="text-[10px] text-emerald-400 block mt-0.5">{fluidComplianceLabel}</span>
                    </div>

                    <div className="bg-[#080b12]/80 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-1">Avg / Logged Day (kcal)</span>
                        <div className="text-xl font-bold text-amber-400">{period.avgPerLoggedDay.calories}</div>
                        <span className="text-[10px] text-white/40 block mt-0.5">Daily target: {period.daily.calories} kcal • Period: {period.periodTargets.calories.toLocaleString()} kcal</span>
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
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-1">% on Tracked Days (kcal)</span>
                        <div className="text-xl font-bold text-white">{period.trackedPct.calories}%</div>
                        <span className="text-[10px] text-[#a5d391] block mt-0.5">{nutritionComplianceLabel}</span>
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
                    <span className="truncate">These presets change the on-screen chart only. The exported report uses the <strong>Charts in report</strong> selector next to the Download Health Report buttons (default: statement period). Single days show a daily total, not an invented intra-day curve. The target series is the profile <strong>daily target per day</strong>; period targets for {period.days} days and both comparison bases are in the statement tables.</span>
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

                {/* An unlogged day is a recorded zero, so the chart still renders. */}
                {!chartHasIntake && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-300/80">
                        <span className="material-symbols-outlined text-sm">info</span>
                        No intake logged for this range — values shown as 0 (not estimated).
                    </div>
                )}

                {/* Graph Visualization Canvas */}
                <div className="h-[280px] sm:h-[320px] lg:h-[360px] w-full pt-4">
                    {activeGraphMetric === 'hydration' && (isSingleDaySeries
                        ? <Bar data={hydrationComparisonConfig} options={commonChartOptions} />
                        : <Line data={hydrationChartConfig} options={commonChartOptions} />)}
                    {activeGraphMetric === 'nutrition' && (isSingleDaySeries
                        ? <Bar data={nutritionComparisonConfig} options={commonChartOptions} />
                        : <Line data={nutritionChartConfig} options={commonChartOptions} />)}
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

    // Food names remain a browser-side display convenience. The five numeric
    // criteria are always read from / written to the backend progress_logs row.
    const [dayLoggedFoods, setDayLoggedFoods] = useState([]);
    const [serverDay, setServerDay] = useState(null);
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

    // Load the authoritative five values for this date.
    useEffect(() => {
        if (!isOpen) return;
        let active = true;
        fetchProgressDays()
            .then(days => { if (active) setServerDay(days[selectedDate] || null); })
            .catch(err => {
                console.error('Failed to load persisted nutrition:', err);
                if (active) setServerDay(null);
            });
        return () => { active = false; };
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

    // Persist ONLY the five numeric criteria to the database. Food item names
    // stay in the browser as a display convenience and are never sent to the DB.
    const sumFoods = (list) => list.reduce((acc, f) => ({
        calories: acc.calories + (Number(f.calories) || 0),
        protein: acc.protein + (Number(f.protein) || 0),
        carbs: acc.carbs + (Number(f.carbs) || 0),
        fats: acc.fats + (Number(f.fats) || 0)
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

    const persistLoggedFoods = async (updatedFoods, successMessage) => {
        const before = sumFoods(dayLoggedFoods);
        const after = sumFoods(updatedFoods);
        const base = serverDay || { calories: 0, protein: 0, carbs: 0, fats: 0 };
        try {
            const saved = await saveDayMetrics(selectedDate, {
                calories: Math.max(0, base.calories + (after.calories - before.calories)),
                protein: Math.max(0, base.protein + (after.protein - before.protein)),
                carbs: Math.max(0, base.carbs + (after.carbs - before.carbs)),
                fats: Math.max(0, base.fats + (after.fats - before.fats))
            });
            setServerDay(saved);
            setDayLoggedFoods(updatedFoods);
            window.dispatchEvent(new Event('nutrimunch_progress_updated'));
            if (onLogUpdated) {
                onLogUpdated(selectedDate, updatedFoods, successMessage);
            }
            setFeedbackMsg(successMessage || 'Updated successfully');
            setTimeout(() => setFeedbackMsg(null), 3500);
        } catch (err) {
            console.error('Failed to save nutrition log:', err);
            setFeedbackMsg('Could not save nutrition data. Please try again.');
            setTimeout(() => setFeedbackMsg(null), 4500);
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

    // Load the persisted water value from the database (offline cache fallback only).
    useEffect(() => {
        if (!isOpen) return;
        let active = true;
        fetchProgressDays()
            .then(days => {
                if (!active) return;
                const day = days[selectedDate];
                setWaterMl(day ? day.waterMl : readOfflineDay(selectedDate).waterMl);
            })
            .catch(err => {
                console.error('Failed to load persisted water:', err);
                if (active) setWaterMl(readOfflineDay(selectedDate).waterMl);
            });
        setFeedbackMsg(null);
        return () => { active = false; };
    }, [selectedDate, isOpen]);

    if (!isOpen) return null;

    const persistWater = async (amount, msg) => {
        try {
            const saved = await saveDayMetrics(selectedDate, { waterMl: amount });
            setWaterMl(saved.waterMl);
            window.dispatchEvent(new Event('nutrimunch_progress_updated'));
            if (onWaterUpdated) {
                onWaterUpdated(selectedDate, saved.waterMl, msg);
            }
            setFeedbackMsg(msg);
            setTimeout(() => setFeedbackMsg(null), 3000);
        } catch (err) {
            console.error('Failed to save water log:', err);
            setFeedbackMsg('Could not save water intake. Please try again.');
            setTimeout(() => setFeedbackMsg(null), 4500);
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
