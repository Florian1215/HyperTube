@file:OptIn(ExperimentalTvMaterial3Api::class, ExperimentalComposeUiApi::class)

package com.hypertube.tv.ui.details

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.hypertube.tv.R
import com.hypertube.tv.data.Episode
import com.hypertube.tv.data.MediaDetails
import com.hypertube.tv.data.PERM_RECOMMEND
import com.hypertube.tv.data.SERIES
import com.hypertube.tv.ui.LocalAppContainer
import com.hypertube.tv.ui.Navigator
import com.hypertube.tv.ui.TopBar
import com.hypertube.tv.ui.TopBarItem
import com.hypertube.tv.ui.components.BigTitle
import com.hypertube.tv.ui.components.ButtonVariant
import com.hypertube.tv.ui.components.CenteredMessage
import com.hypertube.tv.ui.components.ColorsBar
import com.hypertube.tv.ui.components.EpisodeLabel
import com.hypertube.tv.ui.components.FeatureDialog
import com.hypertube.tv.ui.components.FocusSurface
import com.hypertube.tv.ui.components.HtButton
import com.hypertube.tv.ui.components.HtChip
import com.hypertube.tv.ui.components.HtIcon
import com.hypertube.tv.ui.components.HtIcons
import com.hypertube.tv.ui.components.MediaMenu
import com.hypertube.tv.ui.components.MenuTarget
import com.hypertube.tv.ui.components.NetworkImage
import com.hypertube.tv.ui.components.Placeholder
import com.hypertube.tv.ui.components.ProfilePicture
import com.hypertube.tv.ui.components.ProgressLine
import com.hypertube.tv.ui.components.SmallText
import com.hypertube.tv.ui.components.menuTarget
import com.hypertube.tv.ui.currentUser
import com.hypertube.tv.ui.home.HERO_RATIO
import com.hypertube.tv.ui.home.SCREEN_PADDING
import com.hypertube.tv.ui.player.VideoPlayer
import com.hypertube.tv.ui.theme.DarkMode
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.ui.theme.LocalAccent
import com.hypertube.tv.util.formatDate
import com.hypertube.tv.util.isFuture
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val CONTENT_WIDTH = 1040.dp

private enum class MediaDialog { WatchedBy, Feature }

// Color of the info labels, accent while the info block is focused

