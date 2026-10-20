@file:OptIn(ExperimentalTvMaterial3Api::class)

package com.hypertube.tv.ui.search

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.hypertube.tv.R
import com.hypertube.tv.data.MOVIES
import com.hypertube.tv.data.Media
import com.hypertube.tv.data.People
import com.hypertube.tv.data.SEARCH_CONTINUE
import com.hypertube.tv.data.SEARCH_DIRECTSTREAM
import com.hypertube.tv.data.SEARCH_FEATURED
import com.hypertube.tv.data.SEARCH_FRIENDS
import com.hypertube.tv.data.SEARCH_POPULAR
import com.hypertube.tv.data.SEARCH_TOP_RATED
import com.hypertube.tv.data.SEARCH_UPCOMING
import com.hypertube.tv.data.SERIES
import com.hypertube.tv.data.User
import com.hypertube.tv.ui.LocalAppContainer
import com.hypertube.tv.ui.Navigator
import com.hypertube.tv.ui.TopBar
import com.hypertube.tv.ui.TopBarItem
import com.hypertube.tv.ui.components.ButtonVariant
import com.hypertube.tv.ui.components.CenteredMessage
import com.hypertube.tv.ui.components.EpisodeLabel
import com.hypertube.tv.ui.components.FocusSurface
import com.hypertube.tv.ui.components.HtButton
import com.hypertube.tv.ui.components.HtChip
import com.hypertube.tv.ui.components.HtIcon
import com.hypertube.tv.ui.components.HtIcons
import com.hypertube.tv.ui.components.HtTextField
import com.hypertube.tv.ui.components.MediaCard
import com.hypertube.tv.ui.components.MediaMenu
import com.hypertube.tv.ui.components.MenuTarget
import com.hypertube.tv.ui.components.NetworkImage
import com.hypertube.tv.ui.components.Placeholder
import com.hypertube.tv.ui.components.ProfilePicture
import com.hypertube.tv.ui.components.SmallText
import com.hypertube.tv.ui.components.menuTarget
import com.hypertube.tv.ui.currentUser
import com.hypertube.tv.ui.home.SCREEN_PADDING
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.ui.theme.LocalAccent
import com.hypertube.tv.util.formatDate

private fun LazyGridScope.fullLine(key: String, content: @Composable () -> Unit) =
    item(key = key, span = { GridItemSpan(maxLineSpan) }) { content() }

@Composable
fun SearchScreen(nav: Navigator, type: String?, query: String?) {
    val container = LocalAppContainer.current
    val viewModel: SearchViewModel = viewModel { SearchViewModel(container, type, query) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val user by currentUser()
    var menu by remember { mutableStateOf<MenuTarget?>(null) }
    val gridState = rememberLazyGridState()
    val searchFocus = remember { FocusRequester() }
    val columns = when {
        state.isMedia && state.special != SEARCH_FRIENDS -> 3
        state.type == PEOPLE -> 3
        else -> 1
    }
    val nearEnd by remember {
        derivedStateOf {
            val info = gridState.layoutInfo
            (info.visibleItemsInfo.lastOrNull()?.index ?: 0) >= info.totalItemsCount - 8
        }
    }
    val medias = state.medias

    // Infinite scroll instead of the pagination of the website
    LaunchedEffect(nearEnd, state.hasMore, state.loading) {
        if (nearEnd && state.hasMore && !state.loading)
            viewModel.loadMore()
    }
    LaunchedEffect(Unit) { runCatching { searchFocus.requestFocus() } }

    LazyVerticalGrid(
        columns = GridCells.Fixed(columns),
        state = gridState,
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = SCREEN_PADDING, end = SCREEN_PADDING, bottom = SCREEN_PADDING),
        horizontalArrangement = Arrangement.spacedBy(28.dp),
        verticalArrangement = Arrangement.spacedBy(28.dp),
    ) {
        fullLine("top") {
            TopBar(nav, when (type) {
                MOVIES -> TopBarItem.Movies
                SERIES -> TopBarItem.Series
                else -> TopBarItem.Search
            }, horizontalPadding = 0.dp)
        }
        fullLine("search") {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                HtTextField(
                    value = state.text,
                    onValueChange = viewModel::setText,
                    placeholder = state.special?.let { specialTitle(it) } ?: stringResource(placeholder(state.type)),
                    style = HtText.Hero,
                    underline = true,
                    imeAction = ImeAction.Search,
                    modifier = Modifier.weight(1f).focusRequester(searchFocus),
                )
                if (state.text.isNotEmpty() || state.special != null)
                    HtButton(null, icon = Icons.Default.Close, variant = ButtonVariant.Ghost, onClick = {
                        if (state.text.isNotEmpty()) viewModel.setText("") else viewModel.clearSpecial()
                    })
            }
        }
        fullLine("filters") {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(vertical = 8.dp)) {
                items(SEARCH_TYPES) { searchType ->
                    HtChip(stringResource(typeName(searchType)), selected = state.type == searchType, onClick = { viewModel.setType(searchType) })
                }
            }
        }

        when {
            state.error -> fullLine("error") {
                CenteredMessage(stringResource(R.string.error_network)) {
                    HtButton(stringResource(R.string.retry), onClick = { viewModel.reload() })
                }
            }
            state.loading && state.page == 0 && state.isMedia -> items(6) { Placeholder(Modifier.aspectRatio(10f / 7f)) }
            !state.loading && state.isMedia && medias.isEmpty() -> fullLine("empty") { CenteredMessage(stringResource(R.string.search_no_results)) }
            !state.loading && state.type == PEOPLE && state.people.isEmpty() -> fullLine("empty") { CenteredMessage(stringResource(R.string.search_no_people)) }
            !state.loading && state.type == USERS && state.users.isEmpty() -> fullLine("empty") { CenteredMessage(stringResource(R.string.search_no_users)) }
            state.isMedia && state.special == SEARCH_FRIENDS -> items(medias) { activity ->
                ActivityRow(activity, onClick = { nav.media(activity.type, activity.id) }, onLongClick = { menu = activity.menuTarget(showEpisode = true) })
            }
            state.isMedia -> {
                val upcoming = state.special == SEARCH_UPCOMING
                val showEpisode = upcoming || state.special == SEARCH_CONTINUE
                items(medias) { media ->
                    MediaCard(
                        media,
                        onClick = { nav.media(media.type, media.id) },
                        onLongClick = { menu = media.menuTarget(showEpisode) },
                        showEpisode = showEpisode,
                        showProgress = !upcoming,
                        label = if (upcoming) formatDate(media.releaseDate) else null,
                    )
                }
            }
            state.type == PEOPLE -> items(state.people) { people -> PersonCard(people, onClick = { nav.person(people.id) }) }
            else -> items(state.users) { other ->
                UserRow(other, canFollow = user != null && user?.id != other.id, onClick = { nav.user(other.id) }, onFollow = { viewModel.toggleFollow(other) })
            }
        }
    }

    menu?.let { MediaMenu(it, onDismiss = { menu = null }) }
}

