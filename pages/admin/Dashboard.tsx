import React, { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Clock, CheckCircle, FileText, TrendingUp } from 'lucide-react';
import { adminService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export const AdminDashboard: React.FC = () => {
    const { isDark } = useTheme() as any;
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const data = await adminService.getStats();
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
            <div className="animate-slide-up">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Panel de Administración</h1>
                <p className="text-slate-500 dark:text-slate-400">Vista general de la actividad y estadísticas</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up delay-75">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Empleados</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalEmployees || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Solicitudes Pendientes</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.pendingRequests || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aprobadas Este Mes</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.approvedThisMonth || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                            <FileText size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nóminas Procesadas</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.payrollsProcessed || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up delay-150">
                {/* Requests by Month */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Solicitudes por Mes</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats?.requestsByMonth || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="month" stroke={isDark ? '#94a3b8' : '#64748b'} />
                            <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                                    borderColor: isDark ? '#334155' : '#e2e8f0',
                                    color: isDark ? '#f8fafc' : '#0f172a'
                                }}
                            />
                            <Legend />
                            <Bar dataKey="count" fill="#3b82f6" name="Solicitudes" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Employees by Department */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Empleados por Departamento</h2>
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
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                                    borderColor: isDark ? '#334155' : '#e2e8f0',
                                    color: isDark ? '#f8fafc' : '#0f172a'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors animate-slide-up delay-200">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Actividad Reciente</h2>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <TrendingUp size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">Sistema funcionando correctamente</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Todas las funcionalidades operativas</p>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500">Ahora</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
