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

    if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-slate-500">Cargando...</div></div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Beneficios por Departamento</h1>
                <p className="text-slate-500">Configura los días y horas disponibles para cada departamento</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Departamento</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Días Vacaciones</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Horas Exceso</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Horas Médicas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Horas Retribuidas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {DEPARTMENTS.map((dept) => {
                            const deptBenefits = getBenefitsForDept(dept);
                            const isEditing = editingDept === dept;

                            return (
                                <tr key={dept} className={isEditing ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{dept}</td>
                                    <td className="px-6 py-4">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={formData.vacationDays}
                                                onChange={(e) => setFormData({ ...formData, vacationDays: parseInt(e.target.value) })}
                                                className="w-20 border border-slate-300 rounded px-2 py-1 text-sm"
                                            />
                                        ) : (
                                            <span className="text-sm text-slate-900">{deptBenefits.vacationDays} días</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={formData.overtimeHoursBank}
                                                onChange={(e) => setFormData({ ...formData, overtimeHoursBank: parseInt(e.target.value) })}
                                                className="w-20 border border-slate-300 rounded px-2 py-1 text-sm"
                                            />
                                        ) : (
                                            <span className="text-sm text-slate-900">{deptBenefits.overtimeHoursBank} horas</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={formData.sickLeaveDays}
                                                onChange={(e) => setFormData({ ...formData, sickLeaveDays: parseInt(e.target.value) })}
                                                className="w-20 border border-slate-300 rounded px-2 py-1 text-sm"
                                            />
                                        ) : (
                                            <span className="text-sm text-slate-900">{deptBenefits.sickLeaveDays} horas</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={formData.paidAbsenceHours}
                                                onChange={(e) => setFormData({ ...formData, paidAbsenceHours: parseInt(e.target.value) })}
                                                className="w-20 border border-slate-300 rounded px-2 py-1 text-sm"
                                            />
                                        ) : (
                                            <span className="text-sm text-slate-900">{deptBenefits.paidAbsenceHours} horas</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isEditing ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleSave}
                                                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                                >
                                                    <Save size={14} />
                                                    Guardar
                                                </button>
                                                <button
                                                    onClick={() => setEditingDept(null)}
                                                    className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleEdit(dept)}
                                                className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-sm"
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

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Información</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Los beneficios se aplican a todos los empleados del departamento</li>
                    <li>• Los valores se resetean automáticamente cada 1 de enero</li>
                    <li>• Los cambios afectan solo a nuevos empleados o al próximo reset anual</li>
                </ul>
            </div>
        </div>
    );
};
