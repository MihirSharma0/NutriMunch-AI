/**
 * Dark Glassmorphic Calendar Picker
 * Custom popup date picker supporting day, week, and month view modes
 * with min/max constraint validation.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Premium Dark Theme Calendar Picker Component
 * Replaces browser default white date/month inputs with an ultra-sleek dark glassmorphism popup.
 */
const DarkCalendarPicker = ({
    value,
    onChange,
    mode = 'day', // 'day' | 'week' | 'month'
    maxDate,
    minDate,
    label,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Parse current value or fallback to today
    const parsedDate = useMemo(() => {
        if (!value) return new Date();
        if (mode === 'month') {
            const [y, m] = value.split('-');
            return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
        }
        const d = new Date(value);
        return isNaN(d.getTime()) ? new Date() : d;
    }, [value, mode]);

    // Calendar navigation view state (which month/year is currently being viewed)
    const [viewYear, setViewYear] = useState(() => parsedDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(() => parsedDate.getMonth());
    const [isSelectingMonthView, setIsSelectingMonthView] = useState(mode === 'month');

    // Sync view year/month when value changes externally
    useEffect(() => {
        setViewYear(parsedDate.getFullYear());
        setViewMonth(parsedDate.getMonth());
    }, [parsedDate]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Week boundaries calculation (7 consecutive days starting on the selected date)
    const weekRange = useMemo(() => {
        if (mode !== 'week') return null;
        const d = new Date(parsedDate);
        const y = d.getFullYear();
        const m = d.getMonth();
        const dayNum = d.getDate();
        const start = new Date(y, m, dayNum);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const pad = (n) => String(n).padStart(2, '0');

        return {
            start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
            end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
        };
    }, [parsedDate, mode]);

    // Month Navigation Steppers
    const handlePrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(prev => prev - 1);
        } else {
            setViewMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(prev => prev + 1);
        } else {
            setViewMonth(prev => prev + 1);
        }
    };

    // Calculate dates for current month grid (including leading and trailing overflow)
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
        const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

        const days = [];

        // Previous month trailing days
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            const dayNum = daysInPrevMonth - i;
            const prevMonthDate = new Date(viewYear, viewMonth - 1, dayNum);
            const dateStr = prevMonthDate.toISOString().split('T')[0];
            days.push({
                dayNum,
                dateStr,
                isCurrentMonth: false,
                isPrevMonth: true
            });
        }

        // Current month days
        for (let i = 1; i <= daysInCurrentMonth; i++) {
            const curDate = new Date(viewYear, viewMonth, i);
            // Adjust for local time ISO formatting
            const yyyy = curDate.getFullYear();
            const mm = String(curDate.getMonth() + 1).padStart(2, '0');
            const dd = String(curDate.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            days.push({
                dayNum: i,
                dateStr,
                isCurrentMonth: true
            });
        }

        // Next month leading days to complete 35 or 42 grid cells
        const remainingCells = (days.length <= 35 ? 35 : 42) - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            const nextMonthDate = new Date(viewYear, viewMonth + 1, i);
            const dateStr = nextMonthDate.toISOString().split('T')[0];
            days.push({
                dayNum: i,
                dateStr,
                isCurrentMonth: false,
                isNextMonth: true
            });
        }

        return days;
    }, [viewYear, viewMonth]);

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    // Format human-readable button trigger label
    const triggerLabel = useMemo(() => {
        if (mode === 'month') {
            return `${MONTH_NAMES[parsedDate.getMonth()]} ${parsedDate.getFullYear()}`;
        }
        if (mode === 'week') {
            if (weekRange) {
                const s = new Date(weekRange.start);
                const e = new Date(weekRange.end);
                return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            }
        }
        return parsedDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }, [parsedDate, mode, weekRange]);

    const handleSelectDay = (dateStr) => {
        onChange(dateStr);
        setIsOpen(false);
    };

    const handleSelectMonth = (monthIdx) => {
        const mm = String(monthIdx + 1).padStart(2, '0');
        const monthVal = `${viewYear}-${mm}`;
        if (mode === 'month') {
            onChange(monthVal);
            setIsOpen(false);
        } else {
            setViewMonth(monthIdx);
            setIsSelectingMonthView(false);
        }
    };

    return (
        <div className={`relative inline-block ${isOpen ? 'z-[9999]' : 'z-auto'} ${className}`} ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className={`bg-[#080b12] hover:bg-white/10 border transition-all rounded-xl px-3.5 py-2 text-xs flex items-center gap-2 cursor-pointer ${
                    isOpen 
                        ? 'border-[#a5d391] shadow-[0_0_15px_rgba(165,211,145,0.25)] text-white' 
                        : 'border-white/15 text-white/90 hover:text-white hover:border-white/30'
                }`}
            >
                <span className="material-symbols-outlined text-sm text-[#a5d391]">
                    {mode === 'month' ? 'calendar_month' : (mode === 'week' ? 'date_range' : 'calendar_today')}
                </span>
                {label && <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{label}</span>}
                <span className="font-semibold tracking-wide text-xs">{triggerLabel}</span>
                <span className={`material-symbols-outlined text-xs text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#a5d391]' : ''}`}>
                    expand_more
                </span>
            </button>

            {/* Custom Dark Theme Calendar Popup Card */}
            {isOpen && (
                <div 
                    className="absolute z-[9999] mt-2 left-0 sm:right-auto bg-[#0a0e17] border border-white/15 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl w-[300px] animate-in fade-in zoom-in-95 duration-150 select-none"
                    style={{ minWidth: '300px' }}
                >
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                        {/* Month / Year Title with toggle */}
                        <button
                            type="button"
                            onClick={() => setIsSelectingMonthView(prev => !prev)}
                            className="font-bold text-sm text-white hover:text-[#a5d391] transition-colors flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5"
                        >
                            <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
                            <span className="material-symbols-outlined text-xs text-white/40">
                                {isSelectingMonthView ? 'unfold_less' : 'unfold_more'}
                            </span>
                        </button>

                        {/* Prev / Next Month Steppers */}
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={isSelectingMonthView ? () => setViewYear(y => y - 1) : handlePrevMonth}
                                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Previous"
                            >
                                <span className="material-symbols-outlined text-base">chevron_left</span>
                            </button>
                            <button
                                type="button"
                                onClick={isSelectingMonthView ? () => setViewYear(y => y + 1) : handleNextMonth}
                                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Next"
                            >
                                <span className="material-symbols-outlined text-base">chevron_right</span>
                            </button>
                        </div>
                    </div>

                    {/* View 1: 12-Month Grid View */}
                    {isSelectingMonthView ? (
                        <div className="py-2">
                            <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2 px-1 text-center">
                                Select Month for Year {viewYear}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {SHORT_MONTH_NAMES.map((name, idx) => {
                                    const isSelectedMonth = parsedDate.getFullYear() === viewYear && parsedDate.getMonth() === idx;
                                    const isCurrentMonthThisYear = new Date().getFullYear() === viewYear && new Date().getMonth() === idx;
                                    
                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => handleSelectMonth(idx)}
                                            className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                isSelectedMonth
                                                    ? 'bg-[#a5d391] text-black font-extrabold shadow-[0_0_12px_rgba(165,211,145,0.4)]'
                                                    : (isCurrentMonthThisYear
                                                        ? 'bg-white/10 text-[#a5d391] border border-[#a5d391]/40'
                                                        : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white')
                                            }`}
                                        >
                                            {name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* View 2: Days of the Month Grid */
                        <div>
                            {/* Days of Week Header */}
                            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                                {WEEKDAY_NAMES.map((dayName) => (
                                    <div key={dayName} className="text-[10px] font-bold text-white/40 uppercase tracking-wider py-1">
                                        {dayName}
                                    </div>
                                ))}
                            </div>

                            {/* Days Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map(({ dayNum, dateStr, isCurrentMonth }) => {
                                    const isSelectedDay = dateStr === (mode === 'month' ? value?.slice(0, 7) : value);
                                    const isToday = dateStr === todayStr;
                                    const isFuture = maxDate ? dateStr > maxDate : false;
                                    const isPast = minDate ? dateStr < minDate : false;
                                    const isDisabled = isFuture || isPast;

                                    // Week mode row highlight
                                    const isInSelectedWeek = mode === 'week' && weekRange && dateStr >= weekRange.start && dateStr <= weekRange.end;
                                    const isWeekStart = mode === 'week' && weekRange && dateStr === weekRange.start;
                                    const isWeekEnd = mode === 'week' && weekRange && dateStr === weekRange.end;

                                    let cellStyles = 'text-white/80 hover:bg-white/15';

                                    if (!isCurrentMonth) {
                                        cellStyles = 'text-white/20 hover:text-white/50 hover:bg-white/5';
                                    }

                                    if (isDisabled) {
                                        cellStyles = 'text-white/15 cursor-not-allowed pointer-events-none';
                                    } else if (isSelectedDay && mode !== 'week') {
                                        cellStyles = 'bg-[#a5d391] text-black font-black shadow-[0_0_12px_rgba(165,211,145,0.45)] scale-105';
                                    } else if (isInSelectedWeek) {
                                        cellStyles = isWeekStart
                                            ? 'bg-[#a5d391] text-black font-black shadow-[0_0_10px_rgba(165,211,145,0.4)] rounded-xl scale-105'
                                            : `bg-[#a5d391]/20 text-[#a5d391] font-bold ${isWeekEnd ? 'rounded-r-xl' : ''}`;
                                    } else if (isToday) {
                                        cellStyles = 'text-[#a5d391] font-bold ring-1 ring-[#a5d391]/50';
                                    }

                                    return (
                                        <button
                                            key={dateStr}
                                            type="button"
                                            disabled={isDisabled}
                                            onClick={() => handleSelectDay(dateStr)}
                                            className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${cellStyles}`}
                                        >
                                            {dayNum}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Calendar Footer Shortcuts */}
                            <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10 text-xs">
                                <button
                                    type="button"
                                    onClick={() => handleSelectDay(todayStr)}
                                    className="text-xs font-bold text-[#a5d391] hover:underline cursor-pointer flex items-center gap-1"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#a5d391]"></span>
                                    <span>Select Today</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="text-[11px] text-white/40 hover:text-white cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DarkCalendarPicker;
