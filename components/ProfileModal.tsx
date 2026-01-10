import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, X } from 'lucide-react';
import { userService, uploadService } from '../services/api';
import { getAbsoluteUrl } from '../utils/urlUtils';
import { useTheme, ThemeColor } from '../context/ThemeContext';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    onUpdate: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const { themeColor, setThemeColor } = useTheme();
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

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
            setIsEditing(false);
            onUpdate();
            window.location.reload();
        } catch (error) {
            console.error("Failed to update profile", error);
            alert("Error al guardar los datos.");
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert("Las contraseñas no coinciden");
            return;
        }
        try {
            await userService.changePassword(passwordData.currentPassword, passwordData.newPassword);
            alert("Contraseña cambiada correctamente");
            setShowPasswordModal(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            alert("Error al cambiar la contraseña");
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Main Profile Modal */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
                <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex justify-between items-center z-10">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Mi Perfil</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Gestiona tu información personal</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <X size={20} className="text-slate-500 dark:text-slate-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center">
                            <div className="relative mb-4">
                                <img
                                    src={getAbsoluteUrl(formData.avatarUrl || user.avatarUrl)}
                                    alt="Profile"
                                    className="w-32 h-32 rounded-full object-cover ring-4 ring-slate-50 dark:ring-slate-800 shadow-lg"
                                />
                                {isEditing && (
                                    <div className="mt-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                setLoading(true);
                                                try {
                                                    const response = await uploadService.uploadAvatar(file);
                                                    setFormData({ ...formData, avatarUrl: response.url });
                                                } catch (error) {
                                                    console.error("Upload error:", error);
                                                    alert("Error al subir el avatar");
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            className="text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                                        />
                                    </div>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{user.role}</p>
                        </div>

                        {/* Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                    <Mail size={16} />
                                    <span className="text-xs font-medium">Email</span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{user.email}</p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                                    <User size={16} />
                                    <span className="text-xs font-medium">Departamento</span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{user.department}</p>
                            </div>
                        </div>

                        {/* Editable Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    <Phone size={16} />
                                    Teléfono
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:disabled:text-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                    placeholder="Ej: +34 600 000 000"
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    <MapPin size={16} />
                                    Dirección
                                </label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:disabled:text-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                    placeholder="Ej: Calle Principal 123"
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    <Phone size={16} />
                                    Contacto de Emergencia
                                </label>
                                <input
                                    type="text"
                                    value={formData.emergencyContact}
                                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:disabled:text-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                    placeholder="Ej: María García - 600 111 222"
                                />
                            </div>
                        </div>

                        {/* Theme Selection */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Tema de Color</label>
                            <div className="flex gap-3">
                                {(['blue', 'green', 'purple', 'orange', 'red', 'slate'] as ThemeColor[]).map((color) => {
                                    const realColors: { [key: string]: string } = {
                                        blue: '#3b82f6',
                                        green: '#22c55e',
                                        purple: '#a855f7',
                                        orange: '#f97316',
                                        red: '#ef4444',
                                        slate: '#64748b'
                                    };

                                    return (
                                        <button
                                            key={color}
                                            onClick={() => setThemeColor(color)}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${themeColor === color ? 'border-slate-900 dark:border-white ring-2 ring-offset-2 ring-slate-100 dark:ring-slate-800' : 'border-transparent'
                                                }`}
                                            style={{ backgroundColor: realColors[color] }}
                                            title={`Tema ${color}`}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                            {!isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                    >
                                        Editar Perfil
                                    </button>
                                    <button
                                        onClick={() => setShowPasswordModal(true)}
                                        className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
                                    >
                                        Cambiar Contraseña
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                                        disabled={loading}
                                    >
                                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPasswordModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 pb-24 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Cambiar Contraseña</h2>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Contraseña Actual
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Nueva Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Confirmar Nueva Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Cambiar Contraseña
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};
