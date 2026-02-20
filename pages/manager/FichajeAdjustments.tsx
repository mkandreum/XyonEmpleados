import React, { useState, useEffect } from 'react';
import { fichajeAdjustmentService } from '../../services/api';
import { FichajeAdjustment, FichajeAdjustmentStatus } from '../../types';
import { Check, X, Clock, Calendar, User, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';

export const ManagerFichajeAdjustments: React.FC = () => {
    const [pendingRequests, setPendingRequests] = useState<FichajeAdjustment[]>([]);
    const [history, setHistory] = useState<FichajeAdjustment[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectionReasonId, setRejectionReasonId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const [pending, all] = await Promise.all([
                fichajeAdjustmentService.getPending(),
                fichajeAdjustmentService.getAll()
            ]);
            setPendingRequests(pending);
            setHistory(all.filter(r => r.status !== FichajeAdjustmentStatus.PENDING));
        } catch (error) {
            console.error('Error loading adjustments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            setProcessingId(id);
            await fichajeAdjustmentService.approve(id);
            await loadRequests();
        } catch (error) {
            console.error('Error approving adjustment:', error);
            alert('Error al aprobar la solicitud');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!rejectionReason) {
            alert('Por favor, indica un motivo para el rechazo');
            return;
        }

        try {
            setProcessingId(id);
            await fichajeAdjustmentService.reject(id, rejectionReason);
            setRejectionReasonId(null);
            setRejectionReason('');
            await loadRequests();
        } catch (error) {
            console.error('Error rejecting adjustment:', error);
            alert('Error al rechazar la solicitud');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                <p className="text-slate-500 font-medium">Cargando solicitudes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <Clock className="text-blue-600" size={28} />
                    Gestión de Ajustes de Fichaje
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Revisa y aprueba las correcciones de fichajes solicitadas por el equipo.
                </p>
            </header>

            {/* Pending Requests */}
            <section>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    Pendientes
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded-full text-xs font-bold">
                        {pendingRequests.length}
                    </span>
                </h3>

                <div className="grid gap-4">
                    {pendingRequests.length === 0 ? (
                        <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center text-slate-400">
                            No hay solicitudes pendientes.
                        </div>
                    ) : (
                        pendingRequests.map(request => (
                            <div key={request.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                                <User size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{request.user?.name}</h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{request.user?.department}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end">
                                            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">Solicitado el {new Date(request.createdAt).toLocaleDateString()}</span>
                                            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                                Pendiente
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 grid md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fichaje Original</p>
                                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                                <Clock size={14} className="text-slate-400" />
                                                {new Date(request.originalTimestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest">Ajuste Solicitado</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                <Calendar size={14} className="text-blue-500" />
                                                {new Date(request.requestedTimestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-3">
                                        <MessageSquare size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                        <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                                            "{request.reason}"
                                        </p>
                                    </div>

                                    <div className="mt-6 flex flex-wrap gap-3">
                                        {rejectionReasonId === request.id ? (
                                            <div className="w-full flex flex-col gap-2 animate-in slide-in-from-top-2">
                                                <input
                                                    type="text"
                                                    placeholder="Motivo del rechazo..."
                                                    value={rejectionReason}
                                                    onChange={e => setRejectionReason(e.target.value)}
                                                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleReject(request.id)}
                                                        className="flex-1 bg-red-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-red-700 transition-colors"
                                                    >
                                                        Confirmar Rechazo
                                                    </button>
                                                    <button
                                                        onClick={() => { setRejectionReasonId(null); setRejectionReason(''); }}
                                                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(request.id)}
                                                    disabled={!!processingId}
                                                    className="flex-1 bg-green-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 disabled:opacity-50"
                                                >
                                                    {processingId === request.id ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                                    Aprobar Ajuste
                                                </button>
                                                <button
                                                    onClick={() => setRejectionReasonId(request.id)}
                                                    disabled={!!processingId}
                                                    className="px-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    <X size={18} />
                                                    Rechazar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* History */}
            <section>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Historial Reciente</h3>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Empleado</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha Original</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha Ajustada</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resuelto por</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">
                                            No hay registros históricos.
                                        </td>
                                    </tr>
                                ) : (
                                    history.map(request => (
                                        <tr key={request.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{request.user?.name}</p>
                                                <p className="text-[10px] text-slate-400">{request.user?.department}</p>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                {new Date(request.originalTimestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                                                {new Date(request.requestedTimestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-sm text-slate-600 dark:text-slate-400">{request.manager?.name || 'Sistema'}</p>
                                                <p className="text-[10px] text-slate-400">{request.resolvedAt ? new Date(request.resolvedAt).toLocaleDateString() : '-'}</p>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${request.status === FichajeAdjustmentStatus.APPROVED
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                    }`}>
                                                    {request.status === FichajeAdjustmentStatus.APPROVED ? 'Aprobado' : 'Rechazado'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
};
