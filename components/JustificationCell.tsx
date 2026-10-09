import React from 'react';
import { FileText, Upload } from 'lucide-react';
import { VacationRequest } from '../types';
import { getAbsoluteUrl } from '../utils/urlUtils';
import { openProtectedFile } from '../utils/fileUtils';

interface JustificationCellProps {
    vacation: VacationRequest;
    /** Whether the employee may attach the justification after the request was created. */
    canUpload: boolean;
    uploading: boolean;
    onUpload: (vacationId: string, file: File) => void;
    onOpenError: () => void;
    /** `compact` is the table cell; `full` is the mobile card with longer labels. */
    variant?: 'compact' | 'full';
    accept?: string;
}

/** Shows the justification link, the medical-leave tag, an upload action, or an empty marker. */
export const JustificationCell: React.FC<JustificationCellProps> = ({
    vacation, canUpload, uploading, onUpload, onOpenError, variant = 'compact', accept = '.pdf,.jpg,.jpeg,.png',
}) => {
    const full = variant === 'full';

    if (vacation.justificationUrl) {
        const url = vacation.justificationUrl;
        return (
            <a
                href={getAbsoluteUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={async (e) => {
                    e.preventDefault();
                    try {
                        await openProtectedFile(url);
                    } catch (error) {
                        console.error('Open file error:', error);
                        onOpenError();
                    }
                }}
                className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:underline text-xs font-medium"
            >
                <FileText size={14} aria-hidden="true" />
                {full ? 'Ver justificante' : 'Ver'}
            </a>
        );
    }

    if (vacation.type === 'MEDICAL_LEAVE') {
        return (
            <span className="bg-danger-soft text-danger-ink dark:bg-red-900/30 dark:text-red-300 text-xs font-medium px-2.5 py-1 rounded-full border border-red-200 dark:border-red-900/50">
                Baja médica
            </span>
        );
    }

    if (canUpload) {
        return (
            <label className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-400 cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-blue-500 rounded">
                <input
                    type="file"
                    accept={accept}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            onUpload(vacation.id, file);
                            e.currentTarget.value = '';
                        }
                    }}
                    className="sr-only"
                    disabled={uploading}
                />
                <Upload size={14} aria-hidden="true" />
                {uploading ? 'Subiendo...' : full ? 'Subir justificante' : 'Subir'}
            </label>
        );
    }

    return <span className="text-xs text-slate-500 dark:text-slate-400">{full ? 'Sin justificante' : '-'}</span>;
};
