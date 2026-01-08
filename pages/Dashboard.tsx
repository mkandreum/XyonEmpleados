import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationService, vacationService } from '../services/api';
import { Notification, VacationRequest } from '../types';
import { Calendar, CheckCircle2, Clock, Briefcase } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [nextHoliday, setNextHoliday] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [notifs, vacs, evts, holiday] = await Promise.all([
          notificationService.getAll(),
          vacationService.getAll(),
          fetch('/api/events').then(r => r.json()).catch(() => []),
          fetch('/api/holidays/next').then(r => r.json()).catch(() => null)
        ]);
        setNotifications(notifs);
        setVacations(vacs);
        setEvents(evts);
        setNextHoliday(holiday);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate vacation days left
  const totalVacationDays = 22;
  const takenDays = vacations
    .filter(v => v.status === 'APPROVED' && v.type === 'VACATION')
    .reduce((acc, curr) => acc + curr.days, 0);
  const remainingDays = totalVacationDays - takenDays;

  // Calculate next payroll date (last day of current month)
  const today = new Date();
  const nextPayrollDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const nextPayrollStr = nextPayrollDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hola, {user?.name.split(' ')[0]} 👋</h1>
          <p className="text-slate-500">Bienvenido a tu portal del empleado. Aquí tienes tu resumen de hoy.</p>
        </div>
        <div className="text-sm text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Días Vacaciones</p>
              <p className="text-2xl font-bold text-slate-900">{remainingDays} <span className="text-xs font-normal text-slate-400">/ {totalVacationDays}</span></p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Notificaciones</p>
              <p className="text-2xl font-bold text-slate-900">{notifications.filter(n => !n.read).length}</p>
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Próximo Festivo</p>
              <p className="text-lg font-bold text-slate-900">
                {nextHoliday ? new Date(nextHoliday.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notifications Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900">Notificaciones Recientes</h2>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Ver todas</button>
            </div>
            <div className="divide-y divide-slate-100">
              {loading ? <div className="p-4 text-center">Cargando...</div> : notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-4 hover:bg-slate-50 transition-colors flex items-start gap-4 cursor-pointer ${!notif.read ? 'bg-blue-50/30' : ''}`}
                  onClick={async () => {
                    if (!notif.read) {
                      try {
                        await notificationService.markAsRead(notif.id);
                        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                      } catch (error) {
                        console.error("Failed to mark notification as read", error);
                      }
                    }
                  }}
                >
                  <div className={`mt-1 w-2 h-2 rounded-full ${!notif.read ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-semibold text-slate-900">{notif.title}</h3>
                      <span className="text-xs text-slate-400">{new Date(notif.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{notif.message}</p>
                  </div>
                </div>
              ))}
              {!loading && notifications.length === 0 && (
                <div className="p-6 text-center text-slate-500">No tienes notificaciones nuevas.</div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-2">Encuesta de Clima Laboral 2024</h2>
              <p className="text-blue-100 mb-4 max-w-lg">Tu opinión es fundamental para seguir mejorando nuestro entorno de trabajo. Participa en la encuesta anual, es totalmente anónima.</p>
              <button className="bg-white text-blue-600 px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors">
                Participar Ahora
              </button>
            </div>
            {/* Decorative background circle */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Accesos Rápidos</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-center">
                <span className="block text-2xl mb-1">🏥</span>
                <span className="text-xs font-medium text-slate-600">Baja Médica</span>
              </button>
              <button className="p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-center">
                <span className="block text-2xl mb-1">✈️</span>
                <span className="text-xs font-medium text-slate-600">Solicitar Viaje</span>
              </button>
              <button className="p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-center">
                <span className="block text-2xl mb-1">🎫</span>
                <span className="text-xs font-medium text-slate-600">Tickets</span>
              </button>
              <button className="p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-center">
                <span className="block text-2xl mb-1">💻</span>
                <span className="text-xs font-medium text-slate-600">Soporte IT</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Eventos Próximos</h2>
            <div className="space-y-4">
              {events.length === 0 ? (
                <p className="text-sm text-slate-500">No hay eventos próximos</p>
              ) : (
                events.slice(0, 2).map((event) => (
                  <div key={event.id} className="flex items-center gap-3">
                    <div className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded text-xs text-center min-w-[50px]">
                      {new Date(event.date).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}<br />
                      <span className="text-lg">{new Date(event.date).getDate()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                      <p className="text-xs text-slate-500">{event.location || 'Por confirmar'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};