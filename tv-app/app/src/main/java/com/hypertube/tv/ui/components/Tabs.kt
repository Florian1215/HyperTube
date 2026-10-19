@file:OptIn(ExperimentalComposeUiApi::class)

package com.hypertube.tv.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp

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
