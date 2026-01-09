import React, { useState, useEffect } from 'react';
import { managerService } from '../../services/api';
import { VacationRequest } from '../../types';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';

export const TeamCalendar: React.FC = () => {
    const [teamVacations, setTeamVacations] = useState<VacationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const fetchTeamVacations = async () => {
            try {
                const data = await managerService.getTeamVacations();
                setTeamVacations(data);
            } catch (error) {
                console.error("Error fetching team vacations:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTeamVacations();
    }, []);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    // Get unique users from vacations
    const uniqueUsers = Array.from(new Set(teamVacations.map(v => v.user?.id || 'unknown')))
        .map(id => {
            const vac = teamVacations.find(v => v.user?.id === id);
            return vac?.user || { name: 'Desconocido', email: '', id };
        })
        .filter(u => u.name !== 'Desconocido'); // Filter out invalid users if any

    const isVacationDay = (userId: string, day: number) => {
        const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        dateToCheck.setHours(0, 0, 0, 0);

        return teamVacations.find(v => {
            if (v.user?.id !== userId) return false;
            if (v.status === 'REJECTED') return false; // Ignore rejected
            const start = new Date(v.startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(v.endDate); end.setHours(0, 0, 0, 0);
            return dateToCheck >= start && dateToCheck <= end;
        });
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando calendario...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Calendario de Equipo</h1>
                    <p className="text-slate-500">Visualiza las ausencias y vacaciones de tu equipo.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-semibold text-slate-900 capitalize min-w-[150px] text-center">
                        {monthName}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Desktop View (Table) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hidden sm:block">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="p-4 text-left min-w-[200px] border-b border-r border-slate-200 bg-slate-50 sticky left-0 z-10">
                                    Empleado
                                </th>
                                {Array.from({ length: daysInMonth }).map((_, i) => (
                                    <th key={i} className="p-2 text-center min-w-[40px] border-b border-slate-100 text-xs font-medium text-slate-500">
                                        {i + 1}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {uniqueUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={daysInMonth + 1} className="p-8 text-center text-slate-500">
                                        No hay datos de vacaciones para este equipo.
                                    </td>
                                </tr>
                            ) : (
                                uniqueUsers.map(user => (
                                    <tr key={user.id || Math.random()} className="hover:bg-slate-50/50">
                                        <td className="p-4 border-b border-r border-slate-200 bg-white sticky left-0 z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                    {user.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{user.name}</p>
                                                    <p className="text-xs text-slate-500">{user.position || 'Empleado'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                            const vacation = isVacationDay(user.id, i + 1);
                                            let cellClass = "";
                                            if (vacation) {
                                                cellClass = vacation.status === 'APPROVED'
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-yellow-400 text-white'; // Pending
                                            }

                                            return (
                                                <td key={i} className={`border-b border-slate-100 text-center p-1 relative group`}>
                                                    {vacation && (
                                                        <div
                                                            className={`w-full h-8 rounded-md flex items-center justify-center text-[10px] font-bold cursor-pointer transition-transform hover:scale-110 ${cellClass}`}
                                                            title={`${user.name}: ${vacation.type} (${vacation.status})`}
                                                        >
                                                            {vacation.type === 'VACATION' ? 'V' :
                                                                vacation.type === 'SICK_LEAVE' ? 'B' : 'A'}
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
                <div className="p-4 border-t border-slate-200 flex gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span>Aprobado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                        <span>Pendiente</span>
                    </div>
                    <div className="text-slate-400 text-xs ml-auto">
                        V: Vacaciones, B: Baja, A: Ausencia
                    </div>
                </div>
            </div>

            {/* Mobile View (List) */}
            <div className="sm:hidden space-y-4">
                {uniqueUsers.map(user => {
                    // Filter vacations for this user in current month (simplified check)
                    const userVacations = teamVacations.filter(v => {
                        if (v.user?.id !== user.id) return false;
                        if (v.status === 'REJECTED') return false;

                        const start = new Date(v.startDate);
                        const end = new Date(v.endDate);
                        const currentMonth = currentDate.getMonth();
                        const currentYear = currentDate.getFullYear();

                        // Check if vacation overlaps with current month
                        const startInMonth = start.getMonth() === currentMonth && start.getFullYear() === currentYear;
                        const endInMonth = end.getMonth() === currentMonth && end.getFullYear() === currentYear;

                        // Check if vacation spans over the entire month
                        const spansMonth = start < new Date(currentYear, currentMonth, 1) && end > new Date(currentYear, currentMonth + 1, 0);

                        return startInMonth || endInMonth || spansMonth;
                    });

                    return (
                        <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-50">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                    {user.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">{user.name}</h3>
                                    <p className="text-xs text-slate-500">{user.position || 'Empleado'}</p>
                                </div>
                            </div>

                            {userVacations.length > 0 ? (
                                <div className="space-y-3">
                                    {userVacations.map(vac => (
                                        <div key={vac.id} className="bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">
                                                    {vac.type === 'VACATION' ? 'Vacaciones' : vac.type === 'SICK_LEAVE' ? 'Baja Médica' : 'Ausencia'}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(vac.startDate).getDate()} - {new Date(vac.endDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${vac.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {vac.status === 'APPROVED' ? 'Aprobado' : 'Pendiente'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 text-center py-2">Sin ausencias este mes</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
