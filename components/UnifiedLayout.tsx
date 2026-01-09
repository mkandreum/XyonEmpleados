import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../context/ThemeContext';
import { NotificationDropdown } from './NotificationDropdown';
import { FloatingNavbar } from './FloatingNavbar';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Moon, Sun } from 'lucide-react';
import { getAbsoluteUrl } from '../utils/urlUtils';

export const UnifiedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const { settings } = useSettings();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [logoError, setLogoError] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const companyName = settings.companyName || 'Velilla';
    const logoUrl = settings.logoUrl;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
            {/* Top Bar - Minimal */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-white/20 dark:border-slate-800 shadow-sm z-40 px-4 sm:px-8 flex items-center justify-between transition-colors duration-300">

                {/* Brand / Logo */}
                <div className="flex items-center gap-3">
                    {logoUrl && !logoError ? (
                        <img
                            src={logoUrl}
                            alt={companyName}
                            className="h-16 w-auto object-contain"
                            onError={() => setLogoError(true)}
                        />
                    ) : (
                        <div className="flex flex-col">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
                                {companyName}<span className="text-blue-600 dark:text-blue-400">Portal</span>
                            </h1>
                        </div>
                    )}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            console.log('[UnifiedLayout] Mode selector clicked. Current isDark:', isDark);
                            toggleTheme();
                        }}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                    >
                        {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    <NotificationDropdown />

                    {/* User Profile Trigger */}
                    <div className="relative">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-full transition-colors"
                        >
                            <img
                                src={getAbsoluteUrl(user?.avatarUrl)}
                                alt="Profile"
                                className="w-9 h-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-700 shadow-sm"
                            />
                        </button>

                        {/* Dropdown Menu */}
                        {showProfileMenu && (
                            <div className="absolute top-12 right-0 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 animate-fade-in z-50">
                                <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                                </div>
                                <Link
                                    to={user?.role === 'ADMIN' ? '/admin/settings' : '/profile'}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    onClick={() => setShowProfileMenu(false)}
                                >
                                    <User size={16} />
                                    Mi Perfil / Ajustes
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    <LogOut size={16} />
                                    Cerrar Sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            {/* Added pb-32 to account for floating header and bottom bar */}
            <main className="flex-1 pt-24 pb-32 px-4 sm:px-8 max-w-7xl mx-auto w-full animate-fade-in text-slate-900 dark:text-slate-100">
                {children}
            </main>

            {/* Floating Navigation */}
            <FloatingNavbar />

            {/* Mobile Overlay for Profile Menu closure if needed */}
            {showProfileMenu && (
                <div
                    className="fixed inset-0 z-30 bg-transparent"
                    onClick={() => setShowProfileMenu(false)}
                />
            )}
        </div>
    );
};
