@file:OptIn(ExperimentalTvMaterial3Api::class)

package com.hypertube.tv.ui

import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupProperties
import com.hypertube.tv.data.MAX_ACCOUNTS
import com.hypertube.tv.data.TvCast
import com.hypertube.tv.data.User
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.Search
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.LocalContentColor
import androidx.tv.material3.Text
import com.hypertube.tv.R
import com.hypertube.tv.data.MOVIES
import com.hypertube.tv.data.SERIES
import com.hypertube.tv.ui.auth.LoginScreen
import com.hypertube.tv.ui.components.FocusSurface
import com.hypertube.tv.ui.components.HtIcon
import com.hypertube.tv.ui.components.HtIcons
import com.hypertube.tv.ui.components.Logo
import com.hypertube.tv.ui.components.ProfilePicture
import com.hypertube.tv.ui.home.HomeScreen
import com.hypertube.tv.ui.details.MediaScreen
import com.hypertube.tv.ui.people.PeopleScreen
import com.hypertube.tv.ui.search.SearchScreen
import com.hypertube.tv.ui.user.UserScreen
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.ui.theme.LocalAccent
import com.hypertube.tv.ui.theme.LocalDarkMode
import kotlinx.coroutines.delay

private const val HOME = "home"
private const val SEARCH = "search?type={type}&q={q}"
private const val MEDIA = "media/{type}/{id}?season={season}&episode={episode}&play={play}"
private const val LOGIN = "login"
private const val PEOPLE = "people/{id}"
private const val USER = "user/{id}"

class Navigator(private val controller: NavHostController) {
    fun home() = controller.navigate(HOME) {
        popUpTo(HOME) { inclusive = true }
        launchSingleTop = true
    }

    fun search(type: String? = null, query: String? = null, topLevel: Boolean = false) {
        val params = listOfNotNull(
            type?.let { "type=${Uri.encode(it)}" },
            query?.let { "q=${Uri.encode(it)}" },
        ).joinToString("&")
        controller.navigate("search?$params") {
            if (topLevel)
                popUpTo(HOME)
        }
    }

    fun media(type: String, id: String) = controller.navigate("media/$type/$id")

    // Media cast from the website: its page starts the playback, of the given episode for a series
    fun cast(cast: TvCast) {
        val episode = if (cast.season != null && cast.episode != null) "season=${cast.season}&episode=${cast.episode}&" else ""
        controller.navigate("media/${cast.type}/${cast.id}?${episode}play=true")
    }

    fun person(id: String) = controller.navigate("people/$id")

    fun user(id: Int) = controller.navigate("user/$id")

    fun login() = controller.navigate(LOGIN) { launchSingleTop = true }

    fun back() = controller.popBackStack()
}

enum class TopBarItem { Search, Movies, Series, None }

@Composable
fun AppNavigation() {
    val controller = rememberNavController()
    val nav = remember(controller) { Navigator(controller) }
    val optional = { name: String ->
        navArgument(name) {
            type = NavType.StringType
            nullable = true
            defaultValue = null
        }
    }

    // Without a Surface the texts of tv-material are black, so the screens default to white
    Box(Modifier.fillMaxSize().background(HtColors.DWhite)) {
        CompositionLocalProvider(LocalContentColor provides HtColors.DBlack) {
            NavHost(navController = controller, startDestination = HOME, modifier = Modifier.fillMaxSize()) {
                composable(HOME) { HomeScreen(nav) }
                composable(SEARCH, arguments = listOf(optional("type"), optional("q"))) { entry ->
                    val args = entry.arguments
                    SearchScreen(nav, args?.getString("type"), args?.getString("q"))
                }
                composable(MEDIA, arguments = listOf(optional("season"), optional("episode"), optional("play"))) { entry ->
                    val args = entry.arguments
                    val season = args?.getString("season")?.toIntOrNull()
                    val episode = args?.getString("episode")?.toIntOrNull()
                    MediaScreen(
                        nav, args?.getString("type") ?: MOVIES, args?.getString("id").orEmpty(),
                        play = args?.getString("play") == "true",
                        playEpisode = if (season != null && episode != null) season to episode else null,
                    )
                }
                composable(PEOPLE) { entry -> PeopleScreen(nav, entry.arguments?.getString("id").orEmpty()) }
                composable(USER) { entry -> UserScreen(nav, entry.arguments?.getString("id").orEmpty()) }
                composable(LOGIN) { LoginScreen(nav) }
            }
        }
        NoticeHost(Modifier.align(Alignment.BottomEnd))
    }
    CastHost(nav)
}

