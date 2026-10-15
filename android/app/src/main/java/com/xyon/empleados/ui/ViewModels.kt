package com.xyon.empleados.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.xyon.empleados.data.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject

sealed interface AuthState {
    data object Loading : AuthState
    data object LoggedOut : AuthState
    data class Locked(val user: User?) : AuthState   // token present, biometric required
    data class LoggedIn(val user: User) : AuthState
}

val User.isManager get() = role == "MANAGER" || role == "ADMIN"
val User.isAdmin get() = role == "ADMIN"

/** App-wide session: login/register/recovery, biometric unlock, profile. */
@HiltViewModel
class SessionViewModel @Inject constructor(
    private val api: Api, private val store: SessionStore, private val cache: CacheStore, private val json: kotlinx.serialization.json.Json,
) : ViewModel() {
    private val _auth = MutableStateFlow<AuthState>(AuthState.Loading)
    val auth: StateFlow<AuthState> = _auth.asStateFlow()
    val biometricEnabled = store.biometricEnabled
    private val _busy = MutableStateFlow(false)
    val busy = _busy.asStateFlow()
    private val _message = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val message: SharedFlow<String> = _message.asSharedFlow()
    private var pendingUser: User? = null

    init {
        viewModelScope.launch {
            val has = store.load()
            if (!has) { _auth.value = AuthState.LoggedOut; return@launch }
            val cached = cache.get("me")?.let { runCatching { json.decodeFromString<User>(it) }.getOrNull() }
            pendingUser = cached
            if (store.biometricEnabled.first()) _auth.value = AuthState.Locked(cached)
            else enter(cached)
        }
        viewModelScope.launch { store.sessionExpired.collect { signOut("Tu sesión ha caducado") } }
    }

    /** Called after biometric success (or when biometrics disabled). */
    fun unlock() = enter(pendingUser)

    private fun enter(cached: User?) {
        viewModelScope.launch {
            if (cached != null) _auth.value = AuthState.LoggedIn(cached)
            safeCall { api.profile() }.onSuccess {
                cache.put("me", json.encodeToString(User.serializer(), it)); _auth.value = AuthState.LoggedIn(it)
            }.onFailure { if (cached == null) { if (it.isOffline) _message.tryEmit(it.userMessage()) else signOut(null) } }
        }
    }

    private fun accept(r: AuthResponse) = viewModelScope.launch {
        store.saveToken(r.token)
        cache.put("me", json.encodeToString(User.serializer(), r.user))
        _auth.value = AuthState.LoggedIn(r.user)
    }

    private fun run(block: suspend () -> AuthResponse) = viewModelScope.launch {
        _busy.value = true
        safeCall(block).onSuccess { accept(it) }.onFailure { _message.tryEmit(it.userMessage()) }
        _busy.value = false
    }
    fun doLogin(email: String, pass: String) = run { api.login(LoginRequest(email.trim(), pass)) }
    fun doRegister(r: RegisterRequest) = run { api.register(r) }

    fun forgot(email: String, done: () -> Unit) = viewModelScope.launch {
        _busy.value = true
        safeCall { api.forgot(EmailRequest(email.trim())) }
            .onSuccess { _message.tryEmit("Si el email existe, recibirás un enlace"); done() }
            .onFailure { _message.tryEmit(it.userMessage()) }
        _busy.value = false
    }

    fun reset(token: String, email: String, pass: String, done: () -> Unit) = viewModelScope.launch {
        _busy.value = true
        safeCall { api.reset(ResetPasswordRequest(token.trim(), email.trim(), pass)) }
            .onSuccess { _message.tryEmit("Contraseña actualizada"); done() }
            .onFailure { _message.tryEmit(it.userMessage()) }
        _busy.value = false
    }

    fun signOut(msg: String? = null) = viewModelScope.launch {
        store.clear(); cache.clear(); _auth.value = AuthState.LoggedOut
        msg?.let { _message.tryEmit(it) }
    }

    fun setBiometric(on: Boolean) = viewModelScope.launch { store.setBiometric(on) }

    fun updateProfile(req: UpdateProfileRequest) = viewModelScope.launch {
        safeCall { api.updateProfile(req) }.onSuccess {
            cache.put("me", json.encodeToString(User.serializer(), it)); _auth.value = AuthState.LoggedIn(it)
            _message.tryEmit("Perfil actualizado")
        }.onFailure { _message.tryEmit(it.userMessage()) }
    }

    fun changePassword(cur: String, new: String) = viewModelScope.launch {
        safeCall { api.changePassword(ChangePasswordRequest(cur, new)) }
            .onSuccess { _message.tryEmit("Contraseña cambiada") }
            .onFailure { _message.tryEmit(it.userMessage()) }
    }

    fun uploadAvatar(bytes: ByteArray, mime: String) = viewModelScope.launch {
        val part = MultipartBody.Part.createFormData("avatars", "avatar", bytes.toRequestBody(mime.toMediaType()))
        safeCall { api.uploadAvatar(part) }.onSuccess {
            val url = it.url ?: it.fileUrl ?: it.path
            if (url != null) updateProfile(UpdateProfileRequest(avatarUrl = url))
        }.onFailure { _message.tryEmit(it.userMessage()) }
    }
}

