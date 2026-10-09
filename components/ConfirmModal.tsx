import React from 'react';
import { AlertCircle, X, Loader2 } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger' | 'info';
    isLoading?: boolean;
}

const SCHEMES = {
    warning: { bg: 'bg-warning-soft dark:bg-amber-900/30', icon: 'text-warning', button: 'bg-warning hover:bg-amber-700' },
    danger: { bg: 'bg-danger-soft dark:bg-red-900/30', icon: 'text-danger', button: 'bg-danger hover:bg-red-700' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/30', icon: 'text-blue-600', button: 'bg-blue-600 hover:bg-blue-700' },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning',
    isLoading = false,
}) => {
    useEscapeKey(isOpen && !isLoading, onClose);

    if (!isOpen) return null;
    const scheme = SCHEMES[type];

    return (
        <div className="modal-backdrop">
            <div role="alertdialog" aria-modal="true" aria-label={title} className="modal-panel max-w-md animate-scale-in">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-control ${scheme.bg}`}>
                            <AlertCircle className={scheme.icon} size={24} aria-hidden="true" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        aria-label="Cerrar"
                        className="p-2 rounded-control text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-slate-600 dark:text-slate-300">{message}</p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 rounded-b-modal">
                    <button onClick={onClose} disabled={isLoading} className="btn-secondary">{cancelText}</button>
                    <button
                        onClick={() => { if (!isLoading) onConfirm(); }}
                        disabled={isLoading}
                        className={`btn text-white ${scheme.button}`}
                    >
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {isLoading ? 'Procesando...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
