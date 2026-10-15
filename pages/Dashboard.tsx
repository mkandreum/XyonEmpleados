import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout, DashboardWidgetType } from '../types';
import { Calendar, Clock, FileText, Download, ChevronRight, Plane, AlertTriangle, Hourglass, Wallet } from 'lucide-react';
import { Sparkle, Star, BlobIcon } from '../components/Shapes';
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
  info: { box: 'bg-lilac text-ink', ghost: 'text-ink' },
  danger: { box: 'bg-coral text-ink', ghost: 'text-ink' },
};

interface AlertBannerProps {
  tone: keyof typeof TONES;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
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
    <section className={`lg:col-span-12 ${t.box} border-thick border-ink rounded-card p-6 relative overflow-hidden animate-slide-up delay-75 ${hidden ? 'hidden' : ''}`} style={{ order }}>
      <Sparkle size={90} color="#ffffff" className="absolute -right-4 -top-4 opacity-60 animate-spin-slow" />
      <div className="relative z-10">
        <h2 className="font-display font-black text-xl tracking-tight flex items-center gap-2">
          <Icon size={22} strokeWidth={2.5} />
          {title}
        </h2>
        {children}
        <button onClick={onAction} className="btn-primary mt-4 !pr-2">
          {actionLabel}
          <span className="w-7 h-7 rounded-full bg-lime text-ink grid place-items-center" aria-hidden="true"><ChevronRight size={16} /></span>
        </button>
      </div>
    </section>
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

