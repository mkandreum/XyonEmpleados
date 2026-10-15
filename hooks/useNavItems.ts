import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/api';

export interface NavItem {
    path: string;
    label: string;
    icon: LucideIcon;
}

const EMPLOYEE_ITEMS: NavItem[] = [
    { path: '/', label: 'Inicio', icon: LayoutDashboard },
    { path: '/payroll', label: 'Nómina', icon: FileText },
    { path: '/calendar', label: 'Calendario', icon: Calendar },
    { path: '/vacations', label: 'Ausencias', icon: CalendarDays },
    { path: '/news', label: 'Comunicados', icon: Newspaper },
];

const MANAGER_ITEMS: NavItem[] = [
    { path: '/manager/team', label: 'Equipo', icon: UserCircle },
    { path: '/manager/fichajes', label: 'Fichajes', icon: Clock },
];

const ADMIN_ITEMS: NavItem[] = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/users', label: 'Usuarios', icon: Users },
    { path: '/admin/fichajes', label: 'Fichajes', icon: Clock },
    { path: '/admin/vacations', label: 'Solicitudes', icon: Calendar },
    { path: '/admin/payrolls', label: 'Nóminas', icon: FileText },
    { path: '/admin/news', label: 'Noticias', icon: Newspaper },
    { path: '/admin/settings', label: 'Ajustes', icon: Settings },
];

const VACATION_TITLES = new Set([
    'solicitud aprobada',
    'solicitud rechazada',
    'nueva solicitud pendiente',
    'solicitud requiere aprobación final',
]);

const FICHAJE_TITLES = new Set([
    'aviso de llegada tarde',
    'aviso de fichaje',
    'ajuste de fichaje aprobado',
    'ajuste de fichaje rechazado',
    'recordatorio de fichaje',
]);

/** Which nav sections an unread notification belongs to, so the item can show a dot. */
const mapUnreadToPaths = (title: string, message: string, role: string): string[] => {
    const normalizedTitle = (title || '').trim().toLowerCase();
    const text = `${title} ${message}`.toLowerCase();
    const paths: string[] = [];
    const requests = role === 'ADMIN' ? '/admin/vacations' : role === 'MANAGER' ? '/manager/team' : '/vacations';
    const fichajes = role === 'ADMIN' ? '/admin/fichajes' : role === 'MANAGER' ? '/manager/fichajes' : '/news';

    if (VACATION_TITLES.has(normalizedTitle)) return [requests];
    if (FICHAJE_TITLES.has(normalizedTitle)) return [fichajes];

    if (text.includes('vacacion') || text.includes('ausenc') || text.includes('permiso') || text.includes('solicitud')) paths.push(requests);
    if (text.includes('fichaje') || text.includes('tarde') || text.includes('ajuste') || text.includes('justific')) paths.push(fichajes);
    if (text.includes('nomina') || text.includes('nómina') || text.includes('payroll')) paths.push(role === 'ADMIN' ? '/admin/payrolls' : '/payroll');
    if (text.includes('noticia') || text.includes('comunicado') || text.includes('evento')) paths.push(role === 'ADMIN' ? '/admin/news' : '/news');

    return paths;
};

/**
 * Role-based navigation items plus "pending" dots derived from unread notifications.
 * Shared by the desktop sidebar and the mobile capsule bar.
 */
export function useNavItems() {
    const { user } = useAuth() as any;
    const role: string = user?.role || '';
    const [pendingDots, setPendingDots] = useState<Set<string>>(new Set());
    const [unread, setUnread] = useState<any[]>([]);

    const items: NavItem[] = role === 'ADMIN'
        ? ADMIN_ITEMS
        : role === 'MANAGER' ? [...EMPLOYEE_ITEMS, ...MANAGER_ITEMS] : EMPLOYEE_ITEMS;

    useEffect(() => {
        if (!role) {
            setPendingDots(new Set());
            setUnread([]);
            return;
        }
        let mounted = true;

        const fetchPendingDots = async () => {
            const next = new Set<string>();
            try {
                const notifications = await notificationService.getAll();
                const list = notifications.filter((n: any) => !n.read);
                if (!mounted) return;
                setUnread(list);
                list.forEach((n: any) => mapUnreadToPaths(n.title || '', n.message || '', role).forEach(p => next.add(p)));
            } catch (error) {
                console.warn('Error loading unread notifications for nav dots:', error);
            }
            if (mounted) setPendingDots(next);
        };

        fetchPendingDots();
        const interval = setInterval(fetchPendingDots, 30000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [role]);

    /** Marks the notifications related to a section as read and clears its dot. */
    const markSectionAsRead = async (path: string) => {
        const related = unread.filter((n: any) => mapUnreadToPaths(n.title || '', n.message || '', role).includes(path));
        if (related.length === 0) return;
        try {
            await Promise.all(related.map((n: any) => notificationService.markAsRead(n.id)));
            setUnread(prev => prev.filter((n: any) => !related.some((r: any) => r.id === n.id)));
            setPendingDots(prev => {
                const updated = new Set(prev);
                updated.delete(path);
                return updated;
            });
        } catch (error) {
            console.warn('Error marking section notifications as read:', error);
        }
    };

    return { items, pendingDots, markSectionAsRead };
}
