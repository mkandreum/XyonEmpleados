import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Calendar, Settings, LogOut, Menu, X, Bell, Newspaper, CalendarDays, FileText } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { settings } = useSettings();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navigation = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Usuarios', href: '/admin/users', icon: Users },
        { name: 'Vacaciones', href: '/admin/vacations', icon: Calendar },
        { name: 'Nóminas', href: '/admin/payrolls', icon: FileText },
        { name: 'Noticias', href: '/admin/news', icon: Newspaper },
        { name: 'Eventos', href: '/admin/events', icon: CalendarDays },
        { name: 'Configuración', href: '/admin/settings', icon: Settings },
    ];

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const companyName = settings.companyName || 'Velilla';
    const adminLogoUrl = settings.adminLogoUrl;

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:relative md:translate-x-0
            `}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                        <Link to="/admin" className="text-xl font-bold tracking-wider">
                            {adminLogoUrl ? (
                                <img src={adminLogoUrl} alt={`${companyName} Admin`} className="h-8 w-auto" />
                            ) : (
                                <>{companyName}<span className="text-purple-500">Admin</span></>
                            )}
                        </Link>
                        <button onClick={toggleSidebar} className="md:hidden text-slate-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-4 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <img
                                src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.name || 'Admin'}`}
                                alt="Admin Profile"
                                className="w-10 h-10 rounded-full border-2 border-blue-500"
                            />
                            <div className="overflow-hidden">
                                <p className="font-medium text-sm truncate">{user?.name}</p>
                                <p className="text-xs text-slate-400 truncate">Administrador</p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`
                                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                        ${isActive
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                                    `}
                                >
                                    <item.icon size={20} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-slate-800">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <LogOut size={20} />
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={toggleSidebar}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar */}
                <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
                    <button onClick={toggleSidebar} className="md:hidden text-slate-600 hover:text-slate-900">
                        <Menu size={24} />
                    </button>

                    <div className="flex-1 px-4 md:px-0">
                        <h2 className="text-lg font-semibold text-slate-800">Panel de Administración</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                            Ir al Portal
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};
