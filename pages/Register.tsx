import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import { User, Mail, Briefcase, Lock, Ticket, AlertCircle } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { AuthShell, AuthField, PillButton } from '../components/AuthShell';

export const RegisterPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { settings } = useSettings();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        position: '',
        department: '',
        invitationCode: ''
    });

    const departmentOptions = useMemo(
        () => (Array.isArray(settings.departments) && settings.departments.length > 0
            ? settings.departments
            : ['IT', 'HR', 'Sales', 'Marketing', 'General']),
        [settings.departments]
    );

    useEffect(() => {
        if (!departmentOptions.includes(formData.department)) {
            setFormData(prev => ({ ...prev, department: departmentOptions[0] || 'General' }));
        }
    }, [departmentOptions, formData.department]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await authService.register({ ...formData, invitationCode: formData.invitationCode.trim().toUpperCase() });
            // The session lives in AuthContext, which reads storage on load: a full
            // navigation picks up the new token instead of bouncing back to /login.
            window.location.replace('/');
        } catch (err: any) {
            if (err.response?.data?.details && Array.isArray(err.response.data.details)) {
                setError(err.response.data.details.join(', '));
            } else {
                setError(err.response?.data?.error || 'No se pudo crear la cuenta.');
            }
            setIsLoading(false);
        }
    };

    return (
        <AuthShell
            headline={'Bienvenido\nal equipo.'}
            tagline="Crea tu cuenta con el código de invitación que te ha dado tu empresa."
            title="Crear cuenta"
            subtitle="Únete al portal del empleado"
            footer={
                <>
                    <span className="text-slate-500 dark:text-slate-400">¿Ya tienes cuenta? </span>
                    <Link to="/login" className="font-extrabold text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline">
                        Inicia sesión
                    </Link>
                </>
            }
        >
            <form className="space-y-4" onSubmit={handleSubmit}>
                <AuthField id="name" name="name" type="text" autoComplete="name" required label="Nombre completo"
                    icon={<User size={20} />} value={formData.name} onChange={handleChange} placeholder="Tu nombre" />

                <AuthField id="email" name="email" type="email" autoComplete="email" required label="Correo electrónico"
                    icon={<Mail size={20} />} value={formData.email} onChange={handleChange} placeholder="tu@empresa.com" />

                <div>
                    <AuthField id="password" name="password" type="password" autoComplete="new-password" required minLength={12}
                        label="Contraseña" icon={<Lock size={20} />} value={formData.password} onChange={handleChange} placeholder="••••••••"
                        aria-describedby="password-hint" />
                    <p id="password-hint" className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        Mínimo 12 caracteres, con mayúsculas, minúsculas, un número y un símbolo.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="department" className="label">Departamento</label>
                        <select id="department" name="department" value={formData.department} onChange={handleChange} required
                            className="field !min-h-[3.25rem] !rounded-[1.375rem] text-base">
                            {departmentOptions.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                        </select>
                    </div>
                    <AuthField id="position" name="position" type="text" autoComplete="organization-title" required label="Cargo"
                        icon={<Briefcase size={20} />} value={formData.position} onChange={handleChange} placeholder="Ej. Developer" />
                </div>

                <div>
                    <AuthField id="invitationCode" name="invitationCode" type="text" autoComplete="off" required
                        label="Código de invitación" icon={<Ticket size={20} />} value={formData.invitationCode} onChange={handleChange}
                        placeholder="CÓDIGO" className="uppercase tracking-[0.2em] font-mono" aria-describedby="invite-hint" />
                    <p id="invite-hint" className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Solicítalo a tu administrador.</p>
                </div>

                {error && (
                    <p role="alert" className="flex items-start gap-2 rounded-[1.375rem] bg-coral/15 px-4 py-3 text-sm font-bold text-coral-ink dark:text-coral">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{error}
                    </p>
                )}

                <div className="pt-2">
                    <PillButton type="submit" loading={isLoading} loadingText="Creando cuenta…">Crear cuenta</PillButton>
                </div>
            </form>
        </AuthShell>
    );
};
