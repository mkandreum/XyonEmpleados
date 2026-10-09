import React from 'react';
import { VacationStatus } from '../types';

/** Single source of truth for vacation/absence status label + colors. */
export const vacationStatusLabel = (status: string): string => {
    switch (status) {
        case VacationStatus.PENDING: return 'Pendiente';
        case VacationStatus.PENDING_MANAGER: return 'Pendiente de manager';
        case VacationStatus.PENDING_ADMIN: return 'Pendiente de RRHH';
        case VacationStatus.APPROVED: return 'Aprobada';
        case VacationStatus.REJECTED: return 'Rechazada';
        default: return status;
    }
};

export const vacationStatusClasses = (status: string): string => {
    switch (status) {
        case VacationStatus.APPROVED:
            return 'bg-success-soft text-success-ink dark:bg-green-900/30 dark:text-green-300';
        case VacationStatus.PENDING:
        case VacationStatus.PENDING_MANAGER:
        case VacationStatus.PENDING_ADMIN:
            return 'bg-warning-soft text-warning-ink dark:bg-amber-900/30 dark:text-amber-300';
        case VacationStatus.REJECTED:
            return 'bg-danger-soft text-danger-ink dark:bg-red-900/30 dark:text-red-300';
        default:
            return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
};

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${vacationStatusClasses(status)} ${className}`}>
        {vacationStatusLabel(status)}
    </span>
);

export default StatusBadge;
