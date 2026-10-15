import React, { useEffect, useState } from 'react';
import { Users, CalendarCheck } from 'lucide-react';
import { vacationService, uploadService } from '../services/api';
import { DepartmentBenefits, UserBenefitsBalance } from '../types';
import { DateRangePicker } from './DateRangePicker';
import {
    OTHER_SUBTYPES, isMedicalHoursSubtype, calculateNaturalDays, calculateBusinessDays, remainingHours,
} from '../utils/vacationUtils';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface VacationRequestFormProps {
    deptBenefits: DepartmentBenefits | null;
    userBenefits: UserBenefitsBalance | null;
    /** Vacation days still available (after approved and pending requests). */
    remainingDays: number;
    onCreated: () => void;
    onCancel: () => void;
    showAlert: (message: string, type?: AlertType) => void;
}

const todayIso = () => new Date().toISOString().split('T')[0];

const initialForm = () => ({
    startDate: todayIso(),
    endDate: todayIso(),
    type: 'VACATION',
    subtype: '',
    justificationUrl: '',
    hours: '',
    lessThanOneDay: false,
});

/** Types that require a justification file before the request can be sent. */
const needsJustification = (type: string, subtype: string) =>
    (type === 'OTHER' && !isMedicalHoursSubtype(subtype)) || type === 'PERSONAL' || type === 'MEDICAL_LEAVE';