// Opens the medias cast from the website while the app is in the foreground with an account
@Composable
private fun CastHost(nav: Navigator) {
    val container = LocalAppContainer.current
    val user by currentUser()
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val signedIn = user != null

    LaunchedEffect(signedIn, lifecycle) {
        if (signedIn)
            lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
                container.casts.casts().collect { nav.cast(it) }
            }
    }
}

// Navbar of the website, part of each screen so it scrolls away with the content
@Composable
fun TopBar(nav: Navigator, selected: TopBarItem, modifier: Modifier = Modifier, horizontalPadding: Dp = 48.dp) {
    val user by currentUser()

    Row(
        modifier = modifier.fillMaxWidth().padding(horizontal = horizontalPadding, vertical = 20.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        FocusSurface(onClick = nav::home, focusedContentColor = LocalAccent.current) {
            Logo(Modifier.padding(8.dp), height = 18.dp, color = androidx.tv.material3.LocalContentColor.current)
        }
        NavItem(stringResource(R.string.nav_search), selected == TopBarItem.Search, icon = true) { nav.search(topLevel = true) }
        NavItem(stringResource(R.string.nav_movies), selected == TopBarItem.Movies) { nav.search(MOVIES, topLevel = true) }
        NavItem(stringResource(R.string.nav_series), selected == TopBarItem.Series) { nav.search(SERIES, topLevel = true) }
        val current = user
        // Account icon to sign in, the profile picture with its menu once signed in
        if (current == null)
            FocusSurface(onClick = nav::login, shape = CircleShape, focusedContentColor = LocalAccent.current) {
                HtIcon(Icons.Default.AccountCircle, size = 36.dp, modifier = Modifier.padding(4.dp), contentDescription = stringResource(R.string.nav_signin))
            }
        else
            AccountButton(current, onProfile = { nav.user(current.id) }, onAddAccount = nav::login)
    }
}

private val OK_KEYS = setOf(Key.DirectionCenter, Key.Enter, Key.NumPadEnter)
private const val GRID_COLUMNS = 3

// Dropdown of the website navbar: shown while the profile picture has the focus, the arrows move in the popup, OK runs the selection.
// The signed in accounts are a grid of pictures (OK on the current one opens its profile, on another switches to it),
// the last circle adds an account while there is room, then come the switch of the mode and the logout.
// The focus stays on the picture so the popup does not need its own focus window
@Composable
private fun AccountButton(user: User, onProfile: () -> Unit, onAddAccount: () -> Unit) {
    val container = LocalAppContainer.current
    val accounts by container.session.accounts.collectAsState()
    val accent = LocalAccent.current
    val density = LocalDensity.current
    var focused by remember { mutableStateOf(false) }
    // -1: the picture itself (OK opens the profile), then the cells of the grid, the mode and the logout
    var selected by remember { mutableIntStateOf(-1) }
    var height by remember { mutableIntStateOf(0) }
    // OK pressed on the selection, which runs on the release
    var pressed by remember { mutableStateOf(false) }
    // null: the button to add an account
    val cells: List<User?> = accounts.take(MAX_ACCOUNTS).let { if (it.size < MAX_ACCOUNTS) it + null else it }
    val dark = LocalDarkMode.current
    val mode = cells.size
    val logout = mode + 1
    val lastRow = cells.lastIndex / GRID_COLUMNS

    fun run(index: Int) {
        when {
            index == mode -> container.theme.setDark(!dark)
            index == logout -> container.session.logout()
            index !in cells.indices -> Unit
            cells[index] == null -> onAddAccount()
            cells[index]?.id == user.id -> onProfile()
            else -> cells[index]?.let { container.session.switchTo(it.id) }
        }
    }

    Box(Modifier.onSizeChanged { height = it.height }) {
        FocusSurface(
            onClick = onProfile,
            shape = CircleShape,
            border = BorderStroke(2.dp, Color.Transparent),
            focusedBorderColor = accent,
            modifier = Modifier
                .onFocusChanged {
                    focused = it.isFocused
                    if (!it.isFocused) {
                        selected = -1
                        pressed = false
                    }
                }
                .onPreviewKeyEvent { event ->
                    // The surface clicks on the release of OK: the popup consumes it, or the profile would open too.
                    // Running the selection on the release also keeps the release away from the next screen
                    if (event.type == KeyEventType.KeyUp) {
                        if (!pressed || event.key !in OK_KEYS)
                            return@onPreviewKeyEvent false
                        pressed = false
                        val index = selected
                        // Back on the picture, the grid changes with the account
                        selected = -1
                        run(index)
                        return@onPreviewKeyEvent true
                    }
                    if (event.type != KeyEventType.KeyDown)
                        return@onPreviewKeyEvent false
                    val row = selected / GRID_COLUMNS
                    val column = selected % GRID_COLUMNS
                    when (event.key) {
                        // Past the logout, the focus leaves the menu to the page
                        Key.DirectionDown -> selected = when {
                            selected < 0 -> 0
                            selected == logout -> {
                                selected = -1
                                return@onPreviewKeyEvent false
                            }
                            selected == mode -> logout
                            row < lastRow -> minOf(selected + GRID_COLUMNS, cells.lastIndex)
                            else -> mode
                        }
                        Key.DirectionUp -> selected = when {
                            selected < 0 -> return@onPreviewKeyEvent false
                            selected == logout -> mode
                            selected == mode -> lastRow * GRID_COLUMNS
                            row > 0 -> selected - GRID_COLUMNS
                            else -> -1
                        }
                        // In the popup the sides stay in the row, the focus does not move to the navbar
                        Key.DirectionLeft -> when {
                            selected < 0 -> return@onPreviewKeyEvent false
                            selected < mode && column > 0 -> selected--
                        }
                        Key.DirectionRight -> when {
                            selected < 0 -> return@onPreviewKeyEvent false
                            selected < mode && column < GRID_COLUMNS - 1 && selected < cells.lastIndex -> selected++
                        }
                        in OK_KEYS -> {
                            if (selected < 0)
                                return@onPreviewKeyEvent false
                            pressed = true
                        }
                        else -> {
                            selected = -1
                            pressed = false
                            return@onPreviewKeyEvent false
                        }
                    }
                    true
                },
        ) {
            ProfilePicture(user, size = 36.dp, modifier = Modifier.padding(4.dp))
        }
        if (focused)
            Popup(
                alignment = Alignment.TopEnd,
                offset = IntOffset(0, height + with(density) { 8.dp.roundToPx() }),
                properties = PopupProperties(focusable = false),
            ) {
                Column(Modifier.background(HtColors.DWhite).border(1.dp, HtColors.DBlack)) {
                    // Name of the selected cell, the current account otherwise
                    val label = when {
                        selected in cells.indices -> cells[selected]?.username ?: stringResource(R.string.nav_add_account)
                        else -> user.username
                    }
                    Text(label, style = HtText.Small, color = HtColors.Gray, maxLines = 1, modifier = Modifier.width(GRID_WIDTH).padding(start = 16.dp, end = 16.dp, top = 12.dp))
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        cells.chunked(GRID_COLUMNS).forEachIndexed { row, users ->
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                users.forEachIndexed { column, account ->
                                    val index = row * GRID_COLUMNS + column
                                    AccountCell(account, selected = index == selected, current = account?.id == user.id)
                                }
                            }
                        }
                    }
                    // The mode shown is the one it switches to
                    MenuRow(stringResource(if (dark) R.string.nav_light_mode else R.string.nav_dark_mode), if (dark) HtIcons.Sun else HtIcons.Moon, selected == mode)
                    MenuRow(stringResource(R.string.nav_logout), Icons.AutoMirrored.Filled.ExitToApp, selected == logout)
                }
            }
    }
}

