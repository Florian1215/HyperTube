package com.hypertube.tv.ui.details

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hypertube.tv.AppContainer
import com.hypertube.tv.R
import com.hypertube.tv.data.Collection
import com.hypertube.tv.data.Episode
import com.hypertube.tv.data.MediaDetails
import com.hypertube.tv.data.Season
import com.hypertube.tv.data.Torrent
import com.hypertube.tv.data.TorrentRequestState
import com.hypertube.tv.data.bestTorrent
import com.hypertube.tv.data.isNotFound
import com.hypertube.tv.util.isFuture
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

// The episode to play: iWatchEpisode on the website
data class WatchEpisode(val season: Int, val episode: Int, val runtime: Double)

data class MediaState(
    val media: MediaDetails? = null,
    val notFound: Boolean = false,
    val error: Boolean = false,
    val selected: WatchEpisode? = null,
    // Season of the episode to play
    val season: Season? = null,
    val torrents: List<Torrent> = emptyList(),
    val torrentsLoading: Boolean = true,
    val torrentRequest: TorrentRequestState? = null,
    val collection: Collection? = null,
    // Seasons displayed in the seasons section, by number
    val seasons: Map<Int, Season> = emptyMap(),
    val starting: Boolean = false,
    val streamUrl: String? = null,
    val playerKey: Int = 0,
    val playerError: String? = null,
) {
    val isSeries get() = media?.isSeries == true

    // Without a selected episode, the next episode to watch given by the API
    val watched: WatchEpisode
        get() = selected ?: WatchEpisode(
            media?.nextEpisode?.seasonNumber ?: 1,
            media?.nextEpisode?.episodeNumber ?: 1,
            media?.nextEpisode?.progress ?: 0.0,
        )

    val episodeDetails: Episode? get() = season?.episodes?.find { it.episodeNumber == watched.episode }

    val best: Torrent? get() = bestTorrent(torrents, isSeries, season?.episodes?.size)

    val unavailable get() = media != null && !torrentsLoading && best == null

    val resumeAt: Double
        get() = when {
            isSeries -> watched.runtime
            media != null && !media.complete -> media.progress
            else -> 0.0
        }

    val runtime: Int? get() = if (isSeries) episodeDetails?.runtime else media?.runtime

    // getFollowingEpisode of the website
    val following: WatchEpisode?
        get() {
            val current = media?.takeIf { it.isSeries } ?: return null
            val currentSeason = season ?: return null
            val next = currentSeason.episodes.filter { it.episodeNumber > watched.episode }.minByOrNull { it.episodeNumber }
            if (next != null)
                return if (isFuture(next.releaseDate)) null else WatchEpisode(watched.season, next.episodeNumber, if (next.complete) 0.0 else next.progress)
            if (watched.season < (current.numberOfSeasons ?: 0))
                return WatchEpisode(watched.season + 1, 1, 0.0)
            return null
        }
}

@OptIn(FlowPreview::class)
class MediaViewModel(private val container: AppContainer, private val type: String, private val id: String) : ViewModel() {
    private val repository = container.repository
    private val context get() = container.context
    private val _state = MutableStateFlow(MediaState())
    val state: StateFlow<MediaState> = _state.asStateFlow()
    private var streamJob: Job? = null
    private var episodeJob: Job? = null
    private var preloaded: String? = null
    private var autoPlay = false

    init {
        load()
        viewModelScope.launch {
            repository.changes.debounce(300).collect {
                if (_state.value.streamUrl == null)
                    refresh()
            }
        }
    }

    fun load() {
        _state.update { it.copy(error = false, notFound = false) }
        viewModelScope.launch {
            runCatching { repository.media(type, id) }
                .onSuccess { media ->
                    _state.update { it.copy(media = media) }
                    loadEpisodeData()
                    if (!media.isSeries)
                        launch { runCatching { repository.collection(media.id) }.onSuccess { c -> _state.update { it.copy(collection = c) } } }
                }
                .onFailure { error -> _state.update { it.copy(notFound = error.isNotFound(), error = !error.isNotFound()) } }
        }
    }

    // After a change made elsewhere (context menu, progress): reloads the details and the loaded seasons
    private fun refresh() {
        viewModelScope.launch {
            runCatching { repository.media(type, id) }.onSuccess { media -> _state.update { it.copy(media = media) } }
            _state.value.seasons.keys.forEach { number -> loadSeason(number, force = true) }
            val watchedSeason = _state.value.watched.season
            if (_state.value.isSeries)
                runCatching { repository.season(id, watchedSeason) }.onSuccess { season ->
                    _state.update { it.copy(season = season.takeIf { _ -> it.watched.season == watchedSeason } ?: it.season) }
                }
        }
    }

