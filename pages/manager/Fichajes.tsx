import React, { useState } from 'react';
import { Clock, AlertCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { lateNotificationService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ConfirmModal } from '../../components/ConfirmModal';
import { FichajeAdjustmentsPanel } from '../../components/FichajeAdjustmentsPanel';
import { TeamWeekFichajes, SendWarning } from '../../components/TeamWeekFichajes';
import { StatCard } from '../../components/StatCard';
import { useTeamWeek } from '../../hooks/useTeamWeek';

interface WarningTarget {
    userId: string;
    fichajeId: string;
    fecha: string;
    userName: string;
}

export const ManagerFichajes: React.FC = () => {
    const { user } = useAuth() as any;
    const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week
    const [warningTarget, setWarningTarget] = useState<WarningTarget | null>(null);
    const [isSending, setIsSending] = useState(false);
    const { weekData, weekDays, loading, reload } = useTeamWeek(user?.department, selectedWeek);

    const handleSendWarning: SendWarning = (userId, fichajeId, fecha, userName) =>
        setWarningTarget({ userId, fichajeId, fecha, userName });

    const confirmSendWarning = async () => {
        if (!warningTarget) return;
        setIsSending(true);
        try {
            await lateNotificationService.send({
                userId: warningTarget.userId,
                fichajeId: warningTarget.fichajeId,
                fecha: warningTarget.fecha,
            });
            toast.success('Aviso enviado correctamente');
            setWarningTarget(null);
            reload();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al enviar aviso');
        } finally {
            setIsSending(false);
        }
    };

    const onTime = weekData.filter(d => d.fichajes?.every(f => !f.isLate && !f.isEarlyDeparture)).length;
    const late = weekData.filter(d => d.fichajes?.some(f => f.isLate)).length;

    return (
        <div className="space-y-6">
            <FichajeAdjustmentsPanel />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-slide-up">
                <div>
                    <h1 className="page-title">Fichajes del equipo</h1>
                    <p className="page-subtitle">Departamento: {user?.department}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setSelectedWeek(selectedWeek - 1)} className="btn-secondary">← Anterior</button>
                    <button onClick={() => setSelectedWeek(0)} disabled={selectedWeek === 0} className="btn-primary">Semana actual</button>
                    <button onClick={() => setSelectedWeek(selectedWeek + 1)} disabled={selectedWeek >= 0} className="btn-secondary">Siguiente →</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={Users} iconClass="bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" label="Empleados" value={weekData.length} delay="delay-75" />
                <StatCard icon={Clock} iconClass="bg-success-soft dark:bg-green-900/20 text-success dark:text-green-400" label="Fichajes correctos" value={onTime} delay="delay-75" />
                <StatCard icon={AlertCircle} iconClass="bg-danger-soft dark:bg-red-900/20 text-danger dark:text-red-400" label="Llegadas tarde" value={late} delay="delay-75" />
            </div>

            <TeamWeekFichajes weekData={weekData} weekDays={weekDays} loading={loading} onSendWarning={handleSendWarning} />

            <ConfirmModal
                isOpen={!!warningTarget}
                isLoading={isSending}
                onClose={() => setWarningTarget(null)}
                onConfirm={confirmSendWarning}
                title="Enviar aviso"
                message={`¿Estás seguro de que deseas enviar un aviso de llegada tarde a ${warningTarget?.userName}?`}
                confirmText="Enviar aviso"
                cancelText="Cancelar"
                type="warning"
            />
        </div>
    );
};
