// Utility functions for vacation/absence type styling

export const getTypeLabel = (type: string, subtype?: string) => {
    switch (type) {
        case 'VACATION': return 'Vacaciones';
        case 'SICK_LEAVE': return 'Horas médicas';
        case 'PERSONAL': return 'Asuntos Propios';
        case 'OVERTIME': return 'Horas Exceso';
        case 'OTHER': return subtype || 'Otros Permisos';
        default: return type;
    }
};

export const getTypeColor = (type: string) => {
    switch (type) {
        case 'VACATION': return 'bg-blue-100 text-blue-700 border border-blue-200';
        case 'SICK_LEAVE': return 'bg-red-100 text-red-700 border border-red-200';
        case 'PERSONAL': return 'bg-amber-100 text-amber-700 border border-amber-200';
        case 'OVERTIME': return 'bg-violet-100 text-violet-700 border border-violet-200';
        default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
};
