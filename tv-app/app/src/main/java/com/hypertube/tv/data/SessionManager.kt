package com.hypertube.tv.data

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

val ACCENTS = listOf("yellow", "pink", "green", "purple", "blue", "red")

// Accounts the menu has room for: with the guest, 3 pictures on 2 rows
const val MAX_ACCOUNTS = 5

class SessionManager(private val repository: Repository, private val tokens: TokenStore, private val scope: CoroutineScope) {
    // The saved user is shown right away, then refreshed from the API
    private val _user = MutableStateFlow(tokens.current?.user)
    val user: StateFlow<User?> = _user.asStateFlow()

    // Every signed in account, the current one included
    private val _accounts = MutableStateFlow(tokens.accounts.map { it.user })
    val accounts: StateFlow<List<User>> = _accounts.asStateFlow()

    private val _restoring = MutableStateFlow(tokens.access != null)
    val restoring: StateFlow<Boolean> = _restoring.asStateFlow()

    // Random accent color when nobody is signed in, like the website
    val defaultAccent = ACCENTS.random()

    init {
        if (tokens.access != null)
            scope.launch {
                refreshUser()
                _restoring.value = false
                repository.notifyChanged()
            }
    }

    // Adds the account and switches to it, the current account stays signed in
    suspend fun login(access: String, refresh: String?) {
        tokens.begin(Token(access, refresh))
        val user = try {
            repository.me()
        } catch (error: Throwable) {
            tokens.cancel()
            throw error
        }
        tokens.add(user)
        publish()
        repository.notifyChanged()
    }

    fun switchTo(id: Int) {
        if (id == _user.value?.id)
            return
        tokens.select(id)
        publish()
        repository.notifyChanged()
        scope.launch { refreshUser() }
    }

    // Watches without an account while keeping the accounts signed in, like signed out
    fun switchToGuest() {
        if (_user.value == null)
            return
        tokens.selectGuest()
        publish()
        repository.notifyChanged()
    }

    // Signs out of the current account only, the next one takes its place
    fun logout() {
        val id = _user.value?.id ?: return
        tokens.remove(id)
        publish()
        repository.notifyChanged()
    }

    fun onSessionExpired() {
        publish()
        repository.notifyChanged()
    }

    private suspend fun refreshUser() {
        try {
            tokens.update(repository.me())
            publish()
        } catch (error: CancellationException) {
            throw error
        } catch (error: Throwable) {
            // Offline: the saved user is kept, a refused refresh token already removed the account
        }
    }

    private fun publish() {
        _user.value = tokens.current?.user
        _accounts.value = tokens.accounts.map { it.user }
    }
}
