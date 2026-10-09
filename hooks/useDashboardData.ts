import { useCallback, useEffect, useState } from 'react';
import {
    vacationService, eventsService, benefitsService, payrollService,
    lateNotificationService, fichajeAdjustmentService, dashboardLayoutService,
} from '../services/api';
import {
    VacationRequest, Event, DepartmentBenefits, UserBenefitsBalance, Payroll,
    LateArrivalNotification, DashboardLayout,
} from '../types';

interface DashboardUser {
    role?: string;
    department?: string;
}

export interface DashboardData {
    layout: DashboardLayout | null;
    pendingVacations: VacationRequest[];
    events: Event[];
    pendingAdjustments: any[];
    benefits: UserBenefitsBalance | null;
    deptBenefits: DepartmentBenefits | null;
    lastPayroll: Payroll | null;
    pendingWarnings: LateArrivalNotification[];
}

const EMPTY: DashboardData = {
    layout: null,
    pendingVacations: [],
    events: [],
    pendingAdjustments: [],
    benefits: null,
    deptBenefits: null,
    lastPayroll: null,
    pendingWarnings: [],
};

/** Loads everything the employee dashboard needs in a single parallel request batch. */
export const useDashboardData = (user: DashboardUser | null | undefined) => {
    const [data, setData] = useState<DashboardData>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(false);
        try {
            const isManagerAdmin = user.role === 'MANAGER' || user.role === 'ADMIN';
            const [layout, vacations, events, benefits, payrolls, warnings, adjustments, deptBenefits] = await Promise.all([
                dashboardLayoutService.getActive(),
                vacationService.getAll(),
                eventsService.getAll(),
                benefitsService.getUserBalance(),
                payrollService.getAll(),
                lateNotificationService.getAll(),
                isManagerAdmin ? fichajeAdjustmentService.getPending() : Promise.resolve(null),
                user.department ? benefitsService.getDepartmentBenefits(user.department) : Promise.resolve(null),
            ]);

            setData({
                layout,
                pendingVacations: vacations.filter((v: VacationRequest) => v.status === 'PENDING'),
                events,
                pendingAdjustments: adjustments || [],
                benefits,
                deptBenefits: (deptBenefits as DepartmentBenefits) || null,
                lastPayroll: Array.isArray(payrolls) && payrolls.length > 0 ? payrolls[payrolls.length - 1] : null,
                pendingWarnings: Array.isArray(warnings)
                    ? warnings.filter((w: LateArrivalNotification) => !w.justificado)
                    : [],
            });
        } catch (err) {
            console.error('Error loading dashboard data:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { load(); }, [load]);

    return { ...data, loading, error, reload: load };
};
