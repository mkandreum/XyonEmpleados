import api from './api';

export const uploadService = {
    uploadLogo: async (file: File) => {
        const formData = new FormData();
        formData.append('logos', file);

        const response = await api.post('/upload/logo', formData, {
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

    uploadJustification: async (file: File) => {
        const formData = new FormData();
        formData.append('justifications', file);

        const response = await api.post('/upload/justification', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    uploadAvatar: async (file: File) => {
        const formData = new FormData();
        formData.append('avatars', file);

        const response = await api.post('/upload/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    deleteFile: async (filepath: string) => {
        const response = await api.delete('/upload/file', { data: { filepath } });
        return response.data;
    }
};
