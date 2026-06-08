import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { Lock } from 'lucide-react';

export const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    useEffect(() => {
        if (!token || !email) {
            setError('Enlace inválido o incompleto.');
        }
    }, [token, email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            await authService.resetPassword({
                token,
                email,
                newPassword: formData.newPassword
            });
            setMessage('Contraseña actualizada correctamente. Redirigiendo al login...');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al restablecer la contraseña');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token || !email) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-lg shadow-lg text-center max-w-md w-full border border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Enlace Inválido</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">Faltan parámetros requeridos en el enlace de recuperación.</p>
                    <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">Volver al Inicio</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow rounded-lg sm:px-10 border border-slate-200 dark:border-slate-800">
                    <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Nueva Contraseña</h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Introduce tu nueva contraseña.
                        </p>
                    </div>

                    {message && (
                        <div className="mb-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-3 rounded-lg text-sm">
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Nueva Contraseña
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                    className="block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Confirmar Contraseña
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                        >
                            {isLoading ? 'Actualizar Contraseña' : 'Cambiar Contraseña'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
