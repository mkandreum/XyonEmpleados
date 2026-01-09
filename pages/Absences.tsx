import React, { useState, useEffect } from 'react';
import { vacationService, benefitsService, uploadService } from '../services/api';
import { VacationRequest, VacationStatus } from '../types';
import { Plus, Calendar, AlertCircle, Upload, FileText, Clock, Briefcase, Heart } from 'lucide-react';

export const AbsencesPage: React.FC = () => {
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [vacations, setVacations] = useState<VacationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [benefits, setBenefits] = useState<any>(null);

    // Form state
    const today = new Date().toISOString().split('T')[0];
    const [formData, setFormData] = useState({
        startDate: today,
        endDate: today,
        type: 'VACATION',
        justificationUrl: ''
    });

    const fetchData = async () => {
        try {
            const [vacs, userBenefits] = await Promise.all([
                vacationService.getAll(),
                benefitsService.getUserBalance()
            ]);
            setVacations(vacs);
            setBenefits(userBenefits);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const result = await uploadService.uploadJustification(file);
            setFormData({ ...formData, justificationUrl: result.url });
            alert('Justificante subido correctamente');
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error al subir el justificante');
        } finally {
            setUploading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate justification for non-vacation types
        if ((formData.type === 'SICK_LEAVE' || formData.type === 'PERSONAL') && !formData.justificationUrl) {
            alert('El justificante es obligatorio para bajas médicas y ausencias justificadas');
            return;
        }

        setSubmitting(true);
        try {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            await vacationService.create({
                startDate: formData.startDate,
                endDate: formData.endDate,
                days: diffDays,
                type: formData.type as any,
                status: VacationStatus.PENDING,
                justificationUrl: formData.justificationUrl || undefined
            });

            await fetchData();
            setShowRequestForm(false);
            setFormData({ startDate: today, endDate: today, type: 'VACATION', justificationUrl: '' });
            alert('Solicitud enviada correctamente');
        } catch (error) {
            console.error("Error creating vacation:", error);
            alert("Error al crear la solicitud");
        } finally {
            setSubmitting(false);
        }
    };

    const requiresJustification = formData.type === 'SICK_LEAVE' || formData.type === 'PERSONAL';

    // Vacation data for chart
    const totalVacationDays = benefits?.totalBenefits?.vacationDays || 22;
    const takenDays = vacations
        .filter(v => v.status === VacationStatus.APPROVED && v.type === 'VACATION')
        .reduce((acc, curr) => acc + curr.days, 0);
    const pendingDays = vacations
        .filter(v => v.status === VacationStatus.PENDING && v.type === 'VACATION')
        .reduce((acc, curr) => acc + curr.days, 0);
    const remainingDays = totalVacationDays - takenDays - pendingDays;



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
            case 'PERSONAL': return 'Ausencia Justificada';
            case 'SICK_LEAVE': return 'Baja Médica';
            default: return type;
        }
    };

    const currentYear = new Date().getFullYear();

    if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-slate-500">Cargando...</div></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Ausencias y Permisos</h1>
                    <p className="text-slate-500">Gestiona tus días libres y consulta tus beneficios.</p>
                </div>
                <button
                    onClick={() => setShowRequestForm(!showRequestForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-colors"
                >
                    <Plus size={18} />
                    <span>Nueva Solicitud</span>
                </button>
            </div>

            {/* Benefits Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Vacations */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <Calendar size={24} />
                        </div>
                        <span className="text-3xl font-bold">{benefits?.vacationDaysRemaining || remainingDays}</span>
                    </div>
                    <h3 className="font-semibold mb-1">Días de Vacaciones</h3>
                    <p className="text-blue-100 text-sm">De {totalVacationDays} días anuales</p>
                </div>

                {/* Overtime Hours */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <Clock size={24} />
                        </div>
                        <span className="text-3xl font-bold">{benefits?.overtimeHoursRemaining || 40}</span>
                    </div>
                    <h3 className="font-semibold mb-1">Horas de Exceso</h3>
                    <p className="text-purple-100 text-sm">Banco de horas acumuladas</p>
                </div>

                {/* Sick Leave */}
                <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <Heart size={24} />
                        </div>
                        <span className="text-3xl font-bold">{benefits?.sickLeaveDaysRemaining || 15}</span>
                    </div>
                    <h3 className="font-semibold mb-1">Días Baja Médica</h3>
                    <p className="text-red-100 text-sm">Días retribuidos disponibles</p>
                </div>

                {/* Paid Absence */}
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <Briefcase size={24} />
                        </div>
                        <span className="text-3xl font-bold">{benefits?.paidAbsenceHoursRemaining || 20}</span>
                    </div>
                    <h3 className="font-semibold mb-1">Horas Retribuidas</h3>
                    <p className="text-amber-100 text-sm">Ausencias justificadas</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Request History */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-lg font-semibold text-slate-900">Historial de Solicitudes</h2>
                    </div>

                    {showRequestForm && (
                        <div className="p-6 bg-blue-50 border-b border-blue-100">
                            <h3 className="font-semibold text-blue-900 mb-4">Nueva Solicitud</h3>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreate}>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Ausencia</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="VACATION">Vacaciones</option>
                                        <option value="PERSONAL">Ausencia Justificada</option>
                                        <option value="SICK_LEAVE">Baja Médica</option>
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {requiresJustification ? '⚠️ Requiere justificante' : 'No requiere justificante'}
                                    </p>
                                </div>

                                {requiresJustification && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Justificante <span className="text-red-500">*</span>
                                        </label>
                                        <div className="space-y-3">
                                            {formData.justificationUrl && (
                                                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                                                    <FileText size={18} className="text-green-600" />
                                                    <span className="text-sm text-green-700 flex-1">Justificante subido</span>
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <label className="flex-1 cursor-pointer">
                                                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                                        <Upload size={18} />
                                                        {uploading ? 'Subiendo...' : 'Subir Justificante'}
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*,.pdf"
                                                        onChange={handleFileUpload}
                                                        className="hidden"
                                                        disabled={uploading}
                                                    />
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.justificationUrl}
                                                    onChange={(e) => setFormData({ ...formData, justificationUrl: e.target.value })}
                                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="O pega URL del justificante"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="md:col-span-2 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowRequestForm(false)}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="overflow-x-auto flex-1">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fechas</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Días</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {vacations.length > 0 ? (
                                    vacations.map((vacation) => (
                                        <tr key={vacation.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                {getTypeLabel(vacation.type)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {new Date(vacation.startDate).toLocaleDateString('es-ES')} - {new Date(vacation.endDate).toLocaleDateString('es-ES')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                {vacation.days} días
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(vacation.status)}`}>
                                                    {vacation.status === VacationStatus.APPROVED && 'Aprobado'}
                                                    {vacation.status === VacationStatus.PENDING && 'Pendiente'}
                                                    {vacation.status === VacationStatus.REJECTED && 'Rechazado'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                            No tienes solicitudes registradas
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
