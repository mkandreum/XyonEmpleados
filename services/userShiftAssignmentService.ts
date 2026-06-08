import api from './api';
import { UserShiftAssignment } from '../types';

export const userShiftAssignmentService = {
  assign: async (userId: string, shiftId: string, date: string) => {
    const response = await api.post<UserShiftAssignment>('/user-shift-assignments', { userId, shiftId, date });
    return response.data;
  },
  getUserShifts: async (userId: string, month: number, year: number) => {
    const response = await api.get<UserShiftAssignment[]>(`/user-shift-assignments`, {
      params: { userId, month, year }
    });
    return response.data;
  },
};
