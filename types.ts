export interface UserShiftAssignment {
  id: string;
  userId: string;
  shiftId: string;
  date: string;
  shift: DepartmentShift;
  createdAt: string;
  updatedAt: string;
}
export interface DepartmentShift {
  id: string;
  department: string;
  name: string; // Ej: "Mañana", "Tarde", "Noche"
  activeDays: string; // Ej: "LUNES,MARTES,MIERCOLES,JUEVES,VIERNES"
  horaEntrada: string;
  horaSalida: string;
  horaEntradaTarde?: string | null;
  horaSalidaMañana?: string | null;
  toleranciaMinutos: number;
  flexibleSchedule: boolean;
  scheduleOverrides?: any; // JSON overrides per day (optional)
  createdAt: string;
  updatedAt: string;
}
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
  signedPdfUrl?: string;
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
  hours?: number;
  status: VacationStatus;
  type: 'VACATION' | 'PERSONAL' | 'SICK_LEAVE' | 'OVERTIME' | 'OTHER';
  subtype?: string;
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

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
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
  id?: string;
  department: string;
  vacationDays: number;
  overtimeHoursBank: number;
  sickLeaveDays: number;
  paidAbsenceHours: number;
}

export interface UserBenefitsBalance {
  id: string;
  userId: string;
  vacationDaysUsed: number;
  overtimeHoursUsed: number;
  sickLeaveDaysUsed: number;
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

export enum FichajeTipo {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA'
}

export interface Fichaje {
  id: string;
  userId: string;
  user?: User;
  tipo: FichajeTipo;
  timestamp: string;
  department: string;
  createdAt: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export interface DepartmentSchedule {
  id: string;
  department: string;
  name: string; // Nombre o tipo de horario
  horaEntrada: string;
  horaSalida: string;
  horaEntradaTarde?: string;
  horaSalidaMañana?: string;
  toleranciaMinutos: number;
  flexibleSchedule?: boolean;
  // Per-day schedule overrides
  scheduleLunes?: DayScheduleOverride | null;
  scheduleMartes?: DayScheduleOverride | null;
  scheduleMiercoles?: DayScheduleOverride | null;
  scheduleJueves?: DayScheduleOverride | null;
  scheduleViernes?: DayScheduleOverride | null;
  scheduleSabado?: DayScheduleOverride | null;
  scheduleDomingo?: DayScheduleOverride | null;
}

export interface DayScheduleOverride {
  horaEntrada?: string;
  horaSalida?: string;
  horaEntradaTarde?: string | null;
  horaSalidaMañana?: string | null;
  toleranciaMinutos?: number;
  flexibleSchedule?: boolean;
  dayOff?: boolean;
}

export interface TurnoInfo {
  turno: 'MAÑANA' | 'TARDE' | 'COMPLETA' | 'FLEXIBLE';
  expectedEntry: string;
  expectedExit: string;
  label: string;
}

export interface LateArrivalNotification {
  id: string;
  userId: string;
  user?: User;
  managerId: string;
  manager?: User;
  fichajeId: string;
  fichaje?: Fichaje;
  fecha: string;
  justificado: boolean;
  justificacionTexto?: string;
  leido: boolean;
  createdAt: string;
}

export interface FichajeStatus {
  hasActiveEntry: boolean;
  currentFichaje?: Fichaje;
}

export interface FichajeDayStats {
  date: string;
  fichajes: Fichaje[];
  horasTrabajadas: number;
  isComplete: boolean;
  isLate: boolean;
  isEarlyDeparture: boolean;
  turno?: TurnoInfo | null;
  daySchedule?: {
    horaEntrada: string;
    horaSalida: string;
    horaEntradaTarde?: string | null;
    horaSalidaMañana?: string | null;
    isOverride: boolean;
    flexibleSchedule: boolean;
  } | null;
}

export interface InvitationCode {
  id: string;
  code: string;
  isUsed: boolean;
  usedBy?: string;
  createdAt: string;
}

export enum FichajeAdjustmentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface FichajeAdjustment {
  id: string;
  fichajeId: string;
  fichaje?: Fichaje;
  userId: string;
  user?: User;
  managerId?: string;
  manager?: User;
  originalTimestamp: string;
  requestedTimestamp: string;
  reason: string;
  status: FichajeAdjustmentStatus;
  rejectionReason?: string;
  resolvedAt?: string;
  createdAt: string;
}

