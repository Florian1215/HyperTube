@file:OptIn(ExperimentalTvMaterial3Api::class)

package com.hypertube.tv.ui.people

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.hypertube.tv.R
import com.hypertube.tv.data.Person
import com.hypertube.tv.ui.LocalAppContainer
import com.hypertube.tv.ui.Navigator
import com.hypertube.tv.ui.TopBar
import com.hypertube.tv.ui.TopBarItem
import com.hypertube.tv.ui.components.CenteredMessage
import com.hypertube.tv.ui.components.FocusSurface
import com.hypertube.tv.ui.components.HtButton
import com.hypertube.tv.ui.components.HtIcon
import com.hypertube.tv.ui.components.HtIcons
import com.hypertube.tv.ui.components.HtTabs
import com.hypertube.tv.ui.components.MediaCard
import com.hypertube.tv.ui.components.MediaMenu
import com.hypertube.tv.ui.components.MenuTarget
import com.hypertube.tv.ui.components.NetworkImage
import com.hypertube.tv.ui.components.Placeholder
import com.hypertube.tv.ui.components.SmallText
import com.hypertube.tv.ui.components.Tab
import com.hypertube.tv.ui.components.menuTarget
import com.hypertube.tv.ui.currentUser
import com.hypertube.tv.ui.home.SCREEN_PADDING
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.ui.theme.LocalAccent
import com.hypertube.tv.util.formatDate

private fun LazyGridScope.fullLine(key: String, content: @Composable () -> Unit) =
    item(key = key, span = { GridItemSpan(maxLineSpan) }) { content() }

// Port of src/app/people/[id]/page.tsx: infos of the person, then its medias by role
@Composable
fun PeopleScreen(nav: Navigator, id: String) {
    val container = LocalAppContainer.current
    val viewModel: PeopleViewModel = viewModel { PeopleViewModel(container, id) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    var menu by remember { mutableStateOf<MenuTarget?>(null) }
    val gridState = rememberLazyGridState()
    val nearEnd by remember {
        derivedStateOf {
            val info = gridState.layoutInfo
            (info.visibleItemsInfo.lastOrNull()?.index ?: 0) >= info.totalItemsCount - 8
        }
    }
    val person = state.person
    val roles = state.roles

    // Infinite scroll instead of the pagination of the website
    LaunchedEffect(nearEnd, state.hasMore, state.loading) {
        if (nearEnd && state.hasMore && !state.loading)
            viewModel.loadMore()
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(3),
        state = gridState,
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = SCREEN_PADDING, end = SCREEN_PADDING, bottom = SCREEN_PADDING),
        horizontalArrangement = Arrangement.spacedBy(28.dp),
        verticalArrangement = Arrangement.spacedBy(28.dp),
    ) {
        fullLine("top") { TopBar(nav, TopBarItem.None, horizontalPadding = 0.dp) }
        when {
            state.notFound -> fullLine("error") { CenteredMessage(stringResource(R.string.error_not_found_person)) }
            state.error && person == null -> fullLine("error") {
                CenteredMessage(stringResource(R.string.error_network)) { HtButton(stringResource(R.string.retry), onClick = viewModel::load) }
            }
            person == null -> fullLine("header") { Placeholder(Modifier.fillMaxWidth().height(300.dp)) }
            else -> {
                fullLine("header") { PersonInfo(person) }
                if (state.counts != null && roles.isNotEmpty())
                    fullLine("tabs") {
                        HtTabs(
                            tabs = roles.map { Tab(roleName(it), state.counts?.get(it)) },
                            active = roles.indexOf(state.role).coerceAtLeast(0),
                            onChange = { viewModel.setRole(roles[it]) },
                        )
                    }
                when {
                    state.medias.isEmpty() && state.loading -> items(3) { Placeholder(Modifier.aspectRatio(10f / 7f)) }
                    state.medias.isEmpty() && state.error -> fullLine("medias-error") {
                        CenteredMessage(stringResource(R.string.error_network)) { HtButton(stringResource(R.string.retry), onClick = viewModel::load) }
                    }
                    state.medias.isEmpty() -> fullLine("empty") { SmallText(stringResource(R.string.people_no_medias)) }
                    // No key: a media can come back on the next page when the order of the API changes
                    else -> items(state.medias) { media ->
                        MediaCard(
                            media,
                            onClick = { nav.media(media.type, media.id) },
                            onLongClick = { menu = media.menuTarget() },
                            label = media.roles.joinToString(", ").ifBlank { null },
                        )
                    }
                }
            }
        }
    }

    menu?.let { MediaMenu(it, onDismiss = { menu = null }) }
}