export const VacationRequestForm: React.FC<VacationRequestFormProps> = ({
    deptBenefits, userBenefits, remainingDays, onCreated, onCancel, showAlert,
}) => {
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    const update = (patch: Partial<ReturnType<typeof initialForm>>) => setForm(prev => ({ ...prev, ...patch }));

    // Days that will be counted (same rule as the server) and colleagues already off on those dates
    const isHours = form.type === 'SICK_LEAVE';
    const rangeOk = !!form.startDate && !!form.endDate && form.endDate >= form.startDate;
    const countedDays = rangeOk && !isHours
        ? (form.subtype.includes('Matrimonio') ? calculateNaturalDays(new Date(form.startDate), new Date(form.endDate)) : calculateBusinessDays(new Date(form.startDate), new Date(form.endDate)))
        : 0;
    const [overlap, setOverlap] = useState<{ count: number; people: { name: string; approved: boolean }[] } | null>(null);
    useEffect(() => {
        if (!rangeOk) { setOverlap(null); return; }
        let cancelled = false;
        const t = setTimeout(() => {
            vacationService.overlap(form.startDate, isHours ? form.startDate : form.endDate)
                .then(r => { if (!cancelled) setOverlap(r); })
                .catch(() => { if (!cancelled) setOverlap(null); });
        }, 350);
        return () => { cancelled = true; clearTimeout(t); };
    }, [form.startDate, form.endDate, isHours, rangeOk]);

    const sickHoursAvailable = remainingHours(deptBenefits?.sickLeaveHours, userBenefits?.sickLeaveHoursUsed);
    const overtimeHoursAvailable = remainingHours(deptBenefits?.overtimeHoursBank, userBenefits?.overtimeHoursUsed);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const result = await uploadService.uploadJustification(file);
            update({ justificationUrl: result.url });
            showAlert('Justificante subido correctamente', 'success');
        } catch (error) {
            console.error('Upload error:', error);
            showAlert('Error al subir el justificante', 'error');
        } finally {
            setUploading(false);
        }
    };

    const finish = (message: string) => {
        onCreated();
        setForm(initialForm());
        onCancel();
        showAlert(message, 'success');
    };

    /** Medical hours are measured in hours (single day, zero days). */
    const submitMedicalHours = async () => {
        const hours = parseInt(form.hours);
        if (!form.hours || hours <= 0) {
            showAlert('Debes especificar las horas para Horas Médicas', 'warning');
            return;
        }
        if (hours > sickHoursAvailable) {
            showAlert(`No tienes suficientes horas médicas disponibles.\n\nHoras solicitadas: ${hours}h\nHoras disponibles: ${sickHoursAvailable}h`, 'error');
            return;
        }
        await vacationService.create({
            startDate: form.startDate,
            endDate: form.startDate,
            days: 0,
            hours,
            type: 'SICK_LEAVE',
            subtype: form.subtype || undefined,
            justificationUrl: form.justificationUrl || undefined,
        });
        finish('Solicitud de Horas Médicas enviada correctamente');
    };

    const submitDaysRequest = async () => {
        const start = new Date(form.startDate);
        const end = new Date(form.endDate);
        // "Matrimonio" leave counts calendar days; everything else counts working days.
        const days = form.subtype.includes('Matrimonio')
            ? calculateNaturalDays(start, end)
            : calculateBusinessDays(start, end);
        const partialHours = form.lessThanOneDay && form.hours ? parseInt(form.hours) : undefined;

        if (form.type === 'VACATION' && days > remainingDays) {
            showAlert(`No tienes suficientes días disponibles.\n\nDías solicitados: ${days}\nDías disponibles: ${remainingDays}`, 'error');
            return;
        }
        if (form.type === 'OVERTIME') {
            const hoursRequested = partialHours ?? days * 8;
            if (hoursRequested > overtimeHoursAvailable) {
                showAlert(`No tienes suficientes horas de exceso disponibles.\n\nHoras solicitadas: ${hoursRequested}h\nHoras disponibles: ${overtimeHoursAvailable}h`, 'error');
                return;
            }
        }
        await vacationService.create({
            startDate: form.startDate,
            endDate: form.endDate,
            days,
            hours: partialHours,
            type: form.type as any,
            subtype: form.subtype || undefined,
            justificationUrl: form.justificationUrl || undefined,
        });
        finish('Solicitud enviada correctamente');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (needsJustification(form.type, form.subtype) && !form.justificationUrl) {
            showAlert('El justificante es obligatorio para este tipo de solicitud', 'warning');
            return;
        }
        if (form.type === 'OTHER' && !form.subtype) {
            showAlert('Por favor selecciona un motivo específico', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            if (form.type === 'SICK_LEAVE') await submitMedicalHours();
            else await submitDaysRequest();
        } catch (error: any) {
            console.error('Error creating vacation:', error);
            showAlert(error?.response?.data?.error || 'Error al crear la solicitud', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-lilac/40 dark:bg-lilac/10 border-b border-thick border-ink/10 dark:border-slate-800 animate-fade-in">
            <h3 className="font-display font-black text-xl tracking-tight text-ink dark:text-white mb-4">Nueva solicitud</h3>
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="label" htmlFor="vac-type">Tipo de solicitud</label>
                        <select id="vac-type" value={form.type} onChange={(e) => update({ type: e.target.value, subtype: '' })} className="field">
                            <option value="VACATION">Vacaciones</option>
                            <option value="PERSONAL">Ausencias retribuidas</option>
                            <option value="SICK_LEAVE">Horas médicas</option>
                            <option value="MEDICAL_LEAVE">Baja médica</option>
                            <option value="OVERTIME">Horas exceso de jornada</option>
                            <option value="OTHER">Otros permisos</option>
                        </select>
                    </div>

                    {form.type === 'OTHER' && (
                        <div>
                            <label className="label" htmlFor="vac-subtype">Motivo específico</label>
                            <select id="vac-subtype" value={form.subtype} onChange={(e) => update({ subtype: e.target.value })} className="field">
                                <option value="">Selecciona un motivo...</option>
                                {OTHER_SUBTYPES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div>
                    {form.type === 'SICK_LEAVE' ? (
                        <div>
                            <label className="label mb-2" htmlFor="vac-date">Fecha</label>
                            <input
                                id="vac-date"
                                type="date"
                                value={form.startDate}
                                onChange={(e) => update({ startDate: e.target.value, endDate: e.target.value })}
                                className="field"
                            />
                            <div className="mt-4">
                                <label className="label mb-2" htmlFor="vac-hours">Número de horas</label>
                                <input
                                    id="vac-hours"
                                    type="number"
                                    min="1"
                                    max="8"
                                    value={form.hours}
                                    onChange={(e) => update({ hours: e.target.value })}
                                    className="field md:w-48"
                                    placeholder="Ej: 2"
                                    required
                                />
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                                    Horas médicas disponibles: <span className="font-semibold text-success-ink dark:text-green-400">{sickHoursAvailable}h</span>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <label className="label mb-2">Selecciona las fechas</label>
                            <DateRangePicker
                                startDate={form.startDate}
                                endDate={form.endDate}
                                onChange={(start, end) => update({ startDate: start, endDate: end })}
                            />
                        </>
                    )}

                    {form.type !== 'VACATION' && form.type !== 'SICK_LEAVE' && (
                        <div className="mt-4 space-y-3">
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.lessThanOneDay}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        update({
                                            lessThanOneDay: checked,
                                            hours: checked ? form.hours : '',
                                            endDate: checked ? form.startDate : form.endDate,
                                        });
                                    }}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                                />
                                Duración inferior a un día
                            </label>

                            {form.lessThanOneDay && (
                                <div className="pl-6 animate-fade-in">
                                    <label className="label" htmlFor="vac-partial-hours">Número de horas</label>
                                    <input
                                        id="vac-partial-hours"
                                        type="number"
                                        min="1"
                                        max="8"
                                        value={form.hours}
                                        onChange={(e) => update({ hours: e.target.value })}
                                        className="field w-32"
                                        placeholder="Ej: 2"
                                    />
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        Si seleccionas horas, se contará como 1 día en términos de fechas, pero se restarán las horas del saldo correspondiente.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Live summary: counted days, balance after, colleagues already off */}
                {rangeOk && (
                    <div className="flex flex-wrap gap-2" aria-live="polite">
                        {!isHours && (
                            <span className="chip bg-lime text-ink !text-xs">
                                <CalendarCheck size={14} aria-hidden="true" />
                                {countedDays} {countedDays === 1 ? 'día' : 'días'} {form.subtype.includes('Matrimonio') ? 'naturales' : 'laborables'}
                                {form.type === 'VACATION' && ` · te quedarán ${Math.max(0, remainingDays - countedDays)}`}
                            </span>
                        )}
                        {overlap && overlap.count > 0 && (
                            <span className="chip bg-sun text-ink !text-xs" title={overlap.people.map(p => p.name).join(', ')}>
                                <Users size={14} aria-hidden="true" />
                                {overlap.count === 1 ? `${overlap.people[0].name.split(' ')[0]} también estará fuera` : `${overlap.count} compañeros también estarán fuera`}
                            </span>
                        )}
                        {overlap && overlap.count === 0 && (
                            <span className="chip bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 !text-xs">
                                <Users size={14} aria-hidden="true" /> Nadie de tu equipo está fuera esos días
                            </span>
                        )}
                    </div>
                )}

                <div>
                    <label className="label" htmlFor="vac-file">Justificante (PDF o imagen)</label>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            id="vac-file"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="block w-full sm:w-auto text-sm text-slate-600 dark:text-slate-400
                                file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                                file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700
                                dark:file:bg-blue-900/30 dark:file:text-blue-300
                                hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                        />
                        {uploading && <span className="text-sm text-blue-700 dark:text-blue-400" role="status">Subiendo...</span>}
                        {form.justificationUrl && <span className="text-sm text-success-ink dark:text-green-400 font-medium">Archivo listo</span>}
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                    <button type="button" onClick={onCancel} className="btn-ghost">Cancelar</button>
                    <button type="submit" disabled={submitting} className="btn-primary">
                        {submitting ? 'Enviando...' : 'Enviar solicitud'}
                    </button>
                </div>
            </form>
        </div>
    );
};
