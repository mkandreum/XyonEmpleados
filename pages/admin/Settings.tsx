import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminService, uploadService } from '../../services/api';
import { ScheduleSettings } from '../../components/ScheduleSettings';
import { EmailTemplatesPanel } from '../../components/EmailTemplatesPanel';
import { InviteCodesPanel } from '../../components/InviteCodesPanel';
import { ImageUploadField } from '../../components/ImageUploadField';
import { Tabs, TabItem } from '../../components/Tabs';
import { Mail, User, Key, Clock } from 'lucide-react';
import { LoadingState } from '../../components/PageState';

type SettingsTab = 'general' | 'smtp' | 'invites' | 'schedules' | 'email-templates';

const TABS: TabItem<SettingsTab>[] = [
    { id: 'general', label: 'Apariencia', icon: User },
    { id: 'smtp', label: 'SMTP email', icon: Mail },
    { id: 'schedules', label: 'Horarios', icon: Clock },
    { id: 'email-templates', label: 'Plantillas de email', icon: Mail },
    { id: 'invites', label: 'Códigos de invitación', icon: Key },
];

interface SmtpField {
    name: string;
    label: string;
    type: string;
    placeholder: string;
    wide?: boolean;
}

const SMTP_FIELDS: SmtpField[] = [
    { name: 'smtpHost', label: 'Servidor SMTP (host)', type: 'text', placeholder: 'smtp.gmail.com' },
    { name: 'smtpPort', label: 'Puerto', type: 'number', placeholder: '587' },
    { name: 'smtpUser', label: 'Usuario SMTP', type: 'text', placeholder: 'usuario@dominio.com' },
    { name: 'smtpPass', label: 'Contraseña SMTP', type: 'password', placeholder: '••••••••' },
    { name: 'smtpFrom', label: 'Email remitente (From)', type: 'text', placeholder: '"Xyon Portal" <no-reply@xyon.com>', wide: true },
];

const SaveBar: React.FC<{ saving: boolean; label: string }> = ({ saving, label }) => (
    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : label}
        </button>
    </div>
);

export const AdminSettings: React.FC = () => {
    const [settings, setSettings] = useState<{ [key: string]: string }>({});
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                setSettings((await adminService.getSettings()) || {});
            } catch (error) {
                console.error('Error fetching settings:', error);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const setSetting = (name: string, value: string) => setSettings(prev => ({ ...prev, [name]: value }));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await adminService.updateSettings(settings);
            toast.success('Configuración guardada correctamente');
        } catch {
            toast.error('Error al guardar configuración');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingState label="Cargando configuración..." />;

    return (
        <div className="space-y-6">
            <h1 className="page-title animate-slide-up">Configuración global</h1>

            <Tabs<SettingsTab> tabs={TABS} active={activeTab} onChange={setActiveTab} label="Secciones de configuración" />

            <div className="card p-4 sm:p-6 animate-slide-up delay-75">
                {activeTab === 'general' && (
                    <form onSubmit={handleSave} className="space-y-6">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Apariencia y marca</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="label" htmlFor="companyName">Nombre de la empresa</label>
                                <input
                                    id="companyName"
                                    type="text"
                                    value={settings.companyName || ''}
                                    onChange={(e) => setSetting('companyName', e.target.value)}
                                    placeholder="XyonEmpleados"
                                    className="field"
                                />
                            </div>
                            <ImageUploadField label="Logo del portal" value={settings.logoUrl} upload={uploadService.uploadLogo} onChange={(url) => setSetting('logoUrl', url)} errorMessage="Error al subir el logo" />
                            <ImageUploadField label="Logo del login" value={settings.loginLogoUrl} upload={uploadService.uploadLogo} onChange={(url) => setSetting('loginLogoUrl', url)} errorMessage="Error al subir el logo" />
                            <ImageUploadField label="Avatar por defecto" shape="round" value={settings.defaultAvatarUrl} upload={uploadService.uploadAvatar} onChange={(url) => setSetting('defaultAvatarUrl', url)} errorMessage="Error al subir el avatar" />
                        </div>
                        <SaveBar saving={isSaving} label="Guardar cambios" />
                    </form>
                )}

                {activeTab === 'smtp' && (
                    <form onSubmit={handleSave} className="space-y-6">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Configuración SMTP</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            Configura el servidor de correo para enviar emails de recuperación de contraseña y bienvenida.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {SMTP_FIELDS.map(({ name, label, type, placeholder, wide }) => (
                                <div key={name} className={wide ? 'md:col-span-2' : ''}>
                                    <label className="label" htmlFor={name}>{label}</label>
                                    <input
                                        id={name}
                                        type={type}
                                        value={settings[name] || ''}
                                        onChange={(e) => setSetting(name, e.target.value)}
                                        placeholder={placeholder}
                                        className="field"
                                    />
                                </div>
                            ))}
                        </div>
                        <SaveBar saving={isSaving} label="Guardar configuración SMTP" />
                    </form>
                )}

                {activeTab === 'invites' && <InviteCodesPanel />}
                {activeTab === 'email-templates' && <EmailTemplatesPanel />}
                {activeTab === 'schedules' && <ScheduleSettings />}
            </div>
        </div>
    );
};
