package com.hypertube.tv.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hypertube.tv.AppContainer
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private const val POLL_DELAY_MS = 3000L

data class LoginState(
    // Page opened on the phone by the QR code
    val url: String? = null,
    val success: Boolean = false,
)

// Sign in with a phone: the TV shows a QR code, the phone (signed in on the website) approves it, then the TV gets its tokens.
// The code stays valid while this screen polls it, a new one is only created when the backend forgot it (TV asleep...)
class LoginViewModel(private val container: AppContainer) : ViewModel() {
    private val repository = container.repository
    private val _state = MutableStateFlow(LoginState())
    val state: StateFlow<LoginState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            while (true) {
                val session = request { repository.startTvLogin() }
                if (session == null) {
                    delay(POLL_DELAY_MS)
                    continue
                }
                _state.update { it.copy(url = session.url) }
                if (waitForApproval(session.code))
                    return@launch
            }
        }
    }

    // Polls the status until the phone approves the code, false when the backend does not know the code anymore
    private suspend fun waitForApproval(code: String): Boolean {
        while (true) {
            val status = request { repository.tvLoginStatus(code) }
            val access = status?.access
            if (status?.status == "approved" && access != null) {
                if (request { container.session.login(access, status.refresh) } != null) {
                    _state.update { it.copy(success = true) }
                    return true
                }
                return false
            }
            if (status?.status == "expired")
                return false
            delay(POLL_DELAY_MS)
        }
    }

    // Network errors are retried silently, the QR code stays on screen
    private suspend fun <T> request(block: suspend () -> T): T? = try {
        block()
    } catch (error: CancellationException) {
        throw error
    } catch (error: Throwable) {
        null
    }
}
