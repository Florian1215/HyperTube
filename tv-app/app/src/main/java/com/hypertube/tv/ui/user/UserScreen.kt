@file:OptIn(ExperimentalTvMaterial3Api::class)

package com.hypertube.tv.ui.user

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.hypertube.tv.R
import com.hypertube.tv.data.User
import com.hypertube.tv.ui.LocalAppContainer
import com.hypertube.tv.ui.Navigator
import com.hypertube.tv.ui.TopBar
import com.hypertube.tv.ui.TopBarItem
import com.hypertube.tv.ui.components.ButtonVariant
import com.hypertube.tv.ui.components.CenteredMessage
import com.hypertube.tv.ui.components.HtButton
import com.hypertube.tv.ui.components.FolderTabs
import com.hypertube.tv.ui.components.MediaCard
import com.hypertube.tv.ui.components.MediaMenu
import com.hypertube.tv.ui.components.MenuTarget
import com.hypertube.tv.ui.components.Placeholder
import com.hypertube.tv.ui.components.ProfilePicture
import com.hypertube.tv.ui.components.SmallText
import com.hypertube.tv.ui.components.Tab
import com.hypertube.tv.ui.components.menuTarget
import com.hypertube.tv.ui.currentUser
import com.hypertube.tv.ui.home.SCREEN_PADDING
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.util.formatDate

private fun LazyGridScope.fullLine(key: String, content: @Composable () -> Unit) =
    item(key = key, span = { GridItemSpan(maxLineSpan) }) { content() }

// Port of src/app/users/[id]/page.tsx: profile, follow button and history (movies, series, watchlist)
@Composable
fun UserScreen(nav: Navigator, id: String) {
    val container = LocalAppContainer.current
    val viewModel: UserViewModel = viewModel { UserViewModel(container, id) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val me by currentUser()
    var menu by remember { mutableStateOf<MenuTarget?>(null) }
    val gridState = rememberLazyGridState()
    val nearEnd by remember {
        derivedStateOf {
            val info = gridState.layoutInfo
            (info.visibleItemsInfo.lastOrNull()?.index ?: 0) >= info.totalItemsCount - 8
        }
    }
    val user = state.user
    val tabs = UserTab.entries

    // Infinite scroll instead of the pagination of the website
    LaunchedEffect(nearEnd, state.hasMore, state.loading) {
        if (nearEnd && state.hasMore && !state.loading)
            viewModel.loadMore()
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(3),
        state = gridState,
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = SCREEN_PADDING, end = SCREEN_PADDING, bottom = SCREEN_PADDING),
        horizontalArrangement = Arrangement.spacedBy(28.dp),
        verticalArrangement = Arrangement.spacedBy(28.dp),
    ) {
        fullLine("top") { TopBar(nav, TopBarItem.None, horizontalPadding = 0.dp) }
        when {
            state.notFound -> fullLine("error") { CenteredMessage(stringResource(R.string.error_not_found_user)) }
            state.error && user == null -> fullLine("error") {
                CenteredMessage(stringResource(R.string.error_network)) { HtButton(stringResource(R.string.retry), onClick = viewModel::load) }
            }
            user == null -> fullLine("header") { Placeholder(Modifier.fillMaxWidth().height(200.dp)) }
            else -> {
                fullLine("header") {
                    // Follow only when signed in and not on its own profile
                    UserInfo(user, canFollow = me != null && me?.id != user.id, pending = state.following, onFollow = viewModel::toggleFollow)
                }
                fullLine("tabs") {
                    FolderTabs(
                        tabs = tabs.map { Tab(tabName(it), state.counts[it]) },
                        active = tabs.indexOf(state.tab),
                        onChange = { viewModel.setTab(tabs[it]) },
                    )
                }
                when {
                    state.medias.isEmpty() && state.loading -> items(3) { Placeholder(Modifier.aspectRatio(10f / 7f)) }
                    state.medias.isEmpty() && state.error -> fullLine("medias-error") {
                        CenteredMessage(stringResource(R.string.error_network)) { HtButton(stringResource(R.string.retry), onClick = viewModel::load) }
                    }
                    state.medias.isEmpty() -> fullLine("empty") {
                        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                            SmallText(stringResource(if (state.tab == UserTab.Watchlist) R.string.profile_no_watchlist else R.string.profile_no_medias))
                        }
                    }
                    // No key: the history has the same movie several times when it was watched again
                    else -> items(state.medias) { media ->
                        MediaCard(
                            media,
                            onClick = { nav.media(media.type, media.id) },
                            onLongClick = { menu = media.menuTarget() },
                            inHistory = state.tab != UserTab.Watchlist,
                        )
                    }
                }
            }
        }
    }

    menu?.let { MediaMenu(it, onDismiss = { menu = null }) }
}

@Composable
private fun UserInfo(user: User, canFollow: Boolean, pending: Boolean, onFollow: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(24.dp)) {
            ProfilePicture(user, size = 120.dp)
            Column {
                Text(user.username.uppercase(), style = HtText.Title)
                formatDate(user.createdAt)?.let { Text(stringResource(R.string.profile_member_since, it).uppercase(), style = HtText.Body) }
            }
        }
        if (canFollow)
            HtButton(
                stringResource(if (user.isFollowing == true) R.string.unfollow else R.string.follow),
                variant = if (user.isFollowing == true) ButtonVariant.Outline else ButtonVariant.Primary,
                enabled = !pending,
                onClick = onFollow,
            )
    }
}

@Composable
private fun tabName(tab: UserTab): String = stringResource(when (tab) {
    UserTab.Movies -> R.string.profile_tab_movies
    UserTab.Series -> R.string.profile_tab_series
    UserTab.Watchlist -> R.string.profile_tab_watchlist
})
