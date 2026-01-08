import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';

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
                                    URL del Logo
                                </label>
                                <input
                                    type="text"
                                    name="logoUrl"
                                    value={settings.logoUrl || ''}
                                    onChange={handleChange}
                                    placeholder="https://ejemplo.com/logo.png"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    URL de la imagen del logo que se mostrará en la barra de navegación y login.
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
