import { useEffect } from 'react';

/** Calls `onEscape` when Escape is pressed while `active` is true. */
export const useEscapeKey = (active: boolean, onEscape: () => void) => {
    useEffect(() => {
        if (!active) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onEscape();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [active, onEscape]);
};
