@file:OptIn(ExperimentalTvMaterial3Api::class)

package com.hypertube.tv.ui.components

import androidx.compose.ui.node.ModifierNodeElement
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.runtime.remember
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Border
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.ui.theme.LocalAccent

// The TV equivalent of the website hover effect: the focused element grows and gets the accent border
@Composable
fun FocusSurface(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    onLongClick: (() -> Unit)? = null,
    enabled: Boolean = true,
    shape: Shape = RectangleShape,
    focusedScale: Float = 1.05f,
    containerColor: Color = Color.Transparent,
    contentColor: Color = HtColors.DBlack,
    focusedContainerColor: Color = containerColor,
    focusedContentColor: Color = contentColor,
    border: BorderStroke? = null,
    // Images: same border as unfocused, in this color when focused
    focusedBorderColor: Color? = null,
    content: @Composable BoxScope.() -> Unit,
) {
    Surface(
        onClick = onClick,
        onLongClick = onLongClick,
        enabled = enabled,
        modifier = modifier,
        shape = ClickableSurfaceDefaults.shape(shape = shape),
        scale = ClickableSurfaceDefaults.scale(focusedScale = focusedScale),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = containerColor,
            contentColor = contentColor,
            focusedContainerColor = focusedContainerColor,
            focusedContentColor = focusedContentColor,
            pressedContainerColor = focusedContainerColor,
            pressedContentColor = focusedContentColor,
            disabledContainerColor = containerColor,
            disabledContentColor = HtColors.Gray,
        ),
        border = ClickableSurfaceDefaults.border(
            border = border?.let { Border(it, shape = shape) } ?: Border.None,
            // No colored outline on focus: the texts take the accent color, the medias only scale
            focusedBorder = focusedBorder(border, focusedBorderColor, shape),
            pressedBorder = focusedBorder(border, focusedBorderColor, shape),
        ),
        content = content,
    )
}

private fun focusedBorder(border: BorderStroke?, color: Color?, shape: Shape): Border = when {
    border == null -> Border.None
    color == null -> Border(border, shape = shape)
    else -> Border(BorderStroke(border.width, color), shape = shape)
}

enum class ButtonVariant { Primary, Outline, Ghost }

@Composable
fun HtButton(
    text: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    variant: ButtonVariant = ButtonVariant.Primary,
    enabled: Boolean = true,
    onLongClick: (() -> Unit)? = null,
) {
    val accent = LocalAccent.current
    val (container, content) = when (variant) {
        ButtonVariant.Primary -> HtColors.DBlack to HtColors.DWhite
        ButtonVariant.Outline -> Color.Transparent to HtColors.DBlack
        ButtonVariant.Ghost -> Color.Transparent to HtColors.DBlack
    }

    FocusSurface(
        onClick = onClick,
        onLongClick = onLongClick,
        enabled = enabled,
        modifier = modifier,
        containerColor = if (enabled) container else HtColors.DWhiteLight,
        contentColor = content,
        focusedContainerColor = if (variant == ButtonVariant.Primary) accent else container,
        focusedContentColor = if (variant == ButtonVariant.Primary) HtColors.DWhite else accent,
        border = if (variant == ButtonVariant.Outline) BorderStroke(1.dp, HtColors.DBlack) else null,
        // The white outline takes the accent color with the text
        focusedBorderColor = accent,
    ) {
        Row(
            modifier = Modifier.padding(PaddingValues(horizontal = if (text == null) 12.dp else 20.dp, vertical = 10.dp)),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (icon != null)
                HtIcon(icon, size = 18.dp)
            if (icon != null && text != null)
                Spacer(Modifier.width(10.dp))
            if (text != null)
                Text(text.uppercase(), style = HtText.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

// TagButton / RadioButton of the website
@Composable
fun HtChip(text: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier, onLongClick: (() -> Unit)? = null) {
    val accent = LocalAccent.current

    FocusSurface(
        onClick = onClick,
        onLongClick = onLongClick,
        modifier = modifier,
        containerColor = if (selected) HtColors.DBlack else Color.Transparent,
        contentColor = if (selected) HtColors.DWhite else HtColors.DBlack,
        focusedContainerColor = if (selected) accent else Color.Transparent,
        focusedContentColor = if (selected) HtColors.DWhite else accent,
        border = BorderStroke(1.dp, HtColors.DBlack),
        focusedBorderColor = accent,
        focusedScale = 1.08f,
    ) {
        Text(text.uppercase(), style = HtText.Tag, maxLines = 1, modifier = Modifier.padding(horizontal = 14.dp, vertical = 4.dp))
    }
}

@Composable
fun CircleFocus(onClick: () -> Unit, modifier: Modifier = Modifier, content: @Composable BoxScope.() -> Unit) {
    FocusSurface(onClick = onClick, modifier = modifier, shape = CircleShape, focusedScale = 1.1f, content = content)
}

// Requester of a custom focus target (focusProperties enter, focusRestorer fallback) that knows whether its element is shown.
// The focus search crashes on a requester of an element not composed (still loading, scrolled out of a lazy row),
// orDefault then lets the focus go to the default element
class FocusEntry {
    val requester = FocusRequester()
    internal var attached = 0

    val orDefault: FocusRequester get() = if (attached > 0) requester else FocusRequester.Default
}

@Composable
fun rememberFocusEntry() = remember { FocusEntry() }

fun Modifier.focusEntry(target: FocusEntry): Modifier = focusRequester(target.requester).then(FocusEntryElement(target))

private data class FocusEntryElement(val target: FocusEntry) : ModifierNodeElement<FocusEntryNode>() {
    override fun create() = FocusEntryNode(target)

    override fun update(node: FocusEntryNode) {
        if (node.target !== target) {
            node.onDetach()
            node.target = target
            node.onAttach()
        }
    }
}

private class FocusEntryNode(var target: FocusEntry) : Modifier.Node() {
    override fun onAttach() {
        target.attached++
    }

    override fun onDetach() {
        target.attached--
    }
}
