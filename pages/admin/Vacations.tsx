import React, { useEffect, useState, useMemo } from 'react';
import { adminService } from '../../services/api';
import { Check, X, FileText, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { getTypeLabel, getTypeColor } from '../../utils/vacationUtils';

interface VacationRequest {
    id: string;
    userId: string;
    user: {
        name: string;
        email: string;
        department: string;
    };
    type: string;
    startDate: string;
    endDate: string;
    hours?: number;
    days?: number;
    justificationUrl?: string;
    status: string;
    createdAt: string;
}

interface UserGroup {
    userId: string;
    userName: string;
    department: string;
    email: string;
    approved: number;
    rejected: number;
    requests: VacationRequest[];
    isExpanded: boolean;
}

export const AdminVacations: React.FC = () => {
    const [vacations, setVacations] = useState<VacationRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

    const fetchVacations = async () => {
        try {
            const data = await adminService.getAllVacations();
            setVacations(data);
        } catch (error) {
            console.error("Error fetching vacations:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVacations();
    }, []);

    const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            await adminService.updateVacationStatus(id, status);
            fetchVacations();
        } catch (error) {
            alert('Error updating status');
        }
    };

    // Helper functions
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PENDING': return 'Pendiente';
            case 'PENDING_MANAGER': return 'Pendiente Manager';
            case 'PENDING_ADMIN': return 'Pendiente Admin';
            case 'APPROVED': return 'Aprobada';
            case 'REJECTED': return 'Rechazada';
            default: return status;
        }
    };



    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Split vacations into pending and historical
    const { pendingRequests, historicalRequests } = useMemo(() => {
        const filtered = selectedDepartment === 'all'
            ? vacations
            : vacations.filter(v => v.user.department === selectedDepartment);

        const pending = filtered.filter(v =>
            v.status === 'PENDING' ||
            v.status === 'PENDING_MANAGER' ||
            v.status === 'PENDING_ADMIN'
        ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        const historical = filtered.filter(v =>
            v.status === 'APPROVED' ||
            v.status === 'REJECTED'
        );

        return { pendingRequests: pending, historicalRequests: historical };
    }, [vacations, selectedDepartment]);

    // Group historical requests by user
    const groupedHistorical = useMemo(() => {
        const groups = new Map<string, UserGroup>();

        historicalRequests.forEach(request => {
            if (!groups.has(request.userId)) {
                groups.set(request.userId, {
                    userId: request.userId,
                    userName: request.user.name,
                    department: request.user.department,
                    email: request.user.email,
                    approved: 0,
                    rejected: 0,
                    requests: [],
                    isExpanded: expandedUsers.has(request.userId)
                });
            }

            const group = groups.get(request.userId)!;
            group.requests.push(request);
            if (request.status === 'APPROVED') group.approved++;
            if (request.status === 'REJECTED') group.rejected++;
        });

        return Array.from(groups.values()).sort((a, b) => a.userName.localeCompare(b.userName));
    }, [historicalRequests, expandedUsers]);

    // Get unique departments
    const departments = useMemo(() => {
        const depts = new Set(vacations.map(v => v.user.department));
        return Array.from(depts).sort();
    }, [vacations]);

    const toggleUserExpanded = (userId: string) => {
        setExpandedUsers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Gestión de Vacaciones</h1>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="all">Todos los departamentos</option>
                    {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                    ))}
                </select>
            </div>

            {/* Pending Requests Section */}
            {pendingRequests.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="text-amber-600" size={24} />
                        <h2 className="text-lg md:text-xl font-bold text-amber-900">
                            Solicitudes Pendientes ({pendingRequests.length})
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {pendingRequests.map(request => (
                            <div key={request.id} className="bg-white rounded-lg p-3 md:p-4 shadow-sm border border-amber-100">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="font-semibold text-slate-800">{request.user.name}</span>
                                            <span className="text-sm text-slate-500 hidden md:inline">•</span>
                                            <span className="text-sm text-slate-600">{request.user.department}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-slate-600">
                                            <span>{formatDate(request.startDate)} - {formatDate(request.endDate)}</span>
                                            <span className="hidden md:inline">•</span>
                                            <span>{request.days ? `${request.days} días` : `${request.hours} horas`}</span>
                                            <span className="hidden md:inline">•</span>
                                            <span className={`px-2 py-1 rounded-md font-medium text-xs ${getTypeColor(request.type)}`}>
                                                {getTypeLabel(request.type)}
                                            </span>
                                            {request.justificationUrl && (
                                                <>
                                                    <span className="hidden md:inline">•</span>
                                                    <a
                                                        href={request.justificationUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs md:text-sm"
                                                    >
                                                        <FileText size={16} />
                                                        <span className="hidden md:inline">Ver justificante</span>
                                                        <span className="md:hidden">Ver</span>
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleStatusUpdate(request.id, 'APPROVED')}
                                            className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                        >
                                            <Check size={16} />
                                            <span className="hidden md:inline">Aprobar</span>
                                            <span className="md:hidden">✓</span>
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(request.id, 'REJECTED')}
                                            className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                        >
                                            <X size={16} />
                                            <span className="hidden md:inline">Rechazar</span>
                                            <span className="md:hidden">✗</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Historical Section */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-800">Historial de Solicitudes</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('grouped')}
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm ${viewMode === 'grouped'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <span className="hidden sm:inline">👥 Agrupado</span>
                            <span className="sm:hidden">👥</span>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm ${viewMode === 'list'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <span className="hidden sm:inline">📋 Lista</span>
                            <span className="sm:hidden">📋</span>
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    {historicalRequests.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No hay solicitudes históricas</p>
                    ) : viewMode === 'grouped' ? (
                        <div className="space-y-2">
                            {groupedHistorical.map(group => (
                                <div key={group.userId} className="border border-slate-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleUserExpanded(group.userId)}
                                        className="w-full px-3 md:px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                                            {expandedUsers.has(group.userId) ? (
                                                <ChevronDown size={18} className="text-slate-600 flex-shrink-0" />
                                            ) : (
                                                <ChevronRight size={18} className="text-slate-600 flex-shrink-0" />
                                            )}
                                            <span className="font-semibold text-slate-800 text-sm md:text-base truncate">{group.userName}</span>
                                            <span className="text-xs md:text-sm text-slate-500">({group.requests.length})</span>
                                            <span className="text-xs md:text-sm text-slate-600 hidden sm:inline">• {group.department}</span>
                                        </div>
                                        <div className="flex gap-2 md:gap-3 text-xs md:text-sm flex-shrink-0">
                                            <span className="text-green-600">{group.approved} ✓</span>
                                            <span className="text-red-600">{group.rejected} ✗</span>
                                        </div>
                                    </button>

                                    {expandedUsers.has(group.userId) && (
                                        <div className="divide-y divide-slate-100">
                                            {group.requests.map(request => (
                                                <div key={request.id} className="p-3 bg-white hover:bg-slate-50">
                                                    {/* Desktop View */}
                                                    <div className="hidden sm:flex sm:flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm">
                                                            <span className="text-slate-600">
                                                                {formatDate(request.startDate)} - {formatDate(request.endDate)}
                                                            </span>
                                                            <span className="text-slate-500">
                                                                {request.days ? `${request.days} días` : `${request.hours} horas`}
                                                            </span>
                                                            <span className={`px-2 py-1 rounded text-xs ${getTypeColor(request.type)}`}>
                                                                {getTypeLabel(request.type)}
                                                            </span>
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${request.status === 'APPROVED'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {getStatusLabel(request.status)}
                                                            </span>
                                                        </div>
                                                        {request.justificationUrl && (
                                                            <a
                                                                href={request.justificationUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs md:text-sm"
                                                            >
                                                                <FileText size={14} />
                                                                Ver
                                                            </a>
                                                        )}
                                                    </div>

                                                    {/* Mobile View - Same as List Mode */}
                                                    <div className="sm:hidden">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${request.status === 'APPROVED'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {getStatusLabel(request.status)}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-1.5 text-xs">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-slate-500">Fechas:</span>
                                                                <span className="text-slate-700 font-medium">
                                                                    {formatDate(request.startDate)} - {formatDate(request.endDate)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-slate-500">Duración:</span>
                                                                <span className="text-slate-700 font-medium">
                                                                    {request.days ? `${request.days} días` : `${request.hours} horas`}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-slate-500">Tipo:</span>
                                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(request.type)}`}>
                                                                    {getTypeLabel(request.type)}
                                                                </span>
                                                            </div>
                                                            {request.justificationUrl && (
                                                                <div className="pt-1 border-t border-slate-100">
                                                                    <a
                                                                        href={request.justificationUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                                                                    >
                                                                        <FileText size={14} />
                                                                        Ver justificante
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="overflow-x-auto hidden md:block">
                                <table className="w-full">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Empleado</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Departamento</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Fecha Inicio</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Fecha Fin</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Duración</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tipo</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Estado</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Justificante</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {historicalRequests.map(request => (
                                            <tr key={request.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-sm text-slate-800">{request.user.name}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{request.user.department}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(request.startDate)}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(request.endDate)}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                    {request.days ? `${request.days} días` : `${request.hours} horas`}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${getTypeColor(request.type)}`}>
                                                        {getTypeLabel(request.type)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${request.status === 'APPROVED'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {getStatusLabel(request.status)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {request.justificationUrl && (
                                                        <a
                                                            href={request.justificationUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                        >
                                                            <FileText size={16} />
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {historicalRequests.map(request => (
                                    <div key={request.id} className="bg-white border border-slate-200 rounded-lg p-3 hover:bg-slate-50">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 text-sm truncate">{request.user.name}</p>
                                                <p className="text-xs text-slate-500">{request.user.department}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-md text-xs font-medium flex-shrink-0 ml-2 ${request.status === 'APPROVED'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                {getStatusLabel(request.status)}
                                            </span>
                                        </div>

                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500">Fechas:</span>
                                                <span className="text-slate-700 font-medium">
                                                    {formatDate(request.startDate)} - {formatDate(request.endDate)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500">Duración:</span>
                                                <span className="text-slate-700 font-medium">
                                                    {request.days ? `${request.days} días` : `${request.hours} horas`}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500">Tipo:</span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(request.type)}`}>
                                                    {getTypeLabel(request.type)}
                                                </span>
                                            </div>
                                            {request.justificationUrl && (
                                                <div className="pt-1 border-t border-slate-100">
                                                    <a
                                                        href={request.justificationUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                                                    >
                                                        <FileText size={14} />
                                                        Ver justificante
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
