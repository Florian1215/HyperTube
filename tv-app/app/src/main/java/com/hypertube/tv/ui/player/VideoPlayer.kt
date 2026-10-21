@file:OptIn(ExperimentalTvMaterial3Api::class)

package com.hypertube.tv.ui.player

import android.content.Context
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkHorizontally
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.res.ResourcesCompat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.CaptionStyleCompat
import androidx.media3.ui.PlayerView
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.hypertube.tv.R
import com.hypertube.tv.data.StreamTracks
import com.hypertube.tv.ui.LocalAppContainer
import com.hypertube.tv.ui.components.ActionMenu
import com.hypertube.tv.ui.components.ButtonVariant
import com.hypertube.tv.ui.components.EpisodeLabel
import com.hypertube.tv.ui.components.FocusSurface
import com.hypertube.tv.ui.components.HtButton
import com.hypertube.tv.ui.components.HtIcon
import com.hypertube.tv.ui.components.HtIcons
import com.hypertube.tv.ui.components.MenuAction
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.ui.theme.LocalAccent
import com.hypertube.tv.util.displayLanguage
import com.hypertube.tv.util.formatTime
import kotlinx.coroutines.delay
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

private const val SEEK_STEP_MS = 60_000L
private const val MIN_5 = 5 * 60
private const val SUBTITLE_PREFIX = "hypertube-sub-"
private const val PREFS = "player"
private const val SUBTITLE_LANG_KEY = "subtitleLang"
private const val SUBTITLE_OFF = "off"

private data class TrackOption(val group: Tracks.Group, val index: Int, val label: String, val language: String?, val forced: Boolean, val selected: Boolean)

private enum class PlayerMenu { Audio, Subtitles }

