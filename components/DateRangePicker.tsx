import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onChange: (start: string, end: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectingStart, setSelectingStart] = useState(true);

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayNames = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Get day of week (0 = Sunday, adjust to Monday = 0)
        let startingDayOfWeek = firstDay.getDay() - 1;
        if (startingDayOfWeek === -1) startingDayOfWeek = 6;

        const days = [];
        // Add empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days in month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const handleDateClick = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];

        if (selectingStart) {
            onChange(dateStr, dateStr);
            setSelectingStart(false);
        } else {
            const start = new Date(startDate);
            if (date < start) {
                onChange(dateStr, startDate);
            } else {
                onChange(startDate, dateStr);
            }
            setSelectingStart(true);
        }
    };

    const isInRange = (date: Date | null) => {
        if (!date || !startDate || !endDate) return false;
        const dateStr = date.toISOString().split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
    };

    const isStartDate = (date: Date | null) => {
        if (!date || !startDate) return false;
        return date.toISOString().split('T')[0] === startDate;
    };

    const isEndDate = (date: Date | null) => {
        if (!date || !endDate) return false;
        return date.toISOString().split('T')[0] === endDate;
    };

    const isWeekend = (date: Date | null) => {
        if (!date) return false;
        const day = date.getDay();
        return day === 0 || day === 6;
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const renderMonth = (monthOffset: number) => {
        const displayMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, 1);
        const days = getDaysInMonth(displayMonth);

        return (
            <div className="flex-1">
                <h3 className="text-center font-semibold text-slate-700 dark:text-slate-300 mb-1.5 capitalize text-xs">
                    {monthNames[displayMonth.getMonth()]} {displayMonth.getFullYear()}
                </h3>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {dayNames.map(day => (
                        <div key={day} className="text-center text-[9px] font-medium text-slate-500 dark:text-slate-400 py-0.5">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-0.5">
                    {days.map((date, idx) => {
                        if (!date) {
                            return <div key={`empty-${idx}`} className="w-6 h-6 sm:w-7 sm:h-7" />;
                        }

                        const inRange = isInRange(date);
                        const isStart = isStartDate(date);
                        const isEnd = isEndDate(date);
                        const weekend = isWeekend(date);

                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleDateClick(date)}
                                className={`
                  w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[10px] sm:text-xs rounded
                  transition-colors relative
                  ${isStart || isEnd
                                        ? 'bg-blue-600 text-white font-semibold hover:bg-blue-700'
                                        : inRange
                                            ? 'bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:hover:bg-blue-800/60'
                                            : weekend
                                                ? 'text-slate-400 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-800'
                                                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                                    }
                `}
                            >
                                {date.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 sm:p-2.5 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-2">
                <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                >
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-400" />
                </button>

                <div className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">
                    {selectingStart ? 'Selecciona fecha de inicio' : 'Selecciona fecha de fin'}
                </div>

                <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                >
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-400" />
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
                {renderMonth(0)}
                <div className="hidden md:block flex-1">
                    {renderMonth(1)}
                </div>
            </div>
        </div>
    );
};
