package com.hypertube.tv.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.ResponseBody
import retrofit2.HttpException
import retrofit2.Response
import kotlin.coroutines.coroutineContext

// Special search queries, same values as the website (medias.service.ts)
const val SEARCH_UPCOMING = "upcoming"
const val SEARCH_CONTINUE = "continue to watch"
const val SEARCH_FRIENDS = "friends activity"
const val SEARCH_DIRECTSTREAM = "directstream"
const val SEARCH_FEATURED = "featured"
const val SEARCH_TOP_RATED = "top-rated"
const val SEARCH_POPULAR = "popular"
val SPECIAL_SEARCHES = setOf(SEARCH_UPCOMING, SEARCH_CONTINUE, SEARCH_FRIENDS, SEARCH_DIRECTSTREAM, SEARCH_FEATURED, SEARCH_TOP_RATED, SEARCH_POPULAR)

class Repository(private val api: HyperTubeApi, private val http: OkHttpClient, private val json: Json) {
    private val _changes = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    // Emits when something the lists depend on changed (progress, watchlist, login...)
    val changes: SharedFlow<Unit> = _changes.asSharedFlow()

    fun notifyChanged() {
        _changes.tryEmit(Unit)
    }

    /* ----------------------------------------------- MEDIAS ----------------------------------------------- */
    suspend fun medias(type: String, query: String?, page: Int = 1): Page<Media> = when (query) {
        SEARCH_DIRECTSTREAM -> api.mediaList(type, "directstream")
        SEARCH_FEATURED -> api.mediaList(type, "featured")
        SEARCH_UPCOMING -> api.mediaList(type, "upcoming", page)
        SEARCH_CONTINUE -> api.mediaList(type, "continue-watching", page)
        SEARCH_FRIENDS -> api.mediaList(type, "friends-activity", page)
        SEARCH_TOP_RATED -> api.mediaList(type, "top-rated", page)
        null, "", SEARCH_POPULAR -> api.medias(type, page)
        else -> api.medias(type, page, query)
    }

    suspend fun media(type: String, id: String) = api.media(type, id)

    suspend fun collection(movieId: String) = api.collection(movieId)

    suspend fun season(seriesId: String, season: Int) = api.season(seriesId, season)

    suspend fun continueWatching(userId: Int) = api.continueWatching(userId).results

    suspend fun comingSoon(userId: Int) = api.comingSoon(userId).results

    suspend fun followingActivity() = api.followingActivity().results

    /* ---------------------------------------------- PROGRESS ---------------------------------------------- */
    // Without an episode, a series (or one of its seasons) is marked as watched entirely
    suspend fun updateProgress(
        type: String,
        id: String,
        progress: Double,
        pourcent: Double,
        complete: Boolean,
        addWatchedAt: Boolean = true,
        season: Int? = null,
        episode: Int? = null,
    ): Progress? {
        if (type == SERIES && episode == null)
            return api.setSeriesWatched(id, buildJsonObject { season?.let { put("season_number", it) } }).decode()

        val body = buildJsonObject {
            put("progress", progress.toInt())
            put("pourcent", pourcent.toInt())
            put("complete", complete)
            if (!addWatchedAt)
                put("watched_at", JsonNull)
            season?.let { put("season_number", it) }
            episode?.let { put("episode_number", it) }
        }
        return api.updateProgress(type, id, body).decode()
    }

    suspend fun deleteProgress(type: String, id: String, season: Int? = null, episode: Int? = null): Progress? {
        if (type == SERIES && episode == null)
            return api.deleteSeriesWatched(id, buildJsonObject { season?.let { put("season_number", it) } }).decode()

        val body = buildJsonObject {
            if (type == SERIES) {
                season?.let { put("season_number", it) }
                put("episode_number", episode)
            }
        }
        return api.deleteProgress(type, id, body).decode()
    }

    suspend fun setWatchlist(type: String, id: String, inWatchlist: Boolean): Boolean {
        val response = if (inWatchlist) api.addToWatchlist(type, id) else api.removeFromWatchlist(type, id)
        return response.decode<WatchlistState>()?.inWatchlist ?: inWatchlist
    }

    suspend fun setFeature(type: String, id: String, feature: Boolean, backdropUrl: String?) {
        api.updateFeature(type, id, buildJsonObject {
            put("feature", feature)
            put("backdrop_url", backdropUrl)
        }).decode<JsonObject>()
    }