// Port of the website VideoPlayer, driven by the remote: OK plays/pauses, left/right seeks 1 minute
@androidx.annotation.OptIn(UnstableApi::class)
@Composable
fun VideoPlayer(
    url: String,
    startAt: Double,
    runtimeMinutes: Int,
    title: String,
    seasonNumber: Int?,
    episodeNumber: Int?,
    episodeName: String?,
    preferredAudio: String?,
    trackProgress: Boolean,
    hasNext: Boolean,
    onProgress: (progress: Double, pourcent: Double, complete: Boolean) -> Unit,
    onNextShown: () -> Unit,
    onNext: () -> Unit,
    onEnded: () -> Unit,
    onError: (String) -> Unit,
    onClose: () -> Unit,
) {
    val context = LocalContext.current
    val repository = LocalAppContainer.current.repository
    val player = remember { ExoPlayer.Builder(context).build() }
    val streamDir = url.substringBeforeLast("/") + "/"
    var streamTracks by remember { mutableStateOf<StreamTracks?>(null) }
    var audioOptions by remember { mutableStateOf<List<TrackOption>>(emptyList()) }
    var subtitleOptions by remember { mutableStateOf<List<TrackOption>>(emptyList()) }
    var subtitleRestored by remember { mutableStateOf(false) }

    var position by remember { mutableDoubleStateOf(0.0) }
    var available by remember { mutableDoubleStateOf(0.0) }
    var fullDuration by remember { mutableDoubleStateOf(runtimeMinutes * 60.0) }
    var isPlaying by remember { mutableStateOf(false) }
    var buffering by remember { mutableStateOf(true) }
    var controlsVisible by remember { mutableStateOf(true) }
    var interaction by remember { mutableIntStateOf(0) }
    var menu by remember { mutableStateOf<PlayerMenu?>(null) }
    // Total of the seeks in the same direction while the indicator is shown (+1min, +2min...)
    var seekFeedback by remember { mutableStateOf<Long?>(null) }

    val rootFocus = remember { FocusRequester() }
    val playFocus = remember { FocusRequester() }
    val onEndedState by rememberUpdatedState(onEnded)
    val onErrorState by rememberUpdatedState(onError)

    /* ------------------------------------------------ INIT -------------------------------------------------- */
    LaunchedEffect(url) {
        val tracks = withTimeoutOrNull(4000) { repository.streamTracks(streamDir) }
        streamTracks = tracks
        val subtitles = tracks?.subtitles.orEmpty().mapIndexed { index, track ->
            MediaItem.SubtitleConfiguration.Builder(Uri.parse(streamDir + track.file))
                .setMimeType(MimeTypes.TEXT_VTT)
                .setLanguage(track.language)
                .setLabel(SUBTITLE_PREFIX + index)
                .setId(SUBTITLE_PREFIX + index)
                .build()
        }
        // The stream is a growing HLS playlist while transcoding, it must not be played faster to catch up
        val item = MediaItem.Builder()
            .setUri(url)
            .setMimeType(MimeTypes.APPLICATION_M3U8)
            .setSubtitleConfigurations(subtitles)
            .setLiveConfiguration(MediaItem.LiveConfiguration.Builder().setMinPlaybackSpeed(1f).setMaxPlaybackSpeed(1f).build())
            .build()

        player.trackSelectionParameters = player.trackSelectionParameters.buildUpon()
            .setPreferredAudioLanguage(preferredAudio)
            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
            .build()
        player.setMediaItem(item, (startAt * 1000).toLong().coerceAtLeast(0))
        player.prepare()
        player.playWhenReady = true
    }

    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onIsPlayingChanged(playing: Boolean) {
                isPlaying = playing
            }

            override fun onPlaybackStateChanged(state: Int) {
                buffering = state == Player.STATE_BUFFERING
                if (state == Player.STATE_ENDED)
                    onEndedState()
            }

            override fun onPlayerError(error: PlaybackException) {
                onErrorState(error.message ?: error.errorCodeName)
            }

            override fun onTracksChanged(tracks: Tracks) {
                audioOptions = audioOptions(context, tracks, streamTracks)
                subtitleOptions = subtitleOptions(context, tracks, streamTracks)
            }
        }
        player.addListener(listener)
        onDispose {
            player.removeListener(listener)
            player.release()
        }
    }

    // Restores the subtitle language chosen last time, like the website
    LaunchedEffect(subtitleOptions) {
        if (subtitleRestored || subtitleOptions.isEmpty())
            return@LaunchedEffect
        subtitleRestored = true
        val saved = prefs(context).getString(SUBTITLE_LANG_KEY, null) ?: return@LaunchedEffect
        if (saved == SUBTITLE_OFF)
            return@LaunchedEffect
        val sameLanguage = subtitleOptions.filter { it.language == saved }
        (sameLanguage.firstOrNull { !it.forced } ?: sameLanguage.firstOrNull())?.let { select(player, it) }
    }

    /* ---------------------------------------------- PROGRESS ------------------------------------------------ */
    var completeSent by remember { mutableStateOf(false) }
    var lastSent by remember { mutableDoubleStateOf(0.0) }
    val completeBefore = if (episodeNumber == null) 15 * 60 else 3 * 60

    LaunchedEffect(player) {
        while (true) {
            position = player.currentPosition / 1000.0
            if (player.duration != C.TIME_UNSET)
                available = player.duration / 1000.0
            if (!player.isCurrentMediaItemLive && player.duration != C.TIME_UNSET && player.duration > 0)
                fullDuration = player.duration / 1000.0

            if (trackProgress && !completeSent && fullDuration > 0) {
                val seconds = floor(position)
                if (position + completeBefore > fullDuration) {
                    completeSent = true
                    onProgress(seconds, 100.0, true)
                } else if (seconds > MIN_5 && abs(seconds - lastSent) >= 15) {
                    lastSent = seconds
                    onProgress(seconds, min(100.0, ceil(position / fullDuration * 100)), false)
                }
            }
            delay(500)
        }
    }

    val showNext = hasNext && fullDuration > 0 && position + MIN_5 > fullDuration
    LaunchedEffect(showNext) {
        if (showNext)
            onNextShown()
    }

    /* ---------------------------------------------- CONTROLS ------------------------------------------------ */
    fun togglePlay() {
        if (player.isPlaying) player.pause() else player.play()
        controlsVisible = true
        interaction++
    }

    fun seekBy(deltaMs: Long) {
        val limit = if (player.duration != C.TIME_UNSET) player.duration else Long.MAX_VALUE
        player.seekTo((player.currentPosition + deltaMs).coerceIn(0, max(0, limit - 1000)))
        val previous = seekFeedback
        seekFeedback = if (previous != null && (previous > 0) == (deltaMs > 0)) previous + deltaMs else deltaMs
        interaction++
    }

    LaunchedEffect(seekFeedback, interaction) {
        if (seekFeedback != null) {
            delay(800)
            seekFeedback = null
        }
    }
    LaunchedEffect(controlsVisible, interaction, isPlaying, menu) {
        if (controlsVisible && isPlaying && menu == null) {
            delay(4000)
            controlsVisible = false
        }
    }
    LaunchedEffect(controlsVisible) {
        delay(50)
        runCatching { if (controlsVisible) playFocus.requestFocus() else rootFocus.requestFocus() }
    }

    // Back from the controls goes back to the video (handled with the keys below), back again closes the player
    BackHandler { onClose() }

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black)
            .onPreviewKeyEvent { event ->
                // Before Compose uses the back key to clear the focus of the controls, so one press goes back to the video
                if (event.key == Key.Back && controlsVisible) {
                    if (event.type == KeyEventType.KeyUp) {
                        controlsVisible = false
                        if (!player.isPlaying)
                            player.play()
                    }
                    return@onPreviewKeyEvent true
                }
                if (event.type != KeyEventType.KeyDown)
                    return@onPreviewKeyEvent false
                when (event.key) {
                    Key.MediaPlayPause, Key.MediaPlay, Key.MediaPause -> {
                        togglePlay()
                        return@onPreviewKeyEvent true
                    }
                    Key.MediaFastForward -> {
                        seekBy(SEEK_STEP_MS)
                        return@onPreviewKeyEvent true
                    }
                    Key.MediaRewind -> {
                        seekBy(-SEEK_STEP_MS)
                        return@onPreviewKeyEvent true
                    }
                }
                if (controlsVisible) {
                    interaction++
                    return@onPreviewKeyEvent false
                }
                when (event.key) {
                    // OK only shows the controls, the play/pause button in the middle then has the focus
                    Key.DirectionCenter, Key.Enter, Key.NumPadEnter -> controlsVisible = true
                    Key.DirectionLeft -> seekBy(-SEEK_STEP_MS)
                    Key.DirectionRight -> seekBy(SEEK_STEP_MS)
                    Key.DirectionUp, Key.DirectionDown -> controlsVisible = true
                    else -> return@onPreviewKeyEvent false
                }
                true
            }
            .focusRequester(rootFocus)
            .focusable(),
    ) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { viewContext ->
                PlayerView(viewContext).apply {
                    useController = false
                    isFocusable = false
                    isFocusableInTouchMode = false
                    setShowBuffering(PlayerView.SHOW_BUFFERING_NEVER)
                    this.player = player
                    subtitleView?.apply {
                        setApplyEmbeddedStyles(false)
                        setFractionalTextSize(0.055f)
                        setStyle(CaptionStyleCompat(
                            android.graphics.Color.WHITE, android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT,
                            CaptionStyleCompat.EDGE_TYPE_DROP_SHADOW, android.graphics.Color.BLACK, ResourcesCompat.getFont(viewContext, R.font.calhern_bold),
                        ))
                    }
                }
            },
        )

        if (!isPlaying && !buffering)
            Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.35f)))
        if (buffering)
            Spinner(Modifier.align(Alignment.Center))
        // Vertically centered, on the left for a backward seek and on the right for a forward one
        seekFeedback?.let { total ->
            val forward = total > 0
            Text(
                if (forward) "+${seekLabel(total)} »" else "« -${seekLabel(total)}",
                style = HtText.Title,
                color = HtColors.White,
                modifier = Modifier
                    .align(if (forward) Alignment.CenterEnd else Alignment.CenterStart)
                    .padding(horizontal = 160.dp),
            )
        }

        AnimatedVisibility(visible = controlsVisible, enter = fadeIn(), exit = fadeOut(), modifier = Modifier.fillMaxSize()) {
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.6f), Color.Transparent, Color.Black.copy(alpha = 0.85f))))) {
                // The title is only shown with the controls, the video stays full screen.
                // Reached going up from the progress bar, OK goes back to the page of the media: an arrow shows it while focused
                var titleFocused by remember { mutableStateOf(false) }
                FocusSurface(
                    onClick = onClose,
                    focusedScale = 1f,
                    focusedContentColor = LocalAccent.current,
                    modifier = Modifier.align(Alignment.TopStart).padding(28.dp).onFocusChanged { titleFocused = it.isFocused },
                ) {
                    Row(Modifier.padding(12.dp)) {
                        AnimatedVisibility(visible = titleFocused, enter = fadeIn() + expandHorizontally(), exit = fadeOut() + shrinkHorizontally()) {
                            // Centered on the first line of the title so the arrow extends it
                            Box(Modifier.height(with(LocalDensity.current) { HtText.Title.lineHeight.toDp() }), contentAlignment = Alignment.Center) {
                                HtIcon(Icons.AutoMirrored.Filled.ArrowBack, size = 28.dp, modifier = Modifier.padding(end = 12.dp))
                            }
                        }
                        Column {
                            Text(title.uppercase(), style = HtText.Title)
                            if (seasonNumber != null && episodeNumber != null)
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    EpisodeLabel(seasonNumber, episodeNumber)
                                    episodeName?.let { Text(it, style = HtText.Small, color = HtColors.WhiteLight) }
                                }
                        }
                    }
                }
                // Play/pause in the middle of the screen, only the icon (accent when focused), hidden behind the spinner while buffering
                FocusSurface(
                    onClick = ::togglePlay,
                    shape = CircleShape,
                    focusedScale = 1.15f,
                    focusedContentColor = LocalAccent.current,
                    modifier = Modifier.align(Alignment.Center).focusRequester(playFocus),
                ) {
                    if (!buffering)
                        HtIcon(if (isPlaying) HtIcons.Pause else HtIcons.Play, size = 64.dp, modifier = Modifier.padding(20.dp))
                    else
                        Spacer(Modifier.size(104.dp))
                }
                if (showNext)
                    HtButton(stringResource(R.string.media_next_episode), onClick = onNext, icon = HtIcons.Next, modifier = Modifier.align(Alignment.TopEnd).padding(40.dp))

                Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(horizontal = 40.dp, vertical = 32.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    SeekBar(
                        position = position,
                        available = available,
                        total = max(fullDuration, available),
                        onSeek = ::seekBy,
                        onToggle = ::togglePlay,
                    )
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("${formatTime(position.toLong())} / ${formatTime(fullDuration.toLong())}", style = HtText.Bold, color = HtColors.White)
                        Spacer(Modifier.weight(1f))
                        if (audioOptions.size > 1)
                            HtButton(stringResource(R.string.player_audio), icon = HtIcons.Audio, variant = ButtonVariant.Outline, onClick = { menu = PlayerMenu.Audio })
                        if (subtitleOptions.isNotEmpty())
                            HtButton(stringResource(R.string.player_subtitles), icon = HtIcons.Subtitles, variant = ButtonVariant.Outline, onClick = { menu = PlayerMenu.Subtitles })
                        if (hasNext)
                            HtButton(stringResource(R.string.media_next_episode), icon = HtIcons.Next, variant = ButtonVariant.Outline, onClick = onNext)
                    }
                }
            }
        }
    }

    when (menu) {
        PlayerMenu.Audio -> ActionMenu(
            title = stringResource(R.string.player_audio),
            actions = audioOptions.map { option -> MenuAction(option.label, if (option.selected) Icons.Default.Check else null) { select(player, option) } },
            onDismiss = { menu = null },
        )
        PlayerMenu.Subtitles -> ActionMenu(
            title = stringResource(R.string.player_subtitles),
            actions = listOf(MenuAction(stringResource(R.string.player_subtitles_off), if (subtitleOptions.none { it.selected }) Icons.Default.Check else null) {
                player.trackSelectionParameters = player.trackSelectionParameters.buildUpon().setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true).build()
                prefs(context).edit().putString(SUBTITLE_LANG_KEY, SUBTITLE_OFF).apply()
            }) + subtitleOptions.map { option ->
                MenuAction(option.label, if (option.selected) Icons.Default.Check else null) {
                    select(player, option)
                    prefs(context).edit().putString(SUBTITLE_LANG_KEY, option.language ?: SUBTITLE_OFF).apply()
                }
            },
            onDismiss = { menu = null },
        )
        null -> Unit
    }
}

