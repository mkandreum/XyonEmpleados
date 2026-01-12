import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { User, Lock, Mail, Briefcase, Building } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

export const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [logoError, setLogoError] = useState(false);
    const { settings } = useSettings();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        position: '',
        department: 'General',
        invitationCode: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await authService.register(formData);
            // Navigate to dashboard
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Error al registrarse');
            setIsLoading(false);
        }
    };

    const companyName = settings.companyName || 'XyonEmpleados';
    const loginLogoUrl = settings.loginLogoUrl || settings.logoUrl;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                {loginLogoUrl && !logoError ? (
                    <img
                        src={loginLogoUrl}
                        alt={companyName}
                        className="w-auto h-32 mx-auto mb-6"
                        onError={() => setLogoError(true)}
                    />
                ) : null}
                <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Crear Cuenta</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Únete al portal del empleado
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow-xl rounded-xl sm:px-10 border border-slate-100 dark:border-slate-800 transition-colors">

                    {error && (
                        <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre Completo</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors"
                                    placeholder="Tu nombre"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Correo Electrónico</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors"
                                    placeholder="tu@email.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="department" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Departamento</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Building className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <select
                                        id="department"
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        className="block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors"
                                    >
                                        <option value="IT">IT</option>
                                        <option value="HR">Recursos Humanos</option>
                                        <option value="Sales">Ventas</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="General">General</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="position" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cargo</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Briefcase className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        id="position"
                                        name="position"
                                        type="text"
                                        required
                                        value={formData.position}
                                        onChange={handleChange}
                                        className="block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors"
                                        placeholder="Ej. Developer"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="invitationCode" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Código de Invitación</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="invitationCode"
                                    name="invitationCode"
                                    type="text"
                                    required
                                    value={(formData as any).invitationCode}
                                    onChange={handleChange}
                                    className="block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors uppercase tracking-widest font-mono"
                                    placeholder="CÓDIGO"
                                />
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Solicítalo a tu administrador.</p>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 dark:focus:ring-blue-500 transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? 'Registrando...' : 'Crear Cuenta'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-slate-600 dark:text-slate-400">¿Ya tienes cuenta? </span>
                        <Link to="/login" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                            Inicia Sesión
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
