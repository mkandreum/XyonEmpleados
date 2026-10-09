import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';

export type ModalType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    type?: ModalType;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
}

const MODAL_STYLES: Record<ModalType, { icon: React.ReactNode; panel: string; defaultTitle: string }> = {
    success: {
        icon: <CheckCircle className="h-10 w-10 text-success" aria-hidden="true" />,
        panel: 'bg-success-soft/60 dark:bg-green-900/20',
        defaultTitle: '¡Hecho!',
    },
    error: {
        icon: <AlertCircle className="h-10 w-10 text-danger" aria-hidden="true" />,
        panel: 'bg-danger-soft/60 dark:bg-red-900/20',
        defaultTitle: 'Error',
    },
    warning: {
        icon: <AlertTriangle className="h-10 w-10 text-warning" aria-hidden="true" />,
        panel: 'bg-warning-soft/60 dark:bg-amber-900/20',
        defaultTitle: 'Atención',
    },
    info: {
        icon: <Info className="h-10 w-10 text-blue-600" aria-hidden="true" />,
        panel: 'bg-blue-50 dark:bg-blue-900/20',
        defaultTitle: 'Información',
    },
    confirm: {
        icon: <AlertTriangle className="h-10 w-10 text-warning" aria-hidden="true" />,
        panel: 'bg-warning-soft/60 dark:bg-amber-900/20',
        defaultTitle: 'Confirmación',
    },
};

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    onConfirm,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
}) => {
    // Hook must run on every render (before the early return below).
    useEscapeKey(isOpen, onClose);

    if (!isOpen) return null;

    const style = MODAL_STYLES[type];
    const handleConfirm = () => {
        onConfirm?.();
        onClose();
    };

    return (
        <div
            className="modal-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div role="dialog" aria-modal="true" aria-label={title || style.defaultTitle} className="modal-panel max-w-md animate-scale-in">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title || style.defaultTitle}</h3>
                    <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-control hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    </button>
                </div>

                <div className={`p-6 border-b border-slate-200 dark:border-slate-800 ${style.panel}`}>
                    <div className="flex items-start gap-4">
                        <div className="shrink-0">{style.icon}</div>
                        <p className="flex-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">{message}</p>
                    </div>
                </div>

                <div className="p-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    {type === 'confirm' && (
                        <button onClick={onClose} className="btn-ghost">{cancelText}</button>
                    )}
                    <button onClick={type === 'confirm' ? handleConfirm : onClose} className="btn-primary">
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
