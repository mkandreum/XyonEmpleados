package com.xyon.empleados.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.xyon.empleados.data.*
import com.xyon.empleados.ui.theme.*

@Composable
private fun TabsRow(labels: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    ScrollableTabRow(selected, containerColor = Color.Transparent, edgePadding = 12.dp, divider = {}) {
        labels.forEachIndexed { i, l -> Tab(selected == i, { onSelect(i) }, text = { Text(l) }) }
    }
}

// ───────── Manager ─────────

@Composable
fun ManagerScreen(onBack: () -> Unit, vm: ManagerViewModel = hiltViewModel(), snack: (String) -> Unit) {
    var tab by remember { mutableIntStateOf(0) }
    val vac by vm.vacations.state.collectAsState()
    val adj by vm.adjustments.state.collectAsState()
    val mem by vm.members.state.collectAsState()
    var rejectAdj by remember { mutableStateOf<FichajeAdjustment?>(null) }
    LaunchedEffect(Unit) { vm.msg.collect { snack(it) } }
    Column(Modifier.fillMaxSize()) {
        ScreenHeader("Mi equipo", null, onBack)
        TabsRow(listOf("Solicitudes", "Ajustes", "Miembros"), tab) { tab = it }
        when (tab) {
            0 -> LoadScreen(vac, { vm.vacations.refresh() }) { all ->
                ListScreenColumn {
                    val list = all.sortedBy { it.status != "PENDING_MANAGER" }
                    if (list.isEmpty()) item { EmptyState(Icons.Filled.Inbox, "Sin solicitudes del equipo") }
                    staggeredItems(list, { it.id }) { _, v ->
                        VacationRow(v) {
                            if (v.status == "PENDING_MANAGER") Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button({ vm.approve(v.id) }, colors = ButtonDefaults.buttonColors(containerColor = Success)) { Text("Aprobar") }
                                OutlinedButton({ vm.reject(v.id) }) { Text("Rechazar", color = Danger) }
                            }
                        }
                    }
                }
            }
            1 -> LoadScreen(adj, { vm.adjustments.refresh() }) { all ->
                ListScreenColumn {
                    if (all.isEmpty()) item { EmptyState(Icons.Filled.Inbox, "Sin ajustes pendientes") }
                    staggeredItems(all, { it.id }) { _, a ->
                        GlassCard(Modifier.fillMaxWidth()) {
                            Text(a.user?.name ?: "Empleado", style = MaterialTheme.typography.titleMedium)
                            Text("${fmtDate(a.originalTimestamp)}: ${fmtTimeOf(a.originalTimestamp)} → ${fmtTimeOf(a.requestedTimestamp)}", color = Primary400)
                            Text(a.reason, color = Slate400)
                            Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button({ vm.approveAdj(a.id) }, colors = ButtonDefaults.buttonColors(containerColor = Success)) { Text("Aprobar") }
                                OutlinedButton({ rejectAdj = a }) { Text("Rechazar", color = Danger) }
                            }
                        }
                    }
                }
            }
            else -> LoadScreen(mem, { vm.members.refresh() }) { all ->
                ListScreenColumn {
                    staggeredItems(all, { it.id }) { _, u ->
                        GlassCard(Modifier.fillMaxWidth()) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Avatar(u.name); Spacer(Modifier.width(12.dp))
                                Column { Text(u.name, style = MaterialTheme.typography.titleMedium); Text(u.position.ifBlank { u.email }, color = Slate400) }
                            }
                        }
                    }
                }
            }
        }
    }
    rejectAdj?.let { a ->
        var reason by remember { mutableStateOf("") }
        AlertDialog({ rejectAdj = null }, containerColor = MaterialTheme.colorScheme.surfaceContainerHigh, title = { Text("Motivo del rechazo") },
            text = { XField(reason, { reason = it }, "Motivo", singleLine = false, minLines = 2) },
            confirmButton = { TextButton(enabled = reason.length >= 3, onClick = { vm.rejectAdj(a.id, reason.trim()); rejectAdj = null }) { Text("Rechazar") } },
            dismissButton = { TextButton({ rejectAdj = null }) { Text("Cancelar") } })
    }
}

// ───────── Admin ─────────

