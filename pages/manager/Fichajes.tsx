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

    useEffect(() => {
        loadWeekData();
    }, [selectedWeek]);

    const loadWeekData = async () => {
        setLoading(true);
        try {
            console.log('Current user:', user);
            console.log('User department:', user?.department);

            if (user?.department) {
                console.log('Fetching fichajes for department:', user.department);
                const response = await fichajeService.getDepartmentWeek(user.department);
                console.log('Manager week response:', response);
                console.log('Response users count:', response?.users?.length);

                // El backend devuelve { department, schedule, users: [...] }
                if (response && response.users) {
                    console.log('Processing', response.users.length, 'users');
                    // Transformar datos para el formato esperado
                    const transformedData = response.users.map((userGroup: any) => {
                        console.log('User:', userGroup.user.name, 'Day groups:', userGroup.fichajes.length);

                        // Aplanar fichajes pero mantener la fecha
                        const allFichajes = userGroup.fichajes.flatMap((dayGroup: any) =>
                            dayGroup.fichajes.map((f: any) => ({
                                ...f,
                                date: dayGroup.date, // Preservar la fecha
                                isLate: dayGroup.isLate,
                                isEarlyDeparture: dayGroup.isEarlyDeparture,
                                hasNotification: dayGroup.fichajes.some((fInner: any) => fInner.id === f.id && fInner.lateNotifications && fInner.lateNotifications.length > 0),
                                notificationRead: dayGroup.fichajes.some((fInner: any) => fInner.id === f.id && fInner.lateNotifications?.some((n: any) => n.leido))
                            }))
                        );

                        console.log('User:', userGroup.user.name, 'Total fichajes:', allFichajes.length);

                        return {
                            userId: userGroup.user.id,
                            userName: userGroup.user.name,
                            fichajes: allFichajes
                        };
                    });
                    console.log('Transformed data:', transformedData);
                    setWeekData(transformedData);
                } else {
                    console.warn('No users in response or response is invalid');
                    setWeekData([]);
                }
            } else {
                console.error('User department is undefined!');
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

            loadWeekData();
        } catch (error: any) {
            // Error toast
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            toast.textContent = error.response?.data?.error || 'Error al enviar aviso';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
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
                    <h1 className="text-2xl font-bold text-slate-900">Fichajes del Equipo</h1>
                    <p className="text-slate-500">Departamento: {user?.department}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedWeek(selectedWeek - 1)}
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
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
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Siguiente →
                    </button>
                </div>
            </div>

            {/* Week Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Users className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Empleados</p>
                            <p className="text-2xl font-bold text-slate-900">{weekData.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Clock className="text-green-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Fichajes Correctos</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {weekData.filter(d => d.fichajes?.every((f: any) => !f.isLate && !f.isEarlyDeparture)).length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 rounded-lg">
                            <AlertCircle className="text-red-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Llegadas Tarde</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {weekData.filter(d => d.fichajes?.some((f: any) => f.isLate)).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gantt Chart - Desktop */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">Vista Semanal</h2>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <Clock className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
                        <p className="text-slate-500">Cargando fichajes...</p>
                    </div>
                ) : weekData.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-500">No hay empleados en este departamento</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50">
                                        Empleado
                                    </th>
                                    {weekDays.map((day, index) => (
                                        <th key={index} className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            <div>{day.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
                                            <div className="text-slate-400">{day.getDate()}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {weekData.map((employee: any, empIndex: number) => (
                                    <tr key={empIndex} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 sticky left-0 bg-white">
                                            {employee.userName || 'N/A'}
                                        </td>
                                        {weekDays.map((day, dayIndex) => {
                                            const dayStr = day.toISOString().split('T')[0];
                                            const dayFichajes = employee.fichajes?.filter((f: any) =>
                                                f.timestamp && new Date(f.timestamp).toISOString().split('T')[0] === dayStr
                                            ) || [];

                                            // Separar entradas y salidas
                                            const entradas = dayFichajes.filter((f: any) => f.tipo === 'ENTRADA');
                                            const salidas = dayFichajes.filter((f: any) => f.tipo === 'SALIDA');

                                            // Determinar si hay problemas (tarde o salida temprana)
                                            const hasIssues = dayFichajes.some((f: any) => f.isLate || f.isEarlyDeparture);

                                            return (
                                                <td key={dayIndex} className="px-3 py-4 text-center">
                                                    {dayFichajes.length > 0 ? (
                                                        <div className={`rounded-lg p-2 ${hasIssues ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                                                            {/* Mostrar todos los pares de entrada/salida */}
                                                            {Math.max(entradas.length, salidas.length) > 0 && (
                                                                <div className="space-y-1">
                                                                    {Array.from({ length: Math.max(entradas.length, salidas.length) }).map((_, i) => (
                                                                        <div key={i} className="text-xs">
                                                                            {entradas[i] && (
                                                                                <div className={`font-medium ${entradas[i].isLate ? 'text-red-700' : 'text-green-700'}`}>
                                                                                    ↓ {formatTime(entradas[i].timestamp)}
                                                                                </div>
                                                                            )}
                                                                            {salidas[i] && (
                                                                                <div className={`font-medium ${salidas[i].isEarlyDeparture ? 'text-red-700' : 'text-green-700'}`}>
                                                                                    ↑ {formatTime(salidas[i].timestamp)}
                                                                                </div>
                                                                            )}
                                                                            {i < Math.max(entradas.length, salidas.length) - 1 && (
                                                                                <div className="border-t border-slate-300 my-1"></div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {hasIssues && !dayFichajes.some((f: any) => f.hasNotification) && (
                                                                <button
                                                                    onClick={() => handleSendWarning(
                                                                        employee.userId,
                                                                        entradas[0]?.id || salidas[0]?.id,
                                                                        dayStr,
                                                                        employee.userName
                                                                    )}
                                                                    className="mt-2 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors w-full"
                                                                >
                                                                    Dar Aviso
                                                                </button>
                                                            )}
                                                            {dayFichajes.some((f: any) => f.hasNotification) && (
                                                                <div className="mt-2 flex flex-col items-center">
                                                                    {dayFichajes.some((f: any) => f.notificationRead) ? (
                                                                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                                                            ✓ Leído
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
                                                                            ⚠ Enviado
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-slate-300 text-xs">-</div>
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
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
                        <Clock className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
                        <p className="text-slate-500">Cargando fichajes...</p>
                    </div>
                ) : weekData.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
                        <Users className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-500">No hay empleados</p>
                    </div>
                ) : (
                    weekData.map((employee: any, index: number) => (
                        <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                            <h3 className="font-semibold text-slate-900 mb-3">{employee.userName}</h3>
                            <div className="space-y-2">
                                {weekDays.map((day, dayIndex) => {
                                    const dayStr = day.toISOString().split('T')[0];
                                    const dayFichajes = employee.fichajes?.filter((f: any) =>
                                        f.timestamp && new Date(f.timestamp).toISOString().split('T')[0] === dayStr
                                    ) || [];

                                    const entrada = dayFichajes.find((f: any) => f.tipo === 'ENTRADA');
                                    const salida = dayFichajes.find((f: any) => f.tipo === 'SALIDA');
                                    const isLate = entrada?.isLate;
                                    const isEarlyDep = salida?.isEarlyDeparture;

                                    if (dayFichajes.length === 0) return null;

                                    return (
                                        <div key={dayIndex} className={`p-3 rounded-lg ${isLate || isEarlyDep ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                                            }`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium text-slate-700">
                                                    {day.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                                                </span>
                                                {(isLate || isEarlyDep) && (
                                                    <button
                                                        onClick={() => handleSendWarning(
                                                            employee.userId,
                                                            entrada?.id || salida?.id,
                                                            dayStr,
                                                            employee.userName
                                                        )}
                                                        className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                                                    >
                                                        Dar Aviso
                                                    </button>
                                                )}
                                            </div>
                                            <div className="text-xs space-y-1">
                                                <div className={isLate ? 'text-red-700' : 'text-green-700'}>
                                                    Entrada: {formatTime(entrada?.timestamp)}
                                                </div>
                                                <div className={isEarlyDep ? 'text-red-700' : 'text-green-700'}>
                                                    Salida: {formatTime(salida?.timestamp)}
                                                </div>
                                            </div>
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