  const firstName = user?.name?.split(' ')[0] || '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
      <header className="lg:col-span-12 animate-slide-up" style={{ order: 1 }}>
        <p className="text-slate-500 dark:text-slate-400 font-semibold first-letter:uppercase">
          {now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="font-display font-black text-[2.75rem] sm:text-display leading-[0.95] tracking-[-0.045em] text-ink dark:text-white mt-1">
          Hola, {firstName}<span className="text-blue-600 dark:text-blue-400">.</span>
        </h1>
      </header>

      {pendingAdjustments.length > 0 && (
        <AlertBanner
          tone="info"
          icon={Clock}
          title="Ajustes de fichaje pendientes"
          actionLabel="Gestionar ajustes"
          onAction={() => navigate('/manager/adjustments')}
          order={order('ADJUSTMENTS')}
          hidden={hidden('ADJUSTMENTS')}
        >
          <p className="text-sm mt-2 font-medium">
            Hay {pendingAdjustments.length} {pendingAdjustments.length === 1 ? 'solicitud' : 'solicitudes'} de ajuste esperando revisión.
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
          <ul className="flex flex-wrap gap-2 mt-3">
            {pendingWarnings.slice(0, 3).map((warning) => (
              <li key={warning.id} className="rounded-full bg-white/60 px-3.5 py-1.5 text-sm font-bold capitalize">
                {new Date(warning.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                <span className="font-medium normal-case"> · {warning.manager?.name || 'Responsable'}</span>
              </li>
            ))}
            {pendingWarnings.length > 3 && (
              <li className="rounded-full bg-white/60 px-3.5 py-1.5 text-sm font-bold">+{pendingWarnings.length - 3}</li>
            )}
          </ul>
        </AlertBanner>
      )}

      {/* Hero: clock-in/out on a blue field (app home) */}
      <section
        aria-label="Control de asistencia"
        className={`lg:col-span-7 lg:row-span-2 card-blue border-thick border-ink dark:border-blue-600 p-6 sm:p-8 animate-slide-up delay-100 ${hidden('FICHAJE') ? 'hidden' : ''}`}
        style={{ order: order('FICHAJE') }}
      >
        <Sparkle size={44} color="#C8F53C" className="absolute right-6 top-16 animate-bob" />
        <Star size={26} color="#FFD84A" className="absolute left-6 bottom-8 animate-spin-slow" />
        <div className="relative flex items-center justify-between gap-4">
          <h2 className="font-display font-black text-2xl tracking-tight">Tu jornada</h2>
          <LiveClock />
        </div>
        <div className="relative mt-2">
          <FichajeButton />
        </div>
      </section>

      {/* Stat tiles (app StatPill row) */}
      <div
        className={`lg:col-span-5 grid grid-cols-3 gap-3 lg:gap-4 ${hidden('VACATIONS') && hidden('PAYROLL') ? 'hidden' : ''}`}
        style={{ order: Math.min(order('VACATIONS'), order('PAYROLL')) }}
      >
        <StatCard icon={Plane} tone="lime" label="Días libres" value={remainingVacations} delay="delay-150" />
        <StatCard icon={Hourglass} tone="lilac" label="Pendientes" value={pendingVacations.length} delay="delay-200" />
        <StatCard icon={Wallet} tone="sun" label="Próx. nómina" value={<span className="text-lg sm:text-2xl leading-tight block">{nextPayrollStr}</span>} delay="delay-300" />
      </div>

      {/* Quick actions + payroll */}
      <div className="lg:col-span-5 flex flex-col gap-4" style={{ order: Math.min(order('VACATIONS'), order('PAYROLL')) + 1 }}>
        <button
          onClick={() => navigate('/vacations')}
          className="press group relative overflow-hidden w-full rounded-card bg-ink text-white dark:bg-slate-900 dark:border-thick dark:border-slate-700 p-5 flex items-center gap-4 text-left animate-slide-up delay-300"
        >
          <BlobIcon icon={<Plane size={24} />} color="#C8F53C" size={60} />
          <span className="flex-1 min-w-0">
            <span className="block font-display font-black text-xl tracking-tight">Vacaciones y ausencias</span>
            <span className="block text-sm text-white/70">Pide días libres o consulta tu histórico</span>
          </span>
          <span className="w-11 h-11 shrink-0 rounded-full bg-lime text-ink grid place-items-center transition-transform duration-300 ease-spring group-hover:-rotate-12" aria-hidden="true">
            <ChevronRight size={22} />
          </span>
        </button>

        <div className={`card p-5 flex items-center gap-4 animate-slide-up delay-400 ${hidden('PAYROLL') ? 'hidden' : ''}`}>
          <BlobIcon icon={<FileText size={22} />} color="#C9B6FF" size={56} />
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-black text-lg tracking-tight text-ink dark:text-white">Última nómina</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm capitalize truncate">
              {lastPayroll ? `${lastPayroll.month} ${lastPayroll.year}` : 'Aún no hay nóminas'}
            </p>
          </div>
          {lastPayroll && (
            <button onClick={openLastPayroll} className="btn-primary shrink-0" aria-label="Descargar última nómina en PDF">
              <Download size={18} aria-hidden="true" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          )}
        </div>
      </div>

      <section className={`lg:col-span-12 card p-6 animate-slide-up delay-500 ${hidden('EVENTS') ? 'hidden' : ''}`} style={{ order: order('EVENTS') }}>
        <h2 className="font-display font-black text-2xl tracking-tight text-ink dark:text-white mb-4">Próximos eventos</h2>
        {events.length > 0 ? (
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 stagger">
            {events.slice(0, 3).map((event, i) => (
              <li key={event.id} className="flex gap-3 p-3 rounded-[1.375rem] bg-slate-50 dark:bg-slate-800/60">
                <div className={`shrink-0 w-14 h-14 rounded-[1.125rem] flex flex-col items-center justify-center text-ink ${['bg-lime', 'bg-lilac', 'bg-sun'][i % 3]}`}>
                  <span className="text-2xs font-black uppercase leading-none">{new Date(event.date).toLocaleDateString('es-ES', { month: 'short' })}</span>
                  <span className="font-display text-2xl font-black leading-none">{new Date(event.date).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0 self-center">
                  <h4 className="font-bold text-ink dark:text-white text-sm truncate">{event.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{event.location || 'Ubicación pendiente'}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Calendar size={32} />} title="No hay eventos próximos" hint="Cuando se publique uno, aparecerá aquí." />
        )}
      </section>
    </div>
  );
};

/** Compact live clock for the hero card. */
const LiveClock: React.FC = () => {
  const [time, setTime] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <time className="rounded-full bg-white/15 px-4 py-1.5 font-display font-black text-lg tabular-nums tracking-tight" dateTime={time.toISOString()}>
      {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
    </time>
  );
};
