package com.hypertube.tv.data

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonPrimitive

const val MOVIES = "movies"
const val SERIES = "series"

// Some ids are numbers in the API and strings in others, both end up as a string
object LenientStringSerializer : KSerializer<String> {
    override val descriptor = PrimitiveSerialDescriptor("LenientString", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): String {
        val json = decoder as? JsonDecoder ?: return decoder.decodeString()
        val element = json.decodeJsonElement()
        return if (element is JsonPrimitive) element.content else element.toString()
    }

    override fun serialize(encoder: Encoder, value: String) = encoder.encodeString(value)
}

@Serializable
data class Page<T>(
    val results: List<T> = emptyList(),
    val next: String? = null,
    val previous: String? = null,
    val count: Int = 0,
    @SerialName("per_page") val perPage: Int = 0,
)

@Serializable
data class Token(val access: String, val refresh: String? = null)

@Serializable
data class User(
    val id: Int,
    val username: String = "",
    val color: String = "purple",
    @SerialName("profile_picture") val profilePicture: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    val perm: String? = null,
    @SerialName("is_following") val isFollowing: Boolean? = null,
    @SerialName("preferred_language") val preferredLanguage: String? = null,
) {
    fun hasPerm(name: String): Boolean {
        val perms = perm?.split(",").orEmpty()
        return "admin" in perms || name in perms
    }
}

const val PERM_RECOMMEND = "medias.can_recommend_medias"

@Serializable
data class SmallEpisode(
    val id: Int = 0,
    @SerialName("poster_url") val posterUrl: String? = null,
    @SerialName("episode_number") val episodeNumber: Int = 1,
    @SerialName("season_number") val seasonNumber: Int = 1,
    val name: String? = null,
)

// A media in a list (search, home sections, activity, collection)
@Serializable
data class Media(
    @Serializable(with = LenientStringSerializer::class) val id: String,
    val title: String = "",
    @Serializable(with = LenientStringSerializer::class) val year: String = "",
    @SerialName("poster_url") val posterUrl: String? = null,
    @SerialName("backdrop_url") val backdropUrl: String? = null,
    val genres: List<Int> = emptyList(),
    val rating: Double = 0.0,
    @SerialName("vote_count") val voteCount: Int = 0,
    @SerialName("release_date") val releaseDate: String? = null,
    val complete: Boolean = false,
    val pourcent: Double = 0.0,
    val type: String = MOVIES,
    val progress: Double = 0.0,
    @SerialName("watched_at") val watchedAt: String? = null,
    @SerialName("in_watchlist") val inWatchlist: Boolean? = null,
    val episode: SmallEpisode? = null,
    val rewatch: Boolean? = null,
    @SerialName("last_watched_at") val lastWatchedAt: String? = null,
    @SerialName("feature_at") val featureAt: String? = null,
    val summary: String? = null,
    val user: User? = null,
    // Jobs of the person on the people page ("Director", the character played...)
    val roles: List<String> = emptyList(),
)

@Serializable
data class People(
    @Serializable(with = LenientStringSerializer::class) val id: String,
    val name: String = "",
    val job: String? = null,
    val character: String? = null,
    val picture: String? = null,
    val department: String? = null,
    @SerialName("watched_count") val watchedCount: Int? = null,
    @SerialName("known_for") val knownFor: List<KnownFor> = emptyList(),
)

// The people page: PersonSerializer of the API
@Serializable
data class Person(
    @Serializable(with = LenientStringSerializer::class) val id: String,
    val name: String = "",
    val picture: String? = null,
    val department: String? = null,
    val biography: String = "",
    val birthday: String? = null,
    val deathday: String? = null,
    @SerialName("place_of_birth") val placeOfBirth: String? = null,
    @SerialName("watched_count") val watchedCount: Int = 0,
    @SerialName("medias_count") val mediasCount: Int = 0,
)

// Same order as the tabs of the website
val PERSON_ROLES = listOf("cast", "directing", "writing", "crew")

@Serializable
data class PersonMedias(
    val results: List<Media> = emptyList(),
    val next: String? = null,
    val count: Int = 0,
    val counts: Map<String, Int> = emptyMap(),
)

@Serializable
data class KnownFor(
    @Serializable(with = LenientStringSerializer::class) val id: String,
    val type: String = MOVIES,
    val title: String = "",
)

@Serializable
data class WatchedBy(
    val id: Int,
    val username: String = "",
    val color: String = "purple",
    @SerialName("profile_picture") val profilePicture: String? = null,
    @SerialName("watch_count") val watchCount: Int = 1,
) {
    fun toUser() = User(id = id, username = username, color = color, profilePicture = profilePicture)
}

@Serializable
data class NextEpisode(
    @SerialName("season_number") val seasonNumber: Int = 1,
    @SerialName("episode_number") val episodeNumber: Int = 1,
    val progress: Double = 0.0,
)

