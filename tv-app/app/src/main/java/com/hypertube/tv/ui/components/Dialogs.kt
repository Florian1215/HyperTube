@file:OptIn(ExperimentalTvMaterial3Api::class)

package com.hypertube.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.ui.theme.LocalAccent

@Composable
fun HtDialog(onDismiss: () -> Unit, title: String?, maxWidth: Dp = 720.dp, content: @Composable ColumnScope.() -> Unit) {
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(
            modifier = Modifier
                .widthIn(max = maxWidth)
                .padding(32.dp)
                .background(HtColors.Black)
                .border(1.dp, HtColors.White)
                .padding(28.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            if (title != null)
                Text(title.uppercase(), style = HtText.Title)
            content()
        }
    }
}

data class MenuAction(val label: String, val icon: ImageVector? = null, val onClick: () -> Unit)

// The right-click menu of the website, opened with a long press on the remote
@Composable
fun ActionMenu(title: String?, actions: List<MenuAction>, onDismiss: () -> Unit) {
    val first = remember { FocusRequester() }
    // Opened by a long press on OK: the key is still held, its repeats and its release must not click the first action
    var okPressed by remember { mutableStateOf(false) }

    HtDialog(onDismiss = onDismiss, title = title, maxWidth = 520.dp) {
        Column(
            Modifier.onPreviewKeyEvent { event ->
                if (event.key != Key.DirectionCenter && event.key != Key.Enter && event.key != Key.NumPadEnter)
                    return@onPreviewKeyEvent false
                if (event.type == KeyEventType.KeyDown && event.nativeKeyEvent.repeatCount == 0)
                    okPressed = true
                !okPressed
            },
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            actions.forEachIndexed { index, action ->
                FocusSurface(
                    onClick = {
                        action.onClick()
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth().then(if (index == 0) Modifier.focusRequester(first) else Modifier),
                    focusedScale = 1.02f,
                    focusedContentColor = LocalAccent.current,
                ) {
                    Row(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        if (action.icon != null) {
                            HtIcon(action.icon)
                            Spacer(Modifier.width(14.dp))
                        }
                        Text(action.label, style = HtText.Body)
                    }
                }
            }
        }
    }
    LaunchedEffect(Unit) { runCatching { first.requestFocus() } }
}

@Composable
fun CenteredMessage(text: String, modifier: Modifier = Modifier, action: (@Composable () -> Unit)? = null) {
    Box(modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(text, style = HtText.Body, color = HtColors.Gray)
            action?.invoke()
        }
    }
}