@Composable
private fun SeekBar(position: Double, available: Double, total: Double, onSeek: (Long) -> Unit, onToggle: () -> Unit) {
    var focused by remember { mutableStateOf(false) }
    val accent = LocalAccent.current
    val fraction = if (total > 0) (position / total).toFloat().coerceIn(0f, 1f) else 0f
    val availableFraction = if (total > 0) (available / total).toFloat().coerceIn(0f, 1f) else 0f

    Box(
        Modifier
            .fillMaxWidth()
            .height(if (focused) 14.dp else 8.dp)
            .onFocusChanged { focused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown)
                    return@onKeyEvent false
                when (event.key) {
                    Key.DirectionLeft -> onSeek(-SEEK_STEP_MS)
                    Key.DirectionRight -> onSeek(SEEK_STEP_MS)
                    Key.DirectionCenter, Key.Enter -> onToggle()
                    else -> return@onKeyEvent false
                }
                true
            }
            .focusable()
            .background(HtColors.White.copy(alpha = 0.2f))
            .border(if (focused) 2.dp else 0.dp, if (focused) HtColors.White else Color.Transparent),
    ) {
        // Downloaded part, then watched part
        Box(Modifier.fillMaxHeight().fillMaxWidth(availableFraction).background(HtColors.White.copy(alpha = 0.35f)))
        Box(Modifier.fillMaxHeight().fillMaxWidth(fraction).background(accent))
    }
}

