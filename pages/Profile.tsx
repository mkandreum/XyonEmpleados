import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Briefcase, Phone, MapPin, Camera, Calendar } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  // Mock form state
  const [formData, setFormData] = useState({
      phone: '+34 600 123 456',
      address: 'Calle Mayor 123, Madrid',
      emergencyContact: 'María Ruiz - 600 000 000'
  });

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div>
          <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>
          <p className="text-slate-500">Gestiona tu información personal y de contacto.</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center">
                <div className="relative mb-4">
                    <img 
                        src={user.avatarUrl} 
                        alt="Profile" 
                        className="w-32 h-32 rounded-full object-cover ring-4 ring-slate-50"
                    />
                    <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-md">
                        <Camera size={16} />
                    </button>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
                <p className="text-slate-500 text-sm mb-4">{user.position}</p>
                <div className="w-full pt-4 border-t border-slate-100 text-left space-y-3">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Briefcase size={16} className="text-slate-400" />
                        <span>{user.department}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                        <User size={16} className="text-slate-400" />
                        <span>ID: {user.id}</span>
                    </div>
                     <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Calendar size={16} className="text-slate-400" />
                        <span>Desde: {user.joinDate}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Details Form */}
        <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-900">Información de Contacto</h3>
                    <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                        {isEditing ? 'Cancelar' : 'Editar'}
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Corporativo</label>
                            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <Mail size={16} />
                                <span className="text-sm">{user.email}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Este campo no se puede editar.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={formData.phone}
                                    disabled={!isEditing}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    className={`w-full pl-9 p-2 rounded-lg border text-sm ${isEditing ? 'border-slate-300 focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                                />
                            </div>
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Postal</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={formData.address}
                                    disabled={!isEditing}
                                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                                    className={`w-full pl-9 p-2 rounded-lg border text-sm ${isEditing ? 'border-slate-300 focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                                />
                            </div>
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contacto de Emergencia</label>
                             <input 
                                    type="text" 
                                    value={formData.emergencyContact}
                                    disabled={!isEditing}
                                    onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                                    className={`w-full p-2 rounded-lg border text-sm ${isEditing ? 'border-slate-300 focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                                />
                        </div>
                    </div>

                    {isEditing && (
                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button 
                                onClick={() => { setIsEditing(false); alert("Datos guardados correctamente."); }}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                 <h3 className="font-semibold text-slate-900 mb-4">Seguridad</h3>
                 <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-slate-800">Contraseña</p>
                        <p className="text-sm text-slate-500">Última actualización: hace 3 meses</p>
                    </div>
                    <button className="text-blue-600 text-sm font-medium hover:underline">Cambiar contraseña</button>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};