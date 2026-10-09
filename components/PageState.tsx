import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

/** Consistent loading / empty / error blocks for pages and lists. */
export const LoadingState: React.FC<{ label?: string; fullPage?: boolean }> = ({ label = 'Cargando...', fullPage = false }) => (
    <div role="status" aria-live="polite"
        className={`flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400 ${fullPage ? 'h-[60vh]' : 'py-12'}`}>
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" aria-hidden="true" />
        <span className="text-sm">{label}</span>
    </div>
);

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; hint?: string; action?: React.ReactNode }> = ({ icon, title, hint, action }) => (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-12 px-4">
        {icon && <div className="text-slate-300 dark:text-slate-600" aria-hidden="true">{icon}</div>}
        <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
        {hint && <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">{hint}</p>}
        {action}
    </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
    <div role="alert" className="flex flex-col items-center justify-center text-center gap-3 py-12 px-4">
        <AlertCircle className="w-8 h-8 text-danger" aria-hidden="true" />
        <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
        {onRetry && (
            <button onClick={onRetry} className="px-4 py-2 rounded-control text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
                Reintentar
            </button>
        )}
    </div>
);
