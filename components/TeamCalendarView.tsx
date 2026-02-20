import React, { useState, useEffect, useMemo } from 'react';
import { managerService } from '../services/api';
import { User, VacationRequest, DepartmentShift, UserShiftAssignment } from '../types';
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
                <div className="overflow-x-auto pb-4">
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
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-slate-800">
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
                                        const assignedShift = showShifts ? userShiftAssignments.find(a => a.userId === member.id && new Date(a.date).getDate() === day) : null;

                                        return (
                                            <td key={i} className="p-0.5 h-12 relative border-b border-slate-100 dark:border-slate-800/50">
                                                {vacation && (
                                                    <div className={`h-full w-full rounded-sm ${vacation.status === 'APPROVED' ? 'bg-green-500' : 'bg-amber-400'} opacity-80 flex items-center justify-center`} title={vacation.type}>
                                                        <span className="text-[9px] font-bold text-white">{vacation.type.charAt(0)}</span>
                                                    </div>
                                                )}
                                                {assignedShift && (
                                                    <div className={`absolute inset-x-1 ${vacation ? 'bottom-1 h-3' : 'top-1 bottom-1'} bg-blue-600 rounded flex items-center justify-center shadow-sm overflow-hidden z-20`} title={assignedShift.shift?.name}>
                                                        <span className="text-[8px] font-bold text-white truncate px-0.5">{assignedShift.shift?.name}</span>
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
            </div>
        </div>
    );
};
