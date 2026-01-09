import React, { useState, useEffect } from 'react';
import { eventsService } from '../../services/api';
import { Plus, Edit, Trash2, X, Calendar } from 'lucide-react';
import { Event } from '../../types';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../../components/Modal';

interface EventFormData {
    title: string;
    description: string;
    date: string;
    location: string;
}

export const AdminEvents: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [formData, setFormData] = useState<EventFormData>({
        title: '',
        description: '',
        date: '',
        location: ''
    });
    const { modalState, showAlert, showConfirm, closeModal } = useModal();

    const fetchEvents = async () => {
        try {
            const data = await eventsService.getAll();
            setEvents(data);
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingEvent) {
                // Update
                await eventsService.update(editingEvent.id, formData);
            } else {
                // Create
                await eventsService.create(formData);
            }
            await fetchEvents();
            setShowModal(false);
            setFormData({ title: '', description: '', date: '', location: '' });
            setEditingEvent(null);
            showAlert(editingEvent ? 'Evento actualizado correctamente' : 'Evento creado correctamente', 'success');
        } catch (error) {
            console.error("Error saving event:", error);
            showAlert("Error al guardar el evento", 'error');
        }
    };

    const handleDelete = async (id: string) => {
        showConfirm(
            '¿Estás seguro de eliminar este evento?',
            async () => {
                try {
                    await eventsService.delete(id);
                    await fetchEvents();
                    showAlert('Evento eliminado correctamente', 'success');
                } catch (error) {
                    console.error("Error deleting event:", error);
                    showAlert("Error al eliminar el evento", 'error');
                }
            },
            'Eliminar Evento'
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Eventos</h1>
                    <p className="text-slate-500 dark:text-slate-400">Crea y gestiona los eventos del calendario</p>
                </div>
                <button
                    onClick={() => {
                        setEditingEvent(null);
                        setFormData({ title: '', description: '', date: '', location: '' });
                        setShowModal(true);
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 shadow-sm transition-colors"
                >
                    <Plus size={18} />
                    Nuevo Evento
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 transition-colors">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Título</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Ubicación</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">Cargando...</td></tr>
                        ) : events.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">No hay eventos</td></tr>
                        ) : (
                            events.map((event) => (
                                <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{event.title}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        {new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{event.location || '-'}</td>
                                    <td className="px-6 py-4 text-right text-sm space-x-2">
                                        <button onClick={() => handleDelete(event.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-xl transition-colors" onClick={(e) => e.stopPropagation()}>
                        <div className="border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nuevo Evento</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <X size={20} className="text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-900 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-900 dark:text-white"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-900 dark:text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ubicación</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                                    Crear Evento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Global Modal */}
            <Modal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                title={modalState.title}
                message={modalState.message}
                type={modalState.type}
                onConfirm={modalState.onConfirm}
            />
        </div>
    );
};
