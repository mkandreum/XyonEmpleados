import React, { useEffect, useState } from 'react';
import { adminService, uploadService } from '../../services/api';
import { ScheduleSettings } from '../../components/ScheduleSettings';
import { Mail, Shield, User, Key, Plus, Trash2, Copy, Clock } from 'lucide-react';
import { InvitationCode } from '../../types';

export const AdminSettings: React.FC = () => {
    const [settings, setSettings] = useState<{ [key: string]: string }>({});
    const [activeTab, setActiveTab] = useState<'general' | 'smtp' | 'invites' | 'schedules'>('general');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Invites state
    const [invites, setInvites] = useState<InvitationCode[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await adminService.getSettings();
                setSettings(data || {});
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        if (activeTab === 'invites') {
            loadInvites();
        }
    }, [activeTab]);

    const loadInvites = async () => {
        setLoadingInvites(true);
        try {
            const data = await adminService.getInviteCodes();
            setInvites(data);
        } catch (error) {
            console.error("Error fetching invites:", error);
        } finally {
            setLoadingInvites(false);
        }
    };

    const handleGenerateInvite = async () => {
        try {
            await adminService.generateInviteCode();
            loadInvites();
        } catch (error) {
            alert('Error generando código');
        }
    };

    const handleRevokeInvite = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este código?')) return;
        try {
            await adminService.revokeInviteCode(id);
            loadInvites();
        } catch (error) {
            alert('Error eliminando código');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({
            ...settings,
            [e.target.name]: e.target.value
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await adminService.updateSettings(settings);
            alert('Configuración guardada correctamente');
        } catch (error) {
            alert('Error al guardar configuración');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Cargando configuración...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white animate-slide-up">Configuración Global</h1>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'general'
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                >
                    <User size={18} />
                    Apariencia
                </button>
                <button
                    onClick={() => setActiveTab('smtp')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'smtp'
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                >
                    <Mail size={18} />
                    SMTP Email
                </button>
                <button
                    onClick={() => setActiveTab('schedules')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'schedules'
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                >
                    <Clock size={18} />
                    Horarios
                </button>
                <button
                    onClick={() => setActiveTab('invites')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'invites'
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                >
                    <Key size={18} />
                    Códigos de Invitación
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors animate-slide-up delay-75">

                {/* GENERAL TAB */}
                {activeTab === 'general' && (
                    <form onSubmit={handleSave} className="space-y-6">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Apariencia y Marca</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Nombre de la Empresa
                                </label>
                                <input
                                    type="text"
                                    name="companyName"
                                    value={settings.companyName || ''}
                                    onChange={handleChange}
                                    placeholder="XyonEmpleados"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                />
                            </div>

                            {/* Logo Portal */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Logo del Portal
                                </label>
                                <div className="flex items-center gap-4">
                                    {settings.logoUrl && (
                                        <img src={settings.logoUrl} alt="Logo Portal" className="h-24 w-auto border border-slate-200 dark:border-slate-700 rounded p-1" />
                                    )}
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                    const result = await uploadService.uploadLogo(file);
                                                    setSettings({ ...settings, logoUrl: result.url });
                                                } catch (error) {
                                                    console.error("Error uploading logo:", error);
                                                    alert("Error al subir el logo");
                                                }
                                            }}
                                            className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Logo Login */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Logo del Login
                                </label>
                                <div className="flex items-center gap-4">
                                    {settings.loginLogoUrl && (
                                        <img src={settings.loginLogoUrl} alt="Logo Login" className="h-24 w-auto border border-slate-200 dark:border-slate-700 rounded p-1" />
                                    )}
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                    const result = await uploadService.uploadLogo(file);
                                                    setSettings({ ...settings, loginLogoUrl: result.url });
                                                } catch (error) {
                                                    console.error("Error uploading logo:", error);
                                                    alert("Error al subir el logo");
                                                }
                                            }}
                                            className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Default Avatar */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Avatar por Defecto
                                </label>
                                <div className="flex items-center gap-4">
                                    {settings.defaultAvatarUrl && (
                                        <img src={settings.defaultAvatarUrl} alt="Default Avatar" className="h-16 w-16 rounded-full border border-slate-200 dark:border-slate-700 object-cover" />
                                    )}
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                    const result = await uploadService.uploadAvatar(file);
                                                    setSettings({ ...settings, defaultAvatarUrl: result.url });
                                                } catch (error) {
                                                    console.error("Error uploading avatar:", error);
                                                    alert("Error al subir el avatar");
                                                }
                                            }}
                                            className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                )}

                {/* SMTP TAB */}
                {activeTab === 'smtp' && (
                    <form onSubmit={handleSave} className="space-y-6">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Configuración SMTP</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            Configura el servidor de correo para enviar emails de recuperación de contraseña y bienvenida.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Servidor SMTP (Host)</label>
                                <input
                                    type="text"
                                    name="smtpHost"
                                    value={settings.smtpHost || ''}
                                    onChange={handleChange}
                                    placeholder="smtp.gmail.com"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Puerto</label>
                                <input
                                    type="number"
                                    name="smtpPort"
                                    value={settings.smtpPort || ''}
                                    onChange={handleChange}
                                    placeholder="587"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usuario SMTP</label>
                                <input
                                    type="text"
                                    name="smtpUser"
                                    value={settings.smtpUser || ''}
                                    onChange={handleChange}
                                    placeholder="usuario@dominio.com"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña SMTP</label>
                                <input
                                    type="password"
                                    name="smtpPass"
                                    value={settings.smtpPass || ''}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Remitente (From)</label>
                                <input
                                    type="text"
                                    name="smtpFrom"
                                    value={settings.smtpFrom || ''}
                                    onChange={handleChange}
                                    placeholder='"Xyon Portal" <no-reply@xyon.com>'
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isSaving ? 'Guardando...' : 'Guardar Configuración SMTP'}
                            </button>
                        </div>
                    </form>
                )}

                {/* INVITES TAB */}
                {activeTab === 'invites' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Códigos de Invitación</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Genera códigos de un solo uso para registrar nuevos empleados.</p>
                            </div>
                            <button
                                onClick={handleGenerateInvite}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <Plus size={18} />
                                Generar Código
                            </button>
                        </div>

                        {loadingInvites ? (
                            <div className="text-center py-8 text-slate-500">Cargando códigos...</div>
                        ) : invites.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                                <p className="text-slate-500">No hay códigos de invitación activos.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">Código</th>
                                            <th className="px-4 py-3">Estado</th>
                                            <th className="px-4 py-3">Usado Por</th>
                                            <th className="px-4 py-3">Creado el</th>
                                            <th className="px-4 py-3 rounded-r-lg text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invites.map((invite) => (
                                            <tr key={invite.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                <td className="px-4 py-3 font-mono font-medium text-lg tracking-wider text-slate-800 dark:text-slate-200">{invite.code}</td>
                                                <td className="px-4 py-3">
                                                    {invite.isUsed ? (
                                                        <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium">Usado</span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">Activo</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">{invite.usedBy || '-'}</td>
                                                <td className="px-4 py-3 text-slate-500">{new Date(invite.createdAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {!invite.isUsed && (
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(invite.code);
                                                                    alert('Código copiado: ' + invite.code);
                                                                }}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                                title="Copiar"
                                                            >
                                                                <Copy size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRevokeInvite(invite.id)}
                                                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                title="Eliminar/Revocar"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* SCHEDULES TAB */}
                {activeTab === 'schedules' && (
                    <ScheduleSettings />
                )}
            </div>
        </div>
    );
};
