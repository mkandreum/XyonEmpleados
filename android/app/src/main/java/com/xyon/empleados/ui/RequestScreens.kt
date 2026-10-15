package com.xyon.empleados.ui

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.xyon.empleados.data.*
import com.xyon.empleados.ui.theme.*
import java.time.*

private val ABSENCE_TYPES = listOf("PERSONAL", "SICK_LEAVE", "MEDICAL_LEAVE", "OVERTIME", "OTHER")

private fun readFile(ctx: Context, uri: Uri): Pair<ByteArray, String>? = runCatching {
    val mime = ctx.contentResolver.getType(uri) ?: "application/octet-stream"
    val bytes = ctx.contentResolver.openInputStream(uri)!!.use { it.readBytes() }
    require(bytes.size <= 8 * 1024 * 1024) { "too big" }
    bytes to mime
}.getOrNull()

/** Vacations and absences (same data, two views like the web app). */
@Composable
fun RequestsScreen(vm: VacationsViewModel = hiltViewModel(), snack: (String) -> Unit) {
    val st by vm.items.state.collectAsState()
    val bal by vm.balance.state.collectAsState()
    val busy by vm.busy.collectAsState()
    var tab by remember { mutableIntStateOf(0) }
    var showForm by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { vm.msg.collect { snack(it) } }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            ScreenHeader("Solicitudes", "Vacaciones y ausencias")
            SingleChoiceSegmentedButtonRow(Modifier.padding(horizontal = 16.dp).fillMaxWidth()) {
                listOf("Vacaciones", "Ausencias").forEachIndexed { i, l ->
                    SegmentedButton(tab == i, { tab = i }, SegmentedButtonDefaults.itemShape(i, 2)) { Text(l) }
                }
            }
            Spacer(Modifier.height(8.dp))
            LoadScreen(st, { vm.items.refresh(); vm.balance.refresh() }) { all ->
                val list = all.filter { if (tab == 0) it.type == "VACATION" else it.type != "VACATION" }.sortedByDescending { it.startDate }
                ListScreenColumn {
                    bal.data?.let { b ->
                        item {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                if (tab == 0) StatPill("Días usados", "%.0f".format(b.vacationDaysUsed), Icons.Filled.BeachAccess, Success, Modifier.weight(1f))
                                else {
                                    StatPill("Horas baja", "%.0f".format(b.sickLeaveHoursUsed), Icons.Filled.LocalHospital, Danger, Modifier.weight(1f))
                                    StatPill("Horas extra", "%.0f".format(b.overtimeHoursUsed), Icons.Filled.MoreTime, Primary400, Modifier.weight(1f))
                                    StatPill("Permisos", "%.0f".format(b.paidAbsenceHoursUsed), Icons.Filled.EventAvailable, Warning, Modifier.weight(1f))
                                }
                            }
                        }
                    }
                    if (list.isEmpty()) item { EmptyState(Icons.Filled.EventBusy, "Aún no hay solicitudes") }
                    staggeredItems(list, { it.id }) { _, v -> VacationRow(v) }
                }
            }
        }
        ExtendedFloatingActionButton(
            onClick = { showForm = true }, modifier = Modifier.align(Alignment.BottomEnd).padding(end = 16.dp, bottom = 108.dp),
            containerColor = Primary600, contentColor = Color.White,
            icon = { Icon(Icons.Filled.Add, null) }, text = { Text("Nueva") },
        )
    }

    if (showForm) NewRequestSheet(tab == 1, busy, { showForm = false }) { req, file -> vm.create(req, file) { showForm = false } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NewRequestSheet(absence: Boolean, busy: Boolean, onDismiss: () -> Unit, onSubmit: (CreateVacationRequest, Pair<ByteArray, String>?) -> Unit) {
    val ctx = LocalContext.current
    var type by remember { mutableStateOf(if (absence) "PERSONAL" else "VACATION") }
    var subtype by remember { mutableStateOf("") }
    var hours by remember { mutableStateOf("") }
    var file by remember { mutableStateOf<Pair<ByteArray, String>?>(null) }
    val picker = rememberDateRangePickerState()
    val picked = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri -> uri?.let { file = readFile(ctx, it) } }
    val start = picker.selectedStartDateMillis; val end = picker.selectedEndDateMillis ?: start
    fun d(ms: Long) = Instant.ofEpochMilli(ms).atZone(ZoneOffset.UTC).toLocalDate()
    val days = if (start != null && end != null) (java.time.temporal.ChronoUnit.DAYS.between(d(start), d(end)) + 1).toInt() else 0

    ModalBottomSheet(onDismiss, containerColor = MaterialTheme.colorScheme.surfaceContainerHigh) {
        Column(Modifier.padding(horizontal = 20.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(if (absence) "Nueva ausencia" else "Nuevas vacaciones", style = MaterialTheme.typography.titleLarge)
            if (absence) {
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ABSENCE_TYPES.forEach { t -> FilterChip(type == t, { type = t }, { Text(typeLabel(t)) }) }
                }
                XField(subtype, { subtype = it }, "Detalle (opcional)")
                XField(hours, { hours = it.filter(Char::isDigit) }, "Horas (opcional)", keyboard = androidx.compose.ui.text.input.KeyboardType.Number)
                OutlinedButton({ picked.launch("*/*") }) {
                    Icon(Icons.Filled.AttachFile, null); Spacer(Modifier.width(6.dp))
                    Text(if (file != null) "Justificante adjunto" else "Adjuntar justificante")
                }
            }
            DateRangePicker(picker, Modifier.height(430.dp), title = null, headline = null, showModeToggle = false,
                colors = DatePickerDefaults.colors(containerColor = Color.Transparent))
            GradientButton(if (days > 0) "Enviar ($days día${if (days > 1) "s" else ""})" else "Selecciona fechas", {
                onSubmit(CreateVacationRequest(d(start!!).toString(), d(end!!).toString(), days, hours.toIntOrNull(), type, subtype.ifBlank { null }), file)
            }, Modifier.fillMaxWidth(), enabled = days in 1..365, loading = busy)
            Spacer(Modifier.height(24.dp))
        }
    }
}

