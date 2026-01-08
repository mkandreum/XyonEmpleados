import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Calendar } from 'lucide-react';

interface EventFormData {
    title: string;
    description: string;
    date: string;
    location: string;
}

export const AdminEvents: React.FC = () => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any | null>(null);
    const [formData, setFormData] = useState<EventFormData>({
        title: '',
        description: '',
        date: '',
        location: ''
    });

    const fetchEvents = async () => {
        try {
            const response = await fetch('/api/events', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
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
            await fetch('/api/admin/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });
            await fetchEvents();
            setShowModal(false);
            setFormData({ title: '', description: '', date: '', location: '' });
        } catch (error) {
            console.error("Error saving event:", error);
            alert("Error al guardar el evento");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este evento?')) return;
        try {
            await fetch(`/api/admin/events/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            await fetchEvents();
        } catch (error) {
            console.error("Error deleting event:", error);
            alert("Error al eliminar el evento");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestión de Eventos</h1>
                    <p className="text-slate-500">Crea y gestiona los eventos del calendario</p>
                </div>
                <button
                    onClick={() => {
                        setEditingEvent(null);
                        setFormData({ title: '', description: '', date: '', location: '' });
                        setShowModal(true);
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 shadow-sm"
                >
                    <Plus size={18} />
                    Nuevo Evento
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Título</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ubicación</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500">Cargando...</td></tr>
                        ) : events.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500">No hay eventos</td></tr>
                        ) : (
                            events.map((event) => (
                                <tr key={event.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{event.title}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{event.location || '-'}</td>
                                    <td className="px-6 py-4 text-right text-sm space-x-2">
                                        <button onClick={() => handleDelete(event.id)} className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded">
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
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="border-b border-slate-200 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Nuevo Evento</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                    Crear Evento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
