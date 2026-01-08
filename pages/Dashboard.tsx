import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { notificationService, vacationService, eventsService, holidayService, benefitsService } from '../services/api';
import { Notification, VacationRequest, Event, Holiday, UserBenefitsBalance, DepartmentBenefits } from '../types';
import { Calendar, CheckCircle2, Clock, Briefcase, AlertCircle, Plane, FileText, Info, Upload, X } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { Modal } from '../components/Modal';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [pendingVacations, setPendingVacations] = useState<VacationRequest[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [nextHoliday, setNextHoliday] = useState<Holiday | null>(null);
  const [benefits, setBenefits] = useState<UserBenefitsBalance | null>(null);
  const [deptBenefits, setDeptBenefits] = useState<DepartmentBenefits | null>(null);
  const [loading, setLoading] = useState(true);
  const { modalState, showAlert, closeModal } = useModal();

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
        const promises: Promise<any>[] = [
          notificationService.getAll(),
          vacationService.getAll(),
          eventsService.getAll(),
          holidayService.getNext(),
          benefitsService.getUserBalance()
        ];

        if (user?.department) {
          promises.push(benefitsService.getDepartmentBenefits(user.department));
        }

        const results = await Promise.all(promises);
        const [notifs, vacs, evts, holiday, benefitBalance] = results;

        setNotifications(notifs);
        setVacations(vacs);
        setPendingVacations(vacs.filter((v: VacationRequest) => v.status === 'PENDING'));
        setEvents(evts);
        setNextHoliday(holiday);
        setBenefits(benefitBalance);
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

      setQuickAccessForm({ ...quickAccessForm, justificationUrl: '' });
      showAlert('Solicitud enviada correctamente', 'success');
      setShowQuickAccessModal(null);
      // Refresh logic would go here or force reload
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      showAlert('Error al enviar la solicitud', 'error');
    }
  };

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
    </div>
      </div >

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
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{new Date(notif.date).toLocaleDateString()}</span>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await notificationService.delete(notif.id);
                          setNotifications(prev => prev.filter(n => n.id !== notif.id));
                        } catch (error) {
                          console.error("Failed to delete notification", error);
                        }
                      }}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-slate-200 transition-colors"
                      title="Eliminar"
                    >
                      <X size={14} />
                    </button>
                  </div>
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
              <span className="text-sm font-medium text-slate-700">Horas médicas</span>
            </button>

            <button
              onClick={() => handleQuickAccess('absence')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-slate-200 hover:border-yellow-500 hover:bg-yellow-50 transition-all group"
            >
              <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg group-hover:bg-yellow-600 group-hover:text-white transition-colors">
                <Calendar size={24} />
              </div>
              <span className="text-sm font-medium text-slate-700">Asuntos Propios</span>
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
  </div>

{/* Quick Access Modal */ }
{
  showQuickAccessModal && (
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
  )
}
{/* Global Modal */ }
<Modal
  isOpen={modalState.isOpen}
  onClose={closeModal}
  title={modalState.title}
  message={modalState.message}
  type={modalState.type}
  onConfirm={modalState.onConfirm}
/>
    </div >
  );
};