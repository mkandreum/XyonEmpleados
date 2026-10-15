import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
    Users, Clock, CheckCircle, FileText, CalendarDays, Newspaper, Settings, Gift, CalendarHeart, LayoutGrid, ArrowUpRight,
} from 'lucide-react';
import { adminService, fichajeAdjustmentService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { LoadingState, ErrorState } from '../../components/PageState';
import { StatCard } from '../../components/StatCard';
import { COLORS as X } from '../../components/Shapes';

/** Admin tools hub (app AdminHub): every management area one tap away, including ones not in the nav. */
const TOOLS = [
    { to: '/admin/users', label: 'Usuarios', hint: 'Altas, roles y departamentos', icon: Users, tone: 'bg-lime' },
    { to: '/admin/vacations', label: 'Solicitudes', hint: 'Vacaciones y ausencias', icon: CalendarDays, tone: 'bg-lilac' },
    { to: '/admin/fichajes', label: 'Fichajes', hint: 'Registros, ajustes e informes', icon: Clock, tone: 'bg-sun' },
    { to: '/admin/payrolls', label: 'Nóminas', hint: 'Subir y gestionar PDFs', icon: FileText, tone: 'bg-coral' },
    { to: '/admin/news', label: 'Noticias', hint: 'Comunicados internos', icon: Newspaper, tone: 'bg-lime' },
    { to: '/admin/events', label: 'Eventos', hint: 'Calendario de empresa', icon: CalendarHeart, tone: 'bg-lilac' },
    { to: '/admin/benefits', label: 'Beneficios', hint: 'Días y horas por departamento', icon: Gift, tone: 'bg-sun' },
    { to: '/admin/content-layout', label: 'Diseño del inicio', hint: 'Widgets del panel del empleado', icon: LayoutGrid, tone: 'bg-coral' },
    { to: '/admin/settings', label: 'Ajustes', hint: 'Empresa, email y turnos', icon: Settings, tone: 'bg-white dark:bg-paper' },
];

const CHART_COLORS = [X.blue, X.lilac, X.lime, X.sun, X.coral, '#7C3AED'];

export const AdminDashboard: React.FC = () => {
    const { isDark } = useTheme() as any;
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [pendingAdjustments, setPendingAdjustments] = useState(0);
    const [migrations, setMigrations] = useState<Awaited<ReturnType<typeof adminService.getMigrationStatus>> | null>(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const [st, adj, mig] = await Promise.all([
                adminService.getStats(),
                fichajeAdjustmentService.getPending().catch(() => []),
                adminService.getMigrationStatus().catch(() => null),
            ]);
            setMigrations(mig);
            setStats(st);
            setPendingAdjustments(Array.isArray(adj) ? adj.length : 0);
        } catch (err) {
            console.error('Error fetching stats:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    if (loading) return <LoadingState label="Cargando estadísticas..." fullPage />;

    const axis = isDark ? '#8B8778' : '#5B5E6B';
    const grid = isDark ? '#26263A' : '#DCD8CA';
    const tooltip = {
        backgroundColor: isDark ? '#111118' : '#ffffff',
        border: `1.5px solid ${isDark ? '#34353F' : '#0C0C12'}`,
        borderRadius: 16,
        color: isDark ? '#F5F3EC' : '#0C0C12',
        fontWeight: 700,
    };

    return (
        <div className="space-y-6">
            <header className="animate-slide-up">
                <h1 className="page-title">Panel de administración</h1>
                <p className="page-subtitle">Vista general y acceso a todas las herramientas</p>
            </header>

            {error ? (
                <ErrorState message="No se pudieron cargar las estadísticas." onRetry={fetchStats} />
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    <StatCard icon={Users} tone="blue" label="Empleados" value={stats?.totalEmployees ?? 0} delay="delay-75" />
                    <StatCard icon={Clock} tone="sun" label="Solicitudes pendientes" value={stats?.pendingRequests ?? 0} delay="delay-100" />
                    <StatCard icon={CheckCircle} tone="lime" label="Aprobadas este mes" value={stats?.approvedThisMonth ?? 0} delay="delay-150" />
                    <StatCard icon={FileText} tone="lilac" label="Nóminas procesadas" value={stats?.payrollsProcessed ?? 0} delay="delay-200" />
                </div>
            )}

            {/* What needs attention now */}
            {!error && ((stats?.pendingRequests ?? 0) > 0 || pendingAdjustments > 0) && (
                <section aria-label="Por revisar" className="card-blue border-thick border-ink dark:border-blue-600 p-5 flex flex-col md:flex-row md:items-center gap-4 animate-slide-up delay-150">
                    <h2 className="font-display font-black text-2xl tracking-tight flex-1">Por revisar ahora</h2>
                    <div className="flex flex-wrap gap-2">
                        {(stats?.pendingRequests ?? 0) > 0 && (
                            <Link to="/admin/vacations" className="press inline-flex items-center gap-2 rounded-full bg-lime text-ink px-4 h-11 font-extrabold">
                                {stats.pendingRequests} {stats.pendingRequests === 1 ? 'solicitud' : 'solicitudes'} <ArrowUpRight size={16} aria-hidden="true" />
                            </Link>
                        )}
                        {pendingAdjustments > 0 && (
                            <Link to="/admin/fichajes" className="press inline-flex items-center gap-2 rounded-full bg-sun text-ink px-4 h-11 font-extrabold">
                                {pendingAdjustments} {pendingAdjustments === 1 ? 'ajuste de fichaje' : 'ajustes de fichaje'} <ArrowUpRight size={16} aria-hidden="true" />
                            </Link>
                        )}
                    </div>
                </section>
            )}

            {/* Tools hub */}
            <section aria-labelledby="tools-title">
                <h2 id="tools-title" className="font-display font-black text-2xl tracking-tight text-ink dark:text-white mb-3">Herramientas</h2>
                <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 stagger">
                    {TOOLS.map(({ to, label, hint, icon: Icon, tone }) => (
                        <li key={to}>
                            <Link to={to} className="press group card h-full p-4 flex flex-col gap-3 hover:-translate-y-0.5 transition-transform">
                                <span className="flex items-start justify-between">
                                    <span className={`w-11 h-11 rounded-full grid place-items-center text-ink border-thick border-ink ${tone}`} aria-hidden="true">
                                        <Icon size={20} strokeWidth={2.4} className="dark:text-ink" />
                                    </span>
                                    <ArrowUpRight size={18} className="text-slate-400 transition-transform duration-300 ease-spring group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink dark:group-hover:text-white" aria-hidden="true" />
                                </span>
                                <span>
                                    <span className="block font-display font-black text-lg tracking-tight text-ink dark:text-white leading-tight">{label}</span>
                                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            {!error && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slide-up delay-200">
                    <section className="card p-6">
                        <h2 className="font-display font-black text-xl tracking-tight text-ink dark:text-white mb-4">Solicitudes por mes</h2>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={stats?.requestsByMonth || []}>
                                <CartesianGrid strokeDasharray="4 4" stroke={grid} vertical={false} />
                                <XAxis dataKey="month" stroke={axis} tickLine={false} axisLine={false} />
                                <YAxis stroke={axis} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={tooltip} cursor={{ fill: isDark ? 'rgba(255,255,255,.05)' : 'rgba(12,12,18,.05)' }} />
                                <Bar dataKey="count" fill={X.blue} name="Solicitudes" radius={[10, 10, 10, 10]} maxBarSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </section>

                    <section className="card p-6">
                        <h2 className="font-display font-black text-xl tracking-tight text-ink dark:text-white mb-4">Empleados por departamento</h2>
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={stats?.employeesByDepartment || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={56}
                                    outerRadius={100}
                                    paddingAngle={3}
                                    stroke={isDark ? '#111118' : '#ffffff'}
                                    strokeWidth={3}
                                    label={({ department, count }: any) => `${department}: ${count}`}
                                    labelLine={false}
                                    dataKey="count"
                                    nameKey="department"
                                >
                                    {(stats?.employeesByDepartment || []).map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={tooltip} />
                            </PieChart>
                        </ResponsiveContainer>
                    </section>
                </div>
            )}

            {/* Database: automatic migrations and backups (no direct DB access needed) */}
            {migrations && (
                <section className="card p-6 animate-slide-up delay-300" aria-labelledby="db-title">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <h2 id="db-title" className="font-display font-black text-xl tracking-tight text-ink dark:text-white flex-1">Base de datos</h2>
                        <span className={`chip ${migrations.pending.length ? 'bg-sun' : 'bg-lime'} text-ink`}>
                            {migrations.pending.length ? `${migrations.pending.length} migración(es) pendiente(s)` : 'Esquema al día'}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-bold text-ink dark:text-white mb-1">Última migración</p>
                            {migrations.applied[0] ? (
                                <p className="text-slate-600 dark:text-slate-300">
                                    {migrations.applied[0].name}
                                    <span className="block text-xs text-slate-500">{new Date(migrations.applied[0].executedAt).toLocaleString('es-ES')}</span>
                                </p>
                            ) : <p className="text-slate-500">Ninguna registrada</p>}
                        </div>
                        <div>
                            <p className="font-bold text-ink dark:text-white mb-1">Copias automáticas ({migrations.backups.length})</p>
                            {migrations.backups[0] ? (
                                <p className="text-slate-600 dark:text-slate-300">
                                    {new Date(migrations.backups[0].createdAt).toLocaleString('es-ES')} · {(migrations.backups[0].sizeBytes / 1024 / 1024).toFixed(1)} MB
                                    <span className="block text-xs text-slate-500">Se crea una antes de cada migración. Se guardan en el volumen de uploads.</span>
                                </p>
                            ) : <p className="text-slate-500">Aún no hay copias (se crean al haber cambios)</p>}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};
