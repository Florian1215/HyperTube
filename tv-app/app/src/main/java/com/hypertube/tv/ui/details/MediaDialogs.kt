@file:OptIn(ExperimentalTvMaterial3Api::class)

package com.hypertube.tv.ui.details

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.hypertube.tv.R
import com.hypertube.tv.data.WatchedBy
import com.hypertube.tv.ui.components.FocusSurface
import com.hypertube.tv.ui.components.HtDialog
import com.hypertube.tv.ui.components.ProfilePicture
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.ui.theme.LocalAccent

@Composable
fun WatchedByDialog(watchedBy: List<WatchedBy>, onDismiss: () -> Unit) {
    val first = remember { FocusRequester() }

    HtDialog(onDismiss = onDismiss, title = stringResource(R.string.media_watched_by), maxWidth = 640.dp) {
        LazyColumn(Modifier.height(420.dp), verticalArrangement = Arrangement.spacedBy(4.dp), contentPadding = PaddingValues(6.dp)) {
            items(watchedBy, key = { it.id }) { viewer ->
                FocusSurface(
                    onClick = {},
                    modifier = Modifier.fillMaxWidth().then(if (viewer == watchedBy.first()) Modifier.focusRequester(first) else Modifier),
                    focusedScale = 1.01f,
                    focusedContentColor = LocalAccent.current,
                ) {
                    Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        ProfilePicture(viewer.toUser(), size = 40.dp)
                        Text(viewer.username, style = HtText.Bold, modifier = Modifier.weight(1f))
                        if (viewer.watchCount > 1)
                            Text("×${viewer.watchCount}", style = HtText.Bold, color = HtColors.Gray)
                    }
                }
            }
        }
    }
    LaunchedEffect(Unit) { runCatching { first.requestFocus() } }
}
