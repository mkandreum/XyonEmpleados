import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { fichajeService } from '../services/api';
import { FichajeTipo, TurnoInfo } from '../types';
import { haptic } from '../utils/haptics';

/**
 * State and actions for the clock-in/out button:
 * current status (active entry + shift), today's records and the toggle action.
 */
export const useFichaje = () => {
    const [checking, setChecking] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [hasActiveEntry, setHasActiveEntry] = useState(false);
    const [currentTurno, setCurrentTurno] = useState<TurnoInfo | null>(null);
    const [todayFichajes, setTodayFichajes] = useState<any[]>([]);

    const loadTodayFichajes = useCallback(async () => {
        try {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            const history = await fichajeService.getHistory({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
            });
            setTodayFichajes(history);
        } catch (error) {
            console.error('Error loading today fichajes:', error);
        }
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const status = await fichajeService.getCurrent();
                setHasActiveEntry(status.hasActiveEntry);
                if (status.turno) setCurrentTurno(status.turno);
                await loadTodayFichajes();
            } catch (error) {
                console.error('Error checking fichaje status:', error);
            } finally {
                setChecking(false);
            }
        })();
    }, [loadTodayFichajes]);

    const toggleFichaje = useCallback(async () => {
        setSubmitting(true);
        try {
            const tipo = hasActiveEntry ? FichajeTipo.SALIDA : FichajeTipo.ENTRADA;
            const result = await fichajeService.create(tipo);

            setHasActiveEntry(result.status.hasActiveEntry);
            if (result.turno) setCurrentTurno(result.turno);
            else if (tipo === FichajeTipo.SALIDA) setCurrentTurno(null);

            await loadTodayFichajes();

            haptic('impact');
            if (tipo === FichajeTipo.ENTRADA) {
                const turnoStr = result.turno
                    ? ` — ${result.turno.label} (${result.turno.expectedEntry} - ${result.turno.expectedExit})`
                    : '';
                toast.success(`✓ Entrada registrada${turnoStr}`, { duration: 5000 });
            } else {
                toast.success('✓ Salida registrada correctamente');
            }
        } catch (error: any) {
            console.error('Error creating fichaje:', error);
            haptic('error');
            toast.error(error.response?.data?.error || 'Error al registrar fichaje');
        } finally {
            setSubmitting(false);
        }
    }, [hasActiveEntry, loadTodayFichajes]);

    return { checking, submitting, hasActiveEntry, currentTurno, todayFichajes, toggleFichaje, reloadToday: loadTodayFichajes };
};
