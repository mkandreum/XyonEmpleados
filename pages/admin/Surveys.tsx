import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react';

interface Survey {
    id: string;
    title: string;
    description: string;
    url: string;
    isActive: boolean;
    startDate: string;
    endDate: string | null;
}

export const AdminSurveys: React.FC = () => {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        url: '',
        isActive: true,
        startDate: new Date().toISOString().split('T')[0],
        endDate: ''
    });

    useEffect(() => {
        fetchSurveys();
    }, []);

    const fetchSurveys = async () => {
        try {
            const response = await fetch('/api/admin/surveys', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            setSurveys(data);
        } catch (error) {
            console.error('Error fetching surveys:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingSurvey ? `/api/admin/surveys/${editingSurvey.id}` : '/api/admin/surveys';
            const method = editingSurvey ? 'PUT' : 'POST';

            await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            fetchSurveys();
            closeModal();
            alert(editingSurvey ? 'Encuesta actualizada' : 'Encuesta creada');
        } catch (error) {
            alert('Error al guardar la encuesta');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta encuesta?')) return;

        try {
            await fetch(`/api/admin/surveys/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            fetchSurveys();
            alert('Encuesta eliminada');
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    const toggleActive = async (survey: Survey) => {
        try {
            await fetch(`/api/admin/surveys/${survey.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ ...survey, isActive: !survey.isActive })
            });
            fetchSurveys();
        } catch (error) {
            alert('Error al actualizar estado');
        }
    };

    const openModal = (survey?: Survey) => {
        if (survey) {
            setEditingSurvey(survey);
            setFormData({
                title: survey.title,
                description: survey.description,
                url: survey.url,
                isActive: survey.isActive,
                startDate: survey.startDate.split('T')[0],
                endDate: survey.endDate ? survey.endDate.split('T')[0] : ''
            });
        } else {
            setEditingSurvey(null);
            setFormData({
                title: '',
                description: '',
                url: '',
                isActive: true,
                startDate: new Date().toISOString().split('T')[0],
                endDate: ''
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingSurvey(null);
    };

    if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-slate-500">Cargando...</div></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestión de Encuestas</h1>
                    <p className="text-slate-500">Administra las encuestas del portal</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus size={18} />
                    Nueva Encuesta
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Título</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">URL</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fechas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {surveys.length > 0 ? (
                            surveys.map((survey) => (
                                <tr key={survey.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-900">{survey.title}</div>
                                        <div className="text-xs text-slate-500">{survey.description.substring(0, 50)}...</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-blue-600 truncate max-w-xs">
                                        <a href={survey.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                            {survey.url}
                                        </a>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(survey.startDate).toLocaleDateString('es-ES')}
                                        {survey.endDate && ` - ${new Date(survey.endDate).toLocaleDateString('es-ES')}`}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleActive(survey)}
                                            className="flex items-center gap-2"
                                        >
                                            {survey.isActive ? (
                                                <>
                                                    <ToggleRight size={24} className="text-green-600" />
                                                    <span className="text-sm text-green-600 font-medium">Activa</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ToggleLeft size={24} className="text-slate-400" />
                                                    <span className="text-sm text-slate-400">Inactiva</span>
                                                </>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openModal(survey)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(survey.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    No hay encuestas creadas
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
                    <div className="bg-white rounded-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="border-b border-slate-200 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold">{editingSurvey ? 'Editar Encuesta' : 'Nueva Encuesta'}</h2>
                            <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg">
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
                                    className="w-full border border-slate-300 rounded-lg p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2"
                                    rows={3}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">URL de la Encuesta</label>
                                <input
                                    type="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2"
                                    placeholder="https://forms.google.com/..."
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin (Opcional)</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="rounded"
                                />
                                <label className="text-sm text-slate-700">Activar encuesta inmediatamente</label>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    {editingSurvey ? 'Actualizar' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
