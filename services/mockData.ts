import { User, UserRole, Payroll, VacationRequest, VacationStatus, NewsItem, Notification } from '../types';

export const currentUser: User = {
  id: 'EMP001',
  name: 'Alejandro Ruiz',
  email: 'alejandro.ruiz@velilla.com',
  role: UserRole.EMPLOYEE,
  department: 'Desarrollo de Software',
  position: 'Senior Frontend Developer',
  avatarUrl: 'https://picsum.photos/200',
  joinDate: '2021-03-15'
};

export const mockPayrolls: Payroll[] = [
  { id: 'PAY-001', month: 'Mayo', year: 2024, amount: 2450.00, pdfUrl: '#', status: 'PAID' },
  { id: 'PAY-002', month: 'Abril', year: 2024, amount: 2450.00, pdfUrl: '#', status: 'PAID' },
  { id: 'PAY-003', month: 'Marzo', year: 2024, amount: 2450.00, pdfUrl: '#', status: 'PAID' },
  { id: 'PAY-004', month: 'Febrero', year: 2024, amount: 2450.00, pdfUrl: '#', status: 'PAID' },
  { id: 'PAY-005', month: 'Enero', year: 2024, amount: 2300.00, pdfUrl: '#', status: 'PAID' },
];

export const mockVacations: VacationRequest[] = [
  { id: 'VAC-001', startDate: '2024-08-15', endDate: '2024-08-30', days: 15, status: VacationStatus.APPROVED, type: 'VACATION' },
  { id: 'VAC-002', startDate: '2024-12-23', endDate: '2024-12-27', days: 5, status: VacationStatus.PENDING, type: 'VACATION' },
  { id: 'VAC-003', startDate: '2024-02-14', endDate: '2024-02-14', days: 1, status: VacationStatus.APPROVED, type: 'PERSONAL' },
];

export const mockNews: NewsItem[] = [
  { 
    id: 'NEWS-001', 
    title: 'Nueva Política de Trabajo Híbrido', 
    summary: 'Actualizamos nuestras guías para el teletrabajo a partir del próximo mes.', 
    content: '...', 
    date: '2024-05-20', 
    category: 'CORPORATE',
    imageUrl: 'https://picsum.photos/400/200?random=1'
  },
  { 
    id: 'NEWS-002', 
    title: 'Cena de Verano 2024', 
    summary: 'Reserva la fecha para nuestro evento anual de equipo.', 
    content: '...', 
    date: '2024-05-18', 
    category: 'EVENT',
    imageUrl: 'https://picsum.photos/400/200?random=2'
  },
  { 
    id: 'NEWS-003', 
    title: 'Mantenimiento de Servidores', 
    summary: 'Interrupción programada para este fin de semana.', 
    content: '...', 
    date: '2024-05-15', 
    category: 'URGENT',
    imageUrl: 'https://picsum.photos/400/200?random=3'
  }
];

export const mockNotifications: Notification[] = [
  { id: 'NOT-1', title: 'Nómina Disponible', message: 'Tu nómina de Mayo ya está disponible.', read: false, date: '2024-05-30' },
  { id: 'NOT-2', title: 'Solicitud Aprobada', message: 'Tus vacaciones de Agosto han sido aprobadas.', read: true, date: '2024-05-25' },
];