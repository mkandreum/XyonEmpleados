import React, { useState, useEffect, useCallback } from 'react';
import { vacationService, benefitsService, uploadService } from '../services/api';
import { VacationRequest, VacationStatus } from '../types';
import { Plus, X, Calendar, Upload, FileText, Clock, Briefcase, Heart } from 'lucide-react';
import { getTypeLabel, calculateNaturalDays } from '../utils/vacationUtils';
import { StatusBadge } from '../components/StatusBadge';
import { JustificationCell } from '../components/JustificationCell';
import { LoadingState, EmptyState } from '../components/PageState';
import { Modal } from '../components/Modal';
import { useModal } from '../hooks/useModal';
import { useRowJustificationUpload } from '../hooks/useJustificationUpload';
import { AnimatedNumber } from '../components/Shapes';

const todayIso = () => new Date().toISOString().split('T')[0];
const initialForm = () => ({ startDate: todayIso(), endDate: todayIso(), type: 'VACATION', justificationUrl: '' });

// Flat saturated tiles, same palette as the native app's StatPill
const TILE_TONES = {
    blue: { bg: 'bg-blue-600 text-white', sub: 'text-white/80', chip: 'bg-white/15' },
    purple: { bg: 'bg-lilac text-ink', sub: 'text-ink/75', chip: 'bg-ink/10' },
    red: { bg: 'bg-coral text-ink', sub: 'text-ink/75', chip: 'bg-ink/10' },
    amber: { bg: 'bg-sun text-ink', sub: 'text-ink/75', chip: 'bg-ink/10' },
};

interface BenefitTileProps {
    tone: keyof typeof TILE_TONES;
    icon: React.ReactNode;
    value: number;
    title: string;
    caption: string;
    delay: string;
}

const BenefitTile: React.FC<BenefitTileProps> = ({ tone, icon, value, title, caption, delay }) => (
    <div className={`${TILE_TONES[tone].bg} p-5 rounded-card border-thick border-ink dark:border-transparent animate-slide-up ${delay}`}>
        <div className="flex items-center justify-between mb-4">
            <div className={`w-11 h-11 grid place-items-center rounded-full ${TILE_TONES[tone].chip}`} aria-hidden="true">{icon}</div>
            <AnimatedNumber value={value} className="font-display font-black text-[2.25rem] leading-none tracking-tighter" />
        </div>
        <h3 className="font-extrabold mb-0.5">{title}</h3>
        <p className={`${TILE_TONES[tone].sub} text-sm`}>{caption}</p>
    </div>
);

