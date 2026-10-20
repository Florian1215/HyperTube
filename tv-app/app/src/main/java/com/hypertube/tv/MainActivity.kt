package com.hypertube.tv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.hypertube.tv.ui.AppNavigation
import com.hypertube.tv.ui.LocalAppContainer
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HyperTubeTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val container = (application as HyperTubeApp).container

        setContent {
            val user by container.session.user.collectAsState()
            val dark by container.theme.dark.collectAsState()

            // The accent is the color of the signed in user and the mode the system one until chosen, like on the website
            CompositionLocalProvider(LocalAppContainer provides container) {
                HyperTubeTheme(accent = HtColors.named(user?.color ?: container.session.defaultAccent), dark = dark ?: isSystemInDarkTheme()) {
                    AppNavigation()
                }
            }
        }
    }
}
