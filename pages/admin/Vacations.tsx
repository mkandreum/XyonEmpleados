import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/api';
import { Check, X, FileText } from 'lucide-react';

export const AdminVacations: React.FC = () => {
    const [vacations, setVacations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    // Helper function to translate status
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

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'VACATION': return 'Vacaciones';
            case 'SICK_LEAVE': return 'Horas médicas';
            case 'PERSONAL': return 'Asuntos Propios';
            default: return type;
        }
    };

    const getTypeBadgeColor = (type: string) => {
        switch (type) {
            case 'VACATION': return 'bg-indigo-100 text-indigo-700';
            case 'SICK_LEAVE': return 'bg-rose-100 text-rose-700';
            case 'PERSONAL': return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando solicitudes...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Gestión de Vacaciones</h1>

            {/* Desktop View (Table) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hidden sm:block">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Empleado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Inicio</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Fin</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duración</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Justificante</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {vacations.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{req.user?.name || 'Desconocido'}</div>
                                        <div className="text-xs text-slate-500">{req.user?.department}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {new Date(req.startDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {new Date(req.endDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {req.hours ? `${req.hours} horas` : `${req.days} días`}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadgeColor(req.type)}`}>
                                            {getTypeLabel(req.type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {req.justificationUrl ? (
                                            <a href={req.justificationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                Ver
                                            </a>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`
                                        px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                        ${req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                req.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                    req.status === 'PENDING_MANAGER' ? 'bg-yellow-100 text-yellow-800' :
                                                        req.status === 'PENDING_ADMIN' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-slate-100 text-slate-800'}
                                    `}>
                                            {getStatusLabel(req.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {(req.status === 'PENDING' || req.status === 'PENDING_ADMIN' || req.status === 'PENDING_MANAGER') && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                                                    className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                                                    title="Aprobar"
                                                >
                                                    <Check size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(req.id, 'REJECTED')}
                                                    className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                                                    title="Rechazar"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile View (Cards) */}
            <div className="sm:hidden space-y-4">
                {vacations.map((req) => (
                    <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                    {req.user?.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 text-sm">{req.user?.name}</h3>
                                    <p className="text-xs text-slate-500">{req.user?.department}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {getStatusLabel(req.status)}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm border-t border-slate-50 pt-3">
                            <div>
                                <p className="text-xs text-slate-400 mb-0.5">Tipo</p>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeBadgeColor(req.type)}`}>
                                    {getTypeLabel(req.type)}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 mb-0.5">Duración</p>
                                <p className="font-medium text-slate-700">
                                    {req.hours ? `${req.hours} horas` : `${req.days} días`}
                                </p>
                            </div>
                            <div className="col-span-2 mt-1">
                                <p className="text-xs text-slate-400 mb-0.5">Fechas</p>
                                <p className="font-medium text-slate-700">
                                    {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                            <div>
                                {req.justificationUrl ? (
                                    <a href={req.justificationUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
                                        <FileText size={14} /> Ver Justificante
                                    </a>
                                ) : <span className="text-xs text-slate-400">Sin justificante</span>}
                            </div>

                            {(req.status === 'PENDING' || req.status === 'PENDING_ADMIN' || req.status === 'PENDING_MANAGER') && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                    >
                                        <Check size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(req.id, 'REJECTED')}
                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