// ───────── Calendar (personal / team) ─────────

@Composable
fun CalendarScreen(user: User, vm: CalendarViewModel = hiltViewModel()) {
    val events by vm.events.state.collectAsState()
    val mine by vm.mine.state.collectAsState()
    val team by vm.team.state.collectAsState()
    var month by remember { mutableStateOf(YearMonth.now()) }
    var selected by remember { mutableStateOf(LocalDate.now()) }
    var showTeam by remember { mutableStateOf(false) }

    val myVac = mine.data.orEmpty().filter { it.status == "APPROVED" }
    val teamVac = if (showTeam) team.data.orEmpty().filter { it.status == "APPROVED" } else emptyList()
    val evs = events.data.orEmpty()

    fun vacOn(day: LocalDate, list: List<VacationRequest>) = list.filter {
        val s = parseDate(it.startDate); val e = parseDate(it.endDate)
        s != null && e != null && !day.isBefore(s) && !day.isAfter(e)
    }
    fun evOn(day: LocalDate) = evs.filter { parseDate(it.date) == day }

    Column(Modifier.fillMaxSize()) {
        ScreenHeader(if (showTeam) "Calendario del equipo" else "Calendario", null) {
            if (user.isManager) FilterChip(showTeam, { showTeam = !showTeam }, { Text("Equipo") }, leadingIcon = { Icon(Icons.Filled.Groups, null, Modifier.size(18.dp)) })
        }
        LoadScreen(events, { vm.refresh() }) {
            Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 120.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                GlassCard(Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton({ month = month.minusMonths(1) }) { Icon(Icons.Filled.ChevronLeft, "Anterior") }
                        Text("${monthName(month.monthValue)} ${month.year}", Modifier.weight(1f), textAlign = TextAlign.Center, style = MaterialTheme.typography.titleLarge)
                        IconButton({ month = month.plusMonths(1) }) { Icon(Icons.Filled.ChevronRight, "Siguiente") }
                    }
                    Row(Modifier.fillMaxWidth()) {
                        listOf("L", "M", "X", "J", "V", "S", "D").forEach { Text(it, Modifier.weight(1f), textAlign = TextAlign.Center, color = Slate500, style = MaterialTheme.typography.labelSmall) }
                    }
                    val lead = month.atDay(1).dayOfWeek.value - 1
                    val cells = List(lead) { null } + (1..month.lengthOfMonth()).map { month.atDay(it) }
                    cells.chunked(7).forEach { week ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
                            for (i in 0 until 7) {
                                val day = week.getOrNull(i)
                                Box(Modifier.weight(1f).aspectRatio(1f), contentAlignment = Alignment.Center) {
                                    if (day != null) {
                                        val isSel = day == selected
                                        val bg by animateColorAsState(if (isSel) Primary600 else if (day == LocalDate.now()) GlassFillStrong else Color.Transparent, spring(Spring.DampingRatioMediumBouncy), label = "d")
                                        Column(Modifier.fillMaxSize().padding(2.dp).clip(CircleShape).background(bg).clickable { selected = day }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                                            Text("${day.dayOfMonth}", fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal)
                                            Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                                if (vacOn(day, myVac).isNotEmpty()) Dot(Success)
                                                if (vacOn(day, teamVac).isNotEmpty()) Dot(Violet)
                                                if (evOn(day).isNotEmpty()) Dot(Warning)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(top = 8.dp)) {
                        Legend(Success, "Mis ausencias"); if (showTeam) Legend(Violet, "Equipo"); Legend(Warning, "Eventos")
                    }
                }
                Text(fmtDate(selected.toString()), style = MaterialTheme.typography.titleLarge)
                val dayEvents = evOn(selected); val dayMine = vacOn(selected, myVac); val dayTeam = vacOn(selected, teamVac)
                if (dayEvents.isEmpty() && dayMine.isEmpty() && dayTeam.isEmpty()) EmptyState(Icons.Filled.EventAvailable, "Nada programado")
                dayEvents.forEach { e ->
                    GlassCard(Modifier.fillMaxWidth(), accent = Warning) {
                        Text(e.title, style = MaterialTheme.typography.titleMedium)
                        e.location?.let { Text(it, color = Slate400) }; e.description?.let { Text(it, color = Slate400) }
                    }
                }
                dayMine.forEach { VacationRow(it) }
                dayTeam.forEach { VacationRow(it) }
            }
        }
    }
}

@Composable private fun Dot(c: Color) = Box(Modifier.size(5.dp).clip(CircleShape).background(c))
@Composable private fun Legend(c: Color, t: String) = Row(verticalAlignment = Alignment.CenterVertically) {
    Dot(c); Spacer(Modifier.width(4.dp)); Text(t, color = Slate400, style = MaterialTheme.typography.labelSmall)
}
