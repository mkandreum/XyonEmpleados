package com.xyon.empleados.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import com.xyon.empleados.data.RegisterRequest
import com.xyon.empleados.ui.theme.*

@Composable
private fun AuthShell(title: String, subtitle: String, onBack: (() -> Unit)?, content: @Composable ColumnScope.() -> Unit) {
    SecureScreen()
    AuroraBackground {
        Column(Modifier.fillMaxSize().systemBarsPadding().imePadding().verticalScroll(rememberScrollState()).padding(24.dp)) {
            if (onBack != null) IconButton(onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Atrás") }
            else Spacer(Modifier.height(48.dp))
            var shown by remember { mutableStateOf(false) }
            LaunchedEffect(Unit) { shown = true }
            AnimatedVisibility(shown, enter = fadeIn(tween(600)) + slideInVertically(spring(Spring.DampingRatioLowBouncy, Spring.StiffnessLow)) { it / 3 }) {
                Column {
                    Box(Modifier.size(64.dp).clip(RoundedCornerShape(20.dp)).background(BrandGradient), contentAlignment = Alignment.Center) {
                        Text("X", color = Color.White, style = MaterialTheme.typography.headlineLarge)
                    }
                    Spacer(Modifier.height(24.dp))
                    Text(title, style = MaterialTheme.typography.headlineLarge)
                    Text(subtitle, color = Slate400, modifier = Modifier.padding(top = 4.dp))
                    Spacer(Modifier.height(28.dp))
                    GlassCard { Column(verticalArrangement = Arrangement.spacedBy(14.dp), content = content) }
                }
            }
        }
    }
}

@Composable
fun LoginScreen(vm: SessionViewModel, onRegister: () -> Unit, onForgot: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var pass by remember { mutableStateOf("") }
    val busy by vm.busy.collectAsState()
    AuthShell("Bienvenido", "Accede a tu portal del empleado", null) {
        XField(email, { email = it }, "Email", keyboard = KeyboardType.Email, leading = Icons.Filled.Email)
        XField(pass, { pass = it }, "Contraseña", password = true, leading = Icons.Filled.Lock)
        GradientButton("Iniciar sesión", { vm.doLogin(email, pass) }, Modifier.fillMaxWidth(), enabled = email.isNotBlank() && pass.length >= 8, loading = busy)
        TextButton(onForgot, Modifier.align(Alignment.CenterHorizontally)) { Text("¿Olvidaste tu contraseña?") }
        HorizontalDivider(color = GlassStroke)
        TextButton(onRegister, Modifier.align(Alignment.CenterHorizontally)) { Text("¿Primera vez? Regístrate con tu código de invitación") }
    }
}

@Composable
fun RegisterScreen(vm: SessionViewModel, onBack: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var pass by remember { mutableStateOf("") }
    var dept by remember { mutableStateOf("") }
    var pos by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    val busy by vm.busy.collectAsState()
    val strong = pass.length >= 12 && pass.any { it.isUpperCase() } && pass.any { it.isLowerCase() } && pass.any { it.isDigit() } && pass.any { it in "@$!%*?&" }
    AuthShell("Crear cuenta", "Necesitas un código de invitación", onBack) {
        XField(code, { code = it }, "Código de invitación", leading = Icons.Filled.VpnKey)
        XField(name, { name = it }, "Nombre completo", leading = Icons.Filled.Person)
        XField(email, { email = it }, "Email", keyboard = KeyboardType.Email, leading = Icons.Filled.Email)
        XField(dept, { dept = it }, "Departamento (opcional)")
        XField(pos, { pos = it }, "Puesto (opcional)")
        XField(pass, { pass = it }, "Contraseña", password = true, leading = Icons.Filled.Lock,
            error = if (pass.isNotEmpty() && !strong) "Mín. 12 caracteres, mayúscula, minúscula, número y símbolo (@\$!%*?&)" else null)
        GradientButton("Registrarme", {
            vm.doRegister(RegisterRequest(name.trim(), email.trim(), pass, dept.ifBlank { null }, pos.ifBlank { null }, code.trim()))
        }, Modifier.fillMaxWidth(), enabled = strong && name.length >= 2 && email.isNotBlank() && code.isNotBlank(), loading = busy)
    }
}

@Composable
fun ForgotScreen(vm: SessionViewModel, onBack: () -> Unit, onHaveToken: () -> Unit) {
    var email by remember { mutableStateOf("") }
    val busy by vm.busy.collectAsState()
    AuthShell("Recuperar acceso", "Te enviaremos un enlace por email", onBack) {
        XField(email, { email = it }, "Email", keyboard = KeyboardType.Email, leading = Icons.Filled.Email)
        GradientButton("Enviar enlace", { vm.forgot(email) { onHaveToken() } }, Modifier.fillMaxWidth(), enabled = email.contains("@"), loading = busy)
        TextButton(onHaveToken, Modifier.align(Alignment.CenterHorizontally)) { Text("Ya tengo un código") }
    }
}

@Composable
fun ResetScreen(vm: SessionViewModel, onBack: () -> Unit, onDone: () -> Unit) {
    var token by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var pass by remember { mutableStateOf("") }
    val busy by vm.busy.collectAsState()
    AuthShell("Nueva contraseña", "Pega el token y email del enlace recibido (…reset-password?token=…&email=…)", onBack) {
        XField(token, { token = it }, "Token", leading = Icons.Filled.VpnKey)
        XField(email, { email = it }, "Email", keyboard = KeyboardType.Email, leading = Icons.Filled.Email)
        XField(pass, { pass = it }, "Nueva contraseña", password = true, leading = Icons.Filled.Lock)
        GradientButton("Cambiar contraseña", { vm.reset(token, email, pass, onDone) }, Modifier.fillMaxWidth(),
            enabled = token.isNotBlank() && email.contains("@") && pass.length >= 12, loading = busy)
    }
}

/** Shown when a token exists and biometric unlock is enabled. */
@Composable
fun LockScreen(vm: SessionViewModel) {
    val act = LocalContext.current as FragmentActivity
    SecureScreen()
    var failed by remember { mutableStateOf(false) }
    fun ask() = promptBiometric(act, "Desbloquea Xyon", { vm.unlock() }, { failed = true })
    LaunchedEffect(Unit) { ask() }
    AuroraBackground {
        Column(Modifier.fillMaxSize().systemBarsPadding().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            val t = rememberInfiniteTransition(label = "lock")
            val s by t.animateFloat(1f, 1.08f, infiniteRepeatable(tween(1400, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "s")
            Icon(Icons.Filled.Fingerprint, null, tint = Primary400, modifier = Modifier.size(96.dp).scale(s))
            Spacer(Modifier.height(16.dp))
            Text("Sesión bloqueada", style = MaterialTheme.typography.headlineMedium)
            Text("Usa tu huella, rostro o PIN", color = Slate400, textAlign = TextAlign.Center)
            Spacer(Modifier.height(32.dp))
            GradientButton("Desbloquear", { ask() }, Modifier.fillMaxWidth())
            TextButton({ vm.signOut() }) { Text(if (failed) "Cerrar sesión" else "Usar otra cuenta") }
        }
    }
}
