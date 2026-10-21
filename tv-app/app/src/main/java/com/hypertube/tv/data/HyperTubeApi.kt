package com.hypertube.tv.data

import kotlinx.serialization.json.JsonObject
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.HTTP
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

// Endpoints used by the website services (src/services/*.service.ts)
interface HyperTubeApi {
    /* ----------------------------------------------- MEDIAS ----------------------------------------------- */
    @GET("{type}/")
    suspend fun medias(@Path("type") type: String, @Query("page") page: Int, @Query("search") search: String? = null): Page<Media>

    // featured, directstream, upcoming, continue-watching, friends-activity, top-rated
    @GET("{type}/{list}/")
    suspend fun mediaList(@Path("type") type: String, @Path("list") list: String, @Query("page") page: Int? = null): Page<Media>

    @GET("{type}/{id}/")
    suspend fun media(@Path("type") type: String, @Path("id") id: String): MediaDetails

    @GET("movies/{id}/collection/")
    suspend fun collection(@Path("id") id: String): Collection

    @GET("series/{id}/season/{season}/")
    suspend fun season(@Path("id") id: String, @Path("season") season: Int): Season

    @PATCH("{type}/{id}/progress/")
    suspend fun updateProgress(@Path("type") type: String, @Path("id") id: String, @Body body: JsonObject): Response<ResponseBody>

    @HTTP(method = "DELETE", path = "{type}/{id}/progress/", hasBody = true)
    suspend fun deleteProgress(@Path("type") type: String, @Path("id") id: String, @Body body: JsonObject): Response<ResponseBody>

    @POST("series/{id}/watched/")
    suspend fun setSeriesWatched(@Path("id") id: String, @Body body: JsonObject): Response<ResponseBody>

    @HTTP(method = "DELETE", path = "series/{id}/watched/", hasBody = true)
    suspend fun deleteSeriesWatched(@Path("id") id: String, @Body body: JsonObject): Response<ResponseBody>

    @PATCH("{type}/{id}/feature/")
    suspend fun updateFeature(@Path("type") type: String, @Path("id") id: String, @Body body: JsonObject): Response<ResponseBody>

    @POST("{type}/{id}/watchlist/")
    suspend fun addToWatchlist(@Path("type") type: String, @Path("id") id: String): Response<ResponseBody>

    @HTTP(method = "DELETE", path = "{type}/{id}/watchlist/")
    suspend fun removeFromWatchlist(@Path("type") type: String, @Path("id") id: String): Response<ResponseBody>

    /* ---------------------------------------------- TORRENTS ---------------------------------------------- */
    @GET("{type}/{id}/torrents/")
    suspend fun torrents(
        @Path("type") type: String,
        @Path("id") id: String,
        @Query("season_number") season: Int? = null,
        @Query("episode_number") episode: Int? = null,
    ): Page<Torrent>

    @GET("{type}/{id}/torrents/request/")
    suspend fun torrentRequest(
        @Path("type") type: String,
        @Path("id") id: String,
        @Query("season_number") season: Int? = null,
        @Query("episode_number") episode: Int? = null,
    ): TorrentRequestState

    @POST("{type}/{id}/torrents/request/")
    suspend fun requestTorrent(
        @Path("type") type: String,
        @Path("id") id: String,
        @Query("season_number") season: Int? = null,
        @Query("episode_number") episode: Int? = null,
    ): TorrentRequestState

    @HTTP(method = "DELETE", path = "{type}/{id}/torrents/request/")
    suspend fun cancelTorrentRequest(
        @Path("type") type: String,
        @Path("id") id: String,
        @Query("season_number") season: Int? = null,
        @Query("episode_number") episode: Int? = null,
    ): Response<ResponseBody>

    @POST("torrents/{id}/")
    suspend fun startTorrent(@Path("id") id: String, @Body body: JsonObject): TorrentStream

    @GET("torrents/{id}/")
    suspend fun torrentStatus(@Path("id") id: String, @Query("episode_number") episode: Int? = null): TorrentStream

    /* ------------------------------------------- PEOPLE & USERS ------------------------------------------- */
    @GET("people/")
    suspend fun people(@Query("search") search: String, @Query("page") page: Int): Page<People>

    @GET("people/{id}/")
    suspend fun person(@Path("id") id: String): Person

    @GET("people/{id}/medias/")
    suspend fun personMedias(@Path("id") id: String, @Query("role") role: String, @Query("page") page: Int): PersonMedias

    @GET("users/")
    suspend fun users(@Query("search") search: String, @Query("page") page: Int): Page<User>

    @GET("users/{id}/")
    suspend fun user(@Path("id") id: String): User

    @POST("users/{id}/follow/")
    suspend fun follow(@Path("id") id: Int): User

    @HTTP(method = "DELETE", path = "users/{id}/follow/")
    suspend fun unfollow(@Path("id") id: Int): User

    @GET("users/{id}/history/")
    suspend fun history(@Path("id") id: Int, @Query("type") type: String, @Query("page") page: Int): Page<Media>

    @GET("users/{id}/watchlist/")
    suspend fun watchlist(@Path("id") id: Int, @Query("page") page: Int): Page<Media>

    @GET("users/{id}/continue-watching/")
    suspend fun continueWatching(@Path("id") id: Int): Page<Media>

    @GET("users/{id}/coming-soon/")
    suspend fun comingSoon(@Path("id") id: Int): Page<Media>

    @GET("users/following/activity/")
    suspend fun followingActivity(): Page<Media>

    /* ------------------------------------------- TV SIGN-IN ----------------------------------------------- */
    // See README, backend in users/tv_login.py
    @POST("auth/tv/")
    suspend fun startTvLogin(): TvLoginSession

    @GET("auth/tv/{code}/")
    suspend fun tvLoginStatus(@Path("code") code: String): TvLoginStatus

    /* ---------------------------------------------- TV CAST ----------------------------------------------- */
    @GET("tv/poll/")
    suspend fun tvPoll(@Query("device") device: String): TvPoll
}
