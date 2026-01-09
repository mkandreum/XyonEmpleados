import React, { useState, useEffect } from 'react';
import { benefitsService } from '../../services/api';
import { DepartmentBenefits } from '../../types';
import { Save, Edit2 } from 'lucide-react';

const DEPARTMENTS = ['IT', 'RRHH', 'Ventas', 'Marketing', 'Operaciones', 'Finanzas'];

export const AdminBenefits: React.FC = () => {
    const [benefits, setBenefits] = useState<DepartmentBenefits[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingDept, setEditingDept] = useState<string | null>(null);
    const [formData, setFormData] = useState<DepartmentBenefits>({
        department: '',
        vacationDays: 22,
        overtimeHoursBank: 40,
        sickLeaveDays: 24,
        paidAbsenceHours: 20
    });

    useEffect(() => {
        fetchBenefits();
    }, []);

    const fetchBenefits = async () => {
        try {
            const data = await benefitsService.getDepartmentBenefits();
            if (Array.isArray(data)) {
                setBenefits(data);
            }
        } catch (error) {
            console.error('Error fetching benefits:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (dept: string) => {
        const existing = benefits.find(b => b.department === dept);
        if (existing) {
            setFormData(existing);
        } else {
            setFormData({
                department: dept,
                vacationDays: 22,
                overtimeHoursBank: 40,
                sickLeaveDays: 24,
                paidAbsenceHours: 20
            });
        }
        setEditingDept(dept);
    };

    const handleSave = async () => {
        try {
            await benefitsService.upsertDepartmentBenefits(formData);
            fetchBenefits();
            setEditingDept(null);
            alert('Beneficios actualizados correctamente');
        } catch (error) {
            alert('Error al guardar beneficios');
        }
    };

    const getBenefitsForDept = (dept: string): DepartmentBenefits => {
        return benefits.find(b => b.department === dept) || {
            department: dept,
            vacationDays: 22,
            overtimeHoursBank: 40,
            sickLeaveDays: 24,
            paidAbsenceHours: 20
        };
    };

    if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950 transition-colors"><div className="text-slate-500 dark:text-slate-400">Cargando...</div></div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Beneficios por Departamento</h1>
                <p className="text-slate-500 dark:text-slate-400">Configura los días y horas disponibles para cada departamento</p>
            </div>

            {/* Desktop Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden hidden sm:block transition-colors">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Departamento</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Días Vacaciones</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Horas Exceso</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Horas Médicas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Horas Retribuidas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800 transition-colors">
                        {DEPARTMENTS.map((dept) => {
                            const deptBenefits = getBenefitsForDept(dept);
                            const isEditing = editingDept === dept;

                            return (
                                <tr key={dept} className={isEditing ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors'}>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{dept}</td>
                                    <td className="px-6 py-4">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={formData.vacationDays}
                                                onChange={(e) => setFormData({ ...formData, vacationDays: parseInt(e.target.value) })}
                                                className="w-20 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-2 py-1 text-sm text-slate-900 dark:text-white"
                                            />
                                        ) : (
                                            <span className="text-sm text-slate-900 dark:text-slate-300">{deptBenefits.vacationDays} días</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={formData.overtimeHoursBank}
                                                onChange={(e) => setFormData({ ...formData, overtimeHoursBank: parseInt(e.target.value) })}
                                                className="w-20 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-2 py-1 text-sm text-slate-900 dark:text-white"
                                            />
                                        ) : (
                                            <span className="text-sm text-slate-900 dark:text-slate-300">{deptBenefits.overtimeHoursBank} horas</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={formData.sickLeaveDays}
                                                onChange={(e) => setFormData({ ...formData, sickLeaveDays: parseInt(e.target.value) })}
                                                className="w-20 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-2 py-1 text-sm text-slate-900 dark:text-white"
                                            />
                                        ) : (
                                            <span className="text-sm text-slate-900 dark:text-slate-300">{deptBenefits.sickLeaveDays} horas</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={formData.paidAbsenceHours}
                                                onChange={(e) => setFormData({ ...formData, paidAbsenceHours: parseInt(e.target.value) })}
                                                className="w-20 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-2 py-1 text-sm text-slate-900 dark:text-white"
                                            />
                                        ) : (
                                            <span className="text-sm text-slate-900 dark:text-slate-300">{deptBenefits.paidAbsenceHours} horas</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isEditing ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleSave}
                                                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors"
                                                >
                                                    <Save size={14} />
                                                    Guardar
                                                </button>
                                                <button
                                                    onClick={() => setEditingDept(null)}
                                                    className="px-3 py-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleEdit(dept)}
                                                className="flex items-center gap-1 px-3 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm transition-colors"
                                            >
                                                <Edit2 size={14} />
                                                Editar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile View (Cards) */}
            <div className="sm:hidden space-y-4">
                {DEPARTMENTS.map(dept => {
                    const deptBenefits = getBenefitsForDept(dept);
                    const isEditing = editingDept === dept;

                    if (isEditing) {
                        return (
                            <div key={dept} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl shadow-sm space-y-3 transition-colors">
                                <div className="flex justify-between items-center border-b border-blue-100 dark:border-blue-800 pb-2">
                                    <h3 className="font-bold text-blue-900 dark:text-blue-400">{dept}</h3>
                                    <span className="text-xs text-blue-600 dark:text-blue-500 font-medium">Editando...</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-blue-800 dark:text-blue-300 block mb-1">Vacaciones</label>
                                        <input type="number" className="w-full text-sm p-1 rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                            value={formData.vacationDays}
                                            onChange={(e) => setFormData({ ...formData, vacationDays: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-blue-800 dark:text-blue-300 block mb-1">H. Exceso</label>
                                        <input type="number" className="w-full text-sm p-1 rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                            value={formData.overtimeHoursBank}
                                            onChange={(e) => setFormData({ ...formData, overtimeHoursBank: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-blue-800 dark:text-blue-300 block mb-1">H. Médicas</label>
                                        <input type="number" className="w-full text-sm p-1 rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                            value={formData.sickLeaveDays}
                                            onChange={(e) => setFormData({ ...formData, sickLeaveDays: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-blue-800 dark:text-blue-300 block mb-1">H. Retribuidas</label>
                                        <input type="number" className="w-full text-sm p-1 rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                            value={formData.paidAbsenceHours}
                                            onChange={(e) => setFormData({ ...formData, paidAbsenceHours: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Guardar</button>
                                    <button onClick={() => setEditingDept(null)} className="flex-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                                </div>
                            </div>
                        )
                    }

                    return (
                        <div key={dept} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                            <div className="flex justify-between items-center mb-3 border-b border-slate-50 dark:border-slate-800 pb-2">
                                <h3 className="font-bold text-slate-900 dark:text-white">{dept}</h3>
                                <button onClick={() => handleEdit(dept)} className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-lg transition-colors">
                                    <Edit2 size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                                <div>
                                    <span className="block text-xs text-slate-400 dark:text-slate-500">Vacaciones</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{deptBenefits.vacationDays} días</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-slate-400 dark:text-slate-500">H. Exceso</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{deptBenefits.overtimeHoursBank} h</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-slate-400 dark:text-slate-500">H. Médicas</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{deptBenefits.sickLeaveDays} h</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-slate-400 dark:text-slate-500">H. Retribuidas</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{deptBenefits.paidAbsenceHours} h</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 transition-colors">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-400 mb-2">ℹ️ Información</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300/80 space-y-1">
                    <li>• Los beneficios se aplican a todos los empleados del departamento</li>
                    <li>• Los valores se resetean automáticamente cada 1 de enero</li>
                    <li>• Los cambios afectan solo a nuevos empleados o al próximo reset anual</li>
                </ul>
            </div>
        </div>
    );
};
