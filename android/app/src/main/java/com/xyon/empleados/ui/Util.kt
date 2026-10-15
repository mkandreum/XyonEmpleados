package com.xyon.empleados.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import androidx.core.content.ContextCompat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

val ES: Locale = Locale("es", "ES")
private val fmtDay = DateTimeFormatter.ofPattern("d MMM yyyy", ES)
private val fmtTime = DateTimeFormatter.ofPattern("HH:mm", ES)

fun parseDate(iso: String?): LocalDate? = iso?.let {
    runCatching { Instant.parse(it).atZone(ZoneId.systemDefault()).toLocalDate() }.getOrNull()
        ?: runCatching { LocalDate.parse(it.take(10)) }.getOrNull()
}

fun fmtDate(iso: String?): String = parseDate(iso)?.format(fmtDay) ?: ""
fun fmtTimeOf(iso: String?): String =
    runCatching { Instant.parse(iso).atZone(ZoneId.systemDefault()).format(fmtTime) }.getOrDefault("--:--")
fun monthName(m: Int) = java.time.Month.of(m).getDisplayName(TextStyle.FULL, ES).replaceFirstChar { it.uppercase() }
fun money(v: Double) = java.text.NumberFormat.getCurrencyInstance(ES).format(v)

fun greeting(): String = when (java.time.LocalTime.now().hour) {
    in 5..11 -> "Buenos días"; in 12..19 -> "Buenas tardes"; else -> "Buenas noches"
}

fun hasLocationPermission(ctx: Context) =
    ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

/** Best last-known location (no Play Services dependency). Null when permission/providers are unavailable. */
@SuppressLint("MissingPermission")
fun lastLocation(ctx: Context): Location? {
    if (!hasLocationPermission(ctx)) return null
    val lm = ctx.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    return lm.getProviders(true).mapNotNull { runCatching { lm.getLastKnownLocation(it) }.getOrNull() }
        .maxByOrNull { it.time }
}