@Composable
fun MediaScreen(nav: Navigator, type: String, id: String) {
    val container = LocalAppContainer.current
    val viewModel: MediaViewModel = viewModel { MediaViewModel(container, type, id) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val user by currentUser()
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val playFocus = remember { FocusRequester() }
    var dialog by remember { mutableStateOf<MediaDialog?>(null) }
    var menu by remember { mutableStateOf<MenuTarget?>(null) }
    var seasonTab by rememberSaveable { mutableIntStateOf(-1) }
    val media = state.media
    val streamUrl = state.streamUrl

    // Like the website, the player replaces the page while it plays
    if (media != null && streamUrl != null) {
        // The player stays dark in the light mode, like on the website
        DarkMode {
            Box(Modifier.fillMaxSize()) {
                key(streamUrl, state.playerKey) {
                    VideoPlayer(
                        url = streamUrl,
                        startAt = state.resumeAt,
                        runtimeMinutes = state.runtime ?: 0,
                        title = media.title,
                        seasonNumber = if (media.isSeries) state.watched.season else null,
                        episodeNumber = if (media.isSeries) state.watched.episode else null,
                        episodeName = state.episodeDetails?.name,
                        preferredAudio = user?.let { if (it.preferredLanguage == "vf") "fr" else media.originalLanguage },
                        trackProgress = user != null,
                        hasNext = state.following != null,
                        onProgress = viewModel::reportProgress,
                        onNextShown = viewModel::preloadFollowing,
                        onNext = viewModel::playFollowing,
                        onEnded = { if (media.isSeries) viewModel.playFollowing() else viewModel.closePlayer() },
                        onError = viewModel::onPlayerError,
                        onClose = { viewModel.closePlayer() },
                    )
                }
                state.playerError?.let { error -> PlayerError(media, error, onReload = viewModel::reloadPlayer, onClose = { viewModel.closePlayer() }) }
            }
        }
        return
    }

    LazyColumn(Modifier.fillMaxSize(), state = listState, verticalArrangement = Arrangement.spacedBy(24.dp)) {
        item { TopBar(nav, TopBarItem.None) }
        when {
            state.notFound -> item { CenteredMessage(stringResource(if (type == SERIES) R.string.error_not_found_series else R.string.error_not_found_movie)) }
            state.error -> item {
                CenteredMessage(stringResource(R.string.error_network)) { HtButton(stringResource(R.string.retry), onClick = viewModel::load) }
            }
            media == null -> item { Placeholder(Modifier.fillMaxWidth().padding(horizontal = SCREEN_PADDING).aspectRatio(HERO_RATIO)) }
            else -> {
                item { MediaHero(media, state, playFocus, onPlay = { viewModel.play() }) }
                item {
                    MediaActions(
                        media = media,
                        state = state,
                        canFeature = user?.hasPerm(PERM_RECOMMEND) == true,
                        signedIn = user != null,
                        onWatchlist = viewModel::toggleWatchlist,
                        onFeature = { dialog = MediaDialog.Feature },
                        onRequest = viewModel::toggleTorrentRequest,
                        onCancel = { viewModel.closePlayer() },
                    )
                }
                item {
                    InfoSection(
                        media = media,
                        watchedBy = if (media.isSeries) state.episodeDetails?.watchedBy.orEmpty() else media.watchedBy,
                        onDialog = { dialog = it },
                    )
                }
                if (media.isSeries) {
                    val tab = if (seasonTab == -1) state.watched.season else seasonTab
                    seasonsSection(media, tab, state, onTab = {
                        seasonTab = it
                        viewModel.loadSeason(it)
                    }, onEpisode = { episode ->
                        viewModel.selectEpisode(episode)
                        scope.launch {
                            listState.animateScrollToItem(0)
                            delay(150)
                            runCatching { playFocus.requestFocus() }
                        }
                    }, onMenu = { menu = it })
                } else
                    collectionSection(media, state, onOpen = { part -> nav.media(part.type, part.id) }, onMenu = { menu = it })
                item { ColorsBar(Modifier.padding(top = 16.dp)) }
            }
        }
    }

    LaunchedEffect(media != null) {
        if (media != null) {
            delay(150)
            runCatching { playFocus.requestFocus() }
        }
    }
    if (media != null && state.isSeries)
        LaunchedEffect(seasonTab, state.watched.season) { viewModel.loadSeason(if (seasonTab == -1) state.watched.season else seasonTab) }

    menu?.let { MediaMenu(it, onDismiss = { menu = null }) }
    if (media != null)
        when (dialog) {
            MediaDialog.WatchedBy -> WatchedByDialog(if (media.isSeries) state.episodeDetails?.watchedBy.orEmpty() else media.watchedBy, onDismiss = { dialog = null })
            MediaDialog.Feature -> FeatureDialog(media.toMedia(), details = media, onDismiss = { dialog = null })
            null -> Unit
        }
}

/* ------------------------------------------------------ HERO ------------------------------------------------------ */
// The whole hero is focusable like the website where a click on the backdrop plays the media, OK starts the playback
@Composable
private fun MediaHero(media: MediaDetails, state: MediaState, playFocus: FocusRequester, onPlay: () -> Unit) {
    val type = media.type
    val available = !state.torrentsLoading && state.best != null

    FocusSurface(
        onClick = { if (!state.starting) onPlay() },
        focusedScale = 1.01f,
        border = BorderStroke(1.dp, HtColors.DBlack),
        focusedBorderColor = LocalAccent.current,
        modifier = Modifier.fillMaxWidth().padding(horizontal = SCREEN_PADDING).aspectRatio(HERO_RATIO).focusRequester(playFocus),
    ) {
        NetworkImage(media.backdropUrl, Modifier.fillMaxSize(), contentDescription = media.title)
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f)))))
        Column(
            Modifier.align(Alignment.BottomCenter).padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (media.isSeries)
                EpisodeLabel(state.watched.season, state.watched.episode, color = HtColors.White)
            when {
                state.starting -> Text(
                    stringResource(if (type == SERIES) R.string.media_downloading_series else R.string.media_downloading_movie),
                    style = HtText.Small, color = HtColors.White, textAlign = TextAlign.Center, modifier = Modifier.widthIn(max = 420.dp),
                )
                state.unavailable -> Text(
                    stringResource(when {
                        state.torrentRequest?.requested == true && type == SERIES -> R.string.torrent_requested_series
                        state.torrentRequest?.requested == true -> R.string.torrent_requested_movie
                        type == SERIES -> R.string.torrent_unavailable_series
                        else -> R.string.torrent_unavailable_movie
                    }),
                    style = HtText.Small, color = HtColors.White,
                )
                else -> Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    val color = if (available) HtColors.White else HtColors.Gray
                    HtIcon(HtIcons.Play, size = 18.dp, tint = color)
                    Text(stringResource(if (state.resumeAt > 0) R.string.media_resume else R.string.media_watch), style = HtText.Bold, color = color)
                }
            }
        }
    }
}

