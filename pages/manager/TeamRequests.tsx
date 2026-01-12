import React, { useEffect, useState } from 'react';
import { VacationRequest, VacationStatus } from '../../types';
import { managerService } from '../../services/api';
import { CheckCircle, XCircle, Calendar, Clock, User as UserIcon, FileText } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../../components/Modal';
import { getTypeLabel, getTypeColor } from '../../utils/vacationUtils';
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
                        <div className="grid gap-4 animate-slide-up delay-75">
                            {requests.map((request) => (
                                <div key={request.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center transition-colors">
                                                <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white transition-colors">{request.user?.name || 'Usuario'}</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">{(request.user as any)?.position || ''}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${getStatusColor(request.status)}`}>
                                            {getStatusText(request.status)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 transition-colors">
                                            <Calendar className="h-4 w-4 text-blue-500" />
                                            <span>Desde: {new Date(request.startDate).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 transition-colors">
                                            <Calendar className="h-4 w-4 text-blue-500" />
                                            <span>Hasta: {new Date(request.endDate).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 transition-colors">
                                            <Clock className="h-4 w-4 text-blue-500" />
                                            <span>{request.days} día{request.days !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>

                                    <div className="mb-4 flex justify-between items-center">
                                        <span className={`inline-block px-2 py-1 text-xs rounded transition-colors ${getTypeColor(request.type)}`}>
                                            {getTypeLabel(request.type, request.subtype)}
                                        </span>
                                        {request.justificationUrl && (
                                            <a
                                                href={request.justificationUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 hover:underline transition-colors"
                                            >
                                                <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center rounded border border-blue-100 dark:border-blue-800 transition-colors">
                                                    Ver Documento
                                                </div>
                                            </a>
                                        )}
                                    </div>

                                    {request.status === VacationStatus.PENDING_MANAGER && (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleApprove(request.id)}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                            >
                                                <CheckCircle className="h-5 w-5" />
                                                Aprobar
                                            </button>
                                            <button
                                                onClick={() => handleReject(request.id)}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                            >
                                                <XCircle className="h-5 w-5" />
                                                Rechazar
                                            </button>
                                        </div>
                                    )}
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
