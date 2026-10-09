import React, { useState, useEffect, useCallback } from 'react';
import { vacationService, benefitsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VacationRequest, VacationStatus, DepartmentBenefits, UserBenefitsBalance } from '../types';
import { Plus, Calendar, AlertCircle, FileText, X } from 'lucide-react';
import { getTypeLabel, isMedicalHoursSubtype, remainingHours } from '../utils/vacationUtils';
import { useModal } from '../hooks/useModal';
import { useRowJustificationUpload } from '../hooks/useJustificationUpload';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { JustificationCell } from '../components/JustificationCell';
import { VacationRequestForm } from '../components/VacationRequestForm';
import { LoadingState, EmptyState } from '../components/PageState';

const PENDING_STATUSES: string[] = [VacationStatus.PENDING, VacationStatus.PENDING_MANAGER, VacationStatus.PENDING_ADMIN];

interface BalanceCardProps {
    icon: React.ReactNode;
    iconClass: string;
    title: string;
    value: string | number;
    caption: string;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ icon, iconClass, title, value, caption }) => (
    <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
            <span className={`p-1.5 rounded-control ${iconClass}`} aria-hidden="true">{icon}</span>
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{title}</h3>
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{caption}</p>
    </div>
);

export const VacationsPage: React.FC = () => {
    const { user } = useAuth();
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [vacations, setVacations] = useState<VacationRequest[]>([]);
    const [deptBenefits, setDeptBenefits] = useState<DepartmentBenefits | null>(null);
    const [userBenefits, setUserBenefits] = useState<UserBenefitsBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const { modalState, showAlert, closeModal } = useModal();

    const fetchVacations = useCallback(async () => {
        try {
            const [vacs, balance] = await Promise.all([vacationService.getAll(), benefitsService.getUserBalance()]);
            setVacations(vacs);
            setUserBenefits(balance);
            if (user?.department) {
                setDeptBenefits((await benefitsService.getDepartmentBenefits(user.department)) as DepartmentBenefits);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.department]);

    useEffect(() => {
        if (user) fetchVacations();
    }, [user, fetchVacations]);

    const { rowUploading, uploadForRow } = useRowJustificationUpload(fetchVacations, showAlert);

    const totalDays = deptBenefits?.vacationDays || 22;
    const takenDays = userBenefits?.vacationDaysUsed || 0;
    const pendingDays = vacations
        .filter(v => PENDING_STATUSES.includes(v.status) && v.type === 'VACATION')
        .reduce((acc, curr) => acc + curr.days, 0);
    const remainingDays = totalDays - takenDays - pendingDays;

    const canUploadLater = (v: VacationRequest) =>
        v.type === 'SICK_LEAVE' || (v.type === 'OTHER' && isMedicalHoursSubtype(v.subtype));

    const renderJustification = (vac: VacationRequest, variant: 'compact' | 'full') => (
        <JustificationCell
            vacation={vac}
            variant={variant}
            canUpload={canUploadLater(vac)}
            uploading={!!rowUploading[vac.id]}
            onUpload={uploadForRow}
            onOpenError={() => showAlert('No se pudo abrir el justificante', 'error')}
        />
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
                <div>
                    <h1 className="page-title">Vacaciones y ausencias</h1>
                    <p className="page-subtitle">Gestiona tus días libres y consulta tu saldo.</p>
                </div>
                <button onClick={() => setShowRequestForm(!showRequestForm)} className="btn-primary self-start sm:self-auto" aria-expanded={showRequestForm}>
                    {showRequestForm ? <X size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                    <span>{showRequestForm ? 'Cancelar' : 'Nueva solicitud'}</span>
                </button>
            </div>

            <div className="card overflow-hidden flex flex-col animate-slide-up delay-75">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Historial de solicitudes</h2>
                </div>

                {showRequestForm && (
                    <VacationRequestForm
                        deptBenefits={deptBenefits}
                        userBenefits={userBenefits}
                        remainingDays={remainingDays}
                        onCreated={fetchVacations}
                        onCancel={() => setShowRequestForm(false)}
                        showAlert={showAlert}
                    />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                    <BalanceCard
                        icon={<Calendar size={16} />}
                        iconClass="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                        title="Vacaciones"
                        value={remainingDays}
                        caption={`Días restantes de ${totalDays}`}
                    />
                    <BalanceCard
                        icon={<FileText size={16} />}
                        iconClass="bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
                        title="Exceso de jornada"
                        value={`${remainingHours(deptBenefits?.overtimeHoursBank, userBenefits?.overtimeHoursUsed)}h`}
                        caption={`Restantes de ${deptBenefits?.overtimeHoursBank || 0}h`}
                    />
                    <BalanceCard
                        icon={<AlertCircle size={16} />}
                        iconClass="bg-danger-soft dark:bg-red-900/20 text-danger-ink dark:text-red-400"
                        title="Horas médicas"
                        value={`${remainingHours(deptBenefits?.sickLeaveHours, userBenefits?.sickLeaveHoursUsed)}h`}
                        caption={`Restantes de ${deptBenefits?.sickLeaveHours || 0}h`}
                    />
                    <BalanceCard
                        icon={<Calendar size={16} />}
                        iconClass="bg-success-soft dark:bg-green-900/20 text-success-ink dark:text-green-400"
                        title="Ausencias retribuidas"
                        value={`${remainingHours(deptBenefits?.paidAbsenceHours, userBenefits?.paidAbsenceHoursUsed)}h`}
                        caption={`Restantes de ${deptBenefits?.paidAbsenceHours || 0}h`}
                    />
                </div>

                {loading ? (
                    <LoadingState />
                ) : vacations.length === 0 ? (
                    <EmptyState
                        icon={<Calendar size={32} />}
                        title="Aún no tienes solicitudes"
                        hint="Pulsa «Nueva solicitud» para pedir vacaciones o una ausencia."
                    />
                ) : (
                    <>
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 font-semibold">Fechas</th>
                                        <th scope="col" className="px-6 py-3 font-semibold">Duración</th>
                                        <th scope="col" className="px-6 py-3 font-semibold">Tipo</th>
                                        <th scope="col" className="px-6 py-3 font-semibold">Estado</th>
                                        <th scope="col" className="px-6 py-3 font-semibold">Justificante</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                    {vacations.map(vac => (
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
                                            <td className="px-6 py-4"><StatusBadge status={vac.status} /></td>
                                            <td className="px-6 py-4">{renderJustification(vac, 'compact')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <ul className="sm:hidden space-y-3 p-4 bg-slate-50 dark:bg-slate-950/50">
                            {vacations.map(vac => (
                                <li key={vac.id} className="card p-4 flex flex-col gap-2">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-slate-900 dark:text-white text-base break-words">{getTypeLabel(vac.type, vac.subtype)}</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                                                {new Date(vac.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {new Date(vac.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <StatusBadge status={vac.status} className="shrink-0" />
                                    </div>

                                    <div className="flex justify-between items-center mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                            {vac.hours ? `${vac.hours}h` : `${vac.days} días`}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {new Date(vac.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">{renderJustification(vac, 'full')}</div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            <div className="bg-warning-soft dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-card p-4 flex items-start gap-3">
                <AlertCircle className="text-warning dark:text-amber-400 mt-0.5 shrink-0" size={20} aria-hidden="true" />
                <div>
                    <h4 className="font-semibold text-warning-ink dark:text-amber-200 text-sm">Política de vacaciones</h4>
                    <p className="text-warning-ink dark:text-amber-300 text-sm mt-1">Solicita tus vacaciones con al menos 15 días de antelación. Los días no disfrutados antes del 31 de enero del año siguiente expirarán.</p>
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
