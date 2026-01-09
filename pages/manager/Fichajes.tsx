import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, Users, Calendar } from 'lucide-react';
import { fichajeService, lateNotificationService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ConfirmModal } from '../../components/ConfirmModal';

export const ManagerFichajes: React.FC = () => {
    const { user } = useAuth();
    const [weekData, setWeekData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState<{ userId: string; fichajeId: string; fecha: string; userName: string } | null>(null);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        loadWeekData();
    }, [selectedWeek]);

    const loadWeekData = async () => {
        setLoading(true);
        try {
            if (user?.department) {
                const response = await fichajeService.getDepartmentWeek(user.department);
                if (response && response.users) {
                    const transformedData = response.users.map((userGroup: any) => {
                        const allFichajes = userGroup.fichajes.flatMap((dayGroup: any) =>
                            dayGroup.fichajes.map((f: any) => ({
                                ...f,
                                date: dayGroup.date,
                                isLate: dayGroup.isLate,
                                isEarlyDeparture: dayGroup.isEarlyDeparture,
                                hasNotification: dayGroup.fichajes.some((fInner: any) => fInner.id === f.id && fInner.lateNotifications && fInner.lateNotifications.length > 0),
                                notificationRead: dayGroup.fichajes.some((fInner: any) => fInner.id === f.id && fInner.lateNotifications?.some((n: any) => n.leido))
                            }))
                        );
                        return {
                            userId: userGroup.user.id,
                            userName: userGroup.user.name,
                            fichajes: allFichajes
                        };
                    });
                    setWeekData(transformedData);
                } else {
                    setWeekData([]);
                }
            }
        } catch (error) {
            console.error('Error loading week data:', error);
            setWeekData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSendWarning = (userId: string, fichajeId: string, fecha: string, userName: string) => {
        setModalData({ userId, fichajeId, fecha, userName });
        setShowModal(true);
    };

    const confirmSendWarning = async () => {
        if (!modalData) return;
        setIsSending(true);

        try {
            await lateNotificationService.send({
                userId: modalData.userId,
                fichajeId: modalData.fichajeId,
                fecha: modalData.fecha
            });

            // Success toast
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
            toast.textContent = '✓ Aviso enviado correctamente';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);

            setShowModal(false);
            loadWeekData();
        } catch (error: any) {
            // Error toast
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            toast.textContent = error.response?.data?.error || 'Error al enviar aviso';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        } finally {
            setIsSending(false);
        }
    };

    const getWeekDays = () => {
        const days = [];
        const today = new Date();
        const currentDay = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + (selectedWeek * 7));

        for (let i = 0; i < 5; i++) {
            const day = new Date(monday);
            day.setDate(monday.getDate() + i);
            days.push(day);
        }
        return days;
    };

    const weekDays = getWeekDays();

    const formatTime = (timestamp: string) => {
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fichajes del Equipo</h1>
                    <p className="text-slate-500 dark:text-slate-400">Departamento: {user?.department}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedWeek(selectedWeek - 1)}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                        ← Anterior
                    </button>
                    <button
                        onClick={() => setSelectedWeek(0)}
                        disabled={selectedWeek === 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Semana Actual
                    </button>
                    <button
                        onClick={() => setSelectedWeek(selectedWeek + 1)}
                        disabled={selectedWeek >= 0}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Siguiente →
                    </button>
                </div>
            </div>

            {/* Week Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <Users className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Empleados</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{weekData.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                            <Clock className="text-green-600 dark:text-green-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Fichajes Correctos</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {weekData.filter(d => d.fichajes?.every((f: any) => !f.isLate && !f.isEarlyDeparture)).length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                            <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Llegadas Tarde</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {weekData.filter(d => d.fichajes?.some((f: any) => f.isLate)).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gantt Chart - Desktop */}
            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 transition-colors">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Vista Semanal</h2>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <Clock className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
                        <p className="text-slate-500 dark:text-slate-400">Cargando fichajes...</p>
                    </div>
                ) : weekData.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
                        <p className="text-slate-500 dark:text-slate-400">No hay empleados en este departamento</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800 transition-colors">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 transition-colors">
                                        Empleado
                                    </th>
                                    {weekDays.map((day, index) => (
                                        <th key={index} className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            <div className="text-slate-700 dark:text-slate-300">{day.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
                                            <div className="text-slate-400 dark:text-slate-500">{day.getDate()}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800 transition-colors">
                                {weekData.map((employee: any, empIndex: number) => (
                                    <tr key={empIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800 shadow-[2px_0_5px_-3px_rgba(0,0,0,0.1)] transition-colors">
                                            {employee.userName || 'N/A'}
                                        </td>
                                        {weekDays.map((day, dayIndex) => {
                                            const dayStr = day.toISOString().split('T')[0];
                                            const dayFichajes = employee.fichajes?.filter((f: any) =>
                                                f.timestamp && new Date(f.timestamp).toISOString().split('T')[0] === dayStr
                                            ) || [];

                                            const entradas = dayFichajes.filter((f: any) => f.tipo === 'ENTRADA');
                                            const salidas = dayFichajes.filter((f: any) => f.tipo === 'SALIDA');
                                            const hasIssues = dayFichajes.some((f: any) => f.isLate || f.isEarlyDeparture);

                                            return (
                                                <td key={dayIndex} className="px-3 py-4 text-center align-top">
                                                    {dayFichajes.length > 0 ? (
                                                        <div className={`rounded-xl p-3 border transition-all hover:shadow-sm ${hasIssues
                                                            ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'
                                                            : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30'
                                                            }`}>
                                                            {/* Fichaje Slots */}
                                                            <div className="flex flex-col gap-2">
                                                                {Array.from({ length: Math.max(entradas.length, salidas.length) }).map((_, i) => (
                                                                    <div key={i} className="flex justify-between items-center text-xs bg-white/50 dark:bg-slate-800/50 rounded-lg p-1.5 border border-black/5 dark:border-white/10">
                                                                        {entradas[i] && (
                                                                            <span className={`font-mono font-medium ${entradas[i].isLate ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                                {formatTime(entradas[i].timestamp)}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-slate-300 dark:text-slate-600 mx-1">→</span>
                                                                        {salidas[i] ? (
                                                                            <span className={`font-mono font-medium ${salidas[i].isEarlyDeparture ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                                {formatTime(salidas[i].timestamp)}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-400 dark:text-slate-600 font-mono">--:--</span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Actions */}
                                                            {hasIssues && !dayFichajes.some((f: any) => f.hasNotification) && (
                                                                <button
                                                                    onClick={() => handleSendWarning(
                                                                        employee.userId,
                                                                        entradas[0]?.id || salidas[0]?.id,
                                                                        dayStr,
                                                                        employee.userName
                                                                    )}
                                                                    className="mt-3 w-full bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                                                                >
                                                                    Dar Aviso
                                                                </button>
                                                            )}

                                                            {/* Status Badges */}
                                                            {dayFichajes.some((f: any) => f.hasNotification) && (
                                                                <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10">
                                                                    {dayFichajes.some((f: any) => f.notificationRead) ? (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 dark:text-green-300 bg-green-100/50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                                                                            ✓ Leído
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-700 dark:text-orange-300 bg-orange-100/50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                                                                            ⚠ Enviado
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="h-full flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Mobile View - Cards */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-12 text-center transition-colors">
                        <Clock className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
                        <p className="text-slate-500 dark:text-slate-400">Cargando fichajes...</p>
                    </div>
                ) : weekData.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-12 text-center transition-colors">
                        <Users className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
                        <p className="text-slate-500 dark:text-slate-400">No hay empleados</p>
                    </div>
                ) : (
                    weekData.map((employee: any, index: number) => (
                        <div key={index} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 transition-colors">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                                    {employee.userName.charAt(0)}
                                </div>
                                {employee.userName}
                            </h3>
                            <div className="space-y-3">
                                {weekDays.map((day, dayIndex) => {
                                    const dayStr = day.toISOString().split('T')[0];
                                    const dayFichajes = employee.fichajes?.filter((f: any) =>
                                        f.timestamp && new Date(f.timestamp).toISOString().split('T')[0] === dayStr
                                    ) || [];

                                    if (dayFichajes.length === 0) return null;

                                    const entradas = dayFichajes.filter((f: any) => f.tipo === 'ENTRADA');
                                    const salidas = dayFichajes.filter((f: any) => f.tipo === 'SALIDA');
                                    const hasIssues = dayFichajes.some((f: any) => f.isLate || f.isEarlyDeparture);

                                    return (
                                        <div key={dayIndex} className={`p-4 rounded-xl border ${hasIssues ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                                            }`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                                    {day.toLocaleDateString('es-ES', { weekday: 'long' })} <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">{day.getDate()}</span>
                                                </span>
                                                {hasIssues && (
                                                    <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        INCIDENCIA
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                {Array.from({ length: Math.max(entradas.length, salidas.length) }).map((_, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm text-sm">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-slate-400 uppercase">Entrada</span>
                                                            <span className={`font-mono font-medium ${entradas[i]?.isLate ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{formatTime(entradas[i]?.timestamp)}</span>
                                                        </div>
                                                        <div className="text-slate-300 dark:text-slate-600">→</div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] text-slate-400 uppercase">Salida</span>
                                                            <span className={`font-mono font-medium ${salidas[i]?.isEarlyDeparture ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{formatTime(salidas[i]?.timestamp)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {hasIssues && !dayFichajes.some((f: any) => f.hasNotification) && (
                                                <button
                                                    onClick={() => handleSendWarning(
                                                        employee.userId,
                                                        entradas[0]?.id || salidas[0]?.id,
                                                        dayStr,
                                                        employee.userName
                                                    )}
                                                    className="mt-3 w-full bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white text-xs font-bold py-2 rounded-lg transition-colors shadow-sm"
                                                >
                                                    DAR AVISO
                                                </button>
                                            )}

                                            {dayFichajes.some((f: any) => f.hasNotification) && (
                                                <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10 text-center">
                                                    {dayFichajes.some((f: any) => f.notificationRead) ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-300">
                                                            ✓ Aviso Leído
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 dark:text-orange-300">
                                                            ⚠ Aviso Enviado
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={showModal}
                isLoading={isSending}
                onClose={() => setShowModal(false)}
                onConfirm={confirmSendWarning}
                title="Enviar Aviso"
                message={`¿Estás seguro de que deseas enviar un aviso de llegada tarde a ${modalData?.userName}?`}
                confirmText="Enviar Aviso"
                cancelText="Cancelar"
                type="warning"
            />
        </div>
    );
};
