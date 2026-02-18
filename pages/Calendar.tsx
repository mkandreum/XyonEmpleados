import React, { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, X, Download } from 'lucide-react';
import { fichajeService, vacationService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FichajeDayStats, VacationRequest, VacationStatus } from '../types';

function toISODate(date: Date) {
  return date.toISOString().split('T')[0];
}

function isBetween(target: Date, start: Date, end: Date) {
  const t = target.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

const weekdayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

type DayBadge = {
  color: string;       // tailwind bg class for the dot
  textColor: string;   // tailwind text class 
  label: string;       // full label for detail panel
  shortLabel: string;  // 1-2 char for mobile dot
  detail?: string;
  range?: {
    isStart: boolean;
    isEnd: boolean;
  };
};

export const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [fichajeDays, setFichajeDays] = useState<Record<string, FichajeDayStats>>({});
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [downloading, setDownloading] = useState(false);

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const month = currentMonth.getMonth() + 1;
      const year = currentMonth.getFullYear();
      const blob = await fichajeService.getAttendanceReport(month, year);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-asistencia-${year}-${String(month).padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading report', err);
    } finally {
      setDownloading(false);
    }
  };

  const loadData = async (reference: Date) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [monthStats, vacs] = await Promise.all([
        fichajeService.getMonth(user.id),
        vacationService.getAll()
      ]);

      const fichajeMap: Record<string, FichajeDayStats> = {};
      monthStats.forEach((day) => {
        fichajeMap[day.date] = day;
      });

      setFichajeDays(fichajeMap);
      setVacations(vacs);
    } catch (err) {
      console.error('Error loading calendar data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentMonth);
  }, [currentMonth]);

  const days = useMemo(() => {
    const total = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const offset = (firstDay.getDay() + 6) % 7;
    return Array.from({ length: offset + total }).map((_, idx) => {
      if (idx < offset) return null;
      const dayNum = idx - offset + 1;
      return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
    });
  }, [currentMonth]);

  const getDayBadge = (date: Date): DayBadge | null => {
    const dayKey = toISODate(date);
    const todayIso = toISODate(new Date());
    const isFuture = date.getTime() > new Date(todayIso + 'T00:00:00').getTime();

    // Check vacations/absences first
    const vacation = vacations.find((v) => {
      const start = new Date(v.startDate);
      const end = new Date(v.endDate);
      return isBetween(date, start, end);
    });

    if (vacation) {
      const start = new Date(vacation.startDate);
      const end = new Date(vacation.endDate);
      const isStart = toISODate(start) === dayKey;
      const isEnd = toISODate(end) === dayKey;
      const rangeInfo = { range: { isStart, isEnd } };

      if (vacation.type === 'SICK_LEAVE') {
        return { color: 'bg-emerald-500', textColor: 'text-emerald-600', label: 'Baja médica', shortLabel: '🏥', ...rangeInfo };
      }
      if (vacation.type === 'PERSONAL' || vacation.type === 'OTHER') {
        return { color: 'bg-amber-400', textColor: 'text-amber-600', label: 'Permiso', shortLabel: 'P', ...rangeInfo };
      }
      if (vacation.status === VacationStatus.APPROVED) {
        return { color: 'bg-blue-500', textColor: 'text-blue-600', label: 'Vacaciones', shortLabel: '🏖', ...rangeInfo };
      }
      if (vacation.status === VacationStatus.REJECTED) {
        return { color: 'bg-red-500', textColor: 'text-red-600', label: 'Rechazado', shortLabel: '✗', ...rangeInfo };
      }
      return { color: 'bg-amber-500', textColor: 'text-amber-600', label: 'Pendiente', shortLabel: '⏳', ...rangeInfo };
    }

    const stats = fichajeDays[dayKey];
    if (!stats && isFuture) return null;
    if (!stats) return { color: 'bg-rose-500', textColor: 'text-rose-600', label: 'No fichado', shortLabel: '✗' };

    const goodDay = stats.isComplete && !stats.isLate && !stats.isEarlyDeparture;
    if (goodDay) return { color: 'bg-emerald-500', textColor: 'text-emerald-600', label: 'Fichado correcto', shortLabel: '✓', detail: `${stats.horasTrabajadas}h` };

    const badDay = stats.isLate || stats.isEarlyDeparture || !stats.isComplete;
    if (badDay) return { color: 'bg-amber-500', textColor: 'text-amber-600', label: 'Revisar fichaje', shortLabel: '!', detail: `${stats.horasTrabajadas}h` };

    return null;
  };

  const changeMonth = (delta: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    setSelectedDay(null);
  };

  const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentMonth);

  const selectedBadge = selectedDay ? getDayBadge(selectedDay) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="text-blue-600 shrink-0" size={22} />
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Mi calendario</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Fichajes, vacaciones y permisos en un vistazo.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-center">
          <button
            onClick={downloadReport}
            disabled={downloading || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
            title="Descargar reporte de asistencia del mes"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span className="hidden sm:inline">Reporte</span>
          </button>
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-2 py-1 shadow-sm">
            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" aria-label="Mes anterior">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 min-w-[120px] text-center capitalize">
              {monthLabel}
            </span>
            <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" aria-label="Mes siguiente">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-2 sm:p-6">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center text-[11px] sm:text-sm font-semibold text-slate-400 dark:text-slate-500 mb-1 sm:mb-3">
          {weekdayLabels.map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
            <Loader2 className="animate-spin mr-2" size={18} /> Cargando...
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-[2px] sm:gap-2">
            {days.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} />;
              const badge = getDayBadge(date);
              const dayNumber = date.getDate();
              const isToday = toISODate(date) === toISODate(new Date());
              const isSelected = selectedDay && toISODate(date) === toISODate(selectedDay);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <button
                  key={dayNumber}
                  onClick={() => setSelectedDay(date)}
                  className={`
                    relative flex flex-col items-center justify-center 
                    aspect-square rounded-lg sm:rounded-xl
                    transition-all duration-150
                    ${isToday ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900' : ''}
                    ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 scale-105' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                    ${isWeekend && !badge ? 'opacity-40' : ''}
                  `}
                >
                  {/* Day number */}
                  <span className={`
                    text-[11px] sm:text-sm font-medium leading-none
                    ${isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-600 dark:text-slate-300'}
                  `}>
                    {dayNumber}
                  </span>

                  {/* Badge dot (mobile) / Badge pill (desktop) */}
                  {badge && (
                    <>
                      {/* Mobile: colored dot */}
                      <span className={`sm:hidden mt-0.5 w-2 h-2 rounded-full ${badge.color}`} />
                      {/* Desktop: pill label */}
                      <span className={`hidden sm:inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.color} text-white leading-none whitespace-nowrap`}>
                        {badge.label.length > 10 ? badge.label.slice(0, 8) + '…' : badge.label}
                      </span>
                    </>
                  )}

                  {/* Detail text (hours) - desktop only */}
                  {badge?.detail && (
                    <span className="hidden sm:block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{badge.detail}</span>
                  )}

                  {/* Vacation range connector */}
                  {badge?.range && (
                    <div className={`absolute inset-y-1 ${badge.range.isStart ? 'left-1/2 right-0' : badge.range.isEnd ? 'left-0 right-1/2' : 'left-0 right-0'} ${badge.color} opacity-10 -z-0`} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected day detail panel */}
      {selectedDay && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">
              {selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
          {selectedBadge ? (
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${selectedBadge.color} shrink-0`} />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedBadge.label}</span>
                {selectedBadge.detail && (
                  <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">({selectedBadge.detail})</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin datos para este día</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-3 sm:p-4">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          <LegendDot color="bg-emerald-500" label="Correcto" />
          <LegendDot color="bg-amber-500" label="Incidencia" />
          <LegendDot color="bg-rose-500" label="No fichado" />
          <LegendDot color="bg-blue-500" label="Vacaciones" />
          <LegendDot color="bg-red-500" label="Rechazadas" />
          <LegendDot color="bg-emerald-500" label="Baja médica" outline />
          <LegendDot color="bg-amber-400" label="Permiso" outline />
        </div>
      </div>
    </div>
  );
};

const LegendDot: React.FC<{ color: string; label: string; outline?: boolean }> = ({ color, label, outline }) => (
  <div className="flex items-center gap-1.5">
    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${outline ? 'border-2 border-current' : color}`} />
    <span>{label}</span>
  </div>
);

export default CalendarPage;
