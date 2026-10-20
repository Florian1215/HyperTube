@file:OptIn(ExperimentalTvMaterial3Api::class)

package com.hypertube.tv.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.runtime.remember
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.ImageShader
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import coil3.compose.AsyncImage
import com.hypertube.tv.R
import com.hypertube.tv.data.ServerConfig
import com.hypertube.tv.data.User
import com.hypertube.tv.ui.theme.HtColors
import com.hypertube.tv.ui.theme.HtFonts
import com.hypertube.tv.ui.theme.HtText
import com.hypertube.tv.ui.theme.LocalAccent
import java.util.Locale

@Composable
fun Logo(modifier: Modifier = Modifier, height: Dp = 20.dp, color: Color = HtColors.DBlack) {
    Image(
        painter = painterResource(R.drawable.ic_logo),
        contentDescription = stringResource(R.string.app_name),
        modifier = modifier.height(height).width(height * 347 / 21),
        colorFilter = ColorFilter.tint(color),
        contentScale = ContentScale.Fit,
    )
}

// The six color stripes of the website
@Composable
fun ColorsBar(modifier: Modifier = Modifier, height: Dp = 12.dp) {
    Row(modifier.fillMaxWidth().height(height)) {
        HtColors.stripes.forEach { Box(Modifier.weight(1f).fillMaxHeight().background(it)) }
    }
}

@Composable
fun NetworkImage(url: String?, modifier: Modifier = Modifier, contentDescription: String? = null, contentScale: ContentScale = ContentScale.Crop, noise: Boolean = true) {
    Box(modifier.background(HtColors.DWhiteLight).then(if (noise) Modifier.noise() else Modifier)) {
        val full = ServerConfig.fileUrl(url)
        if (full != null)
            AsyncImage(model = full, contentDescription = contentDescription, contentScale = contentScale, modifier = Modifier.fillMaxSize())
    }
}

// Grain of the website (.custom-noise): noise.png repeated, overlay blend, opacity 40%, contrast 150% and brightness 125%
private val NoiseFilter = ColorFilter.colorMatrix(ColorMatrix(floatArrayOf(
    1.875f, 0f, 0f, 0f, -79.7f,
    0f, 1.875f, 0f, 0f, -79.7f,
    0f, 0f, 1.875f, 0f, -79.7f,
    0f, 0f, 0f, 1f, 0f,
)))

@Composable
fun Modifier.noise(alpha: Float = 0.4f): Modifier {
    val texture = ImageBitmap.imageResource(R.drawable.noise)
    val brush = remember(texture) { ShaderBrush(ImageShader(texture, TileMode.Repeated, TileMode.Repeated)) }

    // Offscreen so the overlay only blends with the image, not with what is behind
    return graphicsLayer(compositingStrategy = CompositingStrategy.Offscreen).drawWithContent {
        drawContent()
        drawRect(brush, alpha = alpha, colorFilter = NoiseFilter, blendMode = BlendMode.Overlay)
    }
}

@Composable
fun ProfilePicture(user: User, modifier: Modifier = Modifier, size: Dp = 40.dp) {
    Box(
        // Grain at 30% like the website (custom-noise opacity-30), over the picture or the initials
        modifier = modifier.size(size).clip(CircleShape).background(HtColors.named(user.color)).noise(alpha = 0.3f).border(1.dp, HtColors.Black, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        val picture = ServerConfig.fileUrl(user.profilePicture)
        if (picture != null)
            AsyncImage(model = picture, contentDescription = user.username, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        else
            Text(
                user.username.take(2).uppercase(Locale.getDefault()),
                // Heading of the website: condensed, uppercase and tracking-wide
                style = TextStyle(fontFamily = HtFonts.Condensed, fontSize = (size.value * 0.45f).sp, lineHeight = (size.value * 0.45f).sp, letterSpacing = 0.025.em),
                color = HtColors.Black,
            )
    }
}

@Composable
fun AvatarStack(users: List<User>, modifier: Modifier = Modifier, size: Dp = 32.dp) {
    Box(modifier) {
        users.forEachIndexed { index, user ->
            ProfilePicture(user, size = size, modifier = Modifier.offset(x = size * 0.7f * index).zIndex(-index.toFloat()))
        }
        Box(Modifier.width(size + size * 0.7f * (users.size - 1).coerceAtLeast(0)).height(size))
    }
}

@Composable
fun EpisodeLabel(season: Int, episode: Int, modifier: Modifier = Modifier, color: Color = HtColors.DBlack) {
    Text(stringResource(R.string.serie_season_episode, season, episode), style = HtText.Small, color = color, modifier = modifier)
}

@Composable
fun SectionTitle(title: String, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    val text = (if (onClick != null) "$title >" else title).uppercase()

    if (onClick == null)
        Text(text, style = HtText.Section, modifier = modifier.padding(vertical = 8.dp))
    else
        FocusSurface(onClick = onClick, modifier = modifier, focusedScale = 1f, focusedContentColor = LocalAccent.current) {
            Text(text, style = HtText.Section, modifier = Modifier.padding(horizontal = 6.dp, vertical = 8.dp))
        }
}

@Composable
fun BigTitle(title: String, modifier: Modifier = Modifier, exponent: String? = null, style: TextStyle = HtText.Title) {
    Row(modifier, horizontalArrangement = Arrangement.Center) {
        Text(title.uppercase(), style = style)
        if (!exponent.isNullOrBlank())
            Text(exponent, style = HtText.Label, modifier = Modifier.padding(start = 6.dp))
    }
}

@Composable
fun ProgressLine(fraction: Float, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(4.dp).background(HtColors.White.copy(alpha = 0.3f))) {
        Box(Modifier.fillMaxHeight().fillMaxWidth(fraction.coerceIn(0f, 1f)).background(LocalAccent.current))
    }
}

val BottomGradient = Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f)))

@Composable
fun Placeholder(modifier: Modifier = Modifier) {
    Box(modifier.background(HtColors.DWhiteLight))
}

@Composable
fun SmallText(text: String, modifier: Modifier = Modifier, color: Color = HtColors.Gray) {
    Text(text, style = HtText.Small, color = color, modifier = modifier)
}
