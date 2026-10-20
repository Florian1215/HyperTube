@file:OptIn(ExperimentalTvMaterial3Api::class, ExperimentalComposeUiApi::class)

package com.hypertube.tv.ui.home

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.focusRestorer
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.hypertube.tv.R
import com.hypertube.tv.data.MOVIES
import com.hypertube.tv.data.Media
import com.hypertube.tv.data.SEARCH_CONTINUE
import com.hypertube.tv.data.SEARCH_DIRECTSTREAM
import com.hypertube.tv.data.SEARCH_FEATURED
import com.hypertube.tv.data.SEARCH_FRIENDS
import com.hypertube.tv.data.SEARCH_POPULAR
import com.hypertube.tv.data.SEARCH_TOP_RATED
import com.hypertube.tv.data.SEARCH_UPCOMING
import com.hypertube.tv.data.activityKey
import com.hypertube.tv.ui.LocalAppContainer
import com.hypertube.tv.ui.Navigator
import com.hypertube.tv.ui.TopBar
import com.hypertube.tv.ui.TopBarItem
import com.hypertube.tv.ui.components.AvatarStack
import com.hypertube.tv.ui.components.CARD_WIDTH
import com.hypertube.tv.ui.components.CenteredMessage
import com.hypertube.tv.ui.components.ColorsBar
import com.hypertube.tv.ui.components.FocusSurface
import com.hypertube.tv.ui.components.HtButton
import com.hypertube.tv.ui.components.MediaCard
import com.hypertube.tv.ui.components.MediaMenu
import com.hypertube.tv.ui.components.MenuTarget
import com.hypertube.tv.ui.components.NetworkImage
import com.hypertube.tv.ui.components.Placeholder
import com.hypertube.tv.ui.components.SectionTitle
import com.hypertube.tv.ui.components.menuTarget
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.ui.theme.LocalAccent
import com.hypertube.tv.util.formatDate
import kotlinx.coroutines.delay

val SCREEN_PADDING: Dp = 48.dp
// Wider than 16:9 so the top bar and the next row stay visible around the heroes
const val HERO_RATIO = 2.4f
private val STACK_OFFSET = 44.dp
// Same gap between the title and the dots of the slider as between the dots and the bottom of the hero
private val HERO_DOT_SIZE = 6.dp
private val HERO_DOTS_GAP = 18.dp

