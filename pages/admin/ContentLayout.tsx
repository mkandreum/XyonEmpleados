import React, { useEffect, useState } from 'react';
import {
    Plus, Edit2, Trash2, GripVertical, ChevronUp, ChevronDown,
    Radio, Calendar, X, Save, Copy, LayoutDashboard, Eye, EyeOff,
    Clock, Plane, FileText, Newspaper, Gift, AlertTriangle, ClipboardList,
    Megaphone, Layers, Settings2
} from 'lucide-react';
import { dashboardLayoutService } from '../../services/api';
import { DashboardLayout, DashboardWidget, DashboardWidgetType, DashboardWidgetScope } from '../../types';
import toast from 'react-hot-toast';
import { haptic } from '../../utils/haptics';

// ─── Widget metadata ───────────────────────────────────────────────────────────

const WIDGET_META: Record<DashboardWidgetType, { label: string; color: string; icon: React.ReactNode }> = {
    FICHAJE:     { label: 'Fichaje',      color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',   icon: <Clock size={12} /> },
    VACATIONS:   { label: 'Vacaciones',   color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',       icon: <Plane size={12} /> },
    PAYROLL:     { label: 'Nóminas',      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', icon: <FileText size={12} /> },
    EVENTS:      { label: 'Eventos',      color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',   icon: <Calendar size={12} /> },
    NEWS:        { label: 'Noticias',     color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300', icon: <Newspaper size={12} /> },
    BENEFITS:    { label: 'Beneficios',   color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',       icon: <Gift size={12} /> },
    ALERTS:      { label: 'Avisos',       color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',           icon: <AlertTriangle size={12} /> },
    ADJUSTMENTS: { label: 'Ajustes',      color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300', icon: <ClipboardList size={12} /> },
    BANNER:      { label: 'Banner',       color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',      icon: <Megaphone size={12} /> },
};

const SCOPE_META: Record<DashboardWidgetScope, { label: string; color: string }> = {
    ALL:      { label: 'Todos',     color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
    EMPLOYEE: { label: 'Empleado',  color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' },
    MANAGER:  { label: 'Manager',   color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    ADMIN:    { label: 'Admin',     color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
};

const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

const isLive = (l: DashboardLayout) => {
    if (!l.isActive) return false;
    const now = new Date();
    if (!l.startDate && !l.endDate) return true;
    const s = l.startDate ? new Date(l.startDate) : null;
    const e = l.endDate ? new Date(l.endDate) : null;
    return (!s || s <= now) && (!e || e >= now);
};

// ─── Empty widget form ─────────────────────────────────────────────────────────

const emptyWidget = (): Partial<DashboardWidget> & { type: DashboardWidgetType; scope: DashboardWidgetScope } => ({
    type: 'FICHAJE',
    label: '',
    isActive: true,
    scope: 'ALL',
    department: '',
});

// ─── Main component ────────────────────────────────────────────────────────────

export const AdminContentLayout: React.FC = () => {
    const [layouts, setLayouts] = useState<DashboardLayout[]>([]);
    const [selected, setSelected] = useState<DashboardLayout | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Layout modal
    const [showLayoutModal, setShowLayoutModal] = useState(false);
    const [editingLayout, setEditingLayout] = useState<DashboardLayout | null>(null);
    const [layoutForm, setLayoutForm] = useState({ name: '', description: '', startDate: '', endDate: '', isActive: false });

    // Widget modal
    const [showWidgetModal, setShowWidgetModal] = useState(false);
    const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
    const [widgetForm, setWidgetForm] = useState(emptyWidget());

    const load = async () => {
        setLoading(true);
        try {
            const data: DashboardLayout[] = await dashboardLayoutService.getAll();
            setLayouts(data);
            if (data.length > 0) {
                const live = data.find(l => l.isActive) || data[0];
                setSelected(prev => prev ? (data.find(d => d.id === prev.id) || live) : live);
            }
        } catch {
            toast.error('Error al cargar layouts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // ── Layout actions ────────────────────────────────────────────────────────

    const openCreateLayout = () => {
        setEditingLayout(null);
        setLayoutForm({ name: '', description: '', startDate: '', endDate: '', isActive: false });
        setShowLayoutModal(true);
    };

    const openEditLayout = (l: DashboardLayout, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingLayout(l);
        setLayoutForm({
            name: l.name,
            description: l.description || '',
            startDate: l.startDate ? l.startDate.slice(0, 10) : '',
            endDate: l.endDate ? l.endDate.slice(0, 10) : '',
            isActive: l.isActive,
        });
        setShowLayoutModal(true);
    };

    const saveLayout = async () => {
        if (!layoutForm.name.trim()) { toast.error('El nombre es obligatorio'); return; }
        setSaving(true);
        try {
            const payload = {
                name: layoutForm.name.trim(),
                description: layoutForm.description.trim() || undefined,
                startDate: layoutForm.startDate || null,
                endDate: layoutForm.endDate || null,
                isActive: layoutForm.isActive,
            };
            if (editingLayout) {
                await dashboardLayoutService.update(editingLayout.id, payload);
                haptic('success'); toast.success('Layout actualizado');
            } else {
                await dashboardLayoutService.create(payload);
                haptic('success'); toast.success('Layout creado');
            }
            setShowLayoutModal(false);
            await load();
        } catch {
            haptic('error'); toast.error('Error al guardar layout');
        } finally {
            setSaving(false);
        }
    };

    const duplicateLayout = async (l: DashboardLayout, e: React.MouseEvent) => {
        e.stopPropagation();
        setSaving(true);
        try {
            const dup = await dashboardLayoutService.create({
                name: `${l.name} (copia)`,
                description: l.description || undefined,
                startDate: l.startDate || undefined,
                endDate: l.endDate || undefined,
                isActive: false,
            });
            await Promise.all(
                [...l.widgets]
                    .sort((a, b) => a.order - b.order)
                    .map(w => dashboardLayoutService.addWidget(dup.id, {
                        type: w.type, label: w.label, scope: w.scope,
                        department: w.department || '', isActive: w.isActive, config: w.config,
                    }))
            );
            haptic('success'); toast.success('Layout duplicado');
            await load();
        } catch {
            haptic('error'); toast.error('Error al duplicar');
        } finally {
            setSaving(false);
        }
    };

    const removeLayout = async (l: DashboardLayout, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`¿Eliminar "${l.name}"?`)) return;
        try {
            await dashboardLayoutService.remove(l.id);
            haptic('double'); toast.success('Layout eliminado');
            await load();
        } catch {
            haptic('error'); toast.error('Error al eliminar');
        }
    };

    const activateLayout = async (l: DashboardLayout, active: boolean) => {
        try {
            await dashboardLayoutService.update(l.id, { isActive: active });
            haptic('tap');
            if (active) toast.success(`"${l.name}" activado como layout live`);
            await load();
        } catch {
            haptic('error'); toast.error('Error al activar');
        }
    };

    // ── Widget actions ─────────────────────────────────────────────────────────

    const openAddWidget = () => {
        if (!selected) return;
        setEditingWidget(null);
        setWidgetForm(emptyWidget());
        setShowWidgetModal(true);
    };

    const openEditWidget = (w: DashboardWidget) => {
        setEditingWidget(w);
        setWidgetForm({ type: w.type, label: w.label, isActive: w.isActive, scope: w.scope, department: w.department || '' });
        setShowWidgetModal(true);
    };

    const saveWidget = async () => {
        if (!selected) return;
        if (!widgetForm.label.trim()) { toast.error('El nombre del widget es obligatorio'); return; }
        setSaving(true);
        try {
            const payload = {
                type: widgetForm.type,
                label: widgetForm.label.trim(),
                scope: widgetForm.scope,
                department: widgetForm.department || '',
                isActive: widgetForm.isActive !== false,
                config: widgetForm.config,
            };

            if (editingWidget) {
                await dashboardLayoutService.updateWidget(editingWidget.id, payload);
                haptic('success'); toast.success('Widget actualizado');
            } else {
                await dashboardLayoutService.addWidget(selected.id, payload);
                haptic('success'); toast.success('Widget añadido');
            }
            setShowWidgetModal(false);
            await load();
        } catch {
            haptic('error'); toast.error('Error al guardar widget');
        } finally {
            setSaving(false);
        }
    };

    const toggleWidget = async (w: DashboardWidget) => {
        try {
            await dashboardLayoutService.updateWidget(w.id, { isActive: !w.isActive });
            haptic('tap');
            await load();
        } catch { haptic('error'); toast.error('Error al actualizar'); }
    };

    const removeWidget = async (w: DashboardWidget) => {
        if (!confirm(`¿Eliminar widget "${w.label}"?`)) return;
        try {
            await dashboardLayoutService.deleteWidget(w.id);
            haptic('double'); toast.success('Widget eliminado');
            await load();
        } catch { haptic('error'); toast.error('Error al eliminar widget'); }
    };

    const moveWidget = async (w: DashboardWidget, dir: 'up' | 'down') => {
        if (!selected) return;
        const sorted = [...selected.widgets].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex(x => x.id === w.id);
        const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= sorted.length) return;
        const orders = sorted.map((x, i) => ({ id: x.id, order: i }));
        const tmp = orders[idx].order;
        orders[idx].order = orders[swapIdx].order;
        orders[swapIdx].order = tmp;
        haptic('light');
        try {
            await dashboardLayoutService.reorder(selected.id, orders);
            await load();
        } catch { haptic('error'); toast.error('Error al reordenar'); }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const selWidgets = selected ? [...selected.widgets].sort((a, b) => a.order - b.order) : [];

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-slide-up">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers size={24} className="text-blue-600" />
                        Gestión de Layouts
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Configura qué widgets ven los empleados en su dashboard y en qué orden
                    </p>
                </div>
                <button
                    onClick={openCreateLayout}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                >
                    <Plus size={18} />
                    Nuevo Layout
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24 text-slate-500">Cargando layouts…</div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* ── Left: layout list ───────────────────────────────── */}
                    <div className="w-full lg:w-72 shrink-0">
                        {/* Mobile: horizontal scroll */}
                        <div className="lg:hidden flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {layouts.length === 0 && (
                                <p className="text-sm text-slate-400 py-4 px-1">Sin layouts</p>
                            )}
                            {layouts.map(l => (
                                <button
                                    key={l.id}
                                    onClick={() => setSelected(l)}
                                    className={`shrink-0 flex flex-col gap-1 p-3 rounded-xl border text-left min-w-[160px] transition-all ${
                                        selected?.id === l.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {isLive(l) && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-green-500 rounded-full px-1.5 py-0.5">
                                                <Radio size={8} />LIVE
                                            </span>
                                        )}
                                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{l.name}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                        {l.startDate || l.endDate ? `${fmtDate(l.startDate)} → ${fmtDate(l.endDate)}` : 'Sin fecha'}
                                    </span>
                                    <span className="text-[10px] text-slate-500">{l.widgets.length} widgets</span>
                                </button>
                            ))}
                        </div>

                        {/* Desktop: vertical list */}
                        <div className="hidden lg:flex flex-col gap-3">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Layouts</p>
                            {layouts.length === 0 && (
                                <div className="text-center py-8 text-sm text-slate-400">
                                    No hay layouts.<br/>Crea uno nuevo.
                                </div>
                            )}
                            {layouts.map(l => (
                                <button
                                    key={l.id}
                                    onClick={() => setSelected(l)}
                                    className={`w-full flex flex-col gap-2 p-4 rounded-xl border text-left transition-all hover:shadow-md ${
                                        selected?.id === l.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm shadow-blue-100 dark:shadow-none'
                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                                    }`}
                                >
                                    {/* Name + live badge */}
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">{l.name}</span>
                                        {isLive(l) && (
                                            <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-white bg-green-500 rounded-full px-2 py-0.5">
                                                <Radio size={8} />LIVE
                                            </span>
                                        )}
                                        {l.isActive && !isLive(l) && (
                                            <span className="shrink-0 text-[10px] font-bold text-white bg-amber-500 rounded-full px-2 py-0.5">
                                                Programado
                                            </span>
                                        )}
                                    </div>

                                    {/* Dates */}
                                    {(l.startDate || l.endDate) && (
                                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                            <Calendar size={10} />
                                            {fmtDate(l.startDate)} → {fmtDate(l.endDate)}
                                        </div>
                                    )}

                                    {/* Widget count */}
                                    <div className="text-[11px] text-slate-400">{l.widgets.length} widgets</div>

                                    {/* Actions */}
                                    <div className="flex gap-1 mt-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            onClick={(e) => openEditLayout(l, e)}
                                            className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            <Edit2 size={11} />Editar
                                        </button>
                                        <span className="text-slate-300 dark:text-slate-700">·</span>
                                        <button
                                            onClick={(e) => duplicateLayout(l, e)}
                                            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline"
                                        >
                                            <Copy size={11} />Duplicar
                                        </button>
                                        <span className="text-slate-300 dark:text-slate-700">·</span>
                                        <button
                                            onClick={(e) => removeLayout(l, e)}
                                            className="flex items-center gap-1 text-[11px] text-red-500 hover:underline"
                                        >
                                            <Trash2 size={11} />Borrar
                                        </button>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Main: widget list ────────────────────────────────── */}
                    <div className="flex-1 min-w-0">
                        {!selected ? (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                                <LayoutDashboard size={40} className="opacity-30" />
                                <p className="text-sm">Selecciona o crea un layout</p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-slide-up">

                                {/* Layout header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selected.name}</h2>
                                            {isLive(selected) ? (
                                                <span className="flex items-center gap-1 text-xs font-bold text-white bg-green-500 rounded-full px-2.5 py-1">
                                                    <Radio size={10} />LIVE
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => activateLayout(selected, !selected.isActive)}
                                                    className={`flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 border transition-colors ${
                                                        selected.isActive
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
                                                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-amber-50 hover:text-amber-700'
                                                    }`}
                                                >
                                                    <Radio size={10} />
                                                    {selected.isActive ? 'Programado (desactivar)' : 'Activar'}
                                                </button>
                                            )}
                                        </div>
                                        {(selected.startDate || selected.endDate) && (
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                <Calendar size={11} />
                                                {fmtDate(selected.startDate)} — {fmtDate(selected.endDate)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEditLayout(selected, { stopPropagation: () => {} } as any)}
                                            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <Settings2 size={15} />
                                            <span className="hidden sm:inline">Configurar</span>
                                        </button>
                                        <button
                                            onClick={openAddWidget}
                                            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                        >
                                            <Plus size={16} />
                                            Add Widget
                                        </button>
                                    </div>
                                </div>

                                {/* Widget table header — desktop */}
                                {selWidgets.length > 0 && (
                                    <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                        <span></span>
                                        <span>Widget</span>
                                        <span>Visible para</span>
                                        <span>Estado</span>
                                        <span>Acciones</span>
                                    </div>
                                )}

                                {/* Widget rows */}
                                {selWidgets.length === 0 ? (
                                    <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
                                        <Layers size={36} className="opacity-20" />
                                        <p className="text-sm">Sin widgets. Pulsa "+ Add Widget" para añadir.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {selWidgets.map((w, idx) => {
                                            const meta = WIDGET_META[w.type];
                                            const scopeMeta = SCOPE_META[w.scope];
                                            return (
                                                <div
                                                    key={w.id}
                                                    className={`flex flex-col md:grid md:grid-cols-[auto_1fr_auto_auto_auto] md:items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5 md:py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${!w.isActive ? 'opacity-50' : ''}`}
                                                >
                                                    {/* Drag handle + reorder (mobile: arrows, desktop: handle icon) */}
                                                    <div className="hidden md:flex items-center text-slate-300 dark:text-slate-600 cursor-grab">
                                                        <GripVertical size={16} />
                                                    </div>

                                                    {/* Name + type badge */}
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {/* Mobile reorder arrows */}
                                                        <div className="flex flex-col gap-0.5 md:hidden shrink-0">
                                                            <button onClick={() => moveWidget(w, 'up')} disabled={idx === 0} className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20">
                                                                <ChevronUp size={14} />
                                                            </button>
                                                            <button onClick={() => moveWidget(w, 'down')} disabled={idx === selWidgets.length - 1} className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20">
                                                                <ChevronDown size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-sm text-slate-900 dark:text-white">{w.label}</p>
                                                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${meta.color}`}>
                                                                {meta.icon}
                                                                {meta.label}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Scope */}
                                                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full self-start md:self-auto ${scopeMeta.color}`}>
                                                        {scopeMeta.label}
                                                        {w.department ? ` · ${w.department}` : ''}
                                                    </span>

                                                    {/* Toggle */}
                                                    <button
                                                        onClick={() => toggleWidget(w)}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${w.isActive ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                        aria-label="Toggle widget"
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${w.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </button>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1.5 self-start md:self-auto">
                                                        {/* Desktop reorder arrows */}
                                                        <button onClick={() => moveWidget(w, 'up')} disabled={idx === 0} className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-20 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                                                            <ChevronUp size={14} />
                                                        </button>
                                                        <button onClick={() => moveWidget(w, 'down')} disabled={idx === selWidgets.length - 1} className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-20 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                                                            <ChevronDown size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => openEditWidget(w)}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                        >
                                                            <Edit2 size={12} />
                                                            <span className="hidden sm:inline">Edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => removeWidget(w)}
                                                            className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Layout modal ───────────────────────────────────────────── */}
            {showLayoutModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingLayout ? 'Editar Layout' : 'Nuevo Layout'}
                            </h3>
                            <button onClick={() => setShowLayoutModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={22} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre *</label>
                                <input
                                    type="text" autoFocus
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={layoutForm.name}
                                    onChange={e => setLayoutForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Ej: Layout Verano 2026"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={layoutForm.description}
                                    onChange={e => setLayoutForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Descripción opcional"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha inicio</label>
                                    <input type="date"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={layoutForm.startDate}
                                        onChange={e => setLayoutForm(p => ({ ...p, startDate: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha fin</label>
                                    <input type="date"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={layoutForm.endDate}
                                        onChange={e => setLayoutForm(p => ({ ...p, endDate: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <input type="checkbox" className="w-4 h-4 accent-blue-600"
                                    checked={layoutForm.isActive}
                                    onChange={e => setLayoutForm(p => ({ ...p, isActive: e.target.checked }))}
                                />
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Activar como layout Live</p>
                                    <p className="text-xs text-slate-500">Desactivará cualquier otro layout activo</p>
                                </div>
                            </label>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowLayoutModal(false)} className="flex-1 px-4 py-2.5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">
                                Cancelar
                            </button>
                            <button onClick={saveLayout} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm font-semibold">
                                <Save size={15} />
                                {saving ? 'Guardando…' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Widget modal ───────────────────────────────────────────── */}
            {showWidgetModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingWidget ? 'Editar Widget' : 'Añadir Widget'}
                            </h3>
                            <button onClick={() => setShowWidgetModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={22} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Widget</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.keys(WIDGET_META) as DashboardWidgetType[]).map(t => {
                                        const m = WIDGET_META[t];
                                        return (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setWidgetForm(p => ({ ...p, type: t, label: p.label || m.label }))}
                                                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-center transition-all text-[11px] font-semibold ${
                                                    widgetForm.type === t
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                                }`}
                                            >
                                                <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm ${m.color}`}>
                                                    {m.icon}
                                                </span>
                                                {m.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre visible *</label>
                                <input
                                    type="text" autoFocus
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={widgetForm.label}
                                    onChange={e => setWidgetForm(p => ({ ...p, label: e.target.value }))}
                                    placeholder={WIDGET_META[widgetForm.type].label}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Visible para</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(SCOPE_META) as DashboardWidgetScope[]).map(s => (
                                        <button
                                            key={s} type="button"
                                            onClick={() => setWidgetForm(p => ({ ...p, scope: s }))}
                                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                                                widgetForm.scope === s
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                            }`}
                                        >
                                            {SCOPE_META[s].label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 accent-blue-600"
                                    checked={widgetForm.isActive}
                                    onChange={e => setWidgetForm(p => ({ ...p, isActive: e.target.checked }))}
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Visible (activo)</span>
                            </label>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowWidgetModal(false)} className="flex-1 px-4 py-2.5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">
                                Cancelar
                            </button>
                            <button onClick={saveWidget} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm font-semibold">
                                <Save size={15} />
                                {saving ? 'Guardando…' : editingWidget ? 'Actualizar' : 'Añadir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
