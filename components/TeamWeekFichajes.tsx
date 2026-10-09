import React from 'react';
import { Users } from 'lucide-react';
import { LoadingState, EmptyState } from './PageState';
import { TeamEmployeeWeek, summarizeDay } from '../hooks/useTeamWeek';

const formatTime = (timestamp?: string) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

type DaySummary = ReturnType<typeof summarizeDay>;

export type SendWarning = (userId: string, fichajeId: string, fecha: string, userName: string) => void;

interface TeamWeekFichajesProps {
    weekData: TeamEmployeeWeek[];
    weekDays: Date[];
    loading: boolean;
    onSendWarning: SendWarning;
}

const warningTarget = (summary: DaySummary) => summary.entradas[0]?.id || summary.salidas[0]?.id;

/** Rows of "entry -> exit" pairs for one day. `roomy` is the mobile card layout. */
const SlotRows: React.FC<{ summary: DaySummary; roomy?: boolean }> = ({ summary, roomy }) => {
    const { entradas, salidas } = summary;
    const rows = Array.from({ length: Math.max(entradas.length, salidas.length) });

    if (roomy) {
        return (
            <div className="space-y-2">
                {rows.map((_, i) => (
                    <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-control border border-slate-200 dark:border-slate-600 shadow-soft text-sm">
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500 dark:text-slate-400">Entrada</span>
                            <span className={`font-mono font-medium ${entradas[i]?.isLate ? 'text-danger dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{formatTime(entradas[i]?.timestamp)}</span>
                        </div>
                        <div className="text-slate-400 dark:text-slate-500" aria-hidden="true">→</div>
                        <div className="flex flex-col items-end">
                            <span className="text-xs text-slate-500 dark:text-slate-400">Salida</span>
                            <span className={`font-mono font-medium ${salidas[i]?.isEarlyDeparture ? 'text-danger dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{formatTime(salidas[i]?.timestamp)}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {rows.map((_, i) => (
                <div key={i} className="flex justify-between items-center text-xs bg-white/50 dark:bg-slate-800/50 rounded-control p-1.5 border border-black/5 dark:border-white/10">
                    {entradas[i] && (
                        <span className={`font-mono font-medium ${entradas[i].isLate ? 'text-danger-ink dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {formatTime(entradas[i].timestamp)}
                        </span>
                    )}
                    <span className="text-slate-400 dark:text-slate-500 mx-1" aria-hidden="true">→</span>
                    {salidas[i] ? (
                        <span className={`font-mono font-medium ${salidas[i].isEarlyDeparture ? 'text-danger-ink dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {formatTime(salidas[i].timestamp)}
                        </span>
                    ) : (
                        <span className="text-slate-500 font-mono">--:--</span>
                    )}
                </div>
            ))}
        </div>
    );
};

/** "Send warning" button, or the sent / read state once a warning exists for that day. */
const WarningAction: React.FC<{ summary: DaySummary; employee: TeamEmployeeWeek; onSendWarning: SendWarning; roomy?: boolean }> = ({
    summary, employee, onSendWarning, roomy,
}) => (
    <>
        {summary.hasIssues && !summary.hasNotification && (
            <button
                onClick={() => onSendWarning(employee.userId, warningTarget(summary), summary.dayStr, employee.userName)}
                className={roomy
                    ? 'mt-3 w-full bg-danger hover:bg-red-700 text-white text-sm font-semibold py-2 rounded-control transition-colors shadow-soft'
                    : 'mt-3 w-full bg-danger-soft hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-danger-ink dark:text-red-300 text-2xs font-semibold py-1.5 rounded-control transition-colors border border-red-200 dark:border-red-800'}
            >
                Enviar aviso
            </button>
        )}

        {summary.hasNotification && (
            <div className={`border-t border-black/5 dark:border-white/10 ${roomy ? 'mt-3 pt-3 text-center' : 'mt-2 pt-2'}`}>
                {summary.notificationRead ? (
                    <span className={`inline-flex items-center gap-1 font-medium text-success-ink dark:text-green-300 ${roomy ? 'text-xs' : 'text-2xs bg-success-soft/60 dark:bg-green-900/30 px-2 py-0.5 rounded-full'}`}>
                        ✓ {roomy ? 'Aviso leído' : 'Leído'}
                    </span>
                ) : (
                    <span className={`inline-flex items-center gap-1 font-medium text-warning-ink dark:text-orange-300 ${roomy ? 'text-xs' : 'text-2xs bg-warning-soft/60 dark:bg-orange-900/30 px-2 py-0.5 rounded-full'}`}>
                        ⚠ {roomy ? 'Aviso enviado' : 'Enviado'}
                    </span>
                )}
            </div>
        )}
    </>
);

export const TeamWeekFichajes: React.FC<TeamWeekFichajesProps> = ({ weekData, weekDays, loading, onSendWarning }) => {
    if (loading) return <div className="card"><LoadingState label="Cargando fichajes..." /></div>;
    if (weekData.length === 0) {
        return (
            <div className="card">
                <EmptyState icon={<Users size={40} />} title="No hay empleados en este departamento" />
            </div>
        );
    }

    return (
        <>
            <div className="card hidden md:block overflow-hidden animate-slide-up delay-150">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Vista semanal</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">Empleado</th>
                                {weekDays.map((day, index) => (
                                    <th scope="col" key={index} className="px-6 py-3 text-center text-xs font-medium">
                                        <div className="text-slate-700 dark:text-slate-300 capitalize">{day.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
                                        <div className="text-slate-500 dark:text-slate-400">{day.getDate()}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                            {weekData.map((employee, empIndex) => (
                                <tr key={empIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                                        {employee.userName || 'N/A'}
                                    </td>
                                    {weekDays.map((day, dayIndex) => {
                                        const summary = summarizeDay(employee, day);
                                        return (
                                            <td key={dayIndex} className="px-3 py-4 text-center align-top">
                                                {summary.fichajes.length > 0 ? (
                                                    <div className={`rounded-control p-3 border ${summary.hasIssues
                                                        ? 'bg-danger-soft/70 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'
                                                        : 'bg-success-soft/70 dark:bg-green-900/20 border-green-100 dark:border-green-900/30'}`}>
                                                        <SlotRows summary={summary} />
                                                        <WarningAction summary={summary} employee={employee} onSendWarning={onSendWarning} />
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center" aria-label="Sin fichajes">
                                                        <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
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

            <div className="md:hidden space-y-4 animate-slide-up delay-150">
                {weekData.map((employee, index) => (
                    <div key={index} className="card p-4">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center text-xs font-bold" aria-hidden="true">
                                {employee.userName.charAt(0)}
                            </div>
                            {employee.userName}
                        </h3>
                        <div className="space-y-3">
                            {weekDays.map((day, dayIndex) => {
                                const summary = summarizeDay(employee, day);
                                if (summary.fichajes.length === 0) return null;
                                return (
                                    <div key={dayIndex} className={`p-4 rounded-card border ${summary.hasIssues
                                        ? 'bg-danger-soft/70 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'
                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 capitalize">
                                                {day.toLocaleDateString('es-ES', { weekday: 'long' })} <span className="text-slate-500 dark:text-slate-400 font-normal ml-1">{day.getDate()}</span>
                                            </span>
                                            {summary.hasIssues && (
                                                <span className="bg-danger-soft dark:bg-red-900/40 text-danger-ink dark:text-red-300 text-xs font-semibold px-2 py-0.5 rounded-full">Incidencia</span>
                                            )}
                                        </div>
                                        <SlotRows summary={summary} roomy />
                                        <WarningAction summary={summary} employee={employee} onSendWarning={onSendWarning} roomy />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
};
