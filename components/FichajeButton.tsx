import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Loader2, Clock, ChevronDown, AlertCircle } from 'lucide-react';
import { fichajeService } from '../services/api';
import { FichajeTipo, TurnoInfo, Fichaje } from '../types';
import { AdjustFichajeModal } from './AdjustFichajeModal';
import { toast } from 'react-hot-toast'; // Assuming hot-toast is used based on context or similar toast logic

export const FichajeButton: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [hasActiveEntry, setHasActiveEntry] = useState(false);
    const [checking, setChecking] = useState(true);
    const [todayFichajes, setTodayFichajes] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [currentTurno, setCurrentTurno] = useState<TurnoInfo | null>(null);
    const [adjustingFichaje, setAdjustingFichaje] = useState<Fichaje | null>(null);

    const checkCurrentStatus = async () => {
        try {
            const status = await fichajeService.getCurrent();
            setHasActiveEntry(status.hasActiveEntry);
            if (status.turno) {
                setCurrentTurno(status.turno);
            }

            // Cargar fichajes de hoy
            await loadTodayFichajes();
        } catch (error) {
            console.error('Error checking fichaje status:', error);
        } finally {
            setChecking(false);
        }
    };

    const loadTodayFichajes = async () => {
        try {
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            const history = await fichajeService.getHistory({
                startDate: startOfDay.toISOString(),
                endDate: endOfDay.toISOString()
            });

            setTodayFichajes(history);
        } catch (error) {
            console.error('Error loading today fichajes:', error);
        }
    };

    useEffect(() => {
        checkCurrentStatus();
    }, []);

    const handleFichaje = async () => {
        setLoading(true);
        try {
            const tipo = hasActiveEntry ? FichajeTipo.SALIDA : FichajeTipo.ENTRADA;
            const result = await fichajeService.create(tipo);

            setHasActiveEntry(result.status.hasActiveEntry);

            // Save turno info for display
            if (result.turno) {
                setCurrentTurno(result.turno);
            } else if (tipo === FichajeTipo.SALIDA) {
                setCurrentTurno(null);
            }

            // Recargar fichajes de hoy
            await loadTodayFichajes();

            // Show success message with turno info
            let message = '';
            if (tipo === FichajeTipo.ENTRADA) {
                const turnoStr = result.turno ? ` — ${result.turno.label} (${result.turno.expectedEntry} - ${result.turno.expectedExit})` : '';
                message = `✓ Entrada registrada${turnoStr}`;
                toast.success(message, { duration: 5000 });
            } else {
                toast.success('✓ Salida registrada correctamente');
            }
        } catch (error: any) {
            console.error('Error creating fichaje:', error);
            toast.error(error.response?.data?.error || 'Error al registrar fichaje');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    if (checking) {
        return (
            <div className="flex flex-col items-center gap-4">
                <button
                    disabled
                    className="flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transition-all bg-slate-300 text-slate-500 cursor-not-allowed"
                >
                    <Loader2 size={24} className="animate-spin" />
                    Cargando...
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
            <button
                onClick={handleFichaje}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${hasActiveEntry
                    ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                    }`}
            >
                {loading ? (
                    <>
                        <Loader2 size={24} className="animate-spin" />
                        Procesando...
                    </>
                ) : hasActiveEntry ? (
                    <>
                        <LogOut size={24} />
                        Fichar Salida
                    </>
                ) : (
                    <>
                        <LogIn size={24} />
                        Fichar Entrada
                    </>
                )}
            </button>

            {/* Turno Info Badge */}
            {currentTurno && hasActiveEntry && (
                <div className="flex flex-col gap-1 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-300">
                    <div className="flex items-center gap-2 text-xs">
                        <AlertCircle size={14} className="shrink-0" />
                        <span className="font-bold uppercase tracking-wider">{currentTurno.label}</span>
                    </div>
                    {(currentTurno.expectedEntry && currentTurno.expectedExit) && (
                        <p className="text-[10px] font-medium opacity-80 pl-5">
                            Tu horario hoy: {currentTurno.expectedEntry} - {currentTurno.expectedExit}
                        </p>
                    )}
                </div>
            )}

            {/* Historial de hoy (Collapsible) */}
            {todayFichajes.length > 0 && (
                <div className="w-full">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${showHistory
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <Clock size={15} />
                            Fichajes de hoy
                        </span>
                        <span className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${showHistory
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                {todayFichajes.length}
                            </span>
                            <ChevronDown size={16} className={`transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`} />
                        </span>
                    </button>

                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showHistory ? 'max-h-[400px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-black/20 overflow-hidden">
                            {/* Header */}
                            <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-800 dark:to-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Registro del día
                                </p>
                            </div>

                            {/* Timeline list */}
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {todayFichajes.map((fichaje, index) => {
                                    const isEntrada = fichaje.tipo === 'ENTRADA';
                                    return (
                                        <div
                                            key={fichaje.id || index}
                                            className="flex items-center gap-3 px-4 py-3 group hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                                        >
                                            {/* Timeline dot */}
                                            <div className="relative flex flex-col items-center">
                                                <div className={`w-3 h-3 rounded-full ring-4 shrink-0 ${isEntrada
                                                    ? 'bg-blue-500 ring-blue-100 dark:ring-blue-900/50'
                                                    : 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/50'
                                                    }`} />
                                                {index < todayFichajes.length - 1 && (
                                                    <div className="absolute top-5 w-px h-6 bg-slate-200 dark:bg-slate-700" />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline gap-2">
                                                    <span className={`text-sm font-semibold ${isEntrada
                                                        ? 'text-blue-700 dark:text-blue-400'
                                                        : 'text-emerald-700 dark:text-emerald-400'
                                                        }`}>
                                                        {isEntrada ? '→ Entrada' : '← Salida'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Time */}
                                            <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                                {formatTime(fichaje.timestamp)}
                                            </span>

                                            {/* Adjust button - visible on mobile, reveal on hover desktop */}
                                            <button
                                                onClick={() => setAdjustingFichaje(fichaje)}
                                                title="Solicitar ajuste"
                                                className="sm:opacity-0 sm:group-hover:opacity-100 shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40 dark:hover:text-blue-400 transition-all"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer summary */}
                            <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-800 dark:to-slate-800/80 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                        {todayFichajes.filter(f => f.tipo === 'ENTRADA').length} entradas · {todayFichajes.filter(f => f.tipo === 'SALIDA').length} salidas
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                        Toca ✏️ para solicitar ajuste
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {adjustingFichaje && (
                <AdjustFichajeModal
                    fichaje={adjustingFichaje}
                    onClose={() => setAdjustingFichaje(null)}
                    onSuccess={() => {
                        toast.success('Solicitud de ajuste enviada');
                        loadTodayFichajes();
                    }}
                />
            )}
        </div>

    );
};
