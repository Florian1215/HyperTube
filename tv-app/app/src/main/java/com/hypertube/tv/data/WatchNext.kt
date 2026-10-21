package com.hypertube.tv.data

import android.annotation.SuppressLint
import android.content.Context
import android.net.Uri
import androidx.tvprovider.media.tv.PreviewChannelHelper
import androidx.tvprovider.media.tv.TvContractCompat
import androidx.tvprovider.media.tv.WatchNextProgram
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.OffsetDateTime

// "Continue watching" row of the Android TV home screen (Watch Next channel): the continue watching of the current account.
// Each program opens the app on its media and starts the playback (see DeepLink)
class WatchNext(private val context: Context, private val repository: Repository) {
    private val helper = PreviewChannelHelper(context)

    // The guest (or nobody signed in) has no progress: the row is emptied
    suspend fun sync(user: User?) {
        val medias = try {
            if (user == null) emptyList() else repository.continueWatching(user.id)
        } catch (error: CancellationException) {
            throw error
        } catch (error: Throwable) {
            // Offline: the row keeps what it had
            return
        }
        withContext(Dispatchers.IO) {
            // Only on a device with the TV provider (Android TV, Google TV)
            runCatching { publish(medias) }
        }
    }

    private fun publish(medias: List<Media>) {
        val existing = programs().associateBy { it.internalProviderId }
        val now = System.currentTimeMillis()
        val keys = medias.map(::key).toSet()

        existing.filterKeys { it !in keys }.values.forEach { delete(it.id) }
        medias.forEachIndexed { index, media ->
            val current = existing[key(media)]
            // Removed from the row by the user, it stays hidden
            if (current != null && !current.isBrowsable)
                return@forEachIndexed
            // Without a date the order of the API is kept, the most recent first
            val program = program(media, engagedAt(media) ?: (now - index * 1000L))
            if (current == null)
                helper.publishWatchNextProgram(program)
            else
                helper.updateWatchNextProgram(program, current.id)
        }
    }

    @SuppressLint("RestrictedApi")
    private fun programs(): List<WatchNextProgram> {
        val cursor = context.contentResolver.query(TvContractCompat.WatchNextPrograms.CONTENT_URI, WatchNextProgram.PROJECTION, null, null, null)
            ?: return emptyList()
        return cursor.use { buildList { while (it.moveToNext()) add(WatchNextProgram.fromCursor(it)) } }
    }

    private fun delete(id: Long) {
        context.contentResolver.delete(TvContractCompat.buildWatchNextProgramUri(id), null, null)
    }

    private fun program(media: Media, engagedAt: Long): WatchNextProgram {
        val episode = media.episode?.takeIf { media.type == SERIES }
        val builder = WatchNextProgram.Builder()
            .setType(if (episode != null) TvContractCompat.PreviewPrograms.TYPE_TV_EPISODE else TvContractCompat.PreviewPrograms.TYPE_MOVIE)
            // An episode not started yet is the next one of the series
            .setWatchNextType(if (media.progress > 0) TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_CONTINUE else TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_NEXT)
            .setLastEngagementTimeUtcMillis(engagedAt)
            .setInternalProviderId(key(media))
            .setTitle(media.title)
            .setPosterArtAspectRatio(TvContractCompat.PreviewPrograms.ASPECT_RATIO_16_9)
            .setIntentUri(DeepLink.media(media.type, media.id, episode?.seasonNumber, episode?.episodeNumber))
        ServerConfig.fileUrl(episode?.posterUrl ?: media.backdropUrl)?.let { builder.setPosterArtUri(Uri.parse(it)) }
        if (episode != null) {
            builder.setSeasonNumber(episode.seasonNumber).setEpisodeNumber(episode.episodeNumber)
            episode.name?.let { builder.setEpisodeTitle(it) }
        }
        if (media.progress > 0) {
            builder.setLastPlaybackPositionMillis((media.progress * 1000).toInt())
            // The duration comes from the progress and its percentage, like the progress bar of the cards
            if (media.pourcent > 0)
                builder.setDurationMillis((media.progress * 100 / media.pourcent * 1000).toInt())
        }
        return builder.build()
    }

    // One program by media: a series moves to its next episode
    private fun key(media: Media) = "${media.type}/${media.id}"

    private fun engagedAt(media: Media): Long? = (media.lastWatchedAt ?: media.watchedAt)
        ?.let { runCatching { OffsetDateTime.parse(it).toInstant().toEpochMilli() }.getOrNull() }
}
