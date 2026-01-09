import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

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

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    onConfirm,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar'
}) => {
    if (!isOpen) return null;

    const isConfirmModal = type === 'confirm';

    const iconMap = {
        success: <CheckCircle className="h-12 w-12 text-green-500" />,
        error: <AlertCircle className="h-12 w-12 text-red-500" />,
        warning: <AlertTriangle className="h-12 w-12 text-yellow-500" />,
        info: <Info className="h-12 w-12 text-blue-500" />,
        confirm: <AlertTriangle className="h-12 w-12 text-yellow-500" />
    };

    const colorMap = {
        success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30',
        error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30',
        warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/30',
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/30',
        confirm: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/30'
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        onClose();
    };

    // Handle ESC key
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            return () => document.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen, onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={handleOverlayClick}
        >
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full transform transition-all animate-slideUp border border-slate-100 dark:border-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {title || (type === 'success' ? '¡Éxito!' :
                            type === 'error' ? 'Error' :
                                type === 'warning' ? 'Advertencia' :
                                    type === 'confirm' ? 'Confirmación' : 'Información')}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className={`p-6 border-b border-slate-200 dark:border-slate-800 ${colorMap[type]}`}>
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            {iconMap[type]}
                        </div>
                        <div className="flex-1">
                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{message}</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 flex justify-end gap-3">
                    {isConfirmModal ? (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                {confirmText}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
