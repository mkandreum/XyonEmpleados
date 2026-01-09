import React, { useEffect, useState } from 'react';
import { adminService, uploadService } from '../../services/api';

export const AdminSettings: React.FC = () => {
    const [settings, setSettings] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

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
            // Force reload to apply changes globally if needed (like logo)
            // window.location.reload(); 
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

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 max-w-2xl transition-colors animate-slide-up delay-75">
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Apariencia</h3>
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
                                    placeholder="Velilla"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                />
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Nombre que aparecerá en el logo del portal de empleados.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Logo del Portal (Empleados/Admin)
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
                                            className="block w-full text-sm text-slate-500 dark:text-slate-400
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400
                                                hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                                        />
                                    </div>
                                </div>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Logo que se mostrará en el portal de empleados y en el panel de administración.
                                </p>
                            </div>
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
                                            className="block w-full text-sm text-slate-500 dark:text-slate-400
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400
                                                hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                                        />
                                    </div>
                                </div>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Logo que se mostrará en la página de inicio de sesión (tamaño automático).
                                </p>
                            </div>
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
                                            className="block w-full text-sm text-slate-500 dark:text-slate-400
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400
                                                hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                                        />
                                    </div>
                                </div>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Imagen que se asignará a los nuevos usuarios si no tienen una personalizada.
                                </p>
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
            </div>
        </div>
    );
};
