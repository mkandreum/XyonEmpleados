import React, { useState, useEffect } from 'react';
import { newsService, uploadService } from '../../services/api';
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
    const [uploading, setUploading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
    const [formData, setFormData] = useState<NewsFormData>({
        title: '',
        summary: '',
        content: '',
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
            showAlert("Error al obtener noticias", 'error');
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
            <div className="flex justify-between items-center animate-slide-up">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Noticias</h1>
                    <p className="text-slate-500 dark:text-slate-400">Crea y gestiona las noticias del portal</p>
                </div>
                <button
                    onClick={() => {
                        setEditingNews(null);
                        setFormData({ title: '', summary: '', content: '', category: 'CORPORATE', imageUrl: '' });
                        setShowModal(true);
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 shadow-sm transition-colors"
                >
                    <Plus size={18} />
                    Nueva Noticia
                </button>
            </div>

            {/* Desktop Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors animate-slide-up delay-75 hidden sm:block">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Título</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Categoría</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Fecha</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">Cargando...</td></tr>
                        ) : news.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">No hay noticias</td></tr>
                        ) : (
                            news.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{item.title}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{item.category}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{new Date(item.date).toLocaleDateString('es-ES')}</td>
                                    <td className="px-6 py-4 text-right text-sm space-x-2">
                                        <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-4 animate-slide-up delay-75">
                {loading ? (
                    <div className="text-center p-4 text-slate-500 dark:text-slate-400">Cargando...</div>
                ) : news.length === 0 ? (
                    <div className="text-center p-4 text-slate-500 dark:text-slate-400">No hay noticias</div>
                ) : (
                    news.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">{item.title}</h3>
                                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                                    {item.category.charAt(0) + item.category.slice(1).toLowerCase()}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{new Date(item.date).toLocaleDateString('es-ES')}</p>
                            <div className="flex justify-end gap-2 border-t border-slate-50 dark:border-slate-800 pt-2">
                                <button onClick={() => openEditModal(item)} className="p-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded">
                                    <Edit size={14} />
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 bg-red-50 dark:bg-red-900/20 rounded">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-xl transition-colors" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center z-10">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingNews ? 'Editar Noticia' : 'Nueva Noticia'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <X size={20} className="text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 pb-24 space-y-4">
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Resumen</label>
                                <textarea
                                    value={formData.summary}
                                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-900 dark:text-white"
                                    rows={2}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contenido</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-900 dark:text-white"
                                    rows={6}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-900 dark:text-white"
                                >
                                    <option value="CORPORATE">Corporativa</option>
                                    <option value="EVENT">Evento</option>
                                    <option value="URGENT">Urgente</option>
                                </select>
                            </div>
                            {/* ... File Input styles are handled by global input styles mostly, but wrapper needs care ... */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Imagen de Noticia</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            setUploading(true);
                                            try {
                                                const response = await uploadService.uploadNewsImage(file);
                                                setFormData({ ...formData, imageUrl: response.url });
                                            } catch (error) {
                                                console.error("Upload error:", error);
                                                showAlert("Error al subir la imagen", "error");
                                            } finally {
                                                setUploading(false);
                                            }
                                        }}
                                        className="block w-full text-sm text-slate-500 dark:text-slate-400
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-purple-50 file:text-purple-700 dark:file:bg-purple-900/30 dark:file:text-purple-300
                                        hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50"
                                        disabled={uploading}
                                    />
                                    {uploading && <span className="text-sm text-purple-600 dark:text-purple-400">Subiendo...</span>}
                                    {formData.imageUrl && <div className="h-10 w-10 relative"><img src={formData.imageUrl} alt="Preview" className="h-full w-full object-cover rounded" /></div>}
                                </div>
                                <input type="hidden" value={formData.imageUrl} />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={uploading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
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
