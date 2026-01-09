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
                    <h1 className="text-2xl font-bold text-slate-900">Gestión de Nóminas</h1>
                    <p className="text-slate-500">Carga nóminas para los empleados</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 shadow-sm"
                >
                    <Upload size={18} />
                    Cargar Nómina
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="text-center py-12">
                    <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Carga de Nóminas</h3>
                    <p className="text-slate-500 mb-4">Utiliza el botón "Cargar Nómina" para añadir nóminas individuales</p>
                    <p className="text-sm text-slate-400">Para carga masiva, contacta con el administrador del sistema</p>
                </div>
            </div>

            {/* Payrolls List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-900">Historial de Nóminas</h3>
                    {/* Add filter here later if needed */}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Empleado</th>
                                <th className="px-6 py-3">Periodo</th>
                                <th className="px-6 py-3">Importe</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={4} className="px-6 py-4 text-center">Cargando...</td></tr>
                            ) : payrolls.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500">No hay nóminas registradas.</td></tr>
                            ) : (
                                payrolls.map((payroll) => (
                                    <tr key={payroll.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {payroll.user?.name || 'Desconocido'}
                                            <span className="block text-xs text-slate-500 font-normal">{payroll.user?.email}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {payroll.month} {payroll.year}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">
                                            {payroll.amount} €
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <a
                                                href={payroll.pdfUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center text-blue-600 hover:text-blue-800"
                                            >
                                                Ver PDF
                                            </a>
                                            <button
                                                onClick={() => handleDelete(payroll.id)}
                                                className="text-red-500 hover:text-red-700"
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="border-b border-slate-200 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Cargar Nómina</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Empleado</label>
                                <select
                                    value={formData.userId}
                                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Mes</label>
                                    <select
                                        value={formData.month}
                                        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    >
                                        {months.map(month => (
                                            <option key={month} value={month}>{month}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Año</label>
                                    <input
                                        type="number"
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Importe Neto (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Archivo PDF</label>
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
                                        className="block w-full text-sm text-slate-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-purple-50 file:text-purple-700
                                        hover:file:bg-purple-100"
                                        disabled={uploading}
                                        required={!formData.pdfUrl}
                                    />
                                    {uploading && <span className="text-sm text-purple-600">Subiendo...</span>}
                                    {formData.pdfUrl && <span className="text-sm text-green-600 font-medium whitespace-nowrap">¡PDF Cargado!</span>}
                                </div>
                                <input type="hidden" value={formData.pdfUrl} />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={uploading || !formData.pdfUrl} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
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
