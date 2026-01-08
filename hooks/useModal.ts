import { useState, useCallback } from 'react';
import { ModalType } from '../components/Modal';

interface ModalState {
    isOpen: boolean;
    message: string;
    type: ModalType;
    title?: string;
    onConfirm?: () => void;
}

export const useModal = () => {
    const [modalState, setModalState] = useState<ModalState>({
        isOpen: false,
        message: '',
        type: 'info'
    });

    const showAlert = useCallback((message: string, type: ModalType = 'info', title?: string) => {
        setModalState({
            isOpen: true,
            message,
            type,
            title
        });
    }, []);

    const showConfirm = useCallback((
        message: string,
        onConfirm: () => void,
        title?: string
    ) => {
        setModalState({
            isOpen: true,
            message,
            type: 'confirm',
            title,
            onConfirm
        });
    }, []);

    const closeModal = useCallback(() => {
        setModalState(prev => ({ ...prev, isOpen: false }));
    }, []);

    return {
        modalState,
        showAlert,
        showConfirm,
        closeModal
    };
};
