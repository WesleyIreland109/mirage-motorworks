package com.miragemotorworks

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class RegisterRequest(val email: String, val password: String, val displayName: String)

@Serializable
data class ForgotPasswordRequest(val email: String)

@Serializable
data class ResetPasswordRequest(val token: String, val password: String)

@Serializable
data class AuthUser(val id: String, val email: String, val displayName: String, val role: String)

@Serializable
data class AuthResponse(val user: AuthUser)

@Serializable
data class CustomerProfile(
    val user: AuthUser,
    val phone: String = "",
    val preferredContact: String = "email",
    val marketingOptIn: Boolean = false
)

@Serializable
data class ProfileUpdate(
    val displayName: String,
    val phone: String = "",
    val preferredContact: String = "email",
    val marketingOptIn: Boolean = false
)
