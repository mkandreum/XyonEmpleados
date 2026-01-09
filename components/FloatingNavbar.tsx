import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    CalendarDays,
    Newspaper,
    UserCircle,
    Users,
    Calendar,
    Settings,
    Clock,
    MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
    path: string;
    label: string;
    icon: any;
}

export const FloatingNavbar: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [showMore, setShowMore] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Define all possible sections
    const employeeItems: NavItem[] = [
        { path: '/', label: 'Inicio', icon: LayoutDashboard },
        { path: '/payroll', label: 'Nómina', icon: FileText },
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
        { path: '/admin/vacations', label: 'Vacaciones', icon: Calendar },
        { path: '/admin/payrolls', label: 'Nóminas', icon: FileText },
        { path: '/admin/news', label: 'Noticias', icon: Newspaper },
        { path: '/admin/settings', label: 'Ajustes', icon: Settings },
    ];

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

    // Helper to handle click: Close menu & Scroll top
    const handleNavClick = () => {
        setShowMore(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[95vw] sm:max-w-fit transition-all duration-300">
            {/* Glass Container */}
            <div className="
                relative flex items-center p-1
                rounded-full
                bg-white/40 dark:bg-slate-900/60
                backdrop-blur-xl
                border border-white/30 dark:border-slate-700/50
                shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]
                transition-colors duration-300
            ">

                {/* Sliding Active Indicator (The "Pill") */}
                {showSlider && (
                    <div
                        className="absolute top-1 bottom-1 bg-white dark:bg-slate-800 rounded-full shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] pointer-events-none"
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

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={handleNavClick}
                            className={`
                                relative z-10 flex flex-col items-center justify-center gap-1
                                h-14 sm:h-16
                                ${isMobile ? 'w-16' : 'w-24'}
                                rounded-full transition-colors duration-200
                                ${isActive
                                    ? 'text-blue-700 dark:text-blue-400'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/20 dark:hover:bg-slate-800/30 hover:text-slate-700 dark:hover:text-slate-200'}
                            `}
                        >
                            <Icon size={isMobile ? 20 : 22} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-200" />

                            <span className={`text-[10px] sm:text-xs font-medium leading-none ${isActive ? 'text-blue-900 dark:text-blue-200 font-bold' : ''}`}>
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
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/20 dark:hover:bg-slate-800/30 hover:text-slate-700 dark:hover:text-slate-200'}
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
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={handleNavClick}
                                            className={`
                                                flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                                                ${isActive
                                                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'}
                                            `}
                                        >
                                            <Icon size={18} />
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
