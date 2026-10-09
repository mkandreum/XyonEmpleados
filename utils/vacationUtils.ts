// Utility functions for vacation/absence type styling

export const getTypeLabel = (type: string, subtype?: string) => {
    switch (type) {
        case 'VACATION': return 'Vacaciones';
        case 'SICK_LEAVE': return 'Horas médicas';
        case 'MEDICAL_LEAVE': return 'Baja médica';
        case 'PERSONAL': return 'Asuntos Propios';
        case 'OVERTIME': return 'Horas Exceso';
        case 'OTHER': return subtype || 'Otros Permisos';
        default: return type;
    }
};

export const getTypeColor = (type: string) => {
    switch (type) {
        case 'VACATION': return 'bg-blue-100 text-blue-700 border border-blue-200';
        case 'SICK_LEAVE': return 'bg-orange-100 text-orange-700 border border-orange-200';
        case 'MEDICAL_LEAVE': return 'bg-red-100 text-red-700 border border-red-200';
        case 'PERSONAL': return 'bg-amber-100 text-amber-700 border border-amber-200';
        case 'OVERTIME': return 'bg-violet-100 text-violet-700 border border-violet-200';
        default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
};

/** Reasons offered under the "Otros permisos" request type. */
export const OTHER_SUBTYPES = [
    'Intervención quirúrgica familiar sin Hospitalización - 1 día',
    'Enfermedad / Reposo Médico Domiciliario',
    'Lactancia',
    'Horas Sindicales',
    'Fallecimiento Familiar 1º grado - 3 días',
    'Fallecimiento Familiar 2º grado - 2 días',
    'Fallecimiento Familiar 3º grado - 1 día',
    'Accidente o Enfermedad Grave - 5 días',
    'Matrimonio - 15 días naturales',
    'Mudanza - 1 día',
    'Matrimonio hijos/as en día laboral - 1 día',
    'Deber inexcusable de carácter público',
    'Horas Consulta Médico Cabecera / Especialista - 20 horas',
    'Horas Acom. Médico - 10 horas',
    'Ausencia Urgente Fuerza Mayor - 4 días anuales',
];

/** True for the "medical hours" reasons (justification optional, can be uploaded later). */
export const isMedicalHoursSubtype = (subtype?: string): boolean => {
    if (!subtype) return false;
    const normalized = subtype.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return normalized.includes('Horas Consulta Medico') || normalized.includes('Horas Acom. Medico');
};

/** Calendar days between two dates, both inclusive (weekends count). */
export const calculateNaturalDays = (start: Date, end: Date): number => {
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays + 1;
};

/** Working days between two dates, both inclusive (Saturdays and Sundays excluded). */
export const calculateBusinessDays = (start: Date, end: Date): number => {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) count++;
        current.setDate(current.getDate() + 1);
    }
    return count;
};

/** Hours left in a bank; 0 when the department has no bank configured. */
export const remainingHours = (total?: number, used?: number): number => (total ? total - (used || 0) : 0);
