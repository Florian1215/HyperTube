package com.hypertube.tv.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hypertube.tv.AppContainer
import com.hypertube.tv.data.MOVIES
import com.hypertube.tv.data.Media
import com.hypertube.tv.data.People
import com.hypertube.tv.data.SERIES
import com.hypertube.tv.data.SPECIAL_SEARCHES
import com.hypertube.tv.data.User
import com.hypertube.tv.util.isFuture
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

const val PEOPLE = "people"
const val USERS = "users"
val SEARCH_TYPES = listOf(MOVIES, SERIES, PEOPLE, USERS)

data class SearchState(
    val type: String = MOVIES,
    val text: String = "",
    // A list of the home page ("continue to watch", "upcoming"...) instead of a text search
    val special: String? = null,
    val medias: List<Media> = emptyList(),
    val people: List<People> = emptyList(),
    val users: List<User> = emptyList(),
    val page: Int = 0,
    val hasMore: Boolean = false,
    val loading: Boolean = true,
    val error: Boolean = false,
) {
    val isMedia get() = type == MOVIES || type == SERIES
}

@OptIn(FlowPreview::class)
class SearchViewModel(private val container: AppContainer, type: String?, query: String?) : ViewModel() {
    private val repository = container.repository
    private val _state = MutableStateFlow(
        SearchState(
            type = type?.takeIf { it in SEARCH_TYPES } ?: MOVIES,
            text = query?.takeIf { it !in SPECIAL_SEARCHES }.orEmpty(),
            special = query?.takeIf { it in SPECIAL_SEARCHES },
        ),
    )
    val state: StateFlow<SearchState> = _state.asStateFlow()
    private var job: Job? = null

    init {
        reload()
        viewModelScope.launch {
            repository.changes.debounce(300).collect { reload() }
        }
    }

    fun setText(text: String) {
        _state.update { it.copy(text = text, special = if (text.isNotEmpty()) null else it.special) }
        reload(debounce = true)
    }

    fun setType(type: String) {
        if (type == _state.value.type)
            return
        _state.update { it.copy(type = type, medias = emptyList(), people = emptyList(), users = emptyList()) }
        reload()
    }

    fun clearSpecial() {
        _state.update { it.copy(special = null) }
        reload()
    }

    fun reload(debounce: Boolean = false) {
        job?.cancel()
        _state.update { it.copy(loading = true, error = false) }
        job = viewModelScope.launch {
            if (debounce)
                delay(300)
            load(1)
        }
    }

    fun loadMore() {
        val current = _state.value
        if (job?.isActive == true || !current.hasMore)
            return
        job = viewModelScope.launch { load(current.page + 1) }
    }

    private suspend fun load(page: Int) {
        val current = _state.value
        val search = current.special ?: current.text.trim().lowercase()
        _state.update { it.copy(loading = true) }

        runCatching {
            when (current.type) {
                PEOPLE -> repository.people(search, page).let { res ->
                    _state.update { it.copy(people = (if (page == 1) emptyList() else it.people) + res.results, hasMore = res.next != null) }
                }
                USERS -> repository.users(search, page).let { res ->
                    _state.update { it.copy(users = (if (page == 1) emptyList() else it.users) + res.results, hasMore = res.next != null) }
                }
                else -> repository.medias(current.type, search, page).let { res ->
                    val results = if (current.special == null) res.results.filter(::isRelevant) else res.results
                    _state.update { it.copy(medias = (if (page == 1) emptyList() else it.medias) + results, hasMore = res.next != null) }
                }
            }
        }.onSuccess {
            _state.update { it.copy(page = page, loading = false) }
        }.onFailure { error ->
            if (error is kotlinx.coroutines.CancellationException)
                throw error
            _state.update { it.copy(loading = false, error = true, hasMore = false) }
        }
    }

    fun toggleFollow(user: User) {
        viewModelScope.launch {
            runCatching { repository.setFollow(user.id, user.isFollowing != true) }
                .onSuccess { updated ->
                    _state.update { state -> state.copy(users = state.users.map { if (it.id == user.id) it.copy(isFollowing = updated.isFollowing ?: (user.isFollowing != true)) else it }) }
                    repository.notifyChanged()
                }
                .onFailure { container.notify(repository.errorMessage(it) ?: it.message.orEmpty()) }
        }
    }

    // Same filter as the website search: hides the medias without images or with too few votes
    private fun isRelevant(media: Media) = !media.posterUrl.isNullOrBlank() && !media.backdropUrl.isNullOrBlank() &&
        (media.voteCount > 50 || media.releaseDate.isNullOrBlank() || isFuture(media.releaseDate))
}
