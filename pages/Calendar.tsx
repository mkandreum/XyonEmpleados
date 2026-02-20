import React, { useEffect, useMemo, useState } from 'react';
import SignatureModal from '../components/SignatureModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Download, FileText, CheckCircle2, AlertTriangle, Clock, MapPin, Search } from 'lucide-react';
import { fichajeService, vacationService, fichajeAdjustmentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FichajeDayStats, VacationRequest, VacationStatus, Fichaje, FichajeAdjustment, FichajeAdjustmentStatus } from '../types';
import { useSettings } from '../hooks/useSettings';
import { AdjustFichajeModal } from '../components/AdjustFichajeModal';
import { TeamCalendarView } from '../components/TeamCalendarView';
import { toast } from 'react-hot-toast';

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
  const { user } = useAuth() as any;
  const { settings } = useSettings();
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [fichajeDays, setFichajeDays] = useState<Record<string, FichajeDayStats>>({});
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<FichajeAdjustment[]>([]);
  const [adjustingFichaje, setAdjustingFichaje] = useState<Fichaje | null>(null);
  // Selector de vista: 'calendario', 'cuadrante' o 'equipo'
  const [view, setView] = useState<'calendario' | 'cuadrante' | 'equipo'>('calendario');

  const loadData = async (reference: Date) => {
    if (!user) return;
    setLoading(true);
    try {
      const firstDay = new Date(reference.getFullYear(), reference.getMonth(), 1);
      const lastDay = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);

      const [monthStats, vacs, myAdjustments] = await Promise.all([
        fichajeService.getMonth(user.id),
        vacationService.getAll(),
        fichajeAdjustmentService.getMyRequests()
      ]);

      const statsMap: Record<string, FichajeDayStats> = {};
      if (Array.isArray(monthStats)) {
        monthStats.forEach(s => {
          statsMap[s.date] = s;
        });
      }
      setFichajeDays(statsMap);
      setVacations(vacs);
      setAdjustments(myAdjustments);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentMonth);
  }, [currentMonth, user]);

  const monthLabel = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const days = useMemo(() => {
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const startPadding = [];
    for (let i = firstDayOfWeek; i > 0; i--) {
      startPadding.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1 - i));
    }

    const monthDays = [];
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      monthDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }

    const lastDayOfWeek = (lastDayOfMonth.getDay() + 6) % 7;
    const endPadding = [];
    for (let i = 1; i < (7 - lastDayOfWeek); i++) {
      endPadding.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i));
    }

    return [...startPadding, ...monthDays, ...endPadding];
  }, [currentMonth]);

  const handleDownloadClick = () => {
    setShowSignatureModal(true);
  };

  const handleSignatureConfirm = async (signature: string) => {
    setShowSignatureModal(false);
    setDownloading(true);
    setSignatureDataUrl(signature);
    try {
      const month = currentMonth.getMonth() + 1;
      const year = currentMonth.getFullYear();
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text('Reporte de Asistencia', 14, 18);
      doc.setFontSize(12);
      doc.text(`${user?.name || ''} - ${monthLabel}`, 14, 28);

      if (settings?.logoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = settings.logoUrl;
          await new Promise((resolve) => { img.onload = resolve; });
          doc.addImage(img, 'PNG', 160, 10, 35, 18);
        } catch { }
      }

      const daysInMonth = new Date(year, month, 0).getDate();
      const tableData = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const stats = fichajeDays[dateStr];
        let entrada = '';
        let salida = '';
        let horas = '';
        let incidencia = '';
        let ausencia = '';

        const vac = vacations.find(v => {
          const start = new Date(v.startDate);
          const end = new Date(v.endDate);
          const current = new Date(dateStr);
          return current >= start && current <= end && v.status === 'APPROVED';
        });

        if (vac) {
          ausencia = vac.type === 'VACATION' ? 'Vacaciones' : 'Ausencia';
        }

        if (stats) {
          if (stats.fichajes && stats.fichajes.length > 0) {
            const ent = stats.fichajes.find(f => f.tipo === 'ENTRADA');
            const sal = stats.fichajes.filter(f => f.tipo === 'SALIDA').pop();
            if (ent) entrada = new Date(ent.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (sal) salida = new Date(sal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          horas = stats.horasTrabajadas.toString();
          if (stats.isLate) incidencia = 'Entrada tarde';
          if (stats.isEarlyDeparture) incidencia += (incidencia ? ', ' : '') + 'Salida temprana';
          if (!stats.isComplete) incidencia += (incidencia ? ', ' : '') + 'Incompleto';
        }

        tableData.push([d, entrada, salida, horas, incidencia, ausencia]);
      }

      autoTable(doc, {
        head: [['Día', 'Entrada', 'Salida', 'Horas', 'Incidencia', 'Ausencia']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [51, 65, 85] }
      });

      const finalY = (doc as any).lastAutoTable.cursor.y;
      doc.setFontSize(10);
      doc.text('Firma del empleado:', 140, finalY + 20);
      doc.addImage(signature, 'PNG', 140, finalY + 22, 40, 20);

      doc.save(`reporte-asistencia-${year}-${month}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  const getDayBadge = (date: Date): DayBadge | null => {
    const isoString = toISODate(date);
    const stats = fichajeDays[isoString];

    const approvedVacations = vacations.filter(v =>
      v.status === 'APPROVED' &&
      isBetween(date, new Date(v.startDate), new Date(v.endDate))
    );

    if (approvedVacations.length > 0) {
      const v = approvedVacations[0];
      const colorMap = {
        VACATION: 'bg-blue-500',
        SICK_LEAVE: 'bg-emerald-500',
        PERSONAL: 'bg-amber-400',
        OVERTIME: 'bg-indigo-500',
        OTHER: 'bg-slate-400'
      };
      const labelMap = {
        VACATION: 'Vacaciones',
        SICK_LEAVE: 'Baja Médica',
        PERSONAL: 'Asuntos Propios/Permiso',
        OVERTIME: 'Compensación Horas',
        OTHER: 'Ausencia'
      };

      const start = new Date(v.startDate);
      const end = new Date(v.endDate);
      const isStart = toISODate(date) === toISODate(start);
      const isEnd = toISODate(date) === toISODate(end);

      return {
        color: colorMap[v.type as keyof typeof colorMap] || 'bg-blue-500',
        textColor: 'text-white',
        label: labelMap[v.type as keyof typeof labelMap] || 'Ausencia',
        shortLabel: v.type === 'VACATION' ? 'V' : 'A',
        outline: v.type !== 'VACATION',
        range: { isStart, isEnd }
      } as any;
    }

    if (!stats || stats.fichajes.length === 0) {
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (isWeekend) return null;
      if (date > new Date()) return null;
      return {
        color: 'bg-rose-500',
        textColor: 'text-white',
        label: 'No fichado',
        shortLabel: '!'
      };
    }

    const goodDay = stats.isComplete && !stats.isLate && !stats.isEarlyDeparture;
    if (goodDay) {
      return {
        color: 'bg-emerald-500',
        textColor: 'text-white',
        label: 'Fichado correcto',
        shortLabel: '✓',
        detail: `${stats.horasTrabajadas}h`
      };
    }

    const badDay = stats.isLate || stats.isEarlyDeparture || !stats.isComplete;
    if (badDay) {
      return {
        color: 'bg-amber-500',
        textColor: 'text-white',
        label: 'Incidencia',
        shortLabel: '!',
        detail: `${stats.horasTrabajadas}h`
      };
    }

    return null;
  };

  const selectedBadge = selectedDay ? getDayBadge(selectedDay) : null;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Selector de píldora */}
      <div className="flex justify-center items-center gap-4 mt-6">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
          <button
            className={`px-5 py-1.5 rounded-full font-semibold text-sm transition-all focus:outline-none ${view === 'calendario' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            onClick={() => setView('calendario')}
          >
            Calendario
          </button>
          <button
            className={`px-5 py-1.5 rounded-full font-semibold text-sm transition-all focus:outline-none ${view === 'cuadrante' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            onClick={() => setView('cuadrante')}
          >
            Cuadrante
          </button>
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <button
              className={`px-5 py-1.5 rounded-full font-semibold text-sm transition-all focus:outline-none ${view === 'equipo' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              onClick={() => setView('equipo')}
            >
              C. Equipo
            </button>
          )}
        </div>
      </div>

      {/* Vista Calendario */}
      {view === 'calendario' && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="text-blue-600" />
                Calendario de Asistencia
              </h1>
              <p className="text-slate-500 dark:text-slate-400">Control de fichajes y ausencias mensuales</p>
            </div>
            <button
              onClick={handleDownloadClick}
              disabled={downloading}
              className="bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 font-medium shadow-sm disabled:opacity-50"
            >
              {downloading ? <Clock className="animate-spin" size={18} /> : <Download size={18} />}
              {downloading ? 'Generando...' : 'Descargar Reporte'}
            </button>
          </div>

          <SignatureModal
            isOpen={showSignatureModal}
            onClose={() => setShowSignatureModal(false)}
            onConfirm={handleSignatureConfirm}
          />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm shadow-slate-200/50 dark:shadow-none">
            {/* Header con mes */}
            <div className="p-4 md:p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize">{monthLabel}</h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-100 dark:border-slate-800 shadow-sm">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-100 dark:border-slate-800 shadow-sm">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Labels de días */}
            <div className="grid grid-cols-7 border-b border-slate-50 dark:border-slate-800/50">
              {weekdayLabels.map(l => (
                <div key={l} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">{l}</div>
              ))}
            </div>

            {/* Celdas del calendario */}
            {loading ? (
              <div className="h-[400px] flex items-center justify-center bg-slate-50/30 dark:bg-slate-900/10">
                <div className="flex flex-col items-center gap-2">
                  <Clock className="animate-spin text-blue-500" size={32} />
                  <p className="text-sm font-medium text-slate-400">Cargando mensualidad...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {days.map((d, i) => {
                  const isToday = toISODate(d) === toISODate(new Date());
                  const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
                  const isSelected = selectedDay && toISODate(d) === toISODate(selectedDay);
                  const badge = getDayBadge(d);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(d)}
                      className={`relative flex flex-col items-center justify-center aspect-square rounded-xl sm:rounded-2xl transition-all duration-200 p-1 mx-0.5 my-0.5
                    ${!isCurrentMonth ? 'opacity-20' : 'opacity-100'}
                    ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20 z-10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}
                    ${isWeekend && !badge ? 'bg-slate-50/50 dark:bg-slate-900/20' : ''}
                  `}
                    >
                      {/* Numero del día con indicador 'Hoy' */}
                      <span className={`text-xs sm:text-sm font-medium leading-none mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : isCurrentMonth ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>
                        {d.getDate()}
                        {isToday && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                      </span>

                      {/* Badge visual (punto o etiqueta corta) */}
                      {badge && (
                        <>
                          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${badge.color} shadow-sm`} />
                          <span className={`hidden sm:inline-block mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${badge.textColor} ${badge.color} leading-none whitespace-nowrap`}>
                            {badge.detail || badge.shortLabel}
                          </span>
                        </>
                      )}

                      {/* Range connector for vacations */}
                      {badge?.range && (
                        <div className={`absolute inset-y-1 ${badge.range.isStart ? 'left-1/2 right-0' : badge.range.isEnd ? 'left-0 right-1/2' : 'left-0 right-0'} ${badge.color} opacity-10 -z-0`} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ...existing code... */}
          {/* Selected day detail panel */}
          {selectedDay && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 animate-in slide-in-from-bottom-2">
              {/* ...existing code... */}
            </div>
          )}

          {adjustingFichaje && (
            <AdjustFichajeModal
              fichaje={adjustingFichaje}
              onClose={() => setAdjustingFichaje(null)}
              onSuccess={() => {
                toast.success('Solicitud enviada correctamente');
                loadData(currentMonth);
              }}
            />
          )}

          {/* Legend */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <LegendDot color="bg-emerald-500" label="Correcto" />
              <LegendDot color="bg-amber-500" label="Incidencia" />
              <LegendDot color="bg-rose-500" label="No fichado" />
              <LegendDot color="bg-blue-500" label="Vacaciones" />
              <LegendDot color="bg-red-500" label="Rechazadas" />
              <LegendDot color="bg-emerald-500" label="Horas médicas" outline />
              <LegendDot color="bg-amber-400" label="Permiso" outline />
            </div>
          </div>
        </>
      )}

      {/* Vista Cuadrante (Personal para empleados, Equipo para Managers) */}
      {view === 'cuadrante' && (
        user?.role === 'MANAGER' || user?.role === 'ADMIN' ? (
          <TeamCalendarView mode="shifts" />
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm shadow-slate-200/50 dark:shadow-none">
            <div className="p-4 md:p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize flex items-center gap-2">
                <CalendarIcon className="text-blue-600" />
                Mi Cuadrante: Horarios y Fichajes
              </h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-100 dark:border-slate-800 shadow-sm">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-100 dark:border-slate-800 shadow-sm">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            {/* Labels de días */}
            <div className="grid grid-cols-7 border-b border-slate-50 dark:border-slate-800/50">
              {weekdayLabels.map(l => (
                <div key={l} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">{l}</div>
              ))}
            </div>
            {/* Celdas del cuadrante */}
            <div className="grid grid-cols-7">
              {days.map((d, i) => {
                const isToday = toISODate(d) === toISODate(new Date());
                const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
                const stats = fichajeDays[toISODate(d)];
                const vac = vacations.find(v => {
                  const start = new Date(v.startDate);
                  const end = new Date(v.endDate);
                  return d >= start && d <= end && v.status === 'APPROVED';
                });
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={`relative flex flex-col items-center justify-start aspect-square rounded-xl sm:rounded-2xl transition-all duration-200 p-1 mx-0.5 my-0.5 border border-transparent ${!isCurrentMonth ? 'opacity-20' : 'opacity-100'} ${isToday ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20 z-10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'} ${isWeekend ? 'bg-slate-50/50 dark:bg-slate-900/20' : ''}`}
                  >
                    <span className={`text-xs sm:text-sm font-medium leading-none mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : isCurrentMonth ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>
                      {d.getDate()}
                    </span>
                    {stats && stats.turno && (
                      <span className="block text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                        {stats.turno.label}
                      </span>
                    )}
                    {stats && stats.fichajes.length > 0 && (
                      <div className="flex flex-col gap-0.5 items-center w-full">
                        {stats.fichajes.slice(0, 2).map((f, idx) => (
                          <span key={idx} className={`inline-block px-1 py-0.5 rounded-full font-mono text-[9px] ${f.tipo === 'ENTRADA' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {f.tipo === 'ENTRADA' ? 'E' : 'S'} {new Date(f.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ))}
                      </div>
                    )}
                    {vac && (
                      <span className="block text-[10px] mt-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium">
                        {vac.type === 'VACATION' ? 'Vacaciones' : 'Ausencia'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Vista Calendario Equipo (Manager/Admin Only) */}
      {view === 'equipo' && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
        <TeamCalendarView mode="absences" />
      )}
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