@Composable
private fun MenuRow(name: String, icon: ImageVector, selected: Boolean) {
    val color = if (selected) LocalAccent.current else HtColors.DBlack

    Row(
        Modifier.width(GRID_WIDTH).border(width = 1.dp, color = HtColors.DWhiteLight)
            .background(if (selected) HtColors.DWhiteLight else Color.Transparent).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        HtIcon(icon, size = 18.dp, tint = color)
        Text(name.uppercase(), style = HtText.Bold, color = color)
    }
}

private val CELL_SIZE = 56.dp
private val GRID_WIDTH = CELL_SIZE * GRID_COLUMNS + 12.dp * (GRID_COLUMNS - 1) + 32.dp

// Picture of a signed in account, or the + to add one when the user is null.
// The selection has the accent ring, the current account a white one
@Composable
private fun AccountCell(user: User?, selected: Boolean, current: Boolean) {
    val accent = LocalAccent.current
    val ring = when {
        selected -> accent
        current -> HtColors.DBlack
        else -> Color.Transparent
    }

    Box(Modifier.size(CELL_SIZE).border(2.dp, ring, CircleShape).padding(4.dp), contentAlignment = Alignment.Center) {
        if (user != null)
            ProfilePicture(user, size = CELL_SIZE - 8.dp)
        else
            Box(Modifier.fillMaxSize().border(1.dp, if (selected) accent else HtColors.Gray, CircleShape), contentAlignment = Alignment.Center) {
                HtIcon(Icons.Default.Add, size = 24.dp, tint = if (selected) accent else HtColors.DBlack, contentDescription = stringResource(R.string.nav_add_account))
            }
    }
}