@Composable
fun HomeScreen(nav: Navigator) {
    val container = LocalAppContainer.current
    val viewModel: HomeViewModel = viewModel { HomeViewModel(container) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    var menu by remember { mutableStateOf<MenuTarget?>(null) }
    val heroFocus = remember { FocusRequester() }
    val open = { media: Media -> nav.media(media.type, media.id) }

    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(28.dp)) {
        item { TopBar(nav, TopBarItem.None) }
        item { Hero(state.featured?.take(5), onOpen = open, focusRequester = heroFocus) }
        if (state.error)
            item {
                CenteredMessage(stringResource(R.string.error_network)) {
                    HtButton(stringResource(R.string.retry), onClick = viewModel::load)
                }
            }
        if (state.friends.isNotEmpty())
            item {
                Section(stringResource(R.string.home_friends_activity), onSeeAll = { nav.search(state.friends.first().first().type, SEARCH_FRIENDS) }) {
                    LazyRow(Modifier.focusRestorer(), contentPadding = PaddingValues(horizontal = SCREEN_PADDING, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                        items(state.friends, key = { activityKey(it.first()) }) { stack ->
                            FriendStack(stack, onOpen = open, onLongClick = { menu = it.menuTarget(showEpisode = true) })
                        }
                    }
                }
            }
        if (state.continueWatching.isNotEmpty())
            item {
                MediaSection(stringResource(R.string.home_continue_watching), state.continueWatching, onSeeAll = { nav.search(state.continueWatching.first().type, SEARCH_CONTINUE) },
                    onOpen = open, onMenu = { menu = it.menuTarget(showEpisode = true) }, showEpisode = true)
            }
        val featured = state.featured
        if (featured == null || featured.size > 5)
            item {
                MediaSection(stringResource(R.string.home_featured), featured?.drop(5)?.take(5), onSeeAll = { nav.search(MOVIES, SEARCH_FEATURED) },
                    onOpen = open, onMenu = { menu = it.menuTarget() })
            }
        if (state.popular?.isEmpty() != true)
            item {
                MediaSection(stringResource(R.string.home_popular), state.popular, onSeeAll = { nav.search(state.popular?.firstOrNull()?.type ?: MOVIES, SEARCH_POPULAR) },
                    onOpen = open, onMenu = { menu = it.menuTarget() })
            }
        if (state.mostRated?.isEmpty() != true)
            item {
                MediaSection(stringResource(R.string.home_most_rated), state.mostRated, onSeeAll = { nav.search(MOVIES, SEARCH_TOP_RATED) },
                    onOpen = open, onMenu = { menu = it.menuTarget() })
            }
        if (state.comingSoon.isNotEmpty())
            item {
                MediaSection(stringResource(R.string.home_coming_soon), state.comingSoon, onSeeAll = { nav.search(state.comingSoon.first().type, SEARCH_UPCOMING) },
                    onOpen = open, onMenu = { menu = it.menuTarget(showEpisode = true) }, showEpisode = true, showProgress = false, label = { formatDate(it.releaseDate) })
            }
        if (state.directStream.isNotEmpty())
            item {
                MediaSection(stringResource(R.string.home_direct_stream), state.directStream, onSeeAll = { nav.search(state.directStream.first().type, SEARCH_DIRECTSTREAM) },
                    onOpen = open, onMenu = { menu = it.menuTarget() })
            }
        item { ColorsBar(Modifier.padding(top = 16.dp)) }
    }

    menu?.let { MediaMenu(it, onDismiss = { menu = null }) }

    // The hero gets the focus when the page opens, once its content is there
    var focused by remember { mutableStateOf(false) }
    LaunchedEffect(state.featured) {
        if (!focused && !state.featured.isNullOrEmpty()) {
            delay(100)
            focused = runCatching { heroFocus.requestFocus() }.isSuccess
        }
    }
}

@Composable
private fun Section(title: String, onSeeAll: () -> Unit, content: @Composable () -> Unit) {
    var rowFocused by remember { mutableStateOf(false) }
    var titleFocused by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        // Going down skips the title to the medias, the title ("see all") is only reached going up from its medias
        SectionTitle(
            title,
            onClick = onSeeAll,
            modifier = Modifier
                .padding(horizontal = SCREEN_PADDING - 6.dp)
                .onFocusChanged { titleFocused = it.hasFocus }
                .focusProperties { canFocus = rowFocused || titleFocused },
        )
        Box(Modifier.onFocusChanged { rowFocused = it.hasFocus }) { content() }
    }
}