export const AbsencesPage: React.FC = () => {
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [vacations, setVacations] = useState<VacationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [benefits, setBenefits] = useState<any>(null);
    const [formData, setFormData] = useState(initialForm);
    const { modalState, showAlert, closeModal } = useModal();

    const fetchData = useCallback(async () => {
        try {
            const [vacs, userBenefits] = await Promise.all([vacationService.getAll(), benefitsService.getUserBalance()]);
            setVacations(vacs);
            setBenefits(userBenefits);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const { rowUploading, uploadForRow } = useRowJustificationUpload(fetchData, showAlert);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const result = await uploadService.uploadJustification(file);
            setFormData(prev => ({ ...prev, justificationUrl: result.url }));
            showAlert('Justificante subido correctamente', 'success');
        } catch (error) {
            console.error('Upload error:', error);
            showAlert('Error al subir el justificante', 'error');
        } finally {
            setUploading(false);
        }
    };

    const requiresJustification = formData.type === 'PERSONAL';

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (requiresJustification && !formData.justificationUrl) {
            showAlert('El justificante es obligatorio para ausencias justificadas', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            await vacationService.create({
                startDate: formData.startDate,
                endDate: formData.endDate,
                days: calculateNaturalDays(new Date(formData.startDate), new Date(formData.endDate)),
                type: formData.type as any,
                status: VacationStatus.PENDING,
                justificationUrl: formData.justificationUrl || undefined,
            });
            await fetchData();
            setShowRequestForm(false);
            setFormData(initialForm());
            showAlert('Solicitud enviada correctamente', 'success');
        } catch (error) {
            console.error('Error creating vacation:', error);
            showAlert('Error al crear la solicitud', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const totalVacationDays = benefits?.totalBenefits?.vacationDays || 22;
    const sumDays = (status: VacationStatus) => vacations
        .filter(v => v.status === status && v.type === 'VACATION')
        .reduce((acc, curr) => acc + curr.days, 0);
    const remainingDays = totalVacationDays - sumDays(VacationStatus.APPROVED) - sumDays(VacationStatus.PENDING);

    if (loading) return <LoadingState label="Cargando..." fullPage />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
                <div>
                    <h1 className="page-title">Ausencias y permisos</h1>
                    <p className="page-subtitle">Gestiona tus días libres y consulta tus beneficios.</p>
                </div>
                <button onClick={() => setShowRequestForm(!showRequestForm)} className="btn-primary self-start sm:self-auto" aria-expanded={showRequestForm}>
                    {showRequestForm ? <X size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                    <span>{showRequestForm ? 'Cancelar' : 'Nueva solicitud'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <BenefitTile tone="blue" icon={<Calendar size={24} />} value={benefits?.vacationDaysRemaining || remainingDays} title="Días de vacaciones" caption={`De ${totalVacationDays} días anuales`} delay="delay-75" />
                <BenefitTile tone="purple" icon={<Clock size={24} />} value={benefits?.overtimeHoursRemaining || 40} title="Horas de exceso" caption="Banco de horas acumuladas" delay="delay-150" />
                <BenefitTile tone="red" icon={<Heart size={24} />} value={benefits?.sickLeaveHoursRemaining || 15} title="Horas de baja médica" caption="Horas disponibles" delay="delay-200" />
                <BenefitTile tone="amber" icon={<Briefcase size={24} />} value={benefits?.paidAbsenceHoursRemaining || 20} title="Horas retribuidas" caption="Ausencias justificadas" delay="delay-300" />
            </div>

            <div className="card overflow-hidden flex flex-col animate-slide-up delay-500">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Historial de solicitudes</h2>
                </div>

                {showRequestForm && (
                    <div className="p-4 sm:p-6 bg-blue-50/60 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 animate-fade-in">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-4">Nueva solicitud</h3>
                        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreate}>
                            <div>
                                <label className="label" htmlFor="abs-start">Fecha de inicio</label>
                                <input id="abs-start" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="field" required />
                            </div>
                            <div>
                                <label className="label" htmlFor="abs-end">Fecha de fin</label>
                                <input id="abs-end" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="field" required />
                            </div>
                            <div className="md:col-span-2">
                                <label className="label" htmlFor="abs-type">Tipo de ausencia</label>
                                <select id="abs-type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="field">
                                    <option value="VACATION">Vacaciones</option>
                                    <option value="PERSONAL">Ausencia justificada</option>
                                    <option value="SICK_LEAVE">Horas médicas</option>
                                    <option value="MEDICAL_LEAVE">Baja médica</option>
                                    <option value="OTHER">Otro (especificar)</option>
                                </select>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                    {requiresJustification ? 'Requiere justificante' : 'No requiere justificante'}
                                </p>
                            </div>

                            {requiresJustification && (
                                <div className="md:col-span-2">
                                    <span className="label mb-2">Justificante <span className="text-danger" aria-label="obligatorio">*</span></span>
                                    <div className="space-y-3">
                                        {formData.justificationUrl && (
                                            <div className="flex items-center gap-2 p-3 bg-success-soft dark:bg-green-900/20 rounded-control border border-green-200 dark:border-green-900/30">
                                                <FileText size={18} className="text-success dark:text-green-400" aria-hidden="true" />
                                                <span className="text-sm text-success-ink dark:text-green-300 flex-1">Justificante subido</span>
                                            </div>
                                        )}
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <label className="btn-primary flex-1 cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500">
                                                <Upload size={18} aria-hidden="true" />
                                                {uploading ? 'Subiendo...' : 'Subir justificante'}
                                                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="sr-only" disabled={uploading} />
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.justificationUrl}
                                                onChange={(e) => setFormData({ ...formData, justificationUrl: e.target.value })}
                                                className="field flex-1"
                                                placeholder="URL del justificante"
                                                aria-label="URL del justificante"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="md:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowRequestForm(false)} className="btn-ghost">Cancelar</button>
                                <button type="submit" disabled={submitting} className="btn-primary">
                                    {submitting ? 'Enviando...' : 'Enviar solicitud'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {vacations.length === 0 ? (
                    <EmptyState
                        icon={<Calendar size={32} />}
                        title="Aún no tienes solicitudes"
                        hint="Pulsa «Nueva solicitud» para pedir vacaciones o una ausencia."
                    />
                ) : (
                    <div className="overflow-x-auto flex-1">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    {['Tipo', 'Fechas', 'Días', 'Estado', 'Justificante'].map(h => (
                                        <th key={h} scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                                {vacations.map((vacation) => (
                                    <tr key={vacation.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{getTypeLabel(vacation.type)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                            {new Date(vacation.startDate).toLocaleDateString('es-ES')} - {new Date(vacation.endDate).toLocaleDateString('es-ES')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-300">{vacation.days} días</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={vacation.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <JustificationCell
                                                vacation={vacation}
                                                accept="image/*,.pdf"
                                                canUpload={vacation.type === 'SICK_LEAVE' || vacation.type === 'OTHER'}
                                                uploading={!!rowUploading[vacation.id]}
                                                onUpload={uploadForRow}
                                                onOpenError={() => showAlert('No se pudo abrir el justificante', 'error')}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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
