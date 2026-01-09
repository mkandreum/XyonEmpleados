import React, { useState, useEffect } from 'react';
import { adminService, uploadService } from '../../services/api';
import { Upload, X, FileText } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../../components/Modal';

interface PayrollFormData {
    userId: string;
    month: string;
    year: number;
    amount: number;
    pdfUrl: string;
}

export const AdminPayrolls: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<PayrollFormData>({
        userId: '',
        month: 'Enero',
        year: new Date().getFullYear(),
        amount: 0,
        pdfUrl: ''
    });
    const { modalState, showAlert, closeModal, showConfirm } = useModal();

    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersData, payrollsData] = await Promise.all([
                adminService.getUsers(),
                adminService.getPayrolls()
            ]);
            setUsers(usersData.filter((u: any) => u.role !== 'ADMIN'));
            setPayrolls(payrollsData);
        } catch (error) {
            console.error("Error fetching data:", error);
            showAlert("Error al cargar datos", 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = (id: string) => {
        showConfirm(
            '¿Estás seguro de que quieres eliminar esta nómina? Esta acción no se puede deshacer.',
            async () => {
                try {
                    await adminService.deletePayroll(id);
                    showAlert('Nómina eliminada correctamente', 'success');
                    fetchData();
                } catch (error) {
                    console.error("Error deleting payroll:", error);
                    showAlert('Error al eliminar nómina', 'error');
                }
            },
            'Eliminar Nómina'
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminService.createPayroll(formData);
            setShowModal(false);
            setFormData({ userId: '', month: 'Enero', year: new Date().getFullYear(), amount: 0, pdfUrl: '' });
            showAlert('Nómina creada correctamente', 'success');
        } catch (error) {
            console.error("Error creating payroll:", error);
            showAlert("Error al crear la nómina", 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Nóminas</h1>
                    <p className="text-slate-500 dark:text-slate-400">Carga nóminas para los empleados</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 shadow-sm transition-colors"
                >
                    <Upload size={18} />
                    Cargar Nómina
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors">
                <div className="text-center py-12">
                    <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Carga de Nóminas</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">Utiliza el botón "Cargar Nómina" para añadir nóminas individuales</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Para carga masiva, contacta con el administrador del sistema</p>
                </div>
            </div>

            {/* Payrolls List (Desktop) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden hidden sm:block transition-colors">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Historial de Nóminas</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Empleado</th>
                                <th className="px-6 py-3">Periodo</th>
                                <th className="px-6 py-3">Importe</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={4} className="px-6 py-4 text-center dark:text-slate-400">Cargando...</td></tr>
                            ) : payrolls.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">No hay nóminas registradas.</td></tr>
                            ) : (
                                payrolls.map((payroll) => (
                                    <tr key={payroll.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                            {payroll.user?.name || 'Desconocido'}
                                            <span className="block text-xs text-slate-500 dark:text-slate-400 font-normal">{payroll.user?.email}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            {payroll.month} {payroll.year}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                                            {payroll.amount} €
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-4">
                                            <a
                                                href={payroll.pdfUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                            >
                                                Ver PDF
                                            </a>
                                            <button
                                                onClick={() => handleDelete(payroll.id)}
                                                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile View (Cards) */}
            <div className="sm:hidden space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-white px-1">Historial de Nóminas</h3>
                {payrolls.map((payroll) => (
                    <div key={payroll.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-white">{payroll.user?.name || 'Desconocido'}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{payroll.user?.email}</p>
                            </div>
                            <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{payroll.amount} €</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                            <span className="capitalize font-medium">{payroll.month} {payroll.year}</span>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-700/50">
                            <a
                                href={payroll.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                            >
                                <FileText size={16} /> Ver PDF
                            </a>
                            <button
                                onClick={() => handleDelete(payroll.id)}
                                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-xl transition-colors" onClick={(e) => e.stopPropagation()}>
                        <div className="border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cargar Nómina</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <X size={20} className="text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Empleado</label>
                                <select
                                    value={formData.userId}
                                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-900 dark:text-white"
                                    required
                                >
                                    <option value="">Seleccionar empleado...</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>{user.name} - {user.email}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mes</label>
                                    <select
                                        value={formData.month}
                                        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                        className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-900 dark:text-white"
                                    >
                                        {months.map(month => (
                                            <option key={month} value={month}>{month}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Año</label>
                                    <input
                                        type="number"
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                                        className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-900 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Importe Neto (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-900 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Archivo PDF</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            setUploading(true);
                                            try {
                                                const response = await uploadService.uploadPayroll(file);
                                                setFormData({ ...formData, pdfUrl: response.url });
                                            } catch (error) {
                                                console.error("Upload error:", error);
                                                showAlert("Error al subir el archivo", "error");
                                            } finally {
                                                setUploading(false);
                                            }
                                        }}
                                        className="block w-full text-sm text-slate-500 dark:text-slate-400
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-purple-50 file:text-purple-700 dark:file:bg-purple-900/30 dark:file:text-purple-300
                                        hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50"
                                        disabled={uploading}
                                        required={!formData.pdfUrl}
                                    />
                                    {uploading && <span className="text-sm text-purple-600 dark:text-purple-400">Subiendo...</span>}
                                    {formData.pdfUrl && <span className="text-sm text-green-600 dark:text-green-400 font-medium whitespace-nowrap">¡PDF Cargado!</span>}
                                </div>
                                <input type="hidden" value={formData.pdfUrl} />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={uploading || !formData.pdfUrl} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium">
                                    {uploading ? 'Subiendo...' : 'Crear Nómina'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Global Modal */}
            <Modal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                title={modalState.title}
                message={modalState.message}
                type={modalState.type}
                onConfirm={modalState.onConfirm}
            />
        </div>
    );
};
