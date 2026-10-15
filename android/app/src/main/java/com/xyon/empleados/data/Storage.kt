package com.xyon.empleados.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject
import javax.inject.Singleton

private val Context.sessionDs: DataStore<Preferences> by preferencesDataStore("session")
private val Context.cacheDs: DataStore<Preferences> by preferencesDataStore("cache")

/** AES-256/GCM with a non-exportable Android Keystore key. */
object KeystoreCipher {
    private const val ALIAS = "xyon_token_key"
    private const val ANDROID_KS = "AndroidKeyStore"

    private fun key(): SecretKey {
        val ks = KeyStore.getInstance(ANDROID_KS).apply { load(null) }
        (ks.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KS)
        gen.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return gen.generateKey()
    }

    fun encrypt(plain: String): String {
        val c = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        val out = c.iv + c.doFinal(plain.toByteArray())
        return Base64.encodeToString(out, Base64.NO_WRAP)
    }

    fun decrypt(encoded: String): String? = runCatching {
        val raw = Base64.decode(encoded, Base64.NO_WRAP)
        val c = Cipher.getInstance("AES/GCM/NoPadding")
        c.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, raw, 0, 12))
        String(c.doFinal(raw, 12, raw.size - 12))
    }.getOrNull()
}

/** Keystore-encrypted session token + app preferences. Token is never logged. */
@Singleton
class SessionStore @Inject constructor(@ApplicationContext private val ctx: Context) {
    private val tokenKey = stringPreferencesKey("token_enc")
    private val bioKey = booleanPreferencesKey("biometric")

    @Volatile var token: String? = null
        private set

    /** Emits when the server rejects our token (401/403). */
    val sessionExpired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    suspend fun load(): Boolean {
        token = ctx.sessionDs.data.first()[tokenKey]?.let { KeystoreCipher.decrypt(it) }
        return token != null
    }

    suspend fun saveToken(t: String) {
        token = t
        ctx.sessionDs.edit { it[tokenKey] = KeystoreCipher.encrypt(t) }
    }

    suspend fun clear() {
        token = null
        ctx.sessionDs.edit { it.remove(tokenKey) }
    }

    val biometricEnabled: Flow<Boolean> = ctx.sessionDs.data.map { it[bioKey] ?: false }
    suspend fun setBiometric(on: Boolean) = ctx.sessionDs.edit { it[bioKey] = on }
}

/** Simple JSON offline cache (DataStore), keyed per resource and wiped on logout. */
@Singleton
class CacheStore @Inject constructor(@ApplicationContext private val ctx: Context) {
    suspend fun get(key: String): String? = ctx.cacheDs.data.first()[stringPreferencesKey(key)]
    suspend fun put(key: String, json: String) { ctx.cacheDs.edit { it[stringPreferencesKey(key)] = json } }
    suspend fun clear() { ctx.cacheDs.edit { it.clear() } }
}
