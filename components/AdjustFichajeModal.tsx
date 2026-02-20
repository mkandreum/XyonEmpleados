import React, { useState } from 'react';
import { X, Clock, Calendar, AlertCircle } from 'lucide-react';
import { fichajeAdjustmentService } from '../services/api';
import { Fichaje } from '../types';

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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            {/* Backdrop Blur Layer */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-md transition-all" style={{zIndex: 1001}} />
            {/* Modal Content */}
            <div className="relative z-[1002] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Clock className="text-blue-500" size={24} />
                            Solicitar Ajuste
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
                        <div className="flex gap-3">
                            <AlertCircle className="text-amber-500 shrink-0" size={18} />
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
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                <Calendar size={14} /> Fecha solicitada
                            </label>
                            <input
                                type="date"
                                required
                                value={requestedDate}
                                onChange={(e) => setRequestedDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                <Clock size={14} /> Hora solicitada
                            </label>
                            <input
                                type="time"
                                required
                                value={requestedTime}
                                onChange={(e) => setRequestedTime(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
                                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
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