@Composable
fun AdminScreen(onBack: () -> Unit, vm: AdminViewModel = hiltViewModel(), snack: (String) -> Unit) {
    SecureScreen()
    var tab by remember { mutableIntStateOf(0) }
    val stats by vm.stats.state.collectAsState()
    val users by vm.users.state.collectAsState()
    val vac by vm.vacations.state.collectAsState()
    val inv by vm.invites.state.collectAsState()
    val news by vm.news.state.collectAsState()
    val pay by vm.payrolls.state.collectAsState()
    var confirmDelete by remember { mutableStateOf<Pair<String, () -> Unit>?>(null) }
    var newsForm by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { vm.msg.collect { snack(it) } }

    Column(Modifier.fillMaxSize()) {
        ScreenHeader("Administración", null, onBack)
        TabsRow(listOf("Resumen", "Usuarios", "Solicitudes", "Invitaciones", "Noticias", "Nóminas"), tab) { tab = it }
        when (tab) {
            0 -> LoadScreen(stats, { vm.refreshAll() }) { s ->
                ListScreenColumn {
                    item {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            StatPill("Usuarios", "${s.totalUsers}", Icons.Filled.People, Primary400, Modifier.weight(1f))
                            StatPill("Activos", "${s.activeUsers}", Icons.Filled.Bolt, Success, Modifier.weight(1f))
                        }
                    }
                    item {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            StatPill("Pendientes", "${s.pendingVacations}", Icons.Filled.HourglassTop, Warning, Modifier.weight(1f))
                            StatPill("Nóminas mes", money(s.totalPayrollAmount), Icons.Filled.Payments, Violet, Modifier.weight(1f))
                        }
                    }
                }
            }
            1 -> LoadScreen(users, { vm.users.refresh() }) { all ->
                ListScreenColumn {
                    staggeredItems(all, { it.id }) { _, u ->
                        GlassCard(Modifier.fillMaxWidth()) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Avatar(u.name); Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(u.name, style = MaterialTheme.typography.titleMedium)
                                    Text("${u.email} · ${u.department}", color = Slate400, style = MaterialTheme.typography.bodyMedium)
                                    StatusChip(u.role, if (u.role == "ADMIN") Tone.Danger else if (u.role == "MANAGER") Tone.Warning else Tone.Neutral)
                                }
                                IconButton({ confirmDelete = "¿Eliminar a ${u.name}?" to { vm.deleteUser(u.id) } }) { Icon(Icons.Filled.Delete, "Eliminar", tint = Danger) }
                            }
                        }
                    }
                }
            }
            2 -> LoadScreen(vac, { vm.vacations.refresh() }) { all ->
                ListScreenColumn {
                    staggeredItems(all.sortedBy { it.status != "PENDING_ADMIN" }, { it.id }) { _, v ->
                        VacationRow(v) {
                            if (v.status.startsWith("PENDING")) Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button({ vm.setVacation(v.id, "APPROVED") }, colors = ButtonDefaults.buttonColors(containerColor = Success)) { Text("Aprobar") }
                                OutlinedButton({ vm.setVacation(v.id, "REJECTED") }) { Text("Rechazar", color = Danger) }
                            }
                        }
                    }
                }
            }
            3 -> LoadScreen(inv, { vm.invites.refresh() }) { all ->
                ListScreenColumn {
                    item { GradientButton("Generar código de invitación", { vm.newInvite() }, Modifier.fillMaxWidth()) }
                    staggeredItems(all, { it.id }) { _, c ->
                        GlassCard(Modifier.fillMaxWidth()) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) { Text(c.code, style = MaterialTheme.typography.titleMedium); Text(fmtDate(c.createdAt), color = Slate500) }
                                StatusChip(if (c.isUsed) "Usado" else "Disponible", if (c.isUsed) Tone.Neutral else Tone.Success)
                                if (!c.isUsed) IconButton({ vm.deleteInvite(c.id) }) { Icon(Icons.Filled.Close, "Revocar") }
                            }
                        }
                    }
                }
            }
            4 -> LoadScreen(news, { vm.news.refresh() }) { all ->
                ListScreenColumn {
                    item { GradientButton("Publicar noticia", { newsForm = true }, Modifier.fillMaxWidth()) }
                    staggeredItems(all, { it.id }) { _, n ->
                        GlassCard(Modifier.fillMaxWidth()) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) { Text(n.title, style = MaterialTheme.typography.titleMedium); Text(fmtDate(n.date), color = Slate500) }
                                IconButton({ confirmDelete = "¿Eliminar la noticia?" to { vm.deleteNews(n.id) } }) { Icon(Icons.Filled.Delete, "Eliminar", tint = Danger) }
                            }
                        }
                    }
                }
            }
            else -> LoadScreen(pay, { vm.payrolls.refresh() }) { all ->
                ListScreenColumn {
                    staggeredItems(all, { it.id }) { _, p ->
                        GlassCard(Modifier.fillMaxWidth()) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text("${p.user?.name ?: "—"} · ${p.month} ${p.year}", style = MaterialTheme.typography.titleMedium)
                                    Text(money(p.amount), color = Primary400)
                                }
                                IconButton({ confirmDelete = "¿Eliminar la nómina?" to { vm.deletePayroll(p.id) } }) { Icon(Icons.Filled.Delete, "Eliminar", tint = Danger) }
                            }
                        }
                    }
                }
            }
        }
    }
    confirmDelete?.let { (msg, action) ->
        AlertDialog({ confirmDelete = null }, containerColor = MaterialTheme.colorScheme.surfaceContainerHigh, title = { Text("Confirmar") }, text = { Text(msg) },
            confirmButton = { TextButton({ action(); confirmDelete = null }) { Text("Eliminar", color = Danger) } },
            dismissButton = { TextButton({ confirmDelete = null }) { Text("Cancelar") } })
    }
    if (newsForm) {
        var title by remember { mutableStateOf("") }; var summary by remember { mutableStateOf("") }
        var content by remember { mutableStateOf("") }; var cat by remember { mutableStateOf("CORPORATE") }
        AlertDialog({ newsForm = false }, containerColor = MaterialTheme.colorScheme.surfaceContainerHigh, title = { Text("Nueva noticia") },
            text = {
                Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    XField(title, { title = it }, "Título"); XField(summary, { summary = it }, "Resumen")
                    XField(content, { content = it }, "Contenido", singleLine = false, minLines = 3)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("CORPORATE", "EVENT", "URGENT").forEach { c -> FilterChip(cat == c, { cat = c }, { Text(c.take(4), maxLines = 1) }) }
                    }
                }
            },
            confirmButton = { TextButton(enabled = title.isNotBlank() && content.isNotBlank(), onClick = { vm.createNews(CreateNewsRequest(title.trim(), summary.trim(), content.trim(), cat)); newsForm = false }) { Text("Publicar") } },
            dismissButton = { TextButton({ newsForm = false }) { Text("Cancelar") } })
    }
}
