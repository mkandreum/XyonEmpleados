import React, { useState, useEffect, useMemo } from 'react';
import { managerService } from '../../services/api';
import { User, VacationRequest, DepartmentShift, UserShiftAssignment } from '../../types';
import { ChevronLeft, ChevronRight, User as UserIcon, Calendar, X, Check, Loader2 } from 'lucide-react';
import { shiftService } from '../../services/shiftService';
import { userShiftAssignmentService } from '../../services/userShiftAssignmentService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export const TeamCalendar: React.FC = () => {
    const { user: authUser } = useAuth() as any;
    const managerDepartment = authUser?.department || 'General';

    const [teamVacations, setTeamVacations] = useState<VacationRequest[]>([]);
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Shift assignment modal state
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [shifts, setShifts] = useState<DepartmentShift[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedShiftId, setSelectedShiftId] = useState<string>('');
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    const [rangeStart, setRangeStart] = useState<string | null>(null);
    const [assigning, setAssigning] = useState(false);
    const [modalMonth, setModalMonth] = useState(new Date());

    // Assigned shifts state
    const [userShiftAssignments, setUserShiftAssignments] = useState<UserShiftAssignment[]>([]);

    // Calendar view selector
    const [calendarView, setCalendarView] = useState<'team' | 'personal'>('team');

    // Fetch data on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vacations, members] = await Promise.all([
                    managerService.getTeamVacations(),
                    managerService.getTeamMembers()
                ]);
                setTeamVacations(vacations);
                setTeamMembers(members);
            } catch (error) {
                console.error("Error fetching team data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Fetch department shifts
    useEffect(() => {
        async function fetchShifts() {
            try {
                const data = await shiftService.getAll(managerDepartment);
                setShifts(data);
            } catch (e) {
                setShifts([]);
            }
        }
        fetchShifts();
    }, [managerDepartment]);

    // Fetch user shift assignments for current month
    useEffect(() => {
        const fetchUserShifts = async () => {
            if (!teamMembers.length) return;
            const allAssignments: UserShiftAssignment[] = [];
            for (const member of teamMembers) {
                try {
                    const data = await userShiftAssignmentService.getUserShifts(member.id, currentDate.getMonth() + 1, currentDate.getFullYear());
                    allAssignments.push(...data);
                } catch { /* ignore */ }
            }
            setUserShiftAssignments(allAssignments);
        };
        fetchUserShifts();
    }, [teamMembers, currentDate]);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    // Get active shift for selected shift in modal
    const activeShift = useMemo(() => shifts.find(s => s.id === selectedShiftId), [shifts, selectedShiftId]);

    // Parse active days from selected shift (e.g., "LUNES,MARTES,MIERCOLES,JUEVES,VIERNES")
    const allowedDays = useMemo(() => {
        if (!activeShift?.activeDays) return new Set<number>();
        const dayMap: Record<string, number> = {
            'DOMINGO': 0, 'LUNES': 1, 'MARTES': 2, 'MIERCOLES': 3,
            'JUEVES': 4, 'VIERNES': 5, 'SABADO': 6
        };
        const days = activeShift.activeDays.split(',').map(d => dayMap[d.trim()]).filter(d => d !== undefined);
        return new Set(days);
    }, [activeShift]);

    // Check if a date is allowed for shift assignment
    const isDateAllowedForShift = (dateStr: string): boolean => {
        if (!activeShift) return false;
        const date = new Date(dateStr + 'T12:00:00');
        return allowedDays.has(date.getDay());
    };

    // Mini calendar for modal
    const modalDaysInMonth = new Date(modalMonth.getFullYear(), modalMonth.getMonth() + 1, 0).getDate();
    const modalFirstDayOfWeek = new Date(modalMonth.getFullYear(), modalMonth.getMonth(), 1).getDay();
    const modalStartOffset = modalFirstDayOfWeek === 0 ? 6 : modalFirstDayOfWeek - 1; // Monday start

    const toggleDateSelection = (dateStr: string) => {
        if (!isDateAllowedForShift(dateStr)) return;

        if (rangeStart) {
            // Complete range selection
            const start = new Date(rangeStart + 'T12:00:00');
            const end = new Date(dateStr + 'T12:00:00');
            const [from, to] = start <= end ? [start, end] : [end, start];

            const newDates = new Set(selectedDates);
            const current = new Date(from);
            while (current <= to) {
                const ds = current.toISOString().split('T')[0];
                if (isDateAllowedForShift(ds)) {
                    newDates.add(ds);
                }
                current.setDate(current.getDate() + 1);
            }
            setSelectedDates(newDates);
            setRangeStart(null);
        } else {
            // First click: toggle single or start range
            const newDates = new Set(selectedDates);
            if (newDates.has(dateStr)) {
                newDates.delete(dateStr);
            } else {
                newDates.add(dateStr);
            }
            setSelectedDates(newDates);
        }
    };

    const startRangeSelection = (dateStr: string) => {
        if (!isDateAllowedForShift(dateStr)) return;
        setRangeStart(dateStr);
    };

    // Handle shift assignment
    const handleAssignShift = async () => {
        if (!selectedUserId || !selectedShiftId || selectedDates.size === 0) return;
        setAssigning(true);
        try {
            const promises = Array.from(selectedDates).map(dateStr =>
                userShiftAssignmentService.assign(selectedUserId, selectedShiftId, new Date(dateStr + 'T12:00:00').toISOString())
            );
            await Promise.all(promises);
            toast.success(`Turno asignado correctamente (${selectedDates.size} días)`);
            setShowShiftModal(false);
            resetModal();
            // Refresh assignments
            const allAssignments: UserShiftAssignment[] = [];
            for (const member of teamMembers) {
                try {
                    const data = await userShiftAssignmentService.getUserShifts(member.id, currentDate.getMonth() + 1, currentDate.getFullYear());
                    allAssignments.push(...data);
                } catch { /* ignore */ }
            }
            setUserShiftAssignments(allAssignments);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Error al asignar turno');
        } finally {
            setAssigning(false);
        }
    };

    const resetModal = () => {
        setSelectedUserId('');
        setSelectedShiftId('');
        setSelectedDates(new Set());
        setRangeStart(null);
        setModalMonth(new Date());
    };

    const openShiftModal = () => {
        resetModal();
        setShowShiftModal(true);
    };

    const isVacationDay = (userId: string, day: number) => {
        const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        dateToCheck.setHours(0, 0, 0, 0);
        return teamVacations.find(v => {
            if (v.user?.id !== userId) return false;
            if (v.status === 'REJECTED') return false;
            const start = new Date(v.startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(v.endDate); end.setHours(0, 0, 0, 0);
            return dateToCheck >= start && dateToCheck <= end;
        });
    };

    if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400 transition-colors">Cargando calendario...</div>;

    return (
        <div className="space-y-6">
            {/* Shift Assignment Modal */}
            {showShiftModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg relative border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Calendar size={20} className="text-blue-600" />
                                Asignar Turno
                            </h2>
                            <button
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                onClick={() => setShowShiftModal(false)}
                            >
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Step 1: Select Employee */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    1. Selecciona empleado
                                </label>
                                <select
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={selectedUserId}
                                    onChange={e => setSelectedUserId(e.target.value)}
                                >
                                    <option value="">Selecciona un empleado...</option>
                                    {teamMembers.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} — {m.position || 'Empleado'}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Step 2: Select Shift */}
                            {selectedUserId && (
                                <div className="animate-in fade-in duration-300">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        2. Selecciona horario
                                    </label>
                                    {shifts.length === 0 ? (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-300">
                                            No hay horarios configurados por el administrador.
                                        </div>
                                    ) : (
                                        <div className="grid gap-2">
                                            {shifts.map(shift => (
                                                <button
                                                    key={shift.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedShiftId(shift.id);
                                                        setSelectedDates(new Set());
                                                    }}
                                                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${selectedShiftId === shift.id
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800'
                                                        }`}
                                                >
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{shift.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {shift.horaEntrada} - {shift.horaSalida}
                                                            {shift.horaEntradaTarde && ` | ${shift.horaSalidaMañana} - ${shift.horaEntradaTarde}`}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                            Tolerancia: {shift.toleranciaMinutos} min · Días: {shift.activeDays?.replace(/,/g, ', ')}
                                                        </p>
                                                    </div>
                                                    {selectedShiftId === shift.id && (
                                                        <div className="shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                                            <Check size={14} className="text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Select Dates (Mini Calendar) */}
                            {selectedUserId && selectedShiftId && (
                                <div className="animate-in fade-in duration-300">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        3. Selecciona fechas
                                    </label>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                                        Haz clic para seleccionar, mantén Shift y haz clic en otra fecha para seleccionar rango. Solo días activos del horario.
                                    </p>

                                    {/* Mini calendar navigation */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800">
                                            <button
                                                onClick={() => setModalMonth(new Date(modalMonth.getFullYear(), modalMonth.getMonth() - 1, 1))}
                                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                            >
                                                <ChevronLeft size={16} className="text-slate-600 dark:text-slate-400" />
                                            </button>
                                            <span className="font-semibold text-sm text-slate-700 dark:text-slate-300 capitalize">
                                                {modalMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                                            </span>
                                            <button
                                                onClick={() => setModalMonth(new Date(modalMonth.getFullYear(), modalMonth.getMonth() + 1, 1))}
                                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                            >
                                                <ChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
                                            </button>
                                        </div>

                                        {/* Day headers */}
                                        <div className="grid grid-cols-7 text-center">
                                            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                                                <div key={d} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 py-2 uppercase">{d}</div>
                                            ))}
                                        </div>

                                        {/* Calendar grid */}
                                        <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-700">
                                            {/* Empty offset cells */}
                                            {Array.from({ length: modalStartOffset }).map((_, i) => (
                                                <div key={`empty-${i}`} className="bg-slate-50 dark:bg-slate-800/50 h-10" />
                                            ))}
                                            {/* Day cells */}
                                            {Array.from({ length: modalDaysInMonth }).map((_, i) => {
                                                const day = i + 1;
                                                const dateStr = `${modalMonth.getFullYear()}-${String(modalMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                const isAllowed = isDateAllowedForShift(dateStr);
                                                const isSelected = selectedDates.has(dateStr);
                                                const isRangeStartDay = rangeStart === dateStr;

                                                return (
                                                    <button
                                                        key={day}
                                                        type="button"
                                                        disabled={!isAllowed}
                                                        onClick={(e) => {
                                                            if (e.shiftKey && selectedDates.size > 0) {
                                                                // Range select from last selected
                                                                const lastDate = Array.from(selectedDates).sort().pop() || dateStr;
                                                                startRangeSelection(lastDate);
                                                                setTimeout(() => toggleDateSelection(dateStr), 0);
                                                            } else {
                                                                toggleDateSelection(dateStr);
                                                            }
                                                        }}
                                                        onContextMenu={(e) => {
                                                            e.preventDefault();
                                                            startRangeSelection(dateStr);
                                                        }}
                                                        className={`h-10 flex items-center justify-center text-xs font-medium transition-all ${!isAllowed
                                                            ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                                            : isSelected
                                                                ? 'bg-blue-600 text-white font-bold shadow-sm'
                                                                : isRangeStartDay
                                                                    ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 ring-2 ring-blue-400'
                                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer'
                                                            }`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {selectedDates.size > 0 && (
                                        <div className="mt-2 flex items-center justify-between text-xs">
                                            <span className="text-slate-500 dark:text-slate-400">
                                                {selectedDates.size} {selectedDates.size === 1 ? 'día' : 'días'} seleccionados
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDates(new Set())}
                                                className="text-red-500 hover:text-red-600 font-medium"
                                            >
                                                Limpiar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-900 rounded-b-2xl">
                            <button
                                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                onClick={() => setShowShiftModal(false)}
                                disabled={assigning}
                            >
                                Cancelar
                            </button>
                            <button
                                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                                disabled={!selectedUserId || !selectedShiftId || selectedDates.size === 0 || assigning}
                                onClick={handleAssignShift}
                            >
                                {assigning ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Asignando...
                                    </>
                                ) : (
                                    <>
                                        <Calendar size={16} />
                                        Asignar ({selectedDates.size} días)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Selector pills */}
            <div className="flex justify-center items-center gap-4 animate-slide-up">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                    <button
                        className={`px-5 py-1.5 rounded-full font-semibold text-sm transition-all focus:outline-none ${calendarView === 'personal' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        onClick={() => setCalendarView('personal')}
                    >
                        Calendario
                    </button>
                    <button
                        className={`px-5 py-1.5 rounded-full font-semibold text-sm transition-all focus:outline-none ${calendarView === 'team' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        onClick={() => setCalendarView('team')}
                    >
                        Calendario Equipo
                    </button>
                </div>
            </div>

            {/* Header + month nav */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-slide-up">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">
                        {calendarView === 'team' ? 'Calendario de Equipo' : 'Calendario'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 transition-colors text-sm">
                        {calendarView === 'team' ? 'Visualiza las ausencias, vacaciones y turnos de tu equipo.' : 'Visualiza tus ausencias y vacaciones.'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {calendarView === 'team' && (
                        <button
                            onClick={openShiftModal}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold text-sm shadow-sm mr-2"
                        >
                            <Calendar size={16} />
                            Asignar Turno
                        </button>
                    )}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors">
                            <ChevronLeft size={18} />
                        </button>
                        <span className="font-semibold text-slate-900 dark:text-white capitalize min-w-[140px] text-center text-sm transition-colors">
                            {monthName}
                        </span>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Desktop View (Gantt-like Table) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden hidden sm:block transition-colors animate-slide-up delay-75">
                <div className="overflow-x-auto pb-4">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="p-4 text-left min-w-[200px] border-b border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 sticky left-0 z-20 transition-colors text-slate-900 dark:text-white text-sm">
                                    Empleado
                                </th>
                                {Array.from({ length: daysInMonth }).map((_, i) => (
                                    <th key={i} className="p-2 text-center min-w-[36px] border-b border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors">
                                        {i + 1}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {teamMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={daysInMonth + 1} className="p-8 text-center text-slate-500 dark:text-slate-400 transition-colors">
                                        No hay empleados en tu equipo.
                                    </td>
                                </tr>
                            ) : (
                                teamMembers.map(member => (
                                    <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 border-b border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky left-0 z-20 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-slate-800 transition-all">
                                                    {member.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[140px] transition-colors" title={member.name}>{member.name}</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[140px] transition-colors">{member.position || 'Empleado'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                            const day = i + 1;
                                            const vacation = isVacationDay(member.id, day);
                                            const prevVacation = day > 1 ? isVacationDay(member.id, day - 1) : null;
                                            const nextVacation = day < daysInMonth ? isVacationDay(member.id, day + 1) : null;

                                            const isSameVacationPrev = prevVacation && vacation && prevVacation.id === vacation.id;
                                            const isSameVacationNext = nextVacation && vacation && nextVacation.id === vacation.id;

                                            let cellContent = null;
                                            let barClass = "";
                                            if (vacation) {
                                                const baseColor = vacation.status === 'APPROVED' ? 'bg-green-500' : 'bg-amber-400';
                                                barClass = `${baseColor} h-6 relative top-0`;
                                                if (!isSameVacationPrev) barClass += " rounded-l-md ml-1";
                                                if (!isSameVacationNext) barClass += " rounded-r-md mr-1";
                                                if (!isSameVacationPrev) {
                                                    cellContent = (
                                                        <span className="text-[10px] font-bold text-white pl-1 drop-shadow-sm">
                                                            {vacation.type === 'VACATION' ? 'V' : vacation.type === 'SICK_LEAVE' ? 'H' : vacation.type === 'MEDICAL_LEAVE' ? 'B' : 'A'}
                                                        </span>
                                                    );
                                                }
                                            }

                                            const assignedShift = userShiftAssignments.find(
                                                a => a.userId === member.id && new Date(a.date).getDate() === day
                                            );

                                            return (
                                                <td key={i} className="border-b border-slate-100 dark:border-slate-800 p-0 h-12 relative min-w-[36px] group">
                                                    <div className="absolute inset-y-0 right-0 border-r border-slate-50 dark:border-slate-800/50 pointer-events-none"></div>
                                                    {vacation && (
                                                        <div
                                                            className={`flex items-center ${barClass} transition-all hover:brightness-95 cursor-pointer`}
                                                            title={`${member.name}: ${vacation.type} (${vacation.status})`}
                                                        >
                                                            {cellContent}
                                                        </div>
                                                    )}
                                                    {assignedShift && (
                                                        <div className="absolute top-1 left-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded px-1 text-[9px] font-bold z-10 leading-tight">
                                                            {assignedShift.shift?.name || 'T'}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 text-xs bg-slate-50 dark:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-3 bg-green-500 rounded-sm"></div>
                        <span className="text-slate-600 dark:text-slate-400">Aprobado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-3 bg-amber-400 rounded-sm"></div>
                        <span className="text-slate-600 dark:text-slate-400">Pendiente</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-3 bg-blue-100 dark:bg-blue-900/40 rounded-sm border border-blue-200 dark:border-blue-800"></div>
                        <span className="text-slate-600 dark:text-slate-400">Turno asignado</span>
                    </div>
                    <div className="text-slate-400 dark:text-slate-500 ml-auto border-l pl-4 border-slate-200 dark:border-slate-700 transition-colors">
                        V: Vacaciones, B: Baja, A: Ausencia
                    </div>
                </div>
            </div>

            {/* Mobile View (Optimized Cards) */}
            <div className="sm:hidden space-y-4 animate-slide-up delay-75">
                {calendarView === 'team' && (
                    <button
                        onClick={openShiftModal}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold shadow-sm"
                    >
                        <Calendar size={18} />
                        Asignar Turno
                    </button>
                )}

                {(() => {
                    const activeUsers = teamMembers.map(member => {
                        const userVacations = teamVacations.filter(v => {
                            if (v.user?.id !== member.id) return false;
                            if (v.status === 'REJECTED') return false;
                            const start = new Date(v.startDate);
                            const end = new Date(v.endDate);
                            const currentMonth = currentDate.getMonth();
                            const currentYear = currentDate.getFullYear();
                            return (start.getMonth() === currentMonth && start.getFullYear() === currentYear) ||
                                (end.getMonth() === currentMonth && end.getFullYear() === currentYear) ||
                                (start < new Date(currentYear, currentMonth, 1) && end > new Date(currentYear, currentMonth + 1, 0));
                        });

                        const userAssignments = userShiftAssignments.filter(a => a.userId === member.id);
                        return { user: member, vacations: userVacations, assignments: userAssignments };
                    }).filter(item => item.vacations.length > 0 || item.assignments.length > 0);

                    if (activeUsers.length === 0) {
                        return (
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 text-center transition-colors">
                                <div className="inline-flex justify-center items-center w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full mb-3 text-slate-400 dark:text-slate-600 transition-colors">
                                    <UserIcon size={20} />
                                </div>
                                <h3 className="text-slate-900 dark:text-white font-medium transition-colors">Todo el equipo disponible</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">No hay ausencias ni turnos asignados para {monthName}.</p>
                            </div>
                        );
                    }

                    return activeUsers.map(({ user: member, vacations, assignments }) => (
                        <div key={member.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 group transition-all hover:shadow-md">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-50 dark:border-slate-800 pb-2 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                                        {member.name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm transition-colors">{member.name}</h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide transition-colors">{member.position || 'Empleado'}</p>
                                    </div>
                                </div>
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-full text-xs font-bold transition-colors">
                                    {vacations.length + assignments.length} eventos
                                </span>
                            </div>

                            <div className="space-y-2">
                                {vacations.map(vac => (
                                    <div key={vac.id} className="relative pl-3 border-l-2 border-slate-200 dark:border-slate-700 py-1 transition-colors">
                                        <div className={`absolute left-[-2px] top-1/2 -translate-y-1/2 w-1 h-full rounded-full transition-colors ${vac.status === 'APPROVED' ? 'bg-green-500' : 'bg-amber-400'}`}></div>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 transition-colors">
                                                    {vac.type === 'VACATION' ? 'Vacaciones' : vac.type === 'SICK_LEAVE' ? 'Horas Médicas' : vac.type === 'MEDICAL_LEAVE' ? 'Baja Médica' : 'Ausencia'}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors">
                                                    {new Date(vac.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {new Date(vac.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${vac.status === 'APPROVED'
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30 text-green-700 dark:text-green-400'
                                                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400'
                                                }`}>
                                                {vac.status === 'APPROVED' ? 'Aprobado' : 'Pendiente'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {assignments.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Turnos asignados</p>
                                        <div className="flex flex-wrap gap-1">
                                            {assignments.slice(0, 10).map(a => (
                                                <span key={a.id} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-medium px-1.5 py-0.5 rounded">
                                                    {new Date(a.date).getDate()} - {a.shift?.name || 'Turno'}
                                                </span>
                                            ))}
                                            {assignments.length > 10 && (
                                                <span className="text-[10px] text-slate-400">+{assignments.length - 10} más</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ));
                })()}
            </div>
        </div>
    );
};
