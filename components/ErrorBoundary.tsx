import React from 'react';
import { RotateCcw, Home } from 'lucide-react';
import { BlobIcon } from './Shapes';

interface State { error: Error | null }

/**
 * Catches render errors so one broken widget shows a recoverable screen instead of a blank page.
 * Reset automatically when the route changes (`resetKey`).
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode; resetKey?: string }, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('UI error:', error, info.componentStack);
    }

    componentDidUpdate(prev: { resetKey?: string }) {
        if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div role="alert" className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
                <BlobIcon icon={<span className="font-display font-black text-3xl">!</span>} color="#FF6B4A" size={104} />
                <h1 className="mt-4 font-display font-black text-3xl tracking-tighter text-ink dark:text-white">Algo se ha torcido</h1>
                <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm">Esta pantalla ha tenido un problema. Puedes reintentar o volver al inicio.</p>
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                    <button className="btn-primary" onClick={() => this.setState({ error: null })}>
                        <RotateCcw size={16} aria-hidden="true" /> Reintentar
                    </button>
                    <a className="btn-secondary" href="/">
                        <Home size={16} aria-hidden="true" /> Inicio
                    </a>
                </div>
            </div>
        );
    }
}
