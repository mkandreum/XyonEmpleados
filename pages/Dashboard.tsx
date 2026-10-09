import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout, DashboardWidgetType } from '../types';
import { Calendar, Clock, Briefcase, FileText, Download, ChevronRight, Plane, AlertTriangle } from 'lucide-react';
import { DigitalClock } from '../components/DigitalClock';
import { FichajeButton } from '../components/FichajeButton';
import { openProtectedFile } from '../utils/fileUtils';
import { LoadingState, ErrorState, EmptyState } from '../components/PageState';
import { StatCard } from '../components/StatCard';
import { useDashboardData } from '../hooks/useDashboardData';

const DEFAULT_ORDER: DashboardWidgetType[] = ['ADJUSTMENTS', 'ALERTS', 'FICHAJE', 'VACATIONS', 'PAYROLL', 'EVENTS', 'NEWS', 'BENEFITS', 'BANNER'];

/** CSS `order` for a widget: follows the admin-configured layout when present, otherwise the default order. */
const widgetOrder = (layout: DashboardLayout | null, type: DashboardWidgetType): number => {
  if (layout && layout.widgets.length > 0) {
    const idx = layout.widgets.findIndex(w => w.type === type && w.isActive);
    return idx >= 0 ? idx + 2 : 999;
  }
  return DEFAULT_ORDER.indexOf(type) + 2;
};

const widgetHidden = (layout: DashboardLayout | null, type: DashboardWidgetType): boolean => {
  if (!layout || layout.widgets.length === 0) return false;
  return !layout.widgets.some(w => w.type === type && w.isActive);
};

