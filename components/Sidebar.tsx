import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Moon, Sun, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { useNavItems } from '../hooks/useNavItems';
import { useTheme } from '../context/ThemeContext';
import { NotificationDropdown } from './NotificationDropdown';
import { Sparkle, COLORS } from './Shapes';
import { LogoMark } from './LogoMark';
import { haptic } from '../utils/haptics';
import { Avatar } from './Avatar';

const ROW = 48; // px per nav row
const GAP = 4;  // px between rows

interface SidebarProps {
    collapsed: boolean;
    onToggleCollapsed: () => void;
    companyName: string;
    logoUrl?: string;
    user: { name?: string; email?: string; avatarUrl?: string; role?: string } | null;
    onOpenProfile: () => void;
    onLogout: () => void;
}

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Administración', MANAGER: 'Responsable', EMPLOYEE: 'Empleado' };

/**
 * Desktop navigation (>= lg): floating ink panel on the left with a lime highlight that
 * springs between items — the app's capsule bar turned vertical. Collapsible to icons.
 */
export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapsed, companyName, logoUrl, user, onOpenProfile, onLogout }) => {
    const location = useLocation();
    const { isDark, toggleTheme } = useTheme();
    const { items, pendingDots, markSectionAsRead } = useNavItems();
    const [logoError, setLogoError] = useState(false);
    const activeIndex = items.findIndex(item => item.path === location.pathname);

    const footerBtn = `press flex items-center gap-3 h-11 rounded-full text-sm font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors ${collapsed ? 'justify-center w-11 mx-auto' : 'px-3.5 w-full'}`;

    return (
        <aside
            aria-label="Barra lateral"
            className={`hidden lg:flex fixed top-3 bottom-3 left-3 z-nav flex-col rounded-[2rem] bg-ink text-white dark:bg-[#14141C] dark:border-thick dark:border-slate-700 transition-[width] duration-500 ease-out-expo ${collapsed ? 'w-[5.25rem]' : 'w-[16.5rem]'}`}
        >
            {/* Decorative shapes (clipped separately so popovers can overflow the panel) */}
            <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none" aria-hidden="true">
                <Sparkle size={56} color={COLORS.lime} className="absolute -right-3 top-24 opacity-20 animate-spin-slow" />
            </div>

            {/* Brand */}
            <div className={`relative flex items-center h-20 shrink-0 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
                <Link to="/" className="flex items-center gap-2.5 min-w-0" aria-label={`${companyName} — inicio`}>
                    {logoUrl && !logoError && !collapsed ? (
                        <img src={logoUrl} alt={companyName} className="h-10 w-auto max-w-[11rem] object-contain" onError={() => setLogoError(true)} />
                    ) : (
                        <>
                            <LogoMark size={40} className="shrink-0 rounded-[12px]" />
                            {!collapsed && (
                                <span className="font-display font-black text-xl tracking-tighter leading-none truncate">
                                    {companyName}
                                </span>
                            )}
                        </>
                    )}
                </Link>
            </div>

            {/* Quick switcher */}
            <div className="relative px-3 pb-2">
                <button
                    onClick={() => window.dispatchEvent(new Event('xyon:open-palette'))}
                    className={`press w-full flex items-center gap-3 h-11 rounded-full bg-white/[0.07] hover:bg-white/[0.12] text-white/60 hover:text-white text-sm font-semibold transition-colors ${collapsed ? 'justify-center' : 'px-4'}`}
                    aria-label="Buscar sección (Ctrl+K)"
                    title={collapsed ? 'Buscar (Ctrl+K)' : undefined}
                >
                    <Search size={18} aria-hidden="true" />
                    {!collapsed && (
                        <>
                            <span className="flex-1 text-left">Buscar…</span>
                            <kbd className="text-2xs font-bold text-white/50 border border-white/20 rounded-md px-1.5 py-0.5">Ctrl K</kbd>
                        </>
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav aria-label="Navegación principal" className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 pt-2 dark-scrollbar">
                <div className="relative" style={{ display: 'grid', gap: GAP }}>
                    {activeIndex !== -1 && (
                        <span
                            aria-hidden="true"
                            className="absolute left-0 right-0 top-0 rounded-full bg-lime transition-transform duration-500 ease-spring"
                            style={{ height: ROW, transform: `translateY(${activeIndex * (ROW + GAP)}px)` }}
                        />
                    )}
                    {items.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                title={collapsed ? item.label : undefined}
                                aria-label={collapsed ? item.label : undefined}
                                aria-current={isActive ? 'page' : undefined}
                                onClick={() => { haptic('light'); void markSectionAsRead(item.path); }}
                                className={`relative z-10 flex items-center gap-3 rounded-full font-bold text-[0.9375rem] tracking-tight transition-colors duration-300
                                    ${collapsed ? 'justify-center' : 'px-4'}
                                    ${isActive ? 'text-ink' : 'text-white/65 hover:text-white hover:bg-white/[0.07]'}`}
                                style={{ height: ROW }}
                            >
                                <span className="relative shrink-0">
                                    <Icon size={20} strokeWidth={isActive ? 2.6 : 2} aria-hidden="true" />
                                    {pendingDots.has(item.path) && (
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-coral rounded-full ring-2 ring-ink" aria-hidden="true" />
                                    )}
                                </span>
                                {!collapsed && <span className="truncate">{item.label}</span>}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Footer: tools + profile */}
            <div className="relative shrink-0 px-3 pb-3 pt-3 border-t border-white/10 flex flex-col gap-1">
                <NotificationDropdown
                    placement="side"
                    label={collapsed ? undefined : 'Notificaciones'}
                    buttonClassName={footerBtn}
                />
                <button onClick={toggleTheme} className={footerBtn} aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} title={collapsed ? (isDark ? 'Modo claro' : 'Modo oscuro') : undefined}>
                    {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
                    {!collapsed && <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>}
                </button>
                <button onClick={onToggleCollapsed} className={footerBtn} aria-label={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'} aria-expanded={!collapsed} title={collapsed ? 'Expandir' : undefined}>
                    {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
                    {!collapsed && <span>Contraer</span>}
                </button>

                <div className={`mt-2 flex items-center gap-2 rounded-[1.5rem] bg-white/[0.06] ${collapsed ? 'flex-col p-1.5' : 'p-1.5 pr-2'}`}>
                    <button onClick={onOpenProfile} className="press flex items-center gap-3 min-w-0 flex-1 rounded-full text-left" aria-label="Mi perfil" title={collapsed ? 'Mi perfil' : undefined}>
                        <Avatar name={user?.name} url={user?.avatarUrl} size={40} className="ring-2 ring-lime" />
                        {!collapsed && (
                            <span className="min-w-0">
                                <span className="block text-sm font-extrabold truncate">{user?.name}</span>
                                <span className="block text-2xs text-white/60 truncate">{ROLE_LABEL[user?.role || ''] || user?.email}</span>
                            </span>
                        )}
                    </button>
                    <button onClick={onLogout} className="press shrink-0 w-10 h-10 grid place-items-center rounded-full text-white/70 hover:text-ink hover:bg-coral transition-colors" aria-label="Cerrar sesión" title="Cerrar sesión">
                        <LogOut size={18} aria-hidden="true" />
                    </button>
                </div>
            </div>
        </aside>
    );
};
