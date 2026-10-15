import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { AuthShell, AuthField, PillButton } from '../components/AuthShell';

export const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });

    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const linkValid = !!token && !!email;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            await authService.resetPassword({ token, email, newPassword: formData.newPassword });
            setDone(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            const details = err.response?.data?.details;
            setError(Array.isArray(details) ? details.join(', ') : (err.response?.data?.error || 'No se pudo restablecer la contraseña. El enlace puede haber caducado.'));
        } finally {
            setIsLoading(false);
        }
    };

    const backLink = (
        <Link to="/login" className="inline-flex items-center gap-2 font-extrabold text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline">
            <ArrowLeft size={16} aria-hidden="true" />
            Volver a iniciar sesión
        </Link>
    );

    if (!linkValid) {
        return (
            <AuthShell headline={'Enlace\nroto.'} title="Enlace no válido" subtitle="Faltan datos en el enlace de recuperación. Pide uno nuevo."
                footer={backLink}>
                <Link to="/forgot-password" className="btn-primary w-full !min-h-[3.25rem]">Pedir un enlace nuevo</Link>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            headline={'Empieza\nde nuevo.'}
            tagline="Elige una contraseña que no uses en otros sitios."
            title="Nueva contraseña"
            subtitle={email ?? undefined}
            footer={backLink}
        >
            {done ? (
                <div role="status" className="flex items-start gap-3 rounded-[1.375rem] bg-lime p-4 text-ink font-semibold animate-pop">
                    <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
                    <span>Contraseña actualizada. Te llevamos al inicio de sesión…</span>
                </div>
            ) : (
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                        <AuthField id="newPassword" type="password" autoComplete="new-password" required minLength={12} label="Nueva contraseña"
                            icon={<Lock size={20} />} value={formData.newPassword} placeholder="••••••••" aria-describedby="pw-hint"
                            onChange={(e) => { setFormData({ ...formData, newPassword: e.target.value }); setError(''); }} />
                        <p id="pw-hint" className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Mínimo 12 caracteres, con mayúsculas, minúsculas, un número y un símbolo.</p>
                    </div>
                    <AuthField id="confirmPassword" type="password" autoComplete="new-password" required label="Confirmar contraseña"
                        icon={<Lock size={20} />} value={formData.confirmPassword} placeholder="••••••••"
                        error={!!formData.confirmPassword && formData.confirmPassword !== formData.newPassword}
                        onChange={(e) => { setFormData({ ...formData, confirmPassword: e.target.value }); setError(''); }} />

                    {error && (
                        <p role="alert" className="flex items-start gap-2 rounded-[1.375rem] bg-coral/15 px-4 py-3 text-sm font-bold text-coral-ink dark:text-coral">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{error}
                        </p>
                    )}

                    <PillButton type="submit" loading={isLoading} loadingText="Guardando…">Cambiar contraseña</PillButton>
                </form>
            )}
        </AuthShell>
    );
};
