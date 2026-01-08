import api from './api';
import { User } from '../types';

export interface GlobalSettings {
    [key: string]: string;
}

export const adminService = {
    // Users
    getUsers: async () => {
        const response = await api.get<User[]>('/admin/users');
        return response.data;
    },
    createUser: async (userData: Partial<User>) => {
        const response = await api.post<User>('/admin/users', userData);
        return response.data;
    },
    updateUser: async (id: string, userData: Partial<User>) => {
        const response = await api.put<User>(`/admin/users/${id}`, userData);
        return response.data;
    },
    deleteUser: async (id: string) => {
        await api.delete(`/admin/users/${id}`);
    },

    // Vacations
    getVacations: async () => {
        const response = await api.get<any[]>('/admin/vacations');
        return response.data;
    },
    updateVacationStatus: async (id: string, status: string) => {
        const response = await api.put(`/admin/vacations/${id}/status`, { status });
        return response.data;
    },

    // Settings
    getSettings: async () => {
        const response = await api.get<GlobalSettings>('/admin/settings');
        return response.data;
    },
    updateSettings: async (settings: GlobalSettings) => {
        const response = await api.put('/admin/settings', settings);
        return response.data;
    }
};