    // Season, torrents and torrent request of the episode to play
    private fun loadEpisodeData() {
        val media = _state.value.media ?: return
        val watched = _state.value.watched
        episodeJob?.cancel()
        _state.update { it.copy(torrentsLoading = true, torrentRequest = null) }

        episodeJob = viewModelScope.launch {
            if (media.isSeries) {
                val season = _state.value.seasons[watched.season] ?: runCatching { repository.season(id, watched.season) }.getOrNull()
                _state.update { it.copy(season = season, seasons = if (season != null) it.seasons + (watched.season to season) else it.seasons) }
            }
            val torrents = runCatching { repository.torrents(media, watched.season, watched.episode) }.getOrDefault(emptyList())
            _state.update { it.copy(torrents = torrents, torrentsLoading = false) }

            if (autoPlay) {
                autoPlay = false
                _state.value.best?.let { play(it.id) }
            }
            if (_state.value.unavailable && container.session.user.value != null)
                runCatching { repository.torrentRequest(media, watched.season, watched.episode) }
                    .onSuccess { request -> _state.update { it.copy(torrentRequest = request) } }
        }
    }

    fun loadSeason(number: Int, force: Boolean = false) {
        if (!force && _state.value.seasons.containsKey(number))
            return
        viewModelScope.launch {
            runCatching { repository.season(id, number) }.onSuccess { season -> _state.update { it.copy(seasons = it.seasons + (number to season)) } }
        }
    }

    fun selectEpisode(episode: WatchEpisode, play: Boolean = false) {
        closePlayer(refresh = false)
        autoPlay = play
        _state.update { it.copy(selected = episode) }
        loadEpisodeData()
    }

    /* ---------------------------------------------- PLAYBACK ---------------------------------------------- */
    fun play(torrentId: String? = _state.value.best?.id) {
        val current = _state.value
        if (torrentId == null) {
            container.notify(context.getString(R.string.error_torrent_not_found))
            return
        }
        if (current.isSeries)
            _state.update { it.copy(selected = it.watched) }
        streamJob?.cancel()
        _state.update { it.copy(starting = true, playerError = null) }

        streamJob = viewModelScope.launch {
            try {
                val url = repository.startStream(torrentId, if (current.isSeries) current.watched.episode else null)
                _state.update { it.copy(streamUrl = url, starting = false) }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Throwable) {
                container.notify(repository.errorMessage(error) ?: context.getString(R.string.error_unknown))
                _state.update { it.copy(starting = false) }
            }
        }
    }

    fun closePlayer(refresh: Boolean = true) {
        streamJob?.cancel()
        preloaded = null
        val wasPlaying = _state.value.streamUrl != null
        _state.update { it.copy(starting = false, streamUrl = null, playerError = null) }
        if (refresh && wasPlaying) {
            refresh()
            repository.notifyChanged()
        }
    }

    fun onPlayerError(message: String) = _state.update { it.copy(playerError = message) }

    fun reloadPlayer() = _state.update { it.copy(playerError = null, playerKey = it.playerKey + 1) }

    fun reportProgress(progress: Double, pourcent: Double, complete: Boolean) {
        val current = _state.value
        val media = current.media ?: return
        if (container.session.user.value == null)
            return
        val watched = current.watched

        viewModelScope.launch {
            runCatching {
                repository.updateProgress(media.type, media.id, progress, pourcent, complete, true,
                    if (media.isSeries) watched.season else null, if (media.isSeries) watched.episode else null)
            }
        }
    }

    // Starts the download of the next episode when the "next episode" button shows up
    fun preloadFollowing() {
        val current = _state.value
        val following = current.following ?: return
        val media = current.media ?: return
        val key = "${following.season}-${following.episode}"
        if (preloaded == key)
            return
        preloaded = key

        viewModelScope.launch {
            val season = if (following.season == current.watched.season) current.season else runCatching { repository.season(id, following.season) }.getOrNull()
            val torrents = runCatching { repository.torrents(media, following.season, following.episode) }.getOrNull()
            bestTorrent(torrents, true, season?.episodes?.size)?.let { repository.preloadStream(it.id, following.episode) }
        }
    }

    fun playFollowing() {
        val following = _state.value.following
        if (following == null)
            closePlayer()
        else
            selectEpisode(following, play = true)
    }

    /* ------------------------------------------------ ACTIONS --------------------------------------------- */
    fun toggleWatchlist() {
        val media = _state.value.media ?: return
        viewModelScope.launch {
            runCatching { repository.setWatchlist(media.type, media.id, media.inWatchlist != true) }
                .onSuccess { inWatchlist ->
                    _state.update { it.copy(media = it.media?.copy(inWatchlist = inWatchlist)) }
                    repository.notifyChanged()
                }
                .onFailure { container.notify(context.getString(R.string.error_watchlist, repository.errorMessage(it) ?: it.message.orEmpty())) }
        }
    }

    fun toggleTorrentRequest() {
        val current = _state.value
        val media = current.media ?: return
        val request = current.torrentRequest ?: return
        viewModelScope.launch {
            runCatching { repository.setTorrentRequest(media, !request.requested, current.watched.season, current.watched.episode) }
                .onSuccess { res -> _state.update { it.copy(torrentRequest = res) } }
                .onFailure { container.notify(repository.errorMessage(it) ?: context.getString(R.string.error_unknown)) }
        }
    }
}
