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

    if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando configuración...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Configuración Global</h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 max-w-2xl">
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium text-slate-900 mb-4">Apariencia</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nombre de la Empresa
                                </label>
                                <input
                                    type="text"
                                    name="companyName"
                                    value={settings.companyName || ''}
                                    onChange={handleChange}
                                    placeholder="Velilla"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Nombre que aparecerá en el logo del portal de empleados.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Logo del Portal Empleados
                                </label>
                                <div className="flex items-center gap-4">
                                    {settings.logoUrl && (
                                        <img src={settings.logoUrl} alt="Logo Portal" className="h-10 w-auto border border-slate-200 rounded" />
                                    )}
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                    const formData = new FormData();
                                                    formData.append('file', file);
                                                    const result = await uploadService.uploadLogo(formData);
                                                    setSettings({ ...settings, logoUrl: result.url });
                                                } catch (error) {
                                                    console.error("Error uploading logo:", error);
                                                    alert("Error al subir el logo");
                                                }
                                            }}
                                            className="block w-full text-sm text-slate-500
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-blue-50 file:text-blue-700
                                                hover:file:bg-blue-100"
                                        />
                                    </div>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    Logo que se mostrará en el portal de empleados.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Logo del Panel Admin
                                </label>
                                <div className="flex items-center gap-4">
                                    {settings.adminLogoUrl && (
                                        <img src={settings.adminLogoUrl} alt="Logo Admin" className="h-10 w-auto border border-slate-200 rounded" />
                                    )}
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                    const formData = new FormData();
                                                    formData.append('file', file);
                                                    const result = await uploadService.uploadLogo(formData);
                                                    setSettings({ ...settings, adminLogoUrl: result.url });
                                                } catch (error) {
                                                    console.error("Error uploading logo:", error);
                                                    alert("Error al subir el logo");
                                                }
                                            }}
                                            className="block w-full text-sm text-slate-500
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-blue-50 file:text-blue-700
                                                hover:file:bg-blue-100"
                                        />
                                    </div>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    Logo que se mostrará en el panel de administración.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
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
