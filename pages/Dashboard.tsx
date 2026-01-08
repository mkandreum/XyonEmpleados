import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { notificationService, vacationService } from '../services/api';
import { Notification, VacationRequest } from '../types';
import { Calendar, CheckCircle2, Clock, Briefcase, AlertCircle, Plane, FileText, Info, Upload, X } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [pendingVacations, setPendingVacations] = useState<VacationRequest[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [nextHoliday, setNextHoliday] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Quick access modal state
  const [showQuickAccessModal, setShowQuickAccessModal] = useState<string | null>(null);
  const [quickAccessForm, setQuickAccessForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: 'VACATION',
    justificationUrl: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [notifs, vacs, evts, holiday] = await Promise.all([
          notificationService.getAll(),
          vacationService.getAll(),
          fetch('/api/events', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
          fetch('/api/holidays/next', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json())
        ]);
        setNotifications(notifs);
        setVacations(vacs);
        setPendingVacations(vacs.filter((v: VacationRequest) => v.status === 'PENDING'));
        setEvents(evts);
        setNextHoliday(holiday);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleQuickAccess = (type: string) => {
    if (type === 'info') {
      navigate('/absences');
    } else {
      setQuickAccessForm({
        ...quickAccessForm,
        type: type === 'vacation' ? 'VACATION' : type === 'sick' ? 'SICK_LEAVE' : 'PERSONAL'
      });
      setShowQuickAccessModal(type);
    }
  };

  const handleQuickAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const start = new Date(quickAccessForm.startDate);
      const end = new Date(quickAccessForm.endDate);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      await vacationService.create({
        startDate: quickAccessForm.startDate,
        endDate: quickAccessForm.endDate,
        days: diffDays,
        type: quickAccessForm.type as any,
        status: 'PENDING' as any,
        justificationUrl: quickAccessForm.justificationUrl || undefined
      });

      alert('Solicitud enviada correctamente');
      setShowQuickAccessModal(null);
      window.location.reload();
    } catch (error) {
      alert('Error al enviar la solicitud');
    }
  };

  const nextPayrollDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  const nextPayrollStr = nextPayrollDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-slate-500">Cargando...</div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">¡Hola, {user?.name?.split(' ')[0]}! 👋</h1>
        <p className="text-slate-500 mt-1">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Días de Vacaciones</p>
              <p className="text-2xl font-bold text-slate-900">{22 - vacations.filter(v => v.status === 'APPROVED' && v.type === 'VACATION').reduce((acc, v) => acc + v.days, 0)}</p>
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
              {loading ? <div className="p-4 text-center">Cargando...</div> : notifications.slice(0, 5).map(notif => (
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
              {notifications.length === 0 && <div className="p-8 text-center text-slate-400">No tienes notificaciones nuevas</div>}
            </div>
          </div>

        {/* Quick Access */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Accesos Rápidos</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleQuickAccess('vacation')}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Plane size={24} />
                </div>
                <span className="text-sm font-medium text-slate-700">Vacaciones</span>
              </button>

              <button
                onClick={() => handleQuickAccess('sick')}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-slate-200 hover:border-red-500 hover:bg-red-50 transition-all group"
              >
                <div className="p-3 bg-red-100 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <FileText size={24} />
                </div>
                <span className="text-sm font-medium text-slate-700">Baja Médica</span>
              </button>

              <button
                onClick={() => handleQuickAccess('absence')}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-slate-200 hover:border-yellow-500 hover:bg-yellow-50 transition-all group"
              >
                <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg group-hover:bg-yellow-600 group-hover:text-white transition-colors">
                  <Calendar size={24} />
                </div>
                <span className="text-sm font-medium text-slate-700">Ausencias</span>
              </button>

              <button
                onClick={() => handleQuickAccess('info')}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="p-3 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <Info size={24} />
                </div>
                <span className="text-sm font-medium text-slate-700">Horas Libres</span>
              </button>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Eventos Próximos</h2>
            {events.length > 0 ? (
              <div className="space-y-3">
                {events.slice(0, 3).map(event => (
                  <div key={event.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex flex-col items-center justify-center">
                      <span className="text-xs text-blue-600 font-semibold">{new Date(event.date).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}</span>
                      <span className="text-lg font-bold text-blue-600">{new Date(event.date).getDate()}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 text-sm">{event.title}</h4>
                      <p className="text-xs text-slate-500">{event.location || 'Por confirmar'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-4">No hay eventos próximos</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Access Modal */}
      {showQuickAccessModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowQuickAccessModal(null)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-200 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {showQuickAccessModal === 'vacation' && 'Solicitar Vacaciones'}
                {showQuickAccessModal === 'sick' && 'Solicitar Baja Médica'}
                {showQuickAccessModal === 'absence' && 'Solicitar Ausencia'}
              </h2>
              <button onClick={() => setShowQuickAccessModal(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleQuickAccessSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio</label>
                <input
                  type="date"
                  value={quickAccessForm.startDate}
                  onChange={(e) => setQuickAccessForm({ ...quickAccessForm, startDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin</label>
                <input
                  type="date"
                  value={quickAccessForm.endDate}
                  onChange={(e) => setQuickAccessForm({ ...quickAccessForm, endDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>
              {(showQuickAccessModal === 'sick' || showQuickAccessModal === 'absence') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Justificante <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={quickAccessForm.justificationUrl}
                    onChange={(e) => setQuickAccessForm({ ...quickAccessForm, justificationUrl: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                    placeholder="URL del justificante"
                    required
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowQuickAccessModal(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Enviar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const [notifications, setNotifications] = useState<Notification[]>([]);
const [vacations, setVacations] = useState<VacationRequest[]>([]);
const [pendingVacations, setPendingVacations] = useState<VacationRequest[]>([]);
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
      setPendingVacations(vacs.filter((v: VacationRequest) => v.status === 'PENDING'));
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