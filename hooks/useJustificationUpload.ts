import { useState, useCallback } from 'react';
import { uploadService, vacationService } from '../services/api';

type Notify = (message: string, type: 'success' | 'error') => void;

/**
 * Uploads a justification file and attaches it to an existing request,
 * tracking which rows are currently uploading.
 */
export const useRowJustificationUpload = (onDone: () => Promise<void> | void, notify: Notify) => {
    const [rowUploading, setRowUploading] = useState<Record<string, boolean>>({});

    const uploadForRow = useCallback(async (vacationId: string, file: File) => {
        setRowUploading(prev => ({ ...prev, [vacationId]: true }));
        try {
            const uploadResult = await uploadService.uploadJustification(file);
            await vacationService.updateJustification(vacationId, uploadResult.url);
            await onDone();
            notify('Justificante subido correctamente', 'success');
        } catch (error) {
            console.error('Row upload error:', error);
            notify('Error al subir el justificante', 'error');
        } finally {
            setRowUploading(prev => ({ ...prev, [vacationId]: false }));
        }
    }, [onDone, notify]);

    return { rowUploading, uploadForRow };
};
