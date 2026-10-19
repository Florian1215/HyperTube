package com.hypertube.tv.ui.user

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hypertube.tv.AppContainer
import com.hypertube.tv.data.MOVIES
import com.hypertube.tv.data.Media
import com.hypertube.tv.data.Page
import com.hypertube.tv.data.SERIES
import com.hypertube.tv.data.User
import com.hypertube.tv.data.isNotFound
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

// Tabs of the profile on the website, without the comments
enum class UserTab { Movies, Series, Watchlist }

data class UserState(
    val user: User? = null,
    val notFound: Boolean = false,
    val error: Boolean = false,
    val tab: UserTab = UserTab.Movies,
    val counts: Map<UserTab, Int> = emptyMap(),
    val medias: List<Media> = emptyList(),
    val page: Int = 0,
    val hasMore: Boolean = false,
    val loading: Boolean = true,
    val following: Boolean = false,
)

@OptIn(FlowPreview::class)
class UserViewModel(private val container: AppContainer, private val id: String) : ViewModel() {
    private val repository = container.repository
    private val _state = MutableStateFlow(UserState())
    val state: StateFlow<UserState> = _state.asStateFlow()
    private var job: Job? = null

    init {
        load()
        viewModelScope.launch {
            // Watched state or watchlist changed from the context menu
            repository.changes.debounce(300).collect { if (_state.value.user != null) loadTabs() }
        }
    }

    fun load() {
        job?.cancel()
        _state.update { UserState(tab = it.tab) }
        job = viewModelScope.launch {
            runCatching { repository.user(id) }
                .onSuccess { user ->
                    _state.update { it.copy(user = user) }
                    loadTabs()
                }
                .onFailure { error ->
                    if (error is CancellationException)
                        throw error
                    _state.update { it.copy(loading = false, notFound = error.isNotFound(), error = !error.isNotFound()) }
                }
        }
    }

    // The first page of each tab gives the counts shown next to the tab names
    private suspend fun loadTabs() {
        val user = _state.value.user ?: return
        runCatching {
            val pages = UserTab.entries.associateWith { tab -> viewModelScope.async { fetch(user.id, tab, 1) } }
            pages.mapValues { it.value.await() }
        }.onSuccess { pages ->
            _state.update { state ->
                val page = pages.getValue(state.tab)
                state.copy(counts = pages.mapValues { it.value.count }, medias = page.results, page = 1, hasMore = page.next != null, loading = false)
            }
        }.onFailure { error ->
            if (error is CancellationException)
                throw error
            _state.update { it.copy(loading = false, error = true) }
        }
    }

    fun setTab(tab: UserTab) {
        if (tab == _state.value.tab)
            return
        job?.cancel()
        _state.update { it.copy(tab = tab, medias = emptyList(), page = 0, hasMore = false) }
        job = viewModelScope.launch { loadPage(1) }
    }

    fun loadMore() {
        val current = _state.value
        if (job?.isActive == true || !current.hasMore)
            return
        job = viewModelScope.launch { loadPage(current.page + 1) }
    }

    private suspend fun loadPage(page: Int) {
        val current = _state.value
        val user = current.user ?: return
        _state.update { it.copy(loading = true) }
        runCatching { fetch(user.id, current.tab, page) }
            .onSuccess { res ->
                _state.update {
                    it.copy(medias = (if (page == 1) emptyList() else it.medias) + res.results, page = page, hasMore = res.next != null, loading = false)
                }
            }
            .onFailure { error ->
                if (error is CancellationException)
                    throw error
                _state.update { it.copy(loading = false, hasMore = false, error = page == 1) }
            }
    }

    private suspend fun fetch(userId: Int, tab: UserTab, page: Int): Page<Media> = when (tab) {
        UserTab.Movies -> repository.history(userId, MOVIES, page)
        UserTab.Series -> repository.history(userId, SERIES, page)
        UserTab.Watchlist -> repository.watchlist(userId, page)
    }

    fun toggleFollow() {
        val user = _state.value.user ?: return
        if (_state.value.following)
            return
        _state.update { it.copy(following = true) }
        viewModelScope.launch {
            runCatching { repository.setFollow(user.id, user.isFollowing != true) }
                .onSuccess { updated ->
                    _state.update { it.copy(user = user.copy(isFollowing = updated.isFollowing ?: (user.isFollowing != true))) }
                    repository.notifyChanged()
                }
                .onFailure { container.notify(repository.errorMessage(it) ?: it.message.orEmpty()) }
            _state.update { it.copy(following = false) }
        }
    }
}