// Title and buttons under the hero (the title is under the hero on the website too)
@Composable
private fun MediaActions(
    media: MediaDetails,
    state: MediaState,
    canFeature: Boolean,
    signedIn: Boolean,
    onWatchlist: () -> Unit,
    onFeature: () -> Unit,
    onRequest: () -> Unit,
    onCancel: () -> Unit,
) {
    Column(Modifier.fillMaxWidth().padding(horizontal = SCREEN_PADDING), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        BigTitle(media.title, exponent = media.year)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            if (state.starting)
                HtButton(stringResource(R.string.cancel), variant = ButtonVariant.Outline, onClick = onCancel)
            if (signedIn)
                HtButton(
                    stringResource(R.string.media_watchlist),
                    icon = if (media.inWatchlist == true) HtIcons.BookmarkFilled else HtIcons.Bookmark,
                    variant = ButtonVariant.Outline,
                    onClick = onWatchlist,
                )
            if (canFeature)
                HtButton(stringResource(R.string.media_set_feature), icon = Icons.Default.Star, variant = ButtonVariant.Outline, onClick = onFeature)
            if (state.unavailable && state.torrentRequest != null)
                HtButton(
                    stringResource(if (state.torrentRequest.requested) R.string.torrent_cancel_request else R.string.torrent_request),
                    variant = ButtonVariant.Outline,
                    onClick = onRequest,
                )
        }
    }
}

@Composable
private fun PlayerError(media: MediaDetails, error: String, onReload: () -> Unit, onClose: () -> Unit) {
    val focus = remember { FocusRequester() }

    Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.8f)), contentAlignment = Alignment.Center) {
        Column(
            Modifier.widthIn(max = 560.dp).background(HtColors.White).padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text(stringResource(if (media.isSeries) R.string.media_error_series else R.string.media_error_movie), style = HtText.Bold, color = HtColors.Red, textAlign = TextAlign.Center)
            Text(error, style = HtText.Small, color = HtColors.Gray, textAlign = TextAlign.Center)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                HtButton(stringResource(R.string.media_reload_player), onClick = onReload, modifier = Modifier.focusRequester(focus))
                HtButton(stringResource(R.string.cancel), onClick = onClose, variant = ButtonVariant.Outline)
            }
        }
    }
    LaunchedEffect(Unit) { runCatching { focus.requestFocus() } }
}

/* ------------------------------------------------------ INFO ------------------------------------------------------ */
@Composable
private fun InfoSection(media: MediaDetails, watchedBy: List<com.hypertube.tv.data.WatchedBy>, onDialog: (MediaDialog) -> Unit) {
    val directors = media.crew.filter { it.job == "Director" }
    val creators = media.crew.filter { it.job == "Creator" }
    var focused by remember { mutableStateOf(false) }

    Column(
        Modifier.fillMaxWidth().padding(horizontal = SCREEN_PADDING),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Focusable so the remote can scroll from the hero to the infos even when there is no button to focus
        Column(
            Modifier
                .widthIn(max = CONTENT_WIDTH)
                .onFocusChanged { focused = it.isFocused }
                .focusable()
                .background(if (focused) HtColors.DWhiteLight else Color.Transparent)
                .padding(vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (isFuture(media.releaseDate))
                InfoRow(stringResource(R.string.media_release)) { Text(formatDate(media.releaseDate).orEmpty(), style = HtText.Body) }
            if (media.rating > 0)
                InfoRow(stringResource(R.string.media_rating)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        HtIcon(Icons.Default.Star, tint = LocalAccent.current, size = 18.dp)
                        Text("%.1f".format(media.rating), style = HtText.Bold)
                    }
                }
            if (watchedBy.isNotEmpty())
                InfoRow(stringResource(R.string.media_watched_by), onClick = { onDialog(MediaDialog.WatchedBy) }) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        watchedBy.take(10).forEach { ProfilePicture(it.toUser(), size = 32.dp) }
                    }
                }
            statusName(media)?.let { InfoRow(stringResource(R.string.media_status)) { Text(it, style = HtText.Body) } }
            if ((media.runtime ?: 0) > 0 && !media.isSeries)
                InfoRow(stringResource(R.string.media_length)) { Text(com.hypertube.tv.util.formatRuntime(media.runtime ?: 0), style = HtText.Body) }
            if (media.genres.isNotEmpty())
                InfoRow(stringResource(R.string.media_genre)) {
                    Text(com.hypertube.tv.data.genresOf(media.genres).joinToString(", ") { it.name }, style = HtText.Body)
                }
            PeopleRow(stringResource(R.string.media_directors), directors.map { it.name })
            PeopleRow(stringResource(R.string.media_creators), creators.map { it.name })
            PeopleRow(stringResource(R.string.media_stars), media.cast.take(5).map { it.name })
            if (media.summary.isNotBlank())
                InfoRow(stringResource(R.string.media_synopsis)) { Text(media.summary, style = HtText.Body) }
        }
    }
}

