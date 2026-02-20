import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Loader2, Clock, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
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
                        className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                    >
                        <span className="flex items-center gap-2">
                            <Clock size={16} />
                            Fichajes de hoy ({todayFichajes.length})
                        </span>
                        {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showHistory ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                        <div className="bg-white/50 rounded-lg p-3 border border-blue-100 shadow-sm space-y-1">
                            {todayFichajes.map((fichaje, index) => (
                                <div key={index} className="flex items-center justify-between text-xs py-1 border-b border-dashed border-slate-200 last:border-0 group">
                                    <div className="flex flex-col">
                                        <span className={`font-medium ${fichaje.tipo === 'ENTRADA' ? 'text-blue-600' : 'text-green-600'}`}>
                                            {fichaje.tipo === 'ENTRADA' ? '→ Entrada' : '← Salida'}
                                        </span>
                                        <span className="text-slate-600 font-mono">{formatTime(fichaje.timestamp)}</span>
                                    </div>
                                    <button
                                        onClick={() => setAdjustingFichaje(fichaje)}
                                        className="opacity-0 group-hover:opacity-100 bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold hover:bg-blue-100 transition-all text-[10px]"
                                    >
                                        Ajustar
                                    </button>
                                </div>
                            ))}
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
