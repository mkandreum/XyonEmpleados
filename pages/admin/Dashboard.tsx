import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Users, Calendar, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        pendingVacations: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const users = await adminService.getUsers();
                const vacations = await adminService.getVacations();
                const pending = vacations.filter((v: any) => v.status === 'PENDING').length;

                setStats({
                    totalUsers: users.length,
                    pendingVacations: pending,
                });
            } catch (error) {
                console.error("Error fetching admin stats:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando estadísticas...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Panel de Control</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Usuarios Totales</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.totalUsers}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Solicitudes Pendientes</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.pendingVacations}</p>
                    </div>
                </div>

                {/* Placeholder for more stats */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Sistema</p>
                        <p className="text-2xl font-bold text-slate-800">Activo</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions or Charts could go here */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Resumen de Actividad</h3>
                <div className="h-64 flex items-center justify-center text-slate-400">
                    Gráficos de actividad (Próximamente)
                </div>
            </div>
        </div>
    );
};
