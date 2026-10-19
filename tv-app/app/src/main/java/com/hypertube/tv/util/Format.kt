package com.hypertube.tv.util

import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.time.temporal.ChronoUnit
import java.util.Locale

fun parseDate(value: String?): LocalDate? {
    if (value.isNullOrBlank())
        return null
    return runCatching { LocalDate.parse(value.take(10)) }.getOrNull()
}

fun formatDate(value: String?): String? =
    parseDate(value)?.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(Locale.getDefault()))

fun isFuture(value: String?): Boolean = parseDate(value)?.isAfter(LocalDate.now()) == true

// "1:02:03" or "2:03", like formatTime on the website
fun formatTime(seconds: Long): String {
    val total = seconds.coerceAtLeast(0)
    val h = total / 3600
    val m = (total % 3600) / 60
    val s = total % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%d:%02d".format(m, s)
}

fun formatRuntime(minutes: Int): String = "%dh%02d".format(minutes / 60, minutes % 60)

fun displayLanguage(code: String?): String? = code?.let { Locale(it).getDisplayLanguage(Locale.getDefault()).ifBlank { it } }
    ?.replaceFirstChar { it.titlecase(Locale.getDefault()) }

// "3 days ago", the comments use dayjs fromNow on the website
fun relativeTime(value: String?): String {
    if (value.isNullOrBlank())
        return ""
    val date = runCatching { OffsetDateTime.parse(value) }.getOrNull()
        ?: value.toLongOrNull()?.let { OffsetDateTime.ofInstant(java.time.Instant.ofEpochMilli(it), java.time.ZoneId.systemDefault()) }
        ?: return formatDate(value) ?: ""
    val now = OffsetDateTime.now()
    val minutes = ChronoUnit.MINUTES.between(date, now)
    return android.text.format.DateUtils.getRelativeTimeSpanString(
        date.toInstant().toEpochMilli(), now.toInstant().toEpochMilli(),
        if (minutes < 60) android.text.format.DateUtils.MINUTE_IN_MILLIS else android.text.format.DateUtils.DAY_IN_MILLIS,
    ).toString()
}
