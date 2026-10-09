import React, { useState } from 'react';
import { X, Clock, Calendar, AlertCircle } from 'lucide-react';
import { fichajeAdjustmentService } from '../services/api';
import { Fichaje } from '../types';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface AdjustFichajeModalProps {
    fichaje: Fichaje;
    onClose: () => void;
    onSuccess: () => void;
}

export const AdjustFichajeModal: React.FC<AdjustFichajeModalProps> = ({ fichaje, onClose, onSuccess }) => {
    const [requestedDate, setRequestedDate] = useState(fichaje.timestamp.split('T')[0]);
    const [requestedTime, setRequestedTime] = useState(fichaje.timestamp.split('T')[1].substring(0, 5));
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEscapeKey(!loading, onClose);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Combine date and time
            const timestamp = `${requestedDate}T${requestedTime}:00Z`;

            await fichajeAdjustmentService.create({
                fichajeId: fichaje.id,
                requestedTimestamp: timestamp,
                reason
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error creating adjustment:', err);
            setError(err.response?.data?.error || 'Error al enviar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div role="dialog" aria-modal="true" aria-label="Solicitar ajuste de fichaje" className="modal-panel max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Clock className="text-blue-600" size={24} />
                                Solicitar Ajuste
                            </h3>
                            <button
                                onClick={onClose}
                                aria-label="Cerrar"
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-control">
                            <div className="flex gap-3">
                                <AlertCircle className="text-amber-700 shrink-0" size={18} />
                                <div className="text-sm">
                                    <p className="font-semibold text-amber-800 dark:text-amber-400">Información Actual</p>
                                    <p className="text-amber-700 dark:text-amber-500/80">
                                        Fichaje de {fichaje.tipo}: {new Date(fichaje.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                    <Calendar size={14} /> Fecha solicitada
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={requestedDate}
                                    onChange={(e) => setRequestedDate(e.target.value)}
                                    className="field px-4 py-2.5"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                    <Clock size={14} /> Hora solicitada
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={requestedTime}
                                    onChange={(e) => setRequestedTime(e.target.value)}
                                    className="field px-4 py-2.5"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Motivo del cambio
                                </label>
                                <textarea
                                    required
                                    minLength={5}
                                    placeholder="Ej: Me olvidé de fichar al entrar..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                    className="field px-4 py-2.5 resize-none"
                                />
                            </div>

                            {error && (
                                <div role="alert" className="p-3 bg-danger-soft dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-control">
                                    <p className="text-xs text-danger-ink dark:text-red-300">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-control hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-control hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        'Solicitar Cambio'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
            </div>
        </div>
    );
};
