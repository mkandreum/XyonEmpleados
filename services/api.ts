import axios from 'axios';
import { User, Payroll, VacationRequest, NewsItem, Notification, Event, Holiday, DepartmentBenefits, UserBenefitsBalance, GlobalSettings, AdminStats, Fichaje, FichajeTipo, FichajeStatus, FichajeDayStats, DepartmentSchedule, LateArrivalNotification, InvitationCode, PushSubscriptionPayload, FichajeAdjustment, FichajeAdjustmentStatus } from '../types';

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

// Helper: decode JWT payload without library
function decodeTokenPayload(token: string): any | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

// Helper: check if token is expired (with 60s buffer)
export function isTokenExpired(token: string): boolean {
    const payload = decodeTokenPayload(token);
    if (!payload || !payload.exp) return true;
    // exp is in seconds, Date.now() is in milliseconds
    // Add 60 second buffer so we don't send a request that will fail
    return (payload.exp * 1000) < (Date.now() + 60000);
}

// Flag to prevent multiple simultaneous logouts
let isLoggingOut = false;

export async function forceLogout() {
    if (isLoggingOut) return;
    isLoggingOut = true;

    // 1. Clear session data
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // 2. Clear Caches and Service Workers to force a total refresh
    try {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const name of cacheNames) {
                await caches.delete(name);
            }
        }
    } catch (err) {
        console.error('Error during cache cleanup:', err);
    }

    // 3. Force redirect to login
    const currentPath = window.location.pathname;
    if (!['/login', '/register', '/forgot-password', '/reset-password'].includes(currentPath)) {
        window.location.href = '/login?expired=1';
    } else {
        // If already on login but something is weird, just reload
        window.location.reload();
    }

    // Reset flag after a short delay
    setTimeout(() => { isLoggingOut = false; }, 2000);
}

