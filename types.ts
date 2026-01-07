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
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface VacationRequest {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  status: VacationStatus;
  type: 'VACATION' | 'PERSONAL' | 'SICK_LEAVE';
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