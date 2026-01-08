import React, { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Clock, CheckCircle, FileText, TrendingUp } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-slate-500">Cargando estadísticas...</div></div>;

    const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
                <p className="text-slate-500">Vista general de la actividad y estadísticas</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Empleados</p>
                            <p className="text-2xl font-bold text-slate-900">{stats?.totalEmployees || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Solicitudes Pendientes</p>
                            <p className="text-2xl font-bold text-slate-900">{stats?.pendingRequests || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Aprobadas Este Mes</p>
                            <p className="text-2xl font-bold text-slate-900">{stats?.approvedThisMonth || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                            <FileText size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Nóminas Procesadas</p>
                            <p className="text-2xl font-bold text-slate-900">{stats?.payrollsProcessed || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Requests by Month */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Solicitudes por Mes</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats?.requestsByMonth || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#3b82f6" name="Solicitudes" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Employees by Department */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Empleados por Departamento</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={stats?.employeesByDepartment || []}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ department, count }) => `${department}: ${count}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                            >
                                {(stats?.employeesByDepartment || []).map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Actividad Reciente</h2>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <TrendingUp size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">Sistema funcionando correctamente</p>
                            <p className="text-xs text-slate-500">Todas las funcionalidades operativas</p>
                        </div>
                        <span className="text-xs text-slate-400">Ahora</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