@Composable
private fun Spinner(modifier: Modifier = Modifier) {
    val rotation by rememberInfiniteTransition(label = "spinner").animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(900, easing = LinearEasing), RepeatMode.Restart),
        label = "rotation",
    )
    Canvas(modifier.size(56.dp).rotate(rotation)) {
        drawArc(Color.White, startAngle = 0f, sweepAngle = 270f, useCenter = false, style = Stroke(width = 10.dp.toPx()), size = Size(size.width, size.height))
    }
}

// 30s, 1min, 1min 30s...
private fun seekLabel(totalMs: Long): String {
    val seconds = abs(totalMs) / 1000
    if (seconds < 60)
        return "${seconds}s"
    val rest = seconds % 60
    return if (rest == 0L) "${seconds / 60}min" else "${seconds / 60}min ${rest}s"
}

private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

private fun select(player: Player, option: TrackOption) {
    player.trackSelectionParameters = player.trackSelectionParameters.buildUpon()
        .setTrackTypeDisabled(option.group.type, false)
        .setOverrideForType(TrackSelectionOverride(option.group.mediaTrackGroup, option.index))
        .build()
}

// getTrackLabel of the website: language name, then the details that are not already in it
private fun trackLabel(context: Context, language: String?, details: List<String>, index: Int): String {
    val name = displayLanguage(language?.takeIf { it.isNotBlank() && it != "und" })
        ?: context.getString(R.string.player_track, index + 1)
    val extra = details.filter { it.isNotBlank() && !it.equals(name, ignoreCase = true) }
    return if (extra.isEmpty()) name else "$name (${extra.joinToString(", ")})"
}

