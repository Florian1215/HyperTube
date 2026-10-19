package com.hypertube.tv.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.tv.material3.LocalContentColor

private fun svgIcon(name: String, width: Float, height: Float, path: String, stroke: Float? = null): ImageVector =
    ImageVector.Builder(name, defaultWidth = 24.dp, defaultHeight = 24.dp, viewportWidth = width, viewportHeight = height).apply {
        if (stroke == null)
            addPath(addPathNodes(path), fill = SolidColor(Color.White))
        else
            addPath(addPathNodes(path), stroke = SolidColor(Color.White), strokeLineWidth = stroke, strokeLineJoin = StrokeJoin.Round)
    }.build()

// Icons of the website (src/components/Icons.tsx) that are not in the material core icons
object HtIcons {
    val Play = svgIcon("play", 23f, 27f, "M21.6016 13.0769C21.9192 13.2721 21.9192 13.7333 21.6016 13.9285L1.26172 26.4294C0.928574 26.6342 0.499999 26.3947 0.499999 26.0037L0.5 1.00171C0.5 0.610677 0.928576 0.371177 1.26172 0.575927L21.6016 13.0769Z")
    val Pause = svgIcon("pause", 22f, 27f, "M6 0C6.55228 0 7 0.447715 7 1V26C7 26.5523 6.55228 27 6 27H1C0.447715 27 0 26.5523 0 26V1C0 0.447715 0.447715 0 1 0H6ZM21 0C21.5523 0 22 0.447715 22 1V26C22 26.5523 21.5523 27 21 27H16C15.4477 27 15 26.5523 15 26V1C15 0.447715 15.4477 0 16 0H21Z")
    val Bookmark = svgIcon("bookmark", 24f, 24f, "M6 3h12v18l-6-4.5L6 21V3Z", stroke = 2f)
    val BookmarkFilled = svgIcon("bookmark-filled", 24f, 24f, "M6 3h12v18l-6-4.5L6 21V3Z")
    val Eye = svgIcon("eye", 24f, 24f, "M12 5C6.5 5 2.7 9.1 1.5 12c1.2 2.9 5 7 10.5 7s9.3-4.1 10.5-7C21.3 9.1 17.5 5 12 5Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z")
    val Rewatch = svgIcon("rewatch", 24f, 24f, "M20 4v5h-5M4 12a8 8 0 0 1 14.9-4M4 20v-5h5M20 12a8 8 0 0 1-14.9 4", stroke = 2f)
    val Subtitles = svgIcon("subtitles", 24f, 24f, "M3 5h18v14H3Z M6.5 13.5h4M12.5 13.5h5M6.5 16h7", stroke = 1.8f)
    val Audio = svgIcon("audio", 24f, 24f, "M4 9h4l5-4v14l-5-4H4Z M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11", stroke = 1.8f)
    val Next = svgIcon("next", 24f, 24f, "M4 4l11 8-11 8Z M17 4h3v16h-3Z")
}

@Composable
fun HtIcon(icon: ImageVector, modifier: Modifier = Modifier, size: Dp = 20.dp, tint: Color = LocalContentColor.current, contentDescription: String? = null) {
    Image(imageVector = icon, contentDescription = contentDescription, modifier = modifier.size(size), colorFilter = ColorFilter.tint(tint))
}
