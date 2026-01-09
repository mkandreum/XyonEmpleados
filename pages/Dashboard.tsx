import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { vacationService, eventsService, holidayService, benefitsService, payrollService, lateNotificationService } from '../services/api';
import { VacationRequest, Event, Holiday, UserBenefitsBalance, DepartmentBenefits, Payroll, LateArrivalNotification } from '../types';
import { Calendar, Clock, Briefcase, FileText, Download, ChevronRight, Plane, AlertTriangle } from 'lucide-react';
import { DigitalClock } from '../components/DigitalClock';
import { FichajeButton } from '../components/FichajeButton';
import { TodayFichajesList, TodayFichajesListRef } from '../components/TodayFichajesList';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [pendingVacations, setPendingVacations] = useState<VacationRequest[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [nextHoliday, setNextHoliday] = useState<Holiday | null>(null);
  const [benefits, setBenefits] = useState<UserBenefitsBalance | null>(null);
  const [deptBenefits, setDeptBenefits] = useState<DepartmentBenefits | null>(null);
  const [lastPayroll, setLastPayroll] = useState<Payroll | null>(null);
  const [pendingWarnings, setPendingWarnings] = useState<LateArrivalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const fichajesListRef = React.useRef<TodayFichajesListRef>(null);

  const handleFichajeChange = () => {
    fichajesListRef.current?.refresh();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const promises: Promise<any>[] = [
          vacationService.getAll(),
          eventsService.getAll(),
          holidayService.getNext(),
          benefitsService.getUserBalance(),
          payrollService.getAll(),
          lateNotificationService.getAll()
        ];

        if (user?.department) {
          promises.push(benefitsService.getDepartmentBenefits(user.department));
        }

        const results = await Promise.all(promises);
        const [vacs, evts, holiday, benefitBalance, payrolls, warnings] = results;

        setVacations(vacs);
        setPendingVacations(vacs.filter((v: VacationRequest) => v.status === 'PENDING'));
        setEvents(evts);
        setNextHoliday(holiday);
        setBenefits(benefitBalance);

        // Filter pending warnings (not justified)
        if (Array.isArray(warnings)) {
          setPendingWarnings(warnings.filter((w: LateArrivalNotification) => !w.justificado));
        }

        // Get last payroll
        if (Array.isArray(payrolls) && payrolls.length > 0) {
          setLastPayroll(payrolls[payrolls.length - 1]);
        }

        if (user?.department && results[6]) {
          setDeptBenefits(results[6] as DepartmentBenefits);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [user]);


  const nextPayrollDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  const nextPayrollStr = nextPayrollDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-slate-500">Cargando...</div></div>;

  const vacationLimit = deptBenefits?.vacationDays || 22;
  const vacationUsed = benefits?.vacationDaysUsed || 0;
  const remainingVacations = vacationLimit - vacationUsed;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">¡Hola, {user?.name?.split(' ')[0]}! 👋</h1>
        <p className="text-slate-500 mt-1">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Warning Alert Widget */}
      {pendingWarnings.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertTriangle size={100} className="text-red-500" />
          </div>
          <div className="relative z-10">
            <h2 className="text-red-700 font-bold text-lg flex items-center gap-2 mb-2">
              <AlertTriangle className="text-red-600" />
              Tienes {pendingWarnings.length} {pendingWarnings.length === 1 ? 'Aviso' : 'Avisos'} de Asistencia
            </h2>
            <div className="space-y-3 mt-4">
              {pendingWarnings.slice(0, 2).map((warning) => (
                <div key={warning.id} className="bg-white/60 p-3 rounded-lg border border-red-100 backdrop-blur-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-red-800">
                        {new Date(warning.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-xs text-red-600">
                        Reclamado por: {warning.manager?.name || 'Manager'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {pendingWarnings.length > 2 && (
                <p className="text-xs text-red-600 font-medium pl-1">
                  ... y {pendingWarnings.length - 2} más.
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/news?tab=attendance')}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              Ver y Justificar
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Días de Vacaciones</p>
              <p className="text-2xl font-bold text-slate-900">{remainingVacations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Solicitudes Pendientes</p>
              <p className="text-2xl font-bold text-slate-900">{pendingVacations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Próxima Nómina</p>
              <p className="text-lg font-bold text-slate-900">{nextPayrollStr}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Fichaje Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-blue-100 flex flex-col justify-center">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Clock className="text-blue-600" />
            Control de Asistencia
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-around gap-8">
            <DigitalClock />
            <FichajeButton onFichajeChange={handleFichajeChange} />
          </div>
        </div>

        {/* Today's Fichajes List - Separate Card */}
        <div className="lg:col-span-1">
          <TodayFichajesList ref={fichajesListRef} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Actions and Payroll */}
        <div className="lg:col-span-2 space-y-6">

          {/* Quick Access Button */}
          <button
            onClick={() => navigate('/vacations')}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl p-6 shadow-sm shadow-blue-200 transition-all transform hover:-translate-y-1 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Plane size={32} className="text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold">Gestión de Vacaciones y Ausencias</h3>
                <p className="text-blue-100 text-sm">Solicitar días libres, bajas o consultar histórico</p>
              </div>
            </div>
            <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
              <ChevronRight size={24} />
            </div>
          </button>

          {/* Last Payroll Widget */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg border border-green-100">
                <FileText size={28} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Última Nómina Disponible</h3>
                {lastPayroll ? (
                  <p className="text-slate-500 text-sm capitalize">{lastPayroll.month} {lastPayroll.year}</p>
                ) : (
                  <p className="text-slate-400 text-sm">No hay nóminas disponibles</p>
                )}
              </div>
            </div>

            {lastPayroll && (
              <a
                href={lastPayroll.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-sm"
              >
                <Download size={18} />
                Descargar PDF
              </a>
            )}
          </div>

        </div>

        {/* Right Column: Events and Info */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-full">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-slate-400" />
              Eventos Próximos
            </h2>
            {events.length > 0 ? (
              <div className="space-y-3">
                {events.slice(0, 3).map(event => (
                  <div key={event.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex-shrink-0 w-12 h-12 bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{new Date(event.date).toLocaleDateString('es-ES', { month: 'short' })}</span>
                      <span className="text-lg font-bold text-slate-900">{new Date(event.date).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 text-sm truncate">{event.title}</h4>
                      <p className="text-xs text-slate-500 truncate">{event.location || 'Ubicación pendiente'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">No hay eventos próximos</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div >
  );
};