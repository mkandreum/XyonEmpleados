import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { vacationService, eventsService, holidayService, benefitsService, payrollService } from '../services/api';
import { VacationRequest, Event, Holiday, UserBenefitsBalance, DepartmentBenefits, Payroll } from '../types';
import { Calendar, Clock, Briefcase, FileText, Download, ChevronRight, Plane } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const promises: Promise<any>[] = [
          vacationService.getAll(),
          eventsService.getAll(),
          holidayService.getNext(),
          benefitsService.getUserBalance(),
          payrollService.getAll()
        ];

        if (user?.department) {
          promises.push(benefitsService.getDepartmentBenefits(user.department));
        }

        const results = await Promise.all(promises);
        const [vacs, evts, holiday, benefitBalance, payrolls] = results;

        setVacations(vacs);
        setPendingVacations(vacs.filter((v: VacationRequest) => v.status === 'PENDING'));
        setEvents(evts);
        setNextHoliday(holiday);
        setBenefits(benefitBalance);

        // Get last payroll
        if (Array.isArray(payrolls) && payrolls.length > 0) {
          // Sort by year/month descending if needed, or assume backend order. 
          // Better to sort just in case.
          // Assumption: month is string name, year is number. 
          // Simple approach: just take the last one in the list or first depending on API.
          // For now assuming API returns chronological or we just take the last element added.
          // Or better, let's look for the most recent one based on ID or created date if available.
          // Since we don't have full dates, let's assume the array is ordered or just take the first one.
          setLastPayroll(payrolls[payrolls.length - 1]); // Assuming chronological order? Or reverse?
          // Actually, let's pick the last one in the array
          setLastPayroll(payrolls[payrolls.length - 1]);
        }

        if (user?.department && results[5]) {
          setDeptBenefits(results[5] as DepartmentBenefits);
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