    /* ---------------------------------------------- TORRENTS ---------------------------------------------- */
    suspend fun torrents(media: MediaDetails, season: Int, episode: Int): List<Torrent> =
        if (media.isSeries) api.torrents(media.type, media.id, season, episode).results else api.torrents(media.type, media.id).results

    suspend fun torrentRequest(media: MediaDetails, season: Int, episode: Int): TorrentRequestState =
        if (media.isSeries) api.torrentRequest(media.type, media.id, season, episode) else api.torrentRequest(media.type, media.id)

    suspend fun setTorrentRequest(media: MediaDetails, requested: Boolean, season: Int, episode: Int): TorrentRequestState {
        val seasonNumber = season.takeIf { media.isSeries }
        val episodeNumber = episode.takeIf { media.isSeries }

        if (requested)
            return api.requestTorrent(media.type, media.id, seasonNumber, episodeNumber)
        return api.cancelTorrentRequest(media.type, media.id, seasonNumber, episodeNumber).decode() ?: TorrentRequestState(false)
    }

    // Starts the download and waits until the HLS playlist answers, returns its full URL
    suspend fun startStream(torrentId: String, episode: Int?): String {
        var stream = api.startTorrent(torrentId, buildJsonObject { episode?.let { put("episode_number", it) } })

        while (true) {
            coroutineContext.ensureActive()
            val url = ServerConfig.API_URL + stream.stream
            if (stream.stream.isNotBlank() && isAvailable(url))
                return url
            if (stream.status == "error")
                throw IllegalStateException(stream.status)
            delay(2000)
            stream = api.torrentStatus(torrentId, episode)
        }
    }

    // Fire and forget: prepares the next episode while the current one is playing
    suspend fun preloadStream(torrentId: String, episode: Int?) {
        runCatching { api.startTorrent(torrentId, buildJsonObject { episode?.let { put("episode_number", it) } }) }
    }

    private suspend fun isAvailable(url: String) = withContext(Dispatchers.IO) {
        runCatching { http.newCall(Request.Builder().url(url).build()).execute().use { it.isSuccessful } }.getOrDefault(false)
    }

    suspend fun streamTracks(streamDir: String): StreamTracks? = withContext(Dispatchers.IO) {
        runCatching {
            http.newCall(Request.Builder().url(streamDir + "tracks.json").build()).execute().use { res ->
                if (res.isSuccessful) json.decodeFromString(StreamTracks.serializer(), res.body?.string().orEmpty()) else null
            }
        }.getOrNull()
    }

    /* ------------------------------------------- PEOPLE & USERS ------------------------------------------- */
    suspend fun people(search: String, page: Int) = api.people(search, page)

    suspend fun person(id: String) = api.person(id)

    suspend fun personMedias(id: String, role: String, page: Int) = api.personMedias(id, role, page)

    suspend fun users(search: String, page: Int) = api.users(search, page)

    suspend fun user(id: String) = api.user(id)

    suspend fun history(userId: Int, type: String, page: Int) = api.history(userId, type, page)

    suspend fun watchlist(userId: Int, page: Int) = api.watchlist(userId, page)

    suspend fun me() = api.user("me")

    suspend fun setFollow(userId: Int, follow: Boolean) = if (follow) api.follow(userId) else api.unfollow(userId)

    /* -------------------------------------------- TV SIGN-IN ---------------------------------------------- */
    suspend fun startTvLogin() = api.startTvLogin()

    suspend fun tvLoginStatus(code: String) = api.tvLoginStatus(code)

    /* ----------------------------------------------- ERRORS ----------------------------------------------- */
    // Message of an API error ({"detail": ...}, {"message": ...} or {"field": ["..."]}), null when unknown
    fun errorMessage(error: Throwable): String? {
        val body = (error as? HttpException)?.response()?.errorBody()?.string() ?: return null
        val content = runCatching { json.parseToJsonElement(body).jsonObject }.getOrNull() ?: return null

        listOf("detail", "message").forEach { key -> (content[key] as? JsonPrimitive)?.let { return it.content } }
        val first = content.values.firstOrNull() ?: return null
        return runCatching { (first.jsonArray.first() as JsonPrimitive).content }.getOrNull()
    }

    private inline fun <reified T> Response<ResponseBody>.decode(): T? {
        if (!isSuccessful)
            throw HttpException(this)
        val text = body()?.string().orEmpty()
        return if (text.isBlank()) null else runCatching { json.decodeFromString<T>(text) }.getOrNull()
    }
}

fun Throwable.isNotFound() = (this as? HttpException)?.code() == 404
