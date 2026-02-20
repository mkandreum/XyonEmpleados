import React, { useEffect, useMemo, useState } from 'react';
import SignatureModal from '../components/SignatureModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Download, FileText, CheckCircle2, AlertTriangle, Clock, MapPin, Search } from 'lucide-react';
import { fichajeService, vacationService, fichajeAdjustmentService, scheduleService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FichajeDayStats, VacationRequest, VacationStatus, Fichaje, FichajeAdjustment, FichajeAdjustmentStatus, DepartmentSchedule, DayScheduleOverride } from '../types';
import { useSettings } from '../hooks/useSettings';
import { AdjustFichajeModal } from '../components/AdjustFichajeModal';
import { TeamCalendarView } from '../components/TeamCalendarView';
import { userShiftAssignmentService } from '../services/userShiftAssignmentService';
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

// Color palette for shifts/schedules
const SHIFT_COLORS = [
  { bg: 'bg-blue-500', bgLight: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', hex: '#3B82F6' },
  { bg: 'bg-violet-500', bgLight: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800', hex: '#8B5CF6' },
  { bg: 'bg-emerald-500', bgLight: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', hex: '#10B981' },
  { bg: 'bg-amber-500', bgLight: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', hex: '#F59E0B' },
  { bg: 'bg-rose-500', bgLight: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', hex: '#F43F5E' },
  { bg: 'bg-cyan-500', bgLight: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800', hex: '#06B6D4' },
  { bg: 'bg-orange-500', bgLight: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', hex: '#F97316' },
];

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
  // Employee shift assignments for cuadrante
  const [myShiftAssignments, setMyShiftAssignments] = useState<any[]>([]);
  const [departmentSchedules, setDepartmentSchedules] = useState<DepartmentSchedule[]>([]);

  // For managers/admins only show 'calendario' and 'equipo'
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
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

      // Load employee's own shift assignments for cuadrante view
      if (!isManagerOrAdmin) {
        try {
          const shifts = await userShiftAssignmentService.getUserShifts(
            user.id,
            reference.getMonth() + 1,
            reference.getFullYear()
          );
          setMyShiftAssignments(shifts);
        } catch { setMyShiftAssignments([]); }

        try {
          const schedules = await scheduleService.get(user.department || 'General');
          if (Array.isArray(schedules)) setDepartmentSchedules(schedules);
          else setDepartmentSchedules([schedules]);
        } catch { setDepartmentSchedules([]); }
      }
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
      {/* Selector de píldora con diseño deslizable */}
      <div className="flex justify-center items-center mt-2">
        <div className="relative flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Fondo deslizable (indicador) */}
          <div
            className="absolute top-1 bottom-1 left-1 rounded-full bg-white dark:bg-slate-900 shadow-sm transition-transform duration-300 ease-out z-0"
            style={{
              width: 'calc(50% - 4px)', // Asumiendo 2 botones iguales en tamaño
              transform: `translateX(${view === 'calendario' ? '0%' : '100%'})` // 100% + gap si hubiera
            }}
          />

          <button
            className={`relative z-10 px-6 py-1.5 font-semibold text-sm transition-colors focus:outline-none flex-1 text-center w-[120px] ${view === 'calendario' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            onClick={() => setView('calendario')}
          >
            Calendario
          </button>

          {/* Cuadrante only for employees */}
          {!isManagerOrAdmin && (
            <button
              className={`relative z-10 px-6 py-1.5 font-semibold text-sm transition-colors focus:outline-none flex-1 text-center w-[120px] ${view === 'cuadrante' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              onClick={() => setView('cuadrante')}
            >
              Cuadrante
            </button>
          )}

          {/* Equipo solo para Managers/Admins */}
          {isManagerOrAdmin && (
            <button
              className={`relative z-10 px-6 py-1.5 font-semibold text-sm transition-colors focus:outline-none flex-1 text-center w-[120px] ${view === 'equipo' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
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

      {/* Vista Cuadrante (Employee only - clean mobile/desktop view) */}
      {view === 'cuadrante' && !isManagerOrAdmin && (
        <EmployeeCuadranteView
          currentMonth={currentMonth}
          prevMonth={prevMonth}
          nextMonth={nextMonth}
          days={days}
          fichajeDays={fichajeDays}
          vacations={vacations}
          myShiftAssignments={myShiftAssignments}
          departmentSchedules={departmentSchedules}
          loading={loading}
        />
      )}

      {/* Vista Calendario Equipo (Manager/Admin Only) */}
      {view === 'equipo' && isManagerOrAdmin && (
        <TeamCalendarView mode="both" />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Employee Cuadrante View (Mobile-friendly shift calendar)
// ─────────────────────────────────────────────────────────
interface EmployeeCuadranteProps {
  currentMonth: Date;
  prevMonth: () => void;
  nextMonth: () => void;
  days: Date[];
  fichajeDays: Record<string, FichajeDayStats>;
  vacations: VacationRequest[];
  myShiftAssignments: any[];
  departmentSchedules: DepartmentSchedule[];
  loading: boolean;
}

const EmployeeCuadranteView: React.FC<EmployeeCuadranteProps> = ({
  currentMonth, prevMonth, nextMonth, days, fichajeDays, vacations, myShiftAssignments, departmentSchedules, loading
}) => {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const monthLabel = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  // Build a color map for unique shift names
  const shiftColorMap = useMemo(() => {
    const map = new Map<string, typeof SHIFT_COLORS[0]>();
    const uniqueShifts = new Set<string>();

    // From assigned shifts
    myShiftAssignments.forEach(a => {
      if (a.shift?.name) uniqueShifts.add(a.shift.name);
    });

    // From department schedules
    departmentSchedules.forEach(s => {
      if (s.name) uniqueShifts.add(s.name);
    });

    let colorIdx = 0;
    uniqueShifts.forEach(name => {
      map.set(name, SHIFT_COLORS[colorIdx % SHIFT_COLORS.length]);
      colorIdx++;
    });
    return map;
  }, [myShiftAssignments, departmentSchedules]);

  // Get shift for a given date
  const getShiftForDate = (date: Date) => {
    const dateStr = toISODate(date);
    // First check assigned shifts
    const assignment = myShiftAssignments.find(a => {
      const aDate = new Date(a.date);
      return toISODate(aDate) === dateStr;
    });
    if (assignment?.shift) {
      return {
        name: assignment.shift.name,
        horaEntrada: assignment.shift.horaEntrada,
        horaSalida: assignment.shift.horaSalida,
        color: shiftColorMap.get(assignment.shift.name) || SHIFT_COLORS[0]
      };
    }

    // Fall back to department schedule (based on day of week)
    if (departmentSchedules.length > 0) {
      const dayMap: Record<number, string> = {
        0: 'scheduleDomingo', 1: 'scheduleLunes', 2: 'scheduleMartes',
        3: 'scheduleMiercoles', 4: 'scheduleJueves', 5: 'scheduleViernes', 6: 'scheduleSabado'
      };
      const dayField = dayMap[date.getDay()] as keyof DepartmentSchedule;

      // Use first schedule
      const schedule = departmentSchedules[0];
      const dayOverride = schedule[dayField] as DayScheduleOverride | null;

      if (dayOverride && typeof dayOverride === 'object') {
        if (dayOverride.dayOff) return null; // Day off
        return {
          name: schedule.name || 'General',
          horaEntrada: dayOverride.horaEntrada || schedule.horaEntrada,
          horaSalida: dayOverride.horaSalida || schedule.horaSalida,
          color: shiftColorMap.get(schedule.name) || SHIFT_COLORS[0]
        };
      }

      // No override, use general
      return {
        name: schedule.name || 'General',
        horaEntrada: schedule.horaEntrada,
        horaSalida: schedule.horaSalida,
        color: shiftColorMap.get(schedule.name) || SHIFT_COLORS[0]
      };
    }

    return null;
  };

  // Get vacation for a date
  const getVacationForDate = (date: Date) => {
    return vacations.find(v => {
      const start = new Date(v.startDate);
      const end = new Date(v.endDate);
      return isBetween(date, start, end) && v.status === 'APPROVED';
    });
  };

  const selectedShift = selectedDay ? getShiftForDate(selectedDay) : null;
  const selectedVac = selectedDay ? getVacationForDate(selectedDay) : null;
  const selectedStats = selectedDay ? fichajeDays[toISODate(selectedDay)] : null;

  return (
    <div className="space-y-4">
      {/* Color Legend Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <CalendarIcon size={16} className="text-blue-600" />
          Mi Cuadrante de Horarios
        </h3>
        <div className="flex flex-wrap gap-3">
          {Array.from(shiftColorMap.entries()).map(([name, color]) => {
            const schedule = departmentSchedules.find(s => s.name === name);
            const shiftAssign = myShiftAssignments.find(a => a.shift?.name === name);
            const entry = shiftAssign?.shift?.horaEntrada || schedule?.horaEntrada || '';
            const exit = shiftAssign?.shift?.horaSalida || schedule?.horaSalida || '';

            return (
              <div key={name} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${color.border} ${color.bgLight} transition-all`}>
                <span className={`w-3 h-3 rounded-full ${color.bg} shadow-sm shrink-0`} />
                <div className="min-w-0">
                  <span className={`text-xs font-bold ${color.text} block`}>{name}</span>
                  {entry && exit && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{entry} - {exit}</span>
                  )}
                </div>
              </div>
            );
          })}
          {/* Vacation/Absence legend */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm shrink-0" />
            <span className="text-xs font-bold text-green-700 dark:text-green-300">Vacaciones</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shrink-0" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Ausencia</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 shadow-sm shrink-0" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Libre</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Month Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white capitalize">{monthLabel}</h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-100 dark:border-slate-800 shadow-sm">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-100 dark:border-slate-800 shadow-sm">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 border-b border-slate-50 dark:border-slate-800/50">
          {weekdayLabels.map(l => (
            <div key={l} className="py-2 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">{l}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="h-[320px] flex items-center justify-center">
            <Clock className="animate-spin text-blue-500" size={28} />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {days.map((d, i) => {
              const isToday = toISODate(d) === toISODate(new Date());
              const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
              const isSelected = selectedDay && toISODate(d) === toISODate(selectedDay);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const shift = getShiftForDate(d);
              const vac = getVacationForDate(d);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(d)}
                  className={`relative flex flex-col items-center justify-center aspect-square transition-all duration-200 p-0.5
                    ${!isCurrentMonth ? 'opacity-20' : ''}
                    ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/60 dark:bg-blue-900/30 z-10 rounded-xl' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                    ${isWeekend && !shift && !vac ? 'bg-slate-50/40 dark:bg-slate-900/30' : ''}
                  `}
                >
                  {/* Day number */}
                  <span className={`text-xs font-semibold leading-none mb-0.5 
                    ${isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : isCurrentMonth ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}
                  `}>
                    {d.getDate()}
                    {isToday && <span className="absolute top-0.5 right-0.5 w-1 h-1 bg-blue-600 rounded-full" />}
                  </span>

                  {/* Colored dot for shift */}
                  {vac ? (
                    <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shadow-sm ${vac.type === 'VACATION' ? 'bg-green-500' : 'bg-amber-500'}`} />
                  ) : shift ? (
                    <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shadow-sm ${shift.color.bg}`} />
                  ) : isWeekend || !isCurrentMonth ? (
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                  ) : null}

                  {/* Desktop: show schedule name */}
                  <span className="hidden sm:block text-[8px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-full px-0.5">
                    {vac ? (vac.type === 'VACATION' ? 'Vac' : 'Aus') : shift?.name || ''}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Day Detail */}
      {selectedDay && isCurrentMonth(selectedDay) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 dark:text-white">
              {selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          <div className="space-y-2">
            {selectedShift && (
              <div className={`flex items-center gap-3 p-3 rounded-xl ${selectedShift.color.bgLight} border ${selectedShift.color.border}`}>
                <span className={`w-4 h-4 rounded-full ${selectedShift.color.bg} shadow-sm shrink-0`} />
                <div>
                  <span className={`text-sm font-bold ${selectedShift.color.text}`}>{selectedShift.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 font-mono">{selectedShift.horaEntrada} - {selectedShift.horaSalida}</span>
                </div>
              </div>
            )}

            {selectedVac && (
              <div className={`flex items-center gap-3 p-3 rounded-xl ${selectedVac.type === 'VACATION' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}`}>
                <span className={`w-4 h-4 rounded-full ${selectedVac.type === 'VACATION' ? 'bg-green-500' : 'bg-amber-500'} shadow-sm shrink-0`} />
                <span className={`text-sm font-bold ${selectedVac.type === 'VACATION' ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {selectedVac.type === 'VACATION' ? 'Vacaciones' : selectedVac.type === 'SICK_LEAVE' ? 'Baja Médica' : selectedVac.type === 'PERSONAL' ? 'Asuntos Propios' : 'Ausencia'}
                </span>
              </div>
            )}

            {selectedStats && selectedStats.fichajes.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">Fichajes del día</span>
                <div className="flex flex-wrap gap-2">
                  {selectedStats.fichajes.map((f, idx) => (
                    <span key={idx} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${f.tipo === 'ENTRADA' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'}`}>
                      {f.tipo === 'ENTRADA' ? '→' : '←'} {new Date(f.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ))}
                </div>
                {selectedStats.horasTrabajadas > 0 && (
                  <span className="text-xs text-slate-500 mt-2 block">{selectedStats.horasTrabajadas}h trabajadas</span>
                )}
              </div>
            )}

            {!selectedShift && !selectedVac && (!selectedStats || selectedStats.fichajes.length === 0) && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                <span className="text-xs text-slate-400">Sin horario ni registros para este día</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  function isCurrentMonth(date: Date): boolean {
    return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
  }
};

const LegendDot: React.FC<{ color: string; label: string; outline?: boolean }> = ({ color, label, outline }) => (
  <div className="flex items-center gap-1.5">
    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${outline ? 'border-2 border-current' : color}`} />
    <span>{label}</span>
  </div>
);

export default CalendarPage;

