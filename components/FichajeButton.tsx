import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Loader2, Clock } from 'lucide-react';
import { fichajeService } from '../services/api';
import { FichajeTipo } from '../types';

interface FichajeButtonProps {
    onFichajeChange?: () => void;
}

export const FichajeButton: React.FC<FichajeButtonProps> = ({ onFichajeChange }) => {
    const [loading, setLoading] = useState(false);
    const [hasActiveEntry, setHasActiveEntry] = useState(false);
    const [checking, setChecking] = useState(true);

    const checkCurrentStatus = async () => {
        try {
            const status = await fichajeService.getCurrent();
            setHasActiveEntry(status.hasActiveEntry);
        } catch (error) {
            console.error('Error checking fichaje status:', error);
        } finally {
            setChecking(false);
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

            // Notify parent
            if (onFichajeChange) {
                onFichajeChange();
            }

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
        </div>
    );
};
