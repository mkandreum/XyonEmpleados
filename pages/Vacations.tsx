import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { vacationService, uploadService, benefitsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VacationRequest, VacationStatus, DepartmentBenefits, UserBenefitsBalance } from '../types';
import { Plus, Calendar, AlertCircle, Upload, FileText } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { Modal } from '../components/Modal';
import { DateRangePicker } from '../components/DateRangePicker';

export const VacationsPage: React.FC = () => {
    const { user } = useAuth();
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [vacations, setVacations] = useState<VacationRequest[]>([]);
    const [deptBenefits, setDeptBenefits] = useState<DepartmentBenefits | null>(null);
    const [userBenefits, setUserBenefits] = useState<UserBenefitsBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const { modalState, showAlert, closeModal } = useModal();


    // Form state
    const today = new Date().toISOString().split('T')[0];
    const [formData, setFormData] = useState({
        startDate: today,
        endDate: today,
        type: 'VACATION',
        justificationUrl: ''
    });

    const fetchVacations = async () => {
        try {
            const [vacs, balance] = await Promise.all([
                vacationService.getAll(),
                benefitsService.getUserBalance()
            ]);
            setVacations(vacs);
            setUserBenefits(balance);

            if (user?.department) {
                const dept = await benefitsService.getDepartmentBenefits(user.department);
                setDeptBenefits(dept as DepartmentBenefits);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchVacations();
        }
    }, [user]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const result = await uploadService.uploadJustification(file);
            setFormData({ ...formData, justificationUrl: result.url });
            showAlert('Justificante subido correctamente', 'success');
        } catch (error) {
            console.error('Upload error:', error);
            showAlert('Error al subir el justificante', 'error');
        } finally {
            setUploading(false);
        }
    };

    // Calculate business days (excluding weekends)
    const calculateBusinessDays = (start: Date, end: Date): number => {
        let count = 0;
        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return count;
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate justification for non-vacation types
        if ((formData.type === 'SICK_LEAVE' || formData.type === 'PERSONAL') && !formData.justificationUrl) {
            showAlert('El justificante es obligatorio para bajas médicas y ausencias justificadas', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            // Calculate business days (excluding weekends)
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const businessDays = calculateBusinessDays(start, end);

            // Validate for VACATION type: check if exceeds available days
            if (formData.type === 'VACATION' && businessDays > remainingDays) {
                showAlert(
                    `No tienes suficientes días disponibles.\n\nDías laborables solicitados: ${businessDays}\nDías disponibles: ${remainingDays}`,
                    'error'
                );
                setSubmitting(false);
                return;
            }

            await vacationService.create({
                startDate: formData.startDate,
                endDate: formData.endDate,
                days: businessDays,
                type: formData.type as any,
                status: VacationStatus.PENDING,
                justificationUrl: formData.justificationUrl || undefined
            });

            await fetchVacations(); // Refresh list
            setShowRequestForm(false);
            setFormData({ startDate: today, endDate: today, type: 'VACATION', justificationUrl: '' }); // Reset form
            showAlert('Solicitud enviada correctamente', 'success');
        } catch (error) {
            console.error("Error creating vacation:", error);
            showAlert("Error al crear la solicitud", 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Check if justification is required
    const requiresJustification = formData.type === 'SICK_LEAVE' || formData.type === 'PERSONAL';

    // Data for chart
    const totalDays = deptBenefits?.vacationDays || 22;
    const takenDays = userBenefits?.vacationDaysUsed || 0;
    const pendingDays = vacations
        .filter(v => (v.status === VacationStatus.PENDING || v.status === VacationStatus.PENDING_MANAGER || v.status === VacationStatus.PENDING_ADMIN) && v.type === 'VACATION')
        .reduce((acc, curr) => acc + curr.days, 0);
    const remainingDays = totalDays - takenDays - pendingDays;

    const data = [
        { name: 'Disfrutados', value: takenDays, color: '#94a3b8' },
        { name: 'Pendientes', value: pendingDays, color: '#f59e0b' },
        { name: 'Disponibles', value: remainingDays, color: '#2563eb' },
    ];

    const getStatusColor = (status: VacationStatus) => {
        switch (status) {
            case VacationStatus.APPROVED: return 'bg-green-100 text-green-800';
            case VacationStatus.PENDING: return 'bg-amber-100 text-amber-800';
            case VacationStatus.REJECTED: return 'bg-red-100 text-red-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'VACATION': return 'Vacaciones';
            case 'PERSONAL': return 'Asuntos Propios';
            case 'SICK_LEAVE': return 'Baja Médica';
            default: return type;
        }
    }

    const currentYear = new Date().getFullYear();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Vacaciones y Ausencias</h1>
                    <p className="text-slate-500">Gestiona tus días libres y consulta tu saldo.</p>
                </div>
                <button
                    onClick={() => setShowRequestForm(!showRequestForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-colors"
                >
                    <Plus size={18} />
                    <span>Solicitar Días</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-1 flex flex-col items-center justify-center">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 w-full">Balance Anual {currentYear}</h2>
                    <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-3xl font-bold text-blue-600">{remainingDays}</p>
                        <p className="text-sm text-slate-500">Días Disponibles</p>
                    </div>
                </div>

                {/* List Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-lg font-semibold text-slate-900">Historial de Solicitudes</h2>
                    </div>

                    {showRequestForm && (
                        <div className="p-6 bg-blue-50 border-b border-blue-100">
                            <h3 className="font-semibold text-blue-900 mb-4">Nueva Solicitud</h3>
                            <form className="space-y-4" onSubmit={handleCreate}>
                                {/* Date Range Picker */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Selecciona el Rango de Fechas</label>
                                    <DateRangePicker
                                        startDate={formData.startDate}
                                        endDate={formData.endDate}
                                        onChange={(start, end) => setFormData({ ...formData, startDate: start, endDate: end })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            <option value="VACATION">Vacaciones</option>
                                            <option value="PERSONAL">Asuntos Propios</option>
                                            <option value="SICK_LEAVE">Médico</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Justificante (PDF/Imagen)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                                className="block w-full text-sm text-slate-500
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-blue-50 file:text-blue-700
                                                hover:file:bg-blue-100"
                                            />
                                            {uploading && <span className="text-sm text-blue-600">Subiendo...</span>}
                                            {formData.justificationUrl && <span className="text-sm text-green-600 font-medium">¡Archivo listo!</span>}
                                        </div>
                                        <input type="hidden" value={formData.justificationUrl} />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-2">
                                    <button type="button" onClick={() => setShowRequestForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">Cancelar</button>
                                    <button
                                        type="submit"
                                        disabled={submitting || (requiresJustification && !formData.justificationUrl)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Stats Summary Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-b border-slate-100 bg-slate-50">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><FileText size={16} /></span>
                                <h3 className="font-semibold text-slate-700 text-sm">Exceso Jornada</h3>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">
                                {deptBenefits?.overtimeHoursBank ? (deptBenefits.overtimeHoursBank - (userBenefits?.overtimeHoursUsed || 0)) : 0}h
                            </p>
                            <p className="text-xs text-slate-400">Restantes de {deptBenefits?.overtimeHoursBank || 0}h</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="p-1.5 bg-red-100 text-red-600 rounded-lg"><AlertCircle size={16} /></span>
                                <h3 className="font-semibold text-slate-700 text-sm">Bajas Médicas</h3>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">
                                {deptBenefits?.sickLeaveDays ? (deptBenefits.sickLeaveDays - (userBenefits?.sickLeaveDaysUsed || 0)) : 0}
                            </p>
                            <p className="text-xs text-slate-400">Días restantes de {deptBenefits?.sickLeaveDays || 0}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="p-1.5 bg-green-100 text-green-600 rounded-lg"><Calendar size={16} /></span>
                                <h3 className="font-semibold text-slate-700 text-sm">Ausencias Retrib.</h3>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">
                                {deptBenefits?.paidAbsenceHours ? (deptBenefits.paidAbsenceHours - (userBenefits?.paidAbsenceHoursUsed || 0)) : 0}h
                            </p>
                            <p className="text-xs text-slate-400">Restantes de {deptBenefits?.paidAbsenceHours || 0}h</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3">Fechas</th>
                                    <th className="px-6 py-3">Duración</th>
                                    <th className="px-6 py-3">Tipo</th>
                                    <th className="px-6 py-3">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-slate-500">Cargando...</td>
                                    </tr>
                                ) : vacations.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-slate-500">No hay solicitudes registradas.</td>
                                    </tr>
                                ) : (
                                    vacations.map(vac => (
                                        <tr key={vac.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900">{new Date(vac.startDate).toLocaleDateString()}</span>
                                                    <span className="text-slate-500 text-xs">hasta {new Date(vac.endDate).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{vac.days} días</td>
                                            <td className="px-6 py-4 text-slate-600">{getTypeLabel(vac.type)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vac.status)}`}>
                                                    {vac.status === VacationStatus.APPROVED ? 'Aprobado' :
                                                        vac.status === VacationStatus.PENDING_MANAGER ? 'Pendiente Manager' :
                                                            vac.status === VacationStatus.PENDING_ADMIN ? 'Pendiente Admin' :
                                                                vac.status === VacationStatus.PENDING ? 'Pendiente' : 'Rechazado'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-amber-600 mt-0.5" size={20} />
                <div>
                    <h4 className="font-semibold text-amber-800 text-sm">Política de Vacaciones</h4>
                    <p className="text-amber-700 text-sm mt-1">Recuerda solicitar tus vacaciones con al menos 15 días de antelación. Los días no disfrutados antes del 31 de Enero del año siguiente expirarán.</p>
                </div>
            </div>

            {/* Custom Modal */}
            <Modal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                title={modalState.title}
                message={modalState.message}
                type={modalState.type}
                onConfirm={modalState.onConfirm}
            />
        </div>
    );
};