@Composable
private fun PeopleRow(name: String, people: List<String>) {
    if (people.isEmpty())
        return
    InfoRow(name) { Text(people.joinToString(", "), style = HtText.Body) }
}

// InfoMedia of the website: label on the left, value on the right; focusable when it opens something
@Composable
private fun InfoRow(name: String, onClick: (() -> Unit)? = null, content: @Composable () -> Unit) {
    val row = @Composable {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(24.dp)) {
            Text(name.replaceFirstChar { it.uppercase() }, style = HtText.Bold.copy(fontSize = 18.sp), textAlign = TextAlign.End, modifier = Modifier.weight(1f), maxLines = 1)
            Box(Modifier.weight(2f)) { content() }
        }
    }
    if (onClick == null)
        row()
    else
        FocusSurface(onClick = onClick, focusedScale = 1.01f, focusedContainerColor = HtColors.DWhiteLight, modifier = Modifier.fillMaxWidth()) { row() }
}

@Composable
private fun statusName(media: MediaDetails): String? = when (media.status) {
    null, "Released" -> null
    "Rumored" -> stringResource(R.string.status_rumored)
    "Planned" -> stringResource(R.string.status_planned)
    "In Production" -> stringResource(R.string.status_in_production)
    "Post Production" -> stringResource(R.string.status_post_production)
    "Canceled" -> stringResource(R.string.status_canceled)
    "Returning Series" -> stringResource(R.string.status_returning)
    "Ended" -> stringResource(R.string.status_ended)
    "Pilot" -> stringResource(R.string.status_pilot)
    else -> media.status
}

/* ----------------------------------------------------- SEASONS ---------------------------------------------------- */
private fun LazyListScope.seasonsSection(
    serie: MediaDetails,
    tab: Int,
    state: MediaState,
    onTab: (Int) -> Unit,
    onEpisode: (WatchEpisode) -> Unit,
    onMenu: (MenuTarget) -> Unit,
) {
    val season = state.seasons[tab]
    val count = serie.numberOfSeasons ?: 0

    item {
        CenteredColumn {
            BigTitle(stringResource(R.string.serie_seasons), exponent = count.toString())
            val active = remember { FocusRequester() }
            // Coming from the infos or the episodes, the focus goes to the active season instead of the first one
            LazyRow(
                Modifier.focusProperties { enter = { active } },
                state = rememberLazyListState(initialFirstVisibleItemIndex = (tab - 1).coerceAtLeast(0)),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(vertical = 8.dp, horizontal = 4.dp),
            ) {
                items((1..count).toList()) { number ->
                    HtChip(
                        stringResource(R.string.serie_season_number, number),
                        selected = number == tab,
                        onClick = { onTab(number) },
                        modifier = if (number == tab) Modifier.focusRequester(active) else Modifier,
                    )
                }
            }
        }
    }
    if (season == null) {
        item { CenteredColumn { Placeholder(Modifier.fillMaxWidth().height(200.dp)) } }
        return
    }
    item {
        CenteredColumn {
            Box(Modifier.fillMaxWidth().height(200.dp).border(1.dp, HtColors.DBlack)) {
                NetworkImage(season.posterUrl, Modifier.fillMaxSize())
                if (season.complete)
                    Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.55f)))
                else if (season.pourcent > 0)
                    ProgressLine((season.pourcent / 100).toFloat(), Modifier.align(Alignment.BottomCenter))
            }
            // Number of episodes and overview aligned on the left, under the season image
            Column(Modifier.fillMaxWidth().padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text(
                        pluralStringResource(R.plurals.serie_episodes_count, season.episodes.size, season.episodes.size).uppercase(),
                        style = HtText.Title.copy(fontSize = 34.sp, lineHeight = 34.sp),
                    )
                    SmallText(season.releaseDate?.take(4).orEmpty())
                }
                if (season.overview.isNotBlank())
                    Text(season.overview, style = HtText.Small, color = HtColors.Gray, maxLines = 3, overflow = TextOverflow.Ellipsis)
            }
        }
    }
    val sameDate = season.episodes.size > 1 && season.episodes.first().releaseDate == season.episodes.last().releaseDate
    items(season.episodes, key = { "episode-${it.id}" }) { episode ->
        CenteredColumn {
            EpisodeRow(
                episode = episode,
                selected = season.seasonNumber == state.watched.season && episode.episodeNumber == state.watched.episode,
                showDate = !sameDate,
                onClick = { onEpisode(WatchEpisode(season.seasonNumber, episode.episodeNumber, if (episode.complete) 0.0 else episode.progress)) },
                onLongClick = {
                    onMenu(MenuTarget(serie.toMedia(), season.seasonNumber, episode.episodeNumber, episode.complete, episode.pourcent, episode.progress,
                        title = "S${season.seasonNumber} · E${episode.episodeNumber} ${episode.name}"))
                },
            )
        }
    }
}

