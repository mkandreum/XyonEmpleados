import React, { useEffect, useState } from 'react';
import { VacationRequest, VacationStatus } from '../../types';
import { CheckCircle, XCircle, Calendar, Clock, User as UserIcon } from 'lucide-react';

export const TeamRequests: React.FC = () => {
    const [requests, setRequests] = useState<VacationRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTeamRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/manager/team-vacations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch team requests');
            const data = await response.json();
            setRequests(data);
        } catch (error) {
            console.error('Error fetching team requests:', error);
            alert('Error al cargar las solicitudes del equipo');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamRequests();
    }, []);

    const handleApprove = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/manager/vacations/${id}/approve`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to approve');
            alert('Solicitud aprobada y enviada a Admin');
            fetchTeamRequests(); // Reload
        } catch (error) {
            console.error('Error approving request:', error);
            alert('Error al aprobar la solicitud');
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm('¿Estás seguro de rechazar esta solicitud?')) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/manager/vacations/${id}/reject`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to reject');
            alert('Solicitud rechazada');
            fetchTeamRequests(); // Reload
        } catch (error) {
            console.error('Error rejecting request:', error);
            alert('Error al rechazar la solicitud');
        }
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
        return <div className="p-8 text-center text-slate-500">Cargando solicitudes...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Gestión de Equipo</h1>
                <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
                    {requests.length} Solicitud{requests.length !== 1 ? 'es' : ''} Pendiente{requests.length !== 1 ? 's' : ''}
                </div>
            </div>

            {requests.length === 0 ? (
                <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-100 text-center">
                    <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 text-lg">No hay solicitudes pendientes de tu equipo</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {requests.map((request) => (
                        <div key={request.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                        <UserIcon className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">{request.user?.name || 'Usuario'}</h3>
                                        <p className="text-sm text-slate-500">{request.user?.position || ''}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                    {getStatusText(request.status)}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Calendar className="h-4 w-4 text-blue-500" />
                                    <span>Desde: {new Date(request.startDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Calendar className="h-4 w-4 text-blue-500" />
                                    <span>Hasta: {new Date(request.endDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Clock className="h-4 w-4 text-blue-500" />
                                    <span>{request.days} día{request.days !== 1 ? 's' : ''}</span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                                    Tipo: {request.type === 'VACATION' ? 'Vacaciones' : request.type === 'SICK_LEAVE' ? 'Baja Médica' : 'Personal'}
                                </span>
                            </div>

                            {request.status === VacationStatus.PENDING_MANAGER && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleApprove(request.id)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        <CheckCircle className="h-5 w-5" />
                                        Aprobar
                                    </button>
                                    <button
                                        onClick={() => handleReject(request.id)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
    );
};
