import React, { useState, useEffect } from 'react';
import { scheduleService, adminService } from '../services/api';
import { DepartmentSchedule, DayScheduleOverride } from '../types';
import { Clock, Plus, Edit2, CheckCircle, Trash2, Save, X, Calendar, ChevronDown, ChevronUp, CalendarX2, Pencil, Settings2, Sun } from 'lucide-react';

const DAY_KEYS = [
    { key: 'scheduleLunes', label: 'Lunes', short: 'L' },
    { key: 'scheduleMartes', label: 'Martes', short: 'M' },
    { key: 'scheduleMiercoles', label: 'Miércoles', short: 'X' },
    { key: 'scheduleJueves', label: 'Jueves', short: 'J' },
    { key: 'scheduleViernes', label: 'Viernes', short: 'V' },
    { key: 'scheduleSabado', label: 'Sábado', short: 'S' },
    { key: 'scheduleDomingo', label: 'Domingo', short: 'D' },
] as const;

type DayKey = typeof DAY_KEYS[number]['key'];

export const ScheduleSettings: React.FC = () => {
    const [schedules, setSchedules] = useState<DepartmentSchedule[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<DepartmentSchedule>>({});
    const [isCreating, setIsCreating] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [schedulesData, settings] = await Promise.all([
                scheduleService.getAll(),
                adminService.getSettings()
            ]);
            setSchedules(schedulesData);

            if (settings.DEPARTMENTS) {
                try {
                    const parsed = JSON.parse(settings.DEPARTMENTS);
                    if (Array.isArray(parsed)) setDepartments(parsed);
                } catch { /* ignore */ }
            }
        } catch (error) {
            console.error('Error loading schedules:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadSchedules = async () => {
        try {
            const data = await scheduleService.getAll();
            setSchedules(data);
        } catch (error) {
            console.error('Error loading schedules:', error);
        }
    };

    const availableDepartments = departments.filter(
        d => !schedules.some(s => s.department === d)
    );

    const handleEdit = (schedule: DepartmentSchedule) => {
        setEditingId(schedule.id);
        setFormData({ ...schedule });
        setIsCreating(false);
    };

    const handleCreate = () => {
        setEditingId('new');
        setFormData({
            department: '',
            horaEntrada: '09:00',
            horaSalida: '18:00',
            toleranciaMinutos: 10,
            flexibleSchedule: false,
            scheduleLunes: null,
            scheduleMartes: null,
            scheduleMiercoles: null,
            scheduleJueves: null,
            scheduleViernes: null,
            scheduleSabado: null,
            scheduleDomingo: null
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
            await scheduleService.update({
                department: formData.department,
                horaEntrada: formData.horaEntrada,
                horaSalida: formData.horaSalida,
                horaEntradaTarde: formData.horaEntradaTarde,
                horaSalidaMañana: formData.horaSalidaMañana,
                toleranciaMinutos: formData.toleranciaMinutos,
                flexibleSchedule: formData.flexibleSchedule,
                scheduleLunes: formData.scheduleLunes,
                scheduleMartes: formData.scheduleMartes,
                scheduleMiercoles: formData.scheduleMiercoles,
                scheduleJueves: formData.scheduleJueves,
                scheduleViernes: formData.scheduleViernes,
                scheduleSabado: formData.scheduleSabado,
                scheduleDomingo: formData.scheduleDomingo,
            });
            await loadSchedules();
            setEditingId(null);
            setIsCreating(false);
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Error al guardar horario');
        }
    };

    const handleDelete = async (department: string) => {
        try {
            await scheduleService.delete(department);
            setDeleteConfirm(null);
            await loadSchedules();
        } catch (error) {
            console.error('Error deleting schedule:', error);
            alert('Error al eliminar horario');
        }
    };

    // Per-day schedule helpers
    const getDayOverride = (dayKey: DayKey): DayScheduleOverride | null => {
        const val = formData[dayKey];
        if (val && typeof val === 'object') return val as DayScheduleOverride;
        return null;
    };

    const setDayOverride = (dayKey: DayKey, override: DayScheduleOverride | null) => {
        setFormData({ ...formData, [dayKey]: override });
    };

    const toggleDayOverride = (dayKey: DayKey) => {
        const current = getDayOverride(dayKey);
        if (current) {
            // Remove override
            setDayOverride(dayKey, null);
        } else {
            // Create override with default values
            setDayOverride(dayKey, {
                horaEntrada: formData.horaEntrada || '09:00',
                horaSalida: formData.horaSalida || '18:00',
                horaEntradaTarde: formData.horaEntradaTarde || null,
                horaSalidaMañana: formData.horaSalidaMañana || null,
            });
        }
    };

    const toggleDayOff = (dayKey: DayKey) => {
        const current = getDayOverride(dayKey);
        if (current?.dayOff) {
            setDayOverride(dayKey, null);
        } else {
            setDayOverride(dayKey, { dayOff: true });
        }
    };

    const updateDayField = (dayKey: DayKey, field: keyof DayScheduleOverride, value: any) => {
        const current = getDayOverride(dayKey) || {};
        setDayOverride(dayKey, { ...current, [field]: value });
    };

    // Get effective schedule for a day (for display in cards)
    const getEffectiveScheduleForDay = (schedule: DepartmentSchedule, dayKey: DayKey): { entry: string; exit: string; isOverride: boolean; isDayOff: boolean; isFlexible: boolean } => {
        const override = schedule[dayKey] as DayScheduleOverride | null;
        if (override && typeof override === 'object') {
            if (override.dayOff) return { entry: '--', exit: '--', isOverride: true, isDayOff: true, isFlexible: false };
            return {
                entry: override.horaEntrada || schedule.horaEntrada,
                exit: override.horaSalida || schedule.horaSalida,
                isOverride: true,
                isDayOff: false,
                isFlexible: override.flexibleSchedule ?? schedule.flexibleSchedule ?? false
            };
        }
        return {
            entry: schedule.horaEntrada,
            exit: schedule.horaSalida,
            isOverride: false,
            isDayOff: false,
            isFlexible: schedule.flexibleSchedule ?? false
        };
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando horarios...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">Horarios por Departamento</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Configura horarios generales y personalizados por día de la semana.</p>
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
                {/* Edit/Create Form */}
                {(isCreating || editingId) && (
                    <div className="col-span-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-sm animate-slide-up">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                            {isCreating ? 'Nuevo Horario' : `Editar Horario - ${formData.department}`}
                        </h4>

                        {/* General Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Departamento
                                </label>
                                {isCreating ? (
                                    availableDepartments.length > 0 ? (
                                        <select
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                            value={formData.department}
                                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                                        >
                                            <option value="">Selecciona un departamento</option>
                                            {availableDepartments.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                                            Todos los departamentos ya tienen horario configurado.
                                        </div>
                                    )
                                ) : (
                                    <input
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-50"
                                        value={formData.department}
                                        disabled
                                    />
                                )}
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora Entrada (por defecto)</label>
                                <input
                                    type="time"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                                    value={formData.horaEntrada}
                                    onChange={e => setFormData({ ...formData, horaEntrada: e.target.value })}
                                />
                            </div>

                            <div className={formData.flexibleSchedule ? 'opacity-40 pointer-events-none' : ''}>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora Salida (por defecto)</label>
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

                        {/* Per-Day Schedule Grid */}
                        {!formData.flexibleSchedule && (
                            <div className="mt-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
                                    <h5 className="font-semibold text-slate-900 dark:text-white">Horarios por Día de la Semana</h5>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                    Personaliza el horario para cada día. Si no se personaliza, se usa el horario general definido arriba.
                                </p>

                                {/* Desktop Grid */}
                                <div className="hidden md:grid grid-cols-7 gap-2">
                                    {DAY_KEYS.map(({ key, label, short }) => {
                                        const override = getDayOverride(key as DayKey);
                                        const isDayOff = override?.dayOff === true;
                                        const isCustom = override !== null && !isDayOff;

                                        return (
                                            <div
                                                key={key}
                                                className={`rounded-xl border p-3 transition-all ${isDayOff
                                                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 opacity-60'
                                                        : isCustom
                                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                                                    }`}
                                            >
                                                <div className="text-center mb-2">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{label}</span>
                                                </div>

                                                {isDayOff ? (
                                                    <div className="text-center py-4">
                                                        <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">Libre</span>
                                                    </div>
                                                ) : isCustom ? (
                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Entrada</label>
                                                            <input
                                                                type="time"
                                                                className="w-full px-1.5 py-1 text-xs border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 rounded text-slate-900 dark:text-white"
                                                                value={override?.horaEntrada || formData.horaEntrada || '09:00'}
                                                                onChange={e => updateDayField(key as DayKey, 'horaEntrada', e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Salida</label>
                                                            <input
                                                                type="time"
                                                                className="w-full px-1.5 py-1 text-xs border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 rounded text-slate-900 dark:text-white"
                                                                value={override?.horaSalida || formData.horaSalida || '18:00'}
                                                                onChange={e => updateDayField(key as DayKey, 'horaSalida', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-3">
                                                        <div className="flex justify-center items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                            <Settings2 size={14} className="inline-block mr-1" /> General
                                                        </div>
                                                        <div className="text-sm font-mono font-medium text-slate-600 dark:text-slate-300 mt-1">
                                                            {formData.horaEntrada} - {formData.horaSalida}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex gap-1 mt-2">
                                                    <button
                                                        onClick={() => toggleDayOverride(key as DayKey)}
                                                        className={`flex-1 flex items-center justify-center gap-1 text-[10px] py-1 rounded font-medium transition-colors ${isCustom
                                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                                : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500'
                                                            }`}
                                                        title={isCustom ? 'Usar general' : 'Personalizar'}
                                                    >
                                                        {isCustom ? <Pencil size={14} /> : <Settings2 size={14} />}<span>{isCustom ? 'Editar' : 'Personalizar'}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => toggleDayOff(key as DayKey)}
                                                        className={`flex-1 flex items-center justify-center gap-1 text-[10px] py-1 rounded font-medium transition-colors ${isDayOff
                                                                ? 'bg-slate-600 dark:bg-slate-500 text-white'
                                                                : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500'
                                                            }`}
                                                        title={isDayOff ? 'Habilitar' : 'Día libre'}
                                                    >
                                                        {isDayOff ? <CheckCircle size={14} /> : <Sun size={14} />}<span>{isDayOff ? 'Libre' : 'Día libre'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Mobile List */}
                                <div className="md:hidden space-y-2">
                                    {DAY_KEYS.map(({ key, label }) => {
                                        const override = getDayOverride(key as DayKey);
                                        const isDayOff = override?.dayOff === true;
                                        const isCustom = override !== null && !isDayOff;

                                        return (
                                            <div
                                                key={key}
                                                className={`rounded-xl border p-4 transition-all ${isDayOff
                                                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 opacity-60'
                                                        : isCustom
                                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => toggleDayOverride(key as DayKey)}
                                                            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${isCustom
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                                                                }`}
                                                        >
                                                            {isCustom ? <Pencil size={14} className="inline-block mr-1" /> : <Settings2 size={14} className="inline-block mr-1" />} {isCustom ? 'Personalizado' : 'General'}
                                                        </button>
                                                        <button
                                                            onClick={() => toggleDayOff(key as DayKey)}
                                                            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${isDayOff
                                                                    ? 'bg-slate-600 text-white'
                                                                    : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                                                                }`}
                                                        >
                                                            {isDayOff ? <CheckCircle size={14} className="inline-block mr-1" /> : <Sun size={14} className="inline-block mr-1" />} {isDayOff ? 'Libre' : 'Día libre'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {isCustom && !isDayOff && (
                                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                                        <div>
                                                            <label className="text-xs text-slate-500 dark:text-slate-400">Entrada</label>
                                                            <input
                                                                type="time"
                                                                className="w-full px-2 py-1.5 text-sm border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white"
                                                                value={override?.horaEntrada || formData.horaEntrada || '09:00'}
                                                                onChange={e => updateDayField(key as DayKey, 'horaEntrada', e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-slate-500 dark:text-slate-400">Salida</label>
                                                            <input
                                                                type="time"
                                                                className="w-full px-2 py-1.5 text-sm border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white"
                                                                value={override?.horaSalida || formData.horaSalida || '18:00'}
                                                                onChange={e => updateDayField(key as DayKey, 'horaSalida', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {!isCustom && !isDayOff && (
                                                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                                        {formData.horaEntrada} - {formData.horaSalida} (horario general)
                                                    </div>
                                                )}

                                                {isDayOff && (
                                                    <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                                                        Sin horario — día libre
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={handleCancel} className="px-4 py-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                                <X size={16} />
                                Cancelar
                            </button>
                            <button onClick={handleSave} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2">
                                <Save size={16} />
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                )}

                {/* Schedule Cards */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {schedules.map(schedule => {
                        const isExpanded = expandedSchedule === schedule.id;

                        return (
                            <div key={schedule.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative">
                                {/* Card Header */}
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="font-bold text-lg text-slate-800 dark:text-white">{schedule.department}</h4>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEdit(schedule)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(schedule.department)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
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
                                        <>
                                            {/* Default Schedule */}
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/50">
                                                    <span className="text-slate-500">Horario General</span>
                                                    <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                                                        {schedule.horaEntrada} - {schedule.horaSalida}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between pt-1">
                                                    <span className="text-slate-500">Tolerancia</span>
                                                    <span className="font-medium text-slate-700 dark:text-slate-200">{schedule.toleranciaMinutos} min</span>
                                                </div>
                                            </div>

                                            {/* Per-day mini grid */}
                                            <div className="mt-4">
                                                <button
                                                    onClick={() => setExpandedSchedule(isExpanded ? null : schedule.id)}
                                                    className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar size={12} />
                                                        Horario por día
                                                    </span>
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>

                                                {/* Compact day indicators (always visible) */}
                                                <div className="flex gap-1 mt-2">
                                                    {DAY_KEYS.map(({ key, short }) => {
                                                        const eff = getEffectiveScheduleForDay(schedule, key as DayKey);
                                                        return (
                                                            <div
                                                                key={key}
                                                                className={`flex-1 text-center py-1 rounded text-[10px] font-bold ${eff.isDayOff
                                                                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                                                                        : eff.isOverride
                                                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                                            : 'bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
                                                                    }`}
                                                                title={eff.isDayOff ? 'Libre' : `${eff.entry} - ${eff.exit}${eff.isOverride ? ' (personalizado)' : ''}`}
                                                            >
                                                                {short}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Expanded per-day details */}
                                                {isExpanded && (
                                                    <div className="mt-3 space-y-1.5 animate-slide-up">
                                                        {DAY_KEYS.map(({ key, label }) => {
                                                            const eff = getEffectiveScheduleForDay(schedule, key as DayKey);
                                                            return (
                                                                <div key={key} className="flex justify-between items-center text-xs py-1">
                                                                    <span className="text-slate-600 dark:text-slate-400 font-medium">{label}</span>
                                                                    {eff.isDayOff ? (
                                                                        <span className="text-slate-400 dark:text-slate-500 italic">Libre</span>
                                                                    ) : eff.isFlexible ? (
                                                                        <span className="text-green-600 dark:text-green-400 font-medium">Flexible</span>
                                                                    ) : (
                                                                        <span className={`font-mono ${eff.isOverride ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                            {eff.entry} - {eff.exit}
                                                                            {eff.isOverride && <span className="ml-1 text-blue-400 dark:text-blue-500">✎</span>}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {schedules.length === 0 && !isCreating && (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                            <p>No hay horarios configurados.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-100 dark:border-slate-800">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Eliminar horario</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                            ¿Estás seguro de que deseas eliminar el horario de <strong>{deleteConfirm}</strong>? Los empleados de este departamento no tendrán horario asignado.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