@Composable
private fun NavItem(name: String, selected: Boolean, icon: Boolean = false, onClick: () -> Unit) {
    val accent = LocalAccent.current

    FocusSurface(onClick = onClick, contentColor = if (selected) accent else HtColors.DBlack, focusedContentColor = accent) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            if (icon)
                HtIcon(Icons.Default.Search, size = 18.dp, modifier = Modifier.padding(end = 6.dp))
            Text(name.uppercase(), style = HtText.Bold)
        }
    }
}

// Notifications of the website (errors of the API calls)
@Composable
private fun NoticeHost(modifier: Modifier = Modifier) {
    val container = LocalAppContainer.current
    var notice by remember { mutableStateOf<com.hypertube.tv.Notice?>(null) }

    LaunchedEffect(Unit) {
        container.notices.collect { notice = it }
    }
    LaunchedEffect(notice) {
        if (notice != null) {
            delay(4000)
            notice = null
        }
    }

    AnimatedVisibility(visible = notice != null, enter = fadeIn(), exit = fadeOut(), modifier = modifier.padding(32.dp)) {
        val current = notice ?: return@AnimatedVisibility
        Box(
            Modifier.widthIn(max = 520.dp).background(HtColors.DWhite)
                .border(2.dp, if (current.error) HtColors.Red else HtColors.Green)
                .padding(horizontal = 20.dp, vertical = 14.dp),
        ) {
            Text(current.text, style = HtText.Body, color = HtColors.DBlack)
        }
    }
}