// PersonInfo of the website: picture on the left, name, department, dates and biography on the right
@Composable
private fun PersonInfo(person: Person) {
    val user by currentUser()
    val born = listOfNotNull(formatDate(person.birthday), person.placeOfBirth?.takeIf { it.isNotBlank() }).joinToString(" · ")
    val died = formatDate(person.deathday)
    var expanded by remember { mutableStateOf(false) }

    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(40.dp)) {
        NetworkImage(
            person.picture,
            Modifier.width(240.dp).aspectRatio(5f / 6f).border(1.dp, HtColors.White),
            contentDescription = person.name,
        )
        Column(Modifier.weight(1f).padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Column {
                Text(person.name.uppercase(), style = HtText.Title)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    departmentName(person.department)?.let { Text(it.uppercase(), style = HtText.Body) }
                    if (person.mediasCount > 0) {
                        val full = user != null && person.watchedCount == person.mediasCount
                        val color = if (full) LocalAccent.current else HtColors.Gray
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            HtIcon(HtIcons.Eye, size = 18.dp, tint = color)
                            Text("${person.watchedCount}/${person.mediasCount}", style = HtText.Bold, color = color)
                        }
                    }
                }
            }
            listOf(R.string.people_born to born, R.string.people_died to died.orEmpty()).filter { it.second.isNotBlank() }.forEach { (name, value) ->
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(name), style = HtText.Label, modifier = Modifier.width(140.dp))
                    Text(value, style = HtText.Body)
                }
            }
            // ExpandableText of the website: OK shows the whole biography
            if (person.biography.isNotBlank())
                FocusSurface(
                    onClick = { expanded = !expanded },
                    focusedScale = 1f,
                    focusedContainerColor = HtColors.BlackLight,
                    border = BorderStroke(2.dp, Color.Transparent),
                    focusedBorderColor = LocalAccent.current,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        person.biography,
                        style = HtText.Body,
                        color = HtColors.WhiteLight,
                        maxLines = if (expanded) Int.MAX_VALUE else 4,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(12.dp),
                    )
                }
        }
    }
}

@Composable
private fun roleName(role: String): String = stringResource(when (role) {
    "cast" -> R.string.people_cast
    "directing" -> R.string.people_directing
    "writing" -> R.string.people_writing
    else -> R.string.people_crew
})

@Composable
fun departmentName(department: String?): String? = when (department) {
    null, "" -> null
    "Acting" -> stringResource(R.string.dept_Acting)
    "Directing" -> stringResource(R.string.dept_Directing)
    "Writing" -> stringResource(R.string.dept_Writing)
    "Production" -> stringResource(R.string.dept_Production)
    "Editing" -> stringResource(R.string.dept_Editing)
    "Camera" -> stringResource(R.string.dept_Camera)
    "Sound" -> stringResource(R.string.dept_Sound)
    "Art" -> stringResource(R.string.dept_Art)
    "Costume & Make-Up" -> stringResource(R.string.dept_Costume)
    "Visual Effects" -> stringResource(R.string.dept_Visual_Effects)
    "Lighting" -> stringResource(R.string.dept_Lighting)
    "Crew" -> stringResource(R.string.dept_Crew)
    "Creator" -> stringResource(R.string.dept_Creator)
    else -> department
}
