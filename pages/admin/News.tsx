import React, { useState, useEffect } from 'react';
import { newsService } from '../../services/api';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { NewsItem } from '../../types';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../../components/Modal';

interface NewsFormData {
    title: string;
    summary: string;
    content: string;
    category: 'CORPORATE' | 'EVENT' | 'URGENT';
    imageUrl: string;
}

export const AdminNews: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
    const [formData, setFormData] = useState<NewsFormData>({
        title: '',
        summary: '',
        content: '',
        category: 'CORPORATE',
        category: 'CORPORATE',
        imageUrl: ''
    });
    const { modalState, showAlert, showConfirm, closeModal } = useModal();

    const fetchNews = async () => {
        try {
            const data = await newsService.getAll();
            setNews(data);
        } catch (error) {
            console.error("Error fetching news:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingNews) {
                await newsService.update(editingNews.id, formData);
            } else {
                await newsService.create(formData);
            }
            await fetchNews();
            setShowModal(false);
            setEditingNews(null);
            setFormData({ title: '', summary: '', content: '', category: 'CORPORATE', imageUrl: '' });
        } catch (error) {
            console.error("Error saving news:", error);
            setFormData({ title: '', summary: '', content: '', category: 'CORPORATE', imageUrl: '' });
            showAlert('Noticia guardada correctamente', 'success');
        } catch (error) {
            console.error("Error saving news:", error);
            showAlert("Error al guardar la noticia", 'error');
        }
    };

    const handleDelete = async (id: string) => {
        showConfirm(
            '¿Estás seguro de eliminar esta noticia?',
            async () => {
                try {
                    await newsService.delete(id);
                    await fetchNews();
                    showAlert('Noticia eliminada correctamente', 'success');
                } catch (error) {
                    console.error("Error deleting news:", error);
                    showAlert("Error al eliminar la noticia", 'error');
                }
            },
            'Eliminar Noticia'
        );
    };

    const openEditModal = (newsItem: any) => {
        setEditingNews(newsItem);
        setFormData({
            title: newsItem.title,
            summary: newsItem.summary,
            content: newsItem.content,
            category: newsItem.category,
            imageUrl: newsItem.imageUrl || ''
        });
        setShowModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestión de Noticias</h1>
                    <p className="text-slate-500">Crea y gestiona las noticias del portal</p>
                </div>
                <button
                    onClick={() => {
                        setEditingNews(null);
                        setFormData({ title: '', summary: '', content: '', category: 'CORPORATE', imageUrl: '' });
                        setShowModal(true);
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 shadow-sm"
                >
                    <Plus size={18} />
                    Nueva Noticia
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Título</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Categoría</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500">Cargando...</td></tr>
                        ) : news.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500">No hay noticias</td></tr>
                        ) : (
                            news.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.title}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{item.category}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(item.date).toLocaleDateString('es-ES')}</td>
                                    <td className="px-6 py-4 text-right text-sm space-x-2">
                                        <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded">
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
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold">{editingNews ? 'Editar Noticia' : 'Nueva Noticia'}</h2>
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
                                <label className="block text-sm font-medium text-slate-700 mb-1">Resumen</label>
                                <textarea
                                    value={formData.summary}
                                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    rows={2}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contenido</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    rows={6}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                >
                                    <option value="CORPORATE">Corporativa</option>
                                    <option value="EVENT">Evento</option>
                                    <option value="URGENT">Urgente</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">URL de Imagen</label>
                                <input
                                    type="url"
                                    value={formData.imageUrl}
                                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                    {editingNews ? 'Actualizar' : 'Crear'}
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
