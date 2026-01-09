import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Clock } from 'lucide-react';
import { fichajeService } from '../services/api';
import { Fichaje } from '../types';

export interface TodayFichajesListRef {
    refresh: () => Promise<void>;
}

export const TodayFichajesList = forwardRef<TodayFichajesListRef>((props, ref) => {
    const [todayFichajes, setTodayFichajes] = useState<Fichaje[]>([]);
    const [loading, setLoading] = useState(true);

    const loadTodayFichajes = async () => {
        try {
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            const history = await fichajeService.getHistory({
                startDate: startOfDay.toISOString(),
                endDate: endOfDay.toISOString()
            });

            // Ensure history is typed correctly or cast it if the service returns any
            setTodayFichajes(history as unknown as Fichaje[]);
        } catch (error) {
            console.error('Error loading today fichajes:', error);
        } finally {
            setLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({
        refresh: loadTodayFichajes
    }));

    useEffect(() => {
        loadTodayFichajes();
    }, []);

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading && todayFichajes.length === 0) {
        return <div className="text-xs text-slate-400 text-center py-2">Cargando registros...</div>;
    }

    if (todayFichajes.length === 0) {
        return (
            <div className="text-center py-4 bg-white/50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-400">No hay fichajes hoy</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                <Clock size={16} className="text-slate-500" />
                <h3 className="font-semibold text-slate-700 text-sm">Registros de Hoy</h3>
            </div>
            <div className="divide-y divide-slate-100">
                {todayFichajes.map((fichaje, index) => (
                    <div key={index} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${fichaje.tipo === 'ENTRADA' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                            <span className={`text-sm font-medium ${fichaje.tipo === 'ENTRADA' ? 'text-blue-700' : 'text-green-700'}`}>
                                {fichaje.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'}
                            </span>
                        </div>
                        <span className="font-mono text-sm text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded">
                            {formatTime(fichaje.timestamp)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
});

TodayFichajesList.displayName = 'TodayFichajesList';
