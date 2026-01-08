import axios from 'axios';
import { User, Payroll, VacationRequest, NewsItem, Notification, Event, Holiday, DepartmentBenefits, UserBenefitsBalance, GlobalSettings, AdminStats } from '../types';

// The API URL will depend on where the backend is served. 
// In development, Vite proxy can handle /api.
// In production (docker), it will be relative.
const API_URL = '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authService = {
    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },
    register: async (data: any) => {
        const response = await api.post('/auth/register', data);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }
};

export const userService = {
    getProfile: async () => {
        const response = await api.get<User>('/users/profile');
        return response.data;
    },
    updateProfile: async (data: Partial<User>) => {
        const response = await api.put<User>('/users/profile', data);
        return response.data;
    },
    changePassword: async (currentPassword: string, newPassword: string) => {
        const response = await api.post('/users/change-password', { currentPassword, newPassword });
        return response.data;
    }
};

export const payrollService = {
    getAll: async () => {
        const response = await api.get<Payroll[]>('/payrolls');
        return response.data;
    }
};

export const vacationService = {
    getAll: async () => {
        const response = await api.get<VacationRequest[]>('/vacations');
        return response.data;
    },
    create: async (data: Partial<VacationRequest>) => {
        const response = await api.post<VacationRequest>('/vacations', data);
        return response.data;
    }
};

export const newsService = {
    getAll: async () => {
        const response = await api.get<NewsItem[]>('/news');
        return response.data;
    },
    create: async (data: Partial<NewsItem>) => {
        const response = await api.post<NewsItem>('/admin/news', data);
        return response.data;
    },
    update: async (id: string, data: Partial<NewsItem>) => {
        const response = await api.put<NewsItem>(`/admin/news/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/admin/news/${id}`);
        return response.data;
    }
};

export const notificationService = {
    getAll: async () => {
        const response = await api.get<any>('/notifications');
        // Backend returns { notifications: [], unreadCount: 0 }
        return response.data.notifications || (Array.isArray(response.data) ? response.data : []);
    },
    markAsRead: async (id: string) => {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    },
    markAllAsRead: async () => {
        const response = await api.put('/notifications/read-all');
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/notifications/${id}`);
        return response.data;
    },
};

export const eventsService = {
    getAll: async () => {
        const response = await api.get<Event[]>('/events');
        return response.data;
    },
    create: async (data: Partial<Event>) => {
        const response = await api.post<Event>('/admin/events', data);
        return response.data;
    },
    update: async (id: string, data: Partial<Event>) => {
        const response = await api.put<Event>(`/admin/events/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/admin/events/${id}`);
        return response.data;
    }
};

export const holidayService = {
    getNext: async () => {
        const response = await api.get<Holiday>('/holidays/next');
        return response.data;
    }
};

export const benefitsService = {
    getUserBalance: async () => {
        const response = await api.get<UserBenefitsBalance>('/benefits/user');
        return response.data;
    },
    getDepartmentBenefits: async (department?: string) => {
        const url = department
            ? `/benefits/department/${department}`
            : '/admin/benefits';
        const response = await api.get<DepartmentBenefits | DepartmentBenefits[]>(url);
        return response.data;
    },
    upsertDepartmentBenefits: async (data: Partial<DepartmentBenefits>) => {
        const response = await api.post<DepartmentBenefits>('/admin/benefits', data);
        return response.data;
    },
    updateUserBalance: async (data: any) => {
        const response = await api.put<UserBenefitsBalance>('/admin/benefits/balance', data);
        return response.data;
    }
};

export const uploadService = {
    uploadAvatar: async (file: File) => {
        const formData = new FormData();
        formData.append('avatars', file);
        const response = await api.post('/upload/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    uploadJustification: async (file: File) => {
        const formData = new FormData();
        formData.append('justifications', file);
        const response = await api.post('/upload/justification', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    uploadPayroll: async (file: File) => {
        const formData = new FormData();
        formData.append('payrolls', file);
        const response = await api.post('/upload/payroll', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    uploadLogo: async (file: File) => {
        const formData = new FormData();
        formData.append('logos', file);
        const response = await api.post('/upload/logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    deleteFile: async (fileUrl: string) => {
        const response = await api.delete('/upload/file', { data: { fileUrl } });
        return response.data;
    }
};

export const adminService = {
    getStats: async () => {
        const response = await api.get<AdminStats>('/admin/stats');
        return response.data;
    },
    getUsers: async () => {
        const response = await api.get<User[]>('/admin/users');
        return response.data;
    },
    createUser: async (data: Partial<User>) => {
        const response = await api.post<User>('/admin/users', data);
        return response.data;
    },
    updateUser: async (id: string, data: Partial<User>) => {
        const response = await api.put<User>(`/admin/users/${id}`, data);
        return response.data;
    },
    deleteUser: async (id: string) => {
        const response = await api.delete(`/admin/users/${id}`);
        return response.data;
    },
    importUsers: async (users: any[]) => {
        const response = await api.post('/admin/users/bulk', users);
        return response.data;
    },
    getAllVacations: async () => {
        const response = await api.get<VacationRequest[]>('/admin/vacations');
        return response.data;
    },
    updateVacationStatus: async (id: string, status: string) => {
        const response = await api.put<VacationRequest>(`/admin/vacations/${id}/status`, { status });
        return response.data;
    },
    getSettings: async () => {
        const response = await api.get<GlobalSettings>('/admin/settings');
        return response.data;
    },
    updateSettings: async (settings: any) => {
        const response = await api.put('/admin/settings', settings);
        return response.data;
    },
    createPayroll: async (data: any) => {
        const res = await api.post('/admin/payrolls', data);
        return res.data;
    },
    getVacations: async (): Promise<VacationRequest[]> => {
        const res = await api.get('/admin/vacations');
        return res.data;
    }
};

export const managerService = {
    getTeamVacations: async (): Promise<VacationRequest[]> => {
        const res = await api.get('/manager/team-vacations');
        return res.data;
    },
    approveVacation: async (id: string): Promise<VacationRequest> => {
        const res = await api.patch(`/manager/vacations/${id}/approve`);
        return res.data;
    },
    rejectVacation: async (id: string): Promise<VacationRequest> => {
        const res = await api.patch(`/manager/vacations/${id}/reject`);
        return res.data;
    }
};

export default api;
