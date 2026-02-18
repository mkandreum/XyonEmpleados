import React, { useEffect, useState } from 'react';
import { VacationRequest, VacationStatus } from '../../types';
import { managerService } from '../../services/api';
import { CheckCircle, XCircle, Calendar, Clock, User as UserIcon, FileText } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../../components/Modal';
import { getTypeLabel, getTypeColor } from '../../utils/vacationUtils';
import { getAbsoluteUrl } from '../../utils/urlUtils';
import { openProtectedFile } from '../../utils/fileUtils';
import { VacationGanttChart } from '../../components/VacationGanttChart';
import toast from 'react-hot-toast';

export const TeamRequests: React.FC = () => {
    const [requests, setRequests] = useState<VacationRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'requests' | 'calendar'>('requests');
    const { modalState, showAlert, showConfirm, closeModal } = useModal();

    const fetchTeamRequests = async () => {
        try {
            const data = await managerService.getTeamVacations();
            setRequests(data);
        } catch (error) {
            console.error('Error fetching team requests:', error);
            toast.error('Error al cargar las solicitudes del equipo');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamRequests();
    }, []);

    const handleApprove = async (id: string) => {
        try {
            await managerService.approveVacation(id);
            toast.success('✅ Solicitud aprobada y enviada a Admin');
            fetchTeamRequests(); // Reload
        } catch (error) {
            console.error('Error approving request:', error);
            toast.error('❌ Error al aprobar la solicitud');
        }
    };

    const handleReject = async (id: string) => {
        showConfirm(
            '¿Estás seguro de rechazar esta solicitud?',
            async () => {
                try {
                    await managerService.rejectVacation(id);
                    toast.success('Solicitud rechazada');
                    fetchTeamRequests(); // Reload
                } catch (error) {
                    console.error('Error rejecting request:', error);
                    toast.error('Error al rechazar la solicitud');
                }
            }
        );
    };

    const getStatusColor = (status: VacationStatus) => {
        switch (status) {
            case VacationStatus.PENDING_MANAGER: return 'bg-yellow-100 text-yellow-700';
            case VacationStatus.APPROVED: return 'bg-green-100 text-green-700';
            case VacationStatus.REJECTED: return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusText = (status: VacationStatus) => {
        switch (status) {
            case VacationStatus.PENDING_MANAGER: return 'Pendiente de Aprobación';
            case VacationStatus.APPROVED: return 'Aprobada';
            case VacationStatus.REJECTED: return 'Rechazada';
            default: return status;
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500 dark:text-slate-400 transition-colors">Cargando solicitudes...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center animate-slide-up">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white transition-colors">Gestión de Equipo</h1>
                <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg font-medium transition-colors">
                    {requests.length} Solicitud{requests.length !== 1 ? 'es' : ''} Pendiente{requests.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-4 py-2 font-medium transition-all flex items-center gap-2 ${activeTab === 'requests'
                        ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <FileText size={18} />
                    Solicitudes
                </button>
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`px-4 py-2 font-medium transition-all flex items-center gap-2 ${activeTab === 'calendar'
                        ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <Calendar size={18} />
                    Calendario
                </button>
            </div>

            {/* Content */}
            {activeTab === 'requests' ? (
                <div>
                    {requests.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 p-12 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 text-center transition-colors animate-slide-up delay-75">
                            <Calendar className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-600 dark:text-slate-400 text-lg">No hay solicitudes pendientes de tu equipo</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-slide-up delay-75">
                            {/* Group requests by User */}
                            {Object.values(requests.reduce((acc, req) => {
                                const userId = req.user?.id || 'unknown';
                                if (!acc[userId]) {
                                    acc[userId] = { user: req.user, requests: [] };
                                }
                                acc[userId].requests.push(req);
                                return acc;
                            }, {} as Record<string, { user: any, requests: VacationRequest[] }>)).map((group: any) => (
                                <div key={group.user.name} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                                {group.user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{group.user.name}</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{group.user.department}</p>
                                            </div>
                                        </div>
                                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold px-3 py-1 rounded-full">
                                            {group.requests.length} solicitud{group.requests.length !== 1 ? 'es' : ''}
                                        </span>
                                    </div>

                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {group.requests.map((request: VacationRequest) => (
                                            <div key={request.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                                    <div className="space-y-3 flex-1">
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getTypeColor(request.type)}`}>
                                                                {getTypeLabel(request.type, request.subtype)}
                                                            </span>
                                                            {request.justificationUrl && (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                                    Justificante
                                                                </span>
                                                            )}
                                                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                Solicitado el {new Date(request.id ? parseInt(request.id.substring(0, 8), 16) * 1000 : Date.now()).toLocaleDateString()}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                                                                <Calendar className="h-4 w-4 text-blue-500" />
                                                                <span className="font-medium text-sm">
                                                                    {new Date(request.startDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                                    {' - '}
                                                                    {new Date(request.endDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                                                                <Clock className="h-4 w-4 text-amber-500" />
                                                                <span className="font-medium text-sm">
                                                                    {request.days ? `${request.days} días` : `${request.hours} horas`}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {request.justificationUrl && (
                                                            <a
                                                                href={getAbsoluteUrl(request.justificationUrl)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={async (e) => {
                                                                    e.preventDefault();
                                                                    try {
                                                                        await openProtectedFile(request.justificationUrl || '');
                                                                    } catch (error) {
                                                                        console.error('Open file error:', error);
                                                                        toast.error('No se pudo abrir el justificante');
                                                                    }
                                                                }}
                                                                className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium mt-1"
                                                            >
                                                                <FileText size={16} />
                                                                Ver documento justificativo
                                                            </a>
                                                        )}
                                                    </div>

                                                    {request.status === VacationStatus.PENDING_MANAGER && (
                                                        <div className="flex items-center gap-3 self-start md:self-center w-full md:w-auto mt-2 md:mt-0">
                                                            <button
                                                                onClick={() => handleApprove(request.id)}
                                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
                                                            >
                                                                <CheckCircle className="h-5 w-5" />
                                                                Aprobar
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(request.id)}
                                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
                                                            >
                                                                <XCircle className="h-5 w-5" />
                                                                Rechazar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <VacationGanttChart />
            )}

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
