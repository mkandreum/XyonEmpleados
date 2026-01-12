import React, { useEffect, useState } from 'react';
import { VacationRequest } from '../types';
import { managerService } from '../services/api';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTypeLabel, getTypeColor } from '../utils/vacationUtils';

interface GanttEntry {
    user: { name: string; id: string };
    vacations: VacationRequest[];
}

export const VacationGanttChart: React.FC = () => {
    const [entries, setEntries] = useState<GanttEntry[]>([]);
    const [currentWeek, setCurrentWeek] = useState(0); // 0 = current week
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTeamVacations();
    }, []);

    const fetchTeamVacations = async () => {
        try {
            const data = await managerService.getTeamVacations();
            const approved = data.filter(v => v.status === 'APPROVED');

            // Group by user
            const grouped = approved.reduce((acc, vacation) => {
                const userId = vacation.user?.id || (vacation as any).userId;
                const userName = vacation.user?.name || 'Unknown';

                if (!acc[userId]) {
                    acc[userId] = {
                        user: { name: userName, id: userId },
                        vacations: []
                    };
                }
                acc[userId].vacations.push(vacation);
                return acc;
            }, {} as Record<string, GanttEntry>);

            setEntries(Object.values(grouped));
        } catch (error) {
            console.error('Error fetching team vacations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getWeekDates = (weekOffset: number) => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - dayOfWeek + 1 + (weekOffset * 7));

        const week = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            week.push(date);
        }
        return week;
    };

    const weekDates = getWeekDates(currentWeek);

    const isVacationOnDate = (vacations: VacationRequest[], date: Date) => {
        const dateStr = date.toDateString();
        return vacations.find(v => {
            const start = new Date(v.startDate);
            const end = new Date(v.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            const current = new Date(date);
            current.setHours(12, 0, 0, 0);
            return current >= start && current <= end;
        });
    };

    const formatWeekRange = () => {
        const firstDay = weekDates[0];
        const lastDay = weekDates[6];
        return `${firstDay.getDate()} ${firstDay.toLocaleDateString('es-ES', { month: 'short' })} - ${lastDay.getDate()} ${lastDay.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Cargando calendario...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Week Navigator */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                <button
                    onClick={() => setCurrentWeek(prev => prev - 1)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </button>

                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-slate-900 dark:text-white">
                        {formatWeekRange()}
                    </span>
                </div>

                <button
                    onClick={() => setCurrentWeek(prev => prev + 1)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </button>
            </div>

            {/* Gantt Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                {/* Mobile warning */}
                <div className="lg:hidden p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Desliza horizontalmente para ver más días
                    </p>
                </div>

                {/* Table container with horizontal scroll */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="sticky left-0 bg-slate-50 dark:bg-slate-800 p-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[150px] z-10">
                                    Empleado
                                </th>
                                {weekDates.map((date, idx) => (
                                    <th key={idx} className="p-2 text-center text-xs font-medium text-slate-600 dark:text-slate-400 min-w-[80px] border-l border-slate-100 dark:border-slate-800">
                                        <div className="hidden sm:block">{date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</div>
                                        <div className="sm:hidden">{date.toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase()}</div>
                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{date.getDate()}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {entries.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                        No hay vacaciones aprobadas para mostrar
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry) => (
                                    <tr key={entry.user.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="sticky left-0 bg-white dark:bg-slate-900 p-4 text-sm font-medium text-slate-900 dark:text-white z-10 shadow-sm">
                                            <div className="truncate max-w-[120px]" title={entry.user.name}>
                                                {entry.user.name}
                                            </div>
                                        </td>
                                        {weekDates.map((date, idx) => {
                                            const vacation = isVacationOnDate(entry.vacations, date);
                                            return (
                                                <td key={idx} className="p-1 border-l border-slate-100 dark:border-slate-800">
                                                    {vacation ? (
                                                        <div
                                                            className={`h-10 rounded-md flex items-center justify-center text-xs font-medium ${getTypeColor(vacation.type)}`}
                                                            title={`${getTypeLabel(vacation.type)}: ${new Date(vacation.startDate).toLocaleDateString()} - ${new Date(vacation.endDate).toLocaleDateString()}`}
                                                        >
                                                            <span className="truncate px-1">
                                                                {getTypeLabel(vacation.type).substring(0, 3)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="h-10"></div>
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
            </div>

            {/* Legend */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Leyenda</h3>
                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-4 rounded ${getTypeColor('VACATION')}`}></div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">Vacaciones</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-4 rounded ${getTypeColor('PERSONAL')}`}></div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">Asuntos Propios</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-4 rounded ${getTypeColor('SICK_LEAVE')}`}></div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">Baja Médica</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-4 rounded ${getTypeColor('OVERTIME')}`}></div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">Horas Exceso</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-4 rounded ${getTypeColor('OTHER')}`}></div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">Otros Permisos</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
