export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  position: string;
  avatarUrl?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  joinDate: string;
}

export interface Payroll {
  id: string;
  month: string;
  year: number;
  amount: number;
  pdfUrl: string;
  status: 'PAID' | 'PENDING';
}

export enum VacationStatus {
  PENDING = 'PENDING',                   // Legacy
  PENDING_MANAGER = 'PENDING_MANAGER',   // Awaiting Manager approval
  PENDING_ADMIN = 'PENDING_ADMIN',       // Awaiting Admin approval
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface VacationRequest {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  quantity?: number; // Hours
  status: VacationStatus;
  type: 'VACATION' | 'PERSONAL' | 'SICK_LEAVE';
  justificationUrl?: string;
  user?: User;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  category: 'CORPORATE' | 'EVENT' | 'URGENT';
  imageUrl?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  date: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  year: number;
}

export interface DepartmentBenefits {
  id: string;
  department: string;
  vacationDays: number;
  overtimeHoursBank: number;
  sickLeaveHours: number;
  paidAbsenceHours: number;
}

export interface UserBenefitsBalance {
  id: string;
  userId: string;
  vacationDaysUsed: number;
  overtimeHoursUsed: number;
  sickLeaveHoursUsed: number;
  paidAbsenceHoursUsed: number;
  year: number;
}

export interface GlobalSettings {
  id: string;
  key: string;
  value: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number; // Users active in last 30 days or similar
  pendingVacations: number;
  totalPayrollAmount: number; // For current month
}
