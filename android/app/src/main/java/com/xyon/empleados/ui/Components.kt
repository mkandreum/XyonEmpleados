package com.xyon.empleados.ui

import android.app.Activity
import android.view.WindowManager
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyon.empleados.data.LoadState
import com.xyon.empleados.ui.theme.*
import kotlinx.coroutines.delay

/** Marks the window FLAG_SECURE while this composable is on screen (blocks screenshots / recents preview). */
@Composable
fun SecureScreen() {
    val ctx = LocalContext.current
    DisposableEffect(Unit) {
        val w = (ctx as? Activity)?.window
        w?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        onDispose { w?.clearFlags(WindowManager.LayoutParams.FLAG_SECURE) }
    }
}

/** Slow-drifting aurora blobs behind everything. */
@Composable
fun AuroraBackground(modifier: Modifier = Modifier, content: @Composable BoxScope.() -> Unit) {
    val t = rememberInfiniteTransition(label = "aurora")
    val p by t.animateFloat(0f, 1f, infiniteRepeatable(tween(18000, easing = LinearEasing), RepeatMode.Reverse), label = "p")
    Box(modifier.fillMaxSize().background(Ink950)) {
        Canvas(Modifier.fillMaxSize()) {
            val w = size.width; val h = size.height
            drawCircle(Brush.radialGradient(listOf(Primary600.copy(alpha = .45f), Color.Transparent), Offset(w * (.15f + .25f * p), h * .12f), w * .85f), w * .85f, Offset(w * (.15f + .25f * p), h * .12f))
            drawCircle(Brush.radialGradient(listOf(Violet.copy(alpha = .32f), Color.Transparent), Offset(w * (.9f - .3f * p), h * .55f), w * .8f), w * .8f, Offset(w * (.9f - .3f * p), h * .55f))
            drawCircle(Brush.radialGradient(listOf(Cyan.copy(alpha = .16f), Color.Transparent), Offset(w * .2f, h * (.95f - .2f * p)), w * .7f), w * .7f, Offset(w * .2f, h * (.95f - .2f * p)))
        }
        content()
    }
}

/** Glassmorphism card: translucent fill + gradient hairline border. */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    accent: Color? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val shape = RoundedCornerShape(24.dp)
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val s by animateFloatAsState(if (pressed) .97f else 1f, spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessMedium), label = "press")
    val border = Brush.linearGradient(listOf(Color(0x40FFFFFF), accent?.copy(alpha = .35f) ?: Color(0x10FFFFFF)))
    Column(
        modifier.scale(s).clip(shape)
            .background(Brush.verticalGradient(listOf(Color(0x1FFFFFFF), Color(0x0AFFFFFF))))
            .let { if (onClick != null) it.clickable(interaction, null, onClick = onClick) else it }
            .border(BorderStroke(1.dp, border), shape)
            .padding(16.dp),
        content = content,
    )
}

/** Staggered spring entrance for list/grid children. */
@Composable
fun Modifier.staggered(index: Int, stepMs: Int = 55): Modifier {
    val a = remember { Animatable(0f) }
    LaunchedEffect(Unit) { delay((index.coerceAtMost(12) * stepMs).toLong()); a.animateTo(1f, spring(Spring.DampingRatioLowBouncy, Spring.StiffnessLow)) }
    return this.graphicsLayer { alpha = a.value.coerceIn(0f, 1f); translationY = (1f - a.value) * 48.dp.toPx(); scaleX = .96f + .04f * a.value; scaleY = .96f + .04f * a.value }
}

enum class Tone(val color: Color) { Success(com.xyon.empleados.ui.theme.Success), Warning(com.xyon.empleados.ui.theme.Warning), Danger(com.xyon.empleados.ui.theme.Danger), Info(Primary400), Neutral(Slate400) }

@Composable
fun StatusChip(text: String, tone: Tone, modifier: Modifier = Modifier) {
    Text(
        text, modifier.clip(CircleShape).background(tone.color.copy(alpha = .16f)).padding(horizontal = 10.dp, vertical = 4.dp),
        color = tone.color, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold,
    )
}

fun statusTone(status: String) = when (status) {
    "APPROVED", "PAID" -> Tone.Success
    "REJECTED" -> Tone.Danger
    "PENDING", "PENDING_MANAGER", "PENDING_ADMIN" -> Tone.Warning
    else -> Tone.Neutral
}

fun statusLabel(status: String) = when (status) {
    "APPROVED" -> "Aprobada"; "REJECTED" -> "Rechazada"; "PENDING" -> "Pendiente"
    "PENDING_MANAGER" -> "Pdte. responsable"; "PENDING_ADMIN" -> "Pdte. admin"; "PAID" -> "Pagada"
    else -> status
}

fun typeLabel(type: String) = when (type) {
    "VACATION" -> "Vacaciones"; "PERSONAL" -> "Asunto propio"; "SICK_LEAVE" -> "Baja"
    "MEDICAL_LEAVE" -> "Visita médica"; "OVERTIME" -> "Horas extra"; else -> "Otro"
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier, action: (@Composable () -> Unit)? = null) {
    Row(modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(text, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
        action?.invoke()
    }
}

@Composable
fun GradientButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, loading: Boolean = false, brush: Brush = BrandGradient) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val s by animateFloatAsState(if (pressed) .95f else 1f, spring(Spring.DampingRatioMediumBouncy), label = "btn")
    val haptic = LocalHapticFeedback.current
    Box(
        modifier.scale(s).height(54.dp).clip(RoundedCornerShape(18.dp))
            .background(if (enabled) brush else Brush.linearGradient(listOf(Color(0xFF334155), Color(0xFF334155))))
            .clickable(interaction, null, enabled = enabled && !loading) { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove); onClick() },
        contentAlignment = Alignment.Center,
    ) {
        AnimatedContentSwap(loading) { l ->
            if (l) CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.5.dp)
            else Text(text, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }
    }
}

