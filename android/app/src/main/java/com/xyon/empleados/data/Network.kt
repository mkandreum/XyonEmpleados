package com.xyon.empleados.data

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.xyon.empleados.BuildConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import retrofit2.HttpException
import retrofit2.Retrofit
import java.io.IOException
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

val AppJson = Json {
    ignoreUnknownKeys = true
    coerceInputValues = true
    isLenient = true
    explicitNulls = false
    encodeDefaults = false
}

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides @Singleton fun json(): Json = AppJson

    @Provides @Singleton
    fun okHttp(session: SessionStore): OkHttpClient {
        require(BuildConfig.API_BASE_URL.startsWith("https://")) { "API_BASE_URL must be HTTPS" }
        // Intentionally NO logging interceptor: requests carry credentials and bearer tokens.
        return OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addInterceptor { chain ->
                val req = chain.request()
                val b = req.newBuilder()
                // Only attach the token to our own API host
                if (req.url.host == BuildConfig.API_BASE_URL.toHttpUrl().host) {
                    session.token?.let { b.header("Authorization", "Bearer $it") }
                }
                val resp = chain.proceed(b.build())
                val isAuthCall = req.url.encodedPath.contains("/auth/")
                if (resp.code == 401 && !isAuthCall && session.token != null) {
                    session.sessionExpired.tryEmit(Unit)
                }
                resp
            }
            // Pinning-ready: add .certificatePinner(...) or enable <pin-set> in network_security_config.xml
            .build()
    }

    @Provides @Singleton
    fun retrofit(client: OkHttpClient, json: Json): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    @Provides @Singleton fun api(r: Retrofit): Api = r.create(Api::class.java)
}

/** Human-readable (Spanish) error from any throwable; server `error` field is surfaced when present. */
fun Throwable.userMessage(): String = when (this) {
    is HttpException -> {
        val raw = runCatching { response()?.errorBody()?.string() }.getOrNull()
        val msg = raw?.let { runCatching { AppJson.decodeFromString<MessageResponse>(it).error }.getOrNull() }
        msg ?: when (code()) {
            401 -> "Credenciales o sesión no válidas"
            403 -> "No tienes permiso para esta acción"
            429 -> "Demasiados intentos. Inténtalo más tarde"
            in 500..599 -> "Error del servidor"
            else -> "Error ${code()}"
        }
    }
    is IOException -> "Sin conexión. Mostrando datos guardados."
    else -> message ?: "Error inesperado"
}

val Throwable.isOffline get() = this is IOException

suspend fun <T> safeCall(block: suspend () -> T): Result<T> =
    try { Result.success(block()) } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Throwable) { Result.failure(e) }
