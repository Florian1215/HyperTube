package com.hypertube.tv.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hypertube.tv.AppContainer
import com.hypertube.tv.data.ServerConfig
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private const val POLL_DELAY_MS = 3000L
private const val CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

data class LoginState(
    val code: String? = null,
    // Page opened on the phone by the QR code
    val url: String? = null,
    val secondsLeft: Int = 0,
    val success: Boolean = false,
)

// Sign-in with a phone: the TV shows a code, the phone (already signed in on the website) approves it,
// then the TV gets its tokens. Only the TV side exists for now, the backend contract is in the README.
class LoginViewModel(private val container: AppContainer) : ViewModel() {
    private val repository = container.repository
    private val _state = MutableStateFlow(LoginState())
    val state: StateFlow<LoginState> = _state.asStateFlow()
    private var job: Job? = null

    init {
        newCode()
    }

    fun newCode() {
        job?.cancel()
        job = viewModelScope.launch {
            while (true) {
                val session = runCatching { repository.startTvLogin() }.getOrNull()
                val code = session?.code ?: localCode()
                val url = session?.url ?: "${ServerConfig.SERVER_URL}/tv?code=$code"
                val expiresIn = session?.expiresIn ?: 300
                _state.update { it.copy(code = code, url = url, secondsLeft = expiresIn) }

                if (waitForApproval(code, expiresIn))
                    return@launch
            }
        }
    }

    // Polls the status until the phone approves the code, false when the code expired
    private suspend fun waitForApproval(code: String, expiresIn: Int): Boolean {
        val end = System.currentTimeMillis() + expiresIn * 1000L

        while (System.currentTimeMillis() < end) {
            _state.update { it.copy(secondsLeft = ((end - System.currentTimeMillis()) / 1000).toInt()) }
            val status = try {
                repository.tvLoginStatus(code)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Throwable) {
                null
            }
            val access = status?.access
            if (status != null && status.status == "approved" && access != null) {
                val loggedIn = runCatching { container.session.login(access, status.refresh) }.isSuccess
                if (loggedIn) {
                    _state.update { it.copy(success = true) }
                    return true
                }
            }
            if (status != null && status.status == "expired")
                return false
            delay(POLL_DELAY_MS)
        }
        return false
    }

    private fun localCode() = (1..8).map { CODE_CHARS.random() }.joinToString("")
}
