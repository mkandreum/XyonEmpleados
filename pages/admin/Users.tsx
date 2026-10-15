import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService } from '../../services/api';
import { User } from '../../types';
import { Plus, Edit2 as Edit, Trash2 as Trash, Search, User as UserIcon, Building, X, Save } from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';
import toast from 'react-hot-toast';
import { haptic } from '../../utils/haptics';
import { LoadingState } from '../../components/PageState';
import { Avatar } from '../../components/Avatar';

export const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
    useEffect(() => { const q = searchParams.get('q'); if (q !== null) setSearchTerm(q); }, [searchParams]);
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [departments, setDepartments] = useState<string[]>([]);
    const [newDeptName, setNewDeptName] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
        department: '',
        position: '',
        avatarUrl: ''
    });

    const fetchData = async () => {
        try {
            const [usersData, settingsData] = await Promise.all([
                adminService.getUsers(),
                adminService.getSettings()
            ]);
            setUsers(usersData);

            const departmentsValue = settingsData?.DEPARTMENTS
                || (settingsData?.key === 'DEPARTMENTS' ? settingsData?.value : undefined);

            if (departmentsValue) {
                try {
                    setDepartments(JSON.parse(departmentsValue));
                } catch (e) {
                    console.error("Error parsing departments:", e);
                    setDepartments(['General']);
                }
            } else {
                setDepartments(['General']);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Error al cargar datos");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = !selectedDepartment || user.department === selectedDepartment;
        return matchesSearch && matchesDept;
    });

    // Count users per department
    const deptCounts = users.reduce<Record<string, number>>((acc, u) => {
        acc[u.department] = (acc[u.department] || 0) + 1;
        return acc;
    }, {});

    const handleCreate = () => {
        setEditingUser(null);
        setFormData({
            name: '',
            email: '',
            password: '', // Required for new user
            role: 'EMPLOYEE',
            department: departments[0] || 'General',
            position: '',
            avatarUrl: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '', // Don't show password
            role: user.role,
            department: user.department,
            position: user.position,
            avatarUrl: user.avatarUrl
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setUserToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            await adminService.deleteUser(userToDelete);
            setDeleteModalOpen(false);
            setUserToDelete(null);
            haptic('double');
            fetchData();
            toast.success('Usuario eliminado');
        } catch (error) {
            haptic('error');
            toast.error('Error al eliminar usuario');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingUser && editingUser.id) {
                // Update
                const updateData = { ...formData };
                if (!updateData.password) delete (updateData as any).password;
                await adminService.updateUser(editingUser.id, updateData as any);
                haptic('success');
                toast.success('Usuario actualizado');
            } else {
                // Create
                await adminService.createUser(formData as any);
                haptic('success');
                toast.success('Usuario creado');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            haptic('error');
            toast.error('Error al guardar usuario');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddDepartment = async () => {
        if (!newDeptName.trim()) return;
        if (departments.includes(newDeptName.trim())) {
            toast.error("El departamento ya existe");
            return;
        }

        const updatedDepts = [...departments, newDeptName.trim()];
        setDepartments(updatedDepts);
        setNewDeptName('');

        try {
            await adminService.updateSettings({ DEPARTMENTS: JSON.stringify(updatedDepts) });
            toast.success("Departamento agregado");
        } catch (error) {
            toast.error("Error al guardar departamentos");
        }
    };

    const handleRemoveDepartment = async (deptToRemove: string) => {
        const updatedDepts = departments.filter(d => d !== deptToRemove);
        setDepartments(updatedDepts);

        try {
            await adminService.updateSettings({ DEPARTMENTS: JSON.stringify(updatedDepts) });
            toast.success("Departamento eliminado");
        } catch (error) {
            toast.error("Error al guardar departamentos");
        }
    };

    const departmentOptions = formData.department && !departments.includes(formData.department)
        ? [formData.department, ...departments]
        : (departments.length > 0 ? departments : ['General']);

    if (isLoading) return <LoadingState label="Cargando usuarios..." />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-slide-up">
                <h1 className="page-title">Gestión de Usuarios</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsDeptModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-control hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Building size={20} />
                        Departamentos
                    </button>
                    <button
                        onClick={handleCreate}
                        className="btn-primary"
                    >
                        <Plus size={20} />
                        Nuevo Usuario
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative animate-slide-up delay-75">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-control focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors"
                    value={searchTerm}
                    onChange={handleSearch}
                />
            </div>

            {/* Department Filter */}
            {departments.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide animate-slide-up delay-100">
                    <button
                        onClick={() => setSelectedDepartment(null)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            !selectedDepartment
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        Todos ({users.length})
                    </button>
                    {departments.map(dept => (
                        <button
                            key={dept}
                            onClick={() => setSelectedDepartment(selectedDepartment === dept ? null : dept)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                selectedDepartment === dept
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {dept} ({deptCounts[dept] || 0})
                        </button>
                    ))}
                </div>
            )}

            {/* Users Table (Desktop) */}
            <div className="card overflow-hidden hidden sm:block animate-slide-up delay-150">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Departamento</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="stagger bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <Avatar name={user.name} url={user.avatarUrl && !user.avatarUrl.includes('ui-avatars.com') ? user.avatarUrl : null} size={40} />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-slate-900 dark:text-white">{user.name} {user.active === false && <span className="ml-2 px-2 text-xs bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 rounded-full font-semibold">Inactivo</span>}</div>
                                                <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'}`}>
                                            {user.role === 'ADMIN' ? 'Administrador' : (user.role === 'MANAGER' ? 'Manager' : 'Empleado')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        {user.department}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button aria-label="Editar" onClick={() => handleEdit(user)} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4">
                                            <Edit size={18} />
                                        </button>
                                        <button aria-label="Eliminar" onClick={() => handleDelete(user.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
                                            <Trash size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile View (Cards) */}
            <div className="sm:hidden space-y-4 animate-slide-up delay-150">
                {filteredUsers.map((user) => (
                    <div key={user.id} className="card p-4">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <Avatar name={user.name} url={user.avatarUrl && !user.avatarUrl.includes('ui-avatars.com') ? user.avatarUrl : null} size={40} />
                                <div>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{user.name} {user.active === false && <span className="ml-2 px-2 text-2xs bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 rounded-full font-semibold">Inactivo</span>}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                                </div>
                            </div>
                            <span className={`px-2 py-1 text-2xs font-bold uppercase rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'}`}>
                                {user.role === 'ADMIN' ? 'Administrador' : (user.role === 'MANAGER' ? 'Manager' : 'Empleado')}
                            </span>
                        </div>

                        <div className="border-t border-slate-50 dark:border-slate-800 pt-3 flex justify-between items-center">
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Departamento</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{user.department}</p>
                            </div>
                            <div className="flex gap-2">
                                <button aria-label="Editar" onClick={() => handleEdit(user)} className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-control">
                                    <Edit size={18} />
                                </button>
                                <button aria-label="Eliminar" onClick={() => handleDelete(user.id)} className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-control">
                                    <Trash size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* User Modal */}
            {isModalOpen && (
                <div className="modal-backdrop">
                    <div className="card rounded-modal shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                            </h2>
                            <button aria-label="Cerrar" onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    className="field"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {/* Avatar Upload */}
                            <div>
                                <label className="label">Avatar</label>
                                <div className="flex items-center gap-4">
                                    {(formData as any).avatarUrl && !(formData as any).avatarUrl.includes('ui-avatars.com') ? (
                                        <img
                                            src={(formData as any).avatarUrl}
                                            alt="Avatar Preview"
                                            className="h-12 w-12 rounded-full object-cover bg-slate-100"
                                        />
                                    ) : (
                                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                            <UserIcon size={24} />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="block w-full text-sm text-slate-500 dark:text-slate-400
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400
                                                hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                    const { uploadService } = await import('../../services/api');
                                                    const result = await uploadService.uploadAvatar(file);
                                                    setFormData(prev => ({ ...prev, avatarUrl: result.url } as any));
                                                } catch (error) {
                                                    console.error("Error uploading avatar:", error);
                                                    toast.error("Error al subir el avatar");
                                                }
                                            }}
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Deja vacío para usar el avatar por defecto.</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="label">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="field"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            {!editingUser && (
                                <div>
                                    <label className="label">Contraseña</label>
                                    <input
                                        type="password"
                                        required
                                        className="field"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Rol</label>
                                    <select
                                        className="field"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                    >
                                        <option value="EMPLOYEE">Empleado</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="ADMIN">Administrador</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Departamento</label>
                                    <select
                                        className="field"
                                        value={formData.department}
                                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                                    >
                                        <option value="" disabled>Seleccionar...</option>
                                        {departmentOptions.map((dept) => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label">Cargo</label>
                                <input
                                    type="text"
                                    className="field"
                                    value={formData.position}
                                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn-ghost"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn-primary"
                                >
                                    {isSubmitting ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Department Management Modal */}
            {isDeptModalOpen && (
                <div className="modal-backdrop">
                    <div className="card rounded-modal shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                Gestionar Departamentos
                            </h2>
                            <button aria-label="Cerrar" onClick={() => setIsDeptModalOpen(false)} className="text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Nombre del departamento"
                                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-control focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors"
                                    value={newDeptName}
                                    onChange={e => setNewDeptName(e.target.value)}
                                />
                                <button
                                    onClick={handleAddDepartment}
                                    className="btn-primary"
                                >
                                    <Plus size={18} />
                                    Agregar
                                </button>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-control p-2 max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700">
                                {departments.length === 0 ? (
                                    <p className="text-center text-slate-500 dark:text-slate-400 py-4">No hay departamentos definidos.</p>
                                ) : (
                                    <div className="space-y-1">
                                        {departments.map((dept) => (
                                            <div key={dept} className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                                                <span className="text-slate-700 dark:text-slate-300 font-medium">{dept}</span>
                                                <button aria-label="Eliminar"
                                                    onClick={() => handleRemoveDepartment(dept)}
                                                    className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                                * Eliminar un departamento no afecta a los usuarios que ya lo tienen asignado.
                            </p>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setIsDeptModalOpen(false)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-control hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Eliminar Usuario"
                message="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
                type="danger"
                confirmText="Eliminar"
            />
        </div>
    );
};
