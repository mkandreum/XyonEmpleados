import axios from 'axios';
import { User, Payroll, VacationRequest, NewsItem, Notification } from '../types';

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
    }
};

export const notificationService = {
    getAll: async () => {
        const response = await api.get<Notification[]>('/notifications');
        return response.data;
    },
    markAsRead: async (id: string) => {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    }
};

export default api;
