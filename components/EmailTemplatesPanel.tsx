import React, { useEffect, useState, useCallback } from 'react';
import { Mail } from 'lucide-react';
import { adminService } from '../services/api';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import { LoadingState, EmptyState } from './PageState';

/** Admin: pick an email template and edit/preview it. */
export const EmailTemplatesPanel: React.FC = () => {
    const [templates, setTemplates] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminService.getEmailTemplates();
            setTemplates(data);
            setSelected((current: any) => current || data[0] || null);
        } catch (error) {
            console.error('Error fetching email templates:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Plantillas de email</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Personaliza las plantillas de correo electrónico que se envían automáticamente a los empleados.
                </p>
            </div>

            {loading ? (
                <LoadingState label="Cargando plantillas..." />
            ) : templates.length === 0 ? (
                <EmptyState icon={<Mail size={32} />} title="No hay plantillas de email disponibles" />
            ) : (
                <div className="space-y-6">
                    <div>
                        <label className="label mb-2" htmlFor="email-template-select">Seleccionar plantilla</label>
                        <select
                            id="email-template-select"
                            value={selected?.id || ''}
                            onChange={(e) => setSelected(templates.find(t => t.id === e.target.value))}
                            className="field"
                        >
                            {templates.map((template) => (
                                <option key={template.id} value={template.id}>{template.name} ({template.type})</option>
                            ))}
                        </select>
                    </div>

                    {selected && (
                        <EmailTemplateEditor
                            key={selected.id}
                            template={selected}
                            onSave={async (data) => {
                                await adminService.updateEmailTemplate(selected.id, data);
                                await load();
                            }}
                            onPreview={(data) => adminService.previewEmailTemplate(data)}
                        />
                    )}
                </div>
            )}
        </div>
    );
};
