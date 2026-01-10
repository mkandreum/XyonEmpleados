import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import { Mail, ArrowLeft } from 'lucide-react';

export const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            await authService.forgotPassword(email);
            setMessage('Si existe una cuenta con este email, recibirás un enlace de recuperación.');
            setEmail('');
        } catch (err) {
            setError('Error al procesar la solicitud. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow rounded-lg sm:px-10 border border-slate-200 dark:border-slate-800">
                    <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Recuperar Contraseña</h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Ingresa tu email para recibir un enlace de recuperación.
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
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Correo Electrónico
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    placeholder="tu@email.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                        >
                            {isLoading ? 'Enviando...' : 'Enviar Enlace'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                            <ArrowLeft size={16} />
                            Volver al Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
