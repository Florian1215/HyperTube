package com.hypertube.tv.data

import android.content.Context

class TokenStore(context: Context) {
    private val prefs = context.getSharedPreferences("auth", Context.MODE_PRIVATE)

    val access: String? get() = prefs.getString(ACCESS, null)
    val refresh: String? get() = prefs.getString(REFRESH, null)

    fun save(access: String, refresh: String?) {
        prefs.edit().putString(ACCESS, access).apply {
            if (refresh != null)
                putString(REFRESH, refresh)
        }.apply()
    }

    fun clear() = prefs.edit().remove(ACCESS).remove(REFRESH).apply()

    private companion object {
        const val ACCESS = "access"
        const val REFRESH = "refresh"
    }
}