@Composable
private fun specialTitle(special: String): String = when (special) {
    SEARCH_CONTINUE -> stringResource(R.string.home_continue_watching)
    SEARCH_UPCOMING -> stringResource(R.string.home_coming_soon)
    SEARCH_FRIENDS -> stringResource(R.string.home_friends_activity)
    SEARCH_DIRECTSTREAM -> stringResource(R.string.home_direct_stream)
    SEARCH_FEATURED -> stringResource(R.string.home_featured)
    SEARCH_TOP_RATED -> stringResource(R.string.home_most_rated)
    SEARCH_POPULAR -> stringResource(R.string.home_popular)
    else -> special
}

private fun placeholder(type: String) = when (type) {
    SERIES -> R.string.search_placeholder_series
    PEOPLE -> R.string.search_placeholder_people
    USERS -> R.string.search_placeholder_users
    else -> R.string.search_placeholder_movies
}

private fun typeName(type: String) = when (type) {
    SERIES -> R.string.search_type_series
    PEOPLE -> R.string.search_type_people
    USERS -> R.string.search_type_users
    else -> R.string.search_type_movies
}

// Row of the friends activity list (FriendsActivityList on the website)
@Composable
private fun ActivityRow(activity: Media, onClick: () -> Unit, onLongClick: () -> Unit) {
    var focused by remember { mutableStateOf(false) }

    FocusSurface(onClick = onClick, onLongClick = onLongClick, modifier = Modifier.fillMaxWidth().onFocusChanged { focused = it.hasFocus }, focusedScale = 1.02f) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            NetworkImage(activity.episode?.posterUrl ?: activity.backdropUrl, Modifier.width(180.dp).aspectRatio(3f / 2f).border(1.dp, if (focused) LocalAccent.current else Color.Transparent), contentDescription = activity.title)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(activity.title.uppercase(), style = HtText.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                activity.episode?.let { episode ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        EpisodeLabel(episode.seasonNumber, episode.episodeNumber, color = HtColors.Gray)
                        episode.name?.let { SmallText(it) }
                    }
                }
            }
            activity.user?.let { friend ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ProfilePicture(friend, size = 36.dp)
                    Text(friend.username, style = HtText.Bold)
                }
            }
            if (activity.rewatch == true)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    HtIcon(HtIcons.Rewatch, size = 16.dp)
                    SmallText(stringResource(R.string.media_rewatch), color = HtColors.DBlack)
                }
            formatDate(activity.watchedAt)?.let { SmallText(it) }
        }
    }
}

@Composable
private fun PersonCard(people: People, onClick: () -> Unit) {
    // Focus: light background and accent outline, the name keeps its color
    FocusSurface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        focusedScale = 1.03f,
        focusedContainerColor = HtColors.DWhiteLight,
        border = BorderStroke(2.dp, Color.Transparent),
        focusedBorderColor = LocalAccent.current,
    ) {
        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            NetworkImage(people.picture, Modifier.width(105.dp).height(140.dp), contentDescription = people.name, noise = false)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(people.name, style = HtText.Bold.copy(fontSize = 20.sp, lineHeight = 26.sp), maxLines = 2, overflow = TextOverflow.Ellipsis)
                people.department?.let { SmallText(it) }
                if (people.knownFor.isNotEmpty())
                    Text(
                        people.knownFor.joinToString(", ") { it.title },
                        style = HtText.Small,
                        color = HtColors.Gray,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 4.dp),
                    )
            }
        }
    }
}

@Composable
private fun UserRow(user: User, canFollow: Boolean, onClick: () -> Unit, onFollow: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        // OK opens the profile with the history, same focus as the people cards
        FocusSurface(
            onClick = onClick,
            modifier = Modifier.weight(1f),
            focusedScale = 1.01f,
            focusedContainerColor = HtColors.DWhiteLight,
            border = BorderStroke(2.dp, Color.Transparent),
            focusedBorderColor = LocalAccent.current,
        ) {
            Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                ProfilePicture(user, size = 56.dp)
                Text(user.username, style = HtText.Bold.copy(fontSize = 20.sp, lineHeight = 26.sp), modifier = Modifier.weight(1f))
            }
        }
        if (canFollow)
            HtButton(
                stringResource(if (user.isFollowing == true) R.string.unfollow else R.string.follow),
                variant = if (user.isFollowing == true) ButtonVariant.Outline else ButtonVariant.Primary,
                onClick = onFollow,
            )
    }
}