/** Dashboard: fichaje status + summary widgets. */
@HiltViewModel
class DashboardViewModel @Inject constructor(private val api: Api, lf: LoaderFactory, me: MeProvider) : ViewModel() {
    val status = lf.create<FichajeStatus>(viewModelScope, "fichaje_current") { api.fichajeCurrent() }
    val vacations = lf.create<List<VacationRequest>>(viewModelScope, "vacations") { api.vacations() }
    val balance = lf.create<UserBenefitsBalance>(viewModelScope, "balance") { api.myBalance() }
    val news = lf.create<List<NewsItem>>(viewModelScope, "news") { api.news() }
    val week = lf.create<List<FichajeDayStats>>(viewModelScope, "week") { api.fichajeWeek(me.id()) }

    private val _busy = MutableStateFlow(false)
    val busy = _busy.asStateFlow()
    private val _events = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val events = _events.asSharedFlow()
    private val _justDone = MutableSharedFlow<Boolean>(extraBufferCapacity = 1)
    val justDone = _justDone.asSharedFlow()

    fun refreshAll() { status.refresh(); vacations.refresh(); balance.refresh(); news.refresh(); week.refresh() }

    fun fichar(entering: Boolean, lat: Double?, lon: Double?, acc: Float?) = viewModelScope.launch {
        _busy.value = true
        val tipo = if (entering) "ENTRADA" else "SALIDA"
        safeCall { api.fichar(CreateFichajeRequest(tipo, lat, lon, acc)) }.onSuccess {
            it.status?.let { s -> status.set(s) } ; status.refresh(); week.refresh()
            _justDone.tryEmit(entering)
            it.warning?.let { w -> _events.tryEmit(w) }
        }.onFailure { _events.tryEmit(it.userMessage()) }
        _busy.value = false
    }
}

@HiltViewModel
class VacationsViewModel @Inject constructor(private val api: Api, lf: LoaderFactory) : ViewModel() {
    val items = lf.create<List<VacationRequest>>(viewModelScope, "vacations") { api.vacations() }
    val balance = lf.create<UserBenefitsBalance>(viewModelScope, "balance") { api.myBalance() }
    private val _msg = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val msg = _msg.asSharedFlow()
    private val _busy = MutableStateFlow(false)
    val busy = _busy.asStateFlow()

