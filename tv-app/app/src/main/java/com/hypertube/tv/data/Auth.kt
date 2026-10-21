package com.hypertube.tv.data

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import java.io.IOException

private val JSON_TYPE = "application/json".toMediaType()

class AuthInterceptor(private val tokens: TokenStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder().header("Accept-Language", currentLanguage())
        if (chain.request().url.toString().startsWith(ServerConfig.API_URL))
            tokens.access?.let { request.header("Authorization", "Bearer $it") }
        return chain.proceed(request.build())
    }
}

// Refreshes the access token on a 401, like apiClient on the website
class TokenAuthenticator(
    private val tokens: TokenStore,
    private val client: OkHttpClient,
    private val json: Json,
    private val onSessionExpired: () -> Unit,
) : Authenticator {
    private val lock = Any()

    override fun authenticate(route: Route?, response: Response): Request? {
        val sentToken = response.request.header("Authorization")?.removePrefix("Bearer ") ?: return null
        if (response.priorResponse != null)
            return null

        synchronized(lock) {
            val current = tokens.access
            if (current != null && current != sentToken)
                return response.request.newBuilder().header("Authorization", "Bearer $current").build()

            // A network error keeps the session, only a refused refresh token logs out
            val refreshed = try {
                tokens.refresh?.let { refreshAccess(it) }
            } catch (e: IOException) {
                return null
            }
            if (refreshed == null) {
                tokens.clear()
                onSessionExpired()
                return response.request.newBuilder().removeHeader("Authorization").build()
            }
            tokens.save(refreshed.access, refreshed.refresh)
            return response.request.newBuilder().header("Authorization", "Bearer ${refreshed.access}").build()
        }
    }

    private fun refreshAccess(refresh: String): Token? {
        val body = buildJsonObject { put("refresh", refresh) }.toString().toRequestBody(JSON_TYPE)
        val request = Request.Builder().url(ServerConfig.API_URL + "auth/refresh/").post(body).build()

        return client.newCall(request).execute().use { res ->
            if (!res.isSuccessful)
                return null
            runCatching { json.decodeFromString(Token.serializer(), res.body?.string().orEmpty()) }.getOrNull()
        }
    }
}
