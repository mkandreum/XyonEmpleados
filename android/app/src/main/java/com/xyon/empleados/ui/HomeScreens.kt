package com.xyon.empleados.ui

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.xyon.empleados.data.*
import com.xyon.empleados.ui.theme.*

@Composable
fun HomeScreen(
    user: User, onNotifications: () -> Unit, onFichajes: () -> Unit, onPayroll: () -> Unit,
    onNews: () -> Unit, onTeam: () -> Unit, onAdmin: () -> Unit, notifVm: NotificationsViewModel = hiltViewModel(),
    vm: DashboardViewModel = hiltViewModel(), snack: (String) -> Unit,
) {
    val ctx = LocalContext.current
    val status by vm.status.state.collectAsState()
    val vacations by vm.vacations.state.collectAsState()
    val balance by vm.balance.state.collectAsState()
    val news by vm.news.state.collectAsState()
    val week by vm.week.state.collectAsState()
    val notifs by notifVm.items.state.collectAsState()
    val busy by vm.busy.collectAsState()
    LaunchedEffect(Unit) { vm.events.collect { snack(it) } }

    var pendingToggle by remember { mutableStateOf<Boolean?>(null) }
    fun go(entering: Boolean) {
        val loc = lastLocation(ctx)
        vm.fichar(entering, loc?.latitude, loc?.longitude, loc?.accuracy)
    }
    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        pendingToggle?.let { e -> go(e); pendingToggle = null }
    }

    val unread = notifs.data?.notifications?.count { !it.read } ?: 0
    val clockedIn = status.data?.hasActiveEntry == true

    LoadScreen(
        status, onRefresh = { vm.refreshAll(); notifVm.items.refresh() },
    ) {
        ListScreenColumn {
            item {
                Row(Modifier.statusBarsPadding().padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(greeting(), color = Slate400)
                        Text(user.name.substringBefore(" "), style = MaterialTheme.typography.headlineLarge)
                    }
                    BadgedBox(badge = { if (unread > 0) Badge { Text("$unread") } }) {
                        IconButton(onNotifications) { Icon(Icons.Filled.Notifications, "Notificaciones") }
                    }
                    Spacer(Modifier.width(4.dp)); Avatar(user.name)
                }
            }
            item {
                GlassCard(Modifier.fillMaxWidth().staggered(0), accent = if (clockedIn) Success else Primary400) {
                    FichajeHero(
                        clockedIn = clockedIn, since = it.currentFichaje?.timestamp, busy = busy,
                        expected = it.turno?.label ?: it.turno?.expectedEntry?.let { e -> "Entrada prevista $e" },
                        successEvents = vm.justDone,
                    ) {
                        val entering = !clockedIn
                        if (!hasLocationPermission(ctx)) {
                            pendingToggle = entering
                            permLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
                        } else go(entering)
                    }
                }
            }
            item {
                val pending = vacations.data?.count { v -> v.status.startsWith("PENDING") } ?: 0
                val left = balance.data?.vacationDaysUsed
                val hoursWeek = week.data?.sumOf { d -> d.horasTrabajadas } ?: 0.0
                Row(Modifier.fillMaxWidth().staggered(1), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    StatPill("Esta semana", "%.1fh".format(hoursWeek), Icons.Filled.Schedule, Primary400, Modifier.weight(1f))
                    StatPill("Pendientes", "$pending", Icons.Filled.HourglassTop, Warning, Modifier.weight(1f))
                    StatPill("Días usados", left?.let { v -> "%.0f".format(v) } ?: "-", Icons.Filled.BeachAccess, Success, Modifier.weight(1f))
                }
            }
            item {
                Row(Modifier.fillMaxWidth().staggered(2), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    QuickTile("Mis fichajes", Icons.Filled.History, onFichajes, Modifier.weight(1f))
                    QuickTile("Nóminas", Icons.Filled.Receipt, onPayroll, Modifier.weight(1f))
                    if (user.isManager) QuickTile("Equipo", Icons.Filled.Groups, onTeam, Modifier.weight(1f))
                    if (user.isAdmin) QuickTile("Admin", Icons.Filled.AdminPanelSettings, onAdmin, Modifier.weight(1f))
                }
            }
            val latest = news.data.orEmpty().take(5)
            if (latest.isNotEmpty()) {
                item { SectionTitle("Novedades", action = { TextButton(onNews) { Text("Ver todo") } }) }
                item {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.staggered(3)) {
                        items(latest, key = { n -> n.id }) { n ->
                            GlassCard(Modifier.width(260.dp), onClick = onNews) {
                                StatusChip(n.category, if (n.category == "URGENT") Tone.Danger else Tone.Info)
                                Spacer(Modifier.height(8.dp))
                                Text(n.title, style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                Text(n.summary, color = Slate400, maxLines = 3, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
            }
            val upcoming = vacations.data.orEmpty().filter { v -> v.status == "APPROVED" }.sortedBy { v -> v.startDate }.take(3)
            if (upcoming.isNotEmpty()) {
                item { SectionTitle("Próximas ausencias") }
                staggeredItems(upcoming, { v -> v.id }) { i, v -> VacationRow(v, Modifier) }
            }
        }
    }
}

@Composable
private fun QuickTile(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit, modifier: Modifier) {
    GlassCard(modifier, onClick = onClick) {
        Icon(icon, null, tint = Primary400)
        Spacer(Modifier.height(6.dp))
        Text(label, style = MaterialTheme.typography.labelLarge, maxLines = 1)
    }
}

@Composable
fun VacationRow(v: VacationRequest, modifier: Modifier = Modifier, trailing: (@Composable () -> Unit)? = null) {
    GlassCard(modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(v.user?.name ?: typeLabel(v.type), style = MaterialTheme.typography.titleMedium)
                if (v.user != null) Text(typeLabel(v.type), color = Slate400, style = MaterialTheme.typography.bodyMedium)
                Text("${fmtDate(v.startDate)} → ${fmtDate(v.endDate)}", color = Slate400, style = MaterialTheme.typography.bodyMedium)
                Text("${v.days.toInt()} día(s)", color = Slate400, style = MaterialTheme.typography.labelSmall)
            }
            StatusChip(statusLabel(v.status), statusTone(v.status))
        }
        trailing?.invoke()
    }
}

// ───────── Fichajes history + adjustment request ─────────

@Composable
fun FichajesScreen(onBack: () -> Unit, vm: FichajesViewModel = hiltViewModel(), snack: (String) -> Unit) {
    val month by vm.month.state.collectAsState()
    val adj by vm.adjustments.state.collectAsState()
    var adjustFor by remember { mutableStateOf<Fichaje?>(null) }
    LaunchedEffect(Unit) { vm.msg.collect { snack(it) } }
    Column(Modifier.fillMaxSize()) {
        ScreenHeader("Mis fichajes", "Mes actual", onBack)
        LoadScreen(month, { vm.month.refresh(); vm.adjustments.refresh() }) { days ->
            ListScreenColumn {
                val list = days.filter { it.fichajes.isNotEmpty() }.sortedByDescending { it.date }
                if (list.isEmpty()) item { EmptyState(Icons.Filled.EventBusy, "Sin fichajes este mes") }
                staggeredItems(list, { it.date }) { _, d ->
                    GlassCard(Modifier.fillMaxWidth()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(fmtDate(d.date), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                            if (d.isLate) StatusChip("Retraso", Tone.Warning)
                            if (d.isEarlyDeparture) { Spacer(Modifier.width(4.dp)); StatusChip("Salida anticipada", Tone.Warning) }
                            Spacer(Modifier.width(8.dp)); Text("%.1fh".format(d.horasTrabajadas), fontWeight = FontWeight.Bold, color = Primary400)
                        }
                        d.fichajes.forEach { f ->
                            Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(if (f.tipo == "ENTRADA") Icons.Filled.Login else Icons.Filled.Logout, null, tint = if (f.tipo == "ENTRADA") Success else Warning, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("${f.tipo.lowercase().replaceFirstChar { it.uppercase() }}  ${fmtTimeOf(f.timestamp)}", Modifier.weight(1f))
                                TextButton({ adjustFor = f }) { Text("Ajustar") }
                            }
                        }
                    }
                }
                val reqs = adj.data.orEmpty()
                if (reqs.isNotEmpty()) {
                    item { SectionTitle("Mis solicitudes de ajuste") }
                    staggeredItems(reqs, { it.id }) { _, a ->
                        GlassCard(Modifier.fillMaxWidth()) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text("${fmtTimeOf(a.originalTimestamp)} → ${fmtTimeOf(a.requestedTimestamp)}", style = MaterialTheme.typography.titleMedium)
                                    Text(a.reason, color = Slate400, maxLines = 2)
                                    a.rejectionReason?.let { Text("Motivo: $it", color = Danger, style = MaterialTheme.typography.bodyMedium) }
                                }
                                StatusChip(statusLabel(a.status), statusTone(a.status))
                            }
                        }
                    }
                }
            }
        }
    }
    adjustFor?.let { f ->
        var time by remember { mutableStateOf(fmtTimeOf(f.timestamp)) }
        var reason by remember { mutableStateOf("") }
        val valid = Regex("^([01]\\d|2[0-3]):[0-5]\\d$").matches(time) && reason.length >= 5
        AlertDialog(
            onDismissRequest = { adjustFor = null }, containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
            title = { Text("Solicitar ajuste") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    XField(time, { time = it }, "Hora correcta (HH:mm)")
                    XField(reason, { reason = it }, "Motivo", singleLine = false, minLines = 2)
                }
            },
            confirmButton = {
                TextButton(enabled = valid, onClick = {
                    val date = parseDate(f.timestamp)!!
                    val ldt = java.time.LocalDateTime.of(date, java.time.LocalTime.parse(time))
                    val iso = ldt.atZone(java.time.ZoneId.systemDefault()).toInstant().toString()
                    vm.requestAdjustment(CreateAdjustmentRequest(f.id, iso, reason.trim())); adjustFor = null
                }) { Text("Enviar") }
            },
            dismissButton = { TextButton({ adjustFor = null }) { Text("Cancelar") } },
        )
    }
}

