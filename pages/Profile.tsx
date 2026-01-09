import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Briefcase, Phone, MapPin, Camera, Calendar } from 'lucide-react';
import { userService, uploadService } from '../services/api';
import { useModal } from '../hooks/useModal';
import { Modal } from '../components/Modal';

export const ProfilePage: React.FC = () => {
    const { user, login } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const { modalState, showAlert, closeModal } = useModal();

    const [formData, setFormData] = useState({
        phone: user?.phone || '',
        address: user?.address || '',
        emergencyContact: user?.emergencyContact || '',
        avatarUrl: user?.avatarUrl || ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                phone: user.phone || '',
                address: user.address || '',
                emergencyContact: user.emergencyContact || '',
                avatarUrl: user.avatarUrl || ''
            });
        }
    }, [user]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const updatedUser = await userService.updateProfile(formData);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            showAlert("Datos guardados correctamente.", 'success');
            setIsEditing(false);
            window.location.reload();
        } catch (error) {
            console.error("Failed to update profile", error);
            showAlert("Error al guardar los datos.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showAlert("Las contraseñas no coinciden", 'warning');
            return;
        }
        try {
            await userService.changePassword(passwordData.currentPassword, passwordData.newPassword);
            showAlert("Contraseña cambiada correctamente", 'success');
            setShowPasswordModal(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            showAlert("Error al cambiar la contraseña", 'error');
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>
                <p className="text-slate-500">Gestiona tu información personal y de contacto.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center">
                        <div className="relative mb-4">
                            <img
                                src={formData.avatarUrl || user.avatarUrl}
                                alt="Profile"
                                className="w-32 h-32 rounded-full object-cover ring-4 ring-slate-50"
                            />
                            {isEditing && (
                                <div className="mt-2">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            setLoading(true); // Reusing loading state
                                            try {
                                                const response = await uploadService.uploadAvatar(file);
                                                setFormData({ ...formData, avatarUrl: response.url });
                                            } catch (error) {
                                                console.error("Upload error:", error);
                                                showAlert("Error al subir el avatar", "error");
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                        className="text-xs w-full p-1 border rounded"
                                        disabled={loading}
                                    />
                                </div>
                            )}
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
                                <span>ID: {user.id.substring(0, 8)}...</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Calendar size={16} className="text-slate-400" />
                                <span>Desde: {new Date(user.joinDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

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
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder={!isEditing && !formData.phone ? 'No especificado' : '+34...'}
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
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            placeholder={!isEditing && !formData.address ? 'No especificado' : 'Calle...'}
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
                                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                                        placeholder={!isEditing && !formData.emergencyContact ? 'No especificado' : 'Nombre - Teléfono'}
                                        className={`w-full p-2 rounded-lg border text-sm ${isEditing ? 'border-slate-300 focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                                    />
                                </div>
                            </div>

                            {isEditing && (
                                <div className="flex justify-end pt-4 border-t border-slate-100">
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50"
                                    >
                                        {loading ? 'Guardando...' : 'Guardar Cambios'}
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
                                <p className="text-sm text-slate-500">Mantén tu cuenta segura</p>
                            </div>
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="text-blue-600 text-sm font-medium hover:underline"
                            >
                                Cambiar contraseña
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPasswordModal(false)}>
                    <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">Cambiar Contraseña</h2>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña Actual</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nueva Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    Cambiar
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