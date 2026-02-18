import React, { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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
  color: string;
  label: string;
  detail?: string;
};

export const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [fichajeDays, setFichajeDays] = useState<Record<string, FichajeDayStats>>({});
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);

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
    const offset = (firstDay.getDay() + 6) % 7; // convert Sunday=0 to Monday=0
    return Array.from({ length: offset + total }).map((_, idx) => {
      if (idx < offset) return null;
      const dayNum = idx - offset + 1;
      return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
    });
  }, [currentMonth]);

  const dayBadge = (date: Date): DayBadge | null => {
    const dayKey = toISODate(date);

    // Check vacations/absences first
    const vacation = vacations.find((v) => {
      const start = new Date(v.startDate);
      const end = new Date(v.endDate);
      return isBetween(date, start, end);
    });

    if (vacation) {
      if (vacation.type === 'SICK_LEAVE') {
        return { color: 'bg-emerald-500 text-white', label: 'Médica' };
      }
      if (vacation.type === 'PERSONAL' || vacation.type === 'OTHER') {
        return { color: 'bg-amber-400 text-white', label: 'Permiso' };
      }
      if (vacation.status === VacationStatus.APPROVED) {
        return { color: 'bg-blue-500 text-white', label: 'Vacaciones' };
      }
      if (vacation.status === VacationStatus.REJECTED) {
        return { color: 'bg-red-500 text-white', label: 'Rechazado' };
      }
      return { color: 'bg-amber-500 text-white', label: 'Pendiente' };
    }

    const stats = fichajeDays[dayKey];
    if (!stats) return { color: 'bg-rose-500 text-white', label: 'Sin fichar' };

    const goodDay = stats.isComplete && !stats.isLate && !stats.isEarlyDeparture;
    if (goodDay) return { color: 'bg-emerald-500 text-white', label: 'OK', detail: `${stats.horasTrabajadas}h` };

    const badDay = stats.isLate || stats.isEarlyDeparture || !stats.isComplete;
    if (badDay) return { color: 'bg-amber-500 text-white', label: 'Revisar', detail: `${stats.horasTrabajadas}h` };

    return null;
  };

  const changeMonth = (delta: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentMonth);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="text-blue-600" size={22} />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Mi calendario</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Fichajes, vacaciones y permisos en un vistazo.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1 shadow-sm">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" aria-label="Mes anterior">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 min-w-[120px] text-center">
            {monthLabel}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" aria-label="Mes siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 sm:p-6">
        <div className="grid grid-cols-7 text-center text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 sm:mb-3">
          {weekdayLabels.map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
            <Loader2 className="animate-spin mr-2" size={18} /> Cargando calendario...
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-sm">
            {days.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} />;
              const badge = dayBadge(date);
              const dayNumber = date.getDate();
              const isToday = toISODate(date) === toISODate(new Date());

              return (
                <div
                  key={dayNumber}
                  className={`relative aspect-square rounded-xl border border-slate-100 dark:border-slate-800 p-1 sm:p-2 flex flex-col gap-1 justify-between bg-white dark:bg-slate-950/40 ${isToday ? 'ring-2 ring-blue-500/60' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{dayNumber}</span>
                    {badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                    )}
                  </div>
                  {badge?.detail && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{badge.detail}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 sm:p-6 flex flex-wrap gap-3 text-sm text-slate-700 dark:text-slate-300">
        <LegendDot color="bg-emerald-500" label="Fichado correcto" />
        <LegendDot color="bg-amber-500" label="Fichaje con incidencias" />
        <LegendDot color="bg-rose-500" label="No fichado" />
        <LegendDot color="bg-blue-500" label="Vacaciones aprobadas" />
        <LegendDot color="bg-red-500" label="Vacaciones rechazadas" />
        <LegendDot color="bg-emerald-500" label="Baja / hora médica" outline />
        <LegendDot color="bg-amber-400" label="Otros permisos" outline />
        <LegendDot color="bg-amber-500" label="Solicitud pendiente" outline />
      </div>
    </div>
  );
};

const LegendDot: React.FC<{ color: string; label: string; outline?: boolean }> = ({ color, label, outline }) => {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${outline ? 'border' : ''} ${color}`} />
      <span>{label}</span>
    </div>
  );
};

export default CalendarPage;
