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

            {/* Desktop View (Gantt-like Table) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hidden sm:block">
                <div className="overflow-x-auto pb-4"> {/* Added pb-4 for scrollbar space */}
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="p-4 text-left min-w-[200px] border-b border-r border-slate-200 bg-slate-50 sticky left-0 z-20">
                                    Empleado
                                </th>
                                {Array.from({ length: daysInMonth }).map((_, i) => (
                                    <th key={i} className="p-2 text-center min-w-[36px] border-b border-slate-100 text-xs font-medium text-slate-500">
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
                                    <tr key={user.id || Math.random()} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 border-b border-r border-slate-200 bg-white sticky left-0 z-20">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs ring-2 ring-white">
                                                    {user.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900 truncate max-w-[140px]" title={user.name}>{user.name}</p>
                                                    <p className="text-[11px] text-slate-500 truncate max-w-[140px]">{user.position || 'Empleado'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                            const day = i + 1;
                                            const vacation = isVacationDay(user.id, day);
                                            const prevVacation = day > 1 ? isVacationDay(user.id, day - 1) : null;
                                            const nextVacation = day < daysInMonth ? isVacationDay(user.id, day + 1) : null;

                                            const isSameVacationPrev = prevVacation && vacation && prevVacation.id === vacation.id;
                                            const isSameVacationNext = nextVacation && vacation && nextVacation.id === vacation.id;

                                            let cellContent = null;

                                            // Determine visual style considering continuity
                                            let barClass = "";
                                            if (vacation) {
                                                const baseColor = vacation.status === 'APPROVED'
                                                    ? 'bg-green-500'
                                                    : 'bg-amber-400'; // Amber for pending

                                                barClass = `${baseColor} h-6 relative top-0`; // h-6 for thinner Gantt bar

                                                // Borders radius logic
                                                if (!isSameVacationPrev) barClass += " rounded-l-md ml-1";
                                                if (!isSameVacationNext) barClass += " rounded-r-md mr-1";
                                                if (isSameVacationPrev && !isSameVacationNext) barClass += " pr-1"; // End of bar
                                                if (!isSameVacationPrev && isSameVacationNext) barClass += " pl-1"; // Start of bar
                                                if (isSameVacationPrev && isSameVacationNext) barClass += ""; // Middle

                                                // Only show icon/text if it's the start of the bar or a single day
                                                if (!isSameVacationPrev) {
                                                    cellContent = (
                                                        <span className="text-[10px] font-bold text-white pl-1 drop-shadow-sm">
                                                            {vacation.type === 'VACATION' ? 'V' :
                                                                vacation.type === 'SICK_LEAVE' ? 'B' : 'A'}
                                                        </span>
                                                    );
                                                }
                                            }

                                            return (
                                                <td key={i} className="border-b border-slate-100 p-0 h-12 relative min-w-[36px]">
                                                    {/* Grid line helper - optional */}
                                                    <div className="absolute inset-y-0 right-0 border-r border-slate-50 pointer-events-none"></div>

                                                    {vacation && (
                                                        <div
                                                            className={`flex items-center ${barClass} transition-all hover:brightness-95 cursor-pointer`}
                                                            title={`${user.name}: ${vacation.type} (${vacation.status})`}
                                                        >
                                                            {cellContent}
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
                <div className="p-4 border-t border-slate-200 flex flex-wrap gap-4 text-xs bg-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-3 bg-green-500 rounded-sm"></div>
                        <span className="text-slate-600">Aprobado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-3 bg-amber-400 rounded-sm"></div>
                        <span className="text-slate-600">Pendiente</span>
                    </div>
                    <div className="text-slate-400 ml-auto border-l pl-4 border-slate-200">
                        V: Vacaciones, B: Baja, A: Ausencia
                    </div>
                </div>
            </div>

            {/* Mobile View (Optimized Cards) */}
            <div className="sm:hidden space-y-4">
                {(() => {
                    // Optimized: Only show users who have relevant vacations in this view
                    const activeUsers = uniqueUsers.map(user => {
                        const userVacations = teamVacations.filter(v => {
                            if (v.user?.id !== user.id) return false;
                            if (v.status === 'REJECTED') return false;

                            const start = new Date(v.startDate);
                            const end = new Date(v.endDate);
                            const currentMonth = currentDate.getMonth();
                            const currentYear = currentDate.getFullYear();

                            // Check overlapping
                            return (start.getMonth() === currentMonth && start.getFullYear() === currentYear) ||
                                (end.getMonth() === currentMonth && end.getFullYear() === currentYear) ||
                                (start < new Date(currentYear, currentMonth, 1) && end > new Date(currentYear, currentMonth + 1, 0));
                        });
                        return { user, vacations: userVacations };
                    }).filter(item => item.vacations.length > 0);

                    if (activeUsers.length === 0) {
                        return (
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 text-center">
                                <div className="inline-flex justify-center items-center w-12 h-12 bg-slate-100 rounded-full mb-3 text-slate-400">
                                    <User size={20} />
                                </div>
                                <h3 className="text-slate-900 font-medium">Todo el equipo disponible</h3>
                                <p className="text-sm text-slate-500 mt-1">No hay ausencias registradas para {monthName}.</p>
                            </div>
                        );
                    }

                    return activeUsers.map(({ user, vacations }) => (
                        <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 group transition-all hover:shadow-md">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                                        {user.name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 text-sm">{user.name}</h3>
                                        <p className="text-[11px] text-slate-500 uppercase tracking-wide">{user.position || 'Empleado'}</p>
                                    </div>
                                </div>
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs font-bold">
                                    {vacations.length} {vacations.length === 1 ? 'evento' : 'eventos'}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {vacations.map(vac => (
                                    <div key={vac.id} className="relative pl-3 border-l-2 border-slate-200 py-1">
                                        <div className={`absolute left-[-2px] top-1/2 -translate-y-1/2 w-1 h-full rounded-full ${vac.status === 'APPROVED' ? 'bg-green-500' : 'bg-amber-400'}`}></div>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">
                                                    {vac.type === 'VACATION' ? 'Vacaciones' : vac.type === 'SICK_LEAVE' ? 'Baja Médica' : 'Ausencia'}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(vac.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {new Date(vac.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${vac.status === 'APPROVED'
                                                    ? 'bg-green-50 border-green-100 text-green-700'
                                                    : 'bg-amber-50 border-amber-100 text-amber-700'
                                                }`}>
                                                {vac.status === 'APPROVED' ? 'Aprobado' : 'Pendiente'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ));
                })()}
            </div>
        </div>
    );
};