@Composable
fun MediaSection(
    title: String,
    medias: List<Media>?,
    onSeeAll: () -> Unit,
    onOpen: (Media) -> Unit,
    onMenu: (Media) -> Unit,
    showEpisode: Boolean = false,
    showProgress: Boolean = true,
    label: (Media) -> String? = { null },
) {
    val first = remember { FocusRequester() }

    Section(title, onSeeAll) {
        // The first media the first time, then the last focused one
        LazyRow(Modifier.focusRestorer { first }, contentPadding = PaddingValues(horizontal = SCREEN_PADDING, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            if (medias == null)
                items(5) { Placeholder(Modifier.width(CARD_WIDTH).height(CARD_WIDTH * 0.7f)) }
            else
                itemsIndexed(medias, key = { _, it -> "${it.type}-${it.id}-${it.episode?.id}" }) { index, media ->
                    MediaCard(media, onClick = { onOpen(media) }, onLongClick = { onMenu(media) },
                        modifier = Modifier.width(CARD_WIDTH).then(if (index == 0) Modifier.focusRequester(first) else Modifier),
                        showEpisode = showEpisode, showProgress = showProgress, label = label(media))
                }
        }
    }
}

// Featured medias, auto slide every 6 seconds unless the hero has the focus (the hover on the website)
@Composable
private fun Hero(medias: List<Media>?, onOpen: (Media) -> Unit, focusRequester: FocusRequester) {
    if (medias.isNullOrEmpty()) {
        Placeholder(Modifier.fillMaxWidth().padding(horizontal = SCREEN_PADDING).aspectRatio(HERO_RATIO))
        return
    }
    var index by remember { mutableIntStateOf(0) }
    // 1 slides from the right, -1 from the left
    var direction by remember { mutableIntStateOf(1) }
    val current = medias[index % medias.size]
    val slide = { side: Int ->
        direction = side
        index = (index + side + medias.size) % medias.size
    }

    // Automatic slider like the website, the timer restarts after each slide
    LaunchedEffect(index, medias.size) {
        if (medias.size < 2)
            return@LaunchedEffect
        delay(6000)
        slide(1)
    }

    // The whole hero is focusable: OK opens the media, left/right change the slide
    FocusSurface(
        onClick = { onOpen(current) },
        focusedScale = 1.01f,
        border = BorderStroke(1.dp, HtColors.DBlack),
        focusedBorderColor = LocalAccent.current,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = SCREEN_PADDING)
            .aspectRatio(HERO_RATIO)
            .onPreviewKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown || medias.size < 2)
                    return@onPreviewKeyEvent false
                when (event.key) {
                    Key.DirectionLeft -> slide(-1)
                    Key.DirectionRight -> slide(1)
                    else -> return@onPreviewKeyEvent false
                }
                true
            }
            .focusRequester(focusRequester),
    ) {
        AnimatedContent(
            targetState = current,
            transitionSpec = {
                slideInHorizontally(tween(600)) { it * direction } togetherWith slideOutHorizontally(tween(600)) { -it * direction }
            },
            modifier = Modifier.fillMaxSize().clipToBounds(),
            label = "hero",
        ) { media ->
            Box(Modifier.fillMaxSize()) {
                NetworkImage(media.backdropUrl, Modifier.fillMaxSize(), contentDescription = media.title)
                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.9f)))))
                Text(
                    media.title.uppercase(),
                    style = HtText.Hero,
                    color = HtColors.White,
                    textAlign = TextAlign.Center,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = HERO_DOTS_GAP * 2 + HERO_DOT_SIZE).fillMaxWidth(0.7f),
                )
            }
        }
        Row(Modifier.align(Alignment.BottomCenter).padding(bottom = HERO_DOTS_GAP), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            medias.indices.forEach { i ->
                Box(Modifier.size(HERO_DOT_SIZE).clip(CircleShape).background(if (i == index % medias.size) HtColors.White else HtColors.Gray))
            }
        }
    }
}

// Port of FriendActivityCard: the episodes seen by the same friends are stacked,
// the focused one comes to the front (the hover on the website)
@Composable
private fun FriendStack(stack: List<Media>, onOpen: (Media) -> Unit, onLongClick: (Media) -> Unit) {
    val episodes = stack.distinctBy { activityKey(it) }
    val users = stack.mapNotNull { it.user }.distinctBy { it.id }
    var focused by remember { mutableIntStateOf(-1) }

    Box(Modifier.width(CARD_WIDTH + STACK_OFFSET * (episodes.size - 1))) {
        episodes.forEachIndexed { index, episode ->
            Box(
                Modifier
                    .padding(start = STACK_OFFSET * index)
                    .width(CARD_WIDTH)
                    .zIndex(if (focused == index) 100f else (episodes.size - index).toFloat())
                    .onFocusChanged {
                        if (it.hasFocus)
                            focused = index
                        else if (focused == index)
                            focused = -1
                    },
            ) {
                MediaCard(episode, onClick = { onOpen(episode) }, onLongClick = { onLongClick(episode) }, showEpisode = true, showProgress = false, textOnFocus = true)
                if (index == 0)
                    AvatarStack(users.take(6), Modifier.align(Alignment.BottomStart).padding(8.dp), size = 28.dp)
            }
        }
        Spacer(Modifier.width(1.dp))
    }
}
