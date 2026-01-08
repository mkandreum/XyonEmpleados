import React, { useState, useEffect } from 'react';
import { newsService } from '../services/api';
import { NewsItem } from '../types';
import { Calendar, Tag, X } from 'lucide-react';

export const NewsPage: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  useEffect(() => {
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
    fetchNews();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Noticias y Comunicados</h1>
        <p className="text-slate-500">Mantente al día de las últimas novedades de Velilla.</p>
      </div>

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

      {/* News Detail Modal */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedNews(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
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
              <div className="prose max-w-none">
                <p className="text-slate-700 whitespace-pre-wrap">{selectedNews.content}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};