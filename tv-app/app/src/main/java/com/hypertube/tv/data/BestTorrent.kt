package com.hypertube.tv.data

import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.min

// Port of getBestTorrent (src/utils/getBestTorrent.tsx)
private data class SizeRange(val min: Double, val ideal: Double, val max: Double)

private val MOVIE_SIZE = SizeRange(1.5, 2.5, 3.5)
private val EPISODE_SIZE = SizeRange(0.3, 1.0, 1.5)

private val STATUS_SCORE = mapOf("completed" to 3000, "transcoding" to 2000, "downloading" to 1000)
private val QUALITY_SCORE = mapOf("2160p" to 100, "1080p" to 70, "720p" to 40, "480p" to 20)
private val LANGUAGE_SCORE = mapOf("MULTI" to 30, "TRUEFRENCH" to 25, "FRENCH" to 20, "VOSTFR" to 10, "VO" to 0)

private fun expectedSize(torrent: Torrent, isSeries: Boolean, episodeCount: Int?): SizeRange? = when {
    !isSeries -> MOVIE_SIZE
    !torrent.isSeasonPack -> EPISODE_SIZE
    episodeCount == null || episodeCount == 0 -> null
    else -> SizeRange(EPISODE_SIZE.min * episodeCount, EPISODE_SIZE.ideal * episodeCount, EPISODE_SIZE.max * episodeCount)
}

fun bestTorrent(torrents: List<Torrent>?, isSeries: Boolean, episodeCount: Int?): Torrent? {
    if (torrents.isNullOrEmpty())
        return null

    fun rank(strictSize: Boolean) = torrents.mapNotNull { torrent ->
        val expected = expectedSize(torrent, isSeries, episodeCount)
        val status = STATUS_SCORE[torrent.status] ?: 0
        if (strictSize && expected != null && status == 0 && (torrent.size < expected.min || torrent.size > expected.max))
            return@mapNotNull null

        val sizeScore = expected?.let { 30 * (1 - min(1.0, abs(torrent.size - it.ideal) / (it.max - it.min))) } ?: 0.0
        val seedScore = log10(torrent.seeders + 1.0) * 30
        val score = status + (QUALITY_SCORE[torrent.quality] ?: 0) + (LANGUAGE_SCORE[torrent.language] ?: 0) + seedScore + sizeScore
        torrent to score
    }

    // When every torrent has an unexpected size (e.g. a finale only released in big files), still pick the best one
    return rank(true).ifEmpty { rank(false) }.maxByOrNull { it.second }?.first
}
