import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    CalendarDays,
    Newspaper,
    UserCircle,
    Users,
    Calendar,
    Gift,
    Settings,
    Clock,
    Menu,
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
        // Shared items for non-admins
        items.push({ path: '/profile', label: 'Perfil', icon: UserCircle });
    }

    // Mobile/Compact logic: Show first 4 + More button if > 5 items
    const MAX_VISIBLE = 5;
    const visibleItems = items.slice(0, MAX_VISIBLE);
    const hiddenItems = items.slice(MAX_VISIBLE);
    const hasMore = hiddenItems.length > 0;

    return (
        <>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] sm:max-w-fit">
                {/* Glass Container */}
                <div className="
          relative flex items-center justify-between sm:justify-center gap-1 sm:gap-2 px-3 py-3 sm:px-6 
          rounded-full 
          bg-white/70 sm:bg-white/60 
          backdrop-blur-2xl 
          border border-white/40 
          shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] 
          bg-opacity-20 
          bg-clip-padding 
          transition-all duration-300
        ">

                    {/* Shine/Reflection Effect */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 to-transparent pointer-events-none" />

                    {/* Navigation Items */}
                    {visibleItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`
                  relative group flex flex-col items-center justify-center 
                  w-12 h-12 sm:w-14 sm:h-14 
                  rounded-full transition-all duration-300
                  hover:bg-white/50
                  ${isActive ? 'text-blue-600 bg-white/80 shadow-sm' : 'text-slate-500 hover:text-slate-800'}
                `}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className="relative z-10 transition-transform duration-300 group-hover:-translate-y-1" />

                                {/* Tooltip Label (Desktop) */}
                                <span className="
                  absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 
                  bg-slate-900 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100
                  pointer-events-none
                ">
                                    {item.label}
                                </span>

                                {/* Active Indicator Dot */}
                                {isActive && (
                                    <span className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
                                )}
                            </Link>
                        );
                    })}

                    {/* 'More' Button if needed */}
                    {hasMore && (
                        <div className="relative">
                            <button
                                onClick={() => setShowMore(!showMore)}
                                className={`
                  relative group flex flex-col items-center justify-center 
                  w-12 h-12 sm:w-14 sm:h-14 
                  rounded-full transition-all duration-300
                  hover:bg-white/50
                  ${showMore ? 'text-blue-600 bg-white/80 shadow-sm' : 'text-slate-500 hover:text-slate-800'}
                `}
                            >
                                <MoreHorizontal size={22} className="relative z-10" />
                            </button>

                            {/* Popup Menu for Hidden Items */}
                            {showMore && (
                                <div className="
                  absolute bottom-full right-0 mb-4 
                  flex flex-col gap-2 p-2 
                  bg-white/80 backdrop-blur-xl 
                  border border-white/40 
                  shadow-xl rounded-2xl
                  min-w-[160px]
                  animate-slide-up
                ">
                                    {hiddenItems.map((item) => {
                                        const isActive = location.pathname === item.path;
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setShowMore(false)}
                                                className={`
                          flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                          ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-white/50'}
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
        </>
    );
};
