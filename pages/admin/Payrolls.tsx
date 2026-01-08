import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
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
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<PayrollFormData>({
        userId: '',
        month: 'Enero',
        year: new Date().getFullYear(),
        amount: 0,
        pdfUrl: ''
    });
    const { modalState, showAlert, closeModal } = useModal();

    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await adminService.getUsers();
                setUsers(data.filter((u: any) => u.role !== 'ADMIN'));
            } catch (error) {
                console.error("Error fetching users:", error);
                showAlert("Error al obtener usuarios", 'error');
            }
        };
        fetchUsers();
    }, []);

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
                                <label className="block text-sm font-medium text-slate-700 mb-1">URL del PDF</label>
                                <input
                                    type="url"
                                    value={formData.pdfUrl}
                                    onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    placeholder="https://..."
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1">Sube el PDF a un servicio de almacenamiento y pega aquí la URL</p>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                    Crear Nómina
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
