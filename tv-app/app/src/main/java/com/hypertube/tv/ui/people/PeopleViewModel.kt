package com.hypertube.tv.ui.people

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hypertube.tv.AppContainer
import com.hypertube.tv.data.Media
import com.hypertube.tv.data.PERSON_ROLES
import com.hypertube.tv.data.Person
import com.hypertube.tv.data.isNotFound
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

// DEPARTMENT_ROLES of the website: the tab opened first
private val DEPARTMENT_ROLES = mapOf("Acting" to "cast", "Directing" to "directing", "Writing" to "writing", "Creator" to "writing")

data class PeopleState(
    val person: Person? = null,
    val notFound: Boolean = false,
    val error: Boolean = false,
    val role: String? = null,
    // Number of medias by role, the tabs without medias are hidden
    val counts: Map<String, Int>? = null,
    val medias: List<Media> = emptyList(),
    val page: Int = 0,
    val hasMore: Boolean = false,
    val loading: Boolean = true,
) {
    val roles get() = PERSON_ROLES.filter { counts == null || (counts[it] ?: 0) > 0 }
}

@OptIn(FlowPreview::class)
class PeopleViewModel(container: AppContainer, private val id: String) : ViewModel() {
    private val repository = container.repository
    private val _state = MutableStateFlow(PeopleState())
    val state: StateFlow<PeopleState> = _state.asStateFlow()
    private var job: Job? = null

    init {
        load()
        viewModelScope.launch {
            // Watched state changed from the context menu
            repository.changes.debounce(300).collect { _state.value.role?.let { role -> reloadMedias(role) } }
        }
    }

    fun load() {
        _state.update { PeopleState() }
        job?.cancel()
        job = viewModelScope.launch {
            runCatching { repository.person(id) }
                .onSuccess { person ->
                    _state.update { it.copy(person = person) }
                    val main = DEPARTMENT_ROLES[person.department] ?: "crew"
                    loadPage(main, 1)
                    // Like the website, the main role only when it has medias
                    val roles = _state.value.roles
                    if (main !in roles && roles.isNotEmpty())
                        loadPage(roles.first(), 1)
                }
                .onFailure { error ->
                    if (error is CancellationException)
                        throw error
                    _state.update { it.copy(loading = false, notFound = error.isNotFound(), error = !error.isNotFound()) }
                }
        }
    }

    fun setRole(role: String) {
        if (role != _state.value.role)
            reloadMedias(role)
    }

    fun loadMore() {
        val current = _state.value
        val role = current.role ?: return
        if (job?.isActive == true || !current.hasMore)
            return
        job = viewModelScope.launch { loadPage(role, current.page + 1) }
    }

    private fun reloadMedias(role: String) {
        job?.cancel()
        _state.update { it.copy(role = role, medias = if (role == it.role) it.medias else emptyList()) }
        job = viewModelScope.launch { loadPage(role, 1) }
    }

    private suspend fun loadPage(role: String, page: Int) {
        _state.update { it.copy(role = role, loading = true) }
        runCatching { repository.personMedias(id, role, page) }
            .onSuccess { res ->
                _state.update {
                    it.copy(
                        medias = ((if (page == 1) emptyList() else it.medias) + res.results).distinctBy(Media::listKey),
                        counts = res.counts,
                        page = page,
                        hasMore = res.next != null,
                        loading = false,
                    )
                }
            }
            .onFailure { error ->
                if (error is CancellationException)
                    throw error
                _state.update { it.copy(loading = false, hasMore = false, error = page == 1) }
            }
    }
}
