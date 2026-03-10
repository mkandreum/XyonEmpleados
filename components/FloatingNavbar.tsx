import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    CalendarDays,
    Calendar,
    Newspaper,
    UserCircle,
    Users,
    Settings,
    Clock,
    AlertCircle,
    MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
    notificationService,
} from '../services/api';

interface NavItem {
    path: string;
    label: string;
    icon: any;
}

export const FloatingNavbar: React.FC = () => {
    const { user } = useAuth() as any;
    const location = useLocation();
    const [showMore, setShowMore] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [pendingDots, setPendingDots] = useState<Set<string>>(new Set());
    const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Define all possible sections
    const employeeItems: NavItem[] = [
        { path: '/', label: 'Inicio', icon: LayoutDashboard },
        { path: '/payroll', label: 'Nómina', icon: FileText },
        { path: '/calendar', label: 'Calendario', icon: Calendar },
        { path: '/vacations', label: 'Ausencias', icon: CalendarDays },
        { path: '/news', label: 'Comunicados', icon: Newspaper },
    ];

    const managerItems: NavItem[] = [
        { path: '/manager/team', label: 'Equipo', icon: UserCircle },
        { path: '/manager/fichajes', label: 'Fichajes', icon: Clock },
    ];

    const adminItems: NavItem[] = [
        { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/users', label: 'Usuarios', icon: Users },
        { path: '/admin/fichajes', label: 'Fichajes', icon: Clock },
        { path: '/admin/vacations', label: 'Solicitudes', icon: Calendar },
        { path: '/admin/payrolls', label: 'Nóminas', icon: FileText },
        { path: '/admin/news', label: 'Noticias', icon: Newspaper },
        { path: '/admin/settings', label: 'Ajustes', icon: Settings },
    ];

    const mapUnreadToPaths = (title: string, message: string, role: string) => {
        const normalizedTitle = (title || '').trim().toLowerCase();
        const text = `${title} ${message}`.toLowerCase();
        const paths: string[] = [];

        const vacationTitles = new Set([
            'solicitud aprobada',
            'solicitud rechazada',
            'nueva solicitud pendiente',
            'solicitud requiere aprobación final',
        ]);

        const fichajeTitles = new Set([
            'aviso de llegada tarde',
            'aviso de fichaje',
            'ajuste de fichaje aprobado',
            'ajuste de fichaje rechazado',
            'recordatorio de fichaje',
        ]);

        if (vacationTitles.has(normalizedTitle)) {
            if (role === 'ADMIN') paths.push('/admin/vacations');
            else if (role === 'MANAGER') paths.push('/manager/team');
            else paths.push('/vacations');
            return paths;
        }

        if (fichajeTitles.has(normalizedTitle)) {
            if (role === 'ADMIN') paths.push('/admin/fichajes');
            else if (role === 'MANAGER') paths.push('/manager/fichajes');
            else paths.push('/news');
            return paths;
        }

        if (text.includes('vacacion') || text.includes('ausenc') || text.includes('permiso') || text.includes('solicitud')) {
            if (role === 'ADMIN') paths.push('/admin/vacations');
            else if (role === 'MANAGER') paths.push('/manager/team');
            else paths.push('/vacations');
        }

        if (text.includes('fichaje') || text.includes('tarde') || text.includes('ajuste') || text.includes('justific')) {
            if (role === 'ADMIN') paths.push('/admin/fichajes');
            else if (role === 'MANAGER') paths.push('/manager/fichajes');
            else paths.push('/news');
        }

        if (text.includes('nomina') || text.includes('nómina') || text.includes('payroll')) {
            if (role === 'ADMIN') paths.push('/admin/payrolls');
            else paths.push('/payroll');
        }

        if (text.includes('noticia') || text.includes('comunicado') || text.includes('evento')) {
            if (role === 'ADMIN') paths.push('/admin/news');
            else paths.push('/news');
        }

        return paths;
    };

    useEffect(() => {
        if (!user?.role) {
            setPendingDots(new Set());
            setUnreadNotifications([]);
            return;
        }

        let mounted = true;

        const fetchPendingDots = async () => {
            const nextDots = new Set<string>();

            try {
                const notifications = await notificationService.getAll();
                const unread = notifications.filter((n: any) => !n.read);
                setUnreadNotifications(unread);

                unread
                    .forEach((n: any) => {
                        mapUnreadToPaths(n.title || '', n.message || '', user.role).forEach((path) => nextDots.add(path));
                    });
            } catch (error) {
                console.warn('Error loading unread notifications for navbar dots:', error);
            }

            if (mounted) setPendingDots(nextDots);
        };

        fetchPendingDots();
        const interval = setInterval(fetchPendingDots, 30000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [user?.role]);

    // Determine items based on role
    let items: NavItem[] = [];
    if (user?.role === 'ADMIN') {
        items = adminItems;
    } else {
        items = [...employeeItems];
        if (user?.role === 'MANAGER') {
            items = [...items, ...managerItems];
        }
        // User requested removing Profile button from here as it's repetitive
    }

    // Collapse logic: On mobile, limit to 4 items + "More". On Desktop, show all.
    const MAX_VISIBLE = isMobile ? 4 : 20;
    const visibleItems = items.slice(0, MAX_VISIBLE);
    const hiddenItems = items.slice(MAX_VISIBLE);
    const hasMore = hiddenItems.length > 0;

    // Find active index for sliding effect
    const activeIndex = visibleItems.findIndex(item => item.path === location.pathname);

    // If active item is hidden (in "More" menu), we don't show sliding pill on main bar
    const showSlider = activeIndex !== -1;

    const markSectionAsRead = async (path: string) => {
        const relatedUnread = unreadNotifications.filter((n: any) => {
            const mapped = mapUnreadToPaths(n.title || '', n.message || '', user?.role || '');
            return mapped.includes(path);
        });

        if (relatedUnread.length === 0) return;

        try {
            await Promise.all(relatedUnread.map((n: any) => notificationService.markAsRead(n.id)));
            setUnreadNotifications((prev) => prev.filter((n: any) => !relatedUnread.some((r: any) => r.id === n.id)));
            setPendingDots((prev) => {
                const updated = new Set(prev);
                updated.delete(path);
                return updated;
            });
        } catch (error) {
            console.warn('Error marking section notifications as read:', error);
        }
    };

    // Helper to handle click: mark section notifications as read, close menu and scroll top
    const handleNavClick = async (path: string) => {
        await markSectionAsRead(path);
        setShowMore(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[95vw] sm:max-w-fit transition-all duration-300">
            {/* Glass Container */}
            <div className="
                relative flex items-center p-1
                rounded-full
                bg-slate-100/90 dark:bg-slate-900/90 border border-blue-200/50 dark:border-blue-800/50
                backdrop-blur-[3px]
                shadow-[0_6px_6px_rgba(0,0,0,0.2),0_0_20px_rgba(0,0,0,0.1),inset_2px_2px_1px_0_rgba(255,255,255,0.5),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.5)]
                transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]
            ">

                {/* Sliding Active Indicator (The "Pill") */}
                {showSlider && (
                    <div
                        className="absolute top-1 bottom-1 bg-blue-600/90 dark:bg-blue-500/90 rounded-full shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] pointer-events-none"
                        style={{
                            left: `calc(4px + ${activeIndex * (isMobile ? 64 : 96)}px)`,
                            width: isMobile ? '64px' : '96px'
                        }}
                    />
                )}

                {/* Navigation Items */}
                {visibleItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    const hasPending = pendingDots.has(item.path);

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => { void handleNavClick(item.path); }}
                            className={`
                                relative z-10 flex flex-col items-center justify-center gap-1
                                h-14 sm:h-16
                                ${isMobile ? 'w-16' : 'w-24'}
                                rounded-full transition-colors duration-200
                                ${isActive
                                    ? 'text-white'
                                    : 'text-blue-700 dark:text-blue-400 hover:bg-white/20 dark:hover:bg-slate-800/30 hover:text-blue-800 dark:hover:text-blue-300'}
                            `}
                        >
                            <Icon size={isMobile ? 20 : 22} strokeWidth={isActive ? 3 : 2} className="transition-transform duration-200" />
                            {hasPending && (
                                <span className="absolute top-2 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-slate-900" />
                            )}

                            <span className={`text-[10px] sm:text-xs font-semibold leading-none ${isActive ? 'text-white font-bold' : 'transition-colors'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}

                {/* 'More' Button if needed */}
                {hasMore && (
                    <div className="relative z-10">
                        <button
                            onClick={() => setShowMore(!showMore)}
                            className={`
                                flex flex-col items-center justify-center gap-1
                                h-14 sm:h-16
                                ${isMobile ? 'w-16' : 'w-24'}
                                rounded-full transition-colors duration-200
                                ${showMore
                                    ? 'text-blue-700 dark:text-blue-400 bg-white/50 dark:bg-slate-800/50'
                                    : 'text-blue-700 dark:text-blue-400 hover:bg-white/20 dark:hover:bg-slate-800/30 hover:text-blue-800 dark:hover:text-blue-300'}
                            `}
                        >
                            <MoreHorizontal size={22} />
                            <span className="text-[10px] sm:text-xs font-medium leading-none">Más</span>
                        </button>

                        {/* Popup Menu for Hidden Items */}
                        {showMore && (
                            <div className="
                                absolute bottom-full right-0 mb-4 
                                flex flex-col gap-2 p-2 
                                bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl 
                                border border-white/40 dark:border-slate-700
                                shadow-xl rounded-2xl
                                min-w-[160px]
                                animate-slide-up origin-bottom-right
                            ">
                                {hiddenItems.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    const Icon = item.icon;
                                    const hasPending = pendingDots.has(item.path);
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => { void handleNavClick(item.path); }}
                                            className={`
                                                flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                                                ${isActive
                                                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                                                    : 'text-blue-700 dark:text-blue-400 hover:bg-white/50 dark:hover:bg-slate-800/50'}
                                            `}
                                        >
                                            <div className="relative">
                                                <Icon size={18} />
                                                {hasPending && (
                                                    <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-slate-900" />
                                                )}
                                            </div>
                                            <span className="text-sm font-medium">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
