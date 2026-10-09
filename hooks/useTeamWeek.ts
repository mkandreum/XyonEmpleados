import { useCallback, useEffect, useMemo, useState } from 'react';
import { fichajeService } from '../services/api';

export interface TeamFichaje {
    id: string;
    tipo: 'ENTRADA' | 'SALIDA';
    timestamp: string;
    date: string;
    isLate?: boolean;
    isEarlyDeparture?: boolean;
    hasNotification: boolean;
    notificationRead: boolean;
    [key: string]: any;
}

export interface TeamEmployeeWeek {
    userId: string;
    userName: string;
    fichajes: TeamFichaje[];
}

/** Monday-first week (7 days), shifted by `weekOffset` weeks from the current one. */
export const getWeekDays = (weekOffset: number): Date[] => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        return day;
    });
};

/** ISO date (yyyy-mm-dd) used to bucket fichajes by day. */
export const isoDay = (date: Date | string) => new Date(date).toISOString().split('T')[0];

/** Fichajes of one employee for one day, split into entries/exits plus flags. */
export const summarizeDay = (employee: TeamEmployeeWeek, day: Date) => {
    const dayStr = isoDay(day);
    const fichajes = (employee.fichajes || []).filter(f => f.timestamp && isoDay(f.timestamp) === dayStr);
    return {
        dayStr,
        fichajes,
        entradas: fichajes.filter(f => f.tipo === 'ENTRADA'),
        salidas: fichajes.filter(f => f.tipo === 'SALIDA'),
        hasIssues: fichajes.some(f => f.isLate || f.isEarlyDeparture),
        hasNotification: fichajes.some(f => f.hasNotification),
        notificationRead: fichajes.some(f => f.notificationRead),
    };
};

/** Loads and flattens the department's weekly fichajes. */
export const useTeamWeek = (department: string | undefined, weekOffset: number) => {
    const [weekData, setWeekData] = useState<TeamEmployeeWeek[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            if (department) {
                const response = await fichajeService.getDepartmentWeek(department);
                if (response && response.users) {
                    setWeekData(response.users.map((userGroup: any): TeamEmployeeWeek => ({
                        userId: userGroup.user.id,
                        userName: userGroup.user.name,
                        fichajes: userGroup.fichajes.flatMap((dayGroup: any) =>
                            dayGroup.fichajes.map((f: any) => ({
                                ...f,
                                date: dayGroup.date,
                                isLate: dayGroup.isLate,
                                isEarlyDeparture: dayGroup.isEarlyDeparture,
                                hasNotification: dayGroup.fichajes.some((inner: any) => inner.id === f.id && inner.lateNotifications && inner.lateNotifications.length > 0),
                                notificationRead: dayGroup.fichajes.some((inner: any) => inner.id === f.id && inner.lateNotifications?.some((n: any) => n.leido)),
                            }))
                        ),
                    })));
                } else {
                    setWeekData([]);
                }
            }
        } catch (error) {
            console.error('Error loading week data:', error);
            setWeekData([]);
        } finally {
            setLoading(false);
        }
    }, [department]);

    // The service always returns the current week; offset only moves the displayed days (as before).
    useEffect(() => { load(); }, [load, weekOffset]);

    const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

    return { weekData, weekDays, loading, reload: load };
};
