import React, { useState, useEffect, useCallback } from 'react';
import { Clock, User, FileText, Calendar, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { fichajeAdjustmentService } from '../services/api';
import { FichajeAdjustment, FichajeAdjustmentStatus } from '../types';
import { haptic } from '../utils/haptics';
import { LoadingState } from './PageState';

const formatDateTime = (value: string) => new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

const ResolutionBadge: React.FC<{ status: string }> = ({ status }) => (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${status === FichajeAdjustmentStatus.APPROVED
        ? 'bg-success-soft text-success-ink dark:bg-green-900/30 dark:text-green-400'
        : 'bg-danger-soft text-danger-ink dark:bg-red-900/30 dark:text-red-400'}`}>
        {status === FichajeAdjustmentStatus.APPROVED ? 'Aprobado' : 'Rechazado'}
    </span>
);

/** Manager view: pending fichaje adjustment requests (approve / reject) and recent history. */
export const FichajeAdjustmentsPanel: React.FC = () => {
    const [pendingRequests, setPendingRequests] = useState<FichajeAdjustment[]>([]);
    const [history, setHistory] = useState<FichajeAdjustment[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const loadRequests = useCallback(async () => {
        try {
            setLoading(true);
            const [pending, all] = await Promise.all([fichajeAdjustmentService.getPending(), fichajeAdjustmentService.getAll()]);
            setPendingRequests(pending);
            setHistory(all.filter(r => r.status !== FichajeAdjustmentStatus.PENDING));
        } catch (error) {
            console.error('Error loading adjustments:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadRequests(); }, [loadRequests]);

    const handleApprove = async (id: string) => {
        try {
            setProcessingId(id);
            await fichajeAdjustmentService.approve(id);
            haptic('success');
            await loadRequests();
        } catch {
            haptic('error');
            toast.error('Error al aprobar la solicitud');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!rejectionReason) {
            haptic('error');
            toast.error('Por favor, indica un motivo para el rechazo');
            return;
        }
        try {
            setProcessingId(id);
            await fichajeAdjustmentService.reject(id, rejectionReason);
            haptic('double');
            setRejectingId(null);
            setRejectionReason('');
            await loadRequests();
        } catch {
            haptic('error');
            toast.error('Error al rechazar la solicitud');
        } finally {
            setProcessingId(null);
        }
    };

    const emptyBox = (text: string) => (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-card p-8 text-center text-slate-600 dark:text-slate-400">
            {text}
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <header>
                <h2 className="page-title flex items-center gap-3">
                    <Clock className="text-blue-600" size={28} aria-hidden="true" />
                    Ajustes de fichaje
                </h2>
                <p className="page-subtitle mt-1">Revisa y aprueba las correcciones de fichajes solicitadas por el equipo.</p>
            </header>

            <section aria-labelledby="pending-adjustments">
                <h3 id="pending-adjustments" className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    Pendientes
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2.5 py-0.5 rounded-full text-xs font-bold">
                        {pendingRequests.length}
                    </span>
                </h3>
                <div className="grid gap-4">
                    {loading ? (
                        <LoadingState label="Cargando solicitudes..." />
                    ) : pendingRequests.length === 0 ? (
                        emptyBox('No hay solicitudes pendientes.')
                    ) : (
                        pendingRequests.map(request => (
                            <article key={request.id} className="card overflow-hidden p-5">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex gap-4 min-w-0">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true">
                                            <User size={24} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-slate-900 dark:text-white leading-tight truncate">{request.user?.name}</h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{request.user?.department}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Solicitado el {new Date(request.createdAt).toLocaleDateString()}</span>
                                        <span className="bg-warning-soft dark:bg-amber-900/20 text-warning-ink dark:text-amber-300 text-xs font-semibold px-2 py-1 rounded-full">Pendiente</span>
                                    </div>
                                </div>

                                <div className="mt-6 grid md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-control border border-slate-200 dark:border-slate-700/50">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Fichaje original</p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                            <Clock size={14} className="text-slate-500" aria-hidden="true" />
                                            {formatDateTime(request.originalTimestamp)}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Ajuste solicitado</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <Calendar size={14} className="text-blue-600" aria-hidden="true" />
                                            {formatDateTime(request.requestedTimestamp)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-3">
                                    <FileText size={16} className="text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                                    <p className="text-sm text-slate-600 dark:text-slate-400 italic break-words min-w-0">"{request.reason}"</p>
                                </div>

                                <div className="mt-6 flex flex-wrap gap-3">
                                    {rejectingId === request.id ? (
                                        <div className="w-full flex flex-col gap-2 animate-fade-in">
                                            <input
                                                type="text"
                                                placeholder="Motivo del rechazo..."
                                                aria-label="Motivo del rechazo"
                                                value={rejectionReason}
                                                onChange={e => setRejectionReason(e.target.value)}
                                                className="field"
                                            />
                                            <div className="flex flex-col-reverse sm:flex-row gap-2">
                                                <button type="button" className="btn-secondary flex-1" onClick={() => setRejectingId(null)}>Cancelar</button>
                                                <button type="button" className="btn-danger flex-1" onClick={() => handleReject(request.id)} disabled={processingId === request.id}>
                                                    {processingId === request.id ? 'Rechazando...' : 'Rechazar'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <button type="button" className="btn bg-green-700 text-white hover:bg-green-800" onClick={() => handleApprove(request.id)} disabled={processingId === request.id}>
                                                {processingId === request.id ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
                                                {processingId === request.id ? 'Aprobando...' : 'Aprobar'}
                                            </button>
                                            <button type="button" className="btn bg-danger-soft text-danger-ink hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 dark:text-red-300" onClick={() => { setRejectingId(request.id); setRejectionReason(''); }}>
                                                Rechazar
                                            </button>
                                        </>
                                    )}
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            <section aria-labelledby="adjustment-history">
                <h3 id="adjustment-history" className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Historial reciente</h3>

                {history.length === 0 ? (
                    emptyBox('No hay historial reciente.')
                ) : (
                    <>
                        <div className="hidden md:block overflow-x-auto rounded-card border border-slate-200 dark:border-slate-800 shadow-soft">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        {['Empleado', 'Fecha original', 'Fecha ajustada', 'Resuelto por', 'Estado'].map(h => (
                                            <th key={h} scope="col" className="px-5 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="stagger bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                                    {history.map(request => (
                                        <tr key={request.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                                                {request.user?.name}
                                                <div className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">{request.user?.department}</div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">{formatDateTime(request.originalTimestamp)}</td>
                                            <td className="px-5 py-4 text-sm font-bold text-slate-900 dark:text-white">{formatDateTime(request.requestedTimestamp)}</td>
                                            <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {request.manager?.name}
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{request.resolvedAt ? new Date(request.resolvedAt).toLocaleDateString() : ''}</div>
                                            </td>
                                            <td className="px-5 py-4"><ResolutionBadge status={request.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <ul className="md:hidden space-y-4">
                            {history.map(request => (
                                <li key={request.id} className="card p-4">
                                    <div className="flex justify-between items-start gap-2 mb-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold shrink-0" aria-hidden="true">
                                                {request.user?.name?.charAt(0) || <User size={18} />}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{request.user?.name}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{request.user?.department}</p>
                                            </div>
                                        </div>
                                        <ResolutionBadge status={request.status} />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-control border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Original</p>
                                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{formatDateTime(request.originalTimestamp)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Ajustado</p>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">{formatDateTime(request.requestedTimestamp)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center gap-2">
                                        <Check size={14} className={`shrink-0 ${request.status === FichajeAdjustmentStatus.APPROVED ? 'text-success' : 'text-danger'}`} aria-hidden="true" />
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Resuelto por <span className="font-semibold text-slate-700 dark:text-slate-300">{request.manager?.name}</span>
                                            {request.resolvedAt && ` el ${new Date(request.resolvedAt).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </section>
        </div>
    );
};
