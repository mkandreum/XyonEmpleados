package com.xyon.empleados.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.xyon.empleados.data.User
import com.xyon.empleados.ui.theme.*
import kotlinx.coroutines.launch

private data class Tab(val route: String, val label: String, val icon: ImageVector)
private val TABS = listOf(
    Tab("home", "Inicio", Icons.Filled.Home),
    Tab("calendar", "Calendario", Icons.Filled.CalendarMonth),
    Tab("requests", "Solicitudes", Icons.Filled.BeachAccess),
    Tab("news", "Noticias", Icons.Filled.Newspaper),
    Tab("profile", "Perfil", Icons.Filled.Person),
)

@Composable
fun AppRoot(vm: SessionViewModel = hiltViewModel()) {
    val auth by vm.auth.collectAsState()
    val snack = remember { SnackbarHostState() }
    LaunchedEffect(Unit) { vm.message.collect { snack.showSnackbar(it) } }
    Box(Modifier.fillMaxSize()) {
        AnimatedContent(
            auth::class, label = "auth",
            transitionSpec = { (fadeIn(tween(350)) + scaleIn(initialScale = .96f)) togetherWith fadeOut(tween(200)) },
        ) { kind ->
            when (kind) {
                AuthState.Loading::class -> AuroraBackground {}
                AuthState.LoggedOut::class -> AuthGraph(vm)
                AuthState.Locked::class -> LockScreen(vm)
                else -> (auth as? AuthState.LoggedIn)?.let { MainShell(it.user, vm, snack) }
            }
        }
        SnackbarHost(snack, Modifier.align(Alignment.TopCenter).statusBarsPadding())
    }
}