private fun audioOptions(context: Context, tracks: Tracks, streamTracks: StreamTracks?): List<TrackOption> {
    val groups = tracks.groups.filter { it.type == C.TRACK_TYPE_AUDIO }
    return groups.flatMap { group -> (0 until group.length).filter { group.isTrackSupported(it) }.map { group to it } }
        .mapIndexed { index, (group, track) ->
            val format = group.getTrackFormat(track)
            val title = streamTracks?.audio?.getOrNull(index)?.title.orEmpty()
            TrackOption(group, track, trackLabel(context, format.language, listOfNotNull(title, format.label), index), format.language, false, group.isTrackSelected(track))
        }
}

private fun subtitleOptions(context: Context, tracks: Tracks, streamTracks: StreamTracks?): List<TrackOption> =
    tracks.groups.filter { it.type == C.TRACK_TYPE_TEXT }.flatMap { group ->
        (0 until group.length).mapNotNull { track ->
            val format = group.getTrackFormat(track)
            val index = (format.label ?: format.id)?.substringAfter(SUBTITLE_PREFIX, "")?.toIntOrNull() ?: return@mapNotNull null
            val info = streamTracks?.subtitles?.getOrNull(index)
            val details = listOfNotNull(info?.title, if (info?.forced == true) context.getString(R.string.player_forced) else null)
            TrackOption(group, track, trackLabel(context, info?.language ?: format.language, details, index), info?.language ?: format.language, info?.forced == true, group.isTrackSelected(track))
        }
    }.sortedBy { it.label }
