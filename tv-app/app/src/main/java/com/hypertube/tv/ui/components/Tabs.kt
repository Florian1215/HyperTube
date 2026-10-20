@file:OptIn(ExperimentalComposeUiApi::class, ExperimentalTvMaterial3Api::class)

package com.hypertube.tv.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.ui.theme.LocalAccent

data class Tab(val name: String, val count: Int? = null)

// Tabs of the website with the number of items next to the name, the focus enters on the active one
@Composable
fun HtTabs(tabs: List<Tab>, active: Int, onChange: (Int) -> Unit, modifier: Modifier = Modifier) {
    val activeFocus = remember { FocusRequester() }

    LazyRow(
        modifier.focusProperties { enter = { activeFocus } },
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(vertical = 8.dp, horizontal = 4.dp),
    ) {
        itemsIndexed(tabs) { index, tab ->
            HtChip(
                listOfNotNull(tab.name, tab.count?.toString()).joinToString(" "),
                selected = index == active,
                onClick = { onChange(index) },
                modifier = if (index == active) Modifier.focusRequester(activeFocus) else Modifier,
            )
        }
    }
}

// Tabs component of the website (src/components/ui/Tabs.tsx): boxed tabs on an accent line, the active one is open at the bottom
// and outlined with the accent color, the count is small at the top right of the name
@Composable
fun FolderTabs(tabs: List<Tab>, active: Int, onChange: (Int) -> Unit, modifier: Modifier = Modifier) {
    val accent = LocalAccent.current
    val activeFocus = remember { FocusRequester() }
    // A segment of the tabs: its top, right and bottom borders (null: no border), over the focused background
    fun Modifier.borders(top: Color?, right: Color?, bottom: Color?) = drawWithContent {
        drawContent()
        val width = 1.dp.toPx()
        top?.let { drawRect(it, Offset.Zero, Size(size.width, width)) }
        right?.let { drawRect(it, Offset(size.width - width, 0f), Size(width, size.height)) }
        bottom?.let { drawRect(it, Offset(0f, size.height - width), Size(size.width, width)) }
    }

    Row(
        modifier.fillMaxWidth().height(64.dp).focusProperties { enter = { activeFocus } },
    ) {
        Box(Modifier.width(48.dp).fillMaxHeight().borders(null, if (active == 0) accent else HtColors.DBlack, accent))
        tabs.forEachIndexed { index, tab ->
            val selected = index == active
            val right = if (selected || active == index + 1) accent else HtColors.DBlack
            FocusSurface(
                onClick = { onChange(index) },
                focusedScale = 1f,
                focusedContainerColor = HtColors.DWhiteLight,
                focusedContentColor = accent,
                modifier = Modifier
                    .fillMaxHeight()
                    .borders(if (selected) accent else HtColors.DBlack, right, if (selected) null else accent)
                    .then(if (selected) Modifier.focusRequester(activeFocus) else Modifier),
            ) {
                Row(Modifier.fillMaxHeight().padding(horizontal = 40.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(tab.name.uppercase(), style = HtText.Title.copy(fontSize = 36.sp, lineHeight = 36.sp))
                    tab.count?.let {
                        Text("($it)", style = HtText.Label.copy(fontSize = 15.sp, lineHeight = 15.sp), modifier = Modifier.align(Alignment.Top).padding(start = 4.dp, top = 12.dp))
                    }
                }
            }
        }
        Box(Modifier.weight(1f).fillMaxHeight().borders(null, null, accent))
    }
}
