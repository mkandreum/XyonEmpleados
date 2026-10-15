package com.xyon.empleados.data

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val role: String = "EMPLOYEE",
    val department: String = "",
    val position: String = "",
    val avatarUrl: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val emergencyContact: String? = null,
    val joinDate: String? = null,
)

@Serializable data class LoginRequest(val email: String, val password: String)
@Serializable data class RegisterRequest(
    val name: String, val email: String, val password: String,
    val department: String? = null, val position: String? = null, val invitationCode: String,
)
@Serializable data class AuthResponse(val token: String, val user: User)
@Serializable data class EmailRequest(val email: String)
@Serializable data class ResetPasswordRequest(val token: String, val email: String, val newPassword: String)
@Serializable data class ChangePasswordRequest(val currentPassword: String, val newPassword: String)
@Serializable data class MessageResponse(val message: String? = null, val error: String? = null)
@Serializable data class UpdateProfileRequest(
    val phone: String? = null, val address: String? = null,
    val emergencyContact: String? = null, val avatarUrl: String? = null,
)

@Serializable
data class Payroll(
    val id: String = "", val month: String = "", val year: Int = 0, val amount: Double = 0.0,
    val pdfUrl: String? = null, val signedPdfUrl: String? = null, val status: String = "PENDING",
    val user: User? = null,
)
@Serializable data class DownloadInfo(val pdfUrl: String? = null, val filename: String? = null)

@Serializable
data class VacationRequest(
    val id: String = "", val startDate: String = "", val endDate: String = "",
    val days: Double = 0.0, val hours: Double? = null, val status: String = "PENDING",
    val type: String = "VACATION", val subtype: String? = null,
    val justificationUrl: String? = null, val user: User? = null, val createdAt: String? = null,
)
@Serializable
data class CreateVacationRequest(
    val startDate: String, val endDate: String, val days: Int, val hours: Int? = null,
    val type: String, val subtype: String? = null, val justificationUrl: String? = null,
)
@Serializable data class StatusRequest(val status: String)

@Serializable
data class NewsItem(
    val id: String = "", val title: String = "", val summary: String = "", val content: String = "",
    val date: String = "", val category: String = "CORPORATE", val imageUrl: String? = null,
)

@Serializable
data class AppNotification(
    val id: String = "", val title: String = "", val message: String = "",
    val read: Boolean = false, val date: String? = null, val createdAt: String? = null,
)
@Serializable
data class NotificationsResponse(val notifications: List<AppNotification> = emptyList(), val unreadCount: Int = 0)

@Serializable
data class EventItem(
    val id: String = "", val title: String = "", val description: String? = null,
    val date: String = "", val location: String? = null,
)
@Serializable data class Holiday(val id: String = "", val name: String = "", val date: String = "", val year: Int = 0)

@Serializable
data class Fichaje(
    val id: String = "", val userId: String = "", val tipo: String = "ENTRADA",
    val timestamp: String = "", val department: String? = null, val user: User? = null,
)
@Serializable
data class TurnoInfo(
    val turno: String? = null, val expectedEntry: String? = null,
    val expectedExit: String? = null, val label: String? = null,
)
@Serializable
data class FichajeStatus(
    val hasActiveEntry: Boolean = false, val currentFichaje: Fichaje? = null, val turno: TurnoInfo? = null,
)
@Serializable
data class CreateFichajeRequest(
    val tipo: String, val latitude: Double? = null, val longitude: Double? = null, val accuracy: Float? = null,
)
@Serializable
data class CreateFichajeResponse(
    val fichaje: Fichaje? = null, val status: FichajeStatus? = null, val warning: String? = null,
)
@Serializable
data class FichajeDayStats(
    val date: String = "", val fichajes: List<Fichaje> = emptyList(), val horasTrabajadas: Double = 0.0,
    val isComplete: Boolean = false, val isLate: Boolean = false, val isEarlyDeparture: Boolean = false,
    val turno: TurnoInfo? = null,
)

@Serializable
data class FichajeAdjustment(
    val id: String = "", val fichajeId: String = "", val userId: String = "", val user: User? = null,
    val originalTimestamp: String = "", val requestedTimestamp: String = "", val reason: String = "",
    val status: String = "PENDING", val rejectionReason: String? = null, val createdAt: String? = null,
)
@Serializable
data class CreateAdjustmentRequest(val fichajeId: String, val requestedTimestamp: String, val reason: String)
@Serializable data class RejectRequest(val rejectionReason: String)

@Serializable
data class UserBenefitsBalance(
    val vacationDaysUsed: Double = 0.0, val overtimeHoursUsed: Double = 0.0,
    val sickLeaveHoursUsed: Double = 0.0, val paidAbsenceHoursUsed: Double = 0.0, val year: Int = 0,
)
@Serializable
data class DepartmentBenefits(
    val department: String = "", val vacationDays: Double = 0.0, val overtimeHoursBank: Double = 0.0,
    val sickLeaveHours: Double = 0.0, val paidAbsenceHours: Double = 0.0,
)

@Serializable
data class AdminStats(
    val totalUsers: Int = 0, val activeUsers: Int = 0, val pendingVacations: Int = 0,
    val totalPayrollAmount: Double = 0.0,
)
@Serializable
data class InvitationCode(
    val id: String = "", val code: String = "", val isUsed: Boolean = false, val createdAt: String? = null,
)
@Serializable
data class CreateNewsRequest(
    val title: String, val summary: String, val content: String, val category: String, val imageUrl: String? = null,
)
@Serializable
data class UploadResult(val url: String? = null, val fileUrl: String? = null, val path: String? = null)
