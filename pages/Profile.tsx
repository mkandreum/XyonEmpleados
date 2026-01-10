import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Briefcase, Phone, MapPin, Camera, Calendar } from 'lucide-react';
import { userService, uploadService } from '../services/api';
import { useModal } from '../hooks/useModal';
import { Modal } from '../components/Modal';

export const ProfilePage: React.FC = () => {
    const { user, login } = useAuth() as any;

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
            <div className="animate-slide-up">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mi Perfil</h1>
                <p className="text-slate-500 dark:text-slate-400">Gestiona tu información personal y de contacto.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 animate-slide-up delay-75">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col items-center text-center transition-colors">
                        <div className="relative mb-4">
                            <img
                                src={formData.avatarUrl || user.avatarUrl}
                                alt="Profile"
                                className="w-32 h-32 rounded-full object-cover ring-4 ring-slate-50 dark:ring-slate-800 shadow-lg"
                            />
                            {isEditing && (
                                <div className="mt-2 text-left">
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
                                        className="text-xs w-full p-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        disabled={loading}
                                    />
                                </div>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user.name}</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{user.position}</p>
                        <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 text-left space-y-3">
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <Briefcase size={16} className="text-slate-400 dark:text-slate-500" />
                                <span>{user.department}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <User size={16} className="text-slate-400 dark:text-slate-500" />
                                <span>ID: {user.id.substring(0, 8)}...</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <Calendar size={16} className="text-slate-400 dark:text-slate-500" />
                                <span>Desde: {new Date(user.joinDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors animate-slide-up delay-150">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Información de Contacto</h3>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                                {isEditing ? 'Cancelar' : 'Editar'}
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Corporativo</label>
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                                        <Mail size={16} />
                                        <span className="text-sm">{user.email}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Este campo no se puede editar.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
                                        <input
                                            type="text"
                                            value={formData.phone}
                                            disabled={!isEditing}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder={!isEditing && !formData.phone ? 'No especificado' : '+34...'}
                                            className={`w-full pl-9 p-2 rounded-lg border text-sm transition-colors ${isEditing ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dirección Postal</label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
                                        <input
                                            type="text"
                                            value={formData.address}
                                            disabled={!isEditing}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            placeholder={!isEditing && !formData.address ? 'No especificado' : 'Calle...'}
                                            className={`w-full pl-9 p-2 rounded-lg border text-sm transition-colors ${isEditing ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contacto de Emergencia</label>
                                    <input
                                        type="text"
                                        value={formData.emergencyContact}
                                        disabled={!isEditing}
                                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                                        placeholder={!isEditing && !formData.emergencyContact ? 'No especificado' : 'Nombre - Teléfono'}
                                        className={`w-full p-2 rounded-lg border text-sm transition-colors ${isEditing ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                    />
                                </div>
                            </div>

                            {isEditing && (
                                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
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

                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors animate-slide-up delay-200">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Seguridad</h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200">Contraseña</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Mantén tu cuenta segura</p>
                            </div>
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
                            >
                                Cambiar contraseña
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPasswordModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 pb-24 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Cambiar Contraseña</h2>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña Actual</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirmar Nueva Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white transition-colors"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
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