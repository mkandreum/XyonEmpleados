import React, { useState, useEffect } from 'react';
import { scheduleService } from '../services/api';
import { DepartmentSchedule } from '../types';
import { Clock, Plus, Edit2, CheckCircle, AlertCircle } from 'lucide-react';

export const ScheduleSettings: React.FC = () => {
    const [schedules, setSchedules] = useState<DepartmentSchedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<DepartmentSchedule>>({});
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadSchedules();
    }, []);

    const loadSchedules = async () => {
        try {
            const data = await scheduleService.getAll();
            setSchedules(data);
        } catch (error) {
            console.error('Error loading schedules:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (schedule: DepartmentSchedule) => {
        setEditingId(schedule.id);
        setFormData(schedule);
        setIsCreating(false);
    };

    const handleCreate = () => {
        setEditingId('new');
        setFormData({
            department: '',
            horaEntrada: '09:00',
            horaSalida: '18:00',
            toleranciaMinutos: 10,
            flexibleSchedule: false
        });
        setIsCreating(true);
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({});
        setIsCreating(false);
    };

    const handleSave = async () => {
        if (!formData.department || !formData.horaEntrada || !formData.horaSalida) {
            alert('Campos requeridos faltantes');
            return;
        }

        try {
            // Ensure types match what backend expects
            await scheduleService.update({
                department: formData.department,
                horaEntrada: formData.horaEntrada,
                horaSalida: formData.horaSalida,
                horaEntradaTarde: formData.horaEntradaTarde,
                horaSalidaMañana: formData.horaSalidaMañana,
                toleranciaMinutos: formData.toleranciaMinutos,
                flexibleSchedule: formData.flexibleSchedule
            });
            await loadSchedules();
            setEditingId(null);
            setIsCreating(false);
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Error al guardar horario');
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando horarios...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">Horarios por Departamento</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Configura horarios fijos o flexibles para cada departamento.</p>
                </div>
                {!isCreating && !editingId && (
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Plus size={18} /> Nuevo Horario
                    </button>
                )}
            </div>

            <div className="grid gap-6">
                {(isCreating || editingId) && (
                    <div className="col-span-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-sm animate-slide-up">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                            {isCreating ? 'Nuevo Horario' : `Editar Horario - ${formData.department}`}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Departamento
                                </label>
                                <input
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white disabled:opacity-50"
                                    value={formData.department}
                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                    disabled={!isCreating}
                                    placeholder="Ej: IT, MARKETING, RRHH"
                                />
                                <p className="text-xs text-slate-500 mt-1">Debe coincidir EXACTAMENTE con el departamento del usuario.</p>
                            </div>

                            <div className="flex items-end">
                                <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border w-full transition-all ${formData.flexibleSchedule
                                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900'
                                    : 'bg-white border-slate-200 dark:bg-slate-700 dark:border-slate-600'
                                    }`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.flexibleSchedule || false}
                                        onChange={e => setFormData({ ...formData, flexibleSchedule: e.target.checked })}
                                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                    />
                                    <div>
                                        <span className="font-medium text-slate-900 dark:text-white block">Horario Flexible</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Sin penalización por hora de entrada/salida</span>
                                    </div>
                                </label>
                            </div>

                            <div className={formData.flexibleSchedule ? 'opacity-40 pointer-events-none' : ''}>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora Entrada</label>
                                <input
                                    type="time"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                                    value={formData.horaEntrada}
                                    onChange={e => setFormData({ ...formData, horaEntrada: e.target.value })}
                                />
                            </div>

                            <div className={formData.flexibleSchedule ? 'opacity-40 pointer-events-none' : ''}>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora Salida</label>
                                <input
                                    type="time"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                                    value={formData.horaSalida}
                                    onChange={e => setFormData({ ...formData, horaSalida: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tolerancia (minutos)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                                    value={formData.toleranciaMinutos}
                                    onChange={e => setFormData({ ...formData, toleranciaMinutos: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={handleCancel} className="px-4 py-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleSave} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {schedules.map(schedule => (
                        <div key={schedule.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative group">
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white">{schedule.department}</h4>
                                <button
                                    onClick={() => handleEdit(schedule)}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                    title="Editar"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </div>

                            {schedule.flexibleSchedule ? (
                                <div className="space-y-3">
                                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                                        <CheckCircle size={16} />
                                        Horario Flexible
                                    </div>
                                    <p className="text-xs text-slate-500">Sin control de entrada/salida.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/50">
                                        <span className="text-slate-500">Entrada</span>
                                        <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{schedule.horaEntrada}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/50">
                                        <span className="text-slate-500">Salida</span>
                                        <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{schedule.horaSalida}</span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                        <span className="text-slate-500">Tolerancia</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{schedule.toleranciaMinutos} min</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {schedules.length === 0 && !isCreating && (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                            <p>No hay horarios configurados.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
