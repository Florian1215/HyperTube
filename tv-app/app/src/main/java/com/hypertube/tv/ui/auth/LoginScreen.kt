@file:OptIn(ExperimentalTvMaterial3Api::class)

package com.hypertube.tv.ui.auth

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.hypertube.tv.R
import com.hypertube.tv.ui.LocalAppContainer
import com.hypertube.tv.ui.Navigator
import com.hypertube.tv.ui.components.ButtonVariant
import com.hypertube.tv.ui.components.ColorsBar
import com.hypertube.tv.ui.components.HtButton
import com.hypertube.tv.ui.components.Logo
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtText
import kotlinx.coroutines.delay

@Composable
fun LoginScreen(nav: Navigator) {
    val container = LocalAppContainer.current
    val viewModel: LoginViewModel = viewModel { LoginViewModel(container) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val focus = remember { FocusRequester() }

    LaunchedEffect(state.success) {
        if (state.success) {
            delay(800)
            nav.back()
        }
    }
    LaunchedEffect(Unit) { runCatching { focus.requestFocus() } }

    // Steps on the left, QR code on the right, the only action is going back
    Column(Modifier.fillMaxSize().background(HtColors.Black)) {
        ColorsBar()
        Row(
            Modifier.weight(1f).padding(horizontal = 96.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(96.dp),
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(20.dp)) {
                Logo(height = 24.dp)
                Text(stringResource(if (state.success) R.string.login_success else R.string.login_title).uppercase(), style = HtText.Hero)
                Text(stringResource(R.string.login_step_scan), style = HtText.Body)
                Text(stringResource(R.string.login_step_signin), style = HtText.Body)
                Text(stringResource(R.string.login_step_confirm), style = HtText.Body)
                HtButton(
                    stringResource(R.string.back),
                    icon = Icons.AutoMirrored.Filled.ArrowBack,
                    variant = ButtonVariant.Outline,
                    onClick = { nav.back() },
                    modifier = Modifier.padding(top = 16.dp).focusRequester(focus),
                )
            }
            Box(Modifier.size(320.dp).background(HtColors.White).padding(16.dp), contentAlignment = Alignment.Center) {
                val url = state.url
                if (url != null) {
                    val qr = remember(url) { qrCode(url) }
                    Image(qr, contentDescription = null, filterQuality = FilterQuality.None, modifier = Modifier.size(288.dp))
                }
            }
        }
        ColorsBar()
    }
}

private fun qrCode(content: String, size: Int = 512): ImageBitmap {
    val matrix = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, size, size, mapOf(EncodeHintType.MARGIN to 0))
    val pixels = IntArray(size * size) { index -> if (matrix[index % size, index / size]) android.graphics.Color.BLACK else android.graphics.Color.WHITE }
    return Bitmap.createBitmap(pixels, size, size, Bitmap.Config.ARGB_8888).asImageBitmap()
}
