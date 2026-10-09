import React from 'react';
import { X, Pencil, Clock } from 'lucide-react';
import { Fichaje, FichajeAdjustment, FichajeAdjustmentStatus, FichajeDayStats } from '../types';

interface DayDetailPanelProps {
    date: Date;
    /** Label of the day's badge (vacation type, incident, ok...), if any. */
    badgeLabel?: string;
    badgeDetail?: string;
    stats?: FichajeDayStats;
    adjustments: FichajeAdjustment[];
    onAdjust: (fichaje: Fichaje) => void;
    onClose: () => void;
}

const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

const ADJUSTMENT_STYLE: Record<string, { label: string; className: string }> = {
    [FichajeAdjustmentStatus.PENDING]: { label: 'Ajuste pendiente', className: 'bg-warning-soft text-warning-ink dark:bg-amber-900/30 dark:text-amber-300' },
    [FichajeAdjustmentStatus.APPROVED]: { label: 'Ajuste aprobado', className: 'bg-success-soft text-success-ink dark:bg-green-900/30 dark:text-green-300' },
    [FichajeAdjustmentStatus.REJECTED]: { label: 'Ajuste rechazado', className: 'bg-danger-soft text-danger-ink dark:bg-red-900/30 dark:text-red-300' },
};

/** Details of the selected calendar day: status, clock records and adjustment requests. */
export const DayDetailPanel: React.FC<DayDetailPanelProps> = ({ date, badgeLabel, badgeDetail, stats, adjustments, onAdjust, onClose }) => {
    const fichajes = stats?.fichajes ?? [];
    const issues = [
        stats?.isLate && 'Entrada tarde',
        stats?.isEarlyDeparture && 'Salida temprana',
        stats && fichajes.length > 0 && !stats.isComplete && 'Registro incompleto',
    ].filter(Boolean) as string[];

    return (
        <section className="card p-4 sm:p-5 animate-fade-in" aria-label="Detalle del día">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white capitalize">
                        {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    {badgeLabel && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                            {badgeLabel}{badgeDetail ? ` · ${badgeDetail}` : ''}
                        </p>
                    )}
                </div>
                <button onClick={onClose} aria-label="Cerrar detalle" className="p-2 -m-2 rounded-control text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X size={18} />
                </button>
            </div>

            {issues.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                    {issues.map(issue => (
                        <li key={issue} className="px-2.5 py-1 rounded-full text-xs font-medium bg-warning-soft text-warning-ink dark:bg-amber-900/30 dark:text-amber-300">{issue}</li>
                    ))}
                </ul>
            )}

            {stats?.daySchedule && (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Clock size={14} aria-hidden="true" />
                    Horario previsto: {stats.daySchedule.horaEntrada} - {stats.daySchedule.horaSalida}
                </p>
            )}

            {fichajes.length > 0 ? (
                <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-control overflow-hidden">
                    {fichajes.map(f => {
                        const request = adjustments.find(a => a.fichajeId === f.id);
                        const style = request ? ADJUSTMENT_STYLE[request.status] : undefined;
                        return (
                            <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${f.tipo === 'ENTRADA' ? 'bg-blue-500' : 'bg-success'}`} aria-hidden="true" />
                                <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">{f.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'}</span>
                                <span className="font-mono font-semibold text-sm tabular-nums text-slate-900 dark:text-white">{formatTime(f.timestamp)}</span>
                                {style && <span className={`px-2 py-0.5 rounded-full text-2xs font-medium ${style.className}`}>{style.label}</span>}
                                {(!request || request.status !== FichajeAdjustmentStatus.PENDING) && (
                                    <button
                                        onClick={() => onAdjust(f)}
                                        aria-label={`Solicitar ajuste del fichaje de ${formatTime(f.timestamp)}`}
                                        title="Solicitar ajuste"
                                        className="p-2 rounded-control text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No hay fichajes registrados este día.</p>
            )}

            {stats && fichajes.length > 0 && (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Horas trabajadas: <span className="font-semibold text-slate-900 dark:text-white">{stats.horasTrabajadas}h</span></p>
            )}
        </section>
    );
};