// Details of a movie or a series
@Serializable
data class MediaDetails(
    @Serializable(with = LenientStringSerializer::class) val id: String,
    val title: String = "",
    @Serializable(with = LenientStringSerializer::class) val year: String = "",
    @SerialName("poster_url") val posterUrl: String? = null,
    @SerialName("backdrop_url") val backdropUrl: String? = null,
    val genres: List<Int> = emptyList(),
    val rating: Double = 0.0,
    @SerialName("vote_count") val voteCount: Int = 0,
    @SerialName("release_date") val releaseDate: String? = null,
    val complete: Boolean = false,
    val pourcent: Double = 0.0,
    val type: String = MOVIES,
    val progress: Double = 0.0,
    @SerialName("watched_at") val watchedAt: String? = null,
    @SerialName("in_watchlist") val inWatchlist: Boolean? = null,
    @SerialName("original_title") val originalTitle: String? = null,
    @SerialName("original_language") val originalLanguage: String? = null,
    val budget: Long? = null,
    val revenue: Long? = null,
    @SerialName("production_countries") val productionCountries: List<String> = emptyList(),
    @SerialName("production_companies") val productionCompanies: List<String> = emptyList(),
    val summary: String = "",
    val crew: List<People> = emptyList(),
    val cast: List<People> = emptyList(),
    @SerialName("backdrops_url") val backdropsUrl: List<String> = emptyList(),
    val feature: Boolean = false,
    @SerialName("feature_at") val featureAt: String? = null,
    @SerialName("watched_by") val watchedBy: List<WatchedBy> = emptyList(),
    val runtime: Int? = null,
    val status: String? = null,
    @SerialName("end_date") val endDate: String? = null,
    @SerialName("number_of_seasons") val numberOfSeasons: Int? = null,
    @SerialName("number_of_episodes") val numberOfEpisodes: Int? = null,
    @SerialName("next_episode") val nextEpisode: NextEpisode? = null,
) {
    val isSeries get() = type == SERIES

    fun toMedia() = Media(
        id = id, title = title, year = year, posterUrl = posterUrl, backdropUrl = backdropUrl, genres = genres,
        rating = rating, voteCount = voteCount, releaseDate = releaseDate, complete = complete, pourcent = pourcent,
        type = type, progress = progress, watchedAt = watchedAt, inWatchlist = inWatchlist,
    )
}

@Serializable
data class Episode(
    val id: Int,
    val name: String = "",
    val overview: String = "",
    @SerialName("episode_number") val episodeNumber: Int,
    @SerialName("episode_type") val episodeType: String? = null,
    val runtime: Int? = null,
    val rating: Double = 0.0,
    @SerialName("release_date") val releaseDate: String? = null,
    @SerialName("poster_url") val posterUrl: String? = null,
    @SerialName("watched_by") val watchedBy: List<WatchedBy> = emptyList(),
    val progress: Double = 0.0,
    val complete: Boolean = false,
    val pourcent: Double = 0.0,
    @SerialName("watched_at") val watchedAt: String? = null,
)

@Serializable
data class Season(
    val id: Int,
    val name: String = "",
    val overview: String = "",
    @SerialName("season_number") val seasonNumber: Int,
    val rating: Double = 0.0,
    @SerialName("release_date") val releaseDate: String? = null,
    @SerialName("poster_url") val posterUrl: String? = null,
    val complete: Boolean = false,
    val pourcent: Double = 0.0,
    val episodes: List<Episode> = emptyList(),
)

@Serializable
data class Collection(
    val id: Int? = null,
    val name: String? = null,
    val parts: List<Media> = emptyList(),
)

@Serializable
data class Torrent(
    @Serializable(with = LenientStringSerializer::class) val id: String,
    val title: String = "",
    val status: String = "not-downloaded",
    val quality: String? = null,
    val size: Double = 0.0,
    val language: String? = null,
    val seeders: Int = 0,
    val peers: Int = 0,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("is_season_pack") val isSeasonPack: Boolean = false,
)

@Serializable
data class TorrentStream(
    @Serializable(with = LenientStringSerializer::class) val id: String = "",
    val status: String = "",
    val stream: String = "",
)

@Serializable
data class TorrentRequestState(val requested: Boolean = false)

@Serializable
data class Progress(
    val progress: Double = 0.0,
    val complete: Boolean = false,
    val pourcent: Double = 0.0,
    @SerialName("watched_at") val watchedAt: String? = null,
)

@Serializable
data class WatchlistState(@SerialName("in_watchlist") val inWatchlist: Boolean = false)

@Serializable
data class StreamTracks(
    val audio: List<AudioTitle> = emptyList(),
    val subtitles: List<SubtitleTrack> = emptyList(),
)

@Serializable
data class AudioTitle(val title: String = "")

@Serializable
data class SubtitleTrack(
    val language: String = "",
    val title: String = "",
    val forced: Boolean = false,
    val file: String = "",
)

// TV sign-in with a phone: planned backend contract (see README)
@Serializable
data class TvLoginSession(
    val code: String,
    // Page of the website opened on the phone by the QR code
    val url: String,
)

@Serializable
data class TvLoginStatus(
    val status: String = "pending",
    val access: String? = null,
    val refresh: String? = null,
)

// Media sent by the website to open on the TV, the episode of a series is optional
@Serializable
data class TvCast(
    val type: String,
    val id: String,
    val season: Int? = null,
    val episode: Int? = null,
)

@Serializable
data class TvPoll(val cast: TvCast? = null)
