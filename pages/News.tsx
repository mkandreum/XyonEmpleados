import React from 'react';
import { mockNews } from '../services/mockData';
import { Calendar, Tag } from 'lucide-react';

export const NewsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comunicación Interna</h1>
          <p className="text-slate-500">Noticias, eventos y anuncios de la empresa.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockNews.map((item) => (
          <article key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="h-48 overflow-hidden relative">
              <img 
                src={item.imageUrl} 
                alt={item.title} 
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider
                    ${item.category === 'URGENT' ? 'bg-red-500' : item.category === 'EVENT' ? 'bg-purple-500' : 'bg-blue-500'}
                  `}>
                      {item.category === 'CORPORATE' ? 'Corporativo' : item.category === 'EVENT' ? 'Evento' : 'Urgente'}
                  </span>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                 <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{item.date}</span>
                 </div>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-3 line-clamp-2">{item.title}</h2>
              <p className="text-slate-600 text-sm mb-4 line-clamp-3 flex-1">{item.summary}</p>
              <button className="text-blue-600 font-semibold text-sm hover:text-blue-800 transition-colors text-left mt-auto">
                Leer más &rarr;
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};