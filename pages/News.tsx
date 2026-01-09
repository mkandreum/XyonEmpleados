import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { newsService, lateNotificationService } from '../services/api';
import { NewsItem, LateArrivalNotification } from '../types';
import { Calendar, Tag, X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export const NewsPage: React.FC = () => {
  // State for sub-tabs and data
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'news' | 'attendance'>('news');
  const [attendanceSubTab, setAttendanceSubTab] = useState<'received' | 'sent'>('received');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [warnings, setWarnings] = useState<LateArrivalNotification[]>([]);
  const [sentWarnings, setSentWarnings] = useState<LateArrivalNotification[]>([]); // For managers
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  // Justification Modal State
  const [showJustifyModal, setShowJustifyModal] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<LateArrivalNotification | null>(null);
  const [justificationText, setJustificationText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'news') {
      fetchNews();
    } else {
      if (attendanceSubTab === 'received') {
        fetchWarnings();
      } else {
        fetchSentWarnings();
      }
    }
  }, [activeTab, attendanceSubTab]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const data = await newsService.getAll();
      setNews(data);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarnings = async () => {
    setLoading(true);
    try {
      const data = await lateNotificationService.getAll();
      setWarnings(data);
    } catch (error) {
      console.error("Error fetching warnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSentWarnings = async () => {
    setLoading(true);
    try {
      const data = await lateNotificationService.getSent();
      setSentWarnings(data);
    } catch (error) {
      console.error("Error fetching sent warnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenJustify = (warning: LateArrivalNotification) => {
    setSelectedWarning(warning);
    setJustificationText('');
    setShowJustifyModal(true);
  };

  const handleSubmitJustification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarning || !justificationText.trim()) return;

    setSubmitting(true);
    try {
      await lateNotificationService.justify(selectedWarning.id, justificationText);
      // Success feedback
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
      toast.textContent = '✓ Justificación enviada correctamente';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

      setShowJustifyModal(false);
      fetchWarnings(); // Refresh list
    } catch (error) {
      console.error("Error submitting justification:", error);
      alert("Error al enviar la justificación. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comunicados</h1>
          <p className="text-slate-500">Centro de mensajes y novedades.</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('news')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'news'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Noticias
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'attendance'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Avisos de Asistencia
            {warnings.filter(w => !w.justificado).length > 0 && (
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'news' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-10 text-slate-500">Cargando noticias...</div>
          ) : news.length === 0 ? (
            <div className="col-span-full text-center py-10 text-slate-500">No hay noticias publicadas.</div>
          ) : (
            news.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-48 overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      <Tag size={12} />
                      {item.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Calendar size={12} />
                      {new Date(item.date).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2">{item.title}</h2>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                    {item.summary}
                  </p>
                  <button
                    onClick={() => setSelectedNews(item)}
                    className="text-blue-600 text-sm font-semibold hover:text-blue-800 transition-colors"
                  >
                    Leer más &rarr;
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Attendance Warnings Tab */
        <div className="space-y-4">
          {/* Sub-tabs for Managers */}
          {user?.role !== 'EMPLOYEE' && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setAttendanceSubTab('received')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${attendanceSubTab === 'received' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Recibidos
              </button>
              <button
                onClick={() => setAttendanceSubTab('sent')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${attendanceSubTab === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Enviados
              </button>
            </div>
          )}

          {attendanceSubTab === 'received' ? (
            /* Received Warnings View (Existing) */
            <>
              {loading ? (
                <div className="text-center py-10 text-slate-500">Cargando avisos...</div>
              ) : warnings.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
                  <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-slate-900">Todo en orden</h3>
                  <p className="text-slate-500">No tienes avisos de asistencia pendientes.</p>
                </div>
              ) : (
                warnings.map((warning) => (
                  <div key={warning.id} className={`bg-white rounded-xl shadow-sm border p-6 transition-all ${warning.justificado ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${warning.justificado ? 'bg-green-100' : 'bg-red-100'}`}>
                          {warning.justificado ? (
                            <CheckCircle className="text-green-600" size={24} />
                          ) : (
                            <AlertTriangle className="text-red-600" size={24} />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            Llegada Tarde
                            {!warning.justificado && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Pendiente
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">
                            Has recibido un aviso por llegada tarde el día <span className="font-medium">{new Date(warning.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>.
                          </p>
                          {warning.justificado && (
                            <div className="mt-3 bg-white/50 p-3 rounded-lg border border-green-100 text-sm">
                              <span className="font-medium text-green-800">Tu justificación:</span>
                              <p className="text-slate-700 mt-1 italic">"{warning.justificacionTexto}"</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          {!warning.leido && (
                            <button
                              onClick={async () => {
                                try {
                                  await lateNotificationService.markAsRead(warning.id);
                                  fetchWarnings();
                                } catch (e) { console.error(e); }
                              }}
                              className="px-3 py-1 bg-white border border-slate-300 text-slate-600 text-xs font-medium rounded hover:bg-slate-50 transition-colors"
                            >
                              Marcar Leído
                            </button>
                          )}
                          {!warning.justificado && (
                            <button
                              onClick={() => handleOpenJustify(warning)}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                            >
                              Justificar
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(warning.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            /* Sent Warnings View (New) */
            <>
              {loading ? (
                <div className="text-center py-10 text-slate-500">Cargando avisos enviados...</div>
              ) : sentWarnings.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
                  <Clock className="mx-auto text-slate-300 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-slate-900">Sin avisos enviados</h3>
                  <p className="text-slate-500">No has enviado avisos de llegada tarde.</p>
                </div>
              ) : (
                sentWarnings.map((warning) => (
                  <div key={warning.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-blue-50">
                          <Clock className="text-blue-600" size={24} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            Aviso a {warning.user?.name || 'Empleado'}
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">
                            Día: <span className="font-medium">{new Date(warning.fecha).toLocaleDateString('es-ES')}</span>
                          </p>

                          <div className="mt-3 flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5">
                              {warning.leido ? (
                                <><CheckCircle size={16} className="text-green-500" /> <span className="text-green-700 font-medium">Leído</span></>
                              ) : (
                                <><Clock size={16} className="text-slate-400" /> <span className="text-slate-500">No leído</span></>
                              )}
                            </div>
                            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                            <div className="flex items-center gap-1.5">
                              {warning.justificado ? (
                                <><Tag size={16} className="text-green-500" /> <span className="text-green-700 font-medium">Justificado</span></>
                              ) : (
                                <><AlertTriangle size={16} className="text-orange-500" /> <span className="text-orange-600 font-medium">Sin justificar</span></>
                              )}
                            </div>
                          </div>

                          {warning.justificado && warning.justificacionTexto && (
                            <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                              <span className="font-medium text-slate-700">Justificación:</span>
                              <p className="text-slate-600 mt-1 italic">"{warning.justificacionTexto}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">
                        Enviado: {new Date(warning.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}

      {/* News Detail Modal */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedNews(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-slate-900">{selectedNews.title}</h2>
              <button onClick={() => setSelectedNews(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            {selectedNews.imageUrl && (
              <img src={selectedNews.imageUrl} alt={selectedNews.title} className="w-full h-64 object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  <Tag size={12} />
                  {selectedNews.category}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <Calendar size={12} />
                  {new Date(selectedNews.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="prose max-w-none text-slate-700 whitespace-pre-wrap">
                {selectedNews.content}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Justification Modal */}
      {showJustifyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowJustifyModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Justificar Llegada Tarde</h3>
            <p className="text-sm text-slate-500 mb-4">
              Por favor, explica el motivo de tu llegada tarde el día {selectedWarning && new Date(selectedWarning.fecha).toLocaleDateString('es-ES')}.
            </p>
            <form onSubmit={handleSubmitJustification}>
              <textarea
                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 min-h-[120px] text-sm mb-4 p-3 border"
                placeholder="Escribe tu justificación aquí..."
                value={justificationText}
                onChange={(e) => setJustificationText(e.target.value)}
                required
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowJustifyModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !justificationText.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'Enviar Justificación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};