    fun create(r: CreateVacationRequest, file: Pair<ByteArray, String>? = null, ok: () -> Unit) = viewModelScope.launch {
        _busy.value = true
        safeCall {
            var req = r
            if (file != null) {
                val part = MultipartBody.Part.createFormData("justifications", "justificante", file.first.toRequestBody(file.second.toMediaType()))
                val up = api.uploadJustification(part)
                req = r.copy(justificationUrl = up.url ?: up.fileUrl ?: up.path)
            }
            api.createVacation(req)
        }.onSuccess { _msg.tryEmit("Solicitud enviada"); items.refresh(); ok() }
            .onFailure { _msg.tryEmit(it.userMessage()) }
        _busy.value = false
    }
}

@HiltViewModel
class CalendarViewModel @Inject constructor(private val api: Api, lf: LoaderFactory) : ViewModel() {
    val events = lf.create<List<EventItem>>(viewModelScope, "events") { api.events() }
    val mine = lf.create<List<VacationRequest>>(viewModelScope, "vacations") { api.vacations() }
    val team = lf.create<List<VacationRequest>>(viewModelScope, "team_vacations") { api.teamVacations() }
    fun refresh() { events.refresh(); mine.refresh(); team.refresh() }
}

@HiltViewModel
class NewsViewModel @Inject constructor(api: Api, lf: LoaderFactory) : ViewModel() {
    val news = lf.create<List<NewsItem>>(viewModelScope, "news") { api.news() }
}

@HiltViewModel
class PayrollViewModel @Inject constructor(private val api: Api, lf: LoaderFactory) : ViewModel() {
    val items = lf.create<List<Payroll>>(viewModelScope, "payrolls") { api.payrolls() }
    private val _file = MutableSharedFlow<Pair<ByteArray, String>>(extraBufferCapacity = 1)
    val file = _file.asSharedFlow()
    private val _msg = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val msg = _msg.asSharedFlow()
    private val _busy = MutableStateFlow<String?>(null)
    val busy = _busy.asStateFlow()

    fun open(p: Payroll) = viewModelScope.launch {
        _busy.value = p.id
        safeCall {
            val info = api.payrollDownload(p.id)
            val url = info.pdfUrl ?: error("Sin archivo")
            val full = if (url.startsWith("http")) url else com.xyon.empleados.BuildConfig.API_BASE_URL.removeSuffix("api/") + url.removePrefix("/")
            // Only allow downloading from the API host over HTTPS
            require(full.startsWith("https://")) { "URL no segura" }
            val bytes = api.download(full).bytes()
            bytes to (info.filename ?: "nomina_${p.month}_${p.year}.pdf")
        }.onSuccess { _file.tryEmit(it) }.onFailure { _msg.tryEmit(it.userMessage()) }
        _busy.value = null
    }
}

@HiltViewModel
class NotificationsViewModel @Inject constructor(private val api: Api, lf: LoaderFactory) : ViewModel() {
    val items = lf.create<NotificationsResponse>(viewModelScope, "notifications") { api.notifications() }
    fun read(id: String) = viewModelScope.launch { safeCall { api.readNotification(id) }; items.refresh() }
    fun readAll() = viewModelScope.launch { safeCall { api.readAllNotifications() }; items.refresh() }
    fun delete(id: String) = viewModelScope.launch { safeCall { api.deleteNotification(id) }; items.refresh() }
}

@HiltViewModel
class FichajesViewModel @Inject constructor(private val api: Api, lf: LoaderFactory, me: MeProvider) : ViewModel() {
    val month = lf.create<List<FichajeDayStats>>(viewModelScope, "month") { api.fichajeMonth(me.id()) }
    val adjustments = lf.create<List<FichajeAdjustment>>(viewModelScope, "my_adjustments") { api.myAdjustments() }
    private val _msg = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val msg = _msg.asSharedFlow()
    fun requestAdjustment(r: CreateAdjustmentRequest) = viewModelScope.launch {
        safeCall { api.createAdjustment(r) }.onSuccess { _msg.tryEmit("Solicitud de ajuste enviada"); adjustments.refresh() }
            .onFailure { _msg.tryEmit(it.userMessage()) }
    }
}

