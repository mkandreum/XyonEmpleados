import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
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

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            if (response.data && Array.isArray(response.data.notifications)) {
                setNotifications(response.data.notifications);
                setUnreadCount(response.data.unreadCount || 0);
            } else {
                console.warn('Invalid notifications response format', response.data);
                setNotifications([]);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            // Don't crash, just show empty
            setNotifications([]);
        }
    };

    useEffect(() => {
        if (token) {
            fetchNotifications();
            // Poll every 15 seconds
            const interval = setInterval(fetchNotifications, 15000);
            return () => clearInterval(interval);
        }
    }, [token]);

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
            return 'border-l-4 border-l-green-500 bg-green-50/50';
        }
        if (text.includes('rechazada') || text.includes('rejected')) {
            return 'border-l-4 border-l-red-500 bg-red-50/50';
        }
        if (text.includes('aviso') || text.includes('tarde') || text.includes('warning')) {
            return 'border-l-4 border-l-amber-500 bg-amber-50/50';
        }
        return 'border-l-4 border-l-blue-500 bg-blue-50/50';
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                title="Notificaciones"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fadeIn">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                        <h3 className="font-semibold text-slate-900 text-sm">Notificaciones</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Marcar todo leído
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-slate-500">
                                <p className="text-sm">No tienes notificaciones</p>
                            </div>
                        ) : (
                            <div>
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${getNotificationStyle(notification.title, notification.message)} ${!notification.read ? 'opacity-100' : 'opacity-70'}`}
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1">
                                                <h4 className={`text-sm ${!notification.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                    {notification.title}
                                                </h4>
                                                <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <span className="text-[10px] text-slate-400 mt-2 block">
                                                    {new Date(notification.date).toLocaleDateString()} {new Date(notification.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                {!notification.read && (
                                                    <button
                                                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                        className="text-slate-400 hover:text-blue-600 p-1 hover:bg-white rounded-full transition-all"
                                                        title="Marcar como leída"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => handleDelete(notification.id, e)}
                                                    className="text-slate-400 hover:text-red-500 p-1 hover:bg-white rounded-full transition-all"
                                                    title="Eliminar"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
