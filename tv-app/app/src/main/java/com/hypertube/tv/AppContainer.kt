package com.hypertube.tv

import android.content.Context
import com.hypertube.tv.data.AuthInterceptor
import com.hypertube.tv.data.CastReceiver
import com.hypertube.tv.data.HyperTubeApi
import com.hypertube.tv.data.Repository
import com.hypertube.tv.data.ServerConfig
import com.hypertube.tv.data.SessionManager
import com.hypertube.tv.data.ThemeStore
import com.hypertube.tv.data.TvCast
import com.hypertube.tv.data.WatchNext
import com.hypertube.tv.data.TokenAuthenticator
import com.hypertube.tv.data.TokenStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.merge
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit

@OptIn(FlowPreview::class)
class AppContainer(val context: Context) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
        isLenient = true
    }

    val tokens = TokenStore(context, json)

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

    val theme = ThemeStore(context)

    val casts = CastReceiver(context, repository)

    val watchNext = WatchNext(context, repository)

    // Medias to open and play, from the links of the home screen (Watch Next)
    private val _links = MutableStateFlow<TvCast?>(null)
    val links: StateFlow<TvCast?> = _links.asStateFlow()

    fun open(link: TvCast) {
        _links.value = link
    }

    fun consumeLink() {
        _links.value = null
    }

    init {
        // The Watch Next row follows the account in use and its progress
        scope.launch {
            merge(session.user.map { it?.id }.distinctUntilChanged().map { }, repository.changes)
                .debounce(1000)
                .collect { watchNext.sync(session.user.value) }
        }
    }

    private val _notices = MutableSharedFlow<Notice>(extraBufferCapacity = 4)
    val notices: SharedFlow<Notice> = _notices.asSharedFlow()

    fun notify(text: String, error: Boolean = true) {
        _notices.tryEmit(Notice(text, error))
    }

    // Message of the API when it gives one, otherwise what went wrong: the network, the server or something else
    fun errorText(error: Throwable): String = repository.errorMessage(error) ?: context.getString(
        when {
            error is IOException -> R.string.error_network
            (error as? HttpException)?.code()?.let { it >= 500 } == true -> R.string.error_server
            else -> R.string.error_unknown
        }
    )
}

data class Notice(val text: String, val error: Boolean)
