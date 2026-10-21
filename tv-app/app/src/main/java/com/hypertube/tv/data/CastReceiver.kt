package com.hypertube.tv.data

import android.content.Context
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import java.util.UUID

private const val POLL_DELAY_MS = 3000L

// Medias cast from the website signed in with the same account. Polling keeps the TV online for the backend,
// so the website shows its cast button while this flow is collected
class CastReceiver(context: Context, private val repository: Repository) {
    private val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)

    // Identifies this TV for the backend, kept across launches
    private val device: String = prefs.getString(DEVICE, null) ?: UUID.randomUUID().toString().also {
        prefs.edit().putString(DEVICE, it).apply()
    }

    // Network errors are retried silently, like the sign-in
    fun casts(): Flow<TvCast> = flow {
        while (true) {
            val cast = try {
                repository.tvPoll(device).cast
            } catch (error: CancellationException) {
                throw error
            } catch (error: Throwable) {
                null
            }
            if (cast != null)
                emit(cast)
            delay(POLL_DELAY_MS)
        }
    }

    private companion object {
        const val DEVICE = "device"
    }
}