/** Manager: team requests, adjustments, team members. */
@HiltViewModel
class ManagerViewModel @Inject constructor(private val api: Api, lf: LoaderFactory) : ViewModel() {
    val vacations = lf.create<List<VacationRequest>>(viewModelScope, "team_vacations") { api.teamVacations() }
    val adjustments = lf.create<List<FichajeAdjustment>>(viewModelScope, "pending_adjustments") { api.pendingAdjustments() }
    val members = lf.create<List<User>>(viewModelScope, "team_members") { api.teamMembers() }
    private val _msg = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val msg = _msg.asSharedFlow()

    private fun act(ok: String, block: suspend () -> Any, after: () -> Unit) = viewModelScope.launch {
        safeCall { block() }.onSuccess { _msg.tryEmit(ok); after() }.onFailure { _msg.tryEmit(it.userMessage()) }
    }
    fun approve(id: String) = act("Solicitud aprobada", { api.managerApprove(id) }) { vacations.refresh() }
    fun reject(id: String) = act("Solicitud rechazada", { api.managerReject(id) }) { vacations.refresh() }
    fun approveAdj(id: String) = act("Ajuste aprobado", { api.approveAdjustment(id) }) { adjustments.refresh() }
    fun rejectAdj(id: String, reason: String) = act("Ajuste rechazado", { api.rejectAdjustment(id, RejectRequest(reason)) }) { adjustments.refresh() }
}

@HiltViewModel
class AdminViewModel @Inject constructor(private val api: Api, lf: LoaderFactory) : ViewModel() {
    val stats = lf.create<AdminStats>(viewModelScope, "admin_stats") { api.adminStats() }
    val users = lf.create<List<User>>(viewModelScope, "admin_users") { api.adminUsers() }
    val vacations = lf.create<List<VacationRequest>>(viewModelScope, "admin_vacations") { api.adminVacations() }
    val invites = lf.create<List<InvitationCode>>(viewModelScope, "admin_invites") { api.invites() }
    val news = lf.create<List<NewsItem>>(viewModelScope, "news") { api.news() }
    val payrolls = lf.create<List<Payroll>>(viewModelScope, "admin_payrolls") { api.adminPayrolls() }
    private val _msg = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val msg = _msg.asSharedFlow()

    private fun act(ok: String, block: suspend () -> Any, after: () -> Unit) = viewModelScope.launch {
        safeCall { block() }.onSuccess { _msg.tryEmit(ok); after() }.onFailure { _msg.tryEmit(it.userMessage()) }
    }
    fun refreshAll() { stats.refresh(); users.refresh(); vacations.refresh(); invites.refresh(); news.refresh(); payrolls.refresh() }
    fun setVacation(id: String, status: String) = act("Solicitud actualizada", { api.adminVacationStatus(id, StatusRequest(status)) }) { vacations.refresh(); stats.refresh() }
    fun deleteUser(id: String) = act("Usuario eliminado", { api.adminDeleteUser(id) }) { users.refresh(); stats.refresh() }
    fun newInvite() = act("Código generado", { api.createInvite() }) { invites.refresh() }
    fun deleteInvite(id: String) = act("Código revocado", { api.deleteInvite(id) }) { invites.refresh() }
    fun createNews(r: CreateNewsRequest) = act("Noticia publicada", { api.createNews(r) }) { news.refresh() }
    fun deleteNews(id: String) = act("Noticia eliminada", { api.deleteNews(id) }) { news.refresh() }
    fun deletePayroll(id: String) = act("Nómina eliminada", { api.adminDeletePayroll(id) }) { payrolls.refresh() }
}

@javax.inject.Singleton
class MeProvider @Inject constructor(private val cache: CacheStore, private val api: Api, private val json: kotlinx.serialization.json.Json) {
    suspend fun id(): String =
        cache.get("me")?.let { runCatching { json.decodeFromString<User>(it).id }.getOrNull() } ?: api.profile().id
}
