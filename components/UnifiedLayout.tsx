import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../context/ThemeContext';
import { NotificationDropdown } from './NotificationDropdown';
import { FloatingNavbar } from './FloatingNavbar';
import { Sidebar } from './Sidebar';
import { ProfileModal } from './ProfileModal';
import { AuroraBackdrop } from './Shapes';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { Avatar } from './Avatar';
import { LogoMark } from './LogoMark';
import { CommandPalette } from './CommandPalette';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { LogOut, User, Moon, Sun } from 'lucide-react';

const COLLAPSE_KEY = 'xyon.sidebarCollapsed';

const readCollapsed = (): boolean => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
};

/**
 * App shell.
 *  - Desktop (>= lg): left floating Sidebar, content offset to its width.
 *  - Mobile/tablet: slim top bar + floating dark capsule nav at the bottom (like the native app).
 */
export const UnifiedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const { settings } = useSettings();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [logoError, setLogoError] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [collapsed, setCollapsed] = useState(readCollapsed);
    // Mount only the navigation for this screen size (each one polls notifications)
    const isDesktop = useMediaQuery('(min-width: 1024px)');

    const companyName = settings.companyName || 'XyonEmpleados';
    const logoUrl = settings.logoUrl;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleCollapsed = () => {
        setCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
            return next;
        });
    };

    return (
        <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            <AuroraBackdrop />

            {isDesktop && (
                <Sidebar
                    collapsed={collapsed}
                    onToggleCollapsed={toggleCollapsed}
                    companyName={companyName}
                    logoUrl={logoUrl}
                    user={user as any}
                    onOpenProfile={() => setShowProfileModal(true)}
                    onLogout={handleLogout}
                />
            )}

            {/* Mobile / tablet top bar */}
            {!isDesktop && (
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 z-header px-4 sm:px-6 flex items-center justify-between bg-slate-50/85 dark:bg-slate-950/85 backdrop-blur-md">
                <Link to="/" className="flex items-center gap-2 min-w-0" aria-label={`${companyName} — inicio`}>
                    {logoUrl && !logoError ? (
                        <img src={logoUrl} alt={companyName} className="h-10 w-auto max-w-[10rem] object-contain" onError={() => setLogoError(true)} />
                    ) : (
                        <>
                            <LogoMark size={36} className="shrink-0" />
                            <span className="font-display font-black text-xl tracking-tighter text-ink dark:text-white truncate">{companyName}</span>
                        </>
                    )}
                </Link>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={toggleTheme}
                        className="press p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                    >
                        {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
                    </button>

                    <NotificationDropdown />

                    <div className="relative">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            aria-label="Menú de usuario"
                            aria-haspopup="menu"
                            aria-expanded={showProfileMenu}
                            className="press flex items-center p-0.5 rounded-full"
                        >
                            <Avatar name={user?.name} url={user?.avatarUrl} size={36} className="ring-2 ring-ink dark:ring-lime" />
                        </button>

                        {showProfileMenu && (
                            <div role="menu" className="card absolute top-12 right-0 w-60 shadow-float py-2 animate-pop origin-top-right z-popover">
                                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                                    <p className="text-sm font-extrabold text-ink dark:text-white truncate">{user?.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                                </div>
                                <button
                                    role="menuitem"
                                    onClick={() => { setShowProfileMenu(false); setShowProfileModal(true); }}
                                    className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-ink dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <User size={16} aria-hidden="true" />
                                    Mi perfil
                                </button>
                                <button
                                    role="menuitem"
                                    onClick={handleLogout}
                                    className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-coral-ink dark:text-coral hover:bg-coral-soft dark:hover:bg-coral/10 transition-colors"
                                >
                                    <LogOut size={16} aria-hidden="true" />
                                    Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            )}

            {showProfileMenu && (
                <div className="lg:hidden fixed inset-0 z-30" onClick={() => setShowProfileMenu(false)} aria-hidden="true" />
            )}

            {/* Content: offset by the sidebar on desktop, by the top bar + capsule on mobile */}
            <main
                className={`relative z-10 pt-20 pb-32 px-4 sm:px-6 lg:pt-10 lg:pb-12 lg:pr-10 text-ink dark:text-slate-100 transition-[padding] duration-500 ease-out-expo
                    ${collapsed ? 'lg:pl-[7.5rem]' : 'lg:pl-[19.5rem]'}`}
            >
                <div className="max-w-7xl mx-auto w-full animate-fade-in">
                    <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>
                </div>
            </main>

            {!isDesktop && <FloatingNavbar />}
            <CommandPalette />

            <ProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                user={user}
                onUpdate={() => window.location.reload()}
            />
        </div>
    );
};
