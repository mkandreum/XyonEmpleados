import React, { useState } from 'react';
import { LogIn, LogOut, Loader2, Clock, ChevronDown, AlertCircle, Pencil } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Fichaje, TurnoInfo } from '../types';
import { AdjustFichajeModal } from './AdjustFichajeModal';
import { useFichaje } from '../hooks/useFichaje';

const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

const TurnoBadge: React.FC<{ turno: TurnoInfo }> = ({ turno }) => (
    <div className="flex flex-col gap-1 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-control text-blue-800 dark:text-blue-300">
        <div className="flex items-center gap-2 text-xs">
            <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
            <span className="font-semibold">{turno.label}</span>
        </div>
        {turno.expectedEntry && turno.expectedExit && (
            <p className="text-2xs font-medium pl-5">
                Tu horario hoy: {turno.expectedEntry} - {turno.expectedExit}
            </p>
        )}
    </div>
);

const TodayFichajesPanel: React.FC<{ fichajes: Fichaje[]; onAdjust: (f: Fichaje) => void }> = ({ fichajes, onAdjust }) => {
    const entradas = fichajes.filter(f => f.tipo === 'ENTRADA').length;
    const salidas = fichajes.filter(f => f.tipo === 'SALIDA').length;

    return (
        <div className="card overflow-hidden">
            <p className="px-4 py-2.5 text-2xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                Registro del día
            </p>

            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {fichajes.map((fichaje, index) => {
                    const isEntrada = fichaje.tipo === 'ENTRADA';
                    return (
                        <li key={fichaje.id || index} className="flex items-center gap-3 px-4 py-3 group hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                            <div className="relative flex flex-col items-center">
                                <div className={`w-3 h-3 rounded-full ring-4 shrink-0 ${isEntrada
                                    ? 'bg-blue-500 ring-blue-100 dark:ring-blue-900/50'
                                    : 'bg-success ring-success-soft dark:ring-green-900/50'}`} />
                                {index < fichajes.length - 1 && (
                                    <div className="absolute top-5 w-px h-6 bg-slate-200 dark:bg-slate-700" />
                                )}
                            </div>

                            <span className={`flex-1 min-w-0 text-sm font-semibold ${isEntrada
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-success-ink dark:text-green-400'}`}>
                                {isEntrada ? 'Entrada' : 'Salida'}
                            </span>

                            <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                {formatTime(fichaje.timestamp)}
                            </span>

                            <button
                                onClick={() => onAdjust(fichaje)}
                                title="Solicitar ajuste"
                                aria-label={`Solicitar ajuste del fichaje de ${formatTime(fichaje.timestamp)}`}
                                className="sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 shrink-0 p-2 rounded-control bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-400 transition-all"
                            >
                                <Pencil size={14} aria-hidden="true" />
                            </button>
                        </li>
                    );
                })}
            </ul>

            <p className="px-4 py-2.5 text-2xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700">
                {entradas} entradas · {salidas} salidas
            </p>
        </div>
    );
};

export const FichajeButton: React.FC = () => {
    const { checking, submitting, hasActiveEntry, currentTurno, todayFichajes, toggleFichaje, reloadToday } = useFichaje();
    const [showHistory, setShowHistory] = useState(false);
    const [adjustingFichaje, setAdjustingFichaje] = useState<Fichaje | null>(null);

    if (checking) {
        return (
            <div className="flex flex-col items-center gap-4">
                <button disabled className="flex items-center gap-3 px-8 py-4 rounded-control font-semibold text-lg bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-not-allowed">
                    <Loader2 size={24} className="animate-spin" aria-hidden="true" />
                    Cargando...
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
            <button
                onClick={toggleFichaje}
                disabled={submitting}
                className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-control font-semibold text-lg text-white shadow-card transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${hasActiveEntry
                    ? 'bg-green-700 hover:bg-green-800'
                    : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {submitting ? (
                    <><Loader2 size={24} className="animate-spin" aria-hidden="true" />Procesando...</>
                ) : hasActiveEntry ? (
                    <><LogOut size={24} aria-hidden="true" />Fichar salida</>
                ) : (
                    <><LogIn size={24} aria-hidden="true" />Fichar entrada</>
                )}
            </button>

            {currentTurno && hasActiveEntry && <TurnoBadge turno={currentTurno} />}

            {todayFichajes.length > 0 && (
                <div className="w-full">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        aria-expanded={showHistory}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-control transition-all border ${showHistory
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}
                    >
                        <span className="flex items-center gap-2"><Clock size={15} aria-hidden="true" />Fichajes de hoy</span>
                        <span className="flex items-center gap-2">
                            <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${showHistory
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                                {todayFichajes.length}
                            </span>
                            <ChevronDown size={16} aria-hidden="true" className={`transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`} />
                        </span>
                    </button>

                    {showHistory && (
                        <div className="mt-2 animate-fade-in">
                            <TodayFichajesPanel fichajes={todayFichajes} onAdjust={setAdjustingFichaje} />
                        </div>
                    )}
                </div>
            )}

            {adjustingFichaje && (
                <AdjustFichajeModal
                    fichaje={adjustingFichaje}
                    onClose={() => setAdjustingFichaje(null)}
                    onSuccess={() => {
                        toast.success('Solicitud de ajuste enviada');
                        reloadToday();
                    }}
                />
            )}
        </div>
    );
};
