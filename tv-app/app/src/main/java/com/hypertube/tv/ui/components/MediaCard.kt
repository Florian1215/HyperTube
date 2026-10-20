@file:OptIn(ExperimentalTvMaterial3Api::class)

package com.hypertube.tv.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Star
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.hypertube.tv.R
import com.hypertube.tv.data.Media
import com.hypertube.tv.data.MediaDetails
import com.hypertube.tv.data.PERM_RECOMMEND
import com.hypertube.tv.ui.LocalAppContainer
import com.hypertube.tv.ui.currentUser
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.ui.theme.LocalAccent
import kotlinx.coroutines.launch
import com.hypertube.tv.util.formatDate

val CARD_WIDTH: Dp = 280.dp

// Slightly smaller than the page texts so the titles fit on the cards
private val CardTitle = HtText.Title.copy(fontSize = 40.sp, lineHeight = 40.sp)
private val CardSmall = HtText.Small.copy(fontSize = 12.sp, lineHeight = 16.sp)

// MediaCard of the website: backdrop (or episode poster), title, progress and watched state
@Composable
fun MediaCard(
    media: Media?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    onLongClick: (() -> Unit)? = null,
    showEpisode: Boolean = false,
    showProgress: Boolean = true,
    label: String? = null,
    titleStyle: TextStyle = CardTitle,
    // Title and episode only while the card has the focus (stacks of the friends activity)
    textOnFocus: Boolean = false,
    // Watched date (and rewatch icon) in the top right corner while focused, like the history of the website
    inHistory: Boolean = false,
) {
    if (media == null) {
        Placeholder(modifier.aspectRatio(10f / 7f))
        return
    }
    val episode = if (showEpisode) media.episode else null
    var focused by remember { mutableStateOf(false) }
    val watchedAt = if (inHistory && focused) formatDate(media.watchedAt) else null

    FocusSurface(onClick = onClick, onLongClick = onLongClick, modifier = modifier.aspectRatio(10f / 7f).onFocusChanged { focused = it.isFocused }, border = BorderStroke(1.dp, HtColors.DBlack), focusedBorderColor = LocalAccent.current) {
        NetworkImage(episode?.posterUrl ?: media.backdropUrl, Modifier.fillMaxSize(), contentDescription = media.title)
        Box(Modifier.fillMaxSize().background(BottomGradient))
        if (showProgress && media.complete)
            Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.55f))) {
                // In the history the eye only comes with the watched date, on focus
                if (!inHistory)
                    HtIcon(HtIcons.Eye, size = 22.dp, tint = HtColors.White, modifier = Modifier.align(Alignment.TopEnd).padding(10.dp))
            }
        if (watchedAt != null)
            Row(
                Modifier.align(Alignment.TopEnd).padding(10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                HtIcon(if (media.rewatch == true) HtIcons.Rewatch else HtIcons.Eye, size = 20.dp, tint = HtColors.White)
                Text(watchedAt, style = HtText.Bold.copy(fontSize = 14.sp, lineHeight = 18.sp), color = HtColors.White)
            }
        if (!textOnFocus || focused) Column(
            modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (label != null)
                Text(label, style = CardSmall, color = HtColors.White.copy(alpha = 0.7f))
            if (episode != null)
                Text(stringResource(R.string.serie_season_episode, episode.seasonNumber, episode.episodeNumber), style = CardSmall, color = HtColors.White)
            Text(
                media.title.uppercase(),
                style = titleStyle,
                color = HtColors.White,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        if (showProgress && !media.complete && media.pourcent > 0)
            ProgressLine((media.pourcent / 100).toFloat(), Modifier.align(Alignment.BottomCenter))
    }
}

// What a context menu acts on: a media, one of its seasons or one of its episodes
data class MenuTarget(
    val media: Media,
    val season: Int? = null,
    val episode: Int? = null,
    val complete: Boolean = media.complete,
    val pourcent: Double = media.pourcent,
    val progress: Double = media.progress,
    val title: String = media.title,
)

fun Media.menuTarget(showEpisode: Boolean = false) =
    if (showEpisode && episode != null) MenuTarget(this, episode.seasonNumber, episode.episodeNumber) else MenuTarget(this)

// Port of MediaRightClick: watchlist, watched state, featuring and progress
@Composable
fun MediaMenu(target: MenuTarget, onDismiss: () -> Unit, onChanged: () -> Unit = {}) {
    val container = LocalAppContainer.current
    val repository = container.repository
    val user by currentUser()
    // Scope of the app: the menu closes right after the click, its own scope would cancel the request
    val scope = container.scope
    val context = LocalContext.current
    var featureMedia by remember { mutableStateOf<Media?>(null) }
    val media = target.media

    if (user == null) {
        LaunchedEffect(Unit) { onDismiss() }
        return
    }

    if (featureMedia != null) {
        FeatureDialog(featureMedia!!, onDismiss = {
            featureMedia = null
            onDismiss()
        })
        return
    }

    fun progressAction(action: suspend () -> Unit) {
        scope.launch {
            runCatching { action() }
                .onSuccess {
                    repository.notifyChanged()
                    onChanged()
                }
                .onFailure { container.notify(context.getString(R.string.error_progress, repository.errorMessage(it) ?: it.message.orEmpty())) }
        }
    }

    val actions = buildList {
        val inWatchlist = media.inWatchlist == true
        add(MenuAction(stringResource(if (inWatchlist) R.string.media_remove_watchlist else R.string.media_add_watchlist), if (inWatchlist) HtIcons.BookmarkFilled else HtIcons.Bookmark) {
            scope.launch {
                runCatching { repository.setWatchlist(media.type, media.id, !inWatchlist) }
                    .onSuccess {
                        repository.notifyChanged()
                        onChanged()
                    }
                    .onFailure { container.notify(context.getString(R.string.error_watchlist, repository.errorMessage(it) ?: it.message.orEmpty())) }
            }
        })
        if (target.complete)
            add(MenuAction(stringResource(R.string.media_set_not_watched), HtIcons.Eye) {
                progressAction { repository.deleteProgress(media.type, media.id, target.season, target.episode) }
            })
        else
            add(MenuAction(stringResource(R.string.media_set_watched), Icons.Default.Check) {
                progressAction { repository.updateProgress(media.type, media.id, 0.0, 100.0, true, target.progress > 0, target.season, target.episode) }
            })
        if (user?.hasPerm(PERM_RECOMMEND) == true)
            add(MenuAction(stringResource(R.string.media_set_feature), Icons.Default.Star) { featureMedia = media })
        if (!target.complete && target.pourcent > 0 && target.pourcent < 100)
            add(MenuAction(stringResource(R.string.media_clear_progress), Icons.Default.Delete) {
                progressAction { repository.deleteProgress(media.type, media.id, target.season, target.episode) }
            })
    }

    ActionMenu(title = target.title, actions = actions, onDismiss = {
        if (featureMedia == null)
            onDismiss()
    })
}

// SetFeatureModal: feature the media on the home page with one of its backdrops
@Composable
fun FeatureDialog(media: Media, onDismiss: () -> Unit, details: MediaDetails? = null) {
    val container = LocalAppContainer.current
    val repository = container.repository
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var loaded by remember { mutableStateOf(details) }
    var feature by remember { mutableStateOf(details?.feature ?: true) }
    var backdrop by remember { mutableStateOf(details?.backdropUrl) }

    LaunchedEffect(media.id) {
        if (loaded == null)
            runCatching { repository.media(media.type, media.id) }.onSuccess {
                loaded = it
                feature = it.feature
                backdrop = it.backdropUrl
            }.onFailure { container.notify(repository.errorMessage(it) ?: context.getString(R.string.error_unknown)) }
    }

    HtDialog(onDismiss = onDismiss, title = stringResource(R.string.feature_title), maxWidth = 1100.dp) {
        val current = loaded
        HtChip(stringResource(R.string.feature_toggle), selected = feature, onClick = { feature = !feature })
        Text(stringResource(R.string.feature_choose_backdrop), style = HtText.Label)
        if (current == null)
            Placeholder(Modifier.fillMaxWidth().height(160.dp))
        else
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                itemsIndexed(current.backdropsUrl.ifEmpty { listOfNotNull(current.backdropUrl) }) { _, url ->
                    FocusSurface(
                        onClick = { backdrop = url },
                        modifier = Modifier.width(240.dp).aspectRatio(16f / 9f),
                        border = if (url == backdrop) BorderStroke(3.dp, HtColors.DBlack) else BorderStroke(1.dp, HtColors.Gray),
                        focusedBorderColor = LocalAccent.current,
                    ) {
                        NetworkImage(url, Modifier.fillMaxSize())
                        if (url == backdrop)
                            HtIcon(Icons.Default.Check, size = 28.dp, modifier = Modifier.align(Alignment.Center))
                    }
                }
            }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            HtButton(stringResource(R.string.feature_save), enabled = current != null, onClick = {
                scope.launch {
                    runCatching { repository.setFeature(media.type, media.id, feature, backdrop) }
                        .onSuccess {
                            repository.notifyChanged()
                            onDismiss()
                        }
                        .onFailure { container.notify(repository.errorMessage(it) ?: context.getString(R.string.error_unknown)) }
                }
            })
            HtButton(stringResource(R.string.cancel), onClick = onDismiss, variant = ButtonVariant.Outline)
        }
    }
}
