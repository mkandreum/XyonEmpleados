import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { managerService } from '../services/api';
import { User, VacationRequest, DepartmentShift, UserShiftAssignment } from '../types';
import { shiftService } from '../services/shiftService';
import { userShiftAssignmentService } from '../services/userShiftAssignmentService';

const WEEKDAY_NUMBERS: Record<string, number> = {
    DOMINGO: 0, LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6,
};

const noon = (dateStr: string) => new Date(`${dateStr}T12:00:00`);

/** Team members + their vacation requests (loaded once). */
export const useTeamData = () => {
    const [teamVacations, setTeamVacations] = useState<VacationRequest[]>([]);
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [vacations, members] = await Promise.all([
                    managerService.getTeamVacations(),
                    managerService.getTeamMembers(),
                ]);
                setTeamVacations(vacations);
                setTeamMembers(members);
            } catch (error) {
                console.error('Error fetching team data:', error);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    /** The (non-rejected) vacation covering `day` of `month` for a user, if any. */
    const findVacation = useCallback((userId: string, month: Date, day: number) => {
        const target = new Date(month.getFullYear(), month.getMonth(), day);
        target.setHours(0, 0, 0, 0);
        return teamVacations.find(v => {
            if (v.user?.id !== userId || v.status === 'REJECTED') return false;
            const start = new Date(v.startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(v.endDate); end.setHours(0, 0, 0, 0);
            return target >= start && target <= end;
        });
    }, [teamVacations]);

    return { teamVacations, teamMembers, loading, findVacation };
};

/** Shifts defined for the department (empty on error). */
export const useDepartmentShifts = (department: string) => {
    const [shifts, setShifts] = useState<DepartmentShift[]>([]);

    useEffect(() => {
        shiftService.getAll(department).then(setShifts).catch(() => setShifts([]));
    }, [department]);

    return shifts;
};

/**
 * Shift assignments of every team member for a month, plus the "assign shift" dialog state
 * (employee, shift, date selection with range support).
 */
export const useShiftAssignment = (teamMembers: User[], shifts: DepartmentShift[], currentDate: Date) => {
    const [userShiftAssignments, setUserShiftAssignments] = useState<UserShiftAssignment[]>([]);
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedShiftId, setSelectedShiftId] = useState('');
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    const [rangeStart, setRangeStart] = useState<string | null>(null);
    const [assigning, setAssigning] = useState(false);
    const [modalMonth, setModalMonth] = useState(new Date());

    const refreshAssignments = useCallback(async () => {
        if (!teamMembers.length) return;
        const all: UserShiftAssignment[] = [];
        for (const member of teamMembers) {
            try {
                all.push(...await userShiftAssignmentService.getUserShifts(member.id, currentDate.getMonth() + 1, currentDate.getFullYear()));
            } catch { /* a member without assignments must not break the calendar */ }
        }
        setUserShiftAssignments(all);
    }, [teamMembers, currentDate]);

    useEffect(() => { refreshAssignments(); }, [refreshAssignments]);

    const activeShift = useMemo(() => shifts.find(s => s.id === selectedShiftId), [shifts, selectedShiftId]);

    // activeDays looks like "LUNES,MARTES,MIERCOLES"
    const allowedDays = useMemo(() => {
        if (!activeShift?.activeDays) return new Set<number>();
        return new Set(activeShift.activeDays.split(',').map(d => WEEKDAY_NUMBERS[d.trim()]).filter(d => d !== undefined));
    }, [activeShift]);

    const isDateAllowedForShift = (dateStr: string): boolean => !!activeShift && allowedDays.has(noon(dateStr).getDay());

    const modalDaysInMonth = new Date(modalMonth.getFullYear(), modalMonth.getMonth() + 1, 0).getDate();
    const modalFirstDayOfWeek = new Date(modalMonth.getFullYear(), modalMonth.getMonth(), 1).getDay();
    const modalStartOffset = modalFirstDayOfWeek === 0 ? 6 : modalFirstDayOfWeek - 1; // Monday start

    const toggleDateSelection = (dateStr: string) => {
        if (!isDateAllowedForShift(dateStr)) return;

        const next = new Set(selectedDates);
        if (rangeStart) {
            const a = noon(rangeStart);
            const b = noon(dateStr);
            const [from, to] = a <= b ? [a, b] : [b, a];
            const current = new Date(from);
            while (current <= to) {
                const ds = current.toISOString().split('T')[0];
                if (isDateAllowedForShift(ds)) next.add(ds);
                current.setDate(current.getDate() + 1);
            }
            setRangeStart(null);
        } else if (next.has(dateStr)) {
            next.delete(dateStr);
        } else {
            next.add(dateStr);
        }
        setSelectedDates(next);
    };

    const startRangeSelection = (dateStr: string) => {
        if (isDateAllowedForShift(dateStr)) setRangeStart(dateStr);
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

    const handleAssignShift = async () => {
        if (!selectedUserId || !selectedShiftId || selectedDates.size === 0) return;
        setAssigning(true);
        try {
            await Promise.all(Array.from(selectedDates).map(dateStr =>
                userShiftAssignmentService.assign(selectedUserId, selectedShiftId, noon(dateStr).toISOString())
            ));
            toast.success(`Turno asignado correctamente (${selectedDates.size} días)`);
            setShowShiftModal(false);
            resetModal();
            await refreshAssignments();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Error al asignar turno');
        } finally {
            setAssigning(false);
        }
    };

    return {
        userShiftAssignments,
        showShiftModal, setShowShiftModal, openShiftModal,
        selectedUserId, setSelectedUserId,
        selectedShiftId, setSelectedShiftId,
        selectedDates, setSelectedDates, rangeStart, assigning,
        modalMonth, setModalMonth, modalDaysInMonth, modalStartOffset,
        activeShift, isDateAllowedForShift, toggleDateSelection, startRangeSelection, handleAssignShift,
    };
};
