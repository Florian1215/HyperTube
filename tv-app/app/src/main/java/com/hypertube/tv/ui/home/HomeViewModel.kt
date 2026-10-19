package com.hypertube.tv.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hypertube.tv.AppContainer
import com.hypertube.tv.data.MOVIES
import com.hypertube.tv.data.Media
import com.hypertube.tv.data.SEARCH_DIRECTSTREAM
import com.hypertube.tv.data.SEARCH_FEATURED
import com.hypertube.tv.data.SEARCH_TOP_RATED
import com.hypertube.tv.data.SERIES
import com.hypertube.tv.data.groupActivities
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.random.Random

data class HomeState(
    // null while loading
    val featured: List<Media>? = null,
    val popular: List<Media>? = null,
    val mostRated: List<Media>? = null,
    val continueWatching: List<Media> = emptyList(),
    val comingSoon: List<Media> = emptyList(),
    val directStream: List<Media> = emptyList(),
    val friends: List<List<Media>> = emptyList(),
    val error: Boolean = false,
)

// Same sections as the home page of the website (src/app/page.tsx)
@OptIn(FlowPreview::class)
class HomeViewModel(private val container: AppContainer) : ViewModel() {
    private val repository = container.repository
    private val seed = Random.nextLong()
    private val _state = MutableStateFlow(HomeState())
    val state: StateFlow<HomeState> = _state.asStateFlow()
    private var job: Job? = null

    init {
        load()
        viewModelScope.launch {
            repository.changes.debounce(300).collect { load() }
        }
    }

    fun load() {
        job?.cancel()
        job = viewModelScope.launch {
            val user = container.session.user.value
            val featuredMovies = async { list(MOVIES, SEARCH_FEATURED) }
            val featuredSeries = async { list(SERIES, SEARCH_FEATURED) }
            val movies = async { list(MOVIES, null) }
            val series = async { list(SERIES, null) }
            val topRated = async { list(MOVIES, SEARCH_TOP_RATED) }
            val streamMovies = async { list(MOVIES, SEARCH_DIRECTSTREAM) }
            val streamSeries = async { list(SERIES, SEARCH_DIRECTSTREAM) }
            val continueWatching = async { user?.let { runCatching { repository.continueWatching(it.id) }.getOrNull() } ?: emptyList() }
            val comingSoon = async { user?.let { runCatching { repository.comingSoon(it.id) }.getOrNull() } ?: emptyList() }
            val friends = async { user?.let { runCatching { repository.followingActivity() }.getOrNull() } ?: emptyList() }

            val featured = (notWatched(featuredMovies.await()) + notWatched(featuredSeries.await())).sortedByDescending { it.featureAt.orEmpty() }
            val popular = (notWatched(movies.await()) + notWatched(series.await())).shuffled(Random(seed))
            val failed = featuredMovies.await() == null && movies.await() == null

            _state.update {
                it.copy(
                    featured = featured,
                    popular = popular,
                    mostRated = notWatched(topRated.await()).shuffled(Random(seed)),
                    continueWatching = continueWatching.await(),
                    comingSoon = comingSoon.await(),
                    directStream = (notWatched(streamMovies.await()) + notWatched(streamSeries.await())).sortedByDescending { media -> media.lastWatchedAt.orEmpty() },
                    friends = groupActivities(friends.await().filter { activity -> !activity.backdropUrl.isNullOrBlank() }),
                    error = failed,
                )
            }
        }
    }

    private suspend fun list(type: String, query: String?): List<Media>? = runCatching { repository.medias(type, query).results }.getOrNull()

    private fun notWatched(medias: List<Media>?) = medias.orEmpty().filter { !it.complete && !it.backdropUrl.isNullOrBlank() }
}
