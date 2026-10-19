package com.hypertube.tv.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Typography
import androidx.tv.material3.darkColorScheme
import com.hypertube.tv.R

// Colors of the website (globals.css), the TV app always uses the dark mode
object HtColors {
    val Black = Color(0xFF191919)
    val BlackLight = Color(0xFF292929)
    val White = Color(0xFFFFFFFF)
    val WhiteLight = Color(0xFFDCDCDC)
    val Gray = Color(0xFF878787)

    val Yellow = Color(0xFFFFD600)
    val Pink = Color(0xFFFFA5F5)
    val Green = Color(0xFF00F475)
    val Purple = Color(0xFF747AF5)
    val Blue = Color(0xFFAEF0FF)
    val Red = Color(0xFFFF4742)

    val stripes = listOf(Yellow, Pink, Green, Purple, Blue, Red)

    fun named(name: String?): Color = when (name) {
        "yellow" -> Yellow
        "pink" -> Pink
        "green" -> Green
        "blue" -> Blue
        "red" -> Red
        else -> Purple
    }
}

object HtFonts {
    val Body = FontFamily(
        Font(R.font.calhern_light, FontWeight.Light),
        Font(R.font.calhern_regular, FontWeight.Normal),
        Font(R.font.calhern_bold, FontWeight.Bold),
    )
    val Wide = FontFamily(Font(R.font.calhern_wide_bold, FontWeight.Bold))
    val Condensed = FontFamily(Font(R.font.calhern_condensed, FontWeight.Normal))
    val Hairline = FontFamily(Font(R.font.calhern_hairline, FontWeight.Normal))
}

object HtText {
    val Hero = TextStyle(fontFamily = HtFonts.Condensed, fontSize = 72.sp, lineHeight = 70.sp, letterSpacing = 1.sp)
    val Title = TextStyle(fontFamily = HtFonts.Condensed, fontSize = 48.sp, lineHeight = 48.sp, letterSpacing = 1.sp)
    val Section = TextStyle(fontFamily = HtFonts.Wide, fontWeight = FontWeight.Bold, fontSize = 18.sp, letterSpacing = 0.5.sp)
    val Tag = TextStyle(fontFamily = HtFonts.Condensed, fontSize = 22.sp, letterSpacing = 1.sp)
    val Body = TextStyle(fontFamily = HtFonts.Body, fontWeight = FontWeight.Light, fontSize = 16.sp, lineHeight = 22.sp)
    val Bold = TextStyle(fontFamily = HtFonts.Body, fontWeight = FontWeight.Bold, fontSize = 16.sp, lineHeight = 22.sp)
    val Label = TextStyle(fontFamily = HtFonts.Hairline, fontSize = 22.sp, lineHeight = 26.sp)
    val Small = TextStyle(fontFamily = HtFonts.Body, fontWeight = FontWeight.Light, fontSize = 13.sp, lineHeight = 17.sp)
}

val LocalAccent = staticCompositionLocalOf { HtColors.Purple }

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HyperTubeTheme(accent: Color, content: @Composable () -> Unit) {
    val colors = darkColorScheme(
        primary = accent,
        onPrimary = HtColors.Black,
        secondary = HtColors.White,
        onSecondary = HtColors.Black,
        background = HtColors.Black,
        onBackground = HtColors.White,
        surface = HtColors.Black,
        onSurface = HtColors.White,
        surfaceVariant = HtColors.BlackLight,
        onSurfaceVariant = HtColors.WhiteLight,
        border = HtColors.White,
        error = HtColors.Red,
    )
    val body = HtText.Body

    MaterialTheme(
        colorScheme = colors,
        typography = Typography(
            bodyLarge = body.copy(fontSize = 18.sp),
            bodyMedium = body,
            bodySmall = HtText.Small,
            labelLarge = HtText.Bold,
            labelMedium = HtText.Bold.copy(fontSize = 14.sp),
            labelSmall = HtText.Small,
            titleLarge = HtText.Section,
            headlineLarge = HtText.Title,
            displayLarge = HtText.Hero,
        ),
    ) {
        CompositionLocalProvider(LocalAccent provides accent, content = content)
    }
}
