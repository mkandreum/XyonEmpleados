import React, { useState, useEffect, useMemo } from 'react';
import { managerService, scheduleService } from '../services/api';
import { User, VacationRequest, DepartmentShift, UserShiftAssignment, DepartmentSchedule } from '../types';
import { ChevronLeft, ChevronRight, User as UserIcon, Calendar, X, Check, Loader2 } from 'lucide-react';
import { shiftService } from '../services/shiftService';
import { userShiftAssignmentService } from '../services/userShiftAssignmentService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface TeamCalendarViewProps {
    mode?: 'shifts' | 'absences' | 'both';
}

export const TeamCalendarView: React.FC<TeamCalendarViewProps> = ({ mode = 'both' }) => {
    const { user: authUser } = useAuth() as any;
    const managerDepartment = authUser?.department || 'General';

    const [teamVacations, setTeamVacations] = useState<VacationRequest[]>([]);
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    const [defaultSchedule, setDefaultSchedule] = useState<DepartmentSchedule | null>(null);

    // Mobile view state
    const [selectedMobileDay, setSelectedMobileDay] = useState(new Date().getDate());

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

    // Fetch department shifts & schedule
    useEffect(() => {
        async function fetchShiftsAndSchedule() {
            try {
                const [shiftsData, scheduleData] = await Promise.all([
                    shiftService.getAll(managerDepartment),
                    scheduleService.get(managerDepartment)
                ]);
                setShifts(shiftsData);

                if (Array.isArray(scheduleData) && scheduleData.length > 0) {
                    setDefaultSchedule(scheduleData[0] as unknown as DepartmentSchedule);
                } else {
                    setDefaultSchedule(null);
                }
            } catch (e) {
                setShifts([]);
                setDefaultSchedule(null);
            }
        }
        fetchShiftsAndSchedule();
    }, [managerDepartment]);

    // Format default shift
    const getDefaultShiftForDay = (dayOfMonth: number): { name: string, horaEntrada: string, horaSalida: string } | null => {
        if (!defaultSchedule) return null;
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayOfMonth);
        const dayOfWeek = date.getDay(); // 0 is Sunday
        const dayKeys = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        const dayKeyStr = `schedule${dayKeys[dayOfWeek]}` as keyof DepartmentSchedule;

        const override = defaultSchedule[dayKeyStr] as any;
        if (override) {
            if (override.dayOff) return null;
            const entrada = override.horaEntrada || defaultSchedule.horaEntrada;
            const salida = override.horaSalida || defaultSchedule.horaSalida;
            return { name: 'General', horaEntrada: entrada, horaSalida: salida };
        }

        // Sábado y Domingo libres por defecto si no hay override
        if (dayOfWeek === 0 || dayOfWeek === 6) return null;

        return { name: 'General', horaEntrada: defaultSchedule.horaEntrada, horaSalida: defaultSchedule.horaSalida };
    };

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
    const firstDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const prevMonth = () => {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        setCurrentDate(d);
        setSelectedMobileDay(1);
    };
    const nextMonth = () => {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        setCurrentDate(d);
        setSelectedMobileDay(1);
    };

    // Auto-select today if we go back to current month
    useEffect(() => {
        const now = new Date();
        if (currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear()) {
            setSelectedMobileDay(now.getDate());
        }
    }, [currentDate]);

    // Get active shift for selected shift in modal
    const activeShift = useMemo(() => shifts.find(s => s.id === selectedShiftId), [shifts, selectedShiftId]);

    // Parse active days from selected shift
    const allowedDays = useMemo(() => {
        if (!activeShift?.activeDays) return new Set<number>();
        const dayMap: Record<string, number> = {
            'DOMINGO': 0, 'LUNES': 1, 'MARTES': 2, 'MIERCOLES': 3,
            'JUEVES': 4, 'VIERNES': 5, 'SABADO': 6
        };
        const days = activeShift.activeDays.split(',').map(d => dayMap[d.trim()]).filter(d => d !== undefined);
        return new Set(days);
    }, [activeShift]);

    const isDateAllowedForShift = (dateStr: string): boolean => {
        if (!activeShift) return false;
        const date = new Date(dateStr + 'T12:00:00');
        return allowedDays.has(date.getDay());
    };

    const modalDaysInMonth = new Date(modalMonth.getFullYear(), modalMonth.getMonth() + 1, 0).getDate();
    const modalFirstDayOfWeek = new Date(modalMonth.getFullYear(), modalMonth.getMonth(), 1).getDay();
    const modalStartOffset = modalFirstDayOfWeek === 0 ? 6 : modalFirstDayOfWeek - 1;

    const toggleDateSelection = (dateStr: string) => {
        if (!isDateAllowedForShift(dateStr)) return;
        if (rangeStart) {
            const start = new Date(rangeStart + 'T12:00:00');
            const end = new Date(dateStr + 'T12:00:00');
            const [from, to] = start <= end ? [start, end] : [end, start];
            const newDates = new Set(selectedDates);
            const current = new Date(from);
            while (current <= to) {
                const ds = current.toISOString().split('T')[0];
                if (isDateAllowedForShift(ds)) newDates.add(ds);
                current.setDate(current.getDate() + 1);
            }
            setSelectedDates(newDates);
            setRangeStart(null);
        } else {
            const newDates = new Set(selectedDates);
            if (newDates.has(dateStr)) newDates.delete(dateStr);
            else newDates.add(dateStr);
            setSelectedDates(newDates);
        }
    };

    const startRangeSelection = (dateStr: string) => {
        if (!isDateAllowedForShift(dateStr)) return;
        setRangeStart(dateStr);
    };

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
            // Refresh
            const allAssignments: UserShiftAssignment[] = [];
            for (const member of teamMembers) {
                try {
                    const data = await userShiftAssignmentService.getUserShifts(member.id, currentDate.getMonth() + 1, currentDate.getFullYear());
                    allAssignments.push(...data);
                } catch { }
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

    if (loading) return <div className="p-8 text-center text-slate-500 transition-colors">Cargando datos de equipo...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Modal shifted here */}
            {showShiftModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg relative border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Calendar size={20} className="text-blue-600" />
                                Asignar Turno
                            </h2>
                            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" onClick={() => setShowShiftModal(false)}>
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="p-5 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">1. Empleado</label>
                                <select className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                                    <option value="">Selecciona...</option>
                                    {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            {selectedUserId && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">2. Horario</label>
                                    <div className="grid gap-2">
                                        {shifts.map(shift => (
                                            <button key={shift.id} onClick={() => { setSelectedShiftId(shift.id); setSelectedDates(new Set()); }} className={`flex items-center justify-between p-3 rounded-xl border-2 ${selectedShiftId === shift.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-800'}`}>
                                                <div className="text-left text-sm">
                                                    <p className="font-semibold text-slate-900 dark:text-white">{shift.name}</p>
                                                    <p className="text-xs text-slate-500">{shift.horaEntrada} - {shift.horaSalida}</p>
                                                </div>
                                                {selectedShiftId === shift.id && <Check size={14} className="text-blue-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {selectedUserId && selectedShiftId && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">3. Fechas</label>
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                                        <div className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                            <button onClick={() => setModalMonth(new Date(modalMonth.getFullYear(), modalMonth.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
                                            <span className="font-bold capitalize">{modalMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                                            <button onClick={() => setModalMonth(new Date(modalMonth.getFullYear(), modalMonth.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
                                        </div>
                                        <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700">
                                            {Array.from({ length: modalStartOffset }).map((_, i) => <div key={i} className="bg-slate-50 dark:bg-slate-900 h-8" />)}
                                            {Array.from({ length: modalDaysInMonth }).map((_, i) => {
                                                const dStr = `${modalMonth.getFullYear()}-${String(modalMonth.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                                                const allowed = isDateAllowedForShift(dStr);
                                                const selected = selectedDates.has(dStr);
                                                return (
                                                    <button key={i} disabled={!allowed} onClick={() => toggleDateSelection(dStr)} className={`h-8 flex items-center justify-center font-medium ${!allowed ? 'text-slate-300' : selected ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 hover:bg-blue-50'}`}>
                                                        {i + 1}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-900 rounded-b-2xl">
                            <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl" onClick={() => setShowShiftModal(false)}>Cancelar</button>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-50" disabled={!selectedUserId || !selectedShiftId || selectedDates.size === 0 || assigning} onClick={handleAssignShift}>
                                {assigning ? <Loader2 size={16} className="animate-spin" /> : `Asignar (${selectedDates.size})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Panel de Equipo</h2>
                    <p className="text-xs text-slate-500">Gestión de turnos y ausencias del departamento.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowShiftModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors">
                        Asignar Turno
                    </button>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ChevronLeft size={16} /></button>
                        <span className="font-semibold text-xs min-w-[120px] text-center capitalize">{monthName}</span>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* ─── DESKTOP VIEW ─── */}
                <div className="hidden md:block overflow-x-auto pb-4">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60">
                                <th className="p-4 text-left min-w-[180px] border-r border-slate-200 dark:border-slate-700 sticky left-0 z-20 bg-inherit text-xs uppercase tracking-wider text-slate-500 font-bold">Empleado</th>
                                {Array.from({ length: daysInMonth }).map((_, i) => (
                                    <th key={i} className="p-2 text-center min-w-[32px] text-[10px] font-bold text-slate-400">{i + 1}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {teamMembers.map(member => (
                                <tr key={member.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                    <td className="p-3 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-slate-800 shrink-0">
                                                {member.name?.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 dark:text-white truncate" title={member.name}>{member.name}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{member.position || 'Empleado'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                        const day = i + 1;
                                        const showAbsences = mode === 'absences' || mode === 'both';
                                        const showShifts = mode === 'shifts' || mode === 'both';
                                        const vacation = showAbsences ? isVacationDay(member.id, day) : null;
                                        const assignedShiftRecord = showShifts ? userShiftAssignments.find(a => a.userId === member.id && new Date(a.date).getDate() === day) : null;

                                        // Usar el asignado o el por defecto del departamento
                                        const displayShift = assignedShiftRecord?.shift || (showShifts && !vacation ? getDefaultShiftForDay(day) : null);

                                        return (
                                            <td key={i} className="p-0.5 h-12 relative border-b border-slate-100 dark:border-slate-800/50">
                                                {vacation && (
                                                    <div className={`h-full w-full rounded-sm ${vacation.status === 'APPROVED' ? 'bg-green-500' : 'bg-amber-400'} opacity-80 flex items-center justify-center`} title={vacation.type}>
                                                        <span className="text-[9px] font-bold text-white max-w-[28px] truncate">{vacation.type.charAt(0)}</span>
                                                    </div>
                                                )}
                                                {displayShift && !vacation && (
                                                    <div className={`absolute inset-x-1 top-1 bottom-1 ${assignedShiftRecord ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'} rounded flex flex-col items-center justify-center shadow-sm overflow-hidden z-20`} title={`${displayShift.name} (${displayShift.horaEntrada}-${displayShift.horaSalida})`}>
                                                        <span className={`text-[8px] font-bold ${assignedShiftRecord ? 'text-white' : 'text-slate-700 dark:text-slate-300'} truncate px-0.5`}>{displayShift.name}</span>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ─── MOBILE VIEW ─── */}
                <div className="block md:hidden">
                    {/* Month Grid */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800">
                        <div className="grid grid-cols-7 gap-1">
                            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                                <div key={d} className="text-center text-[10px] font-bold text-slate-500 py-1">{d}</div>
                            ))}
                            {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const isSelected = selectedMobileDay === day;

                                // Check coverage for the day
                                let workingCount = 0;
                                let vacationCount = 0;

                                teamMembers.forEach(m => {
                                    const isVac = isVacationDay(m.id, day);
                                    if (isVac) {
                                        vacationCount++;
                                    } else {
                                        const assignedShiftRecord = userShiftAssignments.find(a => a.userId === m.id && new Date(a.date).getDate() === day);
                                        const hasShift = assignedShiftRecord || getDefaultShiftForDay(day);
                                        if (hasShift) workingCount++;
                                    }
                                });

                                const totalTeam = teamMembers.length || 1;
                                const workingPct = (workingCount / totalTeam) * 100;
                                const vacationPct = (vacationCount / totalTeam) * 100;

                                // Warning if more than 30% are on vacation
                                const isWarning = vacationPct > 30 && !isSelected;

                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedMobileDay(day)}
                                        className={`h-11 rounded-xl flex flex-col items-center justify-between py-1 transition-all outline-none ${isSelected
                                            ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600/30 ring-offset-1 dark:ring-offset-slate-900'
                                            : isWarning
                                                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-slate-900 dark:text-amber-100 hover:border-amber-400'
                                                : 'bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700'
                                            }`}
                                    >
                                        <span className={`text-[13px] font-bold mt-0.5 ${isSelected ? 'text-white' : ''}`}>{day}</span>

                                        {/* Coverage Indicator Bar */}
                                        <div className={`w-3/4 h-1.5 rounded-full flex overflow-hidden ${isSelected ? 'bg-blue-400/30' : 'bg-slate-100 dark:bg-slate-700'} mb-0.5`}>
                                            {workingPct > 0 && <div style={{ width: `${workingPct}%` }} className={`${isSelected ? 'bg-white' : 'bg-blue-500'}`} />}
                                            {vacationPct > 0 && <div style={{ width: `${vacationPct}%` }} className={`${isSelected ? 'bg-white/80' : 'bg-amber-400'}`} />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected Day Details List */}
                    <div className="p-4">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center justify-between">
                            <span>{new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedMobileDay).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                            <span className="text-xs font-normal text-slate-500 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">{teamMembers.length} Miembros</span>
                        </h3>

                        <div className="space-y-3">
                            {teamMembers.map(member => {
                                const showAbsences = mode === 'absences' || mode === 'both';
                                const showShifts = mode === 'shifts' || mode === 'both';
                                const vacation = showAbsences ? isVacationDay(member.id, selectedMobileDay) : null;
                                const assignedShiftRecord = showShifts ? userShiftAssignments.find(a => a.userId === member.id && new Date(a.date).getDate() === selectedMobileDay) : null;

                                const displayShift = assignedShiftRecord?.shift || (showShifts && !vacation ? getDefaultShiftForDay(selectedMobileDay) : null);

                                if (!vacation && !displayShift) {
                                    // Optional: hide members with nothing assigned? 
                                    // Let's show them but indicate "Libre / Sin asignar"
                                    return (
                                        <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                                                    {member.name?.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate opacity-70">{member.name}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{member.position || 'Empleado'}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-700">Libre / Sin turno</span>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={member.id} className={`flex items-center justify-between p-3 rounded-xl border shadow-sm ${vacation ? 'bg-amber-50/50 border-amber-200/50 dark:bg-amber-900/10 dark:border-amber-900/30' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${vacation ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400' : (assignedShiftRecord ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400')}`}>
                                                {member.name?.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{member.name}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{member.position || 'Empleado'}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            {vacation && (
                                                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${vacation.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                    {vacation.type}
                                                </span>
                                            )}
                                            {displayShift && !vacation && (
                                                <div className="text-right">
                                                    <span className={`inline-block px-2 py-1 ${assignedShiftRecord ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'} text-xs font-bold rounded-lg`}>
                                                        {displayShift.name}
                                                    </span>
                                                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                                                        {displayShift.horaEntrada}-{displayShift.horaSalida}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
