package com.hypertube.tv.data

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

val ACCENTS = listOf("yellow", "pink", "green", "purple", "blue", "red")

class SessionManager(private val repository: Repository, private val tokens: TokenStore, scope: CoroutineScope) {
    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user.asStateFlow()

    private val _restoring = MutableStateFlow(tokens.access != null)
    val restoring: StateFlow<Boolean> = _restoring.asStateFlow()

    // Random accent color when nobody is signed in, like the website
    val defaultAccent = ACCENTS.random()

    init {
        if (tokens.access != null)
            scope.launch {
                _user.value = runCatching { repository.me() }.getOrNull()
                _restoring.value = false
                repository.notifyChanged()
            }
    }

    suspend fun login(access: String, refresh: String?) {
        tokens.save(access, refresh)
        _user.value = repository.me()
        repository.notifyChanged()
    }

    fun logout() {
        tokens.clear()
        _user.value = null
        repository.notifyChanged()
    }

    fun onSessionExpired() {
        _user.value = null
        repository.notifyChanged()
    }
}
