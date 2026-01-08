import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/api';
import { Check, X } from 'lucide-react';

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

    if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando solicitudes...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Gestión de Vacaciones</h1>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Empleado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Inicio</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Fin</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Días</th>
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
                                        {req.days}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {req.type}
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
                                            {req.status === 'PENDING_MANAGER' ? 'Pendiente Manager' :
                                                req.status === 'PENDING_ADMIN' ? 'Pendiente Admin' :
                                                    req.status}
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
        </div>
    );
};
