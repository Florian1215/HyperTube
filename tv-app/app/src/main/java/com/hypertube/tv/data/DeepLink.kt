package com.hypertube.tv.data

import android.net.Uri

// Links opening the app from outside (the Watch Next row of the home screen): hypertube://media/<type>/<id>?season=&episode=
// They play the media like a cast from the website
object DeepLink {
    private const val SCHEME = "hypertube"
    private const val MEDIA = "media"

    fun media(type: String, id: String, season: Int? = null, episode: Int? = null): Uri = Uri.Builder()
        .scheme(SCHEME)
        .authority(MEDIA)
        .appendPath(type)
        .appendPath(id)
        .apply {
            if (season != null && episode != null)
                appendQueryParameter("season", season.toString()).appendQueryParameter("episode", episode.toString())
        }
        .build()

    fun parse(uri: Uri?): TvCast? {
        if (uri == null || uri.scheme != SCHEME || uri.host != MEDIA)
            return null
        val (type, id) = uri.pathSegments.takeIf { it.size == 2 } ?: return null
        if (type !in listOf(MOVIES, SERIES) || !id.all(Char::isDigit))
            return null
        val season = uri.getQueryParameter("season")?.toIntOrNull()
        val episode = uri.getQueryParameter("episode")?.toIntOrNull()
        return TvCast(type, id, season.takeIf { episode != null }, episode.takeIf { season != null })
    }
}
