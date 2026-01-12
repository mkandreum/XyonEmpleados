import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { newsService, lateNotificationService } from '../services/api';
import { NewsItem, LateArrivalNotification } from '../types';
import { Calendar, Tag, X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export const NewsPage: React.FC = () => {
  // State for sub-tabs and data
  const { user } = useAuth() as any;
  const [activeTab, setActiveTab] = useState<'news' | 'attendance'>('news');
  // Removed attendanceSubTab state
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
    // Check URL parameters for auto-open on redirect from notification
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const notifyIdParam = params.get('notifyId');

    if (tabParam === 'attendance') {
      setActiveTab('attendance');
    }

    // Store notifyId to auto-open modal after warnings are loaded
    if (notifyIdParam) {
      sessionStorage.setItem('pendingNotifyId', notifyIdParam);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'news') {
      fetchNews();
    } else {
      if (user?.role !== 'EMPLOYEE') {
        fetchSentWarnings();
      }
      fetchWarnings();
    }
  }, [activeTab]);

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

      // Auto-open modal if redirected from notification
      const pendingId = sessionStorage.getItem('pendingNotifyId');
      if (pendingId) {
        const targetWarning = data.find(w => w.id === pendingId);
        if (targetWarning && !targetWarning.justificado) {
          handleOpenJustify(targetWarning);
        }
        sessionStorage.removeItem('pendingNotifyId');
      }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">Comunicados</h1>
          <p className="text-slate-500 dark:text-slate-400 transition-colors">Centro de mensajes y novedades.</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start transition-colors animate-slide-up delay-75">
          <button
            onClick={() => setActiveTab('news')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'news'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
          >
            Noticias
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'attendance'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up delay-150">
          {loading ? (
            <div className="col-span-full text-center py-10 text-slate-500 dark:text-slate-400">Cargando noticias...</div>
          ) : news.length === 0 ? (
            <div className="col-span-full text-center py-10 text-slate-500 dark:text-slate-400">No hay noticias publicadas.</div>
          ) : (
            news.map((item) => (
              <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-md transition-all">
                <div className="h-48 overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded transition-colors">
                      <Tag size={12} />
                      {item.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 transition-colors">
                      <Calendar size={12} />
                      {new Date(item.date).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 transition-colors">{item.title}</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-3 transition-colors">
                    {item.summary}
                  </p>
                  <button
                    onClick={() => setSelectedNews(item)}
                    className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
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
        <div className="space-y-8 animate-slide-up delay-150">
          {/* Received Warnings Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 transition-colors">
              Avisos Recibidos
            </h2>
            {loading ? (
              <div className="text-center py-6 text-slate-500 dark:text-slate-400">Cargando avisos...</div>
            ) : warnings.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 text-center transition-colors">
                <CheckCircle className="mx-auto text-green-500 mb-4" size={32} />
                <h3 className="text-md font-medium text-slate-900 dark:text-white">Todo en orden</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">No tienes avisos pendientes.</p>
              </div>
            ) : (
              warnings.map((warning) => (
                <div key={warning.id} className={`rounded-xl shadow-sm border p-6 transition-all ${warning.justificado ? 'bg-green-50/30 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' : 'bg-red-50/30 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'}`}>
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg transition-colors ${warning.justificado ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                        {warning.justificado ? (
                          <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                        ) : (
                          <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                          Llegada Tarde
                          {!warning.justificado && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300">
                              Pendiente
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 transition-colors">
                          Has recibido un aviso por llegada tarde el día <span className="font-medium dark:text-slate-200">{new Date(warning.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>.
                        </p>
                        {warning.justificado && (
                          <div className="mt-3 bg-white/50 dark:bg-slate-900/50 p-3 rounded-lg border border-green-100 dark:border-green-900/30 text-sm transition-colors">
                            <span className="font-medium text-green-800 dark:text-green-400">Tu justificación:</span>
                            <p className="text-slate-700 dark:text-slate-300 mt-1 italic">"{warning.justificacionTexto}"</p>
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
                            className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(warning.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sent Warnings Section (Managers Only) */}
          {user?.role !== 'EMPLOYEE' && (
            <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white pb-2 transition-colors">
                Avisos Enviados por Mí
              </h2>
              {loading ? (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400">Cargando avisos enviados...</div>
              ) : sentWarnings.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 text-center opacity-75 transition-colors">
                  <Clock className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={32} />
                  <h3 className="text-md font-medium text-slate-900 dark:text-white">Sin historial</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">No has enviado avisos aún.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {sentWarnings.map((warning) => (
                    <div key={warning.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 transition-colors">
                            <Clock className="text-blue-600 dark:text-blue-400" size={20} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm transition-colors">
                              Aviso a {warning.user?.name || 'Empleado'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Fecha incidencia: <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(warning.fecha).toLocaleDateString('es-ES')}</span>
                            </p>

                            <div className="mt-2 flex items-center gap-3 text-xs">
                              <div className="flex items-center gap-1.5">
                                {warning.leido ? (
                                  <><CheckCircle size={14} className="text-green-500 dark:text-green-400" /> <span className="text-green-700 dark:text-green-400 font-medium">Leído</span></>
                                ) : (
                                  <><Clock size={14} className="text-slate-400 dark:text-slate-500" /> <span className="text-slate-500 dark:text-slate-500">No leído</span></>
                                )}
                              </div>
                              <div className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                              <div className="flex items-center gap-1.5">
                                {warning.justificado ? (
                                  <><Tag size={14} className="text-green-500 dark:text-green-400" /> <span className="text-green-700 dark:text-green-400 font-medium">Justificado</span></>
                                ) : (
                                  <><AlertTriangle size={14} className="text-orange-500 dark:text-orange-400" /> <span className="text-orange-600 dark:text-orange-400 font-medium">Sin justificar</span></>
                                )}
                              </div>
                            </div>

                            {warning.justificado && warning.justificacionTexto && (
                              <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-800 text-xs transition-colors">
                                <span className="font-medium text-slate-700 dark:text-slate-300">Justificación:</span>
                                <p className="text-slate-600 dark:text-slate-400 mt-0.5 italic">"{warning.justificacionTexto}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 self-start md:self-center bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded transition-colors">
                          Enviado: {new Date(warning.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* News Detail Modal */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedNews(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center z-10 transition-colors">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors">{selectedNews.title}</h2>
              <button onClick={() => setSelectedNews(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400">
                <X size={20} />
              </button>
            </div>
            {selectedNews.imageUrl && (
              <img src={selectedNews.imageUrl} alt={selectedNews.title} className="w-full h-64 object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded transition-colors">
                  <Tag size={12} />
                  {selectedNews.category}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 transition-colors">
                  <Calendar size={12} />
                  {new Date(selectedNews.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-wrap transition-colors">
                {selectedNews.content}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Justification Modal */}
      {showJustifyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowJustifyModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 pb-24 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 transition-colors">Justificar Llegada Tarde</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 transition-colors">
              Por favor, explica el motivo de tu llegada tarde el día {selectedWarning && new Date(selectedWarning.fecha).toLocaleDateString('es-ES')}.
            </p>
            <form onSubmit={handleSubmitJustification}>
              <textarea
                className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 min-h-[120px] text-sm mb-4 p-3 border transition-colors"
                placeholder="Escribe tu justificación aquí..."
                value={justificationText}
                onChange={(e) => setJustificationText(e.target.value)}
                required
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowJustifyModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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