package com.hypertube.tv.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

// Mode chosen in the account menu, null follows the system like the website
class ThemeStore(context: Context) {
    private val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)

    private val _dark = MutableStateFlow(if (prefs.contains(DARK)) prefs.getBoolean(DARK, true) else null)
    val dark: StateFlow<Boolean?> = _dark.asStateFlow()

    fun setDark(dark: Boolean) {
        prefs.edit().putBoolean(DARK, dark).apply()
        _dark.value = dark
    }

    private companion object {
        const val DARK = "dark"
    }
}
