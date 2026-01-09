import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useSettings';
import {
    LayoutDashboard,
    Users,
    Calendar,
    Newspaper,
    CalendarDays,
    FileText,
    Gift,
    Settings,
    LogOut,
    Bell,
    Menu,
    X,
    Clock
} from 'lucide-react';

interface SidebarItemProps {
    to: string;
    icon: any;
    label: string;
    active: boolean;
    onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon: Icon, label, active, onClick }) => (
    <Link
        to={to}
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
    >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
    </Link>
);

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { settings } = useSettings();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [logoError, setLogoError] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/users', label: 'Usuarios', icon: Users },
        { path: '/admin/vacations', label: 'Vacaciones', icon: Calendar },
        { path: '/admin/fichajes', label: 'Fichajes', icon: Clock },
        { path: '/admin/news', label: 'Noticias', icon: Newspaper },
        { path: '/admin/events', label: 'Eventos', icon: CalendarDays },
        { path: '/admin/payrolls', label: 'Nóminas', icon: FileText },
        { path: '/admin/benefits', label: 'Beneficios', icon: Gift },
        { path: '/admin/settings', label: 'Configuración', icon: Settings },
    ];

    const logoUrl = settings.logoUrl;
    const companyName = settings.companyName || 'XyonEmpleados';

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden">
            {/* Sidebar - Desktop & Mobile Wrapper */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                        <Link to="/admin" className="flex items-center gap-2">
                            {logoUrl && !logoError ? (
                                <img
                                    src={logoUrl}
                                    alt={companyName}
                                    className="w-auto object-contain"
                                    onError={() => setLogoError(true)}
                                />
                            ) : (
                                <h1 className="text-xl font-bold text-white max-w-[200px] truncate" title={companyName}>
                                    {companyName}<span className="text-blue-500">Admin</span>
                                </h1>
                            )}
                        </Link>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1 dark-scrollbar">
                        {menuItems.map((item) => (
                            <SidebarItem
                                key={item.path}
                                to={item.path}
                                icon={item.icon}
                                label={item.label}
                                active={location.pathname === item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                            />
                        ))}
                    </nav>

                    {/* User Section (Bottom Sidebar) */}
                    <div className="border-t border-slate-800 px-4 py-4">
                        <Link to="/admin/settings" className="flex items-center gap-3 mb-3 hover:bg-slate-800 rounded-lg p-2 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                {user?.name?.charAt(0) || 'A'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                <p className="text-xs text-slate-400 truncate">Administrador</p>
                            </div>
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <LogOut size={18} />
                            <span className="font-medium">Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header (Mobile Toggle & Title/Breadcrumbs if needed, simplified for Admin) */}
                <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 lg:px-8 z-10">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md"
                    >
                        <Menu size={24} />
                    </button>

                    {/* Title or decorative element could go here, but for now we keep it clean or align right */}
                    <div className="flex-1"></div>

                    {/* Right Header Controls */}
                    <div className="flex items-center gap-4">
                        {/* We can add Admin Notifications or just the profile link again if desired, 
                             but the Sidebar already has profile. 
                             Let's just keep it clean or maybe a Notification bell if Admin has them. 
                             Not essential for "matching layout" logic but header presence is key. */}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto bg-slate-50 p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}
        </div>
    );
};
