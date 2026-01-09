import React, { useState, useEffect, useMemo } from 'react';
import { vacationService, benefitsService, uploadService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VacationRequest, VacationStatus, DepartmentBenefits, UserBenefitsBalance } from '../types';
import { Plus, Calendar, AlertCircle, Upload, FileText, Clock, Briefcase, Heart, X, Check } from 'lucide-react';
import { getAbsoluteUrl } from '../utils/urlUtils';
import { getTypeLabel, getTypeColor } from '../utils/vacationUtils';
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
        subtype: '', // New field for 'Otros Permisos'
        justificationUrl: '',
        hours: '',
        durationMode: 'days', // 'days' | 'hours'
        lessThanOneDay: false // New Checkbox state
    });

    const [animateForm, setAnimateForm] = useState(false);

    useEffect(() => {
        if (showRequestForm) {
            setTimeout(() => setAnimateForm(true), 10);
        } else {
            setAnimateForm(false);
        }
    }, [showRequestForm]);

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

    // Calculate natural days (including weekends)
    const calculateNaturalDays = (start: Date, end: Date): number => {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays + 1; // Inclusive
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

        // Validate justification for non-vacation/non-overtime types
        const isExempt = formData.type === 'VACATION' || formData.type === 'OVERTIME';
        if (!isExempt && !formData.justificationUrl) {
            showAlert('El justificante es obligatorio para este tipo de solicitud', 'warning');
            return;
        }

        if (formData.type === 'OTHER' && !formData.subtype) {
            showAlert('Por favor selecciona un motivo específico', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);

            let daysCalculated = 0;
            // Logic: Matrimonio (natural), Others (business)
            // If subtype is 'Matrimonio...', use natural days.
            if (formData.subtype && formData.subtype.includes('Matrimonio')) {
                daysCalculated = calculateNaturalDays(start, end);
            } else {
                daysCalculated = calculateBusinessDays(start, end);
            }

            // Validate available days/hours logic
            if (formData.type === 'VACATION' && daysCalculated > remainingDays) {
                showAlert(`No tienes suficientes días disponibles.\n\nDías solicitados: ${daysCalculated}\nDías disponibles: ${remainingDays}`, 'error');
                setSubmitting(false);
                return;
            }

            // Exceso Jornada validation? 
            if (formData.type === 'OVERTIME') {
                // Check logic if needed
            }

            await vacationService.create({
                startDate: formData.startDate,
                endDate: formData.endDate,
                days: daysCalculated,
                hours: formData.lessThanOneDay && formData.hours ? parseInt(formData.hours) : undefined,
                type: formData.type as any,
                subtype: formData.subtype || undefined,
                status: VacationStatus.PENDING,
                justificationUrl: formData.justificationUrl || undefined
            });

            fetchVacations();
            setShowRequestForm(false);
            setFormData({ startDate: today, endDate: today, type: 'VACATION', subtype: '', justificationUrl: '', hours: '', durationMode: 'days', lessThanOneDay: false });
            showAlert('Solicitud enviada correctamente', 'success');
        } catch (error) {
            console.error("Error creating vacation:", error);
            showAlert("Error al crear la solicitud", 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Derived states
    const requiresJustification = formData.type !== 'VACATION' && formData.type !== 'OVERTIME';
    const showSubtypeDropdown = formData.type === 'OTHER';

    // Subtypes list
    const otherSubtypes = [
        "Intervención quirúrgica familiar sin Hospitalización - 1 día",
        "Enfermedad / Reposo Médico Domiciliario",
        "Lactancia",
        "Horas Sindicales",
        "Fallecimiento Familiar 1º grado - 3 días",
        "Fallecimiento Familiar 2º grado - 2 días",
        "Fallecimiento Familiar 3º grado - 1 día",
        "Accidente o Enfermedad Grave - 5 días",
        "Matrimonio - 15 días naturales",
        "Mudanza - 1 día",
        "Matrimonio hijos/as en día laboral - 1 día",
        "Deber inexcusable de carácter público",
        "Horas Consulta Médico Cabecera / Especialista - 20 horas",
        "Horas Acom. Médico - 10 horas",
        "Ausencia Urgente Fuerza Mayor - 4 días anuales"
    ];

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
            case VacationStatus.PENDING_MANAGER: return 'bg-amber-100 text-amber-800';
            case VacationStatus.PENDING_ADMIN: return 'bg-amber-100 text-amber-800';
            case VacationStatus.REJECTED: return 'bg-red-100 text-red-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };



    const currentYear = new Date().getFullYear();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vacaciones y Ausencias</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gestiona tus días libres y consulta tu saldo.</p>
                </div>
                <button
                    onClick={() => setShowRequestForm(!showRequestForm)}
                    className="flex bg-blue-600 text-white px-4 py-2 rounded-lg items-center gap-2 hover:bg-blue-700 shadow-sm transition-colors"
                >
                    <Plus size={18} />
                    <span>{showRequestForm ? 'Cancelar' : 'Nueva Solicitud'}</span>
                </button>
            </div>

            {/* List Section - Full Width */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col transition-colors animate-slide-up delay-75">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 transition-colors">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Historial de Solicitudes</h2>
                </div>

                {showRequestForm && (
                    <div className={`p-6 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 transition-all duration-300 transform ${animateForm ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-4">Nueva Solicitud</h3>
                        <form className="space-y-4" onSubmit={handleCreate}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Solicitud</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value, subtype: '' })}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                                    >
                                        <option value="VACATION">Vacaciones</option>
                                        <option value="PERSONAL">Ausencias Retribuídas</option>
                                        <option value="SICK_LEAVE">Horas Médicas</option>
                                        <option value="OVERTIME">Horas Exceso de Jornada</option>
                                        <option value="OTHER">Otros Permisos</option>
                                    </select>
                                </div>

                                {showSubtypeDropdown && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Motivo (Específico)</label>
                                        <select
                                            value={formData.subtype}
                                            onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                                        >
                                            <option value="">Selecciona un motivo...</option>
                                            {otherSubtypes.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Date Range Picker */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selecciona las Fechas</label>
                                <DateRangePicker
                                    startDate={formData.startDate}
                                    endDate={formData.endDate}
                                    onChange={(start, end) => setFormData({ ...formData, startDate: start, endDate: end })}
                                />

                                {/* Less than one day checkbox - Only for Non-Vacation types usually? Or specifically requested for Other Permissions to measure hours */}
                                {formData.type !== 'VACATION' && (
                                    <div className="mt-4 space-y-3">
                                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.lessThanOneDay}
                                                onChange={(e) => {
                                                    const isChecked = e.target.checked;
                                                    setFormData({
                                                        ...formData,
                                                        lessThanOneDay: isChecked,
                                                        hours: isChecked ? formData.hours : '',
                                                        endDate: isChecked ? formData.startDate : formData.endDate
                                                    });
                                                }}
                                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                                            />
                                            Duración inferior a un día
                                        </label>

                                        {formData.lessThanOneDay && (
                                            <div className="pl-6 animate-fadeIn">
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Número de Horas</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="8"
                                                    value={formData.hours}
                                                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                                                    className="w-32 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                                                    placeholder="Ej: 2"
                                                />
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Si seleccionas horas, se contará como 1 día en términos de fechas, pero se restarán las horas del saldo correspondiente.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Justificante (PDF/Imagen)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                            className="block w-full text-sm text-slate-500 dark:text-slate-400
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-blue-50 file:text-blue-700
                                                dark:file:bg-blue-900/30 dark:file:text-blue-300
                                                hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                                        />
                                        {uploading && <span className="text-sm text-blue-600 dark:text-blue-400">Subiendo...</span>}
                                        {formData.justificationUrl && <span className="text-sm text-green-600 dark:text-green-400 font-medium">¡Archivo listo!</span>}
                                    </div>
                                    <input type="hidden" value={formData.justificationUrl} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-2">
                                <button type="button" onClick={() => setShowRequestForm(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                                <button
                                    type="submit"
                                    disabled={submitting || (requiresJustification && !formData.justificationUrl)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Stats Summary Section */}
                <div className="grid grid-cols-2 gap-4 p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 transition-colors animate-slide-up delay-150">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-1.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><Calendar size={16} /></span>
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Vacaciones</h3>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {remainingDays}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Días restantes de {totalDays}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-1.5 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg"><FileText size={16} /></span>
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Exceso Jornada</h3>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {deptBenefits?.overtimeHoursBank ? (deptBenefits.overtimeHoursBank - (userBenefits?.overtimeHoursUsed || 0)) : 0}h
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Restantes de {deptBenefits?.overtimeHoursBank || 0}h</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-1.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg"><AlertCircle size={16} /></span>
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Horas Médicas</h3>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {deptBenefits?.sickLeaveDays ? (deptBenefits.sickLeaveDays - (userBenefits?.sickLeaveDaysUsed || 0)) : 0}h
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Restantes de {deptBenefits?.sickLeaveDays || 0}h</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-1.5 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg"><Calendar size={16} /></span>
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Ausencias Retrib.</h3>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {deptBenefits?.paidAbsenceHours ? (deptBenefits.paidAbsenceHours - (userBenefits?.paidAbsenceHoursUsed || 0)) : 0}h
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Restantes de {deptBenefits?.paidAbsenceHours || 0}h</p>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <div className="flex-1 overflow-auto">
                        {/* Desktop View (Table) */}
                        <table className="w-full text-sm text-left hidden sm:table">
                            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 transition-colors">
                                <tr>
                                    <th className="px-6 py-3">Fechas</th>
                                    <th className="px-6 py-3">Duración</th>
                                    <th className="px-6 py-3">Tipo</th>
                                    <th className="px-6 py-3">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 transition-colors">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">Cargando...</td>
                                    </tr>
                                ) : vacations.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">No hay solicitudes registradas.</td>
                                    </tr>
                                ) : (
                                    vacations.map(vac => (
                                        <tr key={vac.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900 dark:text-white">{new Date(vac.startDate).toLocaleDateString()}</span>
                                                    <span className="text-slate-500 dark:text-slate-400 text-xs">hasta {new Date(vac.endDate).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                {vac.hours ? `${vac.hours} horas` : `${vac.days} días`}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{getTypeLabel(vac.type, vac.subtype)}</td>
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

                        {/* Mobile View (Cards) */}
                        <div className="sm:hidden space-y-3 p-4 bg-slate-50 dark:bg-slate-950/50 transition-colors">
                            {loading ? (
                                <p className="text-center text-slate-500 dark:text-slate-400">Cargando...</p>
                            ) : vacations.length === 0 ? (
                                <p className="text-center text-slate-500 dark:text-slate-400">No hay solicitudes registradas.</p>
                            ) : (
                                vacations.map(vac => (
                                    <div key={vac.id} className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-2 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white text-base">{getTypeLabel(vac.type, vac.subtype)}</span>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide mt-1">
                                                    {new Date(vac.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {new Date(vac.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(vac.status)}`}>
                                                    {vac.status === VacationStatus.APPROVED ? 'Aprobado' :
                                                        vac.status === VacationStatus.PENDING_MANAGER ? 'Pendiente' :
                                                            vac.status === VacationStatus.PENDING_ADMIN ? 'Procesando' :
                                                                vac.status === VacationStatus.PENDING ? 'Enviado' : 'Rechazado'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center mt-2 border-t border-slate-50 dark:border-slate-800 pt-2 transition-colors">
                                            <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                                {vac.hours ? `${vac.hours}h` : `${vac.days} días`}
                                            </span>
                                            <span className="text-xs text-slate-400 dark:text-slate-500">
                                                {new Date(vac.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 flex items-start gap-3 transition-colors">
                <AlertCircle className="text-amber-600 dark:text-amber-400 mt-0.5" size={20} />
                <div>
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Política de Vacaciones</h4>
                    <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">Recuerda solicitar tus vacaciones con al menos 15 días de antelación. Los días no disfrutados antes del 31 de Enero del año siguiente expirarán.</p>
                </div>
            </div>

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