package com.xyon.empleados.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xyon.empleados.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import java.time.Duration
import java.time.Instant

/**
 * Hero clock-in/out button: spring press, breathing rings while on the clock,
 * success burst, haptics, live elapsed timer.
 */
@Composable
fun FichajeHero(
    clockedIn: Boolean, since: String?, busy: Boolean, expected: String?,
    successEvents: Flow<Boolean>, onToggle: () -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val press by animateFloatAsState(if (pressed) .9f else 1f, spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessMedium), label = "press")
    val burst = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        successEvents.collect {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            burst.snapTo(0f); burst.animateTo(1f, tween(900, easing = FastOutSlowInEasing))
        }
    }
    val t = rememberInfiniteTransition(label = "breath")
    val breath by t.animateFloat(0f, 1f, infiniteRepeatable(tween(2200, easing = FastOutSlowInEasing), RepeatMode.Restart), label = "b")
    val ringColor by animateColorAsState(if (clockedIn) Success else Primary400, tween(500), label = "ring")
    val brush = if (clockedIn) DangerGradient else BrandGradient

    var elapsed by remember { mutableStateOf("") }
    LaunchedEffect(clockedIn, since) {
        while (clockedIn && since != null) {
            val d = runCatching { Duration.between(Instant.parse(since), Instant.now()) }.getOrNull()
            elapsed = d?.let { "%02d:%02d:%02d".format(it.toHours(), it.toMinutesPart(), it.toSecondsPart()) } ?: ""
            delay(1000)
        }
    }

    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(260.dp), contentAlignment = Alignment.Center) {
            Canvas(Modifier.fillMaxSize()) {
                val c = Offset(size.width / 2, size.height / 2)
                val base = size.minDimension * .34f
                repeat(2) { i ->
                    val ph = (breath + i * .5f) % 1f
                    drawCircle(ringColor.copy(alpha = (1f - ph) * .35f), base + ph * size.minDimension * .16f, c, style = Stroke(3.dp.toPx()))
                }
                if (burst.value > 0f && burst.value < 1f) {
                    drawCircle(Success.copy(alpha = 1f - burst.value), base + burst.value * size.minDimension * .2f, c, style = Stroke(10.dp.toPx() * (1f - burst.value)))
                }
            }
            Box(
                Modifier.size(170.dp).scale(press).clip(CircleShape).background(brush)
                    .clickable(interaction, null, enabled = !busy) {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove); onToggle()
                    },
                contentAlignment = Alignment.Center,
            ) {
                if (busy) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(36.dp))
                else Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(if (clockedIn) Icons.Filled.Logout else Icons.Filled.Login, null, tint = Color.White, modifier = Modifier.size(40.dp))
                    Spacer(Modifier.height(6.dp))
                    Text(if (clockedIn) "SALIDA" else "ENTRADA", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, letterSpacing = 1.5.sp)
                }
            }
        }
        AnimatedContent(
            clockedIn, label = "status",
            transitionSpec = { (slideInVertically { it / 2 } + fadeIn()) togetherWith (slideOutVertically { -it / 2 } + fadeOut()) },
        ) { inn ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                if (inn) {
                    Text(elapsed.ifEmpty { "--:--:--" }, style = MaterialTheme.typography.headlineLarge, color = Success)
                    Text("Jornada en curso", color = Slate400)
                } else {
                    Text("Fuera de jornada", style = MaterialTheme.typography.titleLarge)
                    Text(expected ?: "Toca para fichar tu entrada", color = Slate400)
                }
            }
        }
    }
}
