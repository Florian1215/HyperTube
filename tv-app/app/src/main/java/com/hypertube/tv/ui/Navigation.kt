@file:OptIn(ExperimentalTvMaterial3Api::class)

package com.hypertube.tv.ui

import android.net.Uri
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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Search
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
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
import com.hypertube.tv.ui.components.ActionMenu
import com.hypertube.tv.ui.components.FocusSurface
import com.hypertube.tv.ui.components.HtIcon
import com.hypertube.tv.ui.components.Logo
import com.hypertube.tv.ui.components.MenuAction
import com.hypertube.tv.ui.components.ProfilePicture
import com.hypertube.tv.ui.home.HomeScreen
import com.hypertube.tv.ui.details.MediaScreen
import com.hypertube.tv.ui.people.PeopleScreen
import com.hypertube.tv.ui.search.SearchScreen
import com.hypertube.tv.ui.user.UserScreen
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.ui.theme.LocalAccent
import kotlinx.coroutines.delay

private const val HOME = "home"
private const val SEARCH = "search?type={type}&q={q}"
private const val MEDIA = "media/{type}/{id}"
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
    Box(Modifier.fillMaxSize().background(HtColors.Black)) {
        CompositionLocalProvider(LocalContentColor provides HtColors.White) {
            NavHost(navController = controller, startDestination = HOME, modifier = Modifier.fillMaxSize()) {
                composable(HOME) { HomeScreen(nav) }
                composable(SEARCH, arguments = listOf(optional("type"), optional("q"))) { entry ->
                    val args = entry.arguments
                    SearchScreen(nav, args?.getString("type"), args?.getString("q"))
                }
                composable(MEDIA) { entry ->
                    val args = entry.arguments
                    MediaScreen(nav, args?.getString("type") ?: MOVIES, args?.getString("id").orEmpty())
                }
                composable(PEOPLE) { entry -> PeopleScreen(nav, entry.arguments?.getString("id").orEmpty()) }
                composable(USER) { entry -> UserScreen(nav, entry.arguments?.getString("id").orEmpty()) }
                composable(LOGIN) { LoginScreen(nav) }
            }
        }
        NoticeHost(Modifier.align(Alignment.BottomEnd))
    }
}

// Navbar of the website, part of each screen so it scrolls away with the content
@Composable
fun TopBar(nav: Navigator, selected: TopBarItem, modifier: Modifier = Modifier, horizontalPadding: Dp = 48.dp) {
    val container = LocalAppContainer.current
    val user by currentUser()
    var showAccount by remember { mutableStateOf(false) }

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
        // Account icon to sign in, the profile picture once signed in
        FocusSurface(onClick = { if (current == null) nav.login() else showAccount = true }, shape = CircleShape, focusedContentColor = LocalAccent.current) {
            if (current == null)
                HtIcon(Icons.Default.AccountCircle, size = 36.dp, modifier = Modifier.padding(4.dp), contentDescription = stringResource(R.string.nav_signin))
            else
                ProfilePicture(current, size = 36.dp, modifier = Modifier.padding(4.dp))
        }
    }

    if (showAccount)
        ActionMenu(
            title = user?.username,
            actions = listOf(MenuAction(stringResource(R.string.nav_logout), Icons.Default.ExitToApp) { container.session.logout() }),
            onDismiss = { showAccount = false },
        )
}

@Composable
private fun NavItem(name: String, selected: Boolean, icon: Boolean = false, onClick: () -> Unit) {
    val accent = LocalAccent.current

    FocusSurface(onClick = onClick, contentColor = if (selected) accent else HtColors.White, focusedContentColor = accent) {
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
            Modifier.widthIn(max = 520.dp).background(HtColors.Black)
                .border(2.dp, if (current.error) HtColors.Red else HtColors.Green)
                .padding(horizontal = 20.dp, vertical = 14.dp),
        ) {
            Text(current.text, style = HtText.Body, color = HtColors.White)
        }
    }
}
