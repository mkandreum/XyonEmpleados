import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthShell, AuthField, PillButton } from '../components/AuthShell';

export const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await authService.forgotPassword(email);
            setSent(true);
            setEmail('');
        } catch (err: any) {
            setError(err?.response?.status === 429
                ? 'Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.'
                : 'No se pudo procesar la solicitud. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell
            headline={'¿Sin\ncontraseña?'}
            tagline="Te enviamos un enlace para crear una nueva en menos de un minuto."
            title="Recuperar acceso"
            subtitle="Escribe el email de tu cuenta."
            footer={
                <Link to="/login" className="inline-flex items-center gap-2 font-extrabold text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline">
                    <ArrowLeft size={16} aria-hidden="true" />
                    Volver a iniciar sesión
                </Link>
            }
        >
            {sent ? (
                <div role="status" className="flex items-start gap-3 rounded-[1.375rem] bg-lime p-4 text-ink font-semibold animate-pop">
                    <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
                    <span>Si existe una cuenta con ese email, recibirás un enlace de recuperación. Revisa también la carpeta de spam.</span>
                </div>
            ) : (
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <AuthField id="email" type="email" autoComplete="email" required label="Correo electrónico"
                        icon={<Mail size={20} />} value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="tu@empresa.com" />

                    {error && (
                        <p role="alert" className="flex items-center gap-2 rounded-full bg-coral/15 px-4 py-2.5 text-sm font-bold text-coral-ink dark:text-coral">
                            <AlertCircle size={16} aria-hidden="true" />{error}
                        </p>
                    )}

                    <PillButton type="submit" loading={isLoading} loadingText="Enviando…">Enviar enlace</PillButton>
                </form>
            )}
        </AuthShell>
    );
};
