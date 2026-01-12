import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, AlertCircle, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface Notification {
    id: string;
    title: string;
    message: string;
    read: boolean;
    date: string;
}

export const NotificationDropdown: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { token } = useAuth();

    const fetchNotifications = React.useCallback(async () => {
        try {
            console.log('🔔 [FRONTEND] Fetching notifications...');
            const response = await api.get('/notifications');
            if (response.data && Array.isArray(response.data.notifications)) {
                setNotifications(response.data.notifications);
                setUnreadCount(response.data.unreadCount || 0);
                console.log(`🔔 [FRONTEND] Loaded ${response.data.notifications.length} notifications, ${response.data.unreadCount} unread`);
            } else {
                console.warn('Invalid notifications response format', response.data);
                setNotifications([]);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            // Don't crash, just show empty
            setNotifications([]);
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchNotifications();
            // Poll every 5 seconds for near-real-time updates
            console.log('🔔 [FRONTEND] Starting notification polling (every 5s)');
            const interval = setInterval(fetchNotifications, 5000);
            return () => clearInterval(interval);
        }
    }, [token, fetchNotifications]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            // If it was unread, decrement unread count
            const wasUnread = notifications.find(n => n.id === id)?.read === false;
            if (wasUnread) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getNotificationStyle = (title: string, message: string) => {
        const text = (title + message).toLowerCase();
        if (text.includes('aprobada') || text.includes('approved')) {
            return 'border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-900/10';
        }
        if (text.includes('rechazada') || text.includes('rejected')) {
            return 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10';
        }
        if (text.includes('aviso') || text.includes('tarde') || text.includes('warning')) {
            return 'border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10';
        }
        return 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10';
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                title="Notificaciones"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900 animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-fadeIn">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Notificaciones</h3>
                            <button
                                onClick={(e) => { e.stopPropagation(); fetchNotifications(); }}
                                className="text-slate-400 hover:text-blue-500 transition-colors"
                                title="Actualizar"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                            </button>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                            >
                                Marcar todo leído
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                <p className="text-sm">No tienes notificaciones</p>
                            </div>
                        ) : (
                            <div>
                                {notifications.map(notification => {
                                    const text = (notification.title + notification.message).toLowerCase();
                                    const isApproved = text.includes('aprobada') || text.includes('approved');
                                    const isRejected = text.includes('rechazada') || text.includes('rejected');
                                    const isWarning = text.includes('aviso') || text.includes('tarde') || text.includes('warning');
                                    const isJustification = text.includes('justificación');

                                    let icon = <Bell size={20} />;
                                    if (isApproved) icon = <Check size={20} className="text-green-600" />;
                                    else if (isRejected) icon = <X size={20} className="text-red-600" />;
                                    else if (isWarning) icon = <AlertCircle size={20} className="text-amber-600" />;
                                    else if (isJustification) icon = <FileText size={20} className="text-blue-600" />;

                                    return (
                                        <div
                                            key={notification.id}
                                            onClick={() => {
                                                if (isWarning || isJustification) {
                                                    window.location.href = `/news?tab=attendance&notifyId=${notification.id}`;
                                                    setIsOpen(false);
                                                }
                                            }}
                                            className={`px-4 py-3 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${(isWarning || isJustification) ? 'cursor-pointer' : ''} ${getNotificationStyle(notification.title, notification.message)} ${!notification.read ? 'opacity-100' : 'opacity-70 dark:opacity-60'}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 mt-1">
                                                    {icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`text-sm ${!notification.read ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                                        {notification.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 block">
                                                        {new Date(notification.date).toLocaleDateString()} {new Date(notification.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1 flex-shrink-0">
                                                    {!notification.read && (
                                                        <button
                                                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                            className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all"
                                                            title="Marcar como leída"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => handleDelete(notification.id, e)}
                                                        className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 p-1 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
