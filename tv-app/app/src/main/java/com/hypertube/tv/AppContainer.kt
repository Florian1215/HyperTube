package com.hypertube.tv

import android.content.Context
import com.hypertube.tv.data.AuthInterceptor
import com.hypertube.tv.data.HyperTubeApi
import com.hypertube.tv.data.Repository
import com.hypertube.tv.data.ServerConfig
import com.hypertube.tv.data.SessionManager
import com.hypertube.tv.data.TokenAuthenticator
import com.hypertube.tv.data.TokenStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

class AppContainer(val context: Context) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
        isLenient = true
    }

    val tokens = TokenStore(context)

    private val refreshClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .build()

    val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(AuthInterceptor(tokens))
        .authenticator(TokenAuthenticator(tokens, refreshClient, json) { session.onSessionExpired() })
        .build()

    private val api: HyperTubeApi = Retrofit.Builder()
        .baseUrl(ServerConfig.API_URL)
        .client(http)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(HyperTubeApi::class.java)

    val repository = Repository(api, http, json)

    val session = SessionManager(repository, tokens, scope)

    private val _notices = MutableSharedFlow<Notice>(extraBufferCapacity = 4)
    val notices: SharedFlow<Notice> = _notices.asSharedFlow()

    fun notify(text: String, error: Boolean = true) {
        _notices.tryEmit(Notice(text, error))
    }
}

data class Notice(val text: String, val error: Boolean)
