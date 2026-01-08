import api from './api';

export const benefitsService = {
    // Get user benefits balance
    getUserBalance: async () => {
        const response = await api.get('/benefits/user');
        return response.data;
    },

    // Get department benefits
    getDepartmentBenefits: async (department: string) => {
        const response = await api.get(`/benefits/department/${department}`);
        return response.data;
    },

    // Admin: Get all department benefits
    getAllBenefits: async () => {
        const response = await api.get('/admin/benefits');
        return response.data;
    },

    // Admin: Create or update department benefits
    upsertBenefits: async (data: any) => {
        const response = await api.post('/admin/benefits', data);
        return response.data;
    }
};
