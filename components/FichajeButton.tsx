import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Loader2, Clock } from 'lucide-react';
import { fichajeService } from '../services/api';
import { FichajeTipo } from '../types';

export const FichajeButton: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [hasActiveEntry, setHasActiveEntry] = useState(false);
    const [checking, setChecking] = useState(true);
    const [todayFichajes, setTodayFichajes] = useState<any[]>([]);

    const checkCurrentStatus = async () => {
        try {
            const status = await fichajeService.getCurrent();
            setHasActiveEntry(status.hasActiveEntry);

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

            // Recargar fichajes de hoy
            await loadTodayFichajes();

            // Show success message
            const message = tipo === FichajeTipo.ENTRADA
                ? '✓ Entrada registrada correctamente'
                : '✓ Salida registrada correctamente';

            // Simple toast notification
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.remove();
            }, 3000);
        } catch (error: any) {
            console.error('Error creating fichaje:', error);

            // Show error message
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            toast.textContent = error.response?.data?.error || 'Error al registrar fichaje';
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.remove();
            }, 3000);
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
        <div className="flex flex-col items-center gap-4">
            <button
                onClick={handleFichaje}
                disabled={loading}
                className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${hasActiveEntry
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

            {/* Historial de hoy */}
            {todayFichajes.length > 0 && (
                <div className="w-full max-w-md bg-white/50 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={14} className="text-blue-600" />
                        <span className="text-xs font-medium text-slate-700">Fichajes de hoy:</span>
                    </div>
                    <div className="space-y-1">
                        {todayFichajes.map((fichaje, index) => (
                            <div key={index} className="flex items-center justify-between text-xs">
                                <span className={`font-medium ${fichaje.tipo === 'ENTRADA' ? 'text-blue-600' : 'text-green-600'}`}>
                                    {fichaje.tipo === 'ENTRADA' ? '→ Entrada' : '← Salida'}
                                </span>
                                <span className="text-slate-600">{formatTime(fichaje.timestamp)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
