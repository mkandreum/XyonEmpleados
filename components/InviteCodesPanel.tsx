import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Copy, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../services/api';
import { InvitationCode } from '../types';
import { LoadingState, EmptyState } from './PageState';
import { ConfirmModal } from './ConfirmModal';

/** Admin: list, generate, copy and revoke single-use invitation codes. */
export const InviteCodesPanel: React.FC = () => {
    const [invites, setInvites] = useState<InvitationCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setInvites(await adminService.getInviteCodes());
        } catch (error) {
            console.error('Error fetching invites:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleGenerate = async () => {
        try {
            await adminService.generateInviteCode();
            load();
        } catch {
            toast.error('Error generando código');
        }
    };

    const handleRevoke = async () => {
        if (!revokingId) return;
        try {
            await adminService.revokeInviteCode(revokingId);
            load();
        } catch {
            toast.error('Error eliminando código');
        } finally {
            setRevokingId(null);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success(`Código copiado: ${code}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">Códigos de invitación</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Genera códigos de un solo uso para registrar nuevos empleados.</p>
                </div>
                <button onClick={handleGenerate} className="btn-primary">
                    <Plus size={18} aria-hidden="true" />
                    Generar código
                </button>
            </div>

            {loading ? (
                <LoadingState label="Cargando códigos..." />
            ) : invites.length === 0 ? (
                <EmptyState icon={<Key size={32} />} title="No hay códigos de invitación activos" hint="Genera uno para invitar a un nuevo empleado." />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th scope="col" className="px-4 py-3 rounded-l-control font-semibold">Código</th>
                                <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                                <th scope="col" className="px-4 py-3 font-semibold">Usado por</th>
                                <th scope="col" className="px-4 py-3 font-semibold">Creado el</th>
                                <th scope="col" className="px-4 py-3 rounded-r-control text-right font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invites.map((invite) => (
                                <tr key={invite.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                    <td className="px-4 py-3 font-mono font-medium text-lg tracking-wider text-slate-800 dark:text-slate-200">{invite.code}</td>
                                    <td className="px-4 py-3">
                                        {invite.isUsed ? (
                                            <span className="px-2 py-1 bg-danger-soft text-danger-ink dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium">Usado</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-success-soft text-success-ink dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">Activo</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{invite.usedBy || '-'}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(invite.createdAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-right">
                                        {!invite.isUsed && (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => copyCode(invite.code)} className="p-2 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-control transition-colors" title="Copiar" aria-label={`Copiar código ${invite.code}`}>
                                                    <Copy size={16} />
                                                </button>
                                                <button onClick={() => setRevokingId(invite.id)} className="p-2 text-danger hover:bg-danger-soft dark:hover:bg-red-900/20 rounded-control transition-colors" title="Revocar" aria-label={`Revocar código ${invite.code}`}>
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

            <ConfirmModal
                isOpen={!!revokingId}
                onClose={() => setRevokingId(null)}
                onConfirm={handleRevoke}
                title="Eliminar código"
                message="¿Estás seguro de eliminar este código?"
                confirmText="Eliminar"
                type="danger"
            />
        </div>
    );
};
