package com.xyon.empleados.data

import okhttp3.MultipartBody
import okhttp3.ResponseBody
import retrofit2.http.*

interface Api {
    // Auth (public)
    @POST("auth/login") suspend fun login(@Body b: LoginRequest): AuthResponse
    @POST("auth/register") suspend fun register(@Body b: RegisterRequest): AuthResponse
    @POST("auth/forgot-password") suspend fun forgot(@Body b: EmailRequest): MessageResponse
    @POST("auth/reset-password") suspend fun reset(@Body b: ResetPasswordRequest): MessageResponse

    // Profile
    @GET("users/profile") suspend fun profile(): User
    @PUT("users/profile") suspend fun updateProfile(@Body b: UpdateProfileRequest): User
    @POST("users/change-password") suspend fun changePassword(@Body b: ChangePasswordRequest): MessageResponse
    @Multipart @POST("upload/avatar") suspend fun uploadAvatar(@Part file: MultipartBody.Part): UploadResult

    @Multipart @POST("upload/justification") suspend fun uploadJustification(@Part file: MultipartBody.Part): UploadResult

    // Content
    @GET("news") suspend fun news(): List<NewsItem>
    @GET("events") suspend fun events(): List<EventItem>
    @GET("holidays/next") suspend fun nextHoliday(): Holiday?
    @GET("notifications") suspend fun notifications(): NotificationsResponse
    @PUT("notifications/{id}/read") suspend fun readNotification(@Path("id") id: String): ResponseBody
    @PUT("notifications/read-all") suspend fun readAllNotifications(): ResponseBody
    @DELETE("notifications/{id}") suspend fun deleteNotification(@Path("id") id: String): ResponseBody

    // Payroll
    @GET("payrolls") suspend fun payrolls(): List<Payroll>
    @GET("payrolls/{id}/download") suspend fun payrollDownload(@Path("id") id: String): DownloadInfo
    @Streaming @GET suspend fun download(@Url url: String): ResponseBody

    // Vacations / absences
    @GET("vacations") suspend fun vacations(): List<VacationRequest>
    @POST("vacations") suspend fun createVacation(@Body b: CreateVacationRequest): VacationRequest
    @GET("benefits/user") suspend fun myBalance(): UserBenefitsBalance
    @GET("benefits/department/{d}") suspend fun departmentBenefits(@Path("d") d: String): DepartmentBenefits

    // Fichajes
    @POST("fichajes") suspend fun fichar(@Body b: CreateFichajeRequest): CreateFichajeResponse
    @GET("fichajes/current") suspend fun fichajeCurrent(): FichajeStatus
    @GET("fichajes/history") suspend fun fichajeHistory(
        @Query("userId") userId: String? = null, @Query("startDate") start: String? = null,
        @Query("endDate") end: String? = null, @Query("department") dept: String? = null,
    ): List<Fichaje>
    @GET("fichajes/week/{id}") suspend fun fichajeWeek(@Path("id") id: String): List<FichajeDayStats>
    @GET("fichajes/month/{id}") suspend fun fichajeMonth(@Path("id") id: String): List<FichajeDayStats>
    @POST("fichaje-adjustments") suspend fun createAdjustment(@Body b: CreateAdjustmentRequest): FichajeAdjustment
    @GET("fichaje-adjustments") suspend fun myAdjustments(): List<FichajeAdjustment>

    // Manager
    @GET("manager/team-vacations") suspend fun teamVacations(): List<VacationRequest>
    @GET("manager/team-members") suspend fun teamMembers(): List<User>
    @PATCH("manager/vacations/{id}/approve") suspend fun managerApprove(@Path("id") id: String): VacationRequest
    @PATCH("manager/vacations/{id}/reject") suspend fun managerReject(@Path("id") id: String): VacationRequest
    @GET("fichaje-adjustments/pending") suspend fun pendingAdjustments(): List<FichajeAdjustment>
    @PATCH("fichaje-adjustments/{id}/approve") suspend fun approveAdjustment(@Path("id") id: String): FichajeAdjustment
    @PATCH("fichaje-adjustments/{id}/reject") suspend fun rejectAdjustment(@Path("id") id: String, @Body b: RejectRequest): FichajeAdjustment

    // Admin
    @GET("admin/stats") suspend fun adminStats(): AdminStats
    @GET("admin/users") suspend fun adminUsers(): List<User>
    @DELETE("admin/users/{id}") suspend fun adminDeleteUser(@Path("id") id: String): ResponseBody
    @GET("admin/vacations") suspend fun adminVacations(): List<VacationRequest>
    @PUT("admin/vacations/{id}/status") suspend fun adminVacationStatus(@Path("id") id: String, @Body b: StatusRequest): VacationRequest
    @GET("admin/invites") suspend fun invites(): List<InvitationCode>
    @POST("admin/invites") suspend fun createInvite(): InvitationCode
    @DELETE("admin/invites/{id}") suspend fun deleteInvite(@Path("id") id: String): ResponseBody
    @POST("admin/news") suspend fun createNews(@Body b: CreateNewsRequest): NewsItem
    @DELETE("admin/news/{id}") suspend fun deleteNews(@Path("id") id: String): ResponseBody
    @GET("admin/payrolls") suspend fun adminPayrolls(): List<Payroll>
    @DELETE("admin/payrolls/{id}") suspend fun adminDeletePayroll(@Path("id") id: String): ResponseBody
}