@Composable
private fun AuthGraph(vm: SessionViewModel) {
    val nav = rememberNavController()
    NavHost(nav, "login", enterTransition = { slideInHorizontally(spring(stiffness = Spring.StiffnessMediumLow)) { it / 3 } + fadeIn() },
        exitTransition = { fadeOut() }, popEnterTransition = { fadeIn() },
        popExitTransition = { slideOutHorizontally { it / 3 } + fadeOut() }) {
        composable("login") { LoginScreen(vm, { nav.navigate("register") }, { nav.navigate("forgot") }) }
        composable("register") { RegisterScreen(vm) { nav.popBackStack() } }
        composable("forgot") { ForgotScreen(vm, { nav.popBackStack() }, { nav.navigate("reset") }) }
        composable("reset") { ResetScreen(vm, { nav.popBackStack() }) { nav.navigate("login") { popUpTo("login") { inclusive = true } } } }
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun MainShell(user: User, session: SessionViewModel, snack: SnackbarHostState) {
    val nav = rememberNavController()
    val scope = rememberCoroutineScope()
    val act = LocalContext.current as FragmentActivity
    val newsVm: NewsViewModel = hiltViewModel()
    val newsState by newsVm.news.state.collectAsState()
    val say: (String) -> Unit = { m -> scope.launch { snack.showSnackbar(m) } }
    val route by nav.currentBackStackEntryAsState()
    val current = route?.destination?.route
    val showBar = TABS.any { it.route == current }

    fun push(r: String) = nav.navigate(r) { launchSingleTop = true }
    fun tab(r: String) = nav.navigate(r) { popUpTo("home") { saveState = true }; launchSingleTop = true; restoreState = true }

    AuroraBackground {
        SharedTransitionLayout {
            CompositionLocalProvider(LocalSharedScope provides this) {
                NavHost(
                    nav, "home",
                    enterTransition = { slideInHorizontally(spring(Spring.DampingRatioLowBouncy, Spring.StiffnessMediumLow)) { it / 4 } + fadeIn(tween(250)) },
                    exitTransition = { fadeOut(tween(150)) },
                    popEnterTransition = { fadeIn(tween(250)) },
                    popExitTransition = { slideOutHorizontally { it / 4 } + fadeOut(tween(200)) },
                ) {
                    composable("home") { Scoped(this) {
                        HomeScreen(user, { push("notifications") }, { push("fichajes") }, { push("payroll") }, { tab("news") }, { push("team") }, { push("admin") }, snack = say)
                    } }
                    composable("calendar") { Scoped(this) { CalendarScreen(user) } }
                    composable("requests") { Scoped(this) { RequestsScreen(snack = say) } }
                    composable("news") { Scoped(this) { NewsScreen(newsVm) { n -> push("news/${n.id}") } } }
                    composable("news/{id}") { e -> Scoped(this) {
                        val id = e.arguments?.getString("id")
                        NewsDetailScreen(newsState.data?.firstOrNull { it.id == id }) { nav.popBackStack() }
                    } }
                    composable("profile") { Scoped(this) {
                        ProfileScreen(user, session, { push("notifications") }, { push("payroll") }, { push("fichajes") }, { push("team") }, { push("admin") }) { on ->
                            if (!on) session.setBiometric(false)
                            else if (canAuthenticate(act)) promptBiometric(act, "Activar desbloqueo", { session.setBiometric(true) }, { say(it) })
                            else say("Este dispositivo no tiene biometría o PIN configurado")
                        }
                    } }
                    composable("notifications") { Scoped(this) { NotificationsScreen({ nav.popBackStack() }) } }
                    composable("fichajes") { Scoped(this) { FichajesScreen({ nav.popBackStack() }, snack = say) } }
                    composable("payroll") { Scoped(this) { PayrollScreen({ nav.popBackStack() }, snack = say) } }
                    composable("team") { Scoped(this) { ManagerScreen({ nav.popBackStack() }, snack = say) } }
                    composable("admin") { Scoped(this) { AdminScreen({ nav.popBackStack() }, snack = say) } }
                }
            }
        }
        AnimatedVisibility(
            showBar, Modifier.align(Alignment.BottomCenter),
            enter = slideInVertically(spring(Spring.DampingRatioMediumBouncy)) { it } + fadeIn(),
            exit = slideOutVertically { it } + fadeOut(),
        ) { BottomBar(current ?: "home") { tab(it) } }
    }
}

@Composable
private fun Scoped(scope: AnimatedVisibilityScope, content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalAnimScope provides scope) { Box(Modifier.fillMaxSize()) { content() } }
}

/** Floating glass pill with a spring-sliding selection indicator. */
@Composable
private fun BottomBar(selected: String, onSelect: (String) -> Unit) {
    val haptic = LocalHapticFeedback.current
    val idx = TABS.indexOfFirst { it.route == selected }.coerceAtLeast(0)
    BoxWithConstraints(
        Modifier.navigationBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp).fillMaxWidth().height(68.dp)
            .clip(RoundedCornerShape(28.dp)).background(Brush.verticalGradient(listOf(Color(0xE6182446), Color(0xF20D1429))))
            .border(1.dp, GlassStroke, RoundedCornerShape(28.dp)),
    ) {
        val w = maxWidth / TABS.size
        val x by animateDpAsState(w * idx, spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessMediumLow), label = "ind")
        Box(Modifier.offset(x = x).width(w).fillMaxHeight().padding(8.dp).clip(RoundedCornerShape(20.dp)).background(Primary600.copy(alpha = .28f)))
        Row(Modifier.fillMaxSize()) {
            TABS.forEachIndexed { i, t ->
                val sel = i == idx
                val s by animateFloatAsState(if (sel) 1.18f else 1f, spring(Spring.DampingRatioHighBouncy, Spring.StiffnessMedium), label = "s")
                val tint by animateColorAsState(if (sel) Primary300 else Slate500, label = "t")
                Column(
                    Modifier.weight(1f).fillMaxHeight().clickable(remember { MutableInteractionSource() }, null) {
                        if (!sel) { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove); onSelect(t.route) }
                    },
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
                ) {
                    Icon(t.icon, t.label, tint = tint, modifier = Modifier.scale(s))
                    AnimatedVisibility(sel) { Text(t.label, color = tint, style = MaterialTheme.typography.labelSmall, maxLines = 1) }
                }
            }
        }
    }
}
