import React, { useState, useEffect } from 'react';
import { Clock, Users, Calendar, Settings, Download } from 'lucide-react';
import { fichajeService, scheduleService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const AdminFichajes: React.FC = () => {
    const { user } = useAuth();
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedView, setSelectedView] = useState<'week' | 'month'>('week');
    const [fichajes, setFichajes] = useState<any[]>([]);
    const [schedule, setSchedule] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Schedule form state
    const [scheduleForm, setScheduleForm] = useState({
        horaEntrada: '09:00',
        horaSalida: '18:00',
        horaEntradaTarde: '',
        horaSalidaMañana: '',
        toleranciaMinutos: 10,
        isPartido: false
    });

    const departments = ['IT', 'RRHH', 'Ventas', 'Marketing', 'Operaciones'];

    useEffect(() => {
        if (selectedDepartment) {
            loadSchedule();
            loadFichajes();
        }
    }, [selectedDepartment, selectedView]);

    const loadSchedule = async () => {
        try {
            const data = await scheduleService.get(selectedDepartment);
            if (data) {
                setSchedule(data);
                setScheduleForm({
                    horaEntrada: data.horaEntrada || '09:00',
                    horaSalida: data.horaSalida || '18:00',
                    horaEntradaTarde: data.horaEntradaTarde || '',
                    horaSalidaMañana: data.horaSalidaMañana || '',
                    toleranciaMinutos: data.toleranciaMinutos || 10,
                    isPartido: !!(data.horaEntradaTarde && data.horaSalidaMañana)
                });
            }
        } catch (error) {
            console.error('Error loading schedule:', error);
        }
    };

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
                            flatData.push({
                                userName: userGroup.user.name,
                                date: dayGroup.date,
                                pairIndex: i + 1, // Para identificar si es 1er turno, 2do turno, etc.
                                entrada: entradas[i] ? new Date(entradas[i].timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-',
                                salida: salidas[i] ? new Date(salidas[i].timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-',
                                horasTrabajadas: i === maxPairs - 1 ? dayGroup.horasTrabajadas : null, // Solo mostrar total en la última fila
                                isComplete: dayGroup.isComplete,
                                isLate: entradas[i] ? dayGroup.isLate : false,
                                isEarlyDeparture: salidas[i] ? dayGroup.isEarlyDeparture : false
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

    const handleSaveSchedule = async () => {
        try {
            const scheduleData = {
                department: selectedDepartment,
                horaEntrada: scheduleForm.horaEntrada,
                horaSalida: scheduleForm.horaSalida,
                horaEntradaTarde: scheduleForm.isPartido ? scheduleForm.horaEntradaTarde : null,
                horaSalidaMañana: scheduleForm.isPartido ? scheduleForm.horaSalidaMañana : null,
                toleranciaMinutos: scheduleForm.toleranciaMinutos
            };

            await scheduleService.update(scheduleData);
            alert('Horario guardado correctamente');
            loadSchedule();
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Error al guardar el horario');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestión de Fichajes</h1>
                    <p className="text-slate-500">Administra horarios y visualiza fichajes por departamento</p>
                </div>
                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <Download size={18} />
                    <span>Exportar</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Users size={16} className="inline mr-1" />
                            Departamento
                        </label>
                        <select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            <option value="">Seleccionar departamento</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Calendar size={16} className="inline mr-1" />
                            Vista
                        </label>
                        <select
                            value={selectedView}
                            onChange={(e) => setSelectedView(e.target.value as 'week' | 'month')}
                            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            <option value="week">Semana actual</option>
                            <option value="month">Mes actual</option>
                        </select>
                    </div>
                </div>
            </div>

            {selectedDepartment && (
                <>
                    {/* Schedule Configuration */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Settings className="text-blue-600" size={24} />
                            <h2 className="text-xl font-semibold text-slate-900">Configuración de Horario - {selectedDepartment}</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isPartido"
                                    checked={scheduleForm.isPartido}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, isPartido: e.target.checked })}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="isPartido" className="text-sm font-medium text-slate-700">
                                    Horario partido (mañana y tarde)
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Hora Entrada {scheduleForm.isPartido && 'Mañana'}
                                    </label>
                                    <input
                                        type="time"
                                        value={scheduleForm.horaEntrada}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, horaEntrada: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>

                                {scheduleForm.isPartido && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Hora Salida Mañana
                                        </label>
                                        <input
                                            type="time"
                                            value={scheduleForm.horaSalidaMañana}
                                            onChange={(e) => setScheduleForm({ ...scheduleForm, horaSalidaMañana: e.target.value })}
                                            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                )}

                                {scheduleForm.isPartido && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Hora Entrada Tarde
                                        </label>
                                        <input
                                            type="time"
                                            value={scheduleForm.horaEntradaTarde}
                                            onChange={(e) => setScheduleForm({ ...scheduleForm, horaEntradaTarde: e.target.value })}
                                            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Hora Salida {scheduleForm.isPartido && 'Tarde'}
                                    </label>
                                    <input
                                        type="time"
                                        value={scheduleForm.horaSalida}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, horaSalida: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Tolerancia (minutos)
                                    </label>
                                    <input
                                        type="number"
                                        value={scheduleForm.toleranciaMinutos}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, toleranciaMinutos: parseInt(e.target.value) })}
                                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        min="0"
                                        max="60"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSaveSchedule}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Guardar Horario
                            </button>
                        </div>
                    </div>

                    {/* Fichajes Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Fichajes del Departamento - {selectedView === 'week' ? 'Semana Actual' : 'Mes Actual'}
                            </h2>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center">
                                <Clock className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
                                <p className="text-slate-500">Cargando fichajes...</p>
                            </div>
                        ) : fichajes.length === 0 ? (
                            <div className="p-12 text-center">
                                <Clock className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-500">No hay fichajes registrados</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                Empleado
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                Fecha
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                Turno
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                Entrada
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                Salida
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                Horas Total
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                Estado
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {fichajes.map((fichaje: any, index: number) => (
                                            <tr key={index} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                    {fichaje.userName || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {new Date(fichaje.date).toLocaleDateString('es-ES')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded ${fichaje.pairIndex === 1 ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                                        }`}>
                                                        {fichaje.pairIndex === 1 ? 'Mañana' : 'Tarde'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {fichaje.entrada || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {fichaje.salida || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                                                    {fichaje.horasTrabajadas ? `${fichaje.horasTrabajadas}h` : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${fichaje.isLate || fichaje.isEarlyDeparture
                                                        ? 'bg-red-100 text-red-800'
                                                        : fichaje.isComplete
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {fichaje.isLate ? 'Tarde' : fichaje.isEarlyDeparture ? 'Salida temprana' : fichaje.isComplete ? 'Completo' : 'Incompleto'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
