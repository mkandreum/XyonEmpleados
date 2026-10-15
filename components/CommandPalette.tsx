import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, Gift, CalendarHeart, LayoutGrid, User, UserRound } from 'lucide-react';
import { adminService } from '../services/api';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavItems } from '../hooks/useNavItems';

interface Command { path: string; label: string; icon: LucideIcon; group: string }

const ADMIN_EXTRA: Command[] = [
    { path: '/admin/events', label: 'Eventos', icon: CalendarHeart, group: 'Administración' },
    { path: '/admin/benefits', label: 'Beneficios', icon: Gift, group: 'Administración' },
    { path: '/admin/content-layout', label: 'Diseño del inicio', icon: LayoutGrid, group: 'Administración' },
];

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Desktop quick switcher (Ctrl/⌘ + K): type to jump to any section, including admin areas
 * that are not in the sidebar. Opened from the sidebar search button too (`xyon:open-palette`).
 */
export const CommandPalette: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth() as any;
    const { items } = useNavItems();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const isAdmin = user?.role === 'ADMIN';
    const [people, setPeople] = useState<Command[] | null>(null);

    // Admins can also jump straight to a person (loaded once, the first time the palette opens)
    useEffect(() => {
        if (!open || !isAdmin || people) return;
        adminService.getUsers()
            .then((list: any[]) => setPeople(list.map(u => ({
                path: `/admin/users?q=${encodeURIComponent(u.name)}`,
                label: u.name,
                icon: UserRound,
                group: u.department || 'Persona',
            }))))
            .catch(() => setPeople([]));
    }, [open, isAdmin, people]);

    const commands = useMemo<Command[]>(() => {
        const base = items.map(i => ({ ...i, group: 'Secciones' }));
        const extra = user?.role === 'ADMIN' ? ADMIN_EXTRA : [];
        return [...base, ...extra, { path: '/profile', label: 'Mi perfil', icon: User, group: 'Cuenta' }];
    }, [items, user?.role]);

    const results = useMemo(() => {
        const q = normalize(query.trim());
        if (!q) return commands;
        const sections = commands.filter(c => normalize(c.label).includes(q));
        const persons = (people || []).filter(c => normalize(c.label).includes(q)).slice(0, 8);
        return [...sections, ...persons];
    }, [commands, query, people]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen(o => !o);
            } else if (e.key === 'Escape') {
                setOpen(false);
            }
        };
        const onOpen = () => setOpen(true);
        window.addEventListener('keydown', onKey);
        window.addEventListener('xyon:open-palette', onOpen);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('xyon:open-palette', onOpen);
        };
    }, []);

    useEffect(() => {
        if (open) {
            setQuery('');
            setActive(0);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [open]);

    useEffect(() => { setActive(0); }, [query]);

    if (!open) return null;

    const go = (c?: Command) => {
        if (!c) return;
        setOpen(false);
        navigate(c.path);
    };

    const onInputKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(results.length - 1, a + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
        else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
    };

    return (
        <div className="modal-backdrop !items-start pt-[12vh]" onClick={() => setOpen(false)}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Ir a una sección"
                className="modal-panel max-w-xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-200 dark:border-slate-800">
                    <Search size={20} className="text-slate-500 shrink-0" aria-hidden="true" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={onInputKey}
                        placeholder={isAdmin ? 'Busca una sección o una persona…' : '¿A dónde quieres ir?'}
                        aria-label="Buscar sección"
                        aria-controls="palette-results"
                        aria-activedescendant={results[active] ? `cmd-${active}` : undefined}
                        className="flex-1 bg-transparent border-0 outline-none text-lg font-semibold text-ink dark:text-white placeholder:text-slate-400 focus:ring-0 focus-visible:outline-none p-0"
                    />
                    <kbd className="chip bg-slate-100 dark:bg-slate-800 text-slate-500">Esc</kbd>
                </div>
                <ul id="palette-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
                    {results.length === 0 && (
                        <li className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Nada coincide con “{query}”.</li>
                    )}
                    {results.map((c, i) => {
                        const Icon = c.icon;
                        const selected = i === active;
                        return (
                            <li
                                key={c.path}
                                id={`cmd-${i}`}
                                role="option"
                                aria-selected={selected}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => go(c)}
                                className={`flex items-center gap-3 px-4 h-12 rounded-full cursor-pointer font-bold transition-colors ${selected ? 'bg-lime text-ink' : 'text-ink dark:text-slate-200'}`}
                            >
                                <Icon size={18} aria-hidden="true" />
                                <span className="flex-1">{c.label}</span>
                                <span className={`text-2xs font-semibold ${selected ? 'text-ink/60' : 'text-slate-400'}`}>{c.group}</span>
                                {selected && <CornerDownLeft size={16} aria-hidden="true" />}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};