const TONES = {
  info: {
    box: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50',
    ghost: 'text-blue-600',
    title: 'text-blue-800 dark:text-blue-300',
    body: 'text-blue-700 dark:text-blue-300',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  danger: {
    box: 'bg-danger-soft dark:bg-red-900/20 border-red-200 dark:border-red-900/50',
    ghost: 'text-red-600',
    title: 'text-danger-ink dark:text-red-300',
    body: 'text-danger-ink dark:text-red-300',
    button: 'bg-danger hover:bg-red-700',
  },
};

interface AlertBannerProps {
  tone: keyof typeof TONES;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  actionLabel: string;
  onAction: () => void;
  order: number;
  hidden: boolean;
  children?: React.ReactNode;
}

const AlertBanner: React.FC<AlertBannerProps> = ({ tone, icon: Icon, title, actionLabel, onAction, order, hidden, children }) => {
  const t = TONES[tone];
  return (
    <div className={`${t.box} border rounded-card p-6 relative overflow-hidden animate-slide-up delay-75 ${hidden ? 'hidden' : ''}`} style={{ order }}>
      <div className="absolute top-0 right-0 p-4 opacity-10" aria-hidden="true">
        <Icon size={100} className={t.ghost} />
      </div>
      <div className="relative z-10">
        <h2 className={`${t.title} font-bold text-lg flex items-center gap-2`}>
          <Icon size={20} />
          {title}
        </h2>
        {children}
        <button
          onClick={onAction}
          className={`mt-4 ${t.button} text-white px-6 py-2 rounded-control text-sm font-semibold transition-colors shadow-soft flex items-center gap-2`}
        >
          {actionLabel}
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const {
    layout, pendingVacations, events, pendingAdjustments, benefits, deptBenefits,
    lastPayroll, pendingWarnings, loading, error, reload,
  } = useDashboardData(user);

  if (loading) return <LoadingState label="Cargando..." fullPage />;
  if (error) return <ErrorState message="No se pudo cargar el panel. Revisa tu conexión e inténtalo de nuevo." onRetry={reload} />;

  const now = new Date();
  const nextPayrollStr = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

  const remainingVacations = (deptBenefits?.vacationDays || 22) - (benefits?.vacationDaysUsed || 0);
  const order = (type: DashboardWidgetType) => widgetOrder(layout, type);
  const hidden = (type: DashboardWidgetType) => widgetHidden(layout, type);

  const openLastPayroll = async () => {
    if (!lastPayroll) return;
    try {
      await openProtectedFile(lastPayroll.pdfUrl);
    } catch (err) {
      console.error('Error opening payroll:', err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-slide-up" style={{ order: 1 }}>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Hola, {user?.name?.split(' ')[0]}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 capitalize">
          {now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {pendingAdjustments.length > 0 && (
        <AlertBanner
          tone="info"
          icon={Clock}
          title="Solicitudes de ajuste pendientes"
          actionLabel="Gestionar ajustes"
          onAction={() => navigate('/manager/adjustments')}
          order={order('ADJUSTMENTS')}
          hidden={hidden('ADJUSTMENTS')}
        >
          <p className="text-sm mt-2 text-blue-700 dark:text-blue-300">
            Hay {pendingAdjustments.length} {pendingAdjustments.length === 1 ? 'solicitud' : 'solicitudes'} de ajuste de fichaje esperando revisión.
          </p>
        </AlertBanner>
      )}

      {pendingWarnings.length > 0 && (
        <AlertBanner
          tone="danger"
          icon={AlertTriangle}
          title={`Tienes ${pendingWarnings.length} ${pendingWarnings.length === 1 ? 'aviso' : 'avisos'} de asistencia`}
          actionLabel="Ver y justificar"
          onAction={() => navigate('/news?tab=attendance')}
          order={order('ALERTS')}
          hidden={hidden('ALERTS')}
        >
          <div className="space-y-3 mt-4">
            {pendingWarnings.slice(0, 2).map((warning) => (
              <div key={warning.id} className="bg-white/60 dark:bg-slate-800/60 p-3 rounded-control border border-red-100 dark:border-red-900/30 backdrop-blur-sm">
                <p className="text-sm font-semibold text-danger-ink dark:text-red-200 capitalize">
                  {new Date(warning.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-xs text-danger-ink dark:text-red-300">
                  Reclamado por: {warning.manager?.name || 'Manager'}
                </p>
              </div>
            ))}
            {pendingWarnings.length > 2 && (
              <p className="text-xs text-danger-ink dark:text-red-300 font-medium pl-1">
                … y {pendingWarnings.length - 2} más.
              </p>
            )}
          </div>
        </AlertBanner>
      )}

      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${hidden('VACATIONS') && hidden('PAYROLL') ? 'hidden' : ''}`}
        style={{ order: Math.min(order('VACATIONS'), order('PAYROLL')) }}
      >
        <StatCard icon={Briefcase} iconClass="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" label="Días de vacaciones" value={remainingVacations} delay="delay-150" />
        <StatCard icon={Clock} iconClass="bg-warning-soft dark:bg-amber-900/20 text-warning dark:text-amber-400" label="Solicitudes pendientes" value={pendingVacations.length} delay="delay-200" />
        <StatCard icon={Clock} iconClass="bg-warning-soft dark:bg-amber-900/20 text-warning dark:text-amber-400" label="Próxima nómina" value={<span className="text-lg">{nextPayrollStr}</span>} delay="delay-300" />
      </div>

      <div
        className={`bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 p-6 rounded-card shadow-soft border border-blue-100 dark:border-slate-700 transition-colors animate-slide-up delay-300 ${hidden('FICHAJE') ? 'hidden' : ''}`}
        style={{ order: order('FICHAJE') }}
      >
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Control de asistencia</h2>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <DigitalClock />
          <FichajeButton />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ order: Math.min(order('PAYROLL'), order('EVENTS')) + 1 }}>
        <div className="lg:col-span-2 space-y-6">
          <button
            onClick={() => navigate('/vacations')}
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-card p-6 shadow-card transition-all hover:-translate-y-0.5 flex items-center justify-between gap-4 group animate-slide-up delay-400"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-white/20 rounded-control shrink-0">
                <Plane size={32} className="text-white" aria-hidden="true" />
              </div>
              <div className="text-left min-w-0">
                <h3 className="text-lg sm:text-xl font-bold">Vacaciones y ausencias</h3>
                <p className="text-blue-100 text-sm">Solicita días libres, bajas o consulta tu histórico</p>
              </div>
            </div>
            <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors shrink-0">
              <ChevronRight size={24} aria-hidden="true" />
            </div>
          </button>

          <div className="card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors animate-slide-up delay-500">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-success-soft dark:bg-green-900/20 text-success dark:text-green-400 rounded-control border border-green-100 dark:border-green-900/30 shrink-0">
                <FileText size={28} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Última nómina disponible</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm capitalize">
                  {lastPayroll ? `${lastPayroll.month} ${lastPayroll.year}` : 'No hay nóminas disponibles'}
                </p>
              </div>
            </div>
            {lastPayroll && (
              <button
                onClick={openLastPayroll}
                className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-800 text-white px-5 py-3 rounded-control hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors font-medium shadow-soft"
              >
                <Download size={18} aria-hidden="true" />
                Descargar PDF
              </button>
            )}
          </div>
        </div>

        <div className="card p-6 h-full transition-colors animate-slide-up delay-500">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-slate-500" aria-hidden="true" />
            Próximos eventos
          </h2>
          {events.length > 0 ? (
            <ul className="space-y-3">
              {events.slice(0, 3).map(event => (
                <li key={event.id} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-control border border-slate-100 dark:border-slate-800">
                  <div className="shrink-0 w-12 h-12 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-control flex flex-col items-center justify-center">
                    <span className="text-2xs text-slate-500 dark:text-slate-400 font-semibold">{new Date(event.date).toLocaleDateString('es-ES', { month: 'short' })}</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{new Date(event.date).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{event.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{event.location || 'Ubicación pendiente'}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Calendar size={32} />} title="No hay eventos próximos" hint="Cuando se publique uno, aparecerá aquí." />
          )}
        </div>
      </div>
    </div>
  );
};
