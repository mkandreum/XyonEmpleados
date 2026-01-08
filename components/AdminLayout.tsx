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
    X
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
            : 'text-slate-600 hover:bg-slate-100'
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

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/users', label: 'Usuarios', icon: Users },
        { path: '/admin/vacations', label: 'Vacaciones', icon: Calendar },
        { path: '/admin/news', label: 'Noticias', icon: Newspaper },
        { path: '/admin/events', label: 'Eventos', icon: CalendarDays },
        { path: '/admin/payrolls', label: 'Nóminas', icon: FileText },
        { path: '/admin/benefits', label: 'Beneficios', icon: Gift },
        { path: '/admin/settings', label: 'Configuración', icon: Settings },
    ];

    const logoUrl = settings.logoUrl;
    const companyName = settings.companyName || 'Velilla';

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sidebar Desktop */}
            <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-white border-r border-slate-200">
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-200">
                    {logoUrl ? (
                        <img src={logoUrl} alt={companyName} className="w-auto h-auto object-contain max-w-full max-h-12" />
                    ) : (
                        <h1 className="text-xl font-bold text-slate-900">{companyName}<span className="text-blue-600">Admin</span></h1>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
                    {menuItems.map((item) => (
                        <SidebarItem
                            key={item.path}
                            to={item.path}
                            icon={item.icon}
                            label={item.label}
                            active={location.pathname === item.path}
                        />
                    ))}
                </nav>

                {/* User Section */}
                <div className="border-t border-slate-200 px-4 py-4">
                    <Link to="/admin/settings" className="flex items-center gap-3 mb-3 hover:bg-slate-50 rounded-lg p-2 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {user?.name?.charAt(0) || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                            <p className="text-xs text-slate-500 truncate">Administrador</p>
                        </div>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut size={18} />
                        <span className="font-medium">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-50">
                <div className="flex items-center gap-3">
                    {logoUrl ? (
                        <img src={logoUrl} alt={companyName} className="h-8 w-auto" />
                    ) : (
                        <h1 className="text-lg font-bold text-slate-900">{companyName}<span className="text-blue-600">Admin</span></h1>
                    )}
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 hover:bg-slate-100 rounded-lg"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="px-4 py-6 space-y-1 mt-16">
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
                            <button
                                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                                className="w-full flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-4"
                            >
                                <LogOut size={20} />
                                <span className="font-medium">Cerrar Sesión</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="lg:pl-64 pt-16 lg:pt-0">
                <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};
