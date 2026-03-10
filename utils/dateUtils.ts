/**
 * Utilidades para formateo consistente de fechas
 * Usado en toda la aplicación para mantener formato uniforme
 */

/**
 * Formatea una fecha en formato corto español
 * @param date - Fecha a formatear (string ISO, Date object)
 * @param format - Tipo de formato ('short' | 'long' | 'input' | 'time')
 * @returns Fecha formateada
 * 
 * @example
 * formatDate('2026-01-15', 'short') => '15 ene 2026'
 * formatDate('2026-01-15', 'long') => '15 de enero de 2026'
 * formatDate('2026-01-15', 'input') => '2026-01-15'
 * formatDate('2026-01-15T14:30:00', 'time') => '14:30'
 */
export const formatDate = (
    date: string | Date | null | undefined, 
    format: 'short' | 'long' | 'input' | 'time' | 'datetime' = 'short'
): string => {
    if (!date) return '-';

    const d = typeof date === 'string' ? new Date(date) : date;

    // Verificar que la fecha sea válida
    if (isNaN(d.getTime())) {
        console.error('Invalid date:', date);
        return '-';
    }

    switch (format) {
        case 'short':
            // "15 ene 2026"
            return d.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

        case 'long':
            // "15 de enero de 2026"
            return d.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

        case 'input':
            // "2026-01-15" (formato HTML5 input type="date")
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;

        case 'time':
            // "14:30"
            return d.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });

        case 'datetime':
            // "15 ene 2026 14:30"
            return d.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

        default:
            return d.toLocaleDateString('es-ES');
    }
};

/**
 * Formatea un rango de fechas
 * @param startDate - Fecha de inicio
 * @param endDate - Fecha de fin
 * @returns Rango formateado "15 ene - 20 ene 2026" o "15 ene 2026 - 20 feb 2026"
 */
export const formatDateRange = (
    startDate: string | Date,
    endDate: string | Date
): string => {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    const sameMonth = start.getMonth() === end.getMonth();
    const sameYear = start.getFullYear() === end.getFullYear();

    if (sameMonth && sameYear) {
        // "15-20 ene 2026"
        return `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString('es-ES', {
            month: 'short',
            year: 'numeric'
        })}`;
    } else if (sameYear) {
        // "15 ene - 20 feb 2026"
        return `${formatDate(start, 'short').replace(` ${start.getFullYear()}`, '')} - ${formatDate(end, 'short')}`;
    } else {
        // "15 ene 2025 - 20 feb 2026"
        return `${formatDate(start, 'short')} - ${formatDate(end, 'short')}`;
    }
};

/**
 * Calcula la diferencia en días entre dos fechas
 * @param startDate - Fecha de inicio
 * @param endDate - Fecha de fin
 * @returns Número de días (inclusivo)
 */
export const calculateDaysDifference = (
    startDate: string | Date,
    endDate: string | Date
): number => {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays + 1; // +1 para incluir ambos días
};

/**
 * Obtiene el día de la semana en español
 * @param date - Fecha
 * @param format - 'long' para "Lunes" o 'short' para "Lun"
 */
export const getDayOfWeek = (
    date: string | Date,
    format: 'long' | 'short' = 'long'
): string => {
    const d = typeof date === 'string' ? new Date(date) : date;

    return d.toLocaleDateString('es-ES', {
        weekday: format
    });
};

/**
 * Verifica si una fecha es hoy
 */
export const isToday = (date: string | Date): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();

    return d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
};

/**
 * Verifica si una fecha es en el pasado
 */
export const isPast = (date: string | Date): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return d < today;
};

/**
 * Verifica si una fecha es en el futuro
 */
export const isFuture = (date: string | Date): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return d > today;
};

/**
 * Obtiene el rango de fechas del mes actual
 */
export const getCurrentMonthRange = (): { start: Date; end: Date } => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return { start, end };
};

/**
 * Obtiene el rango de fechas de la semana actual (lunes a domingo)
 */
export const getCurrentWeekRange = (): { start: Date; end: Date } => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Ajustar para que lunes sea el primer día

    const start = new Date(now);
    start.setDate(now.getDate() + diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};
