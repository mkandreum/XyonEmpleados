package com.xyon.empleados.ui

import android.content.Intent
import androidx.compose.animation.*
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.xyon.empleados.BuildConfig
import com.xyon.empleados.data.*
import com.xyon.empleados.ui.theme.*
import java.io.File

@OptIn(ExperimentalSharedTransitionApi::class)
val LocalSharedScope = compositionLocalOf<SharedTransitionScope?> { null }
val LocalAnimScope = compositionLocalOf<AnimatedVisibilityScope?> { null }

/** Shared-element modifier (no-op when scopes are absent, e.g. previews). */
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun Modifier.sharedKey(key: String): Modifier {
    val s = LocalSharedScope.current; val a = LocalAnimScope.current
    return if (s != null && a != null) with(s) { this@sharedKey.sharedBounds(rememberSharedContentState(key), a, resizeMode = SharedTransitionScope.ResizeMode.ScaleToBounds()) } else this
}

private fun imageUrl(u: String?): String? = u?.let {
    if (it.startsWith("http")) it else BuildConfig.API_BASE_URL.removeSuffix("api/") + it.removePrefix("/")
}?.takeIf { it.startsWith("https://") }

@Composable
fun NewsScreen(vm: NewsViewModel, onOpen: (NewsItem) -> Unit) {
    val st by vm.news.state.collectAsState()
    Column(Modifier.fillMaxSize()) {
        ScreenHeader("Noticias", "Lo último de la empresa")
        LoadScreen(st, { vm.news.refresh() }) { list ->
            ListScreenColumn {
                if (list.isEmpty()) item { EmptyState(Icons.Filled.Newspaper, "No hay noticias") }
                staggeredItems(list.sortedByDescending { it.date }, { it.id }) { _, n ->
                    GlassCard(Modifier.fillMaxWidth().sharedKey("news-${n.id}"), onClick = { onOpen(n) }, accent = if (n.category == "URGENT") Danger else null) {
                        imageUrl(n.imageUrl)?.let {
                            AsyncImage(it, null, Modifier.fillMaxWidth().height(150.dp).clip(MaterialTheme.shapes.medium), contentScale = ContentScale.Crop)
                            Spacer(Modifier.height(10.dp))
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            StatusChip(n.category, if (n.category == "URGENT") Tone.Danger else if (n.category == "EVENT") Tone.Warning else Tone.Info)
                            Spacer(Modifier.weight(1f)); Text(fmtDate(n.date), color = Slate500, style = MaterialTheme.typography.labelSmall)
                        }
                        Text(n.title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp))
                        Text(n.summary, color = Slate400, maxLines = 3, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
    }
}

@Composable
fun NewsDetailScreen(item: NewsItem?, onBack: () -> Unit) {
    Column(Modifier.fillMaxSize()) {
        ScreenHeader("Noticia", null, onBack)
        if (item == null) EmptyState(Icons.Filled.Newspaper, "Noticia no disponible")
        else GlassCard(Modifier.fillMaxSize().padding(horizontal = 16.dp).padding(bottom = 16.dp).sharedKey("news-${item.id}")) {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                imageUrl(item.imageUrl)?.let {
                    AsyncImage(it, null, Modifier.fillMaxWidth().height(200.dp).clip(MaterialTheme.shapes.medium), contentScale = ContentScale.Crop)
                    Spacer(Modifier.height(12.dp))
                }
                StatusChip(item.category, if (item.category == "URGENT") Tone.Danger else Tone.Info)
                Text(item.title, style = MaterialTheme.typography.headlineMedium, modifier = Modifier.padding(top = 8.dp))
                Text(fmtDate(item.date), color = Slate500, modifier = Modifier.padding(bottom = 12.dp))
                Text(item.content.ifBlank { item.summary }, style = MaterialTheme.typography.bodyLarge)
            }
        }
    }
}

// ───────── Payroll ─────────

@Composable
fun PayrollScreen(onBack: () -> Unit, vm: PayrollViewModel = hiltViewModel(), snack: (String) -> Unit) {
    SecureScreen()
    val ctx = LocalContext.current
    val st by vm.items.state.collectAsState()
    val busy by vm.busy.collectAsState()
    LaunchedEffect(Unit) { vm.msg.collect { snack(it) } }
    LaunchedEffect(Unit) {
        vm.file.collect { (bytes, name) ->
            val dir = File(ctx.cacheDir, "docs").apply { mkdirs(); listFiles()?.forEach { it.delete() } }
            val f = File(dir, name.replace(Regex("[^A-Za-z0-9._-]"), "_").let { if (it.endsWith(".pdf")) it else "$it.pdf" })
            f.writeBytes(bytes)
            val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.files", f)
            ctx.startActivity(Intent.createChooser(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/pdf").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION), "Abrir nómina"))
        }
    }
    Column(Modifier.fillMaxSize()) {
        ScreenHeader("Nóminas", "Documentos protegidos", onBack)
        LoadScreen(st, { vm.items.refresh() }) { list ->
            ListScreenColumn {
                if (list.isEmpty()) item { EmptyState(Icons.Filled.Receipt, "Sin nóminas disponibles") }
                staggeredItems(list.sortedWith(compareByDescending<Payroll> { it.year }.thenByDescending { it.month }), { it.id }) { _, p ->
                    GlassCard(Modifier.fillMaxWidth(), onClick = { vm.open(p) }) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text("${p.month} ${p.year}", style = MaterialTheme.typography.titleMedium)
                                Text(money(p.amount), color = Primary400, fontWeight = FontWeight.Bold)
                            }
                            if (busy == p.id) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
                            else { StatusChip(statusLabel(p.status), statusTone(p.status)); Spacer(Modifier.width(8.dp)); Icon(Icons.Filled.PictureAsPdf, null, tint = Slate400) }
                        }
                    }
                }
            }
        }
    }
}

// ───────── Profile ─────────

@Composable
fun ProfileScreen(
    user: User, vm: SessionViewModel, onNotifications: () -> Unit, onPayroll: () -> Unit, onFichajes: () -> Unit,
    onTeam: () -> Unit, onAdmin: () -> Unit, onEnableBiometric: (Boolean) -> Unit,
) {
    SecureScreen()
    val bio by vm.biometricEnabled.collectAsState(false)
    var edit by remember { mutableStateOf(false) }
    var pwd by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).statusBarsPadding().padding(16.dp).padding(bottom = 110.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        GlassCard(Modifier.fillMaxWidth().staggered(0), accent = Primary400) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Avatar(user.name, 64)
                Spacer(Modifier.width(14.dp))
                Column {
                    Text(user.name, style = MaterialTheme.typography.titleLarge)
                    Text(user.position.ifBlank { user.role }, color = Slate400)
                    Text(user.email, color = Slate500, style = MaterialTheme.typography.bodyMedium)
                }
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatusChip(user.department.ifBlank { "Sin depto." }, Tone.Info)
                StatusChip(when (user.role) { "ADMIN" -> "Administrador"; "MANAGER" -> "Responsable"; else -> "Empleado" }, Tone.Neutral)
            }
        }
        Box(Modifier.staggered(1)) { GlassCard(Modifier.fillMaxWidth()) {
            InfoRow(Icons.Filled.Phone, "Teléfono", user.phone)
            InfoRow(Icons.Filled.Home, "Dirección", user.address)
            InfoRow(Icons.Filled.ContactEmergency, "Contacto de emergencia", user.emergencyContact)
            TextButton({ edit = true }) { Icon(Icons.Filled.Edit, null); Spacer(Modifier.width(6.dp)); Text("Editar datos") }
        } }
        Box(Modifier.staggered(2)) { GlassCard(Modifier.fillMaxWidth()) {
            NavRow(Icons.Filled.Notifications, "Notificaciones", onNotifications)
            NavRow(Icons.Filled.History, "Mis fichajes", onFichajes)
            NavRow(Icons.Filled.Receipt, "Nóminas", onPayroll)
            if (user.isManager) NavRow(Icons.Filled.Groups, "Gestión de equipo", onTeam)
            if (user.isAdmin) NavRow(Icons.Filled.AdminPanelSettings, "Administración", onAdmin)
        } }
        Box(Modifier.staggered(3)) { GlassCard(Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Fingerprint, null, tint = Primary400); Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) { Text("Desbloqueo biométrico"); Text("Pide huella/PIN al abrir la app", color = Slate400, style = MaterialTheme.typography.bodyMedium) }
                Switch(bio, { onEnableBiometric(it) })
            }
            NavRow(Icons.Filled.Password, "Cambiar contraseña", { pwd = true })
            NavRow(Icons.Filled.Logout, "Cerrar sesión", { vm.signOut() }, Danger)
        } }
    }
    if (edit) {
        var phone by remember { mutableStateOf(user.phone.orEmpty()) }
        var addr by remember { mutableStateOf(user.address.orEmpty()) }
        var emer by remember { mutableStateOf(user.emergencyContact.orEmpty()) }
        AlertDialog({ edit = false }, containerColor = MaterialTheme.colorScheme.surfaceContainerHigh, title = { Text("Editar perfil") },
            text = { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                XField(phone, { phone = it }, "Teléfono", keyboard = androidx.compose.ui.text.input.KeyboardType.Phone)
                XField(addr, { addr = it }, "Dirección"); XField(emer, { emer = it }, "Contacto de emergencia")
            } },
            confirmButton = { TextButton({ vm.updateProfile(UpdateProfileRequest(phone, addr, emer)); edit = false }) { Text("Guardar") } },
            dismissButton = { TextButton({ edit = false }) { Text("Cancelar") } })
    }
    if (pwd) {
        var cur by remember { mutableStateOf("") }; var new by remember { mutableStateOf("") }
        AlertDialog({ pwd = false }, containerColor = MaterialTheme.colorScheme.surfaceContainerHigh, title = { Text("Cambiar contraseña") },
            text = { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                XField(cur, { cur = it }, "Contraseña actual", password = true); XField(new, { new = it }, "Nueva contraseña (12+)", password = true)
            } },
            confirmButton = { TextButton(enabled = cur.isNotBlank() && new.length >= 12, onClick = { vm.changePassword(cur, new); pwd = false }) { Text("Cambiar") } },
            dismissButton = { TextButton({ pwd = false }) { Text("Cancelar") } })
    }
}

@Composable
private fun InfoRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String?) {
    Row(Modifier.padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = Slate400, modifier = Modifier.size(20.dp)); Spacer(Modifier.width(12.dp))
        Column { Text(label, color = Slate500, style = MaterialTheme.typography.labelSmall); Text(value?.ifBlank { null } ?: "—") }
    }
}

@Composable
fun NavRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit, tint: androidx.compose.ui.graphics.Color = Primary400) {
    Row(Modifier.fillMaxWidth().clip(MaterialTheme.shapes.small).clickable(onClick = onClick).padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = tint); Spacer(Modifier.width(14.dp)); Text(label, Modifier.weight(1f))
        Icon(Icons.Filled.ChevronRight, null, tint = Slate500)
    }
}