// ───────── Notifications ─────────

@Composable
fun NotificationsScreen(onBack: () -> Unit, vm: NotificationsViewModel = hiltViewModel()) {
    val st by vm.items.state.collectAsState()
    Column(Modifier.fillMaxSize()) {
        ScreenHeader("Notificaciones", null, onBack) {
            IconButton({ vm.readAll() }) { Icon(Icons.Filled.DoneAll, "Marcar todas") }
        }
        LoadScreen(st, { vm.items.refresh() }) { r ->
            ListScreenColumn {
                if (r.notifications.isEmpty()) item { EmptyState(Icons.Filled.NotificationsNone, "Estás al día") }
                staggeredItems(r.notifications, { it.id }) { _, n ->
                    GlassCard(Modifier.fillMaxWidth(), onClick = { if (!n.read) vm.read(n.id) }, accent = if (!n.read) Primary400 else null) {
                        Row(verticalAlignment = Alignment.Top) {
                            if (!n.read) Box(Modifier.padding(top = 6.dp, end = 10.dp).size(8.dp).clip(CircleShape).background(Primary400))
                            Column(Modifier.weight(1f)) {
                                Text(n.title, style = MaterialTheme.typography.titleMedium)
                                Text(n.message, color = Slate400)
                                Text(fmtDate(n.date ?: n.createdAt), color = Slate500, style = MaterialTheme.typography.labelSmall)
                            }
                            IconButton({ vm.delete(n.id) }) { Icon(Icons.Filled.Close, "Borrar", tint = Slate500) }
                        }
                    }
                }
            }
        }
    }
}