@Composable
private fun AnimatedContentSwap(flag: Boolean, content: @Composable (Boolean) -> Unit) =
    androidx.compose.animation.AnimatedContent(flag, label = "swap") { content(it) }

@Composable
fun XField(
    value: String, onChange: (String) -> Unit, label: String, modifier: Modifier = Modifier,
    password: Boolean = false, keyboard: androidx.compose.ui.text.input.KeyboardType = androidx.compose.ui.text.input.KeyboardType.Text,
    singleLine: Boolean = true, minLines: Int = 1, leading: ImageVector? = null, error: String? = null,
) {
    var show by remember { mutableStateOf(false) }
    OutlinedTextField(
        value, onChange, modifier.fillMaxWidth(), label = { Text(label) }, singleLine = singleLine, minLines = minLines,
        leadingIcon = leading?.let { { Icon(it, null) } },
        trailingIcon = if (password) ({ IconButton({ show = !show }) { Icon(if (show) Icons.Filled.VisibilityOff else Icons.Filled.Visibility, "mostrar") } }) else null,
        visualTransformation = if (password && !show) androidx.compose.ui.text.input.PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = if (password) androidx.compose.ui.text.input.KeyboardType.Password else keyboard),
        isError = error != null, supportingText = error?.let { { Text(it) } },
        shape = RoundedCornerShape(16.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = GlassFill, unfocusedContainerColor = GlassFill,
            focusedBorderColor = Primary400, unfocusedBorderColor = GlassStroke,
        ),
    )
}

/** Shimmering placeholder block. */
@Composable
fun Skeleton(modifier: Modifier = Modifier) {
    val t = rememberInfiniteTransition(label = "sk")
    val x by t.animateFloat(-1f, 2f, infiniteRepeatable(tween(1200, easing = LinearEasing)), label = "x")
    Box(modifier.clip(RoundedCornerShape(20.dp)).background(Brush.horizontalGradient(listOf(Color(0x0FFFFFFF), Color(0x26FFFFFF), Color(0x0FFFFFFF)), startX = x * 600f, endX = x * 600f + 600f)))
}

/**
 * Standard screen body: pull-to-refresh, skeleton while loading, error+retry, offline banner.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun <T> LoadScreen(
    state: LoadState<T>, onRefresh: () -> Unit, modifier: Modifier = Modifier,
    content: @Composable (T) -> Unit,
) {
    PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = onRefresh, modifier = modifier.fillMaxSize()) {
        when {
            state.data != null -> Column(Modifier.fillMaxSize()) {
                androidx.compose.animation.AnimatedVisibility(state.offline) {
                    Row(Modifier.fillMaxWidth().background(Warning.copy(alpha = .18f)).padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.CloudOff, null, tint = Warning, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp)); Text("Sin conexión · datos guardados", color = Warning, style = MaterialTheme.typography.labelLarge)
                    }
                }
                content(state.data)
            }
            state.loading -> Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                repeat(4) { Skeleton(Modifier.fillMaxWidth().height(if (it == 0) 140.dp else 84.dp)) }
            }
            else -> Column(Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Icon(Icons.Filled.ErrorOutline, null, tint = Danger, modifier = Modifier.size(48.dp))
                Spacer(Modifier.height(12.dp))
                Text(state.error ?: "Error", textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(16.dp))
                GradientButton("Reintentar", onRefresh, Modifier.width(180.dp))
            }
        }
    }
}

@Composable
fun EmptyState(icon: ImageVector, text: String, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth().padding(vertical = 40.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, null, tint = Slate500, modifier = Modifier.size(44.dp))
        Spacer(Modifier.height(8.dp)); Text(text, color = Slate400, textAlign = TextAlign.Center)
    }
}

@Composable
fun ScreenHeader(title: String, subtitle: String? = null, onBack: (() -> Unit)? = null, actions: @Composable RowScope.() -> Unit = {}) {
    Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        if (onBack != null) IconButton(onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Atrás") }
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.headlineMedium)
            subtitle?.let { Text(it, color = Slate400, style = MaterialTheme.typography.bodyMedium) }
        }
        actions()
    }
}

/** List helper: items with staggered entrance. */
fun <T> LazyListScope.staggeredItems(items: List<T>, key: ((T) -> Any)? = null, row: @Composable (Int, T) -> Unit) {
    items.forEachIndexed { i, it -> item(key = key?.invoke(it)) { Box(Modifier.staggered(i)) { row(i, it) } } }
}

@Composable
fun ListScreenColumn(modifier: Modifier = Modifier, content: LazyListScope.() -> Unit) {
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 120.dp), verticalArrangement = Arrangement.spacedBy(12.dp), content = content)
}

@Composable
fun Avatar(name: String, size: Int = 44) {
    Box(Modifier.size(size.dp).clip(CircleShape).background(BrandGradient), contentAlignment = Alignment.Center) {
        Text(name.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercase() }.joinToString(""), color = Color.White, fontWeight = FontWeight.Bold, fontSize = (size / 2.7).sp)
    }
}

@Composable
fun StatPill(label: String, value: String, icon: ImageVector, tint: Color, modifier: Modifier = Modifier) {
    GlassCard(modifier, accent = tint) {
        Icon(icon, null, tint = tint)
        Spacer(Modifier.height(8.dp))
        Text(value, style = MaterialTheme.typography.headlineMedium)
        Text(label, color = Slate400, style = MaterialTheme.typography.labelSmall)
    }
}
