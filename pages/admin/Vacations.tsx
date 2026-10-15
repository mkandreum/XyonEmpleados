import React, { useEffect, useState, useMemo } from 'react';
import { adminService } from '../../services/api';
import { Check, X, FileText, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { getTypeLabel, getTypeColor } from '../../utils/vacationUtils';
import { getAbsoluteUrl } from '../../utils/urlUtils';
import { openProtectedFile } from '../../utils/fileUtils';
import toast from 'react-hot-toast';
import { haptic } from '../../utils/haptics';
import { vacationStatusLabel } from '../../components/StatusBadge';

interface VacationRequest {
    id: string;
    userId: string;
    user: {
        name: string;
        email: string;
        department: string;
    };
    type: string;
    subtype?: string;
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
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [bulkBusy, setBulkBusy] = useState(false);

    const fetchVacations = async () => {
        try {
            const data = await adminService.getAllVacations();
            setVacations(data as any);
        } catch (error) {
            console.error("Error fetching vacations:", error);
            toast.error('Error al cargar solicitudes');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVacations();
    }, []);

    const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        setActionLoadingId(id);
        try {
            await adminService.updateVacationStatus(id, status);
            haptic(status === 'APPROVED' ? 'success' : 'double');
            toast.success(status === 'APPROVED' ? 'Solicitud aprobada' : 'Solicitud rechazada');
            await fetchVacations();
        } catch (error) {
            haptic('error');
            toast.error('Error al actualizar el estado');
        } finally {
            setActionLoadingId(null);
        }
    };

    /** Approve or reject every selected pending request; reports partial failures. */
    const handleBulk = async (status: 'APPROVED' | 'REJECTED') => {
        const ids = [...selected];
        if (ids.length === 0) return;
        if (status === 'REJECTED' && !window.confirm(`¿Rechazar ${ids.length} ${ids.length === 1 ? 'solicitud' : 'solicitudes'}?`)) return;
        setBulkBusy(true);
        const results = await Promise.allSettled(ids.map(id => adminService.updateVacationStatus(id, status)));
        const failed = results.filter(r => r.status === 'rejected').length;
        const ok = ids.length - failed;
        haptic(failed ? 'error' : 'success');
        if (ok) toast.success(`${ok} ${ok === 1 ? 'solicitud' : 'solicitudes'} ${status === 'APPROVED' ? 'aprobada' : 'rechazada'}${ok === 1 ? '' : 's'}`);
        if (failed) toast.error(`${failed} no se pudieron actualizar`);
        setSelected(new Set());
        await fetchVacations();
        setBulkBusy(false);
    };

    const toggleSelected = (id: string) => setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    // Helper functions



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
            <div className="flex justify-between items-center animate-slide-up">
                <h1 className="page-title">Gestión de Vacaciones</h1>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center animate-slide-up delay-75">
                <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="field px-4"
                >
                    <option value="all">Todos los departamentos</option>
                    {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                    ))}
                </select>
            </div>

            {/* Pending Requests Section */}
            {pendingRequests.length > 0 && (
                <div className="bg-sun text-ink border-thick border-ink dark:border-transparent rounded-card p-4 md:p-6 animate-slide-up delay-150">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <AlertCircle size={24} aria-hidden="true" />
                        <h2 className="font-display font-black text-xl md:text-2xl tracking-tight flex-1">
                            Solicitudes pendientes ({pendingRequests.length})
                        </h2>
                        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded-md accent-[#0C0C12]"
                                checked={selected.size > 0 && pendingRequests.every(r => selected.has(r.id))}
                                onChange={(e) => setSelected(e.target.checked ? new Set(pendingRequests.map(r => r.id)) : new Set())}
                            />
                            Seleccionar todas
                        </label>
                        {selected.size > 0 && (
                            <div className="flex gap-2 animate-pop">
                                <button onClick={() => handleBulk('APPROVED')} disabled={bulkBusy} className="btn-primary">
                                    <Check size={16} aria-hidden="true" /> Aprobar {selected.size}
                                </button>
                                <button onClick={() => handleBulk('REJECTED')} disabled={bulkBusy} className="btn-secondary">
                                    <X size={16} aria-hidden="true" /> Rechazar {selected.size}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        {pendingRequests.map(request => (
                            <div key={request.id} className={`bg-white dark:bg-slate-900 rounded-[1.375rem] p-3 md:p-4 transition-colors ${selected.has(request.id) ? 'ring-2 ring-ink dark:ring-lime' : ''}`}>
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <input
                                        type="checkbox"
                                        className="hidden md:block w-5 h-5 rounded-md accent-[#2563EB] shrink-0"
                                        checked={selected.has(request.id)}
                                        onChange={() => toggleSelected(request.id)}
                                        aria-label={`Seleccionar solicitud de ${request.user.name}`}
                                    />
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="text-base font-semibold text-slate-900 dark:text-white">{request.user.name}</span>
                                            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${request.status === 'PENDING_ADMIN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                                                {vacationStatusLabel(request.status)}
                                            </span>
                                        </div>
                                        <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                                            {request.user.department} · Solicitada el {formatDate(request.createdAt)}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-slate-600 dark:text-slate-400">
                                            <span>{formatDate(request.startDate)} - {formatDate(request.endDate)}</span>
                                            <span className="hidden md:inline">•</span>
                                            <span>{request.days ? `${request.days} días` : `${request.hours} horas`}</span>
                                            <span className="hidden md:inline">•</span>
                                            <span className={`px-2 py-1 rounded-md font-medium text-xs ${getTypeColor(request.type)}`}>
                                                {getTypeLabel(request.type, request.subtype)}
                                            </span>
                                            {request.justificationUrl && (
                                                <>
                                                    <span className="hidden md:inline">•</span>
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
                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 text-xs md:text-sm transition-colors"
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
                                            disabled={actionLoadingId === request.id}
                                            className="btn-lime flex-1 md:flex-none md:px-4"
                                            aria-label={`Aprobar solicitud de ${request.user.name}`}
                                        >
                                            <Check size={16} />
                                            <span className="hidden md:inline">{actionLoadingId === request.id ? 'Procesando...' : 'Aprobar'}</span>
                                            <span className="md:hidden">{actionLoadingId === request.id ? '...' : '✓'}</span>
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(request.id, 'REJECTED')}
                                            disabled={actionLoadingId === request.id}
                                            className="btn-danger flex-1 md:flex-none md:px-4"
                                            aria-label={`Rechazar solicitud de ${request.user.name}`}
                                        >
                                            <X size={16} />
                                            <span className="hidden md:inline">{actionLoadingId === request.id ? 'Procesando...' : 'Rechazar'}</span>
                                            <span className="md:hidden">{actionLoadingId === request.id ? '...' : '✗'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Historical Section */}
            <div className="bg-white dark:bg-slate-900 rounded-control shadow-sm border border-slate-200 dark:border-slate-800 transition-colors animate-slide-up delay-200">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Historial de Solicitudes</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('grouped')}
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-control transition-colors text-sm ${viewMode === 'grouped'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            <span className="hidden sm:inline">👥 Agrupado</span>
                            <span className="sm:hidden">👥</span>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-control transition-colors text-sm ${viewMode === 'list'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            <span className="hidden sm:inline">📋 Lista</span>
                            <span className="sm:hidden">📋</span>
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    {historicalRequests.length === 0 ? (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-8">No hay solicitudes históricas</p>
                    ) : viewMode === 'grouped' ? (
                        <div className="space-y-2">
                            {groupedHistorical.map(group => (
                                <div key={group.userId} className="border border-slate-200 dark:border-slate-800 rounded-control overflow-hidden transition-colors">
                                    <button
                                        onClick={() => toggleUserExpanded(group.userId)}
                                        className="w-full px-3 md:px-4 py-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                                            {expandedUsers.has(group.userId) ? (
                                                <ChevronDown size={18} className="text-slate-600 dark:text-slate-400 flex-shrink-0" />
                                            ) : (
                                                <ChevronRight size={18} className="text-slate-600 dark:text-slate-400 flex-shrink-0" />
                                            )}
                                            <span className="font-semibold text-slate-800 dark:text-white text-sm md:text-base truncate">{group.userName}</span>
                                            <span className="text-xs md:text-sm text-slate-500 dark:text-slate-400">({group.requests.length})</span>
                                            <span className="text-xs md:text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">• {group.department}</span>
                                        </div>
                                        <div className="flex gap-2 md:gap-3 text-xs md:text-sm flex-shrink-0">
                                            <span className="text-green-700 dark:text-green-400 font-medium">{group.approved} ✓</span>
                                            <span className="text-red-600 dark:text-red-400 font-medium">{group.rejected} ✗</span>
                                        </div>
                                    </button>

                                    {expandedUsers.has(group.userId) && (
                                        <>
                                            {/* Desktop Table View */}
                                            <div className="hidden sm:block overflow-x-auto">
                                                <table className="w-full">
                                                    <thead className="bg-slate-50 dark:bg-slate-800/60 transition-colors">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Fecha Inicio</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Fecha Fin</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Duración</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tipo</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Estado</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Justificante</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="stagger divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                                                        {group.requests.map(request => (
                                                            <tr key={request.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                                <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">{formatDate(request.startDate)}</td>
                                                                <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">{formatDate(request.endDate)}</td>
                                                                <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                                                                    {request.days ? `${request.days} días` : `${request.hours} horas`}
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(request.type)}`}>
                                                                        {getTypeLabel(request.type, request.subtype)}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${request.status === 'APPROVED'
                                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                        }`}>
                                                                        {vacationStatusLabel(request.status)}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2">
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
                                                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
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
                                            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                                                {group.requests.map(request => (
                                                    <div key={request.id} className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${request.status === 'APPROVED'
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                }`}>
                                                                {vacationStatusLabel(request.status)}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-1.5 text-xs">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-slate-500 dark:text-slate-400">Fechas:</span>
                                                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                                    {formatDate(request.startDate)} - {formatDate(request.endDate)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-slate-500 dark:text-slate-400">Duración:</span>
                                                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                                    {request.days ? `${request.days} días` : `${request.hours} horas`}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-slate-500 dark:text-slate-400">Tipo:</span>
                                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(request.type)}`}>
                                                                    {getTypeLabel(request.type, request.subtype)}
                                                                </span>
                                                            </div>
                                                            {request.justificationUrl && (
                                                                <div className="pt-1 border-t border-slate-100 dark:border-slate-800 transition-colors">
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
                                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 text-xs transition-colors"
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
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="overflow-x-auto hidden md:block">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-800/60 transition-colors">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Empleado</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Departamento</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Fecha Inicio</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Fecha Fin</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Duración</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tipo</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Estado</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Justificante</th>
                                        </tr>
                                    </thead>
                                    <tbody className="stagger divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                                        {historicalRequests.map(request => (
                                            <tr key={request.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 text-sm text-slate-800 dark:text-white font-medium">{request.user.name}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{request.user.department}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{formatDate(request.startDate)}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{formatDate(request.endDate)}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {request.days ? `${request.days} días` : `${request.hours} horas`}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${getTypeColor(request.type)}`}>
                                                        {getTypeLabel(request.type, request.subtype)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${request.status === 'APPROVED'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        {vacationStatusLabel(request.status)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
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
                                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
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
                                    <div key={request.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-control p-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{request.user.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{request.user.department}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-md text-xs font-medium flex-shrink-0 ml-2 ${request.status === 'APPROVED'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {vacationStatusLabel(request.status)}
                                            </span>
                                        </div>

                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500 dark:text-slate-400">Fechas:</span>
                                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                    {formatDate(request.startDate)} - {formatDate(request.endDate)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500 dark:text-slate-400">Duración:</span>
                                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                    {request.days ? `${request.days} días` : `${request.hours} horas`}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500 dark:text-slate-400">Tipo:</span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(request.type)}`}>
                                                    {getTypeLabel(request.type, request.subtype)}
                                                </span>
                                            </div>
                                            {request.justificationUrl && (
                                                <div className="pt-1 border-t border-slate-100 dark:border-slate-800 transition-colors">
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
                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 text-xs transition-colors"
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
