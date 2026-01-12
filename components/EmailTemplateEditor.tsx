import React, { useState } from 'react';
import { Mail, Eye, Save, AlertCircle } from 'lucide-react';

interface EmailTemplateEditorProps {
    template: {
        id: string;
        type: string;
        name: string;
        subject: string;
        htmlBody: string;
        variables: string;
        isActive: boolean;
    };
    onSave: (data: any) => Promise<void>;
    onPreview: (data: any) => Promise<{ subject: string; htmlBody: string }>;
}

export const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({ template, onSave, onPreview }) => {
    const [formData, setFormData] = useState({
        name: template.name,
        subject: template.subject,
        htmlBody: template.htmlBody,
        isActive: template.isActive
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [preview, setPreview] = useState<{ subject: string; htmlBody: string } | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const availableVariables = JSON.parse(template.variables || '[]');

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(formData);
            alert('Plantilla guardada correctamente');
        } catch (error) {
            alert('Error al guardar la plantilla');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePreview = async () => {
        setIsLoadingPreview(true);
        try {
            const result = await onPreview({
                subject: formData.subject,
                htmlBody: formData.htmlBody,
                variables: template.variables
            });
            setPreview(result);
            setShowPreview(true);
        } catch (error) {
            alert('Error al generar vista previa');
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const insertVariable = (variable: string) => {
        const textarea = document.getElementById('htmlBody') as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = formData.htmlBody;
            const before = text.substring(0, start);
            const after = text.substring(end);
            const newText = before + `{{${variable}}}` + after;
            handleChange('htmlBody', newText);

            // Set cursor position after inserted variable
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
            }, 0);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">{template.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Tipo: {template.type}</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => handleChange('isActive', e.target.checked)}
                            className="rounded border-slate-300 dark:border-slate-700"
                        />
                        Activa
                    </label>
                </div>
            </div>

            {/* Variables disponibles */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                    <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Variables disponibles:</p>
                        <div className="flex flex-wrap gap-2">
                            {availableVariables.map((variable: string) => (
                                <button
                                    key={variable}
                                    onClick={() => insertVariable(variable)}
                                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-xs font-mono text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                    title="Click para insertar"
                                >
                                    {`{{${variable}}}`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
                {/* Asunto */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Asunto del Email
                    </label>
                    <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => handleChange('subject', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                        placeholder="Asunto del correo..."
                    />
                </div>

                {/* Cuerpo HTML */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Contenido HTML
                    </label>
                    <textarea
                        id="htmlBody"
                        value={formData.htmlBody}
                        onChange={(e) => handleChange('htmlBody', e.target.value)}
                        rows={15}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white font-mono text-sm"
                        placeholder="Contenido HTML del email..."
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Usa las variables disponibles arriba para personalizar el contenido
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                    onClick={handlePreview}
                    disabled={isLoadingPreview}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                    <Eye size={18} />
                    {isLoadingPreview ? 'Generando...' : 'Vista Previa'}
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <Save size={18} />
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>

            {/* Preview Modal */}
            {showPreview && preview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Vista Previa del Email</h3>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Asunto:</p>
                                <p className="font-medium text-slate-900 dark:text-white">{preview.subject}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                <div dangerouslySetInnerHTML={{ __html: preview.htmlBody }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
