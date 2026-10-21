package com.hypertube.tv

import android.graphics.drawable.ColorDrawable
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.toArgb
import com.hypertube.tv.data.DeepLink
import com.hypertube.tv.ui.AppNavigation
import com.hypertube.tv.ui.LocalAppContainer
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HyperTubeTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val container = (application as HyperTubeApp).container
        if (savedInstanceState == null)
            openLink(intent)
        // The window of the theme follows the system, a mode chosen in the app replaces it before the first frame
        container.theme.dark.value?.let { dark -> window.setBackgroundDrawable(ColorDrawable(if (dark) HtColors.Black.toArgb() else HtColors.White.toArgb())) }

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

    // singleTask: a link opened while the app runs comes here
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        openLink(intent)
    }

    private fun openLink(intent: Intent?) {
        DeepLink.parse(intent?.data)?.let { (application as HyperTubeApp).container.open(it) }
    }
}
