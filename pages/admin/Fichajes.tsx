import React, { useState, useEffect } from 'react';
import { Clock, Users, Calendar, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { fichajeService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const AdminFichajes: React.FC = () => {
    const { user } = useAuth() as any;
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedView, setSelectedView] = useState<'week' | 'month'>('week');
    const [fichajes, setFichajes] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);

    const departments = ['IT', 'RRHH', 'Ventas', 'Marketing', 'Operaciones'];

    useEffect(() => {
        if (selectedDepartment) {
            loadFichajes();
        }
    }, [selectedDepartment, selectedView]);

    const loadFichajes = async () => {
        setLoading(true);
        try {
            const response = await fichajeService.getDepartmentWeek(selectedDepartment);
            console.log('Department week response:', response);

            // El backend devuelve { department, schedule, users: [...] }
            if (response && response.users) {
                // Aplanar los datos para la tabla
                const flatData: any[] = [];
                response.users.forEach((userGroup: any) => {
                    userGroup.fichajes.forEach((dayGroup: any) => {
                        // Separar entradas y salidas
                        const entradas = dayGroup.fichajes.filter((f: any) => f.tipo === 'ENTRADA');
                        const salidas = dayGroup.fichajes.filter((f: any) => f.tipo === 'SALIDA');

                        // Crear una fila por cada par entrada-salida
                        const maxPairs = Math.max(entradas.length, salidas.length);

                        for (let i = 0; i < maxPairs; i++) {
                            // Check for notifications (show if any exists, regardless of read status)
                            const entradaWarning = entradas[i]?.lateNotifications?.length > 0;
                            const salidaWarning = salidas[i]?.lateNotifications?.length > 0;
                            const hasWarning = entradaWarning || salidaWarning;

                            flatData.push({
                                userName: userGroup.user.name,
                                date: dayGroup.date,
                                pairIndex: i + 1, // Para identificar si es 1er turno, 2do turno, etc.
                                entrada: entradas[i] ? new Date(entradas[i].timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-',
                                salida: salidas[i] ? new Date(salidas[i].timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-',
                                horasTrabajadas: i === maxPairs - 1 ? dayGroup.horasTrabajadas : null, // Solo mostrar total en la última fila
                                isComplete: dayGroup.isComplete,
                                isLate: entradas[i] ? dayGroup.isLate : false,
                                isEarlyDeparture: salidas[i] ? dayGroup.isEarlyDeparture : false,
                                hasWarning: hasWarning
                            });
                        }
                    });
                });
                setFichajes(flatData);
            } else {
                setFichajes([]);
            }
        } catch (error) {
            console.error('Error loading fichajes:', error);
            setFichajes([]);
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Fichajes</h1>
                    <p className="text-slate-500 dark:text-slate-400">Administra horarios y visualiza fichajes por departamento</p>
                </div>
                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <Download size={18} />
                    <span>Exportar</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors animate-slide-up delay-75">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            <Users size={16} className="inline mr-1" />
                            Departamento
                        </label>
                        <select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                        >
                            <option value="">Seleccionar departamento</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            <Calendar size={16} className="inline mr-1" />
                            Vista
                        </label>
                        <select
                            value={selectedView}
                            onChange={(e) => setSelectedView(e.target.value as 'week' | 'month')}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                        >
                            <option value="week">Semana actual</option>
                            <option value="month">Mes actual</option>
                        </select>
                    </div>
                </div>
            </div>

            {selectedDepartment && (
                <>
                    {/* Fichajes Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors animate-slide-up delay-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 transition-colors">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Fichajes del Departamento - {selectedView === 'week' ? 'Semana Actual' : 'Mes Actual'}
                            </h2>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center">
                                <Clock className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
                                <p className="text-slate-500 dark:text-slate-400">Cargando fichajes...</p>
                            </div>
                        ) : fichajes.length === 0 ? (
                            <div className="p-12 text-center">
                                <Clock className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
                                <p className="text-slate-500 dark:text-slate-400">No hay fichajes registrados</p>
                            </div>
                        ) : (
                            <>
                                {/* Desktop View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 dark:bg-slate-800 transition-colors">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Empleado
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Fecha
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Turno
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Entrada
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Salida
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Horas Total
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Aviso
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Estado
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800 transition-colors">
                                            {fichajes.map((fichaje: any, index: number) => (
                                                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                                                        {fichaje.userName || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                        {new Date(fichaje.date).toLocaleDateString('es-ES')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded ${fichaje.pairIndex === 1
                                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                                            }`}>
                                                            {fichaje.pairIndex === 1 ? 'Mañana' : 'Tarde'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                        {fichaje.entrada || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                        {fichaje.salida || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                        {fichaje.horasTrabajadas ? `${fichaje.horasTrabajadas}h` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {fichaje.hasWarning && (
                                                            <div className="flex items-center text-orange-600 dark:text-orange-400 gap-1" title="Aviso enviado por manager">
                                                                <AlertCircle size={16} />
                                                                <span className="text-xs font-medium">Enviado</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex gap-2">
                                                            {fichaje.isLate && (
                                                                <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                                                                    Tarde
                                                                </span>
                                                            )}
                                                            {fichaje.isEarlyDeparture && (
                                                                <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full">
                                                                    Salida anticipada
                                                                </span>
                                                            )}
                                                            {fichaje.isComplete && !fichaje.isLate && !fichaje.isEarlyDeparture && (
                                                                <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                                                                    Correcto
                                                                </span>
                                                            )}
                                                            {!fichaje.isComplete && !fichaje.isLate && !fichaje.isEarlyDeparture && (
                                                                <span className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 rounded-full">
                                                                    Incompleto
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-slate-50 dark:bg-slate-950/50">
                                    {fichajes.map((fichaje: any, index: number) => (
                                        <div key={index} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-white">{fichaje.userName}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(fichaje.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                                </div>
                                                <span className={`px-2 py-1 text-xs font-medium rounded ${fichaje.pairIndex === 1
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                                    }`}>
                                                    {fichaje.pairIndex === 1 ? 'Mañana' : 'Tarde'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-3">
                                                <div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Entrada</div>
                                                    <div className="font-medium text-slate-900 dark:text-white">{fichaje.entrada}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Salida</div>
                                                    <div className="font-medium text-slate-900 dark:text-white">{fichaje.salida}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    {fichaje.horasTrabajadas ? `${fichaje.horasTrabajadas}h` : '-'}
                                                </div>
                                                <div className="flex flex-wrap gap-2 justify-end">
                                                    {fichaje.hasWarning && (
                                                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full border border-orange-100 dark:border-orange-900/30">
                                                            <AlertCircle size={12} />
                                                            Aviso
                                                        </span>
                                                    )}
                                                    {fichaje.isLate && (
                                                        <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                                                            Tarde
                                                        </span>
                                                    )}
                                                    {fichaje.isEarlyDeparture && (
                                                        <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full">
                                                            Salida anticipada
                                                        </span>
                                                    )}
                                                    {fichaje.isComplete && !fichaje.isLate && !fichaje.isEarlyDeparture && (
                                                        <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                                                            Correcto
                                                        </span>
                                                    )}
                                                    {!fichaje.isComplete && !fichaje.isLate && !fichaje.isEarlyDeparture && (
                                                        <span className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 rounded-full">
                                                            Incompleto
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div >
                </>
            )}
        </div >
    );
};
