package com.hypertube.tv.data

import com.hypertube.tv.BuildConfig
import java.util.Locale

object ServerConfig {
    val SERVER_URL: String = BuildConfig.SERVER_URL.trimEnd('/')
    val API_URL = "$SERVER_URL/api/v1/"

    // Same rules as getApiFileUrl on the website
    fun fileUrl(path: String?): String? = when {
        path.isNullOrBlank() -> null
        path.startsWith("http://") || path.startsWith("https://") -> path
        path.startsWith("//") -> "https:$path"
        path.startsWith("/") -> SERVER_URL + path
        else -> API_URL + path
    }
}

val SUPPORTED_LANGUAGES = listOf("en", "fr", "de")

fun currentLanguage(): String = Locale.getDefault().language.takeIf { it in SUPPORTED_LANGUAGES } ?: "en"