// Add auth token to requests (with proactive expiration check)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        // Check if token is expired before sending the request
        if (isTokenExpired(token)) {
            // Token expired - force logout
            forceLogout();
            return Promise.reject(new axios.Cancel('Token expired'));
        }
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor: handle 401/403 for expired/invalid tokens
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error instanceof axios.Cancel) {
            return Promise.reject(error);
        }

        const status = error.response?.status;
        const requestUrl = error.config?.url || '';

        // Don't auto-logout on auth endpoints (login/register failures are expected)
        const isAuthRoute = requestUrl.includes('/auth/login') ||
            requestUrl.includes('/auth/register') ||
            requestUrl.includes('/auth/forgot-password') ||
            requestUrl.includes('/auth/reset-password');

        if ((status === 401 || status === 403) && !isAuthRoute) {
            console.warn(`Session expired or invalid (${status}) on ${requestUrl}. Logging out.`);
            forceLogout();
        }

        return Promise.reject(error);
    }
);

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
    forgotPassword: async (email: string) => {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    },
    resetPassword: async (data: any) => {
        const response = await api.post('/auth/reset-password', data);
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
    },
    uploadSigned: async (id: string, signedPdfUrl: string) => {
        const response = await api.put<Payroll>(`/payrolls/${id}/signed`, { signedPdfUrl });
        return response.data;
    },
    getDownloadInfo: async (id: string) => {
        const response = await api.get<{ pdfUrl: string; filename: string }>(`/payrolls/${id}/download`);
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
    },
    updateJustification: async (id: string, justificationUrl: string) => {
        const response = await api.patch<VacationRequest>(`/vacations/${id}/justification`, { justificationUrl });
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
    uploadNewsImage: async (file: File) => {
        const formData = new FormData();
        formData.append('news', file);
        const response = await api.post('/upload/news', formData, {
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
    getSettings: async () => {
        const response = await api.get<any>('/admin/settings');
        return response.data;
    },
    updateSettings: async (data: any) => {
        const response = await api.put<any>('/admin/settings', data);
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
    getInviteCodes: async () => {
        const response = await api.get<InvitationCode[]>('/admin/invites');
        return response.data;
    },
    generateInviteCode: async () => {
        const response = await api.post<InvitationCode>('/admin/invites');
        return response.data;
    },
    revokeInviteCode: async (id: string) => {
        const response = await api.delete(`/admin/invites/${id}`);
        return response.data;
    },
    createPayroll: async (data: any) => {
        const res = await api.post('/admin/payrolls', data);
        return res.data;
    },
    getPayrolls: async (): Promise<Payroll[]> => {
        const res = await api.get('/admin/payrolls');
        return res.data;
    },
    deletePayroll: async (id: string) => {
        const res = await api.delete(`/admin/payrolls/${id}`);
        return res.data;
    },
    getVacations: async (): Promise<VacationRequest[]> => {
        const res = await api.get('/admin/vacations');
        return res.data;
    },
    // Email Templates
    getEmailTemplates: async () => {
        const response = await api.get('/admin/email-templates');
        return response.data;
    },
    getEmailTemplate: async (id: string) => {
        const response = await api.get(`/admin/email-templates/${id}`);
        return response.data;
    },
    updateEmailTemplate: async (id: string, data: any) => {
        const response = await api.put(`/admin/email-templates/${id}`, data);
        return response.data;
    },
    previewEmailTemplate: async (data: any) => {
        const response = await api.post('/admin/email-templates/preview', data);
        return response.data;
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

export const fichajeService = {
    create: async (tipo: FichajeTipo) => {
        const response = await api.post<{ fichaje: Fichaje; status: FichajeStatus }>('/fichajes', { tipo });
        return response.data;
    },
    getCurrent: async () => {
        const response = await api.get<FichajeStatus>('/fichajes/current');
        return response.data;
    },
    getHistory: async (filters?: { userId?: string; startDate?: string; endDate?: string; department?: string }) => {
        const response = await api.get<Fichaje[]>('/fichajes/history', { params: filters });
        return response.data;
    },
    getWeek: async (userId: string) => {
        const response = await api.get<FichajeDayStats[]>(`/fichajes/week/${userId}`);
        return response.data;
    },
    getMonth: async (userId: string) => {
        const response = await api.get<FichajeDayStats[]>(`/fichajes/month/${userId}`);
        return response.data;
    },
    getAttendanceReport: async (month: number, year: number) => {
        const response = await api.get('/fichajes/report', {
            params: { month, year },
            responseType: 'blob'
        });
        return response.data;
    },
    getDepartmentWeek: async (department: string) => {
        const response = await api.get(`/fichajes/department/${department}/week`);
        return response.data;
    },
};

export const scheduleService = {
    get: async (department: string) => {
        const response = await api.get<DepartmentSchedule>(`/department-schedules/${department}`);
        return response.data;
    },
    getAll: async () => {
        const response = await api.get<DepartmentSchedule[]>('/department-schedules');
        return response.data;
    },
    getResolved: async (department: string) => {
        const response = await api.get(`/department-schedules/${department}/resolved`);
        return response.data;
    },
    update: async (schedule: Partial<DepartmentSchedule> & { department: string }) => {
        const response = await api.post<DepartmentSchedule>('/department-schedules', schedule);
        return response.data;
    },
    delete: async (department: string) => {
        const response = await api.delete(`/department-schedules/${department}`);
        return response.data;
    },
};

export const lateNotificationService = {
    getAll: async () => {
        const response = await api.get<LateArrivalNotification[]>('/late-notifications');
        return response.data;
    },
    getSent: async () => {
        const response = await api.get<LateArrivalNotification[]>('/late-notifications/sent');
        return response.data;
    },
    send: async (data: { userId: string; fichajeId: string; fecha: string }) => {
        const response = await api.post<LateArrivalNotification>('/late-notifications', data);
        return response.data;
    },
    justify: async (id: string, justificacion: string) => {
        const response = await api.post<LateArrivalNotification>(`/late-notifications/${id}/justify`, { justificacion });
        return response.data;
    },
    markAsRead: async (id: string) => {
        const response = await api.put<LateArrivalNotification>(`/late-notifications/${id}/read`);
        return response.data;
    },
};

export const fichajeAdjustmentService = {
    create: async (data: { fichajeId: string; requestedTimestamp: string; reason: string }) => {
        const response = await api.post<FichajeAdjustment>('/fichaje-adjustments', data);
        return response.data;
    },
    getMyRequests: async () => {
        const response = await api.get<FichajeAdjustment[]>('/fichaje-adjustments');
        return response.data;
    },
    getPending: async () => {
        const response = await api.get<FichajeAdjustment[]>('/fichaje-adjustments/pending');
        return response.data;
    },
    getAll: async () => {
        const response = await api.get<FichajeAdjustment[]>('/fichaje-adjustments/all');
        return response.data;
    },
    approve: async (id: string) => {
        const response = await api.patch<FichajeAdjustment>(`/fichaje-adjustments/${id}/approve`);
        return response.data;
    },
    reject: async (id: string, rejectionReason: string) => {
        const response = await api.patch<FichajeAdjustment>(`/fichaje-adjustments/${id}/reject`, { rejectionReason });
        return response.data;
    },
};


export const pushService = {
    getPublicKey: async () => {
        const response = await api.get<{ publicKey: string }>('/push/public-key');
        return response.data.publicKey;
    },
    saveSubscription: async (subscription: PushSubscriptionPayload) => {
        const response = await api.post('/push/subscriptions', subscription);
        return response.data;
    },
    deleteSubscription: async (endpoint: string) => {
        const response = await api.delete('/push/subscriptions', { data: { endpoint } });
        return response.data;
    },
};

export default api;
