import api from './api';
import { DepartmentShift } from '../types';

export const shiftService = {
  getAll: async (department: string) => {
    const response = await api.get<DepartmentShift[]>(`/department-shifts/${department}`);
    return response.data;
  },
  create: async (shift: Partial<DepartmentShift> & { department: string }) => {
    const response = await api.post<DepartmentShift>('/department-shifts', shift);
    return response.data;
  },
  update: async (id: string, shift: Partial<DepartmentShift>) => {
    const response = await api.put<DepartmentShift>(`/department-shifts/${id}`, shift);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/department-shifts/${id}`);
    return response.data;
  },
};
