package com.xyon.empleados.ui

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

private const val AUTH = BIOMETRIC_WEAK or DEVICE_CREDENTIAL

fun canAuthenticate(a: FragmentActivity) =
    BiometricManager.from(a).canAuthenticate(AUTH) == BiometricManager.BIOMETRIC_SUCCESS

fun promptBiometric(a: FragmentActivity, title: String, onOk: () -> Unit, onFail: (String) -> Unit = {}) {
    val prompt = BiometricPrompt(a, ContextCompat.getMainExecutor(a), object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = onOk()
        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) = onFail(errString.toString())
    })
    prompt.authenticate(
        BiometricPrompt.PromptInfo.Builder().setTitle(title).setSubtitle("Xyon Empleados")
            .setAllowedAuthenticators(AUTH).build()
    )
}
