package com.xyon.empleados.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.shape.RoundedCornerShape

// Brand identity from the web app (tailwind primary-* scale, success/warning/danger tokens)
val Primary50 = Color(0xFFEFF6FF)
val Primary300 = Color(0xFF93C5FD)
val Primary400 = Color(0xFF60A5FA)
val Primary500 = Color(0xFF3B82F6)
val Primary600 = Color(0xFF2563EB)
val Primary700 = Color(0xFF1D4ED8)
val Primary900 = Color(0xFF1E3A8A)
val Primary950 = Color(0xFF172554)

val Success = Color(0xFF22C55E)
val Warning = Color(0xFFF59E0B)
val Danger = Color(0xFFEF4444)
val Violet = Color(0xFF7C3AED)
val Cyan = Color(0xFF22D3EE)

val Ink950 = Color(0xFF070B16)
val Ink900 = Color(0xFF0B1020)
val Ink800 = Color(0xFF111A33)
val Slate300 = Color(0xFFCBD5E1)
val Slate400 = Color(0xFF94A3B8)
val Slate500 = Color(0xFF64748B)

val GlassFill = Color(0x14FFFFFF)
val GlassFillStrong = Color(0x24FFFFFF)
val GlassStroke = Color(0x26FFFFFF)

val BrandGradient = Brush.linearGradient(listOf(Primary500, Primary700, Violet))
val SuccessGradient = Brush.linearGradient(listOf(Color(0xFF22C55E), Color(0xFF059669)))
val DangerGradient = Brush.linearGradient(listOf(Color(0xFFF97316), Color(0xFFEF4444)))

private val Scheme = darkColorScheme(
    primary = Primary400, onPrimary = Ink950, primaryContainer = Primary900, onPrimaryContainer = Primary50,
    secondary = Cyan, onSecondary = Ink950, tertiary = Violet,
    background = Ink950, onBackground = Color(0xFFF1F5F9),
    surface = Ink900, onSurface = Color(0xFFF1F5F9), surfaceVariant = Ink800, onSurfaceVariant = Slate400,
    outline = GlassStroke, outlineVariant = Color(0x1AFFFFFF),
    error = Danger, onError = Color.White,
    surfaceContainer = Ink800, surfaceContainerHigh = Color(0xFF16213F), surfaceContainerHighest = Color(0xFF1B294D),
)

private val Sans = FontFamily.SansSerif
private val Type = Typography(
    displayLarge = TextStyle(fontFamily = Sans, fontWeight = FontWeight.ExtraBold, fontSize = 48.sp, letterSpacing = (-1).sp),
    headlineLarge = TextStyle(fontFamily = Sans, fontWeight = FontWeight.ExtraBold, fontSize = 32.sp, letterSpacing = (-0.5).sp),
    headlineMedium = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 26.sp),
    titleLarge = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 20.sp),
    titleMedium = TextStyle(fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
    bodyLarge = TextStyle(fontFamily = Sans, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = Sans, fontSize = 14.sp, lineHeight = 20.sp),
    labelLarge = TextStyle(fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 14.sp),
    labelSmall = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Medium, fontSize = 11.sp, letterSpacing = 0.5.sp),
)

private val AppShapes = Shapes(
    small = RoundedCornerShape(12.dp), medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(24.dp), extraLarge = RoundedCornerShape(32.dp),
)

/** Dark premium theme (always dark, matching the web identity with bolder contrast). */
@Composable
fun XyonTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Scheme, typography = Type, shapes = AppShapes, content = content)
}