// MediaRow of the website: number, image, title, subtitle, overview and progress
@Composable
private fun EpisodeRow(episode: Episode, selected: Boolean, showDate: Boolean, onClick: () -> Unit, onLongClick: () -> Unit) {
    val minutes = episode.runtime?.let { stringResource(R.string.serie_minutes, it) }
    val subtitle = listOfNotNull(minutes, if (showDate) formatDate(episode.releaseDate) else null).joinToString(" - ")

    MediaRowItem(
        number = episode.episodeNumber,
        title = episode.name,
        subtitle = subtitle,
        overview = episode.overview,
        image = episode.posterUrl,
        selected = selected,
        complete = episode.complete,
        pourcent = episode.pourcent,
        onClick = onClick,
        onLongClick = onLongClick,
    )
}

@Composable
private fun MediaRowItem(
    number: Int,
    title: String,
    subtitle: String,
    overview: String?,
    image: String?,
    selected: Boolean,
    complete: Boolean,
    pourcent: Double,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
) {
    val accent = LocalAccent.current

    // Focus: light background and accent outline, selected (current episode / movie): outline around the image
    FocusSurface(
        onClick = onClick,
        onLongClick = onLongClick,
        modifier = Modifier.fillMaxWidth(),
        focusedScale = 1.02f,
        focusedContainerColor = HtColors.DWhiteLight,
        border = BorderStroke(2.dp, Color.Transparent),
        focusedBorderColor = accent,
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            Text(number.toString(), style = HtText.Title.copy(fontSize = 36.sp, lineHeight = 36.sp), modifier = Modifier.width(44.dp), textAlign = TextAlign.Start)
            Box(Modifier.width(220.dp).aspectRatio(16f / 9f).border(2.dp, if (selected) accent else Color.Transparent)) {
                NetworkImage(image, Modifier.fillMaxSize(), contentDescription = title)
                if (complete)
                    Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.55f))) {
                        HtIcon(HtIcons.Eye, size = 20.dp, tint = HtColors.White, modifier = Modifier.align(Alignment.TopEnd).padding(8.dp))
                    }
                else if (pourcent > 0)
                    ProgressLine((pourcent / 100).toFloat(), Modifier.align(Alignment.BottomCenter))
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, style = HtText.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (subtitle.isNotBlank())
                    SmallText(subtitle)
                if (!overview.isNullOrBlank())
                    Text(overview, style = HtText.Small, color = HtColors.DBlackLight, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

/* ---------------------------------------------------- COLLECTION -------------------------------------------------- */
private fun LazyListScope.collectionSection(media: MediaDetails, state: MediaState, onOpen: (com.hypertube.tv.data.Media) -> Unit, onMenu: (MenuTarget) -> Unit) {
    val collection = state.collection ?: return
    val name = collection.name ?: return
    if (collection.parts.size < 2)
        return

    item { CenteredColumn { BigTitle(name, exponent = collection.parts.size.toString()) } }
    itemsIndexed(collection.parts, key = { _, part -> "part-${part.id}" }) { index, part ->
        val current = part.id == media.id
        CenteredColumn {
            MediaRowItem(
                number = index + 1,
                title = part.title,
                subtitle = part.year,
                overview = part.summary,
                image = part.backdropUrl ?: part.posterUrl,
                selected = current,
                complete = part.complete,
                pourcent = part.pourcent,
                onClick = { if (!current) onOpen(part) },
                onLongClick = { onMenu(part.menuTarget()) },
            )
        }
    }
}

@Composable
private fun CenteredColumn(content: @Composable () -> Unit) {
    Box(Modifier.fillMaxWidth().padding(horizontal = SCREEN_PADDING), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = CONTENT_WIDTH).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) { content() }
    }